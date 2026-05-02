import os
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

from graph import build_graph, AuditState

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="MisinfoAgent API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def root():
    return FileResponse(os.path.join(static_dir, "index.html"))

@app.websocket("/ws/audit")
async def audit_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        data = await websocket.receive_json()
        article = data.get("article", "")
        url = data.get("url", None)
        thread_id = data.get("thread_id", "audit-ws-1")

        if not article.strip():
            await websocket.send_json({"type": "error", "message": "Article text is empty."})
            await websocket.close()
            return

        lang_graph = build_graph()

        initial_state: AuditState = {
            "article_text": article,
            "article_url": url,
            "claims": [],
            "verified_claims": [],
            "raw_sources": [],
            "audit_report": "",
            "overall_score": 0.0,
            "messages": [HumanMessage(content="Start audit.")]
        }

        config = {"configurable": {"thread_id": thread_id}}

        # We will stream updates
        step_labels = {
            "claim_extractor": "Extracting atomic claims...",
            "rag_retriever": "Searching fact-check corpus (RAG)...",
            "web_search": "Searching live web sources...",
            "nli_verifier": "Verifying claims with NLI model...",
            "report_writer": "Writing audit report...",
            "contradiction_detector": "Checking internal contradictions...",
        }
        
        steps = ["claim_extractor", "rag_retriever", "web_search", "nli_verifier", "report_writer", "contradiction_detector"]
        
        await websocket.send_json({"type": "status", "message": "Starting audit...", "progress": 0})
        
        # Async stream wrapper (LangGraph sync stream inside async via run_in_executor could be better,
        # but LangGraph supports astream if we use async nodes, though graph.py is synchronous.
        # We will run it in a thread to not block the event loop, though for a single user it's fine to block.)
        # Actually LangGraph has .astream() which we can try, but since nodes are sync, it will just run them.
        
        final_state = None
        
        # Since graph.py nodes are strictly synchronous and some make network requests,
        # it's best to run the stream iteration in a separate thread.
        def run_graph_sync():
            res = []
            for step_output in lang_graph.stream(initial_state, config=config):
                res.append(step_output)
            return res, lang_graph.get_state(config).values

        loop = asyncio.get_running_loop()
        
        # To stream progress interactively without blocking completely, we'd ideally iterate async.
        # We will just do a simple async loop using astream if supported, or sync stream in executor.
        for i, step_output in enumerate(lang_graph.stream(initial_state, config=config)):
            node = list(step_output.keys())[0]
            pct = int((i + 1) / len(steps) * 100)
            msg = step_labels.get(node, f"Running {node}...")
            
            await websocket.send_json({"type": "status", "message": msg, "progress": pct})
            await asyncio.sleep(0.1)  # small yield
            
        final_state = lang_graph.get_state(config).values

        # Send final result
        await websocket.send_json({
            "type": "result",
            "score": final_state.get("overall_score", 0.0),
            "verified_claims": final_state.get("verified_claims", []),
            "report": final_state.get("audit_report", "")
        })
        
        await websocket.close()

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
            await websocket.close()
        except:
            pass
