# plan.md

## 1. Objectives

### MVP (Completed)
- Deliver an MVP **OpenClaw Command Center** with **multi-tenant orgs** where users manage **users + agents**, collaborate via **board proposals/voting**, coordinate via **messaging**, and design **workflows** executed with **real-time state updates**.
- Provide a **cinematic dark-only glassmorphism UI** (Space Grotesk + IBM Plex, cyan primary), not a generic SaaS dashboard.
- Ensure the system is **fully interactive** (no mock data) and validated with **automated backend tests + end-to-end UI verification**.

### Phase 3 (Completed): “AI Operating System” Upgrade
Transform MVP into a **$100k+ platform** centered on:
- **Event-driven architecture** (typed event bus + persistent event log) so the platform scales without spaghetti coupling.
- **WebSocket realtime state sync** as the backbone of the product (presence, notifications, deliberation, runs, messages).
- **Real-time presence** (online/typing/thinking/voting) so the org feels *alive*.
- **Permission hierarchy** (Owner > Board > Member > Agent > Observer) with consistent enforcement.
- **True agent identity** (persistent personality, goals, reputation) so agents feel like organizational actors.
- **Agent memory graph** (functional memory + visual graph) so users can trust agent context/influence.
- **Multi-model orchestration** with modular providers (Emergent default + OpenRouter immediately) and specialization:
  - Claude = board reasoning
  - Codex/GPT-4.1 = implementation
  - DeepSeek = fast chatter (via OpenRouter key)
  - Gemini = multimodal/context
  - Emergent key = default onboarding speed; user override per org + per agent
- **AI deliberation engine** with:
  - lightweight board debate mode (fast path)
  - dedicated Deliberation Room (“holy shit it’s alive” viral feature)
  - readable **thought snapshots** (no token spam)
- **Unified notifications center** (mentions, votes, tasks, AI escalations, workflow events)
- **System health dashboard** (provider status, model latency, token usage, memory usage)

**Status:**
- ✅ Phase 1 WebSocket POC completed (6/6 tests passed; per-org isolation confirmed).
- ✅ Phase 2 V1 app completed (backend tests 30/30; frontend core flows verified).
- ✅ Phase 3 completed and validated (backend tests 38/38; frontend Phase 3 features 33/33).

---

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

---

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
- Pages implemented:
  1. Login/Register
  2. Dashboard (stats + activity feed)
  3. Org Chart (ReactFlow)
  4. Agents / ClawHub (agent grid + editor)
  5. Board (proposals, debate/comments, vote w/ confirmation)
  6. Workflows (workflow list + ReactFlow builder + run)
  7. Messages (threads + chat)
  8. Settings (org info, invite code, members, profile)

**Fixes applied during Phase 2:**
- `useWS` returns graceful no-op when WSProvider not present.
- ReactFlow imports corrected to named `ReactFlow` for `@xyflow/react`.
- `WorkflowNode` uses `type` prop for correct node type display.

**Phase 2 user stories (met)**
1. As an org owner, I can create an org and see its org chart with my user and default agent.
2. As a user, I can drag/re-parent agents under managers (via edge connect) and persist structure.
3. As a board member, I can create a proposal, discuss it, vote, and see the result instantly.
4. As a user, I can approve a proposal and trigger a workflow run with live step updates.
5. As a user, I can message a person/agent from the org chart and continue the conversation in threads.

---

### Phase 3: AI Operating System (event-driven + presence + orchestration + deliberation + memory) ✅ COMPLETE
**Goal:** evolve OpenClaw from “AI dashboard” into a **living organization OS** where humans + persistent AI agents collaborate visually.

#### 3.1 Event-driven architecture (FOUNDATION) ✅ COMPLETE
**Delivered:**
- Implemented a typed `OrgEvent` and `EventBus`:
  - `publish(event)` persists to MongoDB **events log** + broadcasts via WebSocket
  - consistent event messages include `event_id` + timestamp
- Added a persistent event log:
  - `events` collection storing `{id, org_id, event_type, actor_id/type, subject, payload, created_at}`
