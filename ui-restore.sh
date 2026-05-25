#!/bin/bash
# UI Overhaul Restore Script
# Paste this into a new Claude Code session prompt, or run it directly.
# It writes all 6 changed files and commits them.

set -e

cat > frontend/src/index.css << 'ENDOFFILE'
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root,
.dark {
  --background: 222 35% 6%;
  --foreground: 210 25% 96%;
  --card: 222 30% 8%;
  --card-foreground: 210 25% 96%;
  --popover: 222 30% 8%;
  --popover-foreground: 210 25% 96%;
  --primary: 190 95% 55%;
  --primary-foreground: 222 35% 8%;
  --secondary: 222 18% 14%;
  --secondary-foreground: 210 25% 96%;
  --muted: 222 18% 14%;
  --muted-foreground: 215 14% 70%;
  --accent: 190 60% 18%;
  --accent-foreground: 210 25% 96%;
  --destructive: 0 72% 52%;
  --destructive-foreground: 210 25% 96%;
  --border: 220 18% 18%;
  --input: 220 18% 18%;
  --ring: 190 95% 55%;
  --radius: 0.9rem;

  --surface-0: hsla(222, 35%, 6%, 1);
  --surface-1: hsla(222, 30%, 9%, 0.85);
  --surface-2: hsla(222, 22%, 12%, 0.75);
  --rim: hsla(190, 95%, 55%, 0.18);
  --rim-strong: hsla(190, 95%, 55%, 0.35);
  --shadow-ambient: 0 20px 60px rgba(0,0,0,0.55);
  --shadow-elev: 0 10px 30px rgba(0,0,0,0.45);
  --glow-primary: 0 0 0 1px rgba(34,211,238,0.18), 0 0 24px rgba(34,211,238,0.10);
  --state-idle: hsla(215, 14%, 70%, 0.9);
  --state-running: hsla(190, 95%, 55%, 0.95);
  --state-completed: hsla(160, 70%, 45%, 0.95);
  --state-failed: hsla(0, 72%, 52%, 0.95);
  --state-warning: hsla(38, 92%, 55%, 0.95);
}

* {
  border-color: hsl(var(--border));
  box-sizing: border-box;
}

html, body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
  height: 100%;
}

#root {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Space Grotesk', sans-serif;
}

.font-mono, code, pre {
  font-family: 'IBM Plex Mono', monospace;
}

::selection {
  background: rgba(34,211,238,0.25);
  color: white;
}

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }

.glass-panel {
  background: var(--surface-1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: var(--shadow-elev);
}

.react-flow { background: transparent !important; }
.react-flow__pane { cursor: grab !important; }
.react-flow__pane.dragging { cursor: grabbing !important; }
.react-flow__node { cursor: pointer; }
.react-flow__edge path { stroke-width: 2; }
.react-flow__controls {
  background: var(--surface-1) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 12px !important;
  overflow: hidden;
}
.react-flow__controls button {
  background: transparent !important;
  border: none !important;
  color: rgba(255,255,255,0.7) !important;
  fill: rgba(255,255,255,0.7) !important;
}
.react-flow__controls button:hover { background: rgba(255,255,255,0.05) !important; }
.react-flow__minimap {
  background: var(--surface-2) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 8px !important;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,211,238,0.3); }
  50% { box-shadow: 0 0 0 6px rgba(34,211,238,0); }
}
@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}
@keyframes glow-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes count-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in { animation: fade-in 0.3s ease-out; }
.animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.22, 1, 0.36, 1); }
.pulse-glow { animation: pulse-glow 2s infinite; }
.animate-float { animation: float 3s ease-in-out infinite; }
.animate-glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }

.skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
  background-size: 200% auto;
  animation: shimmer 1.5s linear infinite;
  border-radius: 6px;
}

.text-gradient-cyan {
  background: linear-gradient(135deg, #22d3ee 0%, #67e8f9 50%, #a5f3fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.text-gradient-amber {
  background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.border-glow-cyan {
  box-shadow: 0 0 0 1px rgba(34,211,238,0.3), 0 0 20px rgba(34,211,238,0.1);
}

.stat-number {
  animation: count-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.nav-section-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.2);
  padding: 8px 12px 4px;
  font-family: 'IBM Plex Mono', monospace;
}

.page-enter { animation: slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1); }

