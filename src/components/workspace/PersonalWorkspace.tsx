import React, { useEffect, useState } from 'react';
import type { OrgNode } from '../../types';

// Personal workspace = private layer separate from shared orgs
// Each user has their own personal workspace that coexists with org membership

const ORG_KEY = 'openclaw:org:nodes';

const DEFAULT_NODES: OrgNode[] = [
  { id: 'rusty',  name: 'Rusty',  title: 'Chairman',      model: null,                agentName: null,          provider: null,        initial: 'R', color: '#00E6A8', status: 'online',  parentId: null,    permissionType: 'owner' },
  { id: 'cash',   name: 'Cash',   title: 'CEO',           model: 'claude-sonnet-4-6', agentName: 'openclaw-cash',    provider: 'anthropic', initial: 'C', color: '#3B82F6', status: 'online',  parentId: 'rusty', permissionType: 'admin' },
  { id: 'lisa',   name: 'Lisa',   title: 'CMO',           model: 'claude-sonnet-4-6', agentName: 'hermes-lisa', provider: 'anthropic', initial: 'L', color: '#8B5CF6', status: 'online',  parentId: 'cash',  permissionType: 'admin' },
  { id: 'freida', name: 'Freida', title: 'Research Lead', model: 'claude-sonnet-4-6', agentName: null,          provider: 'anthropic', initial: 'F', color: '#F59E0B', status: 'busy',    parentId: 'cash',  permissionType: 'member' },
  { id: 'hughes', name: 'Hughes', title: 'Engineer',      model: 'deepseek-r1-0528',  agentName: null,          provider: 'local',     initial: 'H', color: '#EC4899', status: 'offline', parentId: 'cash',  permissionType: 'member' },
  { id: 'titan',  name: 'Titan',  title: 'ICF Specialist',model: 'claude-opus-4-8',   agentName: 'openclaw-cash',    provider: 'anthropic', initial: 'T', color: '#14B8A6', status: 'online',  parentId: 'cash',  permissionType: 'member' },
];

function loadNodes(): OrgNode[] {
  try {
    const raw = localStorage.getItem(ORG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_NODES;
}

const STATUS_COLORS: Record<string, string> = {
  online: 'var(--status-green)',
  active: 'var(--accent)',
  busy: 'var(--status-amber)',
  offline: 'var(--text-muted)',
};

const SHARED_ORGS = [
  { name: "Rusty's Org",   handle: '@rustyadj',   role: 'Owner', members: 4,  agents: ['Orchestrator','LawAssist'],  color: '#00E6A8' },
  { name: 'Legal Network', handle: '@legalnet',   role: 'Member', members: 12, agents: ['Orchestrator'],             color: '#3B82F6' },
];

const PRIVATE_PROJECTS = [
  { title: 'AvraxeAi Product Roadmap', status: 'Active',  tasks: 8, updated: '1h ago'  },
  { title: 'Attorney Pitch Deck',      status: 'Active',  tasks: 3, updated: '2d ago'  },
  { title: 'Personal Finance Tracker', status: 'Paused',  tasks: 5, updated: '1w ago'  },
];

const PERSONAL_MEMORY = [
  { key: 'personal_goals',    preview: '{ q2_goal: first paying attorney, by: May 31 }' },
  { key: 'daily_brief_prefs', preview: '{ time: 8am, format: bullet, max: 5_items }' },
  { key: 'voice_settings',    preview: '{ wake_word: hey claw, voice: elevenlabs/adam }' },
];

type Tab = 'overview' | 'agents' | 'orgs' | 'projects' | 'memory';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'overview',  label: 'Overview',        icon: '⊞' },
  { id: 'agents',    label: 'My AI Workforce', icon: '◎' },
  { id: 'orgs',      label: 'My Organizations',icon: '⬡' },
  { id: 'projects',  label: 'Private Projects', icon: '◳' },
  { id: 'memory',    label: 'Personal Memory', icon: '◫' },
];

