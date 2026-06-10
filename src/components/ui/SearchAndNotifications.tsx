import React, { useState, useEffect, useRef } from 'react';
import type { OrgNode } from '../../types';

const ORG_KEY = 'openclaw:org:nodes';

function loadNodes(): OrgNode[] {
  try {
    const r = localStorage.getItem(ORG_KEY);
    if (r) { const p = JSON.parse(r); if (Array.isArray(p) && p.length) return p; }
  } catch {}
  return [];
}

// ── Static search items ───────────────────────────────────────────────────────

const STATIC_RESULTS = [
  { type: 'Document', icon: '❏', label: 'Attorney One-Pager',      sub: 'AI Generated · 1h ago',          action: 'documents'   },
  { type: 'Skill',    icon: '⚡', label: 'Tavily Web Search',       sub: 'Installed · 4.2k installs',      action: 'capabilities'},
  { type: 'Memory',   icon: '◫', label: 'law_firm_context',        sub: 'Org scope · 4h ago',              action: 'memory'      },
  { type: 'Workflow', icon: '⟐', label: 'Legal Intake Pipeline',   sub: 'Active · Deployed Apr 22',        action: 'workflows'   },
  { type: 'Setting',  icon: '⚙', label: 'API Keys',                sub: 'Settings → Models & APIs',        action: 'settings'    },
  { type: 'View',     icon: '▦', label: 'War Room',                sub: 'AI deliberations & governance',   action: 'governance'  },
  { type: 'View',     icon: '▤', label: 'Board',                   sub: 'Proposals & voting',              action: 'dashboard'   },
  { type: 'View',     icon: '◈', label: 'Marketplace',             sub: 'AI Workforce discovery',          action: 'marketplace' },
];

const RECENT = ['Orchestrator agent', 'Legal intake pipeline', 'War Room'];

// ── Shared dark panel styles ──────────────────────────────────────────────────

const PANEL_BG: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-hover)',
  boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5)',
};

// ── Search Modal ──────────────────────────────────────────────────────────────

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onNav: (id: string) => void;
}

