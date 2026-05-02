# Misinformation Audit Agent
### LangGraph + RAG + Finetuned NLI + LangChain Tools

Fact-checks any article claim-by-claim, cites real sources, and produces
a structured credibility report with an overall score.

---

## Architecture

```
Article text
     │
     ▼
┌─────────────────┐
│ claim_extractor │  LLM breaks article into atomic verifiable claims
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  rag_retriever  │  ChromaDB over PubMed, Snopes, WHO, CDC, Wikipedia
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   web_search    │  Serper (live web) + Wikipedia tool per claim
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  nli_verifier   │  Finetuned DeBERTa: SUPPORTED / REFUTED / NOT ENOUGH INFO
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  report_writer  │  Structured markdown audit report + credibility score
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ contradiction_detect │  Flags internal contradictions within the article
└──────────────────────┘
         │
        END
```

---

## Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Set environment variables
```bash
export OPENAI_API_KEY="sk-..."        # or use Ollama for local LLM
export SERPER_API_KEY="..."           # free tier: serper.dev (2500 queries/month)
```

### 3. Build the RAG corpus (run once)
```bash
python ingest.py
```
This downloads Wikipedia, WHO/CDC fact sheets, and seeds known misinformation.
Add your own PDFs to `./custom_docs/` for a richer corpus.

### 4. (Optional) Finetune the NLI model
```bash
# Best run on Google Colab free T4 GPU
python finetune.py
```
After training, update `graph.py` line ~100:
```python
model="cross-encoder/nli-deberta-v3-base"
# → model="./nli_finetuned"  (or your HuggingFace Hub checkpoint)
```

### 5. Run the Animated GSAP UI (FastAPI)
```bash
uvicorn server:app --reload
```
Open `http://localhost:8000` to see the new next-level animated UI using GSAP.

*(Optional) If you prefer the old legacy UI, you can still run `streamlit run app.py`*

### 6. Stitch MCP Integration
This project now includes a configured `mcp.json` file at the root of the workspace. This connects the Google Stitch Model Context Protocol server. To use it:
1. Add your Stitch API Key to `mcp.json`.
2. Connect it with your preferred AI coding agent (e.g., Claude Code, Cursor, Gemini CLI).

### 7. Or run from Python directly
```python
from graph import run_audit
result = run_audit("Your article text here...")
print(result["audit_report"])
```

---

## Free tier limits

| Service | Free tier |
|---|---|
| Serper | 2,500 queries/month |
| OpenAI gpt-4o-mini | ~$0.01 per audit |
| ChromaDB | Unlimited (local) |
| HuggingFace NLI model | Unlimited (local inference) |
| Google Colab (finetuning) | Free T4 GPU, ~2hr training |

**Total cost per audit: ~$0.01–0.05**

---

## Swapping to a local LLM (zero cost)

```python
# In graph.py, replace build_llm() with:
from langchain_community.llms import Ollama

def build_llm():
    return Ollama(model="llama3")   # ollama pull llama3
```

---

## Files

| File | Purpose |
|---|---|
| `graph.py` | Main LangGraph graph — all 6 nodes |
| `ingest.py` | Build the ChromaDB RAG corpus |
| `finetune.py` | Finetune NLI verifier on FEVER dataset |
| `app.py` | Streamlit UI |
| `requirements.txt` | Dependencies |
| `custom_docs/` | Drop your own PDFs here for RAG |
| `chroma_db/` | Auto-created by ingest.py |
| `nli_finetuned/` | Auto-created by finetune.py |
