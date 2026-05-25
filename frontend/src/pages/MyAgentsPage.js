import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useWS } from '../contexts/WSContext';
import api from '../lib/api';
import { toast } from 'sonner';
import {
  Bot, Plus, Star, Brain, Target, Zap, CheckCircle2,
  Clock, AlertCircle, ArrowRight, Globe, Home, Crown,
  BarChart2, RefreshCw, ChevronRight, Shuffle, Code,
  Search, FileText, Key, MoreHorizontal, Columns
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';

const skillIcons = { coding: Code, research: Search, analysis: BarChart2, api: Zap, writing: FileText, decision: Target };

function DelegateTag({ delegatedTo }) {
  if (!delegatedTo) return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
      style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.1)' }}>
      <Home size={9} />Personal
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
      style={{ background:'rgba(245,158,11,0.12)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.25)' }}>
      <Globe size={9} />Delegate → {delegatedTo.org?.name || 'Org'}
    </span>
  );
}

function AgentFullCard({ agent, onEdit, compare, onCompare }) {
  const rep = agent.reputation_score || 5;
  const isPrimary = !!agent.delegated_to;
  const statusColor = { active:'#10b981', idle:'#6b7280', busy:'#f59e0b', offline:'#374151' }[agent.status] || '#6b7280';

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.16 }}
      className="rounded-2xl p-4 flex flex-col relative overflow-hidden"
      style={{
        background: compare ? 'rgba(34,211,238,0.04)' : 'var(--surface-1)',
        backdropFilter: 'blur(12px)',
        border: compare ? '1px solid rgba(34,211,238,0.3)' : isPrimary ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: compare ? '0 0 20px rgba(34,211,238,0.08)' : 'none',
      }}
      data-testid={`my-agent-${agent.name}`}
    >
      {/* Primary delegate top stripe */}
      {isPrimary && (
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }} />
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: (agent.avatar_color||'#a78bfa')+'25', border:`2px solid ${agent.avatar_color||'#a78bfa'}40` }}>
            <Bot size={20} style={{ color: agent.avatar_color||'#a78bfa' }} />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900"
            style={{ background: statusColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold" style={{ fontFamily:'Space Grotesk', color:'rgba(255,255,255,0.95)' }}>{agent.name}</span>
            {isPrimary && <Crown size={11} style={{ color:'#f59e0b', flexShrink:0 }} />}
          </div>
          <p className="text-xs" style={{ color:'rgba(255,255,255,0.4)' }}>{agent.role}</p>
        </div>
        <button onClick={() => onCompare(agent)}
          className="p-1.5 rounded-lg flex-shrink-0"
          style={{ background: compare ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.05)', color: compare ? '#22d3ee' : 'rgba(255,255,255,0.4)' }}>
          <Columns size={12} />
        </button>
      </div>

      {/* Delegation status */}
      <div className="mb-3">
        <DelegateTag delegatedTo={agent.delegated_to} />
      </div>

      {/* Prompt preview */}
      <p className="text-xs mb-3 line-clamp-2 flex-1 leading-relaxed" style={{ color:'rgba(255,255,255,0.45)' }}>
        {agent.system_prompt || 'No system prompt configured'}
      </p>

      {/* Reputation bar */}
      <div className="flex items-center gap-1.5 mb-3">
        <Star size={10} style={{ color:'#f59e0b' }} />
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
          <div style={{ width:`${(rep/10)*100}%`, background:'#f59e0b', height:'100%', borderRadius:9999 }} />
        </div>
        <span className="text-[10px] font-mono" style={{ color:'#f59e0b' }}>{rep.toFixed(1)}</span>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1 mb-3">
        {(agent.skills||[]).slice(0,3).map(s => {
          const Icon = skillIcons[s.replace('skill-','')] || Zap;
          return (
            <span key={s} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md"
              style={{ background:'rgba(34,211,238,0.1)', color:'#22d3ee', border:'1px solid rgba(34,211,238,0.15)' }}>
              <Icon size={8} />{s.replace('skill-','')}
            </span>
          );
        })}
        {(agent.skills||[]).length > 3 && <span className="text-[10px]" style={{ color:'rgba(255,255,255,0.3)' }}>+{agent.skills.length-3}</span>}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {[['Tasks', agent.pending_tasks||0, '#f59e0b'],
          ['Goals', agent.active_goals||0, '#10b981'],
          ['Thoughts', agent.thought_count||0, '#22d3ee']].map(([label, val, color]) => (
          <div key={label} className="rounded-lg p-1.5 text-center" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-sm font-bold" style={{ color }}>{val}</p>
            <p className="text-[10px]" style={{ color:'rgba(255,255,255,0.35)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between" style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:8 }}>
        <span className="text-[10px] font-mono" style={{ color:'rgba(255,255,255,0.3)' }}>{agent.model}</span>
        <Button size="sm" onClick={() => onEdit(agent)}
          className="h-6 px-2 text-[10px]"
          style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.1)' }}>
          Edit
        </Button>
      </div>
    </motion.div>
  );
}

function CompareView({ agents, onClose }) {
  if (agents.length < 2) return null;
  const fields = [
    ['Role', a => a.role],
    ['Model', a => a.model],
    ['Reputation', a => (a.reputation_score||5).toFixed(1)],
    ['Skills', a => (a.skills||[]).length + ' skills'],
    ['Tasks', a => a.pending_tasks||0],
    ['Goals', a => a.active_goals||0],
    ['Thoughts', a => a.thought_count||0],
    ['Status', a => a.status||'idle'],
    ['Delegated', a => a.delegated_to ? a.delegated_to.org?.name : 'Personal'],
  ];
  return (
    <motion.div
      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      className="rounded-2xl overflow-hidden mt-4"
      style={{ background:'var(--surface-1)', border:'1px solid rgba(34,211,238,0.2)' }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2">
          <Columns size={14} style={{ color:'#22d3ee' }} />
          <span className="text-sm font-semibold" style={{ fontFamily:'Space Grotesk' }}>Comparing {agents.length} agents</span>
        </div>
        <button onClick={onClose} className="text-xs" style={{ color:'rgba(255,255,255,0.4)' }}>Clear</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <th className="px-4 py-2 text-left text-xs" style={{ color:'rgba(255,255,255,0.35)' }}>Attribute</th>
              {agents.map(a => (
                <th key={a.id} className="px-4 py-2 text-left">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background:(a.avatar_color||'#a78bfa')+'25' }}>
                      <Bot size={11} style={{ color:a.avatar_color||'#a78bfa' }} />
                    </div>
                    <span className="text-xs font-semibold" style={{ color:'rgba(255,255,255,0.85)' }}>{a.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map(([label, fn]) => (
              <tr key={label} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                <td className="px-4 py-2 text-xs" style={{ color:'rgba(255,255,255,0.4)' }}>{label}</td>
                {agents.map(a => (
                  <td key={a.id} className="px-4 py-2 text-xs" style={{ color:'rgba(255,255,255,0.8)' }}>{fn(a)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export default function MyAgentsPage() {
  const { user } = useAuth();
  const [agents, setAgents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [compareList, setCompareList] = useState([]);
  const [tab, setTab]             = useState('all');

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/me/agents');
      setAgents(res.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const toggleCompare = (agent) => {
    setCompareList(prev => {
      const exists = prev.find(a => a.id === agent.id);
      if (exists) return prev.filter(a => a.id !== agent.id);
      if (prev.length >= 3) { toast.info('Max 3 agents for comparison'); return prev; }
      return [...prev, agent];
    });
  };

  const delegates   = agents.filter(a => a.delegated_to);
  const personal    = agents.filter(a => !a.delegated_to);
  const displayAgents = tab === 'delegated' ? delegates : tab === 'personal' ? personal : agents;

  return (
    <div className="h-full overflow-y-auto" data-testid="my-agents-page">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily:'Space Grotesk' }}>My Agents</h1>
            <p className="text-sm mt-0.5" style={{ color:'rgba(255,255,255,0.4)' }}>
              {agents.length} agents · {delegates.length} delegated · {personal.length} personal
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchAgents}
              style={{ border:'1px solid rgba(255,255,255,0.1)', height:32 }}>
              <RefreshCw size={12} className="mr-1.5" />Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[['Total Agents', agents.length, '#22d3ee', Bot],
            ['Deployed Delegates', delegates.length, '#f59e0b', Globe],
            ['Personal (Available)', personal.length, '#10b981', Home]].map(([label, val, color, Icon]) => (
            <div key={label} className="rounded-2xl p-4" style={{ background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background:color+'18' }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <span className="text-xs" style={{ color:'rgba(255,255,255,0.45)' }}>{label}</span>
              </div>
              <p className="text-3xl font-bold" style={{ fontFamily:'Space Grotesk', color }}>{val}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4">
          {[['all','All',agents.length],['delegated','Deployed',delegates.length],['personal','Personal',personal.length]].map(([id,label,count]) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{
                background: tab===id ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.04)',
                color: tab===id ? '#22d3ee' : 'rgba(255,255,255,0.5)',
                border: tab===id ? '1px solid rgba(34,211,238,0.25)' : '1px solid rgba(255,255,255,0.07)',
              }}>
              {label} <span className="text-[10px] opacity-60">{count}</span>
            </button>
          ))}
        </div>

        {/* Compare view */}
        {compareList.length >= 2 && (
          <CompareView agents={compareList} onClose={() => setCompareList([])} />
        )}
        {compareList.length === 1 && (
          <div className="rounded-xl p-3 mb-4 flex items-center gap-2"
            style={{ background:'rgba(34,211,238,0.06)', border:'1px solid rgba(34,211,238,0.2)' }}>
            <Columns size={13} style={{ color:'#22d3ee' }} />
            <span className="text-xs" style={{ color:'#22d3ee' }}>Select 1 more agent to compare</span>
            <button onClick={() => setCompareList([])} className="ml-auto text-xs" style={{ color:'rgba(255,255,255,0.4)' }}>Cancel</button>
          </div>
        )}

        {/* Agent grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {displayAgents.map(agent => (
                <motion.div key={agent.id} initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}>
                  <AgentFullCard
                    agent={agent}
                    compare={compareList.some(a => a.id === agent.id)}
                    onCompare={toggleCompare}
                    onEdit={(a) => window.location.href = `/agents`}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <Bot size={40} className="mb-4" style={{ color:'rgba(255,255,255,0.15)' }} />
            <p className="text-sm font-semibold mb-1" style={{ fontFamily:'Space Grotesk' }}>No agents found</p>
            <p className="text-xs" style={{ color:'rgba(255,255,255,0.35)' }}>Create agents in any org's ClawHub</p>
          </div>
        )}
      </div>
    </div>
  );
}
