import React, { DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  Handle,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlowInstance,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  type EdgeChange,
  type NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Bot,
  Braces,
  Clock,
  Database,
  Filter,
  GitBranch,
  Globe,
  Mail,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
  SplitSquareHorizontal,
  Trash2,
} from 'lucide-react';
import { workflowsApi, apiFetch } from '../../lib/api';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: string;
  trigger_type?: string;
  last_run?: number;
  run_count?: number;
}

type WorkflowNodeKind = 'trigger' | 'agent' | 'http' | 'filter' | 'transform' | 'database' | 'email' | 'branch';

type WorkflowNodeData = {
  kind: WorkflowNodeKind;
  label: string;
  description: string;
  config: Record<string, string>;
};

type PaletteItem = {
  kind: WorkflowNodeKind;
  label: string;
  description: string;
  color: string;
  icon: React.ElementType;
};

type WorkflowDraft = {
  name: string;
  description: string;
  trigger_type: string;
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
};

const STORAGE_KEY = 'avai:workflow-builder:v1';

const palette: PaletteItem[] = [
  { kind: 'trigger', label: 'Manual Trigger', description: 'Start this workflow on demand.', color: '#10b981', icon: Play },
  { kind: 'agent', label: 'Agent Step', description: 'Ask an OpenClaw agent to complete a task.', color: '#8b5cf6', icon: Bot },
  { kind: 'http', label: 'HTTP Request', description: 'Call an external API or webhook.', color: '#38bdf8', icon: Globe },
  { kind: 'filter', label: 'Filter', description: 'Continue only when conditions match.', color: '#f59e0b', icon: Filter },
  { kind: 'transform', label: 'Transform', description: 'Map, parse, or reshape data.', color: '#ec4899', icon: Braces },
  { kind: 'database', label: 'Memory / DB', description: 'Read or write memory records.', color: '#14b8a6', icon: Database },
  { kind: 'email', label: 'Send Message', description: 'Send an email, alert, or Teams post.', color: '#f97316', icon: Mail },
  { kind: 'branch', label: 'Branch', description: 'Split execution into multiple paths.', color: '#a78bfa', icon: SplitSquareHorizontal },
];

const initialDraft: WorkflowDraft = {
  name: 'New automation',
  description: 'Drag nodes onto the canvas and connect them into a runnable process.',
  trigger_type: 'manual',
  nodes: [
    workflowNode('start', 'trigger', { x: 120, y: 160 }, 'Manual Trigger', 'Start this workflow from the Run button.'),
    workflowNode('agent-plan', 'agent', { x: 390, y: 160 }, 'Ask Agent', 'Generate a plan, summary, or decision.'),
  ],
  edges: [
    {
      id: 'edge-start-agent-plan',
      source: 'start',
      target: 'agent-plan',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
    },
  ],
};

function workflowNode(id: string, kind: WorkflowNodeKind, position: { x: number; y: number }, label?: string, description?: string): Node<WorkflowNodeData> {
  const item = palette.find(entry => entry.kind === kind) ?? palette[0];
  return {
    id,
    type: 'workflowNode',
    position,
    data: {
      kind,
      label: label ?? item.label,
      description: description ?? item.description,
      config: defaultConfig(kind),
    },
  };
}

function defaultConfig(kind: WorkflowNodeKind): Record<string, string> {
  switch (kind) {
    case 'trigger': return { mode: 'manual', payload: '{}' };
    case 'agent': return { agent: 'Cash', instruction: 'Review the incoming context and produce the next action.' };
    case 'http': return { method: 'POST', url: 'https://api.example.com/webhook' };
    case 'filter': return { condition: 'status == "approved"' };
    case 'transform': return { expression: 'return input;' };
    case 'database': return { operation: 'search_memory', query: '{{input.query}}' };
    case 'email': return { channel: 'email', to: 'team@example.com' };
    case 'branch': return { branches: 'approved,rejected,needs_review' };
  }
}

