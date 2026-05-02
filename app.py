"""
app.py — Streamlit UI for the Misinformation Audit Agent
=========================================================
Run: streamlit run app.py
"""

import streamlit as st
import time
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
from graph import build_graph, AuditState
from langchain_core.messages import HumanMessage

st.set_page_config(
    page_title="Misinformation Audit Agent",
    page_icon="🔍",
    layout="wide"
)

st.markdown("""
<style>
.verdict-SUPPORTED   { color: #0F6E56; font-weight: 500; }
.verdict-REFUTED     { color: #993C1D; font-weight: 500; }
.verdict-NEI         { color: #854F0B; font-weight: 500; }
.score-bar           { height: 12px; border-radius: 6px; background: #eee; margin: 4px 0 12px; }
.score-fill          { height: 12px; border-radius: 6px; }
</style>
""", unsafe_allow_html=True)

# ── Header ──
st.title("🔍 Misinformation audit agent")
st.caption("Paste any article. The agent extracts every factual claim, verifies it against live sources and a fact-check corpus, and produces a structured credibility report.")

# ── Input ──
col1, col2 = st.columns([2, 1])
with col1:
    article = st.text_area(
        "Paste article text here",
        height=220,
        placeholder="Paste any news article, blog post, or claim here...",
    )
with col2:
    url = st.text_input("Source URL (optional)", placeholder="https://...")
    st.markdown("#### Settings")
    show_evidence = st.checkbox("Show raw evidence", value=False)
    thread_id = st.text_input("Session ID", value="audit-1")

run_btn = st.button("Run audit", type="primary", disabled=not article.strip())

# ── Run ──
if run_btn and article.strip():
    app = build_graph()

    initial_state: AuditState = {
        "article_text": article,
        "article_url": url or None,
        "claims": [],
        "verified_claims": [],
        "raw_sources": [],
        "audit_report": "",
        "overall_score": 0.0,
        "messages": [HumanMessage(content="Start audit.")]
    }

    config = {"configurable": {"thread_id": thread_id}}

    progress = st.progress(0, text="Starting audit...")
    status   = st.empty()
    steps    = ["claim_extractor", "rag_retriever", "web_search", "nli_verifier", "report_writer", "contradiction_detector"]
    step_labels = {
        "claim_extractor":        "Extracting atomic claims...",
        "rag_retriever":          "Searching fact-check corpus (RAG)...",
        "web_search":             "Searching live web sources...",
        "nli_verifier":           "Verifying claims with NLI model...",
        "report_writer":          "Writing audit report...",
        "contradiction_detector": "Checking internal contradictions...",
    }

    final_state = None
    for i, step_output in enumerate(app.stream(initial_state, config=config)):
        node = list(step_output.keys())[0]
        pct  = int((i + 1) / len(steps) * 100)
        progress.progress(pct, text=step_labels.get(node, node))
        time.sleep(0.2)
        final_state = app.get_state(config).values

    progress.empty()
    status.empty()

    if not final_state:
        st.error("Audit failed. Check your API keys.")
        st.stop()

    # ── Results ──
    verified = final_state.get("verified_claims", [])
    score    = final_state.get("overall_score", 0.5)

    # Score banner
    score_pct = int(score * 100)
    color = "#1D9E75" if score > 0.65 else ("#BA7517" if score > 0.35 else "#D85A30")
    label = "Mostly credible" if score > 0.65 else ("Mixed / unverified" if score > 0.35 else "Low credibility")

    st.markdown("---")
    st.markdown(f"### Overall credibility: {score*10:.1f}/10 — {label}")
    st.markdown(
        f'<div class="score-bar"><div class="score-fill" style="width:{score_pct}%;background:{color}"></div></div>',
        unsafe_allow_html=True
    )

    # Claims breakdown
    if verified:
        st.markdown(f"### Claim-by-claim analysis ({len(verified)} claims)")

        supported = [c for c in verified if c["verdict"] == "SUPPORTED"]
        refuted   = [c for c in verified if c["verdict"] == "REFUTED"]
        nei       = [c for c in verified if c["verdict"] == "NOT ENOUGH INFO"]

        m1, m2, m3 = st.columns(3)
        m1.metric("Supported", len(supported))
        m2.metric("Refuted",   len(refuted))
        m3.metric("Unverified", len(nei))

        for i, claim in enumerate(verified):
            v = claim["verdict"]
            css = "SUPPORTED" if v == "SUPPORTED" else ("REFUTED" if v == "REFUTED" else "NEI")
            icon = "✅" if v == "SUPPORTED" else ("❌" if v == "REFUTED" else "⚠️")
            conf = int(claim["confidence"] * 100)

            with st.expander(f"{icon} Claim {i+1}: {claim['claim'][:90]}..."):
                st.markdown(f'<span class="verdict-{css}">{v}</span> — confidence {conf}%', unsafe_allow_html=True)
                st.write(claim["explanation"])
                if show_evidence and claim.get("evidence_snippets"):
                    st.markdown("**Evidence snippets:**")
                    for snip in claim["evidence_snippets"]:
                        st.code(snip[:300], language=None)

    # Full report
    with st.expander("Full audit report (markdown)"):
        st.markdown(final_state.get("audit_report", "No report generated."))
