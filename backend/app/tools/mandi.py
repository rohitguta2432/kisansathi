"""Live mandi (wholesale market) prices from Agmarknet via data.gov.in.

Works out of the box with the public sample key; a free personal key from
https://data.gov.in raises the rate limit but is never required.
"""

from __future__ import annotations

import httpx

from .. import config

API_URL = f"https://api.data.gov.in/resource/{config.MANDI_RESOURCE_ID}"

# data.gov.in silently stalls requests carrying python client User-Agents,
# so we send a plain generic one. Verified: default httpx UA times out,
# this returns in <1s.
HEADERS = {"User-Agent": "KisanSathi/0.1 (+https://github.com/rohitguta2432/kisansathi)", "Accept": "*/*"}


async def latest_prices(
    commodity: str | None = None,
    state: str | None = None,
    limit: int = 10,
) -> str:
    async def fetch(filters: dict) -> list[dict]:
        params: dict = {
            "api-key": config.DATA_GOV_IN_KEY,
            "format": "json",
            "limit": limit,
            **filters,
        }
        async with httpx.AsyncClient(timeout=45, headers=HEADERS) as client:
            resp = await client.get(API_URL, params=params)
            resp.raise_for_status()
            return resp.json().get("records", [])

    # Not every mandi reports every day, so narrow filters often return
    # nothing. Degrade gracefully: state+commodity -> commodity -> anything.
    attempts: list[dict] = []
    if commodity and state:
        attempts.append(
            {"filters[commodity]": commodity.title(), "filters[state]": state.title()}
        )
    if commodity:
        attempts.append({"filters[commodity]": commodity.title()})
    attempts.append({})

    records: list[dict] = []
    try:
        for filters in attempts:
            records = await fetch(filters)
            if records:
                break
    except (httpx.HTTPError, ValueError) as exc:
        return f"Mandi price service unavailable right now ({exc.__class__.__name__})."

    if not records:
        return (
            f"No recent mandi records found for "
            f"commodity={commodity or 'any'}, state={state or 'any'}."
        )

    lines = ["Latest mandi prices (₹ per quintal):"]
    for r in records:
        lines.append(
            f"{r.get('commodity')} ({r.get('variety', '-')}) at "
            f"{r.get('market')}, {r.get('district')}, {r.get('state')} "
            f"on {r.get('arrival_date')}: min {r.get('min_price')}, "
            f"max {r.get('max_price')}, modal {r.get('modal_price')}"
        )
    return "\n".join(lines)
