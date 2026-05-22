# plan.md

## 1. Objectives

### MVP (Completed)
- Deliver an MVP **OpenClaw Command Center** with **multi-tenant orgs** where users manage **users + agents**, collaborate via **board proposals/voting**, coordinate via **messaging**, and design **workflows** executed with **real-time state updates**.
- Provide a **cinematic dark-only glassmorphism UI** (Space Grotesk + IBM Plex, cyan primary), not a generic SaaS dashboard.
- Ensure the system is **fully interactive** (no mock data) and validated with **automated backend tests + end-to-end UI verification**.

### Phase 3 (Current Mission): “AI Operating System” Upgrade
Evolve the MVP into a **$100k+ platform** centered on:
- **Event-driven architecture** (typed event bus + persistent event log) so features don’t become tightly coupled spaghetti.
- **Real-time presence** (online/typing/thinking/voting) so the org feels *alive*.
- **Permission hierarchy** (Owner > Board > Member > Agent > Observer) with consistent enforcement across HTTP + WebSocket.
- **True agent identity** (persistent personality, goals, reputation) so agents feel like organization members.
- **Agent memory graph** (functional memory + visual graph) so users can trust what agents “remember” and see influence/relationships.
- **Multi-model orchestration** with modular providers (OpenAI, Anthropic, Gemini, DeepSeek via key; OpenRouter immediately) and specialization:
  - Claude = board reasoning
  - Codex = implementation
  - DeepSeek = fast chatter
  - Gemini = multimodal/context
  - Emergent key = default onboarding speed; user override per org + per agent
- **AI deliberation engine** (private agent debates + readable thought snapshots) with:
  - lightweight board debate mode
  - dedicated Deliberation Room (“holy shit it’s alive” viral feature)
- **Unified notifications center** (mentions, votes, tasks, escalations, workflow events)
- **System health dashboard** (provider uptime, model latency, token usage, memory usage)

**Status:**
- ✅ Phase 1 WebSocket POC completed (6/6 tests passed; per-org isolation confirmed).
- ✅ Phase 2 V1 app completed (backend APIs + frontend pages implemented and tested; backend tests 30/30).
- 🔜 Phase 3 is next: architectural refactor + real-time presence + model orchestration + deliberation + memory graph.

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
- `useWS` now returns graceful no-op when WSProvider is not present.
- ReactFlow imports corrected to named `ReactFlow` for `@xyflow/react`.
- `WorkflowNode` corrected to read `type` prop for node type display.

**Phase 2 user stories (met)**
1. As an org owner, I can create an org and see its org chart with my user and default agent.
2. As a user, I can drag/re-parent agents under managers (via edge connect) and persist structure.
3. As a board member, I can create a proposal, discuss it, vote, and see the result instantly.
4. As a user, I can approve a proposal and trigger a workflow run with live step updates.
5. As a user, I can message a person/agent from the org chart and continue the conversation in threads.

---

### Phase 3: AI Operating System (event-driven + presence + orchestration + deliberation + memory) 🔜 NEXT
**Goal:** transform MVP into a living organization platform where persistent AI agents collaborate visually with humans.

#### 3.1 Event-driven architecture (FOUNDATION)
**Why:** Every feature listed (presence, notifications, deliberation, health, memory) must hang off a consistent event layer.

- Introduce a **typed event schema** and persistent **event log** collection:
  - `events` collection: `{id, org_id, type, actor, subject, payload, created_at, correlation_id}`
- Add an internal backend **EventBus** module:
  - `publish(event)` persists to MongoDB + broadcasts via WebSocket
  - optional in-process subscribers for side effects (notifications, memory writes, health metrics)
- Standardize event names across the system:
  - `org.member_joined`
  - `presence.online`, `presence.offline`, `presence.typing`, `presence.thinking`
  - `board.proposal_created`, `board.comment_added`, `board.vote_cast`, `board.proposal_approved`
  - `workflow.created`, `workflow.updated`, `workflow.run_started`, `workflow.step_changed`, `workflow.run_completed`
  - `message.thread_created`, `message.created`
  - `agent.created`, `agent.updated`, `agent.reputation_changed`
  - `memory.created`, `memory.edge_created`
  - `notification.created`, `notification.read`
  - `health.provider_sampled`, `health.model_latency_sampled`

