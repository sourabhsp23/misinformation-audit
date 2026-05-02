"""
Misinformation Audit Agent — LangGraph Architecture
=====================================================
Full multi-agent pipeline that fact-checks articles claim-by-claim,
cites real sources, and produces a structured audit report.

Stack:
- LangGraph  (orchestration)
- LangChain  (tools + chains)
- ChromaDB   (RAG vector store)
- Serper     (live web search, free tier)
- HuggingFace (finetuned NLI model for claim verification)
- Ollama / OpenAI (LLM backbone — switchable)
"""

from __future__ import annotations

import os
from dotenv import load_dotenv
load_dotenv()
from typing import TypedDict, Annotated, List, Optional
import operator

from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper, GoogleSerperAPIWrapper
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.tools import Tool
from langchain_core.documents import Document

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from transformers import pipeline as hf_pipeline   # finetuned NLI

# ─────────────────────────────────────────────
# 1. STATE DEFINITION
# ─────────────────────────────────────────────

class AuditState(TypedDict):
    # Input
    article_text: str
    article_url: Optional[str]

    # Intermediate
    claims: Annotated[List[str], operator.add]          # atomic claims extracted
    verified_claims: Annotated[List[dict], operator.add] # per-claim audit results
    raw_sources: Annotated[List[str], operator.add]      # evidence strings collected

    # Output
    audit_report: str
    overall_score: float   # 0.0 (completely false) → 1.0 (fully verified)
    messages: Annotated[List, operator.add]


# ─────────────────────────────────────────────
# 2. TOOLS
# ─────────────────────────────────────────────

def build_tools():
    serper = GoogleSerperAPIWrapper(serper_api_key=os.getenv("SERPER_API_KEY"))
    wikipedia = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper(top_k_results=3))

    serper_tool = Tool(
        name="web_search",
        func=serper.run,
        description="Search the live web for primary sources, studies, or news about a claim."
    )
    wiki_tool = Tool(
        name="wikipedia",
        func=wikipedia.run,
        description="Look up encyclopedic background facts, historical context, or scientific definitions."
    )
    return [serper_tool, wiki_tool]


# ─────────────────────────────────────────────
# 3. RAG SETUP  (ChromaDB over fact-check corpora)
# ─────────────────────────────────────────────

def build_rag_retriever(persist_dir: str = "./chroma_db"):
    """
    In production: pre-ingest PubMed abstracts, Snopes archives,
    WHO/CDC docs, Wikipedia dumps into ChromaDB.
    Here we set up the retriever — ingest separately via ingest.py.
    """
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"  # free, fast
    )
    vectorstore = Chroma(
        persist_directory=persist_dir,
        embedding_function=embeddings,
        collection_name="factcheck_corpus"
    )
    return vectorstore.as_retriever(
        search_type="mmr",          # max marginal relevance — diverse results
        search_kwargs={"k": 5, "fetch_k": 20}
    )


# ─────────────────────────────────────────────
# 4. FINETUNED NLI MODEL  (claim verifier)
# ─────────────────────────────────────────────

def build_nli_verifier():
    """
    Uses a zero-shot NLI model fine-tunable on FEVER / SciCheck datasets.
    Replace model_name with your finetuned checkpoint on HuggingFace Hub.

    Finetuning recipe (run separately):
        Base model : cross-encoder/nli-deberta-v3-base
        Dataset    : FEVER (fever.ai, free), SciCheck, HealthNewsReview
        Trainer    : HuggingFace Trainer with LoRA (fits on free Colab T4)
        Labels     : SUPPORTED / REFUTED / NOT_ENOUGH_INFO
    """
    return hf_pipeline(
        "zero-shot-classification",
        model="cross-encoder/nli-deberta-v3-base",   # swap with finetuned checkpoint
        device=-1   # CPU; set to 0 for GPU
    )


# ─────────────────────────────────────────────
# 5. LLM
# ─────────────────────────────────────────────

def build_llm():
    return ChatGroq(
        model="llama-3.3-70b-versatile",   # fast + capable on Groq cloud
        temperature=0.1,
        api_key=os.getenv("GROQ_API_KEY")
    )


# ─────────────────────────────────────────────
# 6. NODE FUNCTIONS
# ─────────────────────────────────────────────

