import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrg } from '../contexts/OrgContext';
import { useWS } from '../contexts/WSContext';
import { agentAPI, skillsAPI } from '../lib/api';
import api from '../lib/api';
import { toast } from 'sonner';
import {
  Bot, Plus, Trash2, Save, X, Code, Search, BarChart2, Target,
  FileText, Key, Zap, CheckCircle2, Clock, AlertCircle, Flag,
  Brain, TrendingUp, Calendar, Play, Pause, Star, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Progress } from '../components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '../components/ui/alert-dialog';
import { Switch } from '../components/ui/switch';

const MODELS = ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'gemini-3-flash-preview'];
const TOOLS  = ['web_search', 'code_exec', 'file_read', 'api_call', 'data_analysis', 'image_analysis'];
const skillIcons = { coding: Code, research: Search, analysis: BarChart2, api: Zap, writing: FileText, decision: Target };

const TASK_STATUS = {
  pending:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',    Icon: Clock },
  in_progress: { color: '#22d3ee', bg: 'rgba(34,211,238,0.1)',   Icon: Play },
  completed:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)',   Icon: CheckCircle2 },
  cancelled:   { color: '#6b7280', bg: 'rgba(107,114,128,0.1)',  Icon: X },
  blocked:     { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    Icon: AlertCircle },
};

const PRIORITY_COLORS = { low: '#6b7280', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' };

// ── Agent Card ────────────────────────────────────────────────────────────────
function AgentCard({ agent, isSelected, onEdit, onDelete }) {
  const sc = agent.status === 'active' ? '#10b981' : agent.status === 'busy' ? '#f59e0b' : '#6b7280';
  const rep = agent.reputation_score || 5;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.14 }}
      onClick={onEdit}
      className="rounded-2xl p-4 cursor-pointer relative overflow-hidden"
      style={{
        background: isSelected ? 'rgba(34,211,238,0.05)' : 'var(--surface-1)',
        border: isSelected ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: isSelected ? '0 0 20px rgba(34,211,238,0.08)' : '0 4px 16px rgba(0,0,0,0.25)'
      }}
      data-testid={`agent-card-${agent.name}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: (agent.avatar_color||'#a78bfa')+'20', border: `1.5px solid ${agent.avatar_color||'#a78bfa'}35` }}>
              <Bot size={18} style={{ color: agent.avatar_color||'#a78bfa' }} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-gray-900" style={{ background: sc }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>{agent.name}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{agent.role}</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button onClick={e=>e.stopPropagation()} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100"
              style={{ color:'rgba(255,255,255,0.3)' }}><Trash2 size={13}/></button>
          </AlertDialogTrigger>
          <AlertDialogContent style={{ background:'hsl(var(--card))', border:'1px solid rgba(255,255,255,0.1)' }}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
              <AlertDialogDescription style={{ color:'rgba(255,255,255,0.5)' }}>This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(agent.id)}
                style={{ background:'hsl(var(--destructive))', color:'white' }}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <p className="text-xs mb-3 line-clamp-2" style={{ color:'rgba(255,255,255,0.45)', minHeight:32 }}>
        {agent.system_prompt || 'No system prompt configured'}
      </p>

      {/* Reputation */}
      <div className="flex items-center gap-1.5 mb-2">
        <Star size={10} style={{ color: '#f59e0b' }} />
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,0.08)' }}>
          <div style={{ width:`${(rep/10)*100}%`, background:'#f59e0b', height:'100%', borderRadius:9999 }} />
        </div>
        <span className="text-[10px] font-mono" style={{ color:'#f59e0b' }}>{rep.toFixed(1)}</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {agent.skills?.slice(0,3).map(s => { const Icon = skillIcons[s.replace('skill-','')] || Zap; return (
          <span key={s} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md"
            style={{ background:'rgba(34,211,238,0.1)', color:'#22d3ee', border:'1px solid rgba(34,211,238,0.15)' }}>
            <Icon size={8}/>{s.replace('skill-','')}
          </span>
        ); })}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-[10px] font-mono" style={{ color:'rgba(255,255,255,0.3)' }}>{agent.model}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          agent.status==='active'?'text-emerald-300 bg-emerald-500/10':'text-gray-400 bg-white/5'
        }`}>{agent.status}</span>
      </div>
    </motion.div>
  );
}

