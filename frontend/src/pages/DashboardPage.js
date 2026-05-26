import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '../contexts/OrgContext';
import { useWS } from '../contexts/WSContext';
import { dashAPI, workflowAPI, boardAPI, healthAPI } from '../lib/api';
import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartTooltip } from 'recharts';
import {
  Activity, Users, Bot, Gavel, GitBranch, MessageSquare,
  Plus, Play, ArrowRight, Zap, TrendingUp, ArrowUpRight,
  Swords, Network, Brain, Database
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';

function StatCard({ icon: Icon, label, value, color, trend, onClick, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      onClick={onClick}
      className="rounded-2xl p-4 cursor-pointer relative overflow-hidden group"
      style={{
        background: 'var(--surface-1)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.28)'
      }}
    >
      {/* Background glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(120px circle at 50% 0%, ${color}08, transparent)` }} />

      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: color + '15', border: `1px solid ${color}25` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <ArrowUpRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }} />
      </div>

      <p className="text-2xl font-bold mb-0.5 stat-number" style={{ fontFamily: 'Space Grotesk', color: 'rgba(255,255,255,0.95)' }}>
        {value}
      </p>
      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>

      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          <TrendingUp size={9} style={{ color: '#10b981' }} />
          <span style={{ fontSize: 10, color: '#10b981', fontFamily: 'IBM Plex Mono' }}>+{trend}%</span>
        </div>
      )}
    </motion.div>
  );
}

function ActivityItem({ item, index }) {
  const icons = { proposal: Gavel, message: MessageSquare, workflow_run: GitBranch };
  const colors = { proposal: '#22d3ee', message: '#10b981', workflow_run: '#f59e0b' };
  const Icon = icons[item.type] || Activity;
  const color = colors[item.type] || '#6b7280';
  const time = item.time ? new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="flex items-start gap-3 py-2.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: color + '14', border: `1px solid ${color}20` }}>
        <Icon size={12} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.82)' }}>{item.title}</p>
        <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.28)', fontFamily: 'IBM Plex Mono' }}>{time}</p>
      </div>
      {item.status && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${item.status === 'completed' || item.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400'
          : item.status === 'running' ? 'bg-cyan-500/15 text-cyan-400'
            : item.status === 'rejected' ? 'bg-red-500/15 text-red-400'
              : 'bg-amber-500/15 text-amber-400'
          }`}>{item.status}</span>
      )}
    </motion.div>
  );
}

function QuickAction({ icon: Icon, label, desc, color, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl w-full text-left transition-all group"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      onMouseEnter={e => { e.currentTarget.style.background = color + '08'; e.currentTarget.style.borderColor = color + '30'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: color + '15', border: `1px solid ${color}20` }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Space Grotesk' }}>{label}</p>
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{desc}</p>
      </div>
      <ArrowRight size={13} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
    </button>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-2.5 py-1.5 rounded-lg"
      style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11 }}>
      <span style={{ color: '#22d3ee' }}>{payload[0].value}</span>
    </div>
  );
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentOrg } = useOrg();
  const { on } = useWS();
  const [stats, setStats] = useState({ members: 0, agents: 0, open_proposals: 0, workflows: 0, active_runs: 0, total_messages: 0, deliberations: 0, memory_nodes: 0 });
  const [activity, setActivity] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);

  const fetchData = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [statsRes, actRes, wfRes, propRes, eventsRes] = await Promise.all([
        dashAPI.stats(currentOrg.id),
        dashAPI.activity(currentOrg.id),
        workflowAPI.list(currentOrg.id),
        boardAPI.listProposals(currentOrg.id),
        healthAPI.events(currentOrg.id, 200),
      ]);
      setStats(statsRes.data);
      setActivity(actRes.data);
      setWorkflows(wfRes.data.slice(0, 5));
      setProposals(propRes.data.filter(p => p.status === 'open').slice(0, 4));

      // Build 14-day event frequency chart from real events
      const events = eventsRes.data || [];
      const days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (13 - i));
        return d.toISOString().slice(0, 10);
      });
      const dayCount = {};
      const day2Count = {};
      events.forEach(ev => {
        const day = (ev.created_at || '').slice(0, 10);
        if (!day) return;
        dayCount[day] = (dayCount[day] || 0) + 1;
        if (['message_created','proposal_created','vote_cast'].includes(ev.event_type))
          day2Count[day] = (day2Count[day] || 0) + 1;
      });
      setChartData(days.map((d, i) => ({ name: i, value: dayCount[d] || 0, value2: day2Count[d] || 0 })));
    } catch { } finally { setLoading(false); }
  }, [currentOrg]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!on) return;
    const unsubs = [
      on('proposal_created', () => fetchData()),
      on('vote_cast', () => fetchData()),
      on('workflow_run_completed', () => fetchData()),
      on('message_created', () => fetchData()),
    ];
    return () => unsubs.forEach(u => u());
  }, [on, fetchData]);

  if (!currentOrg) return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)' }}>
          <Zap size={28} style={{ color: 'hsl(var(--primary))' }} />
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Space Grotesk' }}>No organization yet</h2>
        <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Create or join an org to get started</p>
      </div>
    </div>
  );

  const statCards = [
    { icon: Users, label: 'Members', value: stats.members, color: '#22d3ee', path: '/org-chart', delay: 0 },
    { icon: Bot, label: 'Agents', value: stats.agents, color: '#a78bfa', path: '/agents', delay: 0.05 },
    { icon: Gavel, label: 'Open Proposals', value: stats.open_proposals, color: '#f59e0b', path: '/board', delay: 0.1 },
    { icon: GitBranch, label: 'Workflows', value: stats.workflows, color: '#10b981', path: '/workflows', delay: 0.15 },
    { icon: Activity, label: 'Active Runs', value: stats.active_runs, color: '#f97316', path: '/workflows', delay: 0.2 },
    { icon: MessageSquare, label: 'Messages', value: stats.total_messages, color: '#ec4899', path: '/messages', delay: 0.25 },
    { icon: Brain, label: 'Deliberations', value: stats.deliberations, color: '#22d3ee', path: '/deliberation', delay: 0.3 },
    { icon: Database, label: 'Memory Nodes', value: stats.memory_nodes, color: '#6366f1', path: '/memory', delay: 0.35 },
  ];

  return (
    <div className="h-full overflow-y-auto page-enter">
      <div className="p-6 max-w-7xl mx-auto">

        {/* Header with org name and actions */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>{currentOrg.name}</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', fontFamily: 'IBM Plex Mono' }}>
                ACTIVE
              </span>
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.38)', fontFamily: 'IBM Plex Sans' }}>
              Mission Control — real-time overview
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/board')}
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.04)', height: 34 }}>
              <Plus size={13} className="mr-1.5" />Proposal
            </Button>
            <Button size="sm" onClick={() => navigate('/workflows')}
              style={{ background: 'linear-gradient(135deg, #22d3ee, #0891b2)', color: '#0a0a0a', height: 34, boxShadow: '0 4px 14px rgba(34,211,238,0.3)' }}
              data-testid="dashboard-run-workflow">
              <Play size={13} className="mr-1.5" />Run Workflow
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {statCards.map(s => (
            <StatCard key={s.label} {...s} onClick={() => navigate(s.path)} />
          ))}
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

          {/* Live Activity */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
            className="rounded-2xl p-4"
            style={{ background: 'var(--surface-1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Live Activity</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
                <span style={{ fontSize: 10, color: '#10b981', fontFamily: 'IBM Plex Mono' }}>LIVE</span>
              </div>
            </div>
            <ScrollArea className="h-64">
              {activity.length > 0 ? activity.map((a, i) => (
                <ActivityItem key={i} item={a} index={i} />
              )) : (
                <div className="flex flex-col items-center justify-center h-48">
                  <Activity size={20} className="mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>No recent activity</p>
                </div>
              )}
            </ScrollArea>
          </motion.div>

          {/* Workflows */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }}
            className="rounded-2xl p-4"
            style={{ background: 'var(--surface-1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Workflows</h3>
              <button onClick={() => navigate('/workflows')} className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: 'hsl(var(--primary))' }}>
                View all <ArrowRight size={10} />
              </button>
            </div>
            <div className="space-y-1.5">
              {workflows.length > 0 ? workflows.map(w => (
                <div key={w.id} className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  onClick={() => navigate('/workflows')}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(245,158,11,0.12)' }}>
                    <GitBranch size={11} style={{ color: '#f59e0b' }} />
                  </div>
                  <span className="text-xs flex-1 truncate" style={{ color: 'rgba(255,255,255,0.78)' }}>{w.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${w.status === 'active' ? 'bg-emerald-500/12 text-emerald-400' : 'bg-white/5 text-white/35'}`}>
                    {w.status}
                  </span>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <GitBranch size={22} className="mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.28)' }}>No workflows yet</p>
                  <button onClick={() => navigate('/workflows')} className="text-xs font-medium"
                    style={{ color: 'hsl(var(--primary))' }}>Create one →</button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Open Proposals */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}
            className="rounded-2xl p-4"
            style={{ background: 'var(--surface-1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Open Proposals</h3>
              <button onClick={() => navigate('/board')} className="text-xs flex items-center gap-1"
                style={{ color: 'hsl(var(--primary))' }}>
                Board <ArrowRight size={10} />
              </button>
            </div>
            <div className="space-y-1.5">
              {proposals.length > 0 ? proposals.map(p => (
                <div key={p.id} className="p-2.5 rounded-xl cursor-pointer transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  onClick={() => navigate('/board')}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}>
                  <p className="text-xs font-medium truncate mb-1" style={{ color: 'rgba(255,255,255,0.82)' }}>{p.title}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{
                        width: `${Math.min(100, ((p.votes?.filter(v => v.value === 'approve').length || 0) / Math.max(1, p.votes?.length || 1)) * 100)}%`,
                        background: 'linear-gradient(90deg, #10b981, #34d399)',
                        height: '100%', borderRadius: 9999, transition: 'width 0.3s'
                      }} />
                    </div>
                    <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'IBM Plex Mono' }}>
                      {p.votes?.length || 0} votes
                    </span>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <Gavel size={22} className="mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.28)' }}>No open proposals</p>
                  <button onClick={() => navigate('/board')} className="text-xs font-medium"
                    style={{ color: 'hsl(var(--primary))' }}>Create one →</button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Bottom row: Quick actions + Org Pulse */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.45 }}
            className="lg:col-span-1 rounded-2xl p-4"
            style={{ background: 'var(--surface-1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'Space Grotesk' }}>Quick Actions</h3>
            <div className="space-y-1.5">
              <QuickAction icon={Bot} label="Create Agent" desc="Add a new AI agent" color="#a78bfa" onClick={() => navigate('/agents')} />
              <QuickAction icon={Swords} label="Start War Room" desc="Launch multi-agent debate" color="#ef4444" onClick={() => navigate('/war-room')} />
              <QuickAction icon={Network} label="View Org Chart" desc="Visualize your hierarchy" color="#22d3ee" onClick={() => navigate('/org-chart')} />
            </div>
          </motion.div>

          {/* Org Pulse chart */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}
            className="lg:col-span-2 rounded-2xl p-4"
            style={{ background: 'var(--surface-1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Org Pulse</h3>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Activity over last 14 periods</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#22d3ee' }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Events</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#a78bfa' }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Agents</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <RechartTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} fill="url(#cyanGrad)" dot={false} />
                <Area type="monotone" dataKey="value2" stroke="#a78bfa" strokeWidth={1.5} fill="url(#purpleGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