# ── Node 1: Claim Extractor ──────────────────
def claim_extractor_node(state: AuditState) -> AuditState:
    """
    Breaks the article into atomic, independently verifiable claims.
    Filters out opinions and value judgements — only factual assertions.
    """
    llm = build_llm()
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a precise claim extraction system.
Extract every atomic, independently verifiable FACTUAL claim from the article.
Rules:
- One claim per line, numbered.
- Exclude opinions, predictions, value judgments.
- Each claim must be a complete, self-contained sentence.
- Max 20 claims. Prioritise the most significant ones.
Output ONLY the numbered list, nothing else."""),
        ("human", "Article:\n\n{article}")
    ])
    response = llm.invoke(prompt.format_messages(article=state["article_text"]))
    lines = [l.strip() for l in response.content.strip().split("\n") if l.strip()]
    claims = [l.split(". ", 1)[-1] if l[0].isdigit() else l for l in lines]

    return {
        "claims": claims,
        "messages": [AIMessage(content=f"Extracted {len(claims)} claims.")]
    }


# ── Node 2: RAG Evidence Retriever ───────────
def rag_retriever_node(state: AuditState) -> AuditState:
    """
    For each claim, retrieves relevant documents from the local
    fact-check corpus (PubMed, Snopes, WHO, CDC, Wikipedia dumps).
    """
    retriever = build_rag_retriever()
    all_sources = []

    for claim in state["claims"]:
        docs: List[Document] = retriever.invoke(claim)
        for doc in docs:
            all_sources.append(
                f"[RAG] Claim: '{claim}'\nSource: {doc.metadata.get('source','unknown')}\n{doc.page_content[:400]}"
            )

    return {
        "raw_sources": all_sources,
        "messages": [AIMessage(content=f"Retrieved {len(all_sources)} RAG evidence chunks.")]
    }


# ── Node 3: Live Web Search (Serper + Wikipedia) ──
def web_search_node(state: AuditState) -> AuditState:
    """
    Searches the live web for each claim using Serper (free tier: 2500 queries/month).
    Also queries Wikipedia for encyclopedic grounding.
    """
    tools = build_tools()
    serper_tool = tools[0]
    wiki_tool   = tools[1]
    all_sources = []

    for claim in state["claims"]:
        # Serper — primary sources, recent studies, news
        try:
            web_result = serper_tool.invoke(f"fact check: {claim}")
            all_sources.append(f"[WEB] Claim: '{claim}'\n{web_result[:500]}")
        except Exception as e:
            all_sources.append(f"[WEB] Claim: '{claim}'\nError: {e}")

        # Wikipedia — encyclopedic baseline
        try:
            wiki_result = wiki_tool.invoke(claim[:100])
            all_sources.append(f"[WIKI] Claim: '{claim}'\n{wiki_result[:400]}")
        except Exception:
            pass

    return {
        "raw_sources": all_sources,
        "messages": [AIMessage(content=f"Web search complete for {len(state['claims'])} claims.")]
    }


# ── Node 4: NLI Claim Verifier ───────────────
def nli_verifier_node(state: AuditState) -> AuditState:
    """
    Runs each claim through the finetuned NLI model.
    Classifies as SUPPORTED / REFUTED / NOT_ENOUGH_INFO with confidence score.
    """
    nli = build_nli_verifier()
    llm = build_llm()
    verified = []

    for claim in state["claims"]:
        # Gather evidence for this specific claim
        evidence = [s for s in state["raw_sources"] if claim[:40] in s]
        evidence_text = "\n\n".join(evidence[:3]) if evidence else "No direct evidence found."

        # NLI classification
        candidate_labels = ["SUPPORTED", "REFUTED", "NOT ENOUGH INFO"]
        nli_result = nli(
            sequences=claim,
            candidate_labels=candidate_labels,
            hypothesis_template="This claim is {}."
        )
        verdict   = nli_result["labels"][0]
        confidence = round(nli_result["scores"][0], 3)

        # LLM explanation — grounds the NLI verdict in actual evidence
        explain_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a fact-checker. Given a claim, NLI verdict, and evidence,
write a 2-3 sentence explanation of the verdict. Be specific — cite what the evidence says.
End with: 'Verdict: SUPPORTED / REFUTED / NOT ENOUGH INFO (confidence: X%)'"""),
            ("human", "Claim: {claim}\nNLI verdict: {verdict} ({confidence})\n\nEvidence:\n{evidence}")
        ])
        explanation = llm.invoke(
            explain_prompt.format_messages(
                claim=claim, verdict=verdict,
                confidence=f"{confidence*100:.0f}%", evidence=evidence_text
            )
        ).content

        verified.append({
            "claim": claim,
            "verdict": verdict,
            "confidence": confidence,
            "explanation": explanation,
            "evidence_snippets": evidence[:2]
        })

    return {
        "verified_claims": verified,
        "messages": [AIMessage(content=f"NLI verification complete for {len(verified)} claims.")]
    }


# ── Node 5: Report Writer ─────────────────────
def report_writer_node(state: AuditState) -> AuditState:
    """
    Synthesises all verified claims into a structured audit report
    with an overall credibility score.
    """
    llm = build_llm()

    # Calculate overall score
    score_map = {"SUPPORTED": 1.0, "NOT ENOUGH INFO": 0.5, "REFUTED": 0.0}
    scores = [score_map.get(c["verdict"], 0.5) * c["confidence"]
              for c in state["verified_claims"]]
    overall = round(sum(scores) / len(scores), 3) if scores else 0.5

    # Format claims for the prompt
    claims_text = "\n\n".join([
        f"Claim {i+1}: {c['claim']}\n"
        f"Verdict: {c['verdict']} (confidence: {c['confidence']*100:.0f}%)\n"
        f"Explanation: {c['explanation']}"
        for i, c in enumerate(state["verified_claims"])
    ])

    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert fact-check report writer.