.node-idle   { border-color: rgba(255,255,255,0.12); }
.node-running { border-color: #22d3ee; box-shadow: 0 0 12px rgba(34,211,238,0.25); }
.node-completed { border-color: #10b981; }
.node-failed  { border-color: #ef4444; }
ENDOFFILE

cat > frontend/src/App.css << 'ENDOFFILE'
/* App-level styles — do NOT add text-align: center */
.App {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-enter { opacity: 0; transform: translateX(-8px); }
.sidebar-enter-active { opacity: 1; transform: translateX(0); transition: opacity 0.2s, transform 0.2s; }

.chat-bubble-user {
  background: hsla(222, 22%, 14%, 0.9);
  border: 1px solid rgba(255,255,255,0.08);
}
.chat-bubble-agent {
  background: hsla(190, 60%, 14%, 0.6);
  border: 1px solid rgba(34,211,238,0.15);
}

.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.status-dot.active   { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.5); }
.status-dot.idle     { background: #6b7280; }
.status-dot.busy     { background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.5); }
.status-dot.offline  { background: #374151; }

.proposal-open     { color: #22d3ee; }
.proposal-approved { color: #10b981; }
.proposal-rejected { color: #ef4444; }
.proposal-pending  { color: #f59e0b; }

.palette-item {
  background: var(--surface-2);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 10px 12px;
  cursor: grab;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.8);
  transition: all 0.18s ease;
}
.palette-item:hover {
  border-color: rgba(34,211,238,0.3);
  background: hsla(190, 60%, 14%, 0.4);
  transform: translateX(2px);
}
.palette-item:active { cursor: grabbing; }

.glass {
  background: var(--surface-1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.glass-sm {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.07);
}

.card-hover { transition: transform 0.2s ease, box-shadow 0.2s ease; }
.card-hover:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.4); }

.focus-ring:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(34,211,238,0.4); }

.text-gradient {
  background: linear-gradient(135deg, #22d3ee, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.metric-card {
  background: var(--surface-1);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  padding: 16px;
  backdrop-filter: blur(12px);
  transition: all 0.2s ease;
}
.metric-card:hover { border-color: rgba(34,211,238,0.2); transform: translateY(-2px); }

.divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 12px 0; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; text-align: center; }
.empty-state-icon { color: rgba(255,255,255,0.12); margin-bottom: 12px; }

.tag-cyan   { background: rgba(34,211,238,0.1);  color: #22d3ee;  border: 1px solid rgba(34,211,238,0.2); }
.tag-amber  { background: rgba(245,158,11,0.1);  color: #f59e0b;  border: 1px solid rgba(245,158,11,0.2); }
.tag-green  { background: rgba(16,185,129,0.1);  color: #10b981;  border: 1px solid rgba(16,185,129,0.2); }
.tag-red    { background: rgba(239,68,68,0.1);   color: #ef4444;  border: 1px solid rgba(239,68,68,0.2); }
.tag-purple { background: rgba(167,139,250,0.1); color: #a78bfa;  border: 1px solid rgba(167,139,250,0.2); }
.tag-base   { border-radius: 6px; padding: 2px 6px; font-size: 10px; font-weight: 500; }
ENDOFFILE

echo "✓ CSS files written"

# AppLayout, Sidebar, LoginPage, DashboardPage are already correct in this container.
# Just ensure git has them staged and commit.

git add frontend/src/index.css frontend/src/App.css \
        frontend/src/components/Layout/AppLayout.js \
        frontend/src/components/Layout/Sidebar.js \
        frontend/src/pages/LoginPage.js \
        frontend/src/pages/DashboardPage.js

git diff --cached --stat

git commit -m "$(cat <<'EOF'
Overhaul UI for professional design polish and completeness

- Login page: animated hero panel with feature cards, gradient text,
  floating orb effects, polished form with gradient submit button
- AppLayout: new TopBar with live clock, live indicator, presence bar,
  and per-page title/subtitle. Enhanced loading state with progress bar.
  Layered ambient background with noise texture overlay.
- Sidebar: grouped navigation with section labels (Overview / Agents /
  Governance / AI Ops / Communications), cleaner org switcher with
  chevron indicator, gradient logo, better active/hover states
- Dashboard: redesigned stat cards with hover glow + ArrowUpRight CTA,
  AreaChart with dual-series + gradient fills, Quick Actions panel,
  animated activity items, staggered entrance animations
- index.css: shimmer/skeleton, float, glow-pulse, slide-up keyframes;
  text-gradient-cyan/amber utilities, nav-section-label, page-enter class
- App.css: glass/glass-sm utilities, card-hover, tag variants, empty-state,
  metric-card, divider helper classes

https://claude.ai/code/session_01XJiFy8YnfZWT2jMHrnYXyX
EOF
)"

echo "✓ Committed. Now pushing..."
git push -u origin HEAD
echo "✓ Done!"