**Success criteria:** new features do not directly call each other—everything emits events.

#### 3.2 WebSocket event bus v2 (REAL SYNC, not just broadcasts)
- Enforce JWT + org membership on connect
- Add per-org channels/topics (or typed event filtering) without extra sockets
- Add ACK/replay support (optional): client stores `last_event_id` → can request missed events

**Success criteria:** the app stays consistent across tabs/users without manual refresh.

#### 3.3 Real-time presence system (ALIVE ORG)
- Presence tracking:
  - heartbeat ping/pong
  - `online/offline` state
  - `typing` (messages), `thinking` (agents), `voting` (board)
- Presence shown in:
  - Org chart nodes (status dot + “typing/thinking” shimmer)
  - Board proposal view (who is currently viewing/voting)
  - Messages thread list (typing indicator)

**Success criteria:** users can *feel* simultaneous activity.

#### 3.4 Permission hierarchy (Owner > Board > Member > Agent > Observer)
- Define canonical roles and permissions:
  - Owners: org settings, invites, manage roles, workflows
  - Board: vote rights + proposal moderation
  - Members: create proposals, comment, message, create workflows (optional)
  - Agents: can act within assigned permissions (run workflows, comment summaries)
  - Observers: read-only
- Enforce on:
  - HTTP routes
  - WebSocket connect + event subscriptions
  - UI gating

**Success criteria:** consistent permissions everywhere; no “front-end only” security.

#### 3.5 Unified notification center (THE OPERATOR FEED)
- Add notifications model:
  - `{id, org_id, user_id, type, title, body, link, read_at, created_at}`
- Notifications generated from events:
  - votes, mentions, proposal outcomes, workflow run changes, AI escalations
- UI:
  - bell icon in sidebar/top bar
  - notification drawer (filter: unread/all)
  - deep-link into board/workflow/message

**Success criteria:** operators never miss important events.

#### 3.6 Multi-model provider system + orchestration (MODULAR NOW)
**Requirements from discussion:**
- Emergent key default for speed
- User override per **org** and per **agent**
- Add **OpenRouter** support immediately
- Providers are modular (not “a Claude app”)

Implementation:
- Provider registry abstraction:
  - `ProviderAdapter` interface (list models, call, healthcheck)
  - Adapters: OpenAI, Anthropic, Gemini, OpenRouter, DeepSeek (BYO key)
- Routing engine:
  - policy: `specialization` based on task type
  - explicit mapping:
    - Claude: board reasoning + deliberation
    - Codex: implementation steps
    - DeepSeek: fast chatter
    - Gemini: multimodal/context
- Track metrics:
  - latency, error rate, tokens

**Success criteria:** new provider can be added without rewriting agents/board/workflows.

#### 3.7 AI deliberation engine + Deliberation Room (VIRAL FEATURE)
**Two modes (required):**
- Board debate mode:
  - quick “agent rationale” summaries attached to proposal
- Dedicated Deliberation Room:
  - agents debate privately
  - user sees **thought snapshots** (not raw token spam)
  - live presence: “Agent X thinking…”

Mechanics:
- Create `deliberations` + `deliberation_messages`:
  - store agent turns + structured arguments
  - store snapshot summaries per round
- Add summarizer:
  - compress turns into readable bullets: stance, reasons, risks, confidence
- Emit events:
  - `deliberation.started`, `deliberation.snapshot`, `deliberation.completed`

**Success criteria:** agents feel alive and coordinated; humans can understand outcomes.

#### 3.8 Agent identity system (PERSISTENT PEOPLE)
- Extend agent model:
  - personality traits
  - goals/OKRs
  - reputation score
  - reliability/confidence history
  - org relationships (who they collaborate with)
- Surface in UI:
  - agent “profile” tab
  - reputation/history timeline
  - influence indicators on memory graph

**Success criteria:** agents are not disposable chats; they accrue identity.

#### 3.9 Memory graph (FUNCTIONAL + VISUAL)
**Functional memory (trust + performance):**
- Extract and store memories from:
  - proposals, votes, workflow runs, messages, deliberations
