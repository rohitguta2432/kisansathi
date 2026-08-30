# 🌾 KisanSathi — किसान साथी

**Six AI experts for every farmer. Free, open source, runs on your own machine.**

KisanSathi is a multi-agent AI assistant that answers farmer questions in
**their own language** — Hindi, Hinglish, English, or any regional language.
Ask one question; a router agent picks the right specialist, pulls **live
data** (real weather, real mandi prices), and streams back a short, practical
answer a farmer can act on.

Inspired by the [AgroAskAI paper](https://arxiv.org/abs/2512.14910)
(multi-agentic framework for smallholder farmer enquiries) — built as a
working open-source implementation for Indian farmers.

## The agent team

| Agent | Domain | Live data |
|---|---|---|
| 🌾 Crop Advisor · फ़सल सलाहकार | Sowing, varieties, fertiliser, yield | — |
| 🐛 Pest & Disease Expert · कीट-रोग विशेषज्ञ | Identify + treat pests/diseases | — |
| 🌦️ Weather & Irrigation · मौसम और सिंचाई | Irrigation & spray timing | Open-Meteo 7-day forecast (keyless) |
| 📈 Mandi Price Analyst · मंडी भाव विश्लेषक | When/where to sell | Agmarknet daily prices via data.gov.in |
| 🏛️ Govt Schemes Guide · सरकारी योजना गाइड | PM-KISAN, KCC, insurance, subsidies | — |
| 🪱 Soil Health Advisor · मिट्टी सलाहकार | pH, nutrients, soil testing | — |

## How it works

```
farmer question (any language)
        │
        ▼
┌───────────────┐   one fast LLM call → {agent, language, place, commodity}
│  Router agent │
└───────┬───────┘
        ▼
┌───────────────┐   fetches live data its domain needs
│  Specialist    │   (Open-Meteo forecast / Agmarknet prices)
│  agent ×6      │
└───────┬───────┘
        ▼
streamed answer, in the farmer's language, grounded in real numbers
```

The UI shows the pipeline live: which expert picked up the question, what
language was detected, and the answer streaming token by token.

## Voice — बोलकर पूछें, सुनकर समझें

Typing is a real barrier for many farmers. KisanSathi now talks:

- **🎙️ Speak your question** — press the mic and ask in Hindi, Hinglish or
  English (browser SpeechRecognition, `hi-IN`). The final transcript is
  submitted automatically.
- **🔊 Hear the answer** — every answer has a सुनें button that reads it
  aloud, picking a Hindi voice for Devanagari answers and an Indian-English
  voice otherwise (browser speechSynthesis).

Like everything else here it is **keyless** — both run entirely in the
browser, no speech API accounts, no audio leaves the device beyond what the
browser's own speech engine does. Works best in Chrome/Edge; the buttons
hide themselves where the APIs are missing.

## Why keyless matters

Most farmer-facing AI tools die at the API-key step. KisanSathi runs with
**zero keys**:

- **LLM**: [Ollama](https://ollama.com) locally (default `qwen3:14b`) — no
  data leaves the machine
- **Weather**: Open-Meteo — free, no key
- **Mandi prices**: data.gov.in public sample key built in (add a free
  personal key to raise rate limits)

Optionally set `KISANSATHI_LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` for
a hosted model.

## Quickstart

Prereqs: Python 3.11+, Node 20+, [Ollama](https://ollama.com) with a model
pulled (`ollama pull qwen3:14b`).

```bash
git clone https://github.com/rohitguta2432/kisansathi
cd kisansathi

# backend
cd backend
uv venv && uv pip install -e ".[dev]"     # or: pip install -e ".[dev]"
.venv/bin/uvicorn app.main:app --port 8000 &

# frontend
cd ../frontend
npm install
npm run dev
```

Open http://localhost:3000 and ask: *"गेहूं में पीले पत्ते आ रहे हैं, क्या करूं?"*

Run tests: `cd backend && .venv/bin/pytest`

## Configuration

Everything is optional — see [backend/.env.example](backend/.env.example).

| Variable | Default | Purpose |
|---|---|---|
| `KISANSATHI_LLM_PROVIDER` | `ollama` | `ollama` or `anthropic` |
| `KISANSATHI_OLLAMA_MODEL` | `qwen3:14b` | any Ollama chat model |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | remote Ollama host |
| `ANTHROPIC_API_KEY` | — | only for provider=anthropic |
| `DATA_GOV_IN_KEY` | public sample key | free key from data.gov.in |

## Adding an agent

One entry in
[`backend/app/agents/registry.py`](backend/app/agents/registry.py) — key,
name, emoji, system prompt, optional tools. The router, API and UI pick it up
automatically.

## Honest limits

- LLM advice can be wrong. The UI says so. Farmers should confirm critical
  decisions (pesticide doses, big selling decisions) with their local Krishi
  Vigyan Kendra.
- Mandi coverage depends on what mandis reported today; the tool degrades
  from state+commodity → commodity → latest records.
- Scheme details change; the schemes agent tells farmers to verify at a CSC.

## License

[MIT](LICENSE). Built to be forked — translate it, add crops, add agents,
put it on a kiosk in a village. That's the point.

---

### 🤝 Work with me

I'm an **AI Consultant · Forward Deployed Engineer** — I embed with teams and ship AI to production: agents, MCP integrations, and LLM features, with evals proving they work.

**→ [rohitraj.tech/en/hire](https://rohitraj.tech/en/hire)**
