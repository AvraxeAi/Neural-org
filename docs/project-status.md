# Session Handoff — 2026-06-04

## What was built / changed

- **Dashboard.tsx** — wired to live gateway `summary` prop (active agents, cost, latency, threads); reads org nodes from `localStorage:openclaw:org:nodes`; fetches tasks via `orgTasksApi.list()`
- **ActivityPanel.tsx** — new persistent right sidebar (256px, collapse/expand saved to localStorage); shows online agents from org nodes, 3 static workflows, 3 active orgs, gateway pulse; **suppressed on home page** (Home manages its own right panel)
- **WarRoom.tsx** — new investor demo centerpiece at `/governance` route; 3-panel layout: deliberation list rail + animated live feed (agent presence cards, thinking/speaking indicators, auto-reveal timing) + decision panel (consensus arc meter, risk matrix, decision timeline, export button); old Governance screen preserved at `approvals` route, linked from War Room footer
- **Marketplace.tsx** — `OrgProfileView` component added; "View Profile" on any listing/featured card opens full org profile (services, AI workforce stats, org chart preview, reviews, availability, contact CTA, back button)
- **Home.tsx** — full rewrite; reads org nodes from localStorage for agents/orgs sections; reads board proposals from localStorage for board activity; fetches tasks from `orgTasksApi`; uses `summary` prop for live system stats; right panel (live agents, workflows, notifications, system stats, marketplace peek)
- **SearchAndNotifications.tsx** — full dark theme rewrite (was light `rgba(248,249,252)`, now `var(--surface)`); SearchModal dynamically loads org members from localStorage as searchable Agent/Member results; added War Room + Marketplace + Board to static results
- **globals.css** — added `--radius-sm`, `--radius`, `--radius-lg`, `--green`, `--green-dim` CSS vars
- **designTokens.ts** — fully migrated to CSS vars (user applied); all surface/text/accent/status values now reference `var(--*)` — Governance/Security components will render slightly darker than before (--surface=#111111 vs old #1e1e1e)
- **OrgBoard.tsx (Codex)** — 8-stage lifecycle (`draft→open→discussion→voting→passed→failed→implemented→tabled`); `LifecycleBar` component with dot+line progress bar; "Advance Stage" button; dark-theme LifecycleBar colors fixed (was invisible `rgba(0,0,0,...)` on dark card)
- **pages.tsx (Codex)** — dead code removed; `Workflows`, `MemoryVault`, `Metrics`, `GlassCard`, `SectionTitle` exports deleted; now 128 lines, only `Documents` and `Terminal`
- **Chat.tsx (Codex)** — workspace sidebar with workspace switcher (Private/Organization types), folder collapse (Pinned/Recent/Archive), chat list with unread dots; 772 lines
- **Agents.tsx (Codex)** — agent detail panel with 4 tabs: Overview, Goals, Tasks (mini kanban), Schedule
- **Organization.tsx (Codex)** — governance lock mode; toggle button in org chart header; when locked, edit/delete intercepted → `GovProposalModal` writes to `localStorage:openclaw:gov-proposals`; locked nodes get red border tint
- **ActivityPanel toggle bug fix** — button was inside `overflow:hidden` container, disappeared when collapsed; restructured into wrapper div that doesn't clip

## Decisions made

- **War Room replaces governance route** — old approval/audit/kill-switch screen accessible via War Room "Governance Console" link only; `approvals` case added to App.tsx router
- **ActivityPanel hidden on home** — Home.tsx has its own right panel with different content; rendering both created duplicate sidebars
- **designTokens.ts surfaces → CSS vars** — user applied full migration; intentional, aligns all components to single design system
- **Org node ownership model** — Hughes=Cody (brother), Lisa=Andrea (sister), Freida=Sheryl (mother); agents belong to users not to org; `ownerId` field needed on OrgNode when multi-auth goes live

## Current state

TypeScript is zero errors. The app has a built `dist/` but no dev server running. Start with `cd /root/Openclaw && npm run dev` — accessible at `http://187.124.66.30:5173`; Vite is configured with `host: true` and proxies all API routes to openclaw-cash at port 50348. Codex has a pending task: wire `PersonalWorkspace.tsx` to real org nodes from localStorage (spec given, not yet confirmed complete). All other core views are functional: Home, Dashboard, Chat, Org Chart (with gov lock), OrgBoard (8-stage lifecycle), War Room, Marketplace (with org profiles), Agents (with autonomy tabs), all Security/Memory/Metrics screens.

## Next steps

1. **Confirm PersonalWorkspace Codex task complete** — check `npx tsc --noEmit` passes, verify agents tab shows real org nodes
2. **Start dev server and visual test** — `npm run dev`, walk through Home → War Room → Marketplace profile → OrgBoard lifecycle bar → Chat workspace — look for obvious rendering issues
3. **OrgBoard dark theme pass** — modal, filter bar, and board member rows still use `rgba(0,0,0,...)` light-theme values; needs a targeted find-replace pass
4. **Multi-user prep** — add `ownerId?: string` to `OrgNode` type; Personal Workspace should scope to current user's nodes only
5. **Deploy to VPS** — `npm run build` then serve `dist/` via Traefik at a subdomain (e.g. `app.srv1427612.hstgr.cloud`)

## Watch out for

- **`approvals` route is sidebar-orphaned** — old Governance screen only reachable via War Room footer button, not in sidebar nav; if user needs it in nav, add it to Sidebar.tsx INTELLIGENCE section
- **OrgBoard has mixed light/dark theme** — LifecycleBar is fixed but modal (`rgba(248,249,252,0.99)`), filter tab bar, and vote bar (`rgba(0,0,0,0.06)`) still use light-theme values; looks wrong in dark mode
- **designTokens surfaces shifted** — `t.surface` was `#1e1e1e`, now `var(--surface)` = `#111111`; Governance, Red/Blue/Purple Team components are now visibly darker — check they still look right
- **ActivityPanel toggle tab** — 20px wide, positioned `left: -20px` from the panel edge; on narrow viewports or when panel is first in layout order it could overlap content — verify visually
- **`VITE_OPENCLAW_TOKEN`** — set in `.env` to `hhEmU5sehrn06WISuvkyB6Nue6Sa3Bnx`; do not commit `.env` to git
- **Cody/Andrea/Sheryl agent ownership** — Hughes, Lisa, Freida currently modeled as org-level nodes; when those users get accounts, each needs their agent migrated to their Personal Workspace with `ownerId` set — do not let org ownership overwrite personal ownership
- **`glass-card` on OrgBoard** — some card borders use `rgba(0,0,0,0.06)` which is invisible on dark surfaces; full dark-theme audit of OrgBoard needed before demo
