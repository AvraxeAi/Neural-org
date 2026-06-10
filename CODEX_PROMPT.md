# Codex Build Prompt — AvraxeAi Command Center (Phase 2)

## Context

You are building Phase 2 of the AvraxeAi Command Center UI. Phase 1 (design system, sidebar, topbar, dashboard, org chart) has already been completed. Your job is to build **Boards**, **AI Chat**, **Security Center**, **Proposals**, **Workflows**, **Tasks**, **Memory**, **Settings**, and **Integrations** pages to exactly match the reference screenshots in `src/assets/`.

## Project Setup

- **Location**: `/root/Openclaw/`
- **Stack**: React 18 + TypeScript + Vite + Tailwind CSS v3 + Zustand + ReactFlow + Lucide + shadcn/ui primitives
- **Entry**: `src/App.tsx` — page state managed via `active` string, routed via `handleNav(id)`
- **Screenshots**: `src/assets/ref-boards.jpg`, `src/assets/ref-chat.jpg`, `src/assets/ref-security.jpg`, `src/assets/ref-dashboard.jpg`, `src/assets/ref-org.jpg`
- **Run**: `npm run dev` (Vite, port 5173)

## Design System (DO NOT DEVIATE)

These tokens are already set in `src/styles/globals.css`. Use them exactly.

### CSS Variables

```css
--bg-base: #0b0b0b;
--bg-sidebar: #0f0f0f;
--bg-card: #161616;
--bg-card-hover: #1e1e1e;
--bg-input: #1a1a1a;
--border: rgba(255,255,255,0.07);
--border-strong: rgba(255,255,255,0.12);
--accent: #10b981;
--accent-dim: rgba(16,185,129,0.12);
--accent-mid: rgba(16,185,129,0.25);
--text-primary: #f9fafb;
--text-secondary: #9ca3af;
--text-muted: #6b7280;
--status-green: #10b981;
--status-amber: #f59e0b;
--status-red: #ef4444;
--status-blue: #3b82f6;
--status-purple: #8b5cf6;
--radius-sm: 6px;
--radius: 8px;
--radius-lg: 12px;
```

### Tailwind Classes to Use

```
bg: bg-[#0b0b0b], bg-[#0f0f0f], bg-[#161616], bg-[#1e1e1e]
border: border-white/[0.07], border-white/[0.12]
text: text-white, text-gray-400, text-gray-500, text-emerald-400
accent: text-emerald-400, bg-emerald-500/10, bg-emerald-500/20, border-emerald-500/30
radius: rounded-md (8px), rounded-lg (12px), rounded-sm (6px)
```

### Typography

- Font: `Inter` (already loaded in `index.html`)
- Body: `text-sm` (14px), `font-normal`
- Label: `text-xs` (12px), `text-gray-500`
- Heading: `text-sm font-semibold text-white` or `text-base font-semibold`
- Section title: `text-xs font-medium uppercase tracking-wider text-gray-500`

### Card Pattern

```tsx
<div className="bg-[#161616] border border-white/[0.07] rounded-lg p-5">
  {/* content */}
</div>
```

### Status Dot Pattern

```tsx
<span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />  // active
<span className="inline-block w-2 h-2 rounded-full bg-amber-400" />    // standby
<span className="inline-block w-2 h-2 rounded-full bg-gray-500" />     // inactive
```

### Badge Pattern

```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
  Approved
</span>
```

Severity badges for Security:
```tsx
// Critical: bg-red-500/10 text-red-400 border-red-500/20
// High:     bg-orange-500/10 text-orange-400 border-orange-500/20
// Medium:   bg-amber-500/10 text-amber-400 border-amber-500/20
// Low:      bg-blue-500/10 text-blue-400 border-blue-500/20
```

---

## Page 1 — Boards (`src/components/board/Board.tsx`)

**Reference**: `src/assets/ref-boards.jpg`

### Layout

```
Full height flex column
├── PageHeader: title "Boards" + subtitle + InviteMember button
├── Tabs row: Overview | Members | Committees | Meetings | Votes | Policies | Settings
└── Overview tab content (two-column):
    ├── Left column (flex-1):
    │   ├── BoardMembersTable
    │   └── RecentActivityFeed
    └── Right column (w-80):
        ├── UpcomingMeetingsCard
        ├── RecentVotesCard
        └── BoardCompositionChart
```

### BoardMembersTable

Columns: Member (avatar + name + email) | Role | Type | Joined | Status | Actions (⋮)

