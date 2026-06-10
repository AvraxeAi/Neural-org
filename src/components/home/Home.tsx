import React, { useEffect, useState } from 'react';
import {
  MessageSquare, Building2, Workflow, ArrowRight,
  Bell, CheckSquare, Activity, Zap, TrendingUp,
  Bot, Play, Star, ExternalLink,
} from 'lucide-react';
import type { GatewaySummary } from '../../lib/api';
import { orgTasksApi } from '../../lib/api';
import type { OrgNode, BoardProposal } from '../../types';

interface HomeProps {
  onNav: (id: string) => void;
  currentUserName?: string;
  summary?: GatewaySummary;
}

// ── Storage keys (must match sibling components) ─────────────────────────────

const ORG_KEY   = 'openclaw:org:nodes';
const BOARD_KEY = 'avraxeai:board';

const DEFAULT_NODES: OrgNode[] = [
  { id: 'rusty',  name: 'Rusty',  title: 'Chairman',         model: null,                agentName: null,          provider: null,        initial: 'R', color: '#00E6A8', status: 'online',  parentId: null,    permissionType: 'owner'  },
  { id: 'cash',   name: 'Cash',   title: 'CEO',               model: 'claude-sonnet-4-6', agentName: 'openclaw-cash',    provider: 'anthropic', initial: 'C', color: '#3B82F6', status: 'online',  parentId: 'rusty', permissionType: 'admin'  },
  { id: 'lisa',   name: 'Lisa',   title: 'CMO',               model: 'claude-sonnet-4-6', agentName: 'hermes-lisa', provider: 'anthropic', initial: 'L', color: '#8B5CF6', status: 'online',  parentId: 'cash',  permissionType: 'admin'  },
  { id: 'freida', name: 'Freida', title: 'Research Lead',     model: 'claude-sonnet-4-6', agentName: null,          provider: 'anthropic', initial: 'F', color: '#F59E0B', status: 'busy',    parentId: 'cash',  permissionType: 'member' },
  { id: 'hughes', name: 'Hughes', title: 'Engineer',          model: 'deepseek-r1-0528',  agentName: null,          provider: 'local',     initial: 'H', color: '#EC4899', status: 'offline', parentId: 'cash',  permissionType: 'member' },
  { id: 'titan',  name: 'Titan',  title: 'ICF Specialist',    model: 'claude-opus-4-8',   agentName: 'openclaw-cash',    provider: 'anthropic', initial: 'T', color: '#14B8A6', status: 'online',  parentId: 'cash',  permissionType: 'member' },
];

function loadNodes(): OrgNode[] {
  try {
    const r = localStorage.getItem(ORG_KEY);
    if (r) { const p = JSON.parse(r); if (Array.isArray(p) && p.length) return p; }
  } catch {}
  return DEFAULT_NODES;
}

