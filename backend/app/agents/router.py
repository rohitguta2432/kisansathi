"""Router agent: one fast LLM call that decides
(a) which specialist should answer, (b) what language the farmer used,
(c) any location / commodity / state mentioned (so tools can be called).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass

from ..llm import get_provider
from .registry import AGENTS

ROUTER_SYSTEM = """You are the router of KisanSathi, a farmer help system.
Classify the farmer's message. Reply with ONLY a JSON object, no other text:

{
  "agent": one of ["crop", "pest", "weather", "market", "schemes", "soil"],
  "language": short name of the message's language, e.g. "Hindi", "English",
              "Hinglish", "Marathi", "Telugu",
  "place": location mentioned or null,
  "commodity": crop/commodity mentioned (in English) or null,
  "state": Indian state mentioned (in English) or null
}

Routing guide:
- crop: sowing, varieties, fertiliser dose, irrigation schedule, yield
- pest: insects, disease symptoms, spots/wilting/holes, weeds, spray for pest
- weather: forecast, rain, when to irrigate/spray based on weather
- market: mandi price, bhav, when/where to sell, MSP
- schemes: sarkari yojana, PM-KISAN, loan, KCC, insurance, subsidy
- soil: mitti, soil test, pH, nutrients, compost, soil improvement
"""


@dataclass
class Route:
    agent_key: str
    language: str
    place: str | None
    commodity: str | None
    state: str | None


def _extract_json(text: str) -> dict:
    # tolerate models that wrap JSON in prose or code fences
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"router returned no JSON: {text[:200]}")
    return json.loads(match.group(0))


async def route(question: str) -> Route:
    provider = get_provider()
    try:
        raw = await provider.complete(ROUTER_SYSTEM, question)
        data = _extract_json(raw)
    except Exception:
        # Router failure must never block the farmer: fall back to the
        # generalist crop agent and let the LLM answer in-language.
        return Route("crop", "same as question", None, None, None)

    agent_key = data.get("agent", "crop")
    if agent_key not in AGENTS:
        agent_key = "crop"
    return Route(
        agent_key=agent_key,
        language=data.get("language") or "same as question",
        place=data.get("place"),
        commodity=data.get("commodity"),
        state=data.get("state"),
    )