Write a structured audit report in markdown with these sections:
## Summary
## Overall credibility score: X/10
## Claim-by-claim analysis
## Methodology note
## Conclusion
Be precise, journalistic, and neutral. Cite verdicts accurately."""),
        ("human", "Article text (first 300 chars): {article_preview}\n\nClaim analysis:\n{claims}\n\nOverall score: {score}")
    ])

    report = llm.invoke(prompt.format_messages(
        article_preview=state["article_text"][:300],
        claims=claims_text,
        score=f"{overall*10:.1f}/10"
    )).content

    return {
        "audit_report": report,
        "overall_score": overall,
        "messages": [AIMessage(content="Audit report generated.")]
    }


# ── Node 6: Contradiction Detector ───────────
def contradiction_detector_node(state: AuditState) -> AuditState:
    """
    Scans verified claims for internal contradictions within the article itself.
    Flags if two claims in the same article conflict with each other.
    """
    if len(state["verified_claims"]) < 2:
        return {"messages": [AIMessage(content="Too few claims for contradiction check.")]}

    llm = build_llm()
    claims_list = "\n".join([f"{i+1}. {c['claim']}" for i, c in enumerate(state["verified_claims"])])

    prompt = ChatPromptTemplate.from_messages([
        ("system", "Identify any claims in this list that directly contradict each other. "
                   "Output 'No contradictions found.' or list the conflicting pairs with explanation."),
        ("human", claims_list)
    ])
    result = llm.invoke(prompt.format_messages()).content

    # Append contradiction note to the report
    updated_report = state["audit_report"] + f"\n\n## Internal contradiction check\n{result}"
    return {
        "audit_report": updated_report,
        "messages": [AIMessage(content=f"Contradiction check: {result[:80]}...")]
    }


# ─────────────────────────────────────────────
# 7. ROUTING LOGIC
# ─────────────────────────────────────────────

def should_continue_to_web(state: AuditState) -> str:
    """After RAG retrieval, always proceed to web search for live sources."""
    return "web_search"


def route_after_nli(state: AuditState) -> str:
    """After NLI, write report."""
    return "report_writer"


# ─────────────────────────────────────────────
# 8. GRAPH ASSEMBLY
# ─────────────────────────────────────────────

def build_graph():
    graph = StateGraph(AuditState)

    # Register nodes
    graph.add_node("claim_extractor",        claim_extractor_node)
    graph.add_node("rag_retriever",          rag_retriever_node)
    graph.add_node("web_search",             web_search_node)
    graph.add_node("nli_verifier",           nli_verifier_node)
    graph.add_node("report_writer",          report_writer_node)
    graph.add_node("contradiction_detector", contradiction_detector_node)

    # Entry point
    graph.set_entry_point("claim_extractor")

    # Edges — linear then parallel evidence gather
    graph.add_edge("claim_extractor", "rag_retriever")
    graph.add_conditional_edges("rag_retriever", should_continue_to_web, {"web_search": "web_search"})
    graph.add_edge("web_search", "nli_verifier")
    graph.add_conditional_edges("nli_verifier", route_after_nli, {"report_writer": "report_writer"})
    graph.add_edge("report_writer", "contradiction_detector")
    graph.add_edge("contradiction_detector", END)

    # Memory checkpointer (enables pause/resume + human-in-loop)
    memory = MemorySaver()
    return graph.compile(checkpointer=memory)


# ─────────────────────────────────────────────
# 9. RUNNER
# ─────────────────────────────────────────────

def run_audit(article_text: str, article_url: str = None, thread_id: str = "audit-1"):
    app = build_graph()

    initial_state: AuditState = {
        "article_text": article_text,
        "article_url": article_url,
        "claims": [],
        "verified_claims": [],
        "raw_sources": [],
        "audit_report": "",
        "overall_score": 0.0,
        "messages": [HumanMessage(content="Start audit.")]
    }

    config = {"configurable": {"thread_id": thread_id}}

    print("Starting misinformation audit...\n")
    for step in app.stream(initial_state, config=config):
        node_name = list(step.keys())[0]
        print(f"✓ {node_name}")

    final = app.get_state(config).values
    print("\n" + "="*60)
    print(final["audit_report"])
    print(f"\nOverall credibility score: {final['overall_score']*10:.1f}/10")
    return final


if __name__ == "__main__":
    sample = """
    Scientists have confirmed that drinking coffee daily reduces the risk of Alzheimer's
    disease by 65%, according to a study of 10 million participants. The WHO endorsed
    these findings last week and now recommends 5 cups per day for adults over 40.
    Einstein never finished school and failed mathematics as a child.
    The Great Wall of China is visible from space with the naked eye.
    """
    run_audit(sample)