export function SearchModal({ open, onClose, onNav }: SearchModalProps) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ(''); setIdx(0);
      setNodes(loadNodes());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build dynamic results from org nodes
  const dynamicResults = nodes.map(n => ({
    type: n.model ? 'Agent' : 'Member',
    icon: n.model ? '◎' : '👤',
    label: n.name,
    sub: [n.title, n.model].filter(Boolean).join(' · '),
    action: n.model ? 'agents' : 'org',
  }));

  const allResults = [...dynamicResults, ...STATIC_RESULTS];

  const filtered = q.trim()
    ? allResults.filter(r =>
        r.label.toLowerCase().includes(q.toLowerCase()) ||
        r.type.toLowerCase().includes(q.toLowerCase()) ||
        r.sub.toLowerCase().includes(q.toLowerCase())
      )
    : allResults.slice(0, 7);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') { if (filtered[idx]) { onNav(filtered[idx].action); onClose(); } }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, idx, filtered]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="animate-fade-up"
        style={{ width: 560, borderRadius: 16, overflow: 'hidden', fontFamily: "'Outfit',sans-serif", ...PANEL_BG }}
      >
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 16, color: 'var(--text-muted)', lineHeight: 1 }}>⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setIdx(0); }}
            placeholder="Search agents, workflows, documents, settings…"
            style={{ flex: 1, background: 'none', border: 'none', fontSize: 14, color: 'var(--text-primary)', fontFamily: "'Outfit',sans-serif", outline: 'none' }}
          />
          <kbd style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface-raise)', borderRadius: 5, padding: '2px 7px', border: '1px solid var(--border-hover)' }}>ESC</kbd>
        </div>

        {/* Recent chips */}
        {!q && (
          <div style={{ padding: '10px 18px 6px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 7 }}>Recent</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {RECENT.map(r => (
                <button key={r} onClick={() => setQ(r)} style={{
                  background: 'var(--surface-raise)', border: '1px solid var(--border)',
                  borderRadius: 7, padding: '4px 10px', fontSize: 12,
                  color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: "'Outfit',sans-serif",
                  transition: 'border-color 0.12s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >{r}</button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div style={{ maxHeight: 340, overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No results for "{q}"</div>
          )}
          {filtered.map((r, i) => (
            <div key={i}
              onClick={() => { onNav(r.action); onClose(); }}
              onMouseEnter={() => setIdx(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '9px 18px', cursor: 'pointer',
                background: i === idx ? 'rgba(0,230,168,0.07)' : 'transparent',
                borderLeft: `2px solid ${i === idx ? 'var(--accent)' : 'transparent'}`,
                transition: 'background 0.1s',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'var(--surface-raise)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0,
              }}>{r.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.sub}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                background: 'var(--surface-raise)', border: '1px solid var(--border)',
                color: 'var(--text-muted)', whiteSpace: 'nowrap',
              }}>{r.type}</span>
              {i === idx && (
                <kbd style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface-raise)', borderRadius: 4, padding: '1px 5px', border: '1px solid var(--border)', flexShrink: 0 }}>↵</kbd>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, alignItems: 'center' }}>
          {[['↑↓', 'Navigate'], ['↵', 'Open'], ['ESC', 'Close']].map(([k, l]) => (
            <div key={k} style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <kbd style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface-raise)', borderRadius: 4, padding: '1px 5px', border: '1px solid var(--border)' }}>{k}</kbd>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{l}</span>
            </div>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}

// ── Notifications Panel ───────────────────────────────────────────────────────

const NOTIFS = [
  { id: '1', icon: '⚠️', title: 'Cron job overdue',       body: 'cost-report has not run in 3 days.',             time: '6h ago',  read: false, type: 'warning' },
  { id: '2', icon: '✓',  title: 'Pipeline deployed',      body: 'Legal Intake Flow deployed successfully.',        time: '2h ago',  read: false, type: 'success' },
  { id: '3', icon: '◎',  title: 'Agent task completed',   body: 'Orchestrator finished contract review.',          time: '2m ago',  read: false, type: 'info'    },
  { id: '4', icon: '👤', title: 'Sarah K. joined org',    body: "Sarah K. accepted your invite to Rusty's Org.",   time: '1d ago',  read: true,  type: 'info'    },
  { id: '5', icon: '💰', title: 'Daily spend update',     body: 'Spent $0.34 today (23% of daily budget).',        time: '8h ago',  read: true,  type: 'info'    },
  { id: '6', icon: '⚡', title: 'Skill update available', body: 'Tavily Web Search v2.2.0 is available.',          time: '2d ago',  read: true,  type: 'update'  },
];

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const [notifs, setNotifs] = useState(NOTIFS);
  const unread = notifs.filter(n => !n.read).length;

  const markAllRead = () => setNotifs(n => n.map(x => ({ ...x, read: true })));
  const dismiss = (id: string) => setNotifs(n => n.filter(x => x.id !== id));

  if (!open) return null;

  const typeAccent: Record<string, string> = {
    warning: 'rgba(245,158,11,0.12)',
    success: 'rgba(0,230,168,0.10)',
    info:    'var(--surface-raise)',
    update:  'rgba(59,130,246,0.10)',
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 899 }} />
      <div
        className="animate-fade-up"
        style={{
          position: 'fixed', top: 56, right: 14, width: 356,
          borderRadius: 14, zIndex: 900, overflow: 'hidden',
          fontFamily: "'Outfit',sans-serif",
          ...PANEL_BG,
        }}
      >
        {/* Header */}
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Notifications</span>
            {unread > 0 && (
              <span style={{ background: 'var(--accent)', color: '#04110d', fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 99 }}>{unread}</span>
            )}
          </div>
          <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent-dark)', fontWeight: 600, fontFamily: "'Outfit',sans-serif" }}>
            Mark all read
          </button>
        </div>

        {/* List */}
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {notifs.map((n, i) => (
            <div key={n.id}
              onClick={() => setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, read: true } : x))}
              style={{
                display: 'flex', gap: 10, padding: '11px 18px', cursor: 'pointer',
                background: n.read ? 'transparent' : 'rgba(0,230,168,0.04)',
                borderBottom: i < notifs.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.1s', alignItems: 'flex-start',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-raise)')}
              onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(0,230,168,0.04)')}
            >
              <div style={{ width: 28, height: 28, borderRadius: 8, background: typeAccent[n.type] ?? 'var(--surface-raise)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                {n.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: 'var(--text-primary)' }}>{n.title}</span>
                  {!n.read && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{n.body}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{n.time}</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: '2px', flexShrink: 0, lineHeight: 1 }}
              >✕</button>
            </div>
          ))}
          {notifs.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>🔔</div>
              All caught up
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '9px 18px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent-dark)', fontWeight: 600, fontFamily: "'Outfit',sans-serif" }}>
            View All Notifications →
          </button>
        </div>
      </div>
    </>
  );
}