export default function PersonalWorkspace() {
  const [tab, setTab] = useState<Tab>('overview');
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const agents = nodes.filter(n => n.model);
  const onlineCount = nodes.filter(n => n.status === 'online' || n.status === ('active' as any)).length;

  useEffect(() => {
    setNodes(loadNodes());
  }, []);

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg,#00E6A8,#3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff', boxShadow: '0 4px 14px rgba(0,230,168,0.35)' }}>R</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' }}>Rusty's Personal Workspace</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Private · {agents.length} AI agents · 2 organizations · GCP-US-CENTRAL</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <span className="tag tag-accent">Personal</span>
          <span className="tag tag-green" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span className="status-dot online" style={{ width: 5, height: 5 }} />Online</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, padding: '4px', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 12, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, border: 'none', background: tab === t.id ? 'var(--surface-hover)' : 'transparent', color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s', boxShadow: 'none' }}>
            <span style={{ fontSize: 13 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fade-in">

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { label: 'Agents',          val: agents.length.toString(), icon: '◎', color: '#00E6A8' },
                { label: 'Online',          val: onlineCount.toString(),    icon: '◳', color: '#8B5CF6' },
                { label: 'Organizations',   val: '2',                      icon: '⬡', color: '#3B82F6' },
                { label: 'Memory Entries',  val: '1,847',                  icon: '◫', color: '#F59E0B' },
              ].map(s => (
                <div key={s.label} className="glass-card" style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* My agents preview */}
              <div className="glass-card" style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>My AI Workforce</div>
                {agents.map(a => (
                  <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: `${a.color}18`, border: `1.5px solid ${a.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: a.color, flexShrink: 0 }}>{a.initial}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{a.title} · {a.model}</div>
                    </div>
                    <span className={`status-dot ${a.status}`} style={{ background: STATUS_COLORS[a.status] ?? 'var(--text-muted)' }} />
                  </div>
                ))}
                {agents.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No AI agents found.</div>}
              </div>

              {/* Org memberships */}
              <div className="glass-card" style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Organization Memberships</div>
                {SHARED_ORGS.map(o => (
                  <div key={o.name} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: `${o.color}18`, border: `1.5px solid ${o.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: o.color, flexShrink: 0 }}>{o.name.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{o.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{o.handle} · {o.members} members</div>
                      <div style={{ fontSize: 10, color: 'var(--accent-dark)', marginTop: 3 }}>Agents shared: {o.agents.join(', ')}</div>
                    </div>
                    <span className={`tag tag-${o.role === 'Owner' ? 'accent' : 'blue'}`}>{o.role}</span>
                  </div>
                ))}
                <button style={{ width: '100%', marginTop: 10, background: 'transparent', border: '1.5px dashed var(--border)', borderRadius: 9, padding: '9px', color: 'var(--text-muted)', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Join or Create Org</button>
              </div>
            </div>
          </div>
        )}

        {/* ── My AI Workforce ── */}
        {tab === 'agents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 14px', background: 'rgba(0,230,168,0.06)', border: '1px solid rgba(0,230,168,0.15)', borderRadius: 10 }}>
              💡 Your personal AI workforce is private to you. You can selectively bring agents into shared organizations.
            </div>
            {agents.map(a => (
              <div key={a.id} className="glass-card" style={{ padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: `${a.color}18`, border: `1.5px solid ${a.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: a.color, flexShrink: 0 }}>{a.initial}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{a.name}</span>
                    <span className={`status-dot ${a.status}`} style={{ background: STATUS_COLORS[a.status] ?? 'var(--text-muted)' }} />
                    <span className={`tag tag-${a.status === 'busy' ? 'amber' : 'green'}`}>{a.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono,monospace', marginBottom: 6 }}>{a.model}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.title}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Shared with:</div>
                  {SHARED_ORGS.filter(o => o.agents.includes(a.name)).map(o => (
                    <span key={o.name} className="tag tag-blue" style={{ fontSize: 10 }}>⬡ {o.name}</span>
                  ))}
                  {SHARED_ORGS.filter(o => o.agents.includes(a.name)).length === 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Private only</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button style={{ background: `${a.color}15`, border: `1px solid ${a.color}35`, borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, color: a.color, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>Chat</button>
                  <button style={{ background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>Configure</button>
                </div>
              </div>
            ))}
            {agents.length === 0 && <div className="glass-card" style={{ padding: '18px 20px', color: 'var(--text-muted)', fontSize: 13 }}>No AI agents found.</div>}
          </div>
        )}

        {/* ── Organizations ── */}
        {tab === 'orgs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 14px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10 }}>
              💡 When you join an org, you choose which personal agents to bring. Those agents can then collaborate with other members' agents.
            </div>
            {SHARED_ORGS.map(o => (
              <div key={o.name} className="glass-card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, background: `${o.color}18`, border: `1.5px solid ${o.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: o.color, flexShrink: 0 }}>{o.name.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{o.name}</span>
                      <span className={`tag tag-${o.role === 'Owner' ? 'accent' : 'blue'}`}>{o.role}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono,monospace', marginBottom: 8 }}>{o.handle} · {o.members} members</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Agents you've brought in:</div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {o.agents.map(ag => {
                        const agentData = agents.find(a => a.name === ag || a.agentName === ag);
                        return <span key={ag} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, background: `${agentData?.color ?? '#888'}15`, border: `1px solid ${agentData?.color ?? '#888'}30`, borderRadius: 7, padding: '3px 8px', color: agentData?.color ?? 'var(--text-secondary)', fontWeight: 600 }}>{agentData?.initial ?? '◎'} {ag}</span>;
                      })}
                      <button style={{ fontSize: 11, background: 'transparent', border: '1.5px dashed rgba(0,0,0,0.12)', borderRadius: 7, padding: '3px 8px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>+ Add Agent</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ background: 'linear-gradient(135deg,#00E6A8,#00C494)', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", boxShadow: '0 3px 10px rgba(0,230,168,0.3)' }}>Open Org →</button>
                  </div>
                </div>
              </div>
            ))}
            <button style={{ background: 'var(--surface-raise)', border: '1.5px dashed var(--border)', borderRadius: 12, padding: '18px', textAlign: 'center', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', transition: 'all 0.15s' }}>
              + Create or Join Organization
            </button>
          </div>
        )}

        {/* ── Private Projects ── */}
        {tab === 'projects' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button style={{ background: 'linear-gradient(135deg,#00E6A8,#00C494)', border: 'none', borderRadius: 9, padding: '8px 16px', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,230,168,0.3)' }}>+ Private Project</button>
            </div>
            {PRIVATE_PROJECTS.map(p => (
              <div key={p.title} className="glass-card" style={{ padding: '16px 20px', display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--border)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🔒</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.tasks} tasks · Updated {p.updated}</div>
                </div>
                <span className={`tag tag-${p.status === 'Active' ? 'green' : 'gray'}`}>{p.status}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>›</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Personal Memory ── */}
        {tab === 'memory' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '10px 14px', background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 10 }}>
              🔒 Personal memory is private to you and never shared with organizations unless you explicitly export it.
            </div>
            {PERSONAL_MEMORY.map(m => (
              <div key={m.key} className="glass-card" style={{ padding: '14px 18px', cursor: 'pointer' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{m.key}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono,monospace' }}>{m.preview}</div>
              </div>
            ))}
            <button style={{ background: 'linear-gradient(135deg,#00E6A8,#00C494)', border: 'none', borderRadius: 9, padding: '10px', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,230,168,0.3)', alignSelf: 'flex-start', paddingLeft: 20, paddingRight: 20 }}>+ Add Memory Entry</button>
          </div>
        )}

      </div>
    </div>
  );
}
