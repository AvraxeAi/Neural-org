import React, { useEffect, useState } from 'react';
import { Circle, ChevronRight, ChevronLeft, Workflow, Building2, Activity,
         Zap, Users } from 'lucide-react';
import type { GatewaySummary } from '../../lib/api';
import type { OrgNode } from '../../types';

const ORG_STORAGE_KEY = 'openclaw:org:nodes';

const DEFAULT_NODES: OrgNode[] = [
  { id: 'rusty',  name: 'Rusty',  title: 'Chairman',      model: null,                agentName: null,          provider: null,        initial: 'R', color: '#00E6A8', status: 'online',  parentId: null,    permissionType: 'owner'  },
  { id: 'cash',   name: 'Cash',   title: 'CEO',            model: 'claude-sonnet-4-6', agentName: 'openclaw-cash',    provider: 'anthropic', initial: 'C', color: '#3B82F6', status: 'online',  parentId: 'rusty', permissionType: 'admin'  },
  { id: 'lisa',   name: 'Lisa',   title: 'CMO',            model: 'claude-sonnet-4-6', agentName: 'hermes-lisa', provider: 'anthropic', initial: 'L', color: '#8B5CF6', status: 'online',  parentId: 'cash',  permissionType: 'admin'  },
  { id: 'freida', name: 'Freida', title: 'Research Lead',  model: 'claude-sonnet-4-6', agentName: null,          provider: 'anthropic', initial: 'F', color: '#F59E0B', status: 'busy',    parentId: 'cash',  permissionType: 'member' },
  { id: 'hughes', name: 'Hughes', title: 'Engineer',       model: 'deepseek-r1-0528',  agentName: null,          provider: 'local',     initial: 'H', color: '#EC4899', status: 'offline', parentId: 'cash',  permissionType: 'member' },
  { id: 'titan',  name: 'Titan',  title: 'ICF Specialist', model: 'claude-opus-4-8',   agentName: 'openclaw-cash',    provider: 'anthropic', initial: 'T', color: '#14B8A6', status: 'online',  parentId: 'cash',  permissionType: 'member' },
];

function loadNodes(): OrgNode[] {
  try {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p) && p.length > 0) return p;
    }
  } catch {}
  return DEFAULT_NODES;
}

const STATUS_DOT_COLOR: Record<string, string> = {
  online:  'var(--status-green)',
  active:  'var(--accent)',
  busy:    'var(--status-amber)',
  offline: '#3a3a3a',
};

const WORKFLOWS = [
  { name: 'Legal Intake Pipeline', progress: 72, color: '#00E6A8' },
  { name: 'SEO Content Generator', progress: 45, color: '#3B82F6' },
  { name: 'Contract Summarizer',   progress: 91, color: '#8B5CF6' },
];

const ACTIVE_ORGS = [
  { name: 'AvraxeAi',        initials: 'A', color: 'linear-gradient(135deg,#3b82f6,#00E6A8)', members: 6,  agents: 5  },
  { name: 'Neural Ops',      initials: 'N', color: 'linear-gradient(135deg,#00E6A8,#10b981)', members: 4,  agents: 12 },
  { name: 'My Construction', initials: 'C', color: 'linear-gradient(135deg,#f59e0b,#f97316)', members: 3,  agents: 2  },
];

interface ActivityPanelProps {
  summary: GatewaySummary;
  onNav: (id: string) => void;
  mobile?: boolean;
}

const PANEL_W = 256;

