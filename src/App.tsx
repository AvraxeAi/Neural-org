import React, { useEffect, useMemo, useState } from 'react';
import './styles/globals.css';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/dashboard/Dashboard';
import Chat from './components/chat/Chat';
import Organization from './components/org/Organization';
import Agents from './components/agents/Agents';
import Capabilities from './components/capabilities/Capabilities';
import { WorkflowsEnhanced } from './components/workflows/WorkflowsEnhanced';
import { MemoryVaultEnhanced } from './components/memory/MemoryVaultEnhanced';
import { Documents, Terminal } from './components/pages';
import { MetricsEnhanced } from './components/metrics/MetricsEnhanced';
import Settings from './components/settings/Settings';
import PersonalWorkspace from './components/workspace/PersonalWorkspace';
import { SearchModal, NotificationsPanel } from './components/ui/SearchAndNotifications';
import { fetchGatewaySummary, type GatewaySummary } from './lib/api';
import { ConnectionBanner } from './components/system/ConnectionBanner';
import { useAuth } from './context/AuthContext';

const FALLBACK_SUMMARY: GatewaySummary = {
  ok: false,
  source: 'demo',
  environment: 'Not connected',
  message: 'Set VITE_API_BASE_URL to show live gateway data.',
};

export default function App() {
  const auth = useAuth();
  const [active, setActive] = useState('dashboard');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1100);
  const [summary, setSummary] = useState<GatewaySummary>(FALLBACK_SUMMARY);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1100);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const next = await fetchGatewaySummary();
      if (!cancelled) setSummary(next);
    };

    load();
    const interval = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  // Global Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(s => !s);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifsOpen(false);
        setMobileNavOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!isMobile) setMobileNavOpen(false);
  }, [isMobile]);

  const renderPage = () => {
    switch (active) {
      case 'dashboard':    return <Dashboard onNav={setActive} />;
      case 'chat':         return <Chat />;
      case 'personal':     return <PersonalWorkspace />;
      case 'org':          return <Organization />;
      case 'agents':       return <Agents />;
      case 'workflows':    return <WorkflowsEnhanced />;
      case 'capabilities': return <Capabilities />;
      case 'memory':       return <MemoryVaultEnhanced />;
      case 'documents':    return <Documents />;
      case 'metrics':      return <MetricsEnhanced />;
      case 'terminal':     return <Terminal />;
      case 'settings':     return <Settings />;
      default:             return null;
    }
  };

  const fullHeight = ['chat', 'terminal', 'settings', 'workflows', 'memory'].includes(active);
  const unreadCount = 3;
  const page = useMemo(() => renderPage(), [active]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      {isMobile && mobileNavOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,17,23,0.36)', border: 'none', zIndex: 15 }}
        />
      )}

      <Sidebar
        active={active}
        onNav={(id) => {
          setActive(id);
          setMobileNavOpen(false);
        }}
        summary={summary}
        currentUserName={auth.user?.displayName || 'Rusty'}
        mobile={isMobile}
        mobileOpen={mobileNavOpen}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Header
          onNewAgent={() => setActive('agents')}
          onSearchOpen={() => setSearchOpen(true)}
          onNotifsToggle={() => setNotifsOpen(n => !n)}
          onMenuToggle={() => setMobileNavOpen(v => !v)}
          notifsOpen={notifsOpen}
          unreadCount={unreadCount}
          mobile={isMobile}
          summary={summary}
          userLabel={auth.isDemoMode ? 'Demo mode' : auth.user?.email || 'Authenticated'}
        />

        {!summary.ok && <ConnectionBanner summary={summary} />}

        <main style={{ flex: 1, overflow: fullHeight ? 'hidden' : 'auto', position: 'relative' }}>
          <div key={active} className="animate-fade-up" style={{ height: '100%' }}>
            {page}
          </div>
        </main>
      </div>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNav={(id) => { setActive(id); setSearchOpen(false); setMobileNavOpen(false); }}
      />
      <NotificationsPanel
        open={notifsOpen}
        onClose={() => setNotifsOpen(false)}
      />
    </div>
  );
}
