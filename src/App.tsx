import React, { useEffect, useState } from 'react';
import './styles/globals.css';
import AppShell from './components/layout/AppShell';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Chat from './components/chat/Chat';
import Dashboard from './components/dashboard/Dashboard';
import OrgFlow from './components/org/OrgFlow';
import Board from './components/board/Board';
import Proposals from './components/governance/Proposals';
import Kanban from './components/kanban/Kanban';
import { WorkflowsEnhanced } from './components/workflows/WorkflowsEnhanced';
import Agents from './components/agents/Agents';
import SecurityCenter from './components/security/SecurityCenter';
import { MemoryDashboard } from './components/memory/MemoryDashboard';
import Integrations from './components/integrations/Integrations';
import Settings from './components/settings/Settings';
import { ConnectionBanner } from './components/system/ConnectionBanner';
import { fetchGatewaySummary, type GatewaySummary } from './lib/api';
import { useAuth } from './context/AuthContext';
import InviteOnboarding from './components/org/InviteOnboarding';

type Page = 'home' | 'chat' | 'org' | 'proposals' | 'board' | 'tasks' | 'workflows' | 'agents' | 'security' | 'memory' | 'integrations' | 'settings';

const VALID_PAGES: Page[] = ['home', 'chat', 'org', 'proposals', 'board', 'tasks', 'workflows', 'agents', 'security', 'memory', 'integrations', 'settings'];

const FALLBACK_SUMMARY: GatewaySummary = {
  ok: false,
  source: 'demo',
  environment: 'Not connected',
  message: 'Set VITE_API_BASE_URL to show live gateway data.',
};

export default function App() {
  const inviteToken = window.location.pathname.match(/^\/join\/([^/]+)$/)?.[1];
  if (inviteToken) return <InviteOnboarding token={decodeURIComponent(inviteToken)} />;
  return <CommandCenterApp />;
}

function CommandCenterApp() {
  const auth = useAuth();
  const [active, setActive] = useState<Page>('board');
  const [summary, setSummary] = useState<GatewaySummary>(FALLBACK_SUMMARY);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const next = await fetchGatewaySummary();
      if (!cancelled) setSummary(next);
    };
    void load();
    const interval = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const handleNav = (id: string) => {
    if (VALID_PAGES.includes(id as Page)) setActive(id as Page);
  };

  const userName = auth.user?.displayName || 'Rusty Khan';

  if (active === 'chat') {
    return (
      <>
        {!summary.ok && <ConnectionBanner summary={summary} onConfigure={() => setActive('settings')} />}
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--canvas)' }}>
          <Chat mode="private" onNavigate={handleNav} />
        </div>
      </>
    );
  }

  const renderPage = () => {
    switch (active) {
      case 'home':         return <Dashboard onNav={handleNav} />;
      case 'org':          return <OrgFlow />;
      case 'proposals':    return <Proposals />;
      case 'board':        return <Board />;
      case 'tasks':        return <Kanban />;
      case 'workflows':    return <WorkflowsEnhanced />;
      case 'agents':       return <Agents />;
      case 'security':     return <SecurityCenter onNav={handleNav} />;
      case 'memory':       return <MemoryDashboard />;
      case 'integrations': return <Integrations />;
      case 'settings':     return <Settings initialTab="general" />;
      default:             return null;
    }
  };

  return (
    <>
      {!summary.ok && <ConnectionBanner summary={summary} onConfigure={() => setActive('settings')} />}
      <AppShell
        sidebar={<Sidebar active={active} onNav={handleNav} currentUserName={userName} />}
        topBar={<TopBar onNav={handleNav} currentUserName={userName} />}
      >
        <div key={active} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {renderPage()}
        </div>
      </AppShell>
    </>
  );
}
