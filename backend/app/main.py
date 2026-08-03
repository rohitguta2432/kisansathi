"""KisanSathi API.

POST /api/ask streams Server-Sent Events so the UI can show the pipeline
live: routing decision -> live-data fetch -> token-by-token answer.

Event types:
  routing   {}                        router is thinking
  routed    {agent, agent_name, agent_name_hi, emoji, language}
  context   {has_live_data}           live data fetched (weather/mandi)
  token     {text}                    one answer token
  done      {}                        answer complete
  error     {message}
"""

from __future__ import annotations

import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .agents import specialist
from .agents.registry import AGENTS
from .agents.router import route as route_query

app = FastAPI(title="KisanSathi", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    question: str


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.get("/api/health")
async def health():
    return {"status": "ok", "agents": list(AGENTS.keys())}


@app.get("/api/agents")
async def agents():
    return [
        {
            "key": a.key,
            "name": a.name,
            "name_hi": a.name_hi,
            "emoji": a.emoji,
            "description": a.description,
        }
        for a in AGENTS.values()
    ]


@app.post("/api/ask")
async def ask(req: AskRequest):
    async def event_stream():
        try:
            yield sse("routing", {})
            route = await route_query(req.question)
            spec = AGENTS[route.agent_key]
            yield sse(
                "routed",
                {
                    "agent": spec.key,
                    "agent_name": spec.name,
                    "agent_name_hi": spec.name_hi,
                    "emoji": spec.emoji,
                    "language": route.language,
                },
            )
            async for token in specialist.answer(req.question, route):
                yield sse("token", {"text": token})
            yield sse("done", {})
        except Exception as exc:
            yield sse("error", {"message": str(exc)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
