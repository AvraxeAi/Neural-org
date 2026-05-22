import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ReactFlow,
  ReactFlowProvider, Background, Controls, Panel,
  useNodesState, useEdgesState, addEdge, MiniMap
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrg } from '../contexts/OrgContext';
import { useWS } from '../contexts/WSContext';
import { workflowAPI } from '../lib/api';
import { toast } from 'sonner';
import {
  GitBranch, Plus, Play, Save, Trash2, X, Settings,
  ZapIcon, ArrowRightCircle, SplitSquareVertical, Layers, Flag
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import WorkflowNode from '../components/Workflow/WorkflowNode';

const nodeTypes = { trigger: WorkflowNode, step: WorkflowNode, branch: WorkflowNode, parallel: WorkflowNode, output: WorkflowNode };

const PALETTE_NODES = [
  { type: 'trigger',  label: 'Trigger',  color: '#f59e0b', Icon: Flag,              desc: 'Start the workflow' },
  { type: 'step',     label: 'Step',     color: '#22d3ee', Icon: ArrowRightCircle,   desc: 'Agent action' },
  { type: 'branch',   label: 'Branch',   color: '#a78bfa', Icon: SplitSquareVertical,desc: 'Conditional path' },
  { type: 'parallel', label: 'Parallel', color: '#10b981', Icon: Layers,             desc: 'Parallel exec' },
  { type: 'output',   label: 'Output',   color: '#f97316', Icon: ZapIcon,            desc: 'Final output' },
];

function WorkflowEditor({ workflow, onSaved, onClose }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(workflow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow?.edges || []);
  const [name, setName] = useState(workflow?.name || '');
  const [saving, setSaving] = useState(false);
  const [runState, setRunState] = useState(null); // {run_id, step_states}
  const rfWrapper = useRef(null);
  const { on } = useWS();

  // update node status from websocket
  useEffect(() => {
    if (!on) return;
    const unsub = on('step_state_changed', (data) => {
      setNodes(nds => nds.map(n => {
        if (data.node_id && n.id === data.node_id) {
          return { ...n, data: { ...n.data, status: data.status } };
        }
        return n;
      }));
    });
    const unsub2 = on('workflow_run_completed', (data) => {
      toast.success('Workflow run completed!');
      // reset node statuses
      setTimeout(() => {
        setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: 'idle' } })));
      }, 3000);
    });
    const unsub3 = on('workflow_run_started', (data) => {
      toast.info('Workflow started...');
    });
    return () => { unsub(); unsub2(); unsub3(); };
  }, [on]);

  const onConnect = useCallback((params) => {
    setEdges(eds => addEdge({
      ...params,
      style: { stroke: 'rgba(34,211,238,0.4)', strokeWidth: 2 },
      animated: false,
    }, eds));
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    const label = event.dataTransfer.getData('label');
    const color = event.dataTransfer.getData('color');
    if (!type) return;
    const rect = rfWrapper.current?.getBoundingClientRect();
    const position = { x: event.clientX - (rect?.left || 0) - 80, y: event.clientY - (rect?.top || 0) - 30 };
    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { label, nodeType: type, color, status: 'idle', action: 'analyze', agent: null },
    };
    setNodes(nds => [...nds, newNode]);
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !workflow) return;
    setSaving(true);
    try {
      const res = await workflowAPI.update(workflow.id, { name, nodes, edges });
      toast.success('Workflow saved!');
      onSaved(res.data);
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleRun = async () => {
    if (!workflow) return;
    try {
      const res = await workflowAPI.run(workflow.id);
      setRunState({ run_id: res.data.id, step_states: {} });
      toast.info('Workflow running...');
    } catch { toast.error('Failed to run workflow'); }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Editor toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{borderBottom:'1px solid rgba(255,255,255,0.07)', background:'var(--surface-1)', backdropFilter:'blur(12px)'}}>
        <Input value={name} onChange={e=>setName(e.target.value)}
          className="h-8 text-sm w-48"
          style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)'}} />
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}
          style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', height:32}}>
          <Save size={12} className="mr-1.5" />{saving?'Saving...':'Save'}
        </Button>
        <Button size="sm" onClick={handleRun}
          data-testid="run-workflow-button"
          style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))', height:32}}>
          <Play size={12} className="mr-1.5" />Run
        </Button>
        <button onClick={onClose}><X size={15} style={{color:'rgba(255,255,255,0.4)'}} /></button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Node palette */}
        <div className="w-40 flex-shrink-0 p-3 space-y-2" style={{borderRight:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.01)'}}>
          <p className="text-[10px] font-semibold mb-2" style={{color:'rgba(255,255,255,0.35)'}}>PALETTE</p>
          {PALETTE_NODES.map(p => (
            <div
              key={p.type}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', p.type);
                e.dataTransfer.setData('label', p.label);
                e.dataTransfer.setData('color', p.color);
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="palette-item"
              style={{borderLeftColor: p.color, borderLeftWidth: 2}}
            >
              <p.Icon size={12} style={{color:p.color}} />
              <div>
                <p className="text-xs font-medium" style={{color:'rgba(255,255,255,0.85)'}}>{p.label}</p>
                <p className="text-[9px]" style={{color:'rgba(255,255,255,0.35)'}}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1" ref={rfWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{padding:0.3}}
          >
            <Background color="rgba(255,255,255,0.04)" gap={20} />
            <Controls style={{background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10}} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const { currentOrg } = useOrg();
  const { on } = useWS();
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchWorkflows = useCallback(async () => {
    if (!currentOrg) return;
    const res = await workflowAPI.list(currentOrg.id);
    setWorkflows(res.data);
    setLoading(false);
  }, [currentOrg]);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  useEffect(() => {
    if (!on) return;
    const unsub = on('workflow_run_completed', fetchWorkflows);
    return () => unsub();
  }, [on, fetchWorkflows]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await workflowAPI.create(currentOrg.id, { name: newName.trim() });
      setWorkflows(prev => [res.data, ...prev]);
      setSelectedWorkflow(res.data);
      setCreating(false);
      setNewName('');
      toast.success('Workflow created!');
    } catch { toast.error('Failed to create workflow'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await workflowAPI.delete(id);
      setWorkflows(prev => prev.filter(w => w.id !== id));
      if (selectedWorkflow?.id === id) setSelectedWorkflow(null);
      toast.success('Workflow deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleSaved = (updated) => {
    setWorkflows(prev => prev.map(w => w.id === updated.id ? updated : w));
    setSelectedWorkflow(updated);
  };

  const openWorkflow = async (w) => {
    const res = await workflowAPI.get(w.id);
    setSelectedWorkflow(res.data);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="h-full flex" data-testid="workflows-page">
      {/* Left: Workflow list */}
      <div className="w-64 flex-shrink-0 flex flex-col" style={{borderRight:'1px solid rgba(255,255,255,0.07)'}}>
        <div className="p-4" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold" style={{fontFamily:'Space Grotesk'}}>Workflows</h2>
            <Button size="sm" data-testid="create-workflow-button" onClick={() => setCreating(true)}
              style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))', height:26, fontSize:11, padding:'0 8px'}}>
              <Plus size={11} className="mr-1" />New
            </Button>
          </div>
          {creating && (
            <div className="flex gap-1 mt-2">
              <Input value={newName} onChange={e=>setNewName(e.target.value)}
                placeholder="Workflow name" autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                className="h-7 text-xs" style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)'}} />
              <Button size="sm" onClick={handleCreate} disabled={saving}
                style={{height:28, background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))'}}>
                {saving ? '...' : 'Add'}
              </Button>
            </div>
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {workflows.map(w => (
              <div
                key={w.id}
                onClick={() => openWorkflow(w)}
                className="flex items-center gap-2 p-2.5 rounded-xl cursor-pointer group"
                style={{
                  background: selectedWorkflow?.id === w.id ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.02)',
                  border: selectedWorkflow?.id === w.id ? '1px solid rgba(34,211,238,0.2)' : '1px solid rgba(255,255,255,0.06)',
                }}
                data-testid={`workflow-item-${w.name}`}
              >
                <GitBranch size={13} style={{color: selectedWorkflow?.id===w.id ? '#22d3ee' : 'rgba(255,255,255,0.45)', flexShrink:0}} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{color:'rgba(255,255,255,0.85)'}}>{w.name}</p>
                  <p className="text-[10px]" style={{color:'rgba(255,255,255,0.35)'}}>{w.run_count || 0} runs</p>
                </div>
                <button onClick={e=>{e.stopPropagation(); handleDelete(w.id);}}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded"
                  style={{color:'rgba(255,255,255,0.3)'}}>
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="text-center py-8">
                <GitBranch size={24} className="mx-auto mb-2" style={{color:'rgba(255,255,255,0.2)'}} />
                <p className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>No workflows yet</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Editor */}
      <div className="flex-1 overflow-hidden">
        {selectedWorkflow ? (
          <ReactFlowProvider>
            <WorkflowEditor
              key={selectedWorkflow.id}
              workflow={selectedWorkflow}
              onSaved={handleSaved}
              onClose={() => setSelectedWorkflow(null)}
            />
          </ReactFlowProvider>
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.2)'}}>
              <GitBranch size={28} style={{color:'#22d3ee'}} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{fontFamily:'Space Grotesk'}}>Workflow Builder</h3>
            <p className="text-sm mb-4" style={{color:'rgba(255,255,255,0.35)'}}>Select or create a workflow to start editing</p>
          </div>
        )}
      </div>
    </div>
  );
}