function timeAgo(ts?: number): string {
  if (!ts) return 'Never';
  const sec = Math.floor(Date.now() / 1000 - ts);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function loadDrafts(): Record<string, WorkflowDraft> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDraft(workflowId: string, draft: WorkflowDraft) {
  const drafts = loadDrafts();
  drafts[workflowId] = draft;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

function removeDraft(workflowId: string) {
  const drafts = loadDrafts();
  delete drafts[workflowId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

const nodeTypes = { workflowNode: WorkflowNodeCard };

export function WorkflowsEnhanced() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('local-draft');
  const [flow, setFlow] = useState<ReactFlowInstance>();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [name, setName] = useState(initialDraft.name);
  const [description, setDescription] = useState(initialDraft.description);
  const [triggerType, setTriggerType] = useState(initialDraft.trigger_type);
  const [nodes, setNodes] = useNodesState<WorkflowNodeData>(initialDraft.nodes);
  const [edges, setEdges] = useEdgesState(initialDraft.edges);

  const selectedNode = nodes.find(node => node.id === selectedNodeId);
  const activeWorkflow = workflows.find(item => item.id === selectedWorkflowId);
  const stats = useMemo(() => ({
    triggers: nodes.filter(node => node.data.kind === 'trigger').length,
    actions: nodes.filter(node => node.data.kind !== 'trigger').length,
    links: edges.length,
  }), [edges.length, nodes]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workflowsApi.list();
      const rows = Array.isArray(data) ? data : [];
      setWorkflows(rows);
      if (!initializedRef.current && rows.length > 0) {
        initializedRef.current = true;
        loadWorkflow(rows[0], rows);
      }
    } catch {
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const applyDraft = (draft: WorkflowDraft) => {
    setName(draft.name);
    setDescription(draft.description);
    setTriggerType(draft.trigger_type);
    setNodes(draft.nodes);
    setEdges(draft.edges);
    setSelectedNodeId(null);
    window.setTimeout(() => flow?.fitView({ padding: 0.25 }), 0);
  };

  const currentDraft = (): WorkflowDraft => ({ name, description, trigger_type: triggerType, nodes, edges });

  const loadWorkflow = (workflow: Workflow, rows = workflows) => {
    const drafts = loadDrafts();
    const draft = drafts[workflow.id] ?? {
      ...initialDraft,
      name: workflow.name,
      description: workflow.description || initialDraft.description,
      trigger_type: workflow.trigger_type || 'manual',
    };
    setSelectedWorkflowId(workflow.id);
    setWorkflows(rows);
    applyDraft(draft);
  };

  const newDraft = () => {
    setSelectedWorkflowId('local-draft');
    applyDraft({
      ...initialDraft,
      nodes: initialDraft.nodes.map(node => ({ ...node, id: node.id, position: { ...node.position }, data: { ...node.data, config: { ...node.data.config } } })),
      edges: initialDraft.edges.map(edge => ({ ...edge })),
    });
  };

  const onNodesChange = (changes: NodeChange[]) => {
    setNodes(current => applyNodeChanges(changes, current));
    for (const change of changes) {
      if (change.type === 'select') setSelectedNodeId(change.selected ? change.id : null);
    }
  };

  const onEdgesChange = (changes: EdgeChange[]) => setEdges(current => applyEdgeChanges(changes, current));

  const connect = (connection: Connection) => {
    setEdges(current => addEdge({
      ...connection,
      id: crypto.randomUUID(),
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
    }, current));
  };

  const onDragStart = (event: DragEvent, kind: WorkflowNodeKind) => {
    event.dataTransfer.setData('application/openclaw-workflow-node', kind);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const kind = event.dataTransfer.getData('application/openclaw-workflow-node') as WorkflowNodeKind;
    if (!kind || !flow || !wrapperRef.current) return;
    const position = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const item = palette.find(entry => entry.kind === kind) ?? palette[0];
    setNodes(current => [...current, workflowNode(crypto.randomUUID(), kind, position, item.label, item.description)]);
  };

  const updateSelectedNode = (patch: Partial<WorkflowNodeData>) => {
    if (!selectedNode) return;
    setNodes(current => current.map(node => node.id === selectedNode.id ? { ...node, data: { ...node.data, ...patch } } : node));
  };

  const updateSelectedConfig = (key: string, value: string) => {
    if (!selectedNode) return;
    updateSelectedNode({ config: { ...selectedNode.data.config, [key]: value } });
  };

  const deleteSelected = () => {
    if (!selectedNodeId) return;
    setNodes(current => current.filter(node => node.id !== selectedNodeId));
    setEdges(current => current.filter(edge => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const saveWorkflow = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (selectedWorkflowId === 'local-draft') {
        const wf = await apiFetch<Workflow>('/workflows', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim(), description, trigger_type: triggerType }),
        });
        saveDraft(wf.id, { ...currentDraft(), name: wf.name, description: wf.description || description, trigger_type: wf.trigger_type || triggerType });
        setSelectedWorkflowId(wf.id);
        setWorkflows(current => [wf, ...current]);
      } else {
        saveDraft(selectedWorkflowId, currentDraft());
        setWorkflows(current => current.map(wf => wf.id === selectedWorkflowId ? { ...wf, name: name.trim(), description, trigger_type: triggerType } : wf));
        await apiFetch<Workflow>(`/workflows/${selectedWorkflowId}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: name.trim(), description, trigger_type: triggerType }),
        }).catch(() => null);
      }
    } finally {
      setSaving(false);
    }
  };

  const runWorkflow = async () => {
    if (selectedWorkflowId === 'local-draft') {
      await saveWorkflow();
      return;
    }
    setRunning(selectedWorkflowId);
    try {
      await apiFetch(`/workflows/${selectedWorkflowId}/run`, { method: 'POST', body: '{}' });
      setWorkflows(prev => prev.map(w => w.id === selectedWorkflowId ? { ...w, last_run: Math.floor(Date.now() / 1000), run_count: (w.run_count || 0) + 1, status: 'active' } : w));
    } finally {
      setRunning(null);
    }
  };

  const deleteWorkflow = async (workflow: Workflow) => {
    if (!confirm(`Delete "${workflow.name}"?`)) return;
    try {
      await apiFetch(`/workflows/${workflow.id}`, { method: 'DELETE' });
      removeDraft(workflow.id);
      const remaining = workflows.filter(item => item.id !== workflow.id);
      setWorkflows(remaining);
      if (selectedWorkflowId === workflow.id) {
        remaining[0] ? loadWorkflow(remaining[0], remaining) : newDraft();
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="phase-page workflow-builder-page">
      <div className="page-heading workflow-builder-heading">
        <div>
          <h1>Workflow Builder</h1>
          <p>n8n-style visual automation designer · drag nodes, connect handles, save and run.</p>
        </div>
        <div className="workflow-builder-actions">
          <button className="outline-button" onClick={load}><RefreshCw size={13} /></button>
          <button className="outline-button" onClick={newDraft}><Plus size={14} /> New</button>
          <button className="outline-button" onClick={saveWorkflow} disabled={saving || !name.trim()}><Save size={13} /> {saving ? 'Saving...' : 'Save'}</button>
          <button className="primary-button" onClick={runWorkflow} disabled={running === selectedWorkflowId || saving}>
            <Play size={13} /> {running === selectedWorkflowId ? 'Running...' : selectedWorkflowId === 'local-draft' ? 'Save first' : 'Run'}
          </button>
        </div>
      </div>

      <section className="workflow-builder-shell">
        <aside className="workflow-sidebar">
          <div className="workflow-sidebar-section">
            <div className="workflow-section-title"><Sparkles size={13} /> Workflows</div>
            {loading ? <div className="workflow-muted">Loading...</div> : workflows.length === 0 ? <div className="workflow-muted">No saved workflows yet.</div> : workflows.map(item => (
              <button
                key={item.id}
                className={`workflow-saved-row ${item.id === selectedWorkflowId ? 'active' : ''}`}
                onClick={() => loadWorkflow(item)}
              >
                <GitBranch size={13} />
                <span><strong>{item.name}</strong><small>{item.status || 'draft'} · {timeAgo(item.last_run)}</small></span>
                <MoreHorizontal size={13} onClick={(event) => { event.stopPropagation(); deleteWorkflow(item); }} />
              </button>
            ))}
          </div>
          <div className="workflow-sidebar-section">
            <div className="workflow-section-title"><Plus size={13} /> Node Library</div>
            <div className="workflow-palette">
              {palette.map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.kind}
                    className="workflow-palette-item"
                    draggable
                    onDragStart={event => onDragStart(event, item.kind)}
                    style={{ '--node-color': item.color } as React.CSSProperties}
                  >
                    <span><Icon size={14} /></span>
                    <div><strong>{item.label}</strong><small>{item.description}</small></div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="workflow-canvas-wrap">
          <div className="workflow-canvas-topbar">
            <input value={name} onChange={event => setName(event.target.value)} aria-label="Workflow name" />
            <select value={triggerType} onChange={event => setTriggerType(event.target.value)} aria-label="Trigger type">
              <option value="manual">Manual</option>
              <option value="scheduled">Scheduled</option>
              <option value="event">Event-triggered</option>
              <option value="webhook">Webhook</option>
            </select>
            <div className="workflow-canvas-stats">
              <span>{stats.triggers} triggers</span><span>{stats.actions} actions</span><span>{stats.links} links</span>
            </div>
          </div>
          <div
            ref={wrapperRef}
            className="workflow-canvas"
            onDrop={onDrop}
            onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onInit={setFlow}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={connect}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              fitView
              minZoom={0.25}
              maxZoom={2}
              panOnDrag
              zoomOnScroll
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,.08)" />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable nodeColor={node => {
                const kind = (node.data as WorkflowNodeData).kind;
                return palette.find(item => item.kind === kind)?.color ?? '#10b981';
              }} maskColor="rgba(10,10,10,.72)" />
            </ReactFlow>
          </div>
        </main>

        <aside className="workflow-inspector">
          <div className="workflow-section-title"><Settings2 size={13} /> Inspector</div>
          {selectedNode ? (
            <>
              <label><span>Label</span><input value={selectedNode.data.label} onChange={event => updateSelectedNode({ label: event.target.value })} /></label>
              <label><span>Description</span><textarea rows={3} value={selectedNode.data.description} onChange={event => updateSelectedNode({ description: event.target.value })} /></label>
              {Object.entries(selectedNode.data.config).map(([key, value]) => (
                <label key={key}><span>{key.replace(/_/g, ' ')}</span><input value={value} onChange={event => updateSelectedConfig(key, event.target.value)} /></label>
              ))}
              <button className="workflow-danger" onClick={deleteSelected}><Trash2 size={13} /> Delete node</button>
            </>
          ) : (
            <>
              <label><span>Workflow description</span><textarea rows={6} value={description} onChange={event => setDescription(event.target.value)} /></label>
              <div className="workflow-empty-inspector">
                <GitBranch size={24} />
                <strong>Select a node</strong>
                <span>Edit labels, prompts, URLs, conditions, and routing values here.</span>
              </div>
            </>
          )}
          {activeWorkflow && (
            <div className="workflow-run-card">
              <Clock size={14} />
              <div><strong>{activeWorkflow.run_count || 0} runs</strong><span>Last run: {timeAgo(activeWorkflow.last_run)}</span></div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

function WorkflowNodeCard({ data, selected }: NodeProps<WorkflowNodeData>) {
  const item = palette.find(entry => entry.kind === data.kind) ?? palette[0];
  const Icon = item.icon;
  return (
    <div className={`workflow-flow-node ${selected ? 'selected' : ''}`} style={{ '--node-color': item.color } as React.CSSProperties}>
      <Handle type="target" position={Position.Left} className="workflow-handle" />
      <div className="workflow-node-icon"><Icon size={16} /></div>
      <div className="workflow-node-copy">
        <strong>{data.label}</strong>
        <span>{data.description}</span>
      </div>
      <div className="workflow-node-kind">{item.label}</div>
      <Handle type="source" position={Position.Right} className="workflow-handle" />
    </div>
  );
}
