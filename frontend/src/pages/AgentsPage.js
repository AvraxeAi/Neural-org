import React, { useState, useCallback, useEffect } from 'react';
import { useOrg } from '../contexts/OrgContext';
import { useWS } from '../contexts/WSContext';
import { agentAPI, skillsAPI } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Bot, Plus, Trash2, Edit3, Zap, Code, Search, BarChart2,
  Target, FileText, Key, ChevronRight, X, Save, RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '../components/ui/alert-dialog';

const MODELS = ['gpt-4', 'gpt-4o', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];
const TOOLS = ['web_search', 'code_exec', 'file_read', 'api_call', 'data_analysis', 'image_analysis'];
const skillIcons = { coding: Code, research: Search, analysis: BarChart2, api: Zap, writing: FileText, decision: Target };

function AgentCard({ agent, onEdit, onDelete, isSelected }) {
  const statusColor = agent.status === 'active' ? '#10b981' : agent.status === 'busy' ? '#f59e0b' : '#6b7280';
  return (
    <motion.div
      whileHover={{y:-2}}
      transition={{duration:0.16}}
      onClick={onEdit}
      className="rounded-2xl p-4 cursor-pointer relative"
      style={{
        background: isSelected ? 'rgba(34,211,238,0.05)' : 'var(--surface-1)',
        backdropFilter:'blur(12px)',
        border: isSelected ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow:'0 4px 16px rgba(0,0,0,0.25)'
      }}
      data-testid={`agent-card-${agent.name}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center relative"
            style={{background:(agent.avatar_color||'#a78bfa')+'20', border:`1.5px solid ${agent.avatar_color||'#a78bfa'}35`}}>
            <Bot size={18} style={{color: agent.avatar_color||'#a78bfa'}} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-gray-900"
              style={{background:statusColor}} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{color:'rgba(255,255,255,0.9)'}}>{agent.name}</p>
            <p className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>{agent.role}</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button onClick={e=>e.stopPropagation()} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100"
              style={{color:'rgba(255,255,255,0.3)'}}>
              <Trash2 size={13}/>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent style={{background:'hsl(var(--card))', border:'1px solid rgba(255,255,255,0.1)'}}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
              <AlertDialogDescription style={{color:'rgba(255,255,255,0.5)'}}>This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(agent.id)}
                style={{background:'hsl(var(--destructive))', color:'white'}}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="text-xs mb-3 line-clamp-2" style={{color:'rgba(255,255,255,0.45)', minHeight:32}}>
        {agent.system_prompt || 'No system prompt configured'}
      </div>

      <div className="flex flex-wrap gap-1">
        {agent.skills?.slice(0,3).map(s => {
          const Icon = skillIcons[s] || Zap;
          return (
            <span key={s} className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md"
              style={{background:'rgba(34,211,238,0.1)', color:'#22d3ee', border:'1px solid rgba(34,211,238,0.15)'}}>
              <Icon size={8} />{s}
            </span>
          );
        })}
        {agent.skills?.length > 3 && <span className="text-[10px] px-1 rounded" style={{color:'rgba(255,255,255,0.3)'}}>+{agent.skills.length-3}</span>}
      </div>

      <div className="flex items-center justify-between mt-3 pt-2.5" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
        <span className="text-[10px] font-mono" style={{color:'rgba(255,255,255,0.3)'}}>{agent.model}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${agent.status==='active'?'text-emerald-300':'text-gray-400'}`}
          style={{background:agent.status==='active'?'rgba(16,185,129,0.1)':'rgba(255,255,255,0.05)'}}>
          {agent.status}
        </span>
      </div>
    </motion.div>
  );
}

