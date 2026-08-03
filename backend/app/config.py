"""Central configuration. Everything works keyless out of the box:
Ollama is the default LLM provider, weather comes from Open-Meteo (no key),
and mandi prices use data.gov.in's public sample key unless a real one is set.
"""

import os

from dotenv import load_dotenv

load_dotenv()

# --- LLM provider -----------------------------------------------------------
# "ollama" (default, fully local) or "anthropic" (needs ANTHROPIC_API_KEY)
LLM_PROVIDER = os.getenv("KISANSATHI_LLM_PROVIDER", "ollama")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("KISANSATHI_OLLAMA_MODEL", "qwen3:14b")

ANTHROPIC_MODEL = os.getenv("KISANSATHI_ANTHROPIC_MODEL", "claude-sonnet-5")

# --- Live data --------------------------------------------------------------
# data.gov.in publishes a rate-limited public sample key; a personal key is
# free at https://data.gov.in but never required to run KisanSathi.
DATA_GOV_IN_KEY = os.getenv(
    "DATA_GOV_IN_KEY",
    "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b",
)

# Agmarknet daily mandi price resource on data.gov.in
MANDI_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"

REQUEST_TIMEOUT_SECONDS = float(os.getenv("KISANSATHI_HTTP_TIMEOUT", "20"))