- Updated core write paths (org, board, workflows, messages, notifications, memory) to emit events.

#### 3.2 WebSocket event bus v2 (REAL SYNC) ✅ COMPLETE
**Delivered:**
- Single org socket (`/ws/org/{org_id}`) used for all realtime state.
- Strictly structured event messages: `{event, data, event_id, ts}`.
- Presence pings supported (`type: ping`) with typing/thinking flags.

#### 3.3 Real-time presence system (ALIVE ORG) ✅ COMPLETE
**Delivered:**
- Presence tracking (heartbeat) with:
  - `online/offline`
  - `typing_in` (threads)
  - `thinking` (agents during deliberation)
- Presence API:
  - `GET /api/orgs/{org_id}/presence`
- Presence UI:
  - `PresenceBar` component (ready for embedding in pages)

#### 3.4 Permission hierarchy (Owner > Board > Member > Agent > Observer) ✅ COMPLETE
**Delivered:**
- Canonical role ranking implemented and enforced on endpoints.
- Role enforcement applied to key actions:
  - create proposal/workflow: member+
  - org config updates + invite refresh: owner+
  - read-only paths remain member+ (observer support is included in role ranking model)

#### 3.5 Unified notification center (THE OPERATOR FEED) ✅ COMPLETE
**Delivered:**
- Persistent notifications model in MongoDB:
  - `{id, org_id, user_id|null, type, title, body, link, read_at, created_at}`
- API endpoints:
  - list notifications, unread count, mark read/mark all read
- WebSocket events:
  - `notification.created`
- UI:
  - bell icon in sidebar header + slide-out sheet

#### 3.6 Multi-model provider system + orchestration (MODULAR NOW) ✅ COMPLETE
**Delivered:**
- Provider module supports:
  - **Emergent universal key** (OpenAI / Anthropic / Gemini)
  - **OpenRouter** (BYO key; enables DeepSeek and others)
- Task-based routing (specialization):
  - reasoning/deliberate/summarize → Anthropic Claude
  - coding → OpenAI GPT-4.1
  - chatter → OpenAI GPT-4.1-mini (upgradeable to OpenRouter/DeepSeek when key set)
  - multimodal → Gemini
- Per-org override:
  - `/api/orgs/{org_id}/config` supports default provider/model and OpenRouter key
- Health metrics:
  - latency + success tracking exposed in System Health

#### 3.7 AI deliberation engine + Deliberation Room (VIRAL FEATURE) ✅ COMPLETE
**Delivered:**
- Deliberation engine makes real LLM calls and creates:
  - per-agent **thought snapshots** (stance, confidence, reasoning, concerns, questions)
  - deliberation **summary** (human-readable, JSON structured)
- Deliberation persistence:
  - `deliberations` collection with snapshots + summary
- API endpoints:
  - start deliberation, list deliberations, get deliberation
- WebSocket events:
  - `deliberation.started`, `deliberation.agent_thinking`, `deliberation.snapshot`, `deliberation.completed`
- Fix applied:
  - `SNAPSHOT_SYSTEM` and `SUMMARY_SYSTEM` escaped JSON examples (`{{ }}`) to avoid Python `.format()` KeyError.

#### 3.8 Agent identity system (PERSISTENT PEOPLE) ✅ COMPLETE
**Delivered:**
- Agent model extended:
  - `personality_traits`, `goals`
  - `reputation_score`, `reputation_history`
  - `total_deliberations`, `total_votes_influenced`

#### 3.9 Memory graph (FUNCTIONAL + VISUAL) ✅ COMPLETE
**Delivered:**
- Functional memory:
  - deliberation completion creates `memory_nodes` + `memory_edges` (influence links)
- Visual memory graph:
  - `MemoryPage` renders ReactFlow graph
  - entity types: person/agent/decision/project/task/concept
  - edge types: influenced/proposed/decided/executed/collaborates
  - inspector panel for memory node detail
- API endpoints:
  - list/create memory nodes and edges

