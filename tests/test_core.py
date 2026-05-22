"""
Phase 1 POC Test Script
Tests:
1. Per-org WebSocket isolation (events from org A don't leak to org B)
2. Proposal creation event received by all clients in org
3. Vote cast event received by all clients
4. Message creation event received by all clients
5. Workflow run start + step state streaming
6. Reconnect: client re-joins and still receives new events

Run:
    cd /app && python tests/test_core.py
"""
import asyncio
import json
import httpx
import websockets
import sys
import traceback

BASE_HTTP = "http://localhost:8002"
BASE_WS   = "ws://localhost:8002"

RESULTS: list[dict] = []

def record(name: str, passed: bool, detail: str = ""):
    status = "PASS" if passed else "FAIL"
    RESULTS.append({"name": name, "status": status, "detail": detail})
    print(f"[{status}] {name}" + (f" — {detail}" if detail else ""))


async def collect_events(ws, count: int, timeout: float = 5.0) -> list[dict]:
    """Collect `count` events from websocket within timeout."""
    events = []
    try:
        async with asyncio.timeout(timeout):
            while len(events) < count:
                raw = await ws.recv()
                ev = json.loads(raw)
                events.append(ev)
    except asyncio.TimeoutError:
        pass
    return events


async def test_per_org_isolation(client: httpx.AsyncClient):
    """Events from org A must NOT appear in org B's websocket."""
    name = "Per-org isolation"
    try:
        org_a = (await client.post(f"{BASE_HTTP}/poc/orgs", json={"name": "Org A"})).json()
        org_b = (await client.post(f"{BASE_HTTP}/poc/orgs", json={"name": "Org B"})).json()

        async with websockets.connect(f"{BASE_WS}/ws/org/{org_b['id']}") as ws_b:
            # consume welcome
            await ws_b.recv()

            # fire event in org A — ws_b should NOT receive it
            await client.post(f"{BASE_HTTP}/poc/orgs/{org_a['id']}/proposals",
                              json={"title": "Only for A"})

            events = await collect_events(ws_b, 1, timeout=1.5)
            # filter out any potential pings/pongs
            events = [e for e in events if e.get("event") != "pong"]

            record(name, len(events) == 0,
                   f"received {len(events)} events (expected 0)")
    except Exception as e:
        record(name, False, str(e))


async def test_proposal_broadcast(client: httpx.AsyncClient):
    """Two clients in same org both receive proposal_created event."""
    name = "Proposal broadcast to multiple clients"
    try:
        org = (await client.post(f"{BASE_HTTP}/poc/orgs", json={"name": "Broadcast Org"})).json()
        oid = org["id"]

        async with (
            websockets.connect(f"{BASE_WS}/ws/org/{oid}") as ws1,
            websockets.connect(f"{BASE_WS}/ws/org/{oid}") as ws2,
        ):
            await ws1.recv()  # welcome
            await ws2.recv()  # welcome

            await client.post(f"{BASE_HTTP}/poc/orgs/{oid}/proposals",
                              json={"title": "Team Expansion"})

            ev1 = await collect_events(ws1, 1, timeout=3.0)
            ev2 = await collect_events(ws2, 1, timeout=3.0)

            ok = (len(ev1) == 1 and ev1[0]["event"] == "proposal_created" and
                  len(ev2) == 1 and ev2[0]["event"] == "proposal_created")
            record(name, ok, f"ws1={[e['event'] for e in ev1]}, ws2={[e['event'] for e in ev2]}")
    except Exception as e:
        record(name, False, str(e))


async def test_vote_broadcast(client: httpx.AsyncClient):
    """Vote cast event is broadcast to org clients."""
    name = "Vote cast broadcast"
    try:
        org = (await client.post(f"{BASE_HTTP}/poc/orgs", json={"name": "Vote Org"})).json()
        oid = org["id"]
        proposal = (await client.post(f"{BASE_HTTP}/poc/orgs/{oid}/proposals",
                                       json={"title": "Vote Test"})).json()

        async with websockets.connect(f"{BASE_WS}/ws/org/{oid}") as ws:
            await ws.recv()  # welcome

            await client.post(f"{BASE_HTTP}/poc/proposals/{proposal['id']}/vote",
                              json={"user": "alice", "value": "approve"})

            events = await collect_events(ws, 1, timeout=3.0)
            ok = len(events) == 1 and events[0]["event"] == "vote_cast"
            record(name, ok, f"events={[e['event'] for e in events]}")
    except Exception as e:
        record(name, False, str(e))