function AgentEditor({ agent, skills, onSave, onClose }) {
  const [form, setForm] = useState({
    name: agent?.name || '',
    role: agent?.role || 'Assistant',
    system_prompt: agent?.system_prompt || '',
    model: agent?.model || 'gpt-4',
    skills: agent?.skills || [],
    tools: agent?.tools || [],
    api_key: agent?.api_key || '',
    status: agent?.status || 'idle',
  });
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const toggleSkill = (skillId) => {
    setForm(p => ({
      ...p,
      skills: p.skills.includes(skillId) ? p.skills.filter(s=>s!==skillId) : [...p.skills, skillId]
    }));
  };

  const toggleTool = (tool) => {
    setForm(p => ({
      ...p,
      tools: p.tools.includes(tool) ? p.tools.filter(t=>t!==tool) : [...p.tools, tool]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally { setSaving(false); }
  };

  return (
    <motion.div
      initial={{x:24,opacity:0}} animate={{x:0,opacity:1}} exit={{x:24,opacity:0}}
      transition={{duration:0.28, ease:[0.22,1,0.36,1]}}
      className="w-96 h-full flex flex-col"
      style={{background:'var(--surface-1)', backdropFilter:'blur(20px)', borderLeft:'1px solid rgba(255,255,255,0.07)'}}
    >
      <div className="flex items-center justify-between p-4" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <h3 className="text-sm font-semibold" style={{fontFamily:'Space Grotesk'}}>
          {agent ? 'Edit Agent' : 'New Agent'}
        </h3>
        <button onClick={onClose}><X size={15} style={{color:'rgba(255,255,255,0.4)'}} /></button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="prompt" className="w-full">
          <TabsList className="w-full rounded-none" style={{background:'rgba(255,255,255,0.03)', borderBottom:'1px solid rgba(255,255,255,0.06)', borderRadius:0}}>
            <TabsTrigger value="prompt" className="flex-1 text-xs">Prompt</TabsTrigger>
            <TabsTrigger value="skills" className="flex-1 text-xs">Skills</TabsTrigger>
            <TabsTrigger value="tools" className="flex-1 text-xs">Tools</TabsTrigger>
            <TabsTrigger value="keys" className="flex-1 text-xs">Keys</TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="p-4 space-y-3">
            <div>
              <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>Name *</Label>
              <Input data-testid="agent-name-input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                placeholder="Agent Alpha" style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)'}} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>Role</Label>
              <Input value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}
                placeholder="CEO, Analyst, Developer..." style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)'}} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>System Prompt</Label>
              <Textarea data-testid="agent-prompt-input" value={form.system_prompt}
                onChange={e=>setForm(p=>({...p,system_prompt:e.target.value}))}
                placeholder="You are an expert AI assistant that..."
                rows={6}
                style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', fontFamily:'IBM Plex Mono', fontSize:12}} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>AI Model</Label>
              <select value={form.model} onChange={e=>setForm(p=>({...p,model:e.target.value}))}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.8)'}}>
                {MODELS.map(m => <option key={m} value={m} style={{background:'hsl(var(--card))'}}>{m}</option>)}
              </select>
            </div>
          </TabsContent>

          <TabsContent value="skills" className="p-4">
            <p className="text-xs mb-3" style={{color:'rgba(255,255,255,0.4)'}}>Select capabilities for this agent</p>
            <div className="space-y-2">
              {skills.map(skill => {
                const Icon = skillIcons[skill.id?.replace('skill-','')] || Zap;
                const selected = form.skills.includes(skill.id);
                return (
                  <button key={skill.id} onClick={() => toggleSkill(skill.id)}
                    data-testid={`skill-toggle-${skill.id}`}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
                    style={{
                      background: selected ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.03)',
                      border: selected ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{background: selected ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.06)'}}>
                      <Icon size={14} style={{color: selected ? '#22d3ee' : 'rgba(255,255,255,0.5)'}} />
                    </div>
                    <div>
                      <p className="text-xs font-medium" style={{color: selected ? '#22d3ee' : 'rgba(255,255,255,0.8)'}}>{skill.name}</p>
                      <p className="text-[10px]" style={{color:'rgba(255,255,255,0.35)'}}>{skill.description}</p>
                    </div>
                    {selected && <div className="ml-auto w-2 h-2 rounded-full" style={{background:'#22d3ee'}} />}
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="tools" className="p-4">
            <p className="text-xs mb-3" style={{color:'rgba(255,255,255,0.4)'}}>Assign tools and permissions</p>
            <div className="grid grid-cols-2 gap-2">
              {TOOLS.map(tool => {
                const selected = form.tools.includes(tool);
                return (
                  <button key={tool} onClick={() => toggleTool(tool)}
                    className="p-2.5 rounded-xl text-xs text-left"
                    style={{
                      background: selected ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
                      border: selected ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.07)',
                      color: selected ? '#f59e0b' : 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {tool.replace('_',' ')}
                  </button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="keys" className="p-4 space-y-3">
            <div>
              <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>API Key</Label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={form.api_key}
                  onChange={e=>setForm(p=>({...p,api_key:e.target.value}))}
                  placeholder="sk-..."
                  className="font-mono text-xs"
                  style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', paddingRight:'2.5rem'}}
                />
                <button type="button" onClick={()=>setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{color:'rgba(255,255,255,0.3)'}}>
                  <Key size={12} />
                </button>
              </div>
              <p className="text-[10px] mt-1" style={{color:'rgba(255,255,255,0.3)'}}>Used for AI model API calls</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="p-4" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
        <Button data-testid="save-agent-button" onClick={handleSave} disabled={saving || !form.name.trim()} className="w-full"
          style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))'}}
        >
          <Save size={13} className="mr-1.5" />{saving ? 'Saving...' : 'Save Agent'}
        </Button>
      </div>
    </motion.div>
  );
}

export default function AgentsPage() {
  const { currentOrg } = useOrg();
  const { on } = useWS();
  const [agents, setAgents] = useState([]);
  const [skills, setSkills] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    if (!currentOrg) return;
    const [agRes, skRes] = await Promise.all([
      agentAPI.list(currentOrg.id),
      skillsAPI.list(),
    ]);
    setAgents(agRes.data);
    setSkills(skRes.data);
    setLoading(false);
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
      setAgents(prev => [res.data, ...prev]);
      setCreating(false);
      toast.success('Agent created!');
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to create agent'); }
  };

  const handleUpdate = async (form) => {
    try {
      const res = await agentAPI.update(selectedAgent.id, form);
      setAgents(prev => prev.map(a => a.id === selectedAgent.id ? res.data : a));
      setSelectedAgent(null);
      toast.success('Agent updated!');
    } catch { toast.error('Failed to update agent'); }
  };

  const handleDelete = async (agentId) => {
    try {
      await agentAPI.delete(agentId);
      setAgents(prev => prev.filter(a => a.id !== agentId));
      if (selectedAgent?.id === agentId) setSelectedAgent(null);
      toast.success('Agent deleted');
    } catch { toast.error('Failed to delete agent'); }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="h-full flex" data-testid="agents-page">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{fontFamily:'Space Grotesk'}}>ClawHub</h1>
              <p className="text-sm mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>Manage your AI agents</p>
            </div>
            <Button data-testid="create-agent-button" onClick={() => { setCreating(true); setSelectedAgent(null); }}
              style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))'}}
            >
              <Plus size={14} className="mr-1.5" />New Agent
            </Button>
          </div>

          {/* Agent grid */}
          {agents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 group">
              {agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isSelected={selectedAgent?.id === agent.id}
                  onEdit={() => { setSelectedAgent(agent); setCreating(false); }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.2)'}}>
                <Bot size={28} style={{color:'#a78bfa'}} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{fontFamily:'Space Grotesk'}}>No agents yet</h3>
              <p className="text-sm mb-4" style={{color:'rgba(255,255,255,0.4)'}}>Create your first AI agent for this org</p>
              <Button onClick={() => setCreating(true)}
                style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))'}}>Create Agent</Button>
            </div>
          )}
        </div>
      </div>

      {/* Editor panel */}
      <AnimatePresence>
        {(creating || selectedAgent) && (
          <AgentEditor
            agent={selectedAgent}
            skills={skills}
            onSave={selectedAgent ? handleUpdate : handleCreate}
            onClose={() => { setCreating(false); setSelectedAgent(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
