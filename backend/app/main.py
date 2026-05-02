"""FastAPI entrypoint for TrustPitch backend."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import audio, coach, live_reaction, qna, sessions, visual

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL, logging.INFO))
logger = logging.getLogger("trustpitch")


app = FastAPI(
    title="TrustPitch API",
    version="0.1.0",
    description="Realtime IR pitch coaching backend",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


API_PREFIX = "/api/v1"
app.include_router(sessions.router, prefix=API_PREFIX, tags=["sessions"])
app.include_router(audio.router, prefix=API_PREFIX, tags=["audio"])
app.include_router(visual.router, prefix=API_PREFIX, tags=["visual"])
app.include_router(coach.router, prefix=API_PREFIX, tags=["coach"])
app.include_router(live_reaction.router, prefix=API_PREFIX, tags=["live"])
app.include_router(qna.router, prefix=API_PREFIX, tags=["qna"])


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "trustpitch", "status": "ok"}


@app.get("/healthz")
def healthz() -> dict[str, object]:
    return {
        "ok": True,
        "supabase": settings.supabase_configured,
        "openai": bool(settings.OPENAI_API_KEY),
        "demo_mode": settings.DEMO_MODE,
    }