- Memory entities:
  - people, agents, projects, decisions, tasks
- Memory edges:
  - influenced_by, proposed_by, decided_in, executed_by

**Visual graph (trust + explainability):**
- New “Memory Graph” page:
  - ReactFlow graph of entities + edges
  - show confidence/reputation/influence
  - click entity → inspector with provenance (which events created it)

**Success criteria:** users can see *why* agents make choices and how org knowledge is formed.

#### 3.10 System health dashboard (OPERATOR-GRADE)
- Health collection:
  - provider uptime samples
  - model latency, token usage
  - memory storage volume
  - WebSocket connections/room sizes
- UI page:
  - charts: latency over time per provider/model
  - current incidents (provider down)
  - cost/tokens breakdown

**Success criteria:** feels like a real platform with observability.

**Phase 3 user stories (target)**
1. As an owner, I can assign roles (Owner/Board/Member/Observer) and permissions are enforced across HTTP and WebSocket.
2. As a user, I can see who is online/typing/thinking/voting in real time.
3. As a user, I can open a Deliberation Room and watch agents debate with readable thought snapshots.
4. As an operator, I can rely on a unified notification center to track votes, escalations, tasks, and workflow outcomes.
5. As a user, I can inspect a memory graph to see relationships, influence, provenance, and confidence.
6. As a platform admin, I can add providers/models (OpenRouter, DeepSeek) without refactoring core app logic.

---

### Phase 4: Authentication + Account isolation (already implemented; harden further) ✅ IMPLEMENTED / 🔒 HARDEN
**Goal:** ensure production-grade access control + session security.

**Implemented (Phase 2):**
- Email/password JWT auth (register/login/me)
- Token stored client-side and attached to API requests
- WebSocket supports token via query param

**Hardening tasks (carried forward):**
- Add refresh tokens or short-lived access tokens
- Improve password policy + reset flow
- Enforce org membership on WS connect (mandatory in Phase 3)
- Rate limiting + brute-force protection

**Test credentials (for QA/dev):**
- `Rustyadj@gmail.com` / `Arabia@24`

---

## 3. Next Actions
1. **Implement event-driven foundation:** event schema + EventBus publish/subscribe + persistent event log.
2. **WebSocket v2:** strict JWT/org membership; optional replay/ack.
3. **Presence system:** heartbeats + typing/thinking/voting indicators.
4. **Permissions:** implement hierarchy and gate actions in backend + UI.
5. **Notifications center:** event-derived notifications + drawer UI.
6. **Provider system:** modular adapters + OpenRouter + per-org/per-agent overrides + metrics.
7. **Deliberation engine:** board-mode rationales + Deliberation Room + thought snapshots.
8. **Memory graph:** functional memory extraction + visual graph explorer.
9. **System health:** provider/model telemetry + health dashboard UI.

---

## 4. Success Criteria

### Current MVP success (achieved)
- Realtime: proposals, votes, messages, workflow step states update live via per-org WebSocket.
- Org Chart: nodes render, inspector works, board member flags render, positions persist.
- Workflows: graphs save/load; runs execute; UI reflects step status changes.
- Board: proposal → debate → vote works; approval triggers workflow (when linked).
- Messaging: threads/messages work and persist.
- Multi-tenant: org membership required for HTTP routes.
- Automated tests: Backend 30/30 passing; frontend flows verified.

### Phase 3 “AI Operating System” success (target)
- **Event-driven:** every core state change emits a typed event and is queryable in an event log.
- **Presence:** online/typing/thinking/voting indicators update live and reliably.
- **Permissions:** hierarchy is enforced across HTTP + WebSocket; UI reflects capabilities.
- **Providers:** OpenRouter supported; per-org/per-agent override works; model routing based on task specialization.
- **Deliberation:** agents can debate privately; user sees thought snapshots + outcome summary (no token spam).
- **Memory graph:** memories are generated from real events; users can inspect provenance/influence/confidence.
- **Notifications:** unified center ties together mentions, votes, tasks, workflow outcomes, escalations.
- **Health:** provider uptime + model latency + token usage visible and actionable.
