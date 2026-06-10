import React, { useEffect, useState } from 'react';
import { Search, Plus, Bell, Menu } from 'lucide-react';
import { appConfig } from '../../lib/config';
import type { GatewaySummary, ProviderId } from '../../lib/api';
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
  onConfigureProvider: (provider: ProviderId) => void;
}

function ProviderRow({ item, onAction }: { item: ProviderUsage; onAction: (provider: ProviderId) => void }) {
  const connected = item.status === 'connected';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      height: 26, padding: '0 9px',
      borderRadius: 7,
      background: 'var(--surface-sub)',
      border: '1px solid var(--border)',
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
          <div style={{ width: 46, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
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
        onClick={() => onAction(item.provider)}
        style={{
          fontSize: 9, fontWeight: 700,
          padding: '2px 8px', borderRadius: 5,
          border: `1px solid ${connected ? 'var(--border)' : 'var(--accent-mid)'}`,
          background: connected ? 'var(--surface-raise)' : 'var(--accent-soft)',
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

type ProviderConnection = {
  provider: ProviderId;
  accountLabel: string;
  connectedAt: string;
};

function loadLocalConnections(): Partial<Record<ProviderId, ProviderConnection>> {
  try {
    const raw = localStorage.getItem('openclaw:providers:connections');
    return raw ? JSON.parse(raw) as Partial<Record<ProviderId, ProviderConnection>> : {};
  } catch {
    return {};
  }
}

function persistLocalConnection(connection: ProviderConnection) {
  const next = { ...loadLocalConnections(), [connection.provider]: connection };
  localStorage.setItem('openclaw:providers:connections', JSON.stringify(next));
}

function providerLabel(provider: ProviderId) {
  return provider === 'openai' ? 'Codex / OpenAI' : 'Claude (Anthropic)';
}

function ProviderConfigModal({
  provider, onClose, onSave,
}: {
  provider: ProviderId;
  onClose: () => void;
  onSave: (connection: ProviderConnection) => void;
}) {
  const [accountLabel, setAccountLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const canSave = accountLabel.trim().length > 0 && apiKey.trim().length >= 12;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Configure ${providerLabel(provider)}`}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15,17,23,0.38)',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(100%, 420px)',
          background: 'var(--surface-raise)',
          border: '1px solid var(--border-hover)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Configure {providerLabel(provider)}</div>
          <button onClick={onClose} aria-label="Close provider configuration" style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-sub)', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
            Account Label
            <input
              value={accountLabel}
              onChange={e => setAccountLabel(e.target.value)}
              placeholder="Team account or email"
              autoFocus
              style={{ background: 'var(--surface-sub)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 11px', fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
            API Key
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
              style={{ background: 'var(--surface-sub)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 11px', fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}
            />
          </label>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45 }}>
            OAuth is not configured for this deployment. This saves a local browser connection record and uses the gateway settings page for server-side key wiring.
          </div>
        </div>
        <div style={{ padding: '13px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ background: 'var(--surface-sub)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 14px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Cancel</button>
          <button
            disabled={!canSave}
            onClick={() => {
              if (!canSave) return;
              onSave({ provider, accountLabel: accountLabel.trim(), connectedAt: new Date().toISOString() });
            }}
            style={{ background: 'linear-gradient(135deg, #00E6A8, #00C494)', border: 'none', borderRadius: 9, padding: '8px 14px', color: '#fff', cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.5, fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700 }}
          >
            Save Connection
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Header({
  onNewAgent, onSearchOpen, onNotifsToggle, onMenuToggle,
  notifsOpen, unreadCount, mobile, summary, userLabel, onConfigureProvider,
}: HeaderProps) {
  const [providers, setProviders] = useState<ProviderUsage[]>(DEFAULT_PROVIDER_USAGE);
  const [configProvider, setConfigProvider] = useState<ProviderId | null>(null);

  const mergeLocalConnections = (items: ProviderUsage[]) => {
    const local = loadLocalConnections();
    return items.map(item => {
      const connection = local[item.provider];
      if (!connection || item.status === 'connected') return item;
      return {
        ...item,
        status: 'connected' as const,
        accountLabel: connection.accountLabel,
        limitText: 'Local config',
      };
    });
  };

  useEffect(() => {
    const load = () => fetchProviderUsage().then(items => setProviders(mergeLocalConnections(items)));
    load();
    const interval = window.setInterval(load, 60000);
    return () => window.clearInterval(interval);
  }, []);

  const handleProviderAction = (provider: ProviderId) => {
    const current = providers.find(p => p.provider === provider);
    const connected = current?.status === 'connected';
    const auth = appConfig.providerAuth[provider];
    const target = connected ? auth.manageUrl : auth.connectUrl;

    if (target) {
      const url = new URL(target, window.location.origin);
      url.searchParams.set('provider', provider);
      window.location.assign(url.toString());
      return;
    }

    if (connected) {
      onConfigureProvider(provider);
      return;
    }

    setConfigProvider(provider);
  };

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
      height: 52,
      background: 'var(--sidebar-bg)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 12,
      position: 'sticky',
      top: 0,
      zIndex: 9,
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
            border: '1px solid var(--border)',
            background: 'var(--surface-sub)',
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
            <ProviderRow key={p.provider} item={p} onAction={handleProviderAction} />
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
          background: 'var(--surface-sub)',
          border: '1px solid var(--border)',
          borderRadius: 9, padding: '7px 13px',
          cursor: 'pointer', color: 'var(--text-muted)',
          fontFamily: "'Outfit', sans-serif", fontSize: 12,
          transition: 'background 0.13s, border-color 0.13s',
          width: mobile ? 130 : 210,
          textAlign: 'left',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--surface-raise)';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--surface-sub)';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
        }}
      >
        <Search size={13} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>Search...</span>
        {!mobile && (
          <kbd style={{ fontSize: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '1px 5px', border: '1px solid var(--border)', lineHeight: 1.6, color: 'var(--text-muted)' }}>
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
              background: 'var(--surface-sub)',
              border: '1px solid var(--border)',
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
          background: notifsOpen ? 'var(--accent-soft)' : 'var(--surface-sub)',
          border: `1px solid ${notifsOpen ? 'rgba(0,230,168,0.28)' : 'var(--border)'}`,
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
            border: '1.5px solid var(--sidebar-bg)',
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

      {configProvider && (
        <ProviderConfigModal
          provider={configProvider}
          onClose={() => setConfigProvider(null)}
          onSave={(connection) => {
            persistLocalConnection(connection);
            setProviders(items => mergeLocalConnections(items));
            setConfigProvider(null);
            onConfigureProvider(connection.provider);
          }}
        />
      )}
    </header>
  );
}
