"""LLM provider abstraction.

Two providers, one interface:
- OllamaProvider  — default; fully local, no API key, no data leaves the machine
- AnthropicProvider — optional; enabled when KISANSATHI_LLM_PROVIDER=anthropic

Both expose `complete()` (one-shot, used by the router) and `stream()`
(token stream, used by specialist agents so the farmer sees the answer form).
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import httpx

from . import config


class OllamaProvider:
    def __init__(self, base_url: str | None = None, model: str | None = None):
        self.base_url = (base_url or config.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or config.OLLAMA_MODEL

    async def complete(self, system: str, user: str) -> str:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "stream": False,
                    # qwen3 is a reasoning model; keep answers direct
                    "think": False,
                    "options": {"temperature": 0.2},
                },
            )
            resp.raise_for_status()
            return resp.json()["message"]["content"].strip()

    async def stream(self, system: str, user: str) -> AsyncIterator[str]:
        import json

        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "stream": True,
                    "think": False,
                    "options": {"temperature": 0.4},
                },
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    chunk = json.loads(line)
                    token = chunk.get("message", {}).get("content", "")
                    if token:
                        yield token
                    if chunk.get("done"):
                        break


class AnthropicProvider:
    def __init__(self, model: str | None = None):
        from anthropic import AsyncAnthropic  # optional dependency

        self.client = AsyncAnthropic()
        self.model = model or config.ANTHROPIC_MODEL

    async def complete(self, system: str, user: str) -> str:
        msg = await self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return msg.content[0].text.strip()

    async def stream(self, system: str, user: str) -> AsyncIterator[str]:
        async with self.client.messages.stream(
            model=self.model,
            max_tokens=2048,
            system=system,
            messages=[{"role": "user", "content": user}],
        ) as stream:
            async for token in stream.text_stream:
                yield token


def get_provider():
    if config.LLM_PROVIDER == "anthropic":
        return AnthropicProvider()
    return OllamaProvider()
