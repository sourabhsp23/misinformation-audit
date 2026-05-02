"""
ingest.py — Build the ChromaDB RAG corpus
==========================================
Run this ONCE before using the audit agent.
Downloads free public datasets and ingests them into ChromaDB.

Datasets used (all free):
  - PubMed abstracts (via Entrez API, no key needed for small batches)
  - Snopes fact-check pages (scraped)
  - WHO/CDC fact sheets (PDF download)
  - Wikipedia dumps (via LangChain Wikipedia loader)
"""

import os
import json
import time
from typing import List

from langchain_community.document_loaders import (
    WebBaseLoader,
    PyPDFLoader,
    WikipediaLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document


# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────
CHROMA_DIR   = "./chroma_db"
CHUNK_SIZE   = 512
CHUNK_OVERLAP = 64

EMBEDDINGS = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"  # ~80MB, free
)

SPLITTER = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP
)


# ─────────────────────────────────────────────
# Source 1: Wikipedia (topic-seeded)
# ─────────────────────────────────────────────
WIKI_TOPICS = [
    "Misinformation", "Fact-checking", "Scientific consensus",
    "Vaccine safety", "Climate change", "COVID-19",
    "Evolution", "Moon landing", "Holocaust",
    "Nutrition science", "Cognitive bias", "Logical fallacy"
]

def ingest_wikipedia(vectorstore: Chroma):
    print("Ingesting Wikipedia...")
    docs = []
    for topic in WIKI_TOPICS:
        try:
            loader = WikipediaLoader(query=topic, load_max_docs=2)
            pages = loader.load()
            for p in pages:
                p.metadata["source_type"] = "wikipedia"
                p.metadata["credibility_tier"] = "encyclopedic"
            docs.extend(pages)
            time.sleep(0.5)
        except Exception as e:
            print(f"  Wiki error for '{topic}': {e}")
    chunks = SPLITTER.split_documents(docs)
    vectorstore.add_documents(chunks)
    print(f"  Added {len(chunks)} Wikipedia chunks.")


# ─────────────────────────────────────────────
# Source 2: WHO / CDC fact sheets (public URLs)
# ─────────────────────────────────────────────
FACT_SHEET_URLS = [
    "https://www.who.int/news-room/fact-sheets/detail/autism-spectrum-disorders",
    "https://www.who.int/news-room/fact-sheets/detail/vaccines-and-immunization",
    "https://www.who.int/news-room/fact-sheets/detail/climate-change-and-health",
    "https://www.cdc.gov/vaccines/vac-gen/whatifstop.htm",
]

def ingest_fact_sheets(vectorstore: Chroma):
    print("Ingesting WHO/CDC fact sheets...")
    docs = []
    for url in FACT_SHEET_URLS:
        try:
            loader = WebBaseLoader(url)
            pages = loader.load()
            for p in pages:
                p.metadata["source_type"] = "official_health"
                p.metadata["credibility_tier"] = "authoritative"
                p.metadata["source"] = url
            docs.extend(pages)
            time.sleep(1)
        except Exception as e:
            print(f"  Error loading {url}: {e}")
    chunks = SPLITTER.split_documents(docs)
    vectorstore.add_documents(chunks)
    print(f"  Added {len(chunks)} fact sheet chunks.")


# ─────────────────────────────────────────────
# Source 3: Custom documents (add your own)
# ─────────────────────────────────────────────
def ingest_custom_docs(vectorstore: Chroma, folder: str = "./custom_docs"):
    """
    Drop any PDFs or .txt files into ./custom_docs/
    They'll be ingested automatically.
    Great for: scientific papers, government reports, textbooks.
    """
    if not os.path.exists(folder):
        os.makedirs(folder)
        print(f"  Created {folder}/ — add PDFs here and re-run.")
        return

    docs = []
    for fname in os.listdir(folder):
        fpath = os.path.join(folder, fname)
        try:
            if fname.endswith(".pdf"):
                loader = PyPDFLoader(fpath)
                pages = loader.load()
                for p in pages:
                    p.metadata["source_type"] = "custom_document"
                    p.metadata["source"] = fname
                docs.extend(pages)
            elif fname.endswith(".txt"):
                with open(fpath) as f:
                    content = f.read()
                docs.append(Document(
                    page_content=content,
                    metadata={"source": fname, "source_type": "custom_document"}
                ))
        except Exception as e:
            print(f"  Error with {fname}: {e}")

    if docs:
        chunks = SPLITTER.split_documents(docs)
        vectorstore.add_documents(chunks)
        print(f"  Added {len(chunks)} custom doc chunks from {folder}/")
    else:
        print(f"  No documents found in {folder}/")


# ─────────────────────────────────────────────
# Source 4: Seed known false claims (for NLI grounding)
# ─────────────────────────────────────────────
KNOWN_MISINFORMATION = [
    {"claim": "Vaccines cause autism", "verdict": "REFUTED",
     "source": "CDC, WHO, Cochrane Review 2020",
     "explanation": "The original Wakefield study was retracted. 20+ large studies find no link."},
    {"claim": "The Great Wall of China is visible from space", "verdict": "REFUTED",
     "source": "NASA, astronaut reports",
     "explanation": "Astronauts confirm it is not visible from low Earth orbit with the naked eye."},
    {"claim": "Humans use only 10% of their brains", "verdict": "REFUTED",
     "source": "Neuroscience consensus",
     "explanation": "Brain imaging shows all regions are active. The 10% claim has no scientific basis."},
    {"claim": "Einstein failed math as a child", "verdict": "REFUTED",
     "source": "Einstein's school records, biographers",
     "explanation": "Einstein excelled at math from an early age. This myth is well-documented as false."},
    {"claim": "Lightning never strikes the same place twice", "verdict": "REFUTED",
     "source": "NOAA, physics",
     "explanation": "Tall structures are struck repeatedly. The Empire State Building is struck ~23x/year."},
]

def ingest_known_misinformation(vectorstore: Chroma):
    print("Ingesting known misinformation seed corpus...")
    docs = []
    for item in KNOWN_MISINFORMATION:
        content = (
            f"Claim: {item['claim']}\n"
            f"Verdict: {item['verdict']}\n"
            f"Source: {item['source']}\n"
            f"Explanation: {item['explanation']}"
        )
        docs.append(Document(
            page_content=content,
            metadata={
                "source_type": "verified_factcheck",
                "verdict": item["verdict"],
                "credibility_tier": "verified",
                "source": item["source"]
            }
        ))
    vectorstore.add_documents(docs)
    print(f"  Added {len(docs)} known misinformation entries.")


# ─────────────────────────────────────────────
# Main ingestion runner
# ─────────────────────────────────────────────
def build_corpus():
    print(f"\nBuilding ChromaDB corpus at: {CHROMA_DIR}\n{'='*50}")

    vectorstore = Chroma(
        persist_directory=CHROMA_DIR,
        embedding_function=EMBEDDINGS,
        collection_name="factcheck_corpus"
    )

    ingest_wikipedia(vectorstore)
    ingest_fact_sheets(vectorstore)
    ingest_known_misinformation(vectorstore)
    ingest_custom_docs(vectorstore)

    count = vectorstore._collection.count()
    print(f"\nCorpus built successfully. Total chunks: {count}")
    print(f"ChromaDB persisted at: {CHROMA_DIR}/")


if __name__ == "__main__":
    build_corpus()
