"""
OpenClaw Provider Registry — modular, swappable, routed by task type.

Providers:
  emergent   — Emergent Universal Key (OpenAI/Anthropic/Gemini)
  openrouter — OpenRouter API (DeepSeek + 300+ models)

Task routing:
  reasoning     → Claude
  coding        → GPT-4.1
  chatter       → GPT-4.1-mini  (or DeepSeek via openrouter)
  multimodal    → Gemini
  default       → GPT-4.1-mini
"""
import asyncio, httpx, json, logging, os, time, uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger("providers")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# ── Task → (provider, model) routing table ───────────────────────────────
ROUTE_TABLE = {
    "reasoning":   ("anthropic",  "claude-sonnet-4-6"),
    "coding":      ("openai",     "gpt-4.1"),
    "chatter":     ("openai",     "gpt-4.1-mini"),
    "multimodal":  ("gemini",     "gemini-3-flash-preview"),
    "summarize":   ("anthropic",  "claude-sonnet-4-6"),
    "deliberate":  ("anthropic",  "claude-sonnet-4-6"),
    "default":     ("openai",     "gpt-4.1-mini"),
}

# ── Health metrics (in-memory, flushed to DB by health module) ────────────
health_metrics: dict[str, list] = {}


@dataclass
class LLMResponse:
    text: str
    provider: str
    model: str
    latency_ms: int
    tokens_in: int = 0
    tokens_out: int = 0
    error: str = ""


def _record_latency(provider: str, model: str, latency: int, ok: bool):
    key = f"{provider}/{model}"
    health_metrics.setdefault(key, []).append({
        "ts": datetime.now(timezone.utc).isoformat(),
        "latency_ms": latency,
        "ok": ok,
    })
    # keep last 200 samples
    health_metrics[key] = health_metrics[key][-200:]


# ── Emergent provider (OpenAI/Anthropic/Gemini via universal key) ─────────
async def call_emergent(
    system: str,
    user: str,
    provider: str,
    model: str,
    api_key_override: str = "",
) -> LLMResponse:
    key = api_key_override or EMERGENT_LLM_KEY
    if not key:
        return LLMResponse(text="[No API key configured]", provider=provider, model=model, latency_ms=0, error="no_key")
    t0 = time.monotonic()
    try:
        session_id = str(uuid.uuid4())
        chat = LlmChat(api_key=key, session_id=session_id, system_message=system)
        chat.with_model(provider, model)
        resp = await chat.send_message(UserMessage(text=user))
        latency = int((time.monotonic() - t0) * 1000)
        _record_latency(provider, model, latency, True)
        return LLMResponse(text=str(resp) if resp else "", provider=provider, model=model, latency_ms=latency)
    except Exception as exc:
        latency = int((time.monotonic() - t0) * 1000)
        _record_latency(provider, model, latency, False)
        logger.error(f"Emergent call error ({provider}/{model}): {exc}")
        return LLMResponse(text="", provider=provider, model=model, latency_ms=latency, error=str(exc))


# ── OpenRouter provider (DeepSeek + 300+ models) ──────────────────────────
async def call_openrouter(
    system: str,
    user: str,
    model: str = "deepseek/deepseek-chat",
    api_key: str = "",
) -> LLMResponse:
    key = api_key or os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        return LLMResponse(text="[OpenRouter key not configured]", provider="openrouter", model=model, latency_ms=0, error="no_key")
    t0 = time.monotonic()
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://openclaw.ai",
        "X-Title": "OpenClaw Command Center",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()
        latency = int((time.monotonic() - t0) * 1000)
        text = data["choices"][0]["message"]["content"]
        _record_latency("openrouter", model, latency, True)
        return LLMResponse(text=text, provider="openrouter", model=model, latency_ms=latency,
                           tokens_in=data.get("usage", {}).get("prompt_tokens", 0),
                           tokens_out=data.get("usage", {}).get("completion_tokens", 0))
    except Exception as exc:
        latency = int((time.monotonic() - t0) * 1000)
        _record_latency("openrouter", model, latency, False)
        logger.error(f"OpenRouter call error ({model}): {exc}")
        return LLMResponse(text="", provider="openrouter", model=model, latency_ms=latency, error=str(exc))


# ── Universal call with task routing ─────────────────────────────────────
async def call_model(
    task_type: str,
    system: str,
    user: str,
    provider_override: str = "",
    model_override: str = "",
    api_key_override: str = "",
    openrouter_key: str = "",
) -> LLMResponse:
    """Route call to the right provider/model based on task type."""
    provider, model = ROUTE_TABLE.get(task_type, ROUTE_TABLE["default"])
    if provider_override:
        provider = provider_override
    if model_override:
        model = model_override

    if provider == "openrouter" or (provider_override == "openrouter"):
        return await call_openrouter(system, user, model, openrouter_key)
    else:
        return await call_emergent(system, user, provider, model, api_key_override)


def get_provider_health() -> list:
    """Return health summary for all providers sampled so far."""
    result = []
    for key, samples in health_metrics.items():
        if not samples:
            continue
        recent = samples[-20:]
        avg_latency = sum(s["latency_ms"] for s in recent) // len(recent)
        ok_pct = sum(1 for s in recent if s["ok"]) / len(recent) * 100
        provider, model = key.split("/", 1)
        result.append({
            "provider": provider, "model": model,
            "avg_latency_ms": avg_latency,
            "success_rate": round(ok_pct, 1),
            "samples": len(recent),
            "last_sampled": recent[-1]["ts"] if recent else None,
        })
    return result
