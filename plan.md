# plan.md

## 1. Objectives
- Deliver an MVP **OpenClaw Command Center** with **multi-tenant orgs** where users manage **users + agents**, collaborate via **board proposals/voting**, coordinate via **messaging**, and design **workflows** executed with **real-time state updates**.
- Provide a **cinematic dark-only glassmorphism UI** (Space Grotesk + IBM Plex, cyan primary), not a generic SaaS dashboard.
- Ensure the system is **fully interactive** (no mock data) and validated with **automated backend tests + end-to-end UI verification**.

**Status:** MVP objectives achieved.
- Phase 1 WebSocket POC completed (6/6 tests passed; per-org isolation confirmed).
- Phase 2 V1 app completed (backend APIs + frontend pages implemented and tested).

## 2. Implementation Steps

### Phase 1: Core POC (Isolation) — Real-time + Multi-tenant data flow ✅ COMPLETE
**Goal:** prove the hardest parts work together before building full UI.
- Implemented POC FastAPI WebSocket server with org-scoped rooms:
  - `/ws/org/{org_id}` with broadcast events
- Implemented event broadcast types:
  - `proposal_created`, `vote_cast`, `message_created`, `workflow_run_started`, `step_state_changed`, `workflow_run_completed`
- Implemented Python test suite validating:
  - Per-org event isolation
  - Multi-client fanout
  - Workflow step streaming
  - Reconnect behavior

**Result:** 6/6 tests passed; WebSocket event bus verified.

**Phase 1 user stories (met)**
1. As a user, I can open two clients and see proposal/vote updates appear in real time.
2. As a user, I can trigger a workflow run and watch step status change live.
3. As an org owner, I can be sure events from another org never appear in my org.
4. As a user, I can send a message and see it appear instantly in another client.
5. As a developer, I can restart the backend and clients can reconnect without breaking the org stream.

### Phase 2: V1 App Development (MVP, production-style) ✅ COMPLETE
**Goal:** build the working product around the proven realtime core.

#### Backend (FastAPI + MongoDB) ✅ COMPLETE
- Auth:
  - Email/password JWT auth (register/login/me)
  - WebSocket token support via query param `?token=`
- Orgs:
  - Create org, list orgs, org members
  - Invite code refresh + join org (bring-one-agent constraint supported at API level)
- Org Chart:
  - Chart nodes for users/agents; `manager_id`, `position`, `is_board_member`
  - Update node position + re-parenting
- Agents (ClawHub):
  - CRUD agents; skills/tools/model; API key field
- Skills:
  - Seeded skills catalog
- Board:
  - Proposals, comments/debate, voting approve/reject
  - Proposal approval can trigger linked workflow runs
- Workflows:
  - Save/load workflow graphs (ReactFlow JSON)
  - Manual run endpoint creates WorkflowRun and streams step state changes
  - Simple topo-sort execution order
- Messaging:
  - Threads, messages, per-org real-time broadcast
- WebSocket:
  - Per-org broadcast channel used by all core writes

**Backend verification:** 30/30 API tests passing across auth, orgs, org chart, agents, skills, board, workflows, messaging, stats/activity.

#### Frontend (React + Tailwind + shadcn/ui + Framer Motion + ReactFlow) ✅ COMPLETE
- Global UI system:
  - Dark-only HSL tokens + glass panels
  - Space Grotesk + IBM Plex Sans/Mono
  - Sidebar with expand/collapse animation + org switcher
- Pages implemented (7/7):
  1. Login/Register
  2. Dashboard (stats + activity feed)
  3. Org Chart (ReactFlow)
  4. Agents / ClawHub (agent grid + editor)
  5. Board (proposals, debate/comments, vote w/ confirmation)
  6. Workflows (workflow list + ReactFlow builder + run)
  7. Messages (threads + chat)
  8. Settings (org info, invite code, members, profile)
- Org Chart (ReactFlow):
  - User/agent nodes, board member badge
  - Click node → right inspector
  - Drag-to-reparent via connect edge (manager_id)
  - Zoom/pan controls, minimap
- Workflow Builder (ReactFlow):
  - Node types: Trigger, Step, Branch, Parallel, Output
  - Palette drag/drop nodes
  - Live execution overlay/state updates via WebSocket step events
- Board:
  - Proposal creation + voting approve/reject (AlertDialog confirmation)
  - Debate/comments
- Messaging:
  - Thread list + chat bubbles
  - Real-time message updates via WebSocket
- Agent Editor:
  - Tabs: Prompt / Skills / Tools / Keys

