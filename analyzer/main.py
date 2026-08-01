"""
Assignment Management — AI Verdict Analyzer
FastAPI microservice for computing originality scores from event streams.
Run: uvicorn main:app --port 8002 (from the analyzer/ directory)
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from verdict import compute_verdict

app = FastAPI(title="Assignment Verdict Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(request: dict):
    events = request.get("events", [])
    stats = request.get("stats", {})
    return compute_verdict(events, stats)