export default function ActivityPanel({ summary, onNav, mobile }: ActivityPanelProps) {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('openclaw:activity-panel') !== 'closed'; } catch { return true; }
  });
  const [nodes, setNodes] = useState<OrgNode[]>([]);

  useEffect(() => { setNodes(loadNodes()); }, []);

  const toggle = () => setOpen(v => {
    const next = !v;
    try { localStorage.setItem('openclaw:activity-panel', next ? 'open' : 'closed'); } catch {}
    return next;
  });

  if (mobile) return null;

  const online  = nodes.filter(n => n.status === 'online' || n.status === ('active' as any));
  const busy    = nodes.filter(n => n.status === 'busy');
  const offline = nodes.filter(n => n.status === 'offline');

  // Wrapper is position:relative and does NOT clip — toggle tab lives here so it's
  // always visible even when the inner panel collapses to width:0.
  return (
    <div style={{
      position: 'relative',
      flexShrink: 0,
      height: '100vh',
    }}>

      {/* Toggle tab — outside the overflow:hidden panel so it stays visible when collapsed */}
      <button
        onClick={toggle}
        aria-label={open ? 'Collapse activity panel' : 'Expand activity panel'}
        style={{
          position: 'absolute',
          left: -20,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 20,
          width: 20,
          height: 48,
          borderRadius: '6px 0 0 6px',
          background: 'var(--surface-raise)',
          border: '1px solid var(--border)',
          borderRight: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
      >
        {open ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>

      {/* Collapsing panel */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderLeft: '1px solid var(--border)',
        background: 'var(--sidebar-bg)',
        transition: 'width 0.22s cubic-bezier(0.16,1,0.3,1)',
        width: open ? PANEL_W : 0,
        overflow: 'hidden',
      }}>

      {/* Panel content */}
      <div style={{
        width: PANEL_W,
        overflowY: 'auto',
        overflowX: 'hidden',
        height: '100%',
        padding: '16px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={13} color="var(--accent)" />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Live Activity
          </span>
          {summary.ok && (
            <span style={{
              marginLeft: 'auto', fontSize: 9, fontWeight: 700,
              color: 'var(--status-green)', background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.2)',
              padding: '2px 6px', borderRadius: 99, letterSpacing: '0.05em',
            }}>LIVE</span>
          )}
        </div>

        {/* Online Now */}
        <section>
          <SectionHead icon={<Users size={11} />} label="Online Now" count={online.length + busy.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {[...online, ...busy, ...offline].map(n => (
              <AgentRow key={n.id} node={n} />
            ))}
          </div>
        </section>

        {/* Running Workflows */}
        <section>
          <SectionHead icon={<Workflow size={11} />} label="Workflows" count={WORKFLOWS.length} onAction={() => onNav('workflows')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {WORKFLOWS.map(w => (
              <WorkflowRow key={w.name} name={w.name} progress={w.progress} color={w.color} />
            ))}
          </div>
        </section>

        {/* Active Orgs */}
        <section>
          <SectionHead icon={<Building2 size={11} />} label="Organizations" count={ACTIVE_ORGS.length} onAction={() => onNav('org')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {ACTIVE_ORGS.map(o => (
              <OrgRow key={o.name} org={o} />
            ))}
          </div>
        </section>

        {/* Gateway pulse */}
        <section style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Circle
              size={6}
              fill={summary.ok ? 'var(--status-green)' : 'var(--status-amber)'}
              color={summary.ok ? 'var(--status-green)' : 'var(--status-amber)'}
            />
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
              {summary.ok ? summary.environment : 'Gateway offline'}
            </span>
            {summary.ok && summary.latencyMs != null && (
              <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                {summary.latencyMs}ms
              </span>
            )}
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHead({ icon, label, count, onAction }: {
  icon: React.ReactNode; label: string; count: number; onAction?: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span style={{
        marginLeft: 4, fontSize: 9, fontWeight: 700, color: 'var(--text-muted)',
        background: 'var(--surface-raise)', border: '1px solid var(--border)',
        padding: '1px 5px', borderRadius: 99,
      }}>{count}</span>
      {onAction && (
        <button onClick={onAction} style={{
          marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
          padding: 0,
        }}>
          <ChevronRight size={11} />
        </button>
      )}
    </div>
  );
}

function AgentRow({ node }: { node: OrgNode }) {
  const dotColor = STATUS_DOT_COLOR[node.status] ?? '#3a3a3a';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
        background: `${node.color}18`, border: `1px solid ${node.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 800, color: node.color,
      }}>{node.initial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: node.status === 'offline' ? 'var(--text-muted)' : 'var(--text-primary)', lineHeight: 1 }}>
          {node.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{node.title}</div>
      </div>
      <Circle size={6} fill={dotColor} color={dotColor} />
    </div>
  );
}

function WorkflowRow({ name, progress, color }: { name: string; progress: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <span style={{ fontSize: 10, color, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{progress}%</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: color, borderRadius: 99, transition: 'width 0.6s' }} />
      </div>
    </div>
  );
}

function OrgRow({ org }: { org: typeof ACTIVE_ORGS[number] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
        background: org.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 800, color: '#fff',
      }}>{org.initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, display: 'flex', gap: 6 }}>
          <span>{org.members} humans</span>
          <span style={{ color: 'var(--accent)' }}>{org.agents} AI</span>
        </div>
      </div>
    </div>
  );
}
