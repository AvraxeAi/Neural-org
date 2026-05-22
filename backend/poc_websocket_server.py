"""
Phase 1 POC: WebSocket real-time event bus with per-org isolation.
Minimal FastAPI server to test core WebSocket functionality.
Run standalone with: uvicorn poc_websocket_server:app --port 8002
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from starlette.middleware.cors import CORSMiddleware
import asyncio
import json
import uuid
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("poc_ws")

app = FastAPI(title="POC WebSocket Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory org-scoped connection manager ────────────────────────────────
class OrgConnectionManager:
    def __init__(self):
        # org_id → list of (ws, client_id)
        self._rooms: dict[str, list[tuple[WebSocket, str]]] = {}

    async def connect(self, org_id: str, ws: WebSocket, client_id: str):
        await ws.accept()
        self._rooms.setdefault(org_id, []).append((ws, client_id))
        logger.info(f"[WS] Client {client_id} joined org {org_id}")

    def disconnect(self, org_id: str, ws: WebSocket):
        if org_id in self._rooms:
            self._rooms[org_id] = [
                (w, c) for w, c in self._rooms[org_id] if w is not ws
            ]
            logger.info(f"[WS] Client disconnected from org {org_id}")

    async def broadcast(self, org_id: str, event: dict, exclude_ws: WebSocket | None = None):
        payload = json.dumps(event)
        dead = []
        for ws, cid in self._rooms.get(org_id, []):
            if ws is exclude_ws:
                continue
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(org_id, ws)

    def room_size(self, org_id: str) -> int:
        return len(self._rooms.get(org_id, []))


manager = OrgConnectionManager()

# ── In-memory data store for POC ──────────────────────────────────────────
orgs: dict[str, dict] = {}
proposals: dict[str, dict] = {}
messages: dict[str, dict] = {}
workflow_runs: dict[str, dict] = {}


# ── HTTP routes ───────────────────────────────────────────────────────────

@app.post("/poc/orgs")
async def create_org(data: dict):
    oid = str(uuid.uuid4())
    org = {"id": oid, "name": data.get("name", "Test Org")}
    orgs[oid] = org
    return org


@app.post("/poc/orgs/{org_id}/proposals")
async def create_proposal(org_id: str, data: dict):
    pid = str(uuid.uuid4())
    proposal = {"id": pid, "org_id": org_id, "title": data.get("title", "Proposal"), "votes": []}
    proposals[pid] = proposal
    # broadcast event to org
    await manager.broadcast(org_id, {
        "event": "proposal_created",
        "data": proposal,
    })
    return proposal


@app.post("/poc/proposals/{proposal_id}/vote")
async def cast_vote(proposal_id: str, data: dict):
    proposal = proposals.get(proposal_id)
    if not proposal:
        return {"error": "not found"}
    vote = {"user": data.get("user", "anon"), "value": data.get("value", "approve")}
    proposal["votes"].append(vote)
    await manager.broadcast(proposal["org_id"], {
        "event": "vote_cast",
        "data": {"proposal_id": proposal_id, "vote": vote},
    })
    return vote


@app.post("/poc/orgs/{org_id}/messages")
async def send_message(org_id: str, data: dict):
    mid = str(uuid.uuid4())
    msg = {"id": mid, "org_id": org_id, "text": data.get("text", ""), "sender": data.get("sender", "anon")}
    messages[mid] = msg
    await manager.broadcast(org_id, {
        "event": "message_created",
        "data": msg,
    })
    return msg


@app.post("/poc/orgs/{org_id}/workflow_runs")
async def start_workflow_run(org_id: str, data: dict):
    rid = str(uuid.uuid4())
    run = {"id": rid, "org_id": org_id, "steps": ["step1", "step2", "step3"], "current_step": None, "status": "running"}
    workflow_runs[rid] = run
    await manager.broadcast(org_id, {
        "event": "workflow_run_started",
        "data": {"run_id": rid},
    })
    # simulate step execution in background
    asyncio.create_task(_simulate_run(org_id, rid, run["steps"]))
    return run


async def _simulate_run(org_id: str, run_id: str, steps: list):
    for step in steps:
        await asyncio.sleep(0.3)
        workflow_runs[run_id]["current_step"] = step
        await manager.broadcast(org_id, {
            "event": "step_state_changed",
            "data": {"run_id": run_id, "step": step, "status": "running"},
        })
    await asyncio.sleep(0.3)
    workflow_runs[run_id]["status"] = "completed"
    await manager.broadcast(org_id, {
        "event": "workflow_run_completed",
        "data": {"run_id": run_id},
    })


# ── WebSocket endpoint ────────────────────────────────────────────────────

@app.websocket("/ws/org/{org_id}")
async def websocket_endpoint(ws: WebSocket, org_id: str):
    client_id = str(uuid.uuid4())[:8]
    await manager.connect(org_id, ws, client_id)
    # send a welcome event
    await ws.send_text(json.dumps({"event": "connected", "data": {"client_id": client_id, "org_id": org_id}}))
    try:
        while True:
            # keep alive; client can send pings
            msg = await ws.receive_text()
            data = json.loads(msg)
            if data.get("type") == "ping":
                await ws.send_text(json.dumps({"event": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(org_id, ws)


@app.get("/poc/rooms/{org_id}/size")
async def room_size(org_id: str):
    return {"org_id": org_id, "size": manager.room_size(org_id)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002, log_level="info")
