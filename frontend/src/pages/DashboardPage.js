import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '../contexts/OrgContext';
import { useWS } from '../contexts/WSContext';
import { dashAPI, workflowAPI, boardAPI } from '../lib/api';
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartTooltip } from 'recharts';
import { Activity, Users, Bot, Gavel, GitBranch, MessageSquare, Plus, Play, ArrowRight, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';

function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <motion.div
      whileHover={{y:-2}}
      transition={{duration:0.16}}
      onClick={onClick}
      className="rounded-2xl p-5 cursor-pointer"
      style={{background:'var(--surface-1)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.07)', boxShadow:'0 4px 20px rgba(0,0,0,0.3)'}}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: color + '20', border: `1px solid ${color}30`}}>
          <Icon size={16} style={{color}} />
        </div>
      </div>
      <p className="text-2xl font-bold mb-0.5" style={{fontFamily:'Space Grotesk'}}>{value}</p>
      <p className="text-xs" style={{color:'rgba(255,255,255,0.45)'}}>{label}</p>
    </motion.div>
  );
}

function ActivityItem({ item }) {
  const icons = { proposal: Gavel, message: MessageSquare, workflow_run: GitBranch };
  const colors = { proposal: '#22d3ee', message: '#10b981', workflow_run: '#f59e0b' };
  const Icon = icons[item.type] || Activity;
  const color = colors[item.type] || '#6b7280';
  const time = item.time ? new Date(item.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';
  return (
    <div className="flex items-start gap-3 py-2.5 border-b" style={{borderColor:'rgba(255,255,255,0.05)'}}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{background: color+'18', border:`1px solid ${color}25`}}>
        <Icon size={13} style={{color}} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{color:'rgba(255,255,255,0.85)'}}>{item.title}</p>
        <p className="text-[10px] mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>{time}</p>
      </div>
      {item.status && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
          item.status === 'completed' || item.status === 'approved' ? 'bg-emerald-500/15 text-emerald-300' :
          item.status === 'running' ? 'bg-cyan-500/15 text-cyan-300' :
          item.status === 'rejected' ? 'bg-red-500/15 text-red-300' :
          'bg-amber-500/15 text-amber-300'
        }`}>{item.status}</span>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentOrg } = useOrg();
  const { on } = useWS();
  const [stats, setStats] = useState({members:0,agents:0,open_proposals:0,workflows:0,active_runs:0,total_messages:0});
  const [activity, setActivity] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData] = useState(() => Array.from({length:12}, (_,i) => ({name:i, value: Math.floor(Math.random()*60+10)})));

  const fetchData = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [statsRes, actRes, wfRes, propRes] = await Promise.all([
        dashAPI.stats(currentOrg.id),
        dashAPI.activity(currentOrg.id),
        workflowAPI.list(currentOrg.id),
        boardAPI.listProposals(currentOrg.id),
      ]);
      setStats(statsRes.data);
      setActivity(actRes.data);
      setWorkflows(wfRes.data.slice(0, 4));
      setProposals(propRes.data.filter(p => p.status === 'open').slice(0, 3));
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
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.2)'}}>
          <Zap size={28} style={{color:'hsl(var(--primary))'}}/>
        </div>
        <h2 className="text-xl font-semibold mb-2" style={{fontFamily:'Space Grotesk'}}>No organization yet</h2>
        <p className="text-sm mb-4" style={{color:'rgba(255,255,255,0.45)'}}>Create or join an org to get started</p>
      </div>
    </div>
  );

  const statCards = [
    { icon: Users, label: 'Members', value: stats.members, color: '#22d3ee', path: '/org-chart' },
    { icon: Bot, label: 'Agents', value: stats.agents, color: '#a78bfa', path: '/agents' },
    { icon: Gavel, label: 'Open Proposals', value: stats.open_proposals, color: '#f59e0b', path: '/board' },
    { icon: GitBranch, label: 'Workflows', value: stats.workflows, color: '#10b981', path: '/workflows' },
    { icon: Activity, label: 'Active Runs', value: stats.active_runs, color: '#f97316', path: '/workflows' },
    { icon: MessageSquare, label: 'Messages', value: stats.total_messages, color: '#ec4899', path: '/messages' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{fontFamily:'Space Grotesk'}}>{currentOrg.name}</h1>
            <p className="text-sm mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>Command Center</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/board')}
              style={{border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.7)'}}>
              <Plus size={14} className="mr-1.5" />Proposal
            </Button>
            <Button size="sm" onClick={() => navigate('/workflows')}
              style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))'}}
              data-testid="dashboard-run-workflow">
              <Play size={14} className="mr-1.5" />Run Workflow
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {statCards.map(s => (
            <StatCard key={s.label} {...s} onClick={() => navigate(s.path)} />
          ))}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Activity feed */}
          <div className="lg:col-span-1 rounded-2xl p-4"
            style={{background:'var(--surface-1)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{fontFamily:'Space Grotesk'}}>Live Activity</h3>
              <div className="w-2 h-2 rounded-full" style={{background:'#10b981', boxShadow:'0 0 6px rgba(16,185,129,0.5)'}} />
            </div>
            <ScrollArea className="h-64">
              {activity.length > 0 ? activity.map((a,i) => (
                <ActivityItem key={i} item={a} />
              )) : (
                <p className="text-xs text-center py-8" style={{color:'rgba(255,255,255,0.3)'}}>No recent activity</p>
              )}
            </ScrollArea>
          </div>

          {/* Active workflows */}
          <div className="lg:col-span-1 rounded-2xl p-4"
            style={{background:'var(--surface-1)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.07)'}}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{fontFamily:'Space Grotesk'}}>Workflows</h3>
              <button onClick={() => navigate('/workflows')} className="text-xs" style={{color:'hsl(var(--primary))'}}>View all</button>
            </div>
            <div className="space-y-2">
              {workflows.length > 0 ? workflows.map(w => (
                <div key={w.id} className="flex items-center gap-2 p-2.5 rounded-xl"
                  style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}>
                  <GitBranch size={13} style={{color:'#f59e0b', flexShrink:0}} />
                  <span className="text-xs flex-1 truncate" style={{color:'rgba(255,255,255,0.8)'}}>{w.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5" style={{background:w.status==='active'?'rgba(16,185,129,0.1)':'rgba(255,255,255,0.05)', color:w.status==='active'?'#10b981':'rgba(255,255,255,0.4)', border:'none'}}>
                    {w.status}
                  </Badge>
                </div>
              )) : (
                <div className="text-center py-6">
                  <GitBranch size={24} className="mx-auto mb-2" style={{color:'rgba(255,255,255,0.2)'}} />
                  <p className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>No workflows yet</p>
                  <button onClick={() => navigate('/workflows')} className="text-xs mt-1" style={{color:'hsl(var(--primary))'}}>Create one</button>
                </div>
              )}
            </div>
          </div>

          {/* Open Proposals + Chart */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl p-4"
              style={{background:'var(--surface-1)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.07)'}}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold" style={{fontFamily:'Space Grotesk'}}>Open Proposals</h3>
                <button onClick={() => navigate('/board')} className="text-xs" style={{color:'hsl(var(--primary))'}}>Board</button>
              </div>
              <div className="space-y-2">
                {proposals.length > 0 ? proposals.map(p => (
                  <div key={p.id} className="p-2.5 rounded-xl"
                    style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}>
                    <p className="text-xs font-medium truncate" style={{color:'rgba(255,255,255,0.85)'}}>{p.title}</p>
                    <p className="text-[10px] mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>{p.votes?.length || 0} votes</p>
                  </div>
                )) : (
                  <p className="text-xs text-center py-4" style={{color:'rgba(255,255,255,0.3)'}}>No open proposals</p>
                )}
              </div>
            </div>

            {/* Pulse chart */}
            <div className="rounded-2xl p-4"
              style={{background:'var(--surface-1)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.07)'}}>
              <h3 className="text-sm font-semibold mb-3" style={{fontFamily:'Space Grotesk'}}>Org Pulse</h3>
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={chartData}>
                  <RechartTooltip contentStyle={{background:'hsl(var(--card))', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontSize:11}} />
                  <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