async def test_message_broadcast(client: httpx.AsyncClient):
    """Message created event is broadcast to org clients."""
    name = "Message created broadcast"
    try:
        org = (await client.post(f"{BASE_HTTP}/poc/orgs", json={"name": "Msg Org"})).json()
        oid = org["id"]

        async with websockets.connect(f"{BASE_WS}/ws/org/{oid}") as ws:
            await ws.recv()  # welcome

            await client.post(f"{BASE_HTTP}/poc/orgs/{oid}/messages",
                              json={"text": "Hello agents", "sender": "alice"})

            events = await collect_events(ws, 1, timeout=3.0)
            ok = len(events) == 1 and events[0]["event"] == "message_created"
            record(name, ok, f"events={[e['event'] for e in events]}")
    except Exception as e:
        record(name, False, str(e))


async def test_workflow_run_streaming(client: httpx.AsyncClient):
    """Workflow run start + step state stream all arrive in order."""
    name = "Workflow run state streaming"
    try:
        org = (await client.post(f"{BASE_HTTP}/poc/orgs", json={"name": "Workflow Org"})).json()
        oid = org["id"]

        async with websockets.connect(f"{BASE_WS}/ws/org/{oid}") as ws:
            await ws.recv()  # welcome

            await client.post(f"{BASE_HTTP}/poc/orgs/{oid}/workflow_runs", json={})

            # expect: workflow_run_started + 3x step_state_changed + workflow_run_completed = 5
            events = await collect_events(ws, 5, timeout=6.0)
            event_types = [e["event"] for e in events]

            ok = (event_types[0] == "workflow_run_started" and
                  event_types.count("step_state_changed") == 3 and
                  event_types[-1] == "workflow_run_completed")
            record(name, ok, f"event_types={event_types}")
    except Exception as e:
        record(name, False, str(e))


async def test_reconnect(client: httpx.AsyncClient):
    """After disconnect, a reconnected client still receives new events."""
    name = "Reconnect after disconnect"
    try:
        org = (await client.post(f"{BASE_HTTP}/poc/orgs", json={"name": "Reconnect Org"})).json()
        oid = org["id"]

        # first connect then disconnect
        ws_first = await websockets.connect(f"{BASE_WS}/ws/org/{oid}")
        await ws_first.recv()
        await ws_first.close()

        # reconnect
        async with websockets.connect(f"{BASE_WS}/ws/org/{oid}") as ws2:
            await ws2.recv()  # welcome after reconnect

            await client.post(f"{BASE_HTTP}/poc/orgs/{oid}/proposals",
                              json={"title": "After reconnect"})

            events = await collect_events(ws2, 1, timeout=3.0)
            ok = len(events) == 1 and events[0]["event"] == "proposal_created"
            record(name, ok, f"events={[e['event'] for e in events]}")
    except Exception as e:
        record(name, False, str(e))


async def main():
    print("=" * 60)
    print("OpenClaw POC – WebSocket Real-time Test Suite")
    print("=" * 60)

    async with httpx.AsyncClient(timeout=10.0) as client:
        # verify server is up
        try:
            r = await client.get(f"{BASE_HTTP}/docs")
            assert r.status_code in (200, 404, 307)
        except Exception as e:
            print(f"[ERROR] POC server not reachable at {BASE_HTTP}: {e}")
            print("Start it with: uvicorn poc_websocket_server:app --port 8002")
            sys.exit(1)

        await test_per_org_isolation(client)
        await test_proposal_broadcast(client)
        await test_vote_broadcast(client)
        await test_message_broadcast(client)
        await test_workflow_run_streaming(client)
        await test_reconnect(client)

    print("\n" + "=" * 60)
    passed = sum(1 for r in RESULTS if r["status"] == "PASS")
    failed = sum(1 for r in RESULTS if r["status"] == "FAIL")
    print(f"Results: {passed} passed, {failed} failed out of {len(RESULTS)} tests")
    print("=" * 60)

    if failed:
        print("\nFailed tests:")
        for r in RESULTS:
            if r["status"] == "FAIL":
                print(f"  ✗ {r['name']}: {r['detail']}")
        sys.exit(1)
    else:
        print("\nAll tests PASSED — core WebSocket POC is verified!")


if __name__ == "__main__":
    asyncio.run(main())
