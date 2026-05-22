"""
OpenClaw Deliberation Engine.

Two modes:
  1. Board debate  — quick agent rationale attached to a proposal.
  2. Deliberation Room — multi-round private debate with thought snapshots.

Thought snapshot schema (structured JSON per agent turn):
  {
    "agent_id": str,
    "agent_name": str,
    "stance": "approve" | "reject" | "abstain" | "uncertain",
    "confidence": float (0-1),
    "reasoning": str (1-2 sentences),
    "concerns": [str],
    "questions": [str],
    "round": int,
  }
"""
import asyncio, json, logging, uuid
from datetime import datetime, timezone
from providers import call_model, LLMResponse

logger = logging.getLogger("deliberation")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


SNAPSHOT_SYSTEM = """You are {agent_name}, an AI agent with this personality:
{system_prompt}

You are participating in a board deliberation for an AI organization.
When given a proposal, respond with a JSON object (no markdown fences) with:
{{
  "stance": "approve" or "reject" or "abstain" or "uncertain",
  "confidence": <float 0.0-1.0>,
  "reasoning": "<1-2 sentence explanation>",
  "concerns": ["<concern1>", "<concern2>"],
  "questions": ["<question for others>"]
}}
Be specific to your role. Output ONLY valid JSON."""

SUMMARY_SYSTEM = """You are a deliberation summarizer. Given the results of an AI agent board deliberation,
create a concise summary for human readers.
Return a JSON object:
{{
  "outcome": "approve" | "reject" | "split" | "inconclusive",
  "consensus": "<1 sentence>",
  "key_arguments_for": ["<point>"],
  "key_arguments_against": ["<point>"],
  "unresolved": ["<open question>"],
  "recommended_action": "<1 sentence concrete recommendation>"
}}
Output ONLY valid JSON."""


def _parse_snapshot(text: str, agent, round_num: int) -> dict:
    """Parse LLM JSON output into a thought snapshot (handles markdown fences)."""
    # Strip markdown code fences
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # remove first and last fence lines
        inner = []
        for i, line in enumerate(lines):
            if i == 0 and line.startswith("```"):
                continue
            if i == len(lines)-1 and line.strip() == "```":
                continue
            inner.append(line)
        text = "\n".join(inner).strip()

    # Try direct parse
    try:
        raw = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        # Find the first { and last } to extract JSON
        start = text.find("{")
        end   = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                raw = json.loads(text[start:end+1])
            except Exception:
                raw = {}
        else:
            raw = {}

    if not isinstance(raw, dict):
        raw = {}

    return {
        "id": str(uuid.uuid4()),
        "agent_id": agent["id"],
        "agent_name": agent["name"],
        "agent_role": agent.get("role", "Agent"),
        "agent_color": agent.get("avatar_color", "#22d3ee"),
        "stance": raw.get("stance", "uncertain"),
        "confidence": min(1.0, max(0.0, float(raw.get("confidence", 0.5)))),
        "reasoning": raw.get("reasoning", "No reasoning provided"),
        "concerns": raw.get("concerns", []),
        "questions": raw.get("questions", []),
        "round": round_num,
        "created_at": now_iso(),
    }


async def generate_agent_snapshot(
    agent: dict,
    proposal_title: str,
    proposal_description: str,
    prior_snapshots: list,
    round_num: int,
    org_config: dict,  # {provider, model, api_key, openrouter_key}
) -> dict:
    """Generate one agent's thought snapshot for a proposal."""
    system = SNAPSHOT_SYSTEM.format(
        agent_name=agent["name"],
        system_prompt=agent.get("system_prompt") or f"You are {agent['name']}, a {agent.get('role','AI agent')}."
    )

    context_parts = [
        f"PROPOSAL: {proposal_title}",
        f"DESCRIPTION: {proposal_description or 'No description provided'}",
    ]
    if prior_snapshots:
        context_parts.append("\nPREVIOUS ARGUMENTS:")
        for s in prior_snapshots[-5:]:  # last 5 to avoid context overflow
            context_parts.append(
                f"  - {s['agent_name']} ({s.get('agent_role','Agent')}): "
                f"STANCE={s['stance']} | {s['reasoning']}"
            )
        context_parts.append("\nNow give YOUR thought snapshot.")

    user_prompt = "\n".join(context_parts)

    # Choose task type based on agent skills/role
    task_type = "deliberate"
    role_lower = (agent.get("role") or "").lower()
    if any(k in role_lower for k in ["code", "dev", "engineer", "technical"]):
        task_type = "coding"
    elif any(k in role_lower for k in ["analy", "research", "data"]):
        task_type = "reasoning"

    resp: LLMResponse = await call_model(
        task_type=task_type,
        system=system,
        user=user_prompt,
        provider_override=agent.get("provider_override") or org_config.get("provider", ""),
        model_override=agent.get("model_override") or "",
        api_key_override=agent.get("api_key") or "",
        openrouter_key=org_config.get("openrouter_key", ""),
    )

    return _parse_snapshot(resp.text, agent, round_num)


async def generate_deliberation_summary(
    proposal_title: str,
    snapshots: list,
    org_config: dict,
) -> dict:
    """Summarise all agent snapshots into a human-readable outcome."""
    snapshot_text = json.dumps([
        {"agent": s["agent_name"], "role": s["agent_role"],
         "stance": s["stance"], "confidence": s["confidence"],
         "reasoning": s["reasoning"], "concerns": s["concerns"]}
        for s in snapshots
    ], indent=2)

    user_prompt = (
        f"PROPOSAL: {proposal_title}\n\n"
        f"AGENT SNAPSHOTS:\n{snapshot_text}\n\n"
        "Produce the deliberation summary JSON."
    )

    resp: LLMResponse = await call_model(
        task_type="summarize",
        system=SUMMARY_SYSTEM,
        user=user_prompt,
        api_key_override="",
        openrouter_key=org_config.get("openrouter_key", ""),
    )

    try:
        raw = json.loads(resp.text.strip())
    except Exception:
        # strip markdown fences and extract JSON
        text = resp.text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            inner = [l for i,l in enumerate(lines) if not (i==0 and l.startswith("```")) and not (i==len(lines)-1 and l.strip()=="```")]
            text = "\n".join(inner).strip()
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                raw = json.loads(text[start:end+1])
            except Exception:
                raw = {}
        else:
            raw = {}

    approve_count = sum(1 for s in snapshots if s["stance"] == "approve")
    reject_count  = sum(1 for s in snapshots if s["stance"] == "reject")

    return {
        "id": str(uuid.uuid4()),
        "outcome": raw.get("outcome", "approve" if approve_count > reject_count else "reject"),
        "consensus": raw.get("consensus", ""),
        "key_arguments_for": raw.get("key_arguments_for", []),
        "key_arguments_against": raw.get("key_arguments_against", []),
        "unresolved": raw.get("unresolved", []),
        "recommended_action": raw.get("recommended_action", ""),
        "vote_tally": {"approve": approve_count, "reject": reject_count,
                       "abstain": len(snapshots) - approve_count - reject_count},
        "created_at": now_iso(),
    }