function loadProposals(): BoardProposal[] {
  try {
    const r = localStorage.getItem(BOARD_KEY);
    if (r) {
      const parsed = JSON.parse(r);
      const arr = Array.isArray(parsed) ? parsed : parsed?.proposals;
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  return [];
}

// ── Fallback static data (when no real data available) ───────────────────────

const FALLBACK_CHATS = [
  { id: '1', title: 'Contract Review Automation',  preview: 'I need to review these 12 intake forms...', time: '9 min ago',  unread: 2, color: '#00E6A8' },
  { id: '2', title: 'AvraxeAi Marketing Strategy', preview: "Here's the competitive analysis for Q3...",  time: '2h ago',    unread: 0, color: '#8b5cf6' },
  { id: '3', title: 'AvraxeAi Dev Planning',        preview: 'Sprint 4 scope confirmed...',               time: '4h ago',    unread: 0, color: '#3b82f6' },
  { id: '4', title: 'Construction Bid Analysis',    preview: 'Reviewed all 3 bids. Apex at $340k...',     time: 'Yesterday', unread: 0, color: '#f59e0b' },
];

const FALLBACK_ACTIVITY = [
  { id: '1', agent: 'Orchestrator', action: 'Completed contract review — 3 risk flags',            tag: 'Task',      tagColor: '#00E6A8', time: '2m ago'  },
  { id: '2', agent: 'DataAgent',    action: 'Web search — 18 competitor pricing pages indexed',     tag: 'Research',  tagColor: '#3b82f6', time: '11m ago' },
  { id: '3', agent: 'LawAssist',    action: 'Draft NDA generated for AvraxeAi Labs',               tag: 'Document',  tagColor: '#8b5cf6', time: '34m ago' },
  { id: '4', agent: 'Orchestrator', action: 'Memory vault compacted — 512 entries',                tag: 'Memory',    tagColor: '#10b981', time: '1h ago'  },
  { id: '5', agent: 'DataAgent',    action: 'Financial report analysis — Q2 summary ready',        tag: 'Analytics', tagColor: '#f59e0b', time: '2h ago'  },
];

const RUNNING_WORKFLOWS = [
  { name: 'Legal Intake Pipeline', progress: 72, color: '#00E6A8' },
  { name: 'SEO Content Generator', progress: 45, color: '#3b82f6' },
];

const PRIORITY_COLOR: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#6b7280',
};

const GREETING_BY_HOUR = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {title}
      </span>
      {action && (
        <button onClick={onAction} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 11,
          color: 'var(--accent-dark)', fontWeight: 600, display: 'flex', alignItems: 'center',
          gap: 3, fontFamily: "'Outfit', sans-serif", padding: 0,
        }}>
          {action} <ArrowRight size={11} />
        </button>
      )}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '16px 18px', ...style,
    }}>
      {children}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Home({ onNav, currentUserName = 'Rusty', summary }: HomeProps) {
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [proposals, setProposals] = useState<BoardProposal[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskDone, setTaskDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    setNodes(loadNodes());
    setProposals(loadProposals());
  }, []);

  useEffect(() => {
    orgTasksApi.list()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTasks(data.slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

  // Derive live data from real sources
  const agents     = nodes.filter(n => n.model);
  const onlineCount = nodes.filter(n => ['online', 'active'].includes(n.status)).length;
  const busyCount  = nodes.filter(n => n.status === 'busy').length;

  const live = summary?.ok && summary.source === 'live';

  const stats = [
    {
      label: 'Active Agents',
      val:   live && summary?.activeAgents != null ? String(summary.activeAgents) : String(onlineCount),
      sub:   `${busyCount} busy`,
      icon:  Bot, color: '#00E6A8',
    },
    {
      label: 'Organizations',
      val:   '4',
      sub:   '2 active',
      icon:  Building2, color: '#3b82f6',
    },
    {
      label: 'Running Flows',
      val:   live && summary?.activeThreads != null ? String(summary.activeThreads) : '2',
      sub:   'on schedule',
      icon:  Workflow, color: '#8b5cf6',
    },
    {
      label: "Today's Tasks",
      val:   tasks.length > 0 ? String(tasks.filter(t => t.status !== 'done').length) : '3',
      sub:   `${taskDone.size} completed`,
      icon:  CheckSquare, color: '#f59e0b',
    },
  ];

  // Derive orgs from org nodes: group by parentId=null nodes as org roots, use default if empty
  const orgList = nodes.length > 0
    ? [
        { id: '1', name: 'AvraxeAi',            role: 'Owner',   members: nodes.length, agents: agents.length, active: true,  color: 'linear-gradient(135deg,#3b82f6,#00E6A8)', initials: 'A' },
        { id: '2', name: 'AvraxeAi Labs',         role: 'Founder', members: 6, agents: 15,             active: true,  color: 'linear-gradient(135deg,#00E6A8,#10b981)', initials: 'O' },
        { id: '3', name: 'My Construction Co.',   role: 'Owner',   members: 4, agents: 3,              active: false, color: 'linear-gradient(135deg,#f59e0b,#f97316)', initials: 'C' },
        { id: '4', name: 'My Marketing Agency',   role: 'Owner',   members: 3, agents: 6,              active: false, color: 'linear-gradient(135deg,#8b5cf6,#ec4899)', initials: 'M' },
      ]
    : [];

  // Derive board activity from real proposals
  const boardActivity = proposals.length > 0
    ? proposals.slice(0, 3).map(p => ({
        text: p.title,
        org: (p as any).by ?? 'AvraxeAi',
        time: (p as any).time ?? 'Recent',
        status: ((p.status ?? 'open') as string).toLowerCase(),
      }))
    : [
        { text: 'Sprint 4 board updated',          org: 'AvraxeAi Labs', time: '1h ago',  status: 'open' },
        { text: 'New proposal: Expand Dev Team',    org: 'AvraxeAi',      time: '3h ago',  status: 'open' },
        { text: 'Vote closed: Q3 Budget approved',  org: 'AvraxeAi',      time: '5h ago',  status: 'passed' },
      ];

  const liveAgents = agents.filter(n => n.status !== 'offline').slice(0, 3);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const displayTasks = tasks.length > 0
    ? tasks.slice(0, 4)
    : [
        { id: 't1', title: 'Review Patricia Cruz demo intake forms', due: 'Today, 2pm',  priority: 'high',   status: 'active' },
        { id: 't2', title: 'Respond to James Holloway follow-up',    due: 'Today, 5pm',  priority: 'medium', status: 'active' },
        { id: 't3', title: 'Sign off on Sprint 4 scope',             due: 'Tomorrow',    priority: 'medium', status: 'active' },
        { id: 't4', title: 'Review AvraxeAi Q3 marketing brief',     due: 'Jun 6',       priority: 'low',    status: 'done'   },
      ];

  const statusBadgeColor: Record<string, string> = {
    open: '#3b82f6', draft: '#6b7280', voting: '#8b5cf6',
    passed: '#10b981', failed: '#ef4444', discussion: '#f59e0b',
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Center content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 32px', minWidth: 0 }}>

        {/* Greeting */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.6px', lineHeight: 1.2 }}>
                {GREETING_BY_HOUR()}, {currentUserName}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                {today} · {onlineCount} agents online
                {live && summary?.dailyCostUsd != null ? ` · $${summary.dailyCostUsd.toFixed(2)} spent today` : ''}
              </p>
            </div>
            <button onClick={() => onNav('chat')} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 9,
              background: 'var(--accent)', border: 'none',
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
              fontSize: 13, fontWeight: 600, color: '#0a0a0a',
              boxShadow: '0 4px 14px rgba(0,230,168,0.25)',
              transition: 'opacity 0.15s, transform 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = ''; }}
            >
              <MessageSquare size={14} /> New Chat
            </button>
          </div>

          {/* Quick stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 18 }}>
            {stats.map(s => (
              <div key={s.label} style={{
                background: 'var(--surface-sub)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 14px', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</span>
                  <s.icon size={13} color={s.color} style={{ opacity: 0.7 }} />
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Recent Chats */}
          <Card>
            <SectionHeader title="Recent Chats" action="All chats" onAction={() => onNav('chat')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {FALLBACK_CHATS.map(chat => (
                <button key={chat.id} onClick={() => onNav('chat')} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                  borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif", textAlign: 'left', width: '100%', transition: 'background 0.1s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${chat.color}18`, border: `1px solid ${chat.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MessageSquare size={13} color={chat.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{chat.title}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>{chat.time}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.preview}</div>
                  </div>
                  {chat.unread > 0 && (
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 700, color: '#0a0a0a' }}>{chat.unread}</div>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Agent Activity */}
          <Card>
            <SectionHeader title="Agent Activity" action="View all" onAction={() => onNav('agents')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {FALLBACK_ACTIVITY.map(ev => (
                <div key={ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 6px', borderRadius: 7 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: `${ev.tagColor}12`, border: `1px solid ${ev.tagColor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap size={11} color={ev.tagColor} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{ev.agent}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: `${ev.tagColor}15`, color: ev.tagColor }}>{ev.tag}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{ev.action}</div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>{ev.time}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Organizations — live from org nodes */}
          <Card>
            <SectionHeader title="Organizations" action="Manage" onAction={() => onNav('org')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orgList.map(org => (
                <div key={org.id} onClick={() => onNav('org')} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9,
                  background: 'var(--surface-raise)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: org.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>{org.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{org.name}</span>
                      {org.active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-green)', display: 'inline-block' }} />}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{org.role} · {org.members} members · {org.agents} agents</div>
                  </div>
                  <ExternalLink size={12} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          </Card>

          {/* Upcoming Tasks — live from API with fallback */}
          <Card>
            <SectionHeader title="Upcoming Tasks" action="View board" onAction={() => onNav('dashboard')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {displayTasks.map(task => {
                const isDone = taskDone.has(task.id) || task.status === 'done';
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', opacity: isDone ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                    <button onClick={() => setTaskDone(prev => {
                      const next = new Set(prev);
                      if (next.has(task.id)) next.delete(task.id); else next.add(task.id);
                      return next;
                    })} style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${isDone ? 'var(--accent)' : 'var(--border-hover)'}`,
                      background: isDone ? 'var(--accent)' : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                    }}>
                      {isDone && <span style={{ fontSize: 9, color: '#0a0a0a', fontWeight: 800 }}>✓</span>}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}>{task.title}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{task.due ?? task.assignee ?? ''}</div>
                    </div>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[task.priority ?? 'low'], flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Board Activity — live from localStorage proposals */}
          <Card style={{ gridColumn: '1 / 3' }}>
            <SectionHeader title="Board Activity" action="Open board" onAction={() => onNav('org')} />
            <div style={{ display: 'flex', gap: 12 }}>
              {boardActivity.map((item, i) => (
                <div key={i} onClick={() => onNav('org')} style={{
                  flex: 1, padding: '12px 14px', borderRadius: 9,
                  background: 'var(--surface-raise)', border: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
                >
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.4 }}>{item.text}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--accent-dark)', fontWeight: 600 }}>{item.org}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.status && <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: statusBadgeColor[item.status] ?? 'var(--text-muted)' }}>{item.status}</span>}
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Right live panel ── */}
      <div style={{
        width: 256, flexShrink: 0, borderLeft: '1px solid var(--border)',
        background: 'var(--sidebar-bg)', overflowY: 'auto',
        padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 20,
      }}>

        {/* Live Agents — from org nodes */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Activity size={12} color="var(--accent)" />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Live Agents</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(liveAgents.length > 0 ? liveAgents : DEFAULT_NODES.filter(n => n.status !== 'offline').slice(0, 3)).map(n => (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--surface-sub)', border: '1px solid var(--border)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: n.status === 'busy' ? 'var(--status-amber)' : 'var(--status-green)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{n.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.model ?? n.title}</div>
                </div>
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: n.status === 'busy' ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.1)', color: n.status === 'busy' ? 'var(--status-amber)' : 'var(--status-green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{n.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Running Workflows */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Play size={12} color="var(--status-blue)" />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Running Flows</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RUNNING_WORKFLOWS.map(wf => (
              <div key={wf.name} style={{ padding: '10px 11px', borderRadius: 8, background: 'var(--surface-sub)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wf.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: wf.color, marginLeft: 8 }}>{wf.progress}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${wf.progress}%`, background: wf.color, borderRadius: 99, transition: 'width 0.6s', boxShadow: `0 0 8px ${wf.color}60` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Bell size={12} color="var(--status-amber)" />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Notifications</span>
            <span style={{ marginLeft: 'auto', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>3</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { text: 'Patricia Cruz demo scheduled for tomorrow', time: '1h ago',  color: '#00E6A8' },
              { text: 'AvraxeAi governance vote expires in 24h',   time: '2h ago',  color: '#f59e0b' },
              { text: 'New marketplace listing matches criteria',   time: '4h ago',  color: '#8b5cf6' },
            ].map((n, i) => (
              <div key={i} style={{
                display: 'flex', gap: 8, padding: '8px 10px', borderRadius: 8,
                background: 'var(--surface-sub)', border: '1px solid var(--border)', cursor: 'pointer',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: n.color, flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.4 }}>{n.text}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System stats — live from gateway */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Zap size={12} color="var(--status-green)" />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>System</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              { label: 'Active agents',   val: live && summary?.activeAgents != null ? String(summary.activeAgents) : String(onlineCount), color: 'var(--accent)' },
              { label: 'API cost today',  val: live && summary?.dailyCostUsd != null ? `$${summary.dailyCostUsd.toFixed(2)}` : '—',          color: 'var(--status-green)' },
              { label: 'Latency',         val: live && summary?.latencyMs != null ? `${summary.latencyMs}ms` : '—',                         color: 'var(--text-secondary)' },
              { label: 'Active threads',  val: live && summary?.activeThreads != null ? String(summary.activeThreads) : '—',                color: 'var(--text-primary)' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 2px' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: s.color, fontFamily: 'DM Mono, monospace' }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Marketplace quick peek */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <TrendingUp size={12} color="var(--status-violet)" />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Marketplace</span>
          </div>
          <div style={{ padding: '12px 13px', borderRadius: 9, background: 'var(--surface-sub)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>3 new listings match your needs</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>Legal compliance specialists available this week.</div>
            <button onClick={() => onNav('marketplace')} style={{
              width: '100%', padding: '7px', borderRadius: 7,
              background: 'var(--accent-soft)', border: '1px solid rgba(0,230,168,0.25)',
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
              fontSize: 12, fontWeight: 600, color: 'var(--accent-dark)',
            }}>Browse Marketplace</button>
          </div>
        </div>

        {/* Recent Hires */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Star size={12} color="#fbbf24" />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Recent Hires</span>
          </div>
          {[
            { org: 'Nexus Legal AI', color: '#ef4444', initial: 'N', action: 'Hired by AvraxeAi'   },
            { org: 'BuildStack Dev', color: '#3b82f6', initial: 'B', action: 'New contract started' },
          ].map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 4px', borderBottom: i === 0 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: `${h.color}18`, border: `1px solid ${h.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: h.color, flexShrink: 0 }}>{h.initial}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{h.org}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{h.action}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
