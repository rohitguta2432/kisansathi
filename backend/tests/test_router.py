"""Router unit tests — JSON extraction and fallback behaviour (no LLM calls)."""

import pytest

from app.agents.registry import AGENTS
from app.agents.router import _extract_json


def test_extract_plain_json():
    data = _extract_json('{"agent": "pest", "language": "Hindi"}')
    assert data["agent"] == "pest"


def test_extract_json_in_code_fence():
    raw = 'Here you go:\n```json\n{"agent": "market", "language": "English", "place": null, "commodity": "Wheat", "state": "Punjab"}\n```'
    data = _extract_json(raw)
    assert data["commodity"] == "Wheat"


def test_extract_no_json_raises():
    with pytest.raises(ValueError):
        _extract_json("sorry I cannot classify this")


def test_all_agents_have_prompts():
    assert set(AGENTS) == {"crop", "pest", "weather", "market", "schemes", "soil"}
    for spec in AGENTS.values():
        assert "KisanSathi" in spec.system_prompt
        assert spec.emoji and spec.name_hi