Mock data (8 rows):
```ts
const MEMBERS = [
  { id:'rk', name:'Rusty Khan', email:'rusty@avraxe.com', role:'Board Chair', type:'Human', joined:'Jan 10, 2024', status:'Active' },
  { id:'ak', name:'Ayesha Khan', email:'ayesha@avraxe.com', role:'COO', type:'Human', joined:'Jan 12, 2024', status:'Active' },
  { id:'mr', name:'Michael Roberts', email:'michael@avraxe.com', role:'CFO', type:'Human', joined:'Jan 15, 2024', status:'Active' },
  { id:'sc', name:'Sarah Chen', email:'sarah@avraxe.com', role:'CTO', type:'Human', joined:'Jan 18, 2024', status:'Active' },
  { id:'h7', name:'Hermes-7', email:'hermes@agents.openclaw.ai', role:'Chief of Staff (AI)', type:'AI Agent', joined:'Jan 20, 2024', status:'Active' },
  { id:'c3', name:'Claude-3.5', email:'claude@agents.anthropic.com', role:'Strategy Advisor (AI)', type:'AI Agent', joined:'Jan 22, 2024', status:'Active' },
  { id:'g1', name:'Gemini-1.5', email:'gemini@agents.google.com', role:'Risk Advisor (AI)', type:'AI Agent', joined:'Jan 25, 2024', status:'Standby' },
  { id:'og', name:'OpenClaw Governor', email:'governor@openclaw.systems', role:'Governance (AI)', type:'AI Agent', joined:'Jan 28, 2024', status:'Active' },
];
```

- "You" badge next to Rusty Khan's name
- Type badge: Human = gray pill, AI Agent = emerald pill
- Status dot: Active = green, Standby = amber
- Action menu (⋮): View Profile, Edit Role, Remove from Board

### UpcomingMeetingsCard (right column)

```ts
const MEETINGS = [
  { title:'Board Meeting – May 2025', date:'May 24, 2025 • 10:00 AM PDT', badge:'In 2 days', badgeColor:'emerald' },
  { title:'Budget Review Q2', date:'May 31, 2025 • 2:00 PM PDT', badge:'In 9 days', badgeColor:'gray' },
  { title:'Strategy Planning Session', date:'Jun 7, 2025 • 11:00 AM PDT', badge:'In 16 days', badgeColor:'gray' },
];
```

Each: calendar icon + title + date + badge. "View calendar →" link at bottom.

### RecentVotesCard (right column)

```ts
const VOTES = [
  { title:'AI Security Audit Framework', proposal:'Proposal #42 • May 20, 2025', result:'Approved' },
  { title:'Budget Allocation Q2', proposal:'Proposal #41 • May 18, 2025', result:'Approved' },
  { title:'New Hiring Workflow', proposal:'Proposal #40 • May 15, 2025', result:'Rejected' },
];
```

Result badge: Approved = emerald, Rejected = red. "View all proposals →" link.

### BoardCompositionChart (right column)

SVG donut chart — pure SVG, NO recharts:
- 8 total members
- 4 Human (emerald), 4 AI Agents (blue), 0 Vacant (gray)
- Center text: "8\nTotal Members"
- Legend below: colored dots + labels + counts

Governance Health indicator at bottom: green shield icon + "Healthy"

### RecentActivityFeed (bottom left, below member table)

```ts
const ACTIVITY = [
  { time:'May 20, 2025 • 10:24 AM', icon:'vote', text:'Board vote completed on "AI Security Audit Framework"' },
  { time:'May 20, 2025 • 9:15 AM', icon:'user', text:'New board member Hermes-7 joined the board' },
  { time:'May 19, 2025 • 4:42 PM', icon:'calendar', text:'Meeting "Board Meeting – May 2025" scheduled' },
  { time:'May 18, 2025 • 2:08 PM', icon:'proposal', text:'Proposal "Budget Allocation Q2" moved to voting' },
  { time:'May 18, 2025 • 11:33 AM', icon:'ai', text:'Claude-3.5 submitted recommendation on proposal #41' },
];
```

"View all activity →" link at bottom.

---

## Page 2 — AI Chat (`src/components/chat/Chat.tsx`)

**Reference**: `src/assets/ref-chat.jpg`

### Layout