#### 3.10 System health dashboard (OPERATOR-GRADE) ✅ COMPLETE
**Delivered:**
- Health endpoint returns:
  - provider latency/success rate
  - ws connections/online users
  - events today, memory node count, total deliberations
  - routing table
- UI:
  - Settings → System Health tab (`HealthPanel`)

#### Phase 3 frontend updates ✅ COMPLETE
- New pages:
  - `DeliberationPage` (Deliberation Room)
  - `MemoryPage` (Memory Graph)
- New components:
  - `NotificationCenter`
  - `PresenceBar`
  - `HealthPanel`
- Updated navigation:
  - Sidebar includes Deliberation + Memory (with “alive” purple indicator)
  - Notification bell placed in the sidebar header
- Settings enhancements:
  - AI Providers tab (OpenRouter key + default overrides)
  - System Health tab

**Phase 3 verification:**
- Backend: **38/38** tests passing (includes Phase 3 endpoints)
- Frontend: **33/33** Phase 3 features verified

**Known UI issue (non-blocking):**
- “Made with Emergent” overlay or HTML layer can intercept pointer events in automated tests; requires force click in Playwright. Recommend fixing by ensuring overlay has `pointer-events: none` and/or lower z-index.

---

### Phase 4: Authentication + Account isolation (implemented; optional harden) ✅ IMPLEMENTED / 🔒 HARDEN
**Goal:** ensure production-grade access control + session security.

**Implemented:**
- Email/password JWT auth (register/login/me)
- Token stored client-side and attached to API requests
- WebSocket supports token via query param

**Hardening tasks (future):**
- Refresh tokens or short-lived access tokens
- Password reset flow
- WebSocket membership enforcement (currently token-supported; can be made strictly required)
- Rate limiting + brute-force protection

**Test credentials (for QA/dev):**
- `Rustyadj@gmail.com` / `Arabia@24`

---

## 3. Next Actions

### Phase 3.1 (Polish + Hardening) — Recommended Next
1. **Fix overlay pointer-event interception** (remove click blockers; ensure overlays use `pointer-events: none`).
2. **Presence UI deep integration**:
   - show presence in Org Chart nodes (typing/thinking badges)
   - show “viewing/voting” presence in Board proposals
3. **Deliberation UX polish**:
   - ensure “reasoning” always renders for new snapshots
   - add multi-round deliberation controls + pacing presets
4. **Memory graph provenance**:
   - link memory nodes/edges back to event IDs and show provenance timeline
5. **Provider management**:
   - add OpenRouter model selection UI (not just key)
   - add per-agent provider/model override UI fields surfaced in ClawHub

### Phase 4.1 (Security/Scale) — Optional
6. WebSocket strict auth + membership enforcement.
7. Add event replay (client last_event_id) for robust reconnect.

---

## 4. Success Criteria

### MVP success (achieved)
- Realtime: proposals, votes, messages, workflow step states update live via per-org WebSocket.
- Org Chart: nodes render, inspector works, board member flags render, positions persist.
- Workflows: graphs save/load; runs execute; UI reflects step status changes.
- Board: proposal → debate → vote works; approval triggers workflow (when linked).
- Messaging: threads/messages work and persist.
- Multi-tenant: org membership required for HTTP routes.
- Automated tests: Backend 30/30; frontend flows verified.

### Phase 3 “AI Operating System” success (achieved)
- **Event-driven:** every core state change emits a typed event and is queryable in an event log.
- **Presence:** online/typing/thinking states update live; presence API available.
- **Permissions:** Owner/Board/Member/Agent/Observer hierarchy exists and key endpoints enforce minimum roles.
- **Providers:** Emergent default + OpenRouter support with per-org overrides; task routing exists.
- **Deliberation:** agents debate privately; user sees thought snapshots and a summary (no token spam).
- **Memory graph:** memories generated from real deliberations; users can explore a visual graph.
- **Notifications:** persistent + realtime delivery with unread counts and mark-read.
- **Health:** provider latency/success rate, WS stats, routing table visible.
- **Verification:** Backend 38/38 + Frontend 33/33 Phase 3 feature checks.
