# plan.md

## 1. Objectives
- Deliver an MVP “OpenClaw Command Center” with **multi-tenant orgs** where users manage **users + agents**, collaborate via **board proposals/voting**, coordinate via **messaging**, and design **workflows** executed with real-time state updates.
- Build **interactive Org Chart** (drag/drop hierarchy, board flags, side panel actions).
- Build **Workflow Builder** (ReactFlow) with triggers/steps, branching/parallel, and backend execution engine with live progress.
- Build **Board System** (propose → debate/comments → vote → on pass triggers workflow).
- Build **Messaging** (user↔user, user↔agent placeholder) with threads + real-time updates.
- Build **Agent System (ClawHub)** + **Skills** with API-key input per agent (no OAuth).
- Add **email/password JWT auth** after core is stable.

## 2. Implementation Steps

### Phase 1: Core POC (Isolation) — Real-time + Multi-tenant data flow
**Goal:** prove the hardest parts work together before building full UI.
- Websearch best practices:
  - FastAPI WebSocket patterns (rooms, auth via token/query, reconnect)
  - MongoDB schema for multi-tenant + hierarchical trees
  - ReactFlow state mgmt for collaborative-ish updates
- POC backend (FastAPI + MongoDB):
  - Minimal models: Org, User, Agent, Proposal, Vote, Workflow, WorkflowRun, MessageThread, Message
  - WebSocket endpoints:
    - `/ws/org/{org_id}` for live events (proposal updates, votes, workflow run state, new messages)
  - Event bus: in-process pub/sub (per-org channel) to broadcast updates.
  - Workflow execution runner (minimal): run steps sequentially + parallel stub, update run state events.
- POC scripts/tests (Python):
  - Create org + seed users/agents.
  - Open 2 websocket clients, assert both receive:
    - proposal_created, vote_cast, workflow_run_started, step_state_changed, message_created.
- Fix until POC success: reconnect handling, event ordering, per-org isolation.

**Phase 1 user stories**
1. As a user, I can open two clients and see proposal/vote updates appear in real time.
2. As a user, I can trigger a workflow run and watch step status change live.
3. As an org owner, I can be sure events from another org never appear in my org.
4. As a user, I can send a message and see it appear instantly in another client.
5. As a developer, I can restart the backend and clients can reconnect without breaking the org stream.

### Phase 2: V1 App Development (MVP, no auth yet)
**Goal:** build the working product around the proven realtime core.
- Backend (FastAPI):
  - CRUD + service endpoints:
    - Orgs: create/switch, invite link/code, join org (bring one agent).
    - Org Chart: nodes (user/agent), edges (manager_id), board_member flag.
    - Agents/Skills: agent CRUD, skills catalog + assignment, API key fields.
    - Board: proposals, comments, voting rules (simple majority first).
    - Workflows: workflow graph save/load (ReactFlow JSON), triggers, step definitions.
    - Execution: start workflow from board approval; persist WorkflowRun + step states.
    - Messaging: threads/messages.
  - WebSocket events integrated with all writes.
- Frontend (React + Tailwind + shadcn/ui + Framer Motion + ReactFlow):
  - App shell: dark glassmorphism, sidebar nav, org switcher, main workspace, right context panel.
  - Org Chart view (ReactFlow):
    - Drag nodes to re-parent (update manager_id), zoom/pan, board badge.
    - Node click → right panel (role, skills, tasks=workflow runs assigned, status, message).
  - Workflows view (ReactFlow):
    - Palette: Trigger, Step, Branch, Parallel, Output.
    - Save/load to backend; run manually; show execution overlay (live step status).
  - Board view:
    - Proposal timeline, debate/comments, voting panel; on approval triggers workflow.
  - Messaging view:
    - Thread list + chat panel; start from org node “message” button.
- Conclude with 1 round end-to-end testing (manual + scripted): core flows + realtime.

**Phase 2 user stories**
1. As an org owner, I can create an org and see its org chart with my user and default agent.
2. As a user, I can drag an agent under a manager to change reporting structure.
3. As a board member, I can create a proposal, discuss it, vote, and see the result instantly.
4. As a user, I can approve a proposal and automatically trigger a workflow run with live step updates.
5. As a user, I can message a person/agent from the org chart and continue the conversation in threads.

### Phase 3: Hardening + Feature Expansion (still pre-auth)
- Multi-tenant robustness:
  - Invite/join flows with constraints (joining requires exactly 1 agent).
  - Role model: owner/member/board; permissions for voting/workflow edits.
- Workflow engine improvements:
  - Branching conditions, parallel execution semantics, retries/fail states.
  - Scheduled trigger stub (store schedule, manual cron-like endpoint).
- UX polish:
  - Empty/loading/error states, optimistic UI for votes/messages, offline/reconnect banner.
  - Better right panel (edit role, skills assignment, board toggle).
- Conclude with end-to-end regression testing.

**Phase 3 user stories**
1. As an owner, I can invite a user and enforce that they bring one agent when joining.
2. As a board admin, I can choose majority vs weighted voting for a proposal.
3. As a workflow designer, I can add a branch and see only the correct path execute.
4. As a user, I can recover from a websocket disconnect and keep working.
5. As a user, I can understand failures because workflow steps show error details and retry options.

### Phase 4: Authentication (Email/Password JWT) + Account isolation
- Backend:
  - Auth endpoints: register/login/refresh, password hashing, JWT middleware.
  - Secure WebSocket: token in query/header; enforce org membership.
  - Seed test account: `Rustyadj@gmail.com` (use provided password for testing).
- Frontend:
  - Login/register screens; protected routes; token storage; logout.
  - Org switcher filtered to memberships.
- Conclude with full end-to-end testing across 2 users + 2 orgs.

**Phase 4 user stories**
1. As a user, I can sign up and log in to see only my org memberships.
2. As a user, I can’t access another org’s data even by guessing an org_id.
3. As a user, my websocket connection is rejected if I’m not authenticated.
4. As a user, I can log out and my session is fully cleared.
5. As an owner, I can invite another user and they can join and see the same live updates.

## 3. Next Actions
1. Run websearch + select exact WebSocket approach (single org channel vs per-feature channels).
2. Implement Phase 1 POC backend + Python websocket test scripts.
3. Validate: realtime events, per-org isolation, workflow run state streaming.
4. Once stable, build Phase 2 V1 UI + API in one cohesive pass.

## 4. Success Criteria
- Realtime: board votes, proposals, messages, and workflow step states update live across multiple clients.
- Org Chart: drag/re-parent persists correctly; board member flags render; side panel actions work.
- Workflows: save/load graph; execution produces persisted runs; UI reflects step state transitions.
- Board: proposal→debate→vote→approval triggers workflow reliably.
- Messaging: threads work; initiated from org chart; persists to DB.
- Multi-tenant: strict data isolation across orgs; membership required for all actions.
- Auth (post-core): JWT protects HTTP + WebSocket; no regressions in core flows.