```
Full height flex row (NO topbar chrome on this page — full-bleed)
├── ChatSidebar (w-56, bg-[#0f0f0f], border-r border-white/[0.07])
│   ├── Header: "New Chat" button + "Search" item + "Notes" item + "Workspace" item
│   ├── Section "Chats" label
│   ├── Grouped conversation list:
│   │   ├── Today: "Q2 Budget Proposal" (active, highlighted), "Security Audit Findings", "Workflow Automation", "Agent Performance"
│   │   ├── Yesterday: "Board Meeting Summary", "Marketing Strategy"
│   │   └── Previous 7 Days: "Hiring Plan", "Product Roadmap"
│   └── Footer: user avatar + "Rusty" + "Admin" (bottom left)
└── ChatMain (flex-1, bg-[#0b0b0b])
    ├── TopBar (within chat): model selector dropdown "gpt-4.1-nano ▼" + new chat (+) button + settings icon (top right: user avatar)
    ├── EmptyState (centered vertically):
    │   ├── Bot avatar circle (64px, bg-[#161616], border)
    │   └── "How can I help you today?" (text-xl font-medium text-white)
    ├── QuickChips row (centered):
    │   ├── "Analyze this data" (chart icon)
    │   ├── "Summarize meeting notes" (doc icon)
    │   ├── "Draft a proposal" (edit icon)
    │   └── "Explain a concept" (lightbulb icon)
    └── InputArea (bottom, max-w-2xl centered):
        ├── Textarea: placeholder "Message gpt-4.1-nano"
        ├── Left: + attachment icon
        ├── Right: adjustments icon + mic icon + send button (emerald circle)
        └── Disclaimer: "OpenClaw Command Center may produce inaccurate information. ?"
```

### ChatSidebar items

Nav items at top (before "Chats" section):
```tsx
const TOP_NAV = [
  { id:'new', label:'New Chat', icon: Plus },
  { id:'search', label:'Search', icon: Search },
  { id:'notes', label:'Notes', icon: FileText },
  { id:'workspace', label:'Workspace', icon: FolderOpen },
];
```

