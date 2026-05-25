import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useOrg } from '../../contexts/OrgContext';
import { WSProvider } from '../../contexts/WSContext';
import Sidebar from './Sidebar';
import PresenceBar from './PresenceBar';
import { Zap } from 'lucide-react';

const PAGE_META = {
  '/dashboard':    { title: 'Command Center',    subtitle: 'Organization overview' },
  '/org-chart':    { title: 'Org Chart',         subtitle: 'Hierarchy & structure' },
  '/my-agents':    { title: 'My Agents',         subtitle: 'Personal agent fleet' },
  '/agents':       { title: 'ClawHub',           subtitle: 'Agent management' },
  '/board':        { title: 'Governance Board',  subtitle: 'Proposals & voting' },
  '/workflows':    { title: 'Workflows',         subtitle: 'Automation & execution' },
  '/war-room':     { title: 'War Room',          subtitle: 'Multi-agent deliberation' },
  '/marketplace':  { title: 'Skill Marketplace', subtitle: 'Extend agent capabilities' },
  '/deliberation': { title: 'Deliberation',      subtitle: 'AI reasoning engine' },
  '/memory':       { title: 'Memory Graph',      subtitle: 'Agent knowledge base' },
  '/messages':     { title: 'Messages',          subtitle: 'Team communications' },
  '/settings':     { title: 'Settings',          subtitle: 'Organization configuration' },
};

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

function TopBar({ currentOrg }) {
  const location = useLocation();
  const meta = PAGE_META[location.pathname] || { title: 'OpenClaw', subtitle: '' };

  return (
    <div className="flex items-center justify-between px-6 h-14 flex-shrink-0"
      style={{
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        WebkitBackdropFilter: 'blur(12px)'
      }}>
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-sm font-semibold leading-none mb-0.5" style={{ fontFamily: 'Space Grotesk', color: 'rgba(255,255,255,0.9)' }}>
            {meta.title}
          </h2>
          {meta.subtitle && (
            <p className="text-[11px] leading-none" style={{ color: 'rgba(255,255,255,0.32)', fontFamily: 'IBM Plex Sans' }}>
              {meta.subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {currentOrg && <PresenceBar orgId={currentOrg.id} />}
        <Clock />
        {currentOrg && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
            <span style={{ fontSize: 10, color: '#10b981', fontFamily: 'IBM Plex Mono', fontWeight: 500 }}>LIVE</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppLayout({ children }) {
  const { currentOrg, loading } = useOrg();

  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
      <div className="flex flex-col items-center gap-5">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(34,211,238,0.05))', border: '1px solid rgba(34,211,238,0.25)', boxShadow: '0 0 30px rgba(34,211,238,0.1)' }}>
          <Zap size={22} style={{ color: '#22d3ee' }} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-32 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full animate-pulse" style={{ background: 'linear-gradient(90deg, #22d3ee, #0891b2)', width: '60%' }} />
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'IBM Plex Mono' }}>Loading organization...</p>
        </div>
      </div>
    </div>
  );

  const content = (
    <div className="flex h-screen overflow-hidden" style={{ background: 'hsl(var(--background))' }}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(1000px circle at 10% 20%, rgba(34,211,238,0.055), transparent 55%), radial-gradient(700px circle at 85% 80%, rgba(167,139,250,0.045), transparent 60%), radial-gradient(500px circle at 50% 100%, rgba(245,158,11,0.03), transparent 60%)'
      }} />
      {/* Subtle noise overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
      />

      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <TopBar currentOrg={currentOrg} />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );

  if (!currentOrg) return content;

  return (
    <WSProvider orgId={currentOrg.id}>
      {content}
    </WSProvider>
  );
}