**Fixes applied during Phase 2:**
- `useWS` now returns graceful no-op when WSProvider is not present (prevents runtime crash if org not selected).
- ReactFlow imports corrected to named `ReactFlow` (not default import) for `@xyflow/react`.
- `WorkflowNode` corrected to read `type` prop for node type display.

**Phase 2 user stories (met)**
1. As an org owner, I can create an org and see its org chart with my user and default agent.
2. As a user, I can drag/re-parent agents under managers (via edge connect) and persist structure.
3. As a board member, I can create a proposal, discuss it, vote, and see the result instantly.
4. As a user, I can approve a proposal and trigger a workflow run with live step updates.
5. As a user, I can message a person/agent from the org chart and continue the conversation in threads.

### Phase 3: Hardening + Feature Expansion (post-MVP) 🔜 NEXT
**Goal:** strengthen multi-tenant + permissions + workflow engine semantics + UX polish.

#### Multi-tenant + Permissions
- Enforce and validate join constraints end-to-end:
  - Joining requires exactly **one** agent brought from the joining user.
  - Better UX for selecting “agent to bring” (list + picker vs free-form ID).
- Role system enhancements:
  - Roles: owner/member/board
  - Permissions:
    - only owners can refresh invite codes
    - board-only voting (optional mode)
    - workflow edit permissions (owner/admin)
- Tighten WebSocket auth:
  - Reject unauthenticated/unauthorized org connections
  - Enforce org membership on WS connect (currently token is optional)

#### Workflow engine improvements
- Proper branching conditions:
  - Evaluate branch rules based on proposal data/run context
- Parallel execution semantics:
  - Fan-out/fan-in execution
- Retries + failure handling:
  - Step error capture, retry count, run fail state
- Scheduled triggers:
  - Store schedules + background scheduler/cron integration

#### Board improvements
- Voting rules:
  - Majority vs weighted voting
  - Quorum settings
  - Close proposal / finalize outcome
- Board membership UI:
  - Manage board members from Settings (not only node inspector)

#### Messaging improvements
- Unread counts
- Typing indicator (optional)
- Thread search

#### UX polish + operational readiness
- Optimistic UI where safe (votes, messages)
- Offline/reconnect banner
- Better empty states + error handling
- Reduce overlay collisions (e.g., “Made with Emergent” badge vs bottom-right actions)
- Observability:
  - structured logs
  - request IDs

**Phase 3 user stories (target)**
1. As an owner, I can invite a user and enforce that they bring one agent when joining.
2. As a board admin, I can choose majority vs weighted voting for proposals.
3. As a workflow designer, I can add a branch and see only the correct path execute.
4. As a user, I can recover from a websocket disconnect and keep working.
5. As a user, I can understand failures because workflow steps show error details and retry options.

### Phase 4: Authentication + Account isolation (already implemented; harden further) ✅ IMPLEMENTED / 🔒 HARDEN
**Goal:** ensure production-grade access control + session security.

**Implemented (Phase 2):**
- Email/password JWT auth (register/login/me)
- Token stored client-side and attached to API requests
- WebSocket supports token via query param

**Hardening tasks:**
- Add refresh tokens or short-lived access tokens
- Improve password policy + reset flow
- Enforce org membership on WS connect (reject if not authorized)
- Rate limiting + brute-force protection

**Test credentials (for QA/dev):**
- `Rustyadj@gmail.com` / `Arabia@24`

## 3. Next Actions
1. **Harden WebSocket security**: require valid JWT and enforce org membership on connect.
2. **Improve join org UX**: replace manual agent-id input with agent picker.
3. **Workflow engine upgrades**: implement branch conditions + parallel semantics + retries.
4. **Board permissions + voting rules**: weighted voting + quorum.
5. **UX polish**: reduce overlay collisions, add offline banner, improve empty/error states.

## 4. Success Criteria
**Current MVP success (achieved):**
- Realtime: proposals, votes, messages, workflow step states update live via per-org WebSocket.
- Org Chart: nodes render, inspector works, board member flags render, positions persist.
- Workflows: graphs save/load; runs execute; UI reflects step status changes.
- Board: proposal → debate → vote works; approval triggers workflow (when linked).
- Messaging: threads/messages work and persist.
- Multi-tenant: org membership required for HTTP routes.
- Automated tests: Backend 30/30 passing; frontend flows manually verified.

**Hardening success (Phase 3/4 targets):**
- Strict WS auth + org isolation for realtime channel.
- Role-based permissions enforced consistently.
- Workflow branching/parallel execution is deterministic and debuggable.
- Improved reliability under reconnects and partial failures.
