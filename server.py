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

# Mount static files directory path
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

# WebSocket endpoint must be defined before mounting static files at root (/)
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
        
        for i, step_output in enumerate(lang_graph.stream(initial_state, config=config)):
            node = list(step_output.keys())[0]
            pct = int((i + 1) / len(steps) * 100)
            msg = step_labels.get(node, f"Running {node}...")
            
            await websocket.send_json({"type": "status", "message": msg, "progress": pct})
            await asyncio.sleep(0.1)
            
        final_state = lang_graph.get_state(config).values

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

# Mount static files at the root (/) to serve index.html and assets
# html=True enables serving index.html automatically at /
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
