"""Live weather via Open-Meteo — completely keyless.

Geocoding also comes from Open-Meteo's free geocoding API, so a farmer can
say a village/town/district name and get a real 7-day forecast for it.
"""

from __future__ import annotations

import httpx

from .. import config

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"


async def geocode(place: str) -> dict | None:
    async with httpx.AsyncClient(timeout=config.REQUEST_TIMEOUT_SECONDS) as client:
        resp = await client.get(
            GEOCODE_URL,
            params={"name": place, "count": 1, "language": "en", "format": "json"},
        )
        resp.raise_for_status()
        results = resp.json().get("results") or []
        return results[0] if results else None


async def seven_day_forecast(place: str) -> str:
    """Return a compact text block the agent can ground its advice in."""
    loc = await geocode(place)
    if loc is None:
        return f"Could not find location '{place}'."

    async with httpx.AsyncClient(timeout=config.REQUEST_TIMEOUT_SECONDS) as client:
        resp = await client.get(
            FORECAST_URL,
            params={
                "latitude": loc["latitude"],
                "longitude": loc["longitude"],
                "daily": "temperature_2m_max,temperature_2m_min,"
                "precipitation_sum,precipitation_probability_max,"
                "wind_speed_10m_max",
                "timezone": "auto",
                "forecast_days": 7,
            },
        )
        resp.raise_for_status()
        daily = resp.json()["daily"]

    name = f"{loc['name']}, {loc.get('admin1', '')}".strip(", ")
    lines = [f"7-day forecast for {name}:"]
    for i, date in enumerate(daily["time"]):
        lines.append(
            f"{date}: {daily['temperature_2m_min'][i]:.0f}-"
            f"{daily['temperature_2m_max'][i]:.0f}°C, "
            f"rain {daily['precipitation_sum'][i]:.1f}mm "
            f"({daily['precipitation_probability_max'][i]}% chance), "
            f"wind up to {daily['wind_speed_10m_max'][i]:.0f} km/h"
        )
    return "\n".join(lines)