// ── Autonomy Panel ─────────────────────────────────────────────────────────────
function AutonomyPanel({ agentId }) {
  const [tasks, setTasks]       = useState([]);
  const [goals, setGoals]       = useState([]);
  const [thoughts, setThoughts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [summary, setSummary]   = useState(null);
  const [newTask, setNewTask]   = useState({ title:'', priority:'medium' });
  const [newGoal, setNewGoal]   = useState({ title:'', metric:'', target_value:'' });
  const [newSched, setNewSched] = useState({ task_description:'', interval:'daily' });
  const [activeTab, setActiveTab] = useState('tasks');

  const fetchAll = useCallback(async () => {
    const [tRes, gRes, thRes, scRes, sumRes] = await Promise.all([
      api.get(`/agents/${agentId}/tasks`),
      api.get(`/agents/${agentId}/goals`),
      api.get(`/agents/${agentId}/thoughts`),
      api.get(`/agents/${agentId}/schedules`),
      api.get(`/agents/${agentId}/autonomy-summary`),
    ]);
    setTasks(tRes.data); setGoals(gRes.data);
    setThoughts(thRes.data); setSchedules(scRes.data);
    setSummary(sumRes.data);
  }, [agentId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createTask = async () => {
    if (!newTask.title.trim()) return;
    await api.post(`/agents/${agentId}/tasks`, newTask);
    setNewTask({ title:'', priority:'medium' });
    fetchAll();
    toast.success('Task created');
  };

  const updateTaskStatus = async (taskId, status) => {
    await api.put(`/agents/${agentId}/tasks/${taskId}`, { status });
    fetchAll();
  };

  const createGoal = async () => {
    if (!newGoal.title.trim()) return;
    await api.post(`/agents/${agentId}/goals`, newGoal);
    setNewGoal({ title:'', metric:'', target_value:'' });
    fetchAll();
    toast.success('Goal created');
  };

  const createSchedule = async () => {
    if (!newSched.task_description.trim()) return;
    await api.post(`/agents/${agentId}/schedules`, newSched);
    setNewSched({ task_description:'', interval:'daily' });
    fetchAll();
    toast.success('Schedule created');
  };

  const toggleSchedule = async (sid) => {
    await api.put(`/agents/${agentId}/schedules/${sid}/toggle`);
    fetchAll();
  };

  return (
    <div className="p-4">
      {/* Summary row */}
      {summary && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[['Tasks', summary.task_counts?.pending + summary.task_counts?.in_progress, '#f59e0b'],
            ['Goals', summary.active_goals, '#10b981'],
            ['Thoughts', summary.thought_count, '#22d3ee'],
            ['Rep', summary.reputation?.toFixed(1), '#a78bfa']].map(([label, val, color]) => (
            <div key={label} className="rounded-xl p-2 text-center" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-lg font-bold" style={{ fontFamily:'Space Grotesk', color }}>{val}</p>
              <p className="text-[10px]" style={{ color:'rgba(255,255,255,0.4)' }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-3" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
          <TabsTrigger value="tasks" className="flex-1 text-xs">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="goals" className="flex-1 text-xs">Goals ({goals.length})</TabsTrigger>
          <TabsTrigger value="thoughts" className="flex-1 text-xs">Thoughts</TabsTrigger>
          <TabsTrigger value="schedule" className="flex-1 text-xs">Schedule</TabsTrigger>
        </TabsList>

        {/* Tasks */}
        <TabsContent value="tasks">
          <div className="flex gap-2 mb-3">
            <Input value={newTask.title} onChange={e=>setNewTask(p=>({...p,title:e.target.value}))}
              placeholder="New task..." className="h-8 text-xs flex-1"
              onKeyDown={e=>e.key==='Enter'&&createTask()}
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}/>
            <select value={newTask.priority} onChange={e=>setNewTask(p=>({...p,priority:e.target.value}))}
              className="h-8 px-2 rounded-lg text-xs"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.8)' }}>
              {['low','medium','high','critical'].map(p=><option key={p} style={{background:'hsl(var(--card))'}}>  {p}</option>)}
            </select>
            <Button size="sm" onClick={createTask} className="h-8 px-3"
              style={{ background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))' }}>
              <Plus size={12}/>
            </Button>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-1.5">
              {tasks.map(task => {
                const s = TASK_STATUS[task.status] || TASK_STATUS.pending;
                const pc = PRIORITY_COLORS[task.priority] || '#6b7280';
                return (
                  <div key={task.id} className="flex items-center gap-2 p-2.5 rounded-xl"
                    style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => updateTaskStatus(task.id, task.status==='completed'?'pending':'completed')}
                      className="flex-shrink-0">
                      <s.Icon size={14} style={{ color: s.color }} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${ task.status==='completed' ? 'line-through opacity-40' : '' }`}
                        style={{ color:'rgba(255,255,255,0.85)' }}>{task.title}</p>
                    </div>
                    <span className="text-[9px] px-1 rounded flex-shrink-0" style={{ background:pc+'18', color:pc }}>{task.priority}</span>
                    <button onClick={()=>api.delete(`/agents/${agentId}/tasks/${task.id}`).then(fetchAll)}
                      className="flex-shrink-0 opacity-50 hover:opacity-100">
                      <X size={10} style={{ color:'rgba(255,255,255,0.4)' }}/>
                    </button>
                  </div>
                );
              })}
              {tasks.length === 0 && <p className="text-xs text-center py-4" style={{ color:'rgba(255,255,255,0.3)' }}>No tasks yet</p>}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Goals */}
        <TabsContent value="goals">
          <div className="space-y-2 mb-3">
            <Input value={newGoal.title} onChange={e=>setNewGoal(p=>({...p,title:e.target.value}))}
              placeholder="Goal title..." className="h-8 text-xs"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}/>
            <div className="flex gap-2">
              <Input value={newGoal.metric} onChange={e=>setNewGoal(p=>({...p,metric:e.target.value}))}
                placeholder="Metric (e.g. PRs reviewed)" className="h-7 text-xs"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}/>
              <Input value={newGoal.target_value} onChange={e=>setNewGoal(p=>({...p,target_value:e.target.value}))}
                placeholder="Target" className="h-7 text-xs w-20"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}/>
              <Button size="sm" onClick={createGoal} className="h-7 px-2"
                style={{ background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))' }}><Plus size={11}/></Button>
            </div>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {goals.map(goal => (
                <div key={goal.id} className="p-2.5 rounded-xl"
                  style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium" style={{ color:'rgba(255,255,255,0.85)' }}>{goal.title}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                      goal.status==='active'?'bg-emerald-500/15 text-emerald-300':'bg-gray-500/15 text-gray-400'
                    }`}>{goal.status}</span>
                  </div>
                  {goal.metric && (
                    <div className="flex items-center gap-2">
                      <Progress value={goal.progress||0} className="flex-1 h-1.5"
                        style={{ background:'rgba(255,255,255,0.08)' }} />
                      <span className="text-[10px] font-mono" style={{ color:'#10b981' }}>{goal.progress||0}%</span>
                    </div>
                  )}
                  {goal.metric && <p className="text-[10px] mt-1" style={{ color:'rgba(255,255,255,0.35)' }}>{goal.metric}: {goal.current_value||'0'} / {goal.target_value}</p>}
                </div>
              ))}
              {goals.length === 0 && <p className="text-xs text-center py-4" style={{ color:'rgba(255,255,255,0.3)' }}>No goals yet</p>}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Thoughts */}
        <TabsContent value="thoughts">
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {thoughts.map(t => (
                <div key={t.id} className="p-2.5 rounded-xl"
                  style={{ background:'rgba(34,211,238,0.04)', border:'1px solid rgba(34,211,238,0.12)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Brain size={11} style={{ color:'#22d3ee' }}/>
                    <span className="text-[10px]" style={{ color:'rgba(255,255,255,0.4)' }}>{t.thought_type}</span>
                    <span className="text-[10px] ml-auto font-mono" style={{ color:'rgba(255,255,255,0.25)' }}>
                      {new Date(t.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color:'rgba(255,255,255,0.7)' }}>{t.content}</p>
                </div>
              ))}
              {thoughts.length === 0 && <p className="text-xs text-center py-4" style={{ color:'rgba(255,255,255,0.3)' }}>No thought logs yet</p>}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Schedule */}
        <TabsContent value="schedule">
          <div className="flex gap-2 mb-3">
            <Input value={newSched.task_description} onChange={e=>setNewSched(p=>({...p,task_description:e.target.value}))}
              placeholder="Autonomous task..." className="h-8 text-xs flex-1"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}/>
            <select value={newSched.interval} onChange={e=>setNewSched(p=>({...p,interval:e.target.value}))}
              className="h-8 px-2 rounded-lg text-xs"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.8)' }}>
              {['hourly','daily','weekly'].map(i=><option key={i} style={{background:'hsl(var(--card))'}}>{i}</option>)}
            </select>
            <Button size="sm" onClick={createSchedule} className="h-8 px-3"
              style={{ background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))' }}><Plus size={12}/></Button>
          </div>
          <ScrollArea className="h-40">
            <div className="space-y-1.5">
              {schedules.map(s => (
                <div key={s.id} className="flex items-center gap-2 p-2.5 rounded-xl"
                  style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                  <Calendar size={12} style={{ color:'#a78bfa', flexShrink:0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color:'rgba(255,255,255,0.8)' }}>{s.task_description}</p>
                    <p className="text-[10px]" style={{ color:'rgba(255,255,255,0.35)' }}>{s.interval}</p>
                  </div>
                  <Switch checked={s.enabled} onCheckedChange={()=>toggleSchedule(s.id)} />
                </div>
              ))}
              {schedules.length===0 && <p className="text-xs text-center py-4" style={{ color:'rgba(255,255,255,0.3)' }}>No schedules</p>}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Agent Editor Panel ──────────────────────────────────────────────────────────
function AgentEditor({ agent, skills, onSave, onClose }) {
  const [form, setForm] = useState({
    name: agent?.name||'', role: agent?.role||'Assistant',
    system_prompt: agent?.system_prompt||'', model: agent?.model||'gpt-4.1-mini',
    skills: agent?.skills||[], tools: agent?.tools||[],
    api_key: agent?.api_key||'', status: agent?.status||'idle',
    personality_traits: agent?.personality_traits||[],
    goals: agent?.goals||[],
  });
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [newTrait, setNewTrait] = useState('');

  const toggleSkill = id => setForm(p => ({ ...p, skills: p.skills.includes(id) ? p.skills.filter(s=>s!==id) : [...p.skills,id] }));
  const toggleTool  = t  => setForm(p => ({ ...p, tools: p.tools.includes(t)  ? p.tools.filter(x=>x!==t)  : [...p.tools,t]  }));
  const addTrait = () => { if (newTrait.trim()) { setForm(p => ({...p, personality_traits:[...p.personality_traits, newTrait.trim()]})); setNewTrait(''); } };
  const removeTrait = i => setForm(p => ({...p, personality_traits: p.personality_traits.filter((_,j)=>j!==i)}));

  const handleSave = async () => { setSaving(true); try { await onSave(form); } finally { setSaving(false); } };

  return (
    <motion.div
      initial={{ x: 32, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 32, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.22,1,0.36,1] }}
      className="w-[420px] h-full flex flex-col"
      style={{ background:'var(--surface-1)', backdropFilter:'blur(20px)', borderLeft:'1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between p-4" style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:(agent?.avatar_color||'#a78bfa')+'20' }}>
            <Bot size={14} style={{ color:agent?.avatar_color||'#a78bfa' }}/>
          </div>
          <h3 className="text-sm font-semibold" style={{ fontFamily:'Space Grotesk' }}>{agent ? 'Edit Agent' : 'New Agent'}</h3>
        </div>
        <button onClick={onClose}><X size={15} style={{ color:'rgba(255,255,255,0.4)' }}/></button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="prompt">
          <TabsList className="w-full rounded-none" style={{ background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.06)', borderRadius:0 }}>
            <TabsTrigger value="prompt" className="flex-1 text-xs">Prompt</TabsTrigger>
            <TabsTrigger value="identity" className="flex-1 text-xs">Identity</TabsTrigger>
            <TabsTrigger value="skills" className="flex-1 text-xs">Skills</TabsTrigger>
            <TabsTrigger value="tools" className="flex-1 text-xs">Tools</TabsTrigger>
            <TabsTrigger value="keys" className="flex-1 text-xs">Keys</TabsTrigger>
            {agent && <TabsTrigger value="autonomy" className="flex-1 text-xs">Autonomy</TabsTrigger>}
          </TabsList>

          {/* Prompt */}
          <TabsContent value="prompt" className="p-4 space-y-3">
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color:'rgba(255,255,255,0.5)' }}>Name *</Label>
              <Input data-testid="agent-name-input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                placeholder="Agent Alpha" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}/>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color:'rgba(255,255,255,0.5)' }}>Role</Label>
              <Input value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}
                placeholder="CEO, Analyst, Developer..." style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}/>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color:'rgba(255,255,255,0.5)' }}>System Prompt</Label>
              <Textarea data-testid="agent-prompt-input" value={form.system_prompt}
                onChange={e=>setForm(p=>({...p,system_prompt:e.target.value}))}
                placeholder="You are an expert AI assistant that..." rows={6}
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', fontFamily:'IBM Plex Mono', fontSize:12 }}/>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color:'rgba(255,255,255,0.5)' }}>AI Model</Label>
              <select value={form.model} onChange={e=>setForm(p=>({...p,model:e.target.value}))}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.8)' }}>
                {MODELS.map(m=><option key={m} value={m} style={{ background:'hsl(var(--card))' }}>{m}</option>)}
              </select>
            </div>
          </TabsContent>

          {/* Identity */}
          <TabsContent value="identity" className="p-4 space-y-3">
            <div>
              <Label className="text-xs mb-2 block" style={{ color:'rgba(255,255,255,0.5)' }}>Personality Traits</Label>
              <div className="flex gap-2 mb-2">
                <Input value={newTrait} onChange={e=>setNewTrait(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addTrait()}
                  placeholder="e.g. analytical, risk-averse, creative..."
                  className="h-8 text-xs" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}/>
                <Button size="sm" onClick={addTrait} className="h-8 px-3"
                  style={{ background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))' }}><Plus size={12}/></Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.personality_traits.map((t,i) => (
                  <span key={i} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                    style={{ background:'rgba(167,139,250,0.1)', color:'#a78bfa', border:'1px solid rgba(167,139,250,0.2)' }}>
                    {t}<button onClick={()=>removeTrait(i)}><X size={10}/></button>
                  </span>
                ))}
                {form.personality_traits.length === 0 && <p className="text-xs" style={{ color:'rgba(255,255,255,0.3)' }}>No traits defined</p>}
              </div>
            </div>
          </TabsContent>

          {/* Skills */}
          <TabsContent value="skills" className="p-4">
            <div className="space-y-2">
              {skills.map(skill => {
                const Icon = skillIcons[skill.id?.replace('skill-','')] || Zap;
                const selected = form.skills.includes(skill.id);
                return (
                  <button key={skill.id} onClick={()=>toggleSkill(skill.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
                    style={{ background: selected?'rgba(34,211,238,0.08)':'rgba(255,255,255,0.03)', border: selected?'1px solid rgba(34,211,238,0.3)':'1px solid rgba(255,255,255,0.07)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: selected?'rgba(34,211,238,0.15)':'rgba(255,255,255,0.06)' }}>
                      <Icon size={14} style={{ color: selected?'#22d3ee':'rgba(255,255,255,0.5)' }}/>
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{ color: selected?'#22d3ee':'rgba(255,255,255,0.8)' }}>{skill.name}</p>
                      <p className="text-[10px]" style={{ color:'rgba(255,255,255,0.35)' }}>{skill.description}</p>
                    </div>
                    {selected && <div className="ml-auto w-2 h-2 rounded-full" style={{ background:'#22d3ee' }}/>}
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* Tools */}
          <TabsContent value="tools" className="p-4">
            <div className="grid grid-cols-2 gap-2">
              {TOOLS.map(tool => {
                const sel = form.tools.includes(tool);
                return (
                  <button key={tool} onClick={()=>toggleTool(tool)}
                    className="p-2.5 rounded-xl text-xs text-left"
                    style={{ background: sel?'rgba(245,158,11,0.08)':'rgba(255,255,255,0.03)', border: sel?'1px solid rgba(245,158,11,0.3)':'1px solid rgba(255,255,255,0.07)', color: sel?'#f59e0b':'rgba(255,255,255,0.6)' }}>
                    {tool.replace('_',' ')}
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* Keys */}
          <TabsContent value="keys" className="p-4 space-y-3">
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color:'rgba(255,255,255,0.5)' }}>Agent API Key</Label>
              <div className="relative">
                <Input type={showKey?'text':'password'} value={form.api_key}
                  onChange={e=>setForm(p=>({...p,api_key:e.target.value}))}
                  placeholder="sk-..." className="font-mono text-xs"
                  style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', paddingRight:'2.5rem' }}/>
                <button type="button" onClick={()=>setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:'rgba(255,255,255,0.3)' }}>
                  <Key size={12}/>
                </button>
              </div>
              <p className="text-[10px] mt-1" style={{ color:'rgba(255,255,255,0.3)' }}>Overrides org default for this agent</p>
            </div>
          </TabsContent>

          {/* Autonomy (only for existing agents) */}
          {agent && (
            <TabsContent value="autonomy">
              <AutonomyPanel agentId={agent.id} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <div className="p-4" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <Button data-testid="save-agent-button" onClick={handleSave} disabled={saving||!form.name.trim()} className="w-full"
          style={{ background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))' }}>
          <Save size={13} className="mr-1.5"/>{saving?'Saving...':'Save Agent'}
        </Button>
      </div>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AgentsPage() {
  const { currentOrg } = useOrg();
  const { on } = useWS();
  const [agents, setAgents]       = useState([]);
  const [skills, setSkills]       = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [creating, setCreating]   = useState(false);
  const [loading, setLoading]     = useState(true);

  const fetchAgents = useCallback(async () => {
    if (!currentOrg) return;
    const [agRes, skRes] = await Promise.all([agentAPI.list(currentOrg.id), skillsAPI.list()]);
    setAgents(agRes.data); setSkills(skRes.data); setLoading(false);
  }, [currentOrg]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  useEffect(() => {
    if (!on) return;
    const u1 = on('agent_created', () => fetchAgents());
    const u2 = on('agent_updated', () => fetchAgents());
    const u3 = on('agent_deleted', () => fetchAgents());
    return () => { u1(); u2(); u3(); };
  }, [on, fetchAgents]);

  const handleCreate = async (form) => {
    try {
      const res = await agentAPI.create(currentOrg.id, form);
      setAgents(prev => [res.data, ...prev]); setCreating(false);
      toast.success('Agent created!');
    } catch (e) { toast.error(e.response?.data?.detail||'Failed'); }
  };

  const handleUpdate = async (form) => {
    try {
      const res = await agentAPI.update(selectedAgent.id, form);
      setAgents(prev => prev.map(a => a.id===selectedAgent.id ? res.data : a));
      setSelectedAgent(null); toast.success('Agent updated!');
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    try {
      await agentAPI.delete(id);
      setAgents(prev => prev.filter(a => a.id!==id));
      if (selectedAgent?.id===id) setSelectedAgent(null);
      toast.success('Agent deleted');
    } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="h-full flex" data-testid="agents-page">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily:'Space Grotesk' }}>ClawHub</h1>
              <p className="text-sm mt-0.5" style={{ color:'rgba(255,255,255,0.4)' }}>Manage your AI agents</p>
            </div>
            <Button data-testid="create-agent-button" onClick={()=>{ setCreating(true); setSelectedAgent(null); }}
              style={{ background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))' }}>
              <Plus size={14} className="mr-1.5"/>New Agent
            </Button>
          </div>

          {agents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 group">
              {agents.map(agent => (
                <AgentCard key={agent.id} agent={agent}
                  isSelected={selectedAgent?.id===agent.id}
                  onEdit={()=>{ setSelectedAgent(agent); setCreating(false); }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.2)' }}>
                <Bot size={28} style={{ color:'#a78bfa' }}/>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily:'Space Grotesk' }}>No agents yet</h3>
              <p className="text-sm mb-4" style={{ color:'rgba(255,255,255,0.4)' }}>Create your first AI agent</p>
              <Button onClick={()=>setCreating(true)}
                style={{ background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))' }}>Create Agent</Button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {(creating||selectedAgent) && (
          <AgentEditor agent={selectedAgent} skills={skills}
            onSave={selectedAgent?handleUpdate:handleCreate}
            onClose={()=>{ setCreating(false); setSelectedAgent(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
