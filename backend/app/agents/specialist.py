"""Specialist execution: gather the agent's live data (if any), then stream
the grounded answer from the LLM.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from ..llm import get_provider
from ..tools import mandi, weather
from .registry import AGENTS
from .router import Route


async def gather_context(route: Route) -> str | None:
    """Fetch live data for the routed agent. Failures degrade to no-context —
    the agent then answers from knowledge and says data was unavailable."""
    spec = AGENTS[route.agent_key]
    parts: list[str] = []

    if "weather" in spec.tools:
        place = route.place or "Delhi"
        try:
            parts.append(await weather.seven_day_forecast(place))
        except Exception as exc:
            parts.append(f"(live forecast unavailable: {exc.__class__.__name__})")

    if "mandi" in spec.tools:
        try:
            parts.append(
                await mandi.latest_prices(
                    commodity=route.commodity, state=route.state
                )
            )
        except Exception as exc:
            parts.append(f"(live mandi prices unavailable: {exc.__class__.__name__})")

    return "\n\n".join(parts) if parts else None


async def answer(question: str, route: Route) -> AsyncIterator[str]:
    spec = AGENTS[route.agent_key]
    provider = get_provider()

    context = await gather_context(route)
    lang_rule = (
        f"Reply strictly in {route.language}."
        if route.language and route.language != "same as question"
        else "Reply strictly in the same language as the question."
    )
    user_msg = f"FARMER'S QUESTION:\n{question}\n\n({lang_rule})"
    if context:
        user_msg = (
            f"LIVE DATA (ground your answer in this):\n{context}\n\n" + user_msg
        )

    async for token in provider.stream(spec.system_prompt, user_msg):
        yield token
