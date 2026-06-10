import React, { useState, useEffect } from 'react';
import {
  Sun, ArrowRight, Shield, Building2, MessageSquare, Vote,
  Bell, Plus, CheckSquare, AlertTriangle, User, Bot,
  ChevronRight, Clock,
} from 'lucide-react';
import { agentsApi, orgTasksApi } from '../../lib/api';
import { memSvc } from '../../lib/memoryApi';

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() / 1000) - ts);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
      {action}
    </div>
  );
}

function StatusDot({ status }: { status: 'online' | 'busy' | 'offline' }) {
  const color = status === 'online' ? 'var(--status-green)' : status === 'busy' ? 'var(--status-amber)' : 'var(--text-muted)';
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface AgentRow { name: string; role: string; status: 'online' | 'busy' | 'offline'; initials: string; }
interface TaskRow  { id: string; title: string; status: string; priority: string; created_at?: number; }
interface ProposalRow { id: string; title: string; status: string; vote_yes?: number; vote_no?: number; created_at?: number; }

interface DashboardProps {
  onNav?: (id: string) => void;
}

export default function Dashboard({ onNav }: DashboardProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const [agents,    setAgents]    = useState<AgentRow[]>([]);
  const [tasks,     setTasks]     = useState<TaskRow[]>([]);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);

  useEffect(() => {
    agentsApi.list().then((data: any) => {
      const entries = Array.isArray(data) ? data : Object.values(data);
      setAgents(entries.map((a: any) => ({
        name: a.name || a.id,
        role: a.description || a.role || 'AI Agent',
        status: (a.status === 'online' ? 'online' : a.status === 'busy' ? 'busy' : 'offline') as 'online' | 'busy' | 'offline',
        initials: (a.name || a.id || '?').slice(0, 2).toUpperCase(),
      })));
    }).catch(() => {});

    orgTasksApi.list().then((data: any) => {
      setTasks(Array.isArray(data) ? data : []);
    }).catch(() => {});

    memSvc.approvals('open').then((data: any) => {
      setProposals(Array.isArray(data) ? data : []);
    }).catch(() => {
      // fallback: try proposals endpoint directly
      fetch(`${(window as any).__API_BASE__ || ''}`, { headers: { Authorization: `Bearer ${(window as any).__OPENCLAW_TOKEN || ''}` } }).catch(() => {});
    });
  }, []);

  const openTasks      = tasks.filter(t => !['completed', 'done'].includes(t.status));
  const openProposals  = proposals.filter(p => p.status === 'open' || p.status === 'voting');
  const pendingVotes   = openProposals.length;
  const inProgressTask = tasks.filter(t => t.status === 'in_progress').length;

  const EXECUTIVE_BRIEF = [
    ...(pendingVotes > 0 ? [{ icon: Vote, text: `${pendingVotes} proposal${pendingVotes > 1 ? 's' : ''} awaiting your vote`, sub: 'Review and cast your vote in Proposals' }] : []),
    ...(inProgressTask > 0 ? [{ icon: CheckSquare, text: `${inProgressTask} task${inProgressTask > 1 ? 's' : ''} currently in progress`, sub: 'Check the Task Board for updates' }] : []),
    ...(agents.filter(a => a.status === 'online').length > 0 ? [{ icon: Bot, text: `${agents.filter(a => a.status === 'online').length} agents online and active`, sub: 'All systems operating normally' }] : []),
    ...(openTasks.length > 0 ? [{ icon: AlertTriangle, text: `${openTasks.length} open task${openTasks.length > 1 ? 's' : ''} across all stages`, sub: 'Review backlog and prioritize' }] : []),
    { icon: Building2, text: 'Avraxe AI org is active', sub: 'Organization running smoothly' },
  ].slice(0, 5);

  const PRIORITIES = [
    { id: 'proposals', label: 'Review Votes',  sub: pendingVotes > 0 ? `${pendingVotes} pending` : 'No pending', icon: Vote,          color: 'var(--accent)' },
    { id: 'security',  label: 'Security',       sub: '1 alert',                                                    icon: Shield,         color: 'var(--status-amber)' },
    { id: 'org',       label: 'Organization',   sub: `${agents.length} members`,                                   icon: Building2,      color: 'var(--status-blue)' },
    { id: 'chat',      label: 'AI Chat',        sub: 'Ask anything',                                               icon: MessageSquare,  color: 'var(--status-violet)' },
  ];

  const ACTIVITY = [
    ...proposals.slice(0, 2).map(p => ({
      time: p.created_at ? timeAgo(p.created_at) : 'Recently',
      icon: Vote,
      text: `Proposal: ${p.title}`,
      actor: `Status: ${p.status}`,
    })),
    ...tasks.slice(0, 2).map(t => ({
      time: t.created_at ? timeAgo(t.created_at) : 'Recently',
      icon: CheckSquare,
      text: `Task: ${t.title}`,
      actor: `${t.status} · ${t.priority}`,
    })),
  ].slice(0, 4);

  const NOTIFICATIONS = [
    { count: pendingVotes,      label: 'Pending Votes' },
    { count: openTasks.length,  label: 'Open Tasks' },
    { count: agents.filter(a => a.status === 'online').length, label: 'Agents Online' },
  ];

  const REMINDERS = openTasks.slice(0, 4).map(t => ({
    text: t.title,
    due: t.priority === 'critical' || t.priority === 'high' ? 'High priority' : 'Normal priority',
    urgent: t.priority === 'critical' || t.priority === 'high',
  }));

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Greeting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sun size={22} style={{ color: 'var(--status-amber)', flexShrink: 0 }} />
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {greeting}, Rusty
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Here's what's happening in{' '}
              <span style={{ color: 'var(--accent-dark)', fontWeight: 500 }}>Avraxe AI</span>{' '}
              today ↓
            </p>
          </div>
        </div>

        {/* Executive Brief */}
        <Card>
          <CardHeader
            title="Executive Brief"
            action={
              <button
                onClick={() => onNav?.('proposals')}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent-dark)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                View all <ArrowRight size={12} />
              </button>
            }
          />
          <div style={{ padding: '8px 0' }}>
            {EXECUTIVE_BRIEF.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '10px 20px',
                  borderBottom: i < EXECUTIVE_BRIEF.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-raise)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <item.icon size={14} style={{ color: 'var(--accent-dark)', marginTop: 1, flexShrink: 0 }} />
                  <item.icon size={14} style={{ color: 'var(--accent-mid)', flexShrink: 0, opacity: 0.5 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{item.text}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Today's Priorities */}
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Today's Priorities</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {PRIORITIES.map(p => (
              <button
                key={p.id}
                onClick={() => onNav?.(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '14px 16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.12s, border-color 0.12s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--surface-raise)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: `${p.color}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <p.icon size={15} style={{ color: p.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.sub}</div>
                </div>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader
            title="Recent Activity"
            action={
              <button style={{ fontSize: 12, color: 'var(--accent-dark)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                View all activity <ArrowRight size={12} />
              </button>
            }
          />
          <div>
            {ACTIVITY.map((a, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 20px',
                  borderBottom: i < ACTIVITY.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 72, flexShrink: 0 }}>{a.time}</span>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: 'var(--surface-raise)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <a.icon size={13} style={{ color: 'var(--text-secondary)' }} />
                </div>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{a.text}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.actor}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Right sidebar */}
      <div
        style={{
          width: 280,
          flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          background: 'var(--canvas)',
        }}
      >
        {/* Reminders */}
        <Card>
          <CardHeader
            title="Reminders"
            action={
              <button style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Plus size={13} />
              </button>
            }
          />
          <div style={{ padding: '4px 0' }}>
            {REMINDERS.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 16px',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-raise)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${r.urgent ? 'var(--status-amber)' : 'var(--border-hover)'}`, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)' }}>{r.text}</span>
                <span style={{ fontSize: 11, color: r.urgent ? 'var(--status-amber)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.due}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Active Agents */}
        <Card>
          <CardHeader
            title="Active Agents"
            action={
              <button onClick={() => onNav?.('agents')} style={{ fontSize: 12, color: 'var(--accent-dark)', background: 'none', border: 'none', cursor: 'pointer' }}>
                View all
              </button>
            }
          />
          <div style={{ padding: '4px 0' }}>
            {agents.map((a, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-raise)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface-raise)', border: '1px solid var(--border-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
                  {a.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.role}</div>
                </div>
                <StatusDot status={a.status as 'online' | 'busy'} />
              </div>
            ))}
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader
            title="Notifications"
            action={
              <button style={{ fontSize: 12, color: 'var(--accent-dark)', background: 'none', border: 'none', cursor: 'pointer' }}>
                View all
              </button>
            }
          />
          <div style={{ padding: '4px 0' }}>
            {NOTIFICATIONS.map((n, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-raise)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{n.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{n.count}</span>
                  <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Organizations */}
        <Card>
          <CardHeader title="Organizations" />
          <div style={{ padding: '8px 16px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--accent-soft)', border: '1px solid var(--accent-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--accent-dark)' }}>
                A
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Avraxe AI</div>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--status-green)', fontWeight: 500 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-green)', display: 'inline-block' }} />
                Active
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
