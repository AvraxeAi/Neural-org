# plan.md

## 1. Objectives

### MVP (Completed)
- Deliver an MVP **OpenClaw Command Center** with **multi-tenant orgs** where users manage **users + agents**, collaborate via **board proposals/voting**, coordinate via **messaging**, and design **workflows** executed with **real-time state updates**.
- Provide a **cinematic dark-only glassmorphism UI** (Space Grotesk + IBM Plex, cyan primary), not a generic SaaS dashboard.
- Ensure the system is **fully interactive** (no mock data) and validated with **automated backend tests + end-to-end UI verification**.

### Phase 3 (Completed): “AI Operating System” Upgrade
Transform MVP into a **production-grade, AI-native operating system core** centered on:
- **Event-driven architecture** (typed event bus + persistent event log).
- **WebSocket realtime state sync** as the backbone (presence, notifications, deliberation, workflows, messages).
- **Real-time presence** (online/typing/thinking/voting) for “living org” feel.
- **Permission hierarchy** (Owner > Board > Member > Agent > Observer).
- **Agent identity** (persistent personality/goals/reputation).
- **Memory graph** (functional + visual) to build trust.
- **Multi-model orchestration** (Emergent default + OpenRouter support) with specialization.
- **Deliberation engine + Deliberation Room** producing readable thought snapshots.
- **Unified notifications center**.
- **System health dashboard** (provider status, latency, routing).

**Status:**
- ✅ Phase 1 WebSocket POC completed (6/6 tests passed; per-org isolation confirmed).
- ✅ Phase 2 V1 app completed (backend tests 30/30; core UI shipped).
- ✅ Phase 3 completed and validated (backend tests 38/38; Phase 3 UI features verified).

### Phase 4 (Current): Neural-Org Upgrade — Premium Org Chart + Skill Marketplace + Agent Autonomy + War Room
Rebuild **Neural-Org** as an **AI-native operating system** (not a chat app, not a dashboard) that feels like **VS Code + Discord + GitHub + sci-fi mission control**.

**Investor demo priority order (ship in this order):**
1. **War Room** (B) — multi-agent live debate with readable “thought snapshots”, presence, and spectacle.
2. **Premium Org Chart** (A) — multi-layout (tree/radial/force), customization, animated status pulses, authority visualization.
3. **Skill Marketplace** (C) — marketplace UX + 40+ seeded skills + install/enable/versioning + Skill Studio (MVP).
4. **Agent Autonomy** (D) — task queues, goals, reasoning logs, autonomous mode + schedules.

**Hard constraints:**
- Tech stays **React + FastAPI + MongoDB**. No rebuild.
- OpenRouter + GitHub OAuth are **optional/stubbed** with UI placeholders until keys are provided.

---

## 2. Implementation Steps

### Phase 1: Core POC (Isolation) — Real-time + Multi-tenant data flow ✅ COMPLETE
**Goal:** Prove real-time WebSocket event broadcasting + isolation.
- Org-scoped WebSocket rooms.
- Test suite verifying broadcasts + isolation + reconnect.

**Result:** 6/6 tests passed.

---

### Phase 2: V1 App Development (MVP) ✅ COMPLETE
**Goal:** Ship a cohesive base app with Org Chart + Workflow Builder + Board + Messaging + Agents.

**Backend:** Auth, orgs, chart nodes, agents, proposals/voting/comments, workflows + runs, threads/messages.

**Frontend:** Login, Dashboard, Org Chart, Agents, Board, Workflows, Messages, Settings.

**Result:** Backend 30/30 tests passing; UI verified.

---

### Phase 3: AI Operating System Foundation ✅ COMPLETE
**Goal:** Establish the platform architecture required for extensibility.

Delivered:
- `EventBus` + persistent event log.
- WebSocket bus v2 with typed events.
- Presence system (online/typing/thinking).
- Notifications center.
- Provider registry + routing (Emergent default + OpenRouter support).
- Deliberation engine + Deliberation Room.
- Memory graph (functional + visual).
- System health endpoint + UI.

**Verification:** Backend 38/38 tests; Phase 3 UI features verified.

---

### Phase 4: Neural-Org Upgrade (Premium + Moat Features) 🔥 IN PROGRESS

#### 4.1 War Room (Investor Hook) — Multi-agent Debate Mission Control
**Goal:** Create the “holy shit it’s alive” experience.

**Backend**
- Expand deliberation engine:
  - Multi-round debates (configurable rounds, pacing presets).
  - Role-based perspectives (CEO/CFO/CTO/Legal/PM archetypes).
  - Risk analysis + profitability analysis nodes before final stance.
  - Conflict detection between agents (stance divergence summary).
- Add AI-only discussion rooms:
  - `ai_rooms` + `ai_room_messages` collections.
  - Agents can message each other autonomously.
- Add deliberation “snapshots timeline”:
  - Store snapshots with timestamps and correlation IDs.
  - Event replay for War Room session.

