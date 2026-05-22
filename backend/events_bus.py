"""
OpenClaw EventBus — typed, persistent, broadcastable.
All writes in the system should go through publish().
"""
import asyncio, json, logging
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Callable, Any
import uuid

logger = logging.getLogger("eventbus")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


@dataclass
class OrgEvent:
    event_type: str
    org_id: str
    payload: dict
    actor_id: str = ""
    actor_type: str = "user"   # user | agent | system
    subject_id: str = ""       # resource affected
    subject_type: str = ""     # proposal | workflow | agent | message …
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=now_iso)
    correlation_id: str = ""

    def as_ws_message(self) -> dict:
        return {"event": self.event_type, "data": self.payload,
                "event_id": self.id, "ts": self.created_at}


class EventBus:
    """Central event hub: persist → broadcast → run handlers."""

    def __init__(self, db, ws_manager):
        self.db = db
        self.ws = ws_manager
        self._handlers: dict[str, list[Callable]] = {}
        # wildcard "*" catches everything

    # ── subscribe / unsubscribe ───────────────────────────────────────────
    def subscribe(self, event_type: str):
        """Decorator: @bus.subscribe('board.vote_cast') async def handler(e): ..."""
        def _deco(fn: Callable):
            self._handlers.setdefault(event_type, []).append(fn)
            return fn
        return _deco

    def on(self, event_type: str, fn: Callable):
        self._handlers.setdefault(event_type, []).append(fn)

    # ── publish ───────────────────────────────────────────────────────────
    async def publish(self, event: OrgEvent, persist: bool = True):
        try:
            # 1. Persist
            if persist:
                doc = asdict(event)
                await self.db.events.insert_one(doc)

            # 2. Broadcast via WebSocket
            await self.ws.broadcast(event.org_id, event.as_ws_message())

            # 3. Run handlers
            handlers = (
                self._handlers.get(event.event_type, []) +
                self._handlers.get("*", [])
            )
            for h in handlers:
                asyncio.create_task(h(event))
        except Exception as exc:
            logger.error(f"EventBus.publish error: {exc}")

    async def recent(self, org_id: str, limit: int = 50, event_type: str = None):
        query = {"org_id": org_id}
        if event_type:
            query["event_type"] = event_type
        docs = await self.db.events.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        return docs
