import React, { useEffect, useState } from 'react';
import { Search, Plus, Bell, Menu } from 'lucide-react';
import type { GatewaySummary } from '../../lib/api';
import { fetchProviderUsage, DEFAULT_PROVIDER_USAGE, type ProviderUsage } from '../../lib/api';

interface HeaderProps {
  active?: string;
  onNewAgent: () => void;
  onSearchOpen: () => void;
  onNotifsToggle: () => void;
  onMenuToggle: () => void;
  notifsOpen: boolean;
  unreadCount: number;
  mobile: boolean;
  summary: GatewaySummary;
  userLabel: string;
}

function ProviderRow({ item }: { item: ProviderUsage }) {
  const connected = item.status === 'connected';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      height: 26, padding: '0 9px',
      borderRadius: 7,
      background: 'rgba(255,255,255,0.65)',
      border: '1px solid rgba(0,0,0,0.055)',
    }}>
      <span className={`status-dot ${connected ? 'online' : 'offline'}`} />

      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', minWidth: 50, whiteSpace: 'nowrap' }}>
        {item.displayName}
      </span>

      {connected && item.accountLabel ? (
        <span style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.accountLabel}
        </span>
      ) : (
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Not connected</span>
      )}

      {connected && item.usedPercent != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <div style={{ width: 46, height: 3, borderRadius: 99, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${Math.min(item.usedPercent, 100)}%`,
              background: item.usedPercent > 80
                ? 'var(--status-amber)'
                : 'var(--accent)',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>
            {item.usedPercent}%
          </span>
        </div>
      )}

      {connected && item.limitText && (
        <span style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {item.limitText}
        </span>
      )}

      <button
        style={{
          fontSize: 9, fontWeight: 700,
          padding: '2px 8px', borderRadius: 5,
          border: `1px solid ${connected ? 'rgba(0,0,0,0.07)' : 'var(--accent-mid)'}`,
          background: connected ? 'rgba(255,255,255,0.5)' : 'var(--accent-soft)',
          color: connected ? 'var(--text-secondary)' : 'var(--accent-dark)',
          cursor: 'pointer',
          fontFamily: "'Outfit', sans-serif",
          whiteSpace: 'nowrap',
          flexShrink: 0,
          transition: 'background 0.13s',
        }}
      >
        {connected ? 'Manage' : 'Connect'}
      </button>
    </div>
  );
}

export default function Header({
  onNewAgent, onSearchOpen, onNotifsToggle, onMenuToggle,
  notifsOpen, unreadCount, mobile, summary, userLabel,
}: HeaderProps) {
  const [providers, setProviders] = useState<ProviderUsage[]>(DEFAULT_PROVIDER_USAGE);

  useEffect(() => {
    fetchProviderUsage().then(setProviders);
    const interval = window.setInterval(() => fetchProviderUsage().then(setProviders), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const userInitial = (userLabel.charAt(0) || 'U').toUpperCase();

  const metrics = [
    {
      label: 'Latency',
      val: summary.latencyMs != null ? `${summary.latencyMs}ms` : '—',
      color: summary.ok ? 'var(--status-green)' : 'var(--text-muted)',
    },
    {
      label: 'Threads',
      val: summary.activeThreads != null ? `${summary.activeThreads}` : '—',
      color: 'var(--text-secondary)',
    },
    {
      label: 'Agents',
      val: summary.activeAgents != null ? `${summary.activeAgents}` : '—',
      color: 'var(--accent-dark)',
    },
  ];

  return (
    <header style={{
      height: 64,
      background: 'rgba(248,249,252,0.94)',
      backdropFilter: 'blur(16px) saturate(160%)',
      WebkitBackdropFilter: 'blur(16px) saturate(160%)',
      borderBottom: '1px solid rgba(0,0,0,0.055)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 12,
      position: 'sticky',
      top: 0,
      zIndex: 9,
      boxShadow: '0 1px 0 rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.025)',
      flexShrink: 0,
    }}>

      {/* Mobile menu toggle */}
      {mobile && (
        <button
          onClick={onMenuToggle}
          aria-label="Open navigation"
          style={{
            width: 34, height: 34,
            borderRadius: 9,
            border: '1px solid rgba(0,0,0,0.07)',
            background: 'rgba(255,255,255,0.72)',
            cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <Menu size={16} />
        </button>
      )}

      {/* Provider status module — desktop only */}
      {!mobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
          {providers.map(p => (
            <ProviderRow key={p.provider} item={p} />
          ))}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Search */}
      <button
        onClick={onSearchOpen}
        aria-label="Search (Ctrl+K)"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.72)',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: 9, padding: '7px 13px',
          cursor: 'pointer', color: 'var(--text-muted)',
          fontFamily: "'Outfit', sans-serif", fontSize: 12,
          transition: 'background 0.13s, border-color 0.13s',
          width: mobile ? 130 : 210,
          textAlign: 'left',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.92)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.1)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.72)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.07)';
        }}
      >
        <Search size={13} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>Search...</span>
        {!mobile && (
          <kbd style={{ fontSize: 10, background: 'rgba(0,0,0,0.055)', borderRadius: 4, padding: '1px 5px', border: '1px solid rgba(0,0,0,0.09)', lineHeight: 1.6 }}>
            ⌘K
          </kbd>
        )}
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Metric pills — desktop only */}
      {!mobile && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          {metrics.map(m => (
            <div key={m.label} style={{
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 7, padding: '3px 9px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <span style={{ fontSize: 8, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{m.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: m.color, fontFamily: 'DM Mono, monospace', lineHeight: 1.3 }}>{m.val}</span>
            </div>
          ))}
        </div>
      )}

      {/* New Agent CTA */}
      {!mobile && (
        <button
          onClick={onNewAgent}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'linear-gradient(135deg, #00E6A8, #00C494)',
            border: 'none', borderRadius: 9, padding: '7px 13px',
            color: '#fff', fontFamily: "'Outfit', sans-serif",
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 3px 10px rgba(0,230,168,0.28)',
            transition: 'box-shadow 0.15s, transform 0.15s',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 5px 18px rgba(0,230,168,0.38)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 3px 10px rgba(0,230,168,0.28)';
            (e.currentTarget as HTMLElement).style.transform = '';
          }}
        >
          <Plus size={13} />
          New Agent
        </button>
      )}

      {/* Notifications */}
      <button
        onClick={onNotifsToggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        style={{
          width: 34, height: 34, borderRadius: 9,
          background: notifsOpen ? 'rgba(0,230,168,0.1)' : 'rgba(255,255,255,0.7)',
          border: `1px solid ${notifsOpen ? 'rgba(0,230,168,0.28)' : 'rgba(0,0,0,0.07)'}`,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'all 0.15s',
          color: notifsOpen ? 'var(--accent-dark)' : 'var(--text-secondary)',
          flexShrink: 0,
        }}
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 5, right: 5,
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--status-amber)',
            border: '1.5px solid white',
          }} />
        )}
      </button>

      {/* User avatar */}
      <button
        title={userLabel}
        aria-label={`User: ${userLabel}`}
        style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'linear-gradient(135deg, #00E6A8, #3B82F6)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        }}
      >
        {userInitial}
      </button>
    </header>
  );
}