**Frontend**
- New War Room page (or upgrade Deliberation Room into War Room):
  - Split panes: Agent roster (presence), live snapshots feed, outcome panel.
  - Cinematic UI: agent activity pulses, “thinking” shimmer, stance clustering.
  - “No token spam” guarantee: only show snapshots + summary.
  - Controls: start/stop, rounds, debate mode (fast vs deep), export summary.

**Success criteria**
- A demo viewer can watch agents argue, converge, and produce a decision in 
 way that feels like an alive organization.

#### 4.2 Premium Org Chart (Customization + Multiple Layouts)
**Goal:** Org Chart becomes the primary operating surface.

**Backend**
- Add org chart “layout profiles”:
  - `org_layouts` collection: `{id, org_id, name, layout_type, view_state, node_styles, edge_styles, saved_at}`
  - Support save/load layouts + default per user.
- Add node template system:
  - `node_templates`: card themes, fields, badges, size presets.
- Add richer agent stats for cards:
  - live token/cost usage (stub counters initially)
  - memory size indicator
  - reliability/confidence display

**Frontend**
- Redesign Org Chart view:
  - Layout modes:
    - Standard tree
    - Radial
    - Force-directed “neural graph”
    - Swim lanes (departments)
  - Resizable cards, collapsible teams/divisions.
  - Relationship edge styling (color/width/labels).
  - Status indicators: Online/Thinking/Working/Idle/Error.
  - Animated pulses for activity.
  - Skill badges on cards.
  - Authority visualization: chain-of-command overlay.

**Success criteria**
- User can switch layouts instantly and save their org appearance.
- Org chart looks premium, dynamic, and information-dense.

#### 4.3 Skill Marketplace (Ecosystem Moat)
**Goal:** Skills become a first-class ecosystem like VS Code extensions.

**Backend**
- Skill registry + installs:
  - `skills_catalog` seeded with 40+ skills.
  - `org_installed_skills`: version, enabled, permissions, dependencies.
  - Install sources (stub): clawhub, hermeshub, GitHub URL, ZIP, URL.
- Versioning:
  - semantic versions, rollback support.
- Permissions & sandbox model (MVP):
  - declared permissions per skill (read/write memory, network, code exec).
  - enforcement begins as UI gating + server checks.

**Frontend**
- Marketplace pages:
  - Marketplace Home (featured/verified/categories).
  - Skill detail page (readme, version, permissions, reviews stub).
  - Installed Skills manager (enable/disable, update, rollback).
- Skill Studio (MVP):
  - create “skill manifest” visually.
  - publish stub (local only) + export.

**Success criteria**
- Users can browse, install, enable skills and see them affect agent capabilities.

#### 4.4 Agent Autonomy (Agents Feel Alive)
**Goal:** Agents behave like persistent coworkers, not disposable chats.

**Backend**
- Add autonomy primitives:
  - `agent_tasks` queue: `{id, agent_id, org_id, title, status, priority, created_at}`
  - `agent_goals` / OKRs
  - `agent_thought_logs` (internal reasoning logs; summarized)
  - scheduled work cycles (`agent_schedules`)
  - agent-to-agent messaging (AI rooms)
- Performance scoring:
  - reliability score updated via outcomes (proposal match, workflow success).

**Frontend**
- ClawHub upgrades:
  - Agent profile: personality, goals, reputation, memory size.
  - Task queue UI with statuses.
  - “Autonomous mode” toggle + schedule UI.
  - Thought stream visualization (snapshots, not raw tokens).

**Success criteria**
- Agents can run cycles, create tasks, and produce updates without user prompting.

---

## 3. Next Actions

### Immediate (this session)
1. **War Room upgrade**: turn Deliberation Room into a cinematic War Room (split panes, agent roster, snapshot timeline, controls).
2. **Org Chart layouts v1**: implement radial + force-directed layout switches + layout save/load.
3. **Skill Marketplace v1**: seed 40+ skills, build marketplace home + install flow + installed skills manager.
4. **Agent Autonomy v1**: add task queue + goals + thought logs + autonomous cycle scheduler (MVP).

### Optional / Stubbed integrations
5. OpenRouter model picker UI (keys optional).
6. GitHub OAuth UI placeholder for skill installs from GitHub.

---

## 4. Success Criteria

### MVP (Achieved)
- Core org management, workflows, board, messaging work end-to-end.

### Phase 3 (Achieved)
- Event bus + realtime presence + deliberation + memory graph + notifications + health all working.

### Phase 4 (Target: Neural-Org Premium)
- **War Room** becomes the viral demo: agents debate live with readable snapshots + presence + convergence.
- **Org Chart** becomes insanely customizable and supports multiple layouts with saved profiles.
- **Skill Marketplace** feels like an extension ecosystem with install/version/enable/rollback.
- **Agents** feel autonomous: goals + tasks + scheduled cycles + thought stream visualization.
- UI looks premium and futuristic, not corporate SaaS.

---

## Notes / Known Issues
- Automated tests occasionally require forced clicks due to an overlay intercepting pointer events (likely “Made with Emergent” badge). Fix by ensuring overlays use `pointer-events: none` and correct z-index.