Conversation items: left-click to activate (highlighted bg-[#1e1e1e] rounded-md), ⋯ on hover.

### Model Selector

Dropdown with options: `gpt-4.1-nano`, `gpt-5.5`, `claude-sonnet-4-6`, `claude-opus-4-6`, `gemini-2.5-pro`

### Quick Chips

```tsx
<button className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.07] bg-[#161616] text-sm text-gray-300 hover:bg-[#1e1e1e] transition-colors">
```

---

## Page 3 — Security Center (`src/components/security/SecurityCenter.tsx`)

**Reference**: `src/assets/ref-security.jpg`

### Layout

```
Full height flex column
├── PageHeader: "Security Center" + subtitle
├── MetricsRow (4 cards, grid-cols-4 gap-4)
├── TeamCards row (3 cards, grid-cols-3 gap-4)
└── Bottom row (two column):
    ├── ThreatFeedTable (flex-1)
    └── SecurityTimeline (w-80)
```

### MetricsRow (4 cards)

```ts
const METRICS = [
  { label:'Security Score', value:'92', suffix:'/100', trend:'+4 pts from last week', icon: Shield, sparkline: [88,89,90,90,91,92,92], color:'emerald' },
  { label:'Active Alerts', value:'3', sub:'2 Critical • 1 High', icon: AlertTriangle, sparkline: [5,4,4,3,4,3,3], color:'red' },
  { label:'Open Investigations', value:'5', sub:'2 Critical • 3 High', icon: Search, sparkline: [3,4,5,5,6,5,5], color:'orange' },
  { label:'Systems Monitored', value:'48', sub:'All systems operational', icon: Monitor, sparkline: [48,48,48,48,48,48,48], color:'blue' },
];
```

Each card: icon (top left) + large value + label + trend text + sparkline SVG (top right, 80x32px, no axes). Sparkline color matches metric color.

### TeamCards (3 cards)

```ts
const TEAMS = [
  {
    name:'Red Team', subtitle:'Offensive Security', color:'red',
    description:'Simulate attacks and identify weaknesses before adversaries can exploit them.',
    stats:{ agents:3, tasks:4, findings:7 }, status:'Active',
    agentAvatars:['R1','R2','R3'], extraCount:2,
  },
  {
    name:'Blue Team', subtitle:'Defensive Security', color:'blue',
    description:'Monitor systems, detect threats, and respond to security incidents.',
    stats:{ agents:3, tasks:6, findings:12 }, status:'Active',
    agentAvatars:['B1','B2','B3'], extraCount:3,
  },
  {
    name:'Purple Team', subtitle:'Collaborative Security', color:'purple',
    description:'Bridge offensive and defensive insights to improve overall security posture.',
    stats:{ agents:3, tasks:3, findings:5 }, status:'Active',
    agentAvatars:['P1','P2','P3'], extraCount:2,
  },
];
```

Each card:
- Header: colored shield icon + team name + subtitle + ⋮ menu
- Description text (text-sm text-gray-400)
- 3-row stats table: Assigned Agents (avatar stack + +N) | Current Tasks | Recent Findings
- Footer: Status dot + "Active" + "View [Team] Dashboard →" button

Red = red-500, Blue = blue-500, Purple = purple-500 for icon colors.

### ThreatFeedTable

Header: "Threat Feed" + Filter dropdown button

Columns: Severity | Title | Source | Status | Date

```ts
const THREATS = [
  { sev:'Critical', title:'Possible credential stuffing attack', source:'Auth System', status:'Investigating', date:'May 20, 10:24 AM' },
  { sev:'High', title:'Unusual API usage detected', source:'API Gateway', status:'Investigating', date:'May 20, 9:15 AM' },
  { sev:'High', title:'Admin privilege escalation attempt', source:'Access Control', status:'Detected', date:'May 20, 8:43 AM' },
  { sev:'Medium', title:'Suspicious login location', source:'Identity Service', status:'Monitoring', date:'May 20, 7:22 AM' },
  { sev:'Low', title:'Outdated dependency detected', source:'Code Scanner', status:'Open', date:'May 19, 11:03 PM' },
];
```

Status pill colors: Investigating=amber, Detected=red, Monitoring=blue, Open=gray.
"View all threats →" link at bottom.

### SecurityTimeline (right column)

Header: "Security Timeline" + "View all" link

```ts
const TIMELINE = [
  { time:'10:24 AM', icon:'login', text:'New login from unknown device', sub:'User: alex.morgan@avraxe.com' },
  { time:'9:41 AM', icon:'workflow', text:'Workflow "Vendor Onboarding" was modified', sub:'By: Hermes-7' },
  { time:'8:15 AM', icon:'vote', text:'Board vote completed on "Security Policy Update"', sub:'Result: Approved' },
  { time:'Yesterday', icon:'agent', text:'New agent "Sentinel-2" was created', sub:'By: System' },
  { time:'Yesterday', icon:'org', text:'Organization chart updated', sub:'By: Ayesha Khan' },
  { time:'May 18', icon:'permission', text:'Permission changes applied to 4 agents', sub:'By: System' },
];
```

Each item: time label (left) + icon circle + text + subtext. Vertical line connecting items.

---

## Stub Pages (minimal, but correct layout shell)

Build these as proper page components with the correct layout shell (sidebar highlight, page header), but content can be placeholder.

### Proposals (`src/components/governance/Proposals.tsx`)

Nav ID: `proposals`

Page header: "Proposals" + subtitle "Create, discuss, and vote on organizational proposals."

Show a simple table with 3 mock proposals:
```ts
[
  { id:'#42', title:'AI Security Audit Framework', status:'Voting', votes:'6/8', deadline:'May 24' },
  { id:'#41', title:'Budget Allocation Q2', status:'Approved', votes:'7/8', deadline:'May 18' },
  { id:'#40', title:'New Hiring Workflow', status:'Rejected', votes:'3/8', deadline:'May 15' },
]
```

Status badge colors: Voting=amber, Approved=emerald, Rejected=red.

### Workflows (`src/components/workflows/WorkflowsEnhanced.tsx`)

Nav ID: `workflows`

Page header: "Workflows" + subtitle "Automate and orchestrate your organization's processes."

Show 3 mock workflow cards in a grid:
```ts
[
  { name:'Employee Onboarding', status:'Active', lastRun:'2 hours ago', runs:47 },
  { name:'Security Audit', status:'Active', lastRun:'1 day ago', runs:12 },
  { name:'Budget Review', status:'Paused', lastRun:'3 days ago', runs:8 },
]
```

### Tasks (`src/components/kanban/Kanban.tsx`)

Nav ID: `tasks` (currently `kanban`)

Page header: "Tasks" + subtitle "Track and manage team tasks."

Simple kanban with 3 columns: Todo | In Progress | Done — 2-3 mock cards each.

### Memory (`src/components/memory/MemoryDashboard.tsx`)

Nav ID: `memory`

Page header: "Memory" + subtitle "Persistent agent knowledge and context."

Show placeholder grid of 6 memory cards with: type badge, title, snippet text, date.

### Settings (`src/components/settings/Settings.tsx`)

Nav ID: `settings`

Page header: "Settings" + subtitle "Configure your workspace and preferences."

Tabs: General | Security | Notifications | API Keys | Team — stub content in each.

### Integrations

Nav ID: `integrations`

Page header: "Integrations" + subtitle "Connect external tools and services."

Grid of integration cards (logo placeholder + name + status + Connect/Disconnect button): GitHub, Slack, Google Workspace, Jira, Notion, Linear.

---

## App.tsx Page Routing

Ensure `App.tsx` maps these page IDs correctly:

```tsx
type Page = 'home' | 'chat' | 'org' | 'proposals' | 'board' | 'tasks' | 'workflows' | 'security' | 'memory' | 'integrations' | 'settings';

// In the render switch:
case 'home':        return <Dashboard />;
case 'chat':        return <Chat />;
case 'org':         return <OrgChart />;
case 'proposals':   return <Proposals />;
case 'board':       return <Board />;
case 'tasks':       return <Kanban />;
case 'workflows':   return <WorkflowsEnhanced />;
case 'security':    return <SecurityCenter />;
case 'memory':      return <MemoryDashboard />;
case 'integrations': return <Integrations />;
case 'settings':    return <Settings />;
```

---

## Sidebar Nav Items (match screenshots exactly)

```tsx
const NAV = [
  { id:'home',         label:'Home',         icon: Home },
  { id:'chat',         label:'AI Chat',      icon: MessageSquare },
  { id:'org',          label:'Organization', icon: Building2 },
  { id:'proposals',    label:'Proposals',    icon: FileText },
  { id:'board',        label:'Boards',       icon: LayoutGrid },
  { id:'tasks',        label:'Tasks',        icon: CheckSquare },
  { id:'workflows',    label:'Workflows',    icon: GitBranch },
  { id:'security',     label:'Security',     icon: Shield },
  { id:'memory',       label:'Memory',       icon: Brain },
  { id:'integrations', label:'Integrations', icon: Plug },
  { id:'settings',     label:'Settings',     icon: Settings },
];
```

Active item style:
```tsx
className={cn(
  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer select-none",
  active === id
    ? "bg-emerald-500/10 text-emerald-400"
    : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
)}
```

---

## Sidebar Collapse Behavior

Toggle between expanded (w-48, icon + label) and collapsed (w-14, icon only, centered) via a collapse button at the top.

Collapsed state — nav items show only icon, centered, with tooltip on hover.
Expanded state — icon + label text.

The sidebar top shows:
- Expanded: OpenClaw logo (small square icon) + "OpenClaw" bold + "Command Center" muted text
- Collapsed: just the square icon, centered

Bottom of sidebar:
```tsx
<div className="flex items-center gap-2 p-3 border-t border-white/[0.07]">
  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-400">RK</div>
  {!collapsed && (
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-white truncate">Rusty Khan</p>
      <p className="text-xs text-gray-500">Administrator</p>
    </div>
  )}
</div>
```

---

## Rules — DO NOT VIOLATE

1. **No glassmorphism** — no `backdrop-filter`, no `blur`, no translucent backgrounds
2. **No neon glow effects** — no `box-shadow` with color, no text-shadow
3. **No gradient backgrounds** on cards or sidebar — solid colors only
4. **No recharts** for the donut chart — use pure inline SVG
5. **Match screenshot proportions** — sidebar ~192px, right panels ~320px, card padding p-5
6. **Dark backgrounds only** — nothing lighter than #222222 for surfaces
7. **Emerald accent only** — #10b981 / emerald-400/500 — not teal, not cyan, not green-400
8. **Inter font** — already in index.html, reference as `font-sans`
9. **Do not add pages not in the screenshots** — no "Audit Logs", no "Compliance", no "Dreaming"
10. **Build runnable code** — `npm run build` must succeed with no TypeScript errors

---

## Verification Steps

After building each page:
1. Run `npm run dev` and visually compare against `src/assets/ref-*.jpg`
2. Check sidebar highlights the correct nav item
3. Check all mock data renders correctly
4. Confirm no TypeScript errors (`npm run build`)
5. Compare layout proportions to screenshots

## File Output Summary

Files to create or replace:
- `src/components/board/Board.tsx` — full rebuild
- `src/components/chat/Chat.tsx` — full rebuild
- `src/components/security/SecurityCenter.tsx` — full rebuild
- `src/components/governance/Proposals.tsx` — new
- `src/components/workflows/WorkflowsEnhanced.tsx` — update
- `src/components/kanban/Kanban.tsx` — update
- `src/components/memory/MemoryDashboard.tsx` — update
- `src/components/settings/Settings.tsx` — update
- `src/components/integrations/Integrations.tsx` — new
- `src/App.tsx` — update routing + page type
