import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, Panel, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrg } from '../contexts/OrgContext';
import { useWS } from '../contexts/WSContext';
import api from '../lib/api';
import { toast } from 'sonner';
import { Network, Bot, User, Target, FileText, Database, Zap, RefreshCw, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';

const ENTITY_CONFIG = {
  person:    { color: '#22d3ee', icon: User,     label: 'Person' },
  agent:     { color: '#a78bfa', icon: Bot,      label: 'Agent' },
  decision:  { color: '#f59e0b', icon: Target,   label: 'Decision' },
  project:   { color: '#10b981', icon: Database, label: 'Project' },
  task:      { color: '#f97316', icon: FileText, label: 'Task' },
  concept:   { color: '#6366f1', icon: Zap,      label: 'Concept' },
};

const EDGE_COLORS = {
  influenced:   '#f59e0b',
  proposed:     '#22d3ee',
  decided:      '#10b981',
  executed:     '#a78bfa',
  collaborates: '#6b7280',
};

function MemoryNode({ data }) {
  const cfg = ENTITY_CONFIG[data.entity_type] || ENTITY_CONFIG.concept;
  const { icon: Icon } = cfg;
  const influence = Math.min(1, (data.influence_score || 0) / 5);

  return (
    <div
      className="rounded-2xl px-3 py-2.5 min-w-[130px] cursor-pointer"
      style={{
        background: 'var(--surface-1)',
        backdropFilter: 'blur(12px)',
        border: `1.5px solid ${cfg.color}30`,
        boxShadow: `0 0 ${8 + influence*16}px ${cfg.color}${Math.round(influence*30+10).toString(16)}`,
      }}
      data-testid={`memory-node-${data.name}`}
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: cfg.color+'20', border: `1px solid ${cfg.color}30` }}>
          <Icon size={13} style={{ color: cfg.color }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.9)' }}>{data.name}</p>
          <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{cfg.label}</p>
        </div>
      </div>
      {influence > 0.1 && (
        <div className="mt-1.5 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full" style={{ width: `${influence*100}%`, background: cfg.color }} />
        </div>
      )}
    </div>
  );
}

const memoryNodeTypes = { default: MemoryNode };

function NodeInspector({ node, onClose }) {
  if (!node) return null;
  const cfg = ENTITY_CONFIG[node.entity_type] || ENTITY_CONFIG.concept;
  return (
    <motion.div
      initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.22,1,0.36,1] }}
      className="w-72 h-full flex flex-col"
      style={{ background: 'var(--surface-1)', backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Memory Node</h3>
        <button onClick={onClose}><X size={15} style={{ color: 'rgba(255,255,255,0.4)' }}/></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: cfg.color+'20', border: `1.5px solid ${cfg.color}30` }}>
            <cfg.icon size={20} style={{ color: cfg.color }} />
          </div>
          <div>
            <h4 className="font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{node.name}</h4>
            <Badge style={{ background: cfg.color+'18', color: cfg.color, border: `1px solid ${cfg.color}25` }}>{cfg.label}</Badge>
          </div>
        </div>
        {node.description && (
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{node.description}</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {[['Confidence', `${Math.round((node.confidence||0)*100)}%`],
            ['Influence', node.influence_score?.toFixed(2)||'0'],
            ['Mentions', node.mention_count||0],
            ['Created', new Date(node.created_at||'').toLocaleDateString()]].map(([k,v]) => (
            <div key={k} className="rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{k}</p>
              <p className="text-sm font-medium">{v}</p>
            </div>
          ))}
        </div>
        {node.metadata && Object.keys(node.metadata).length > 0 && (
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>METADATA</p>
            {Object.entries(node.metadata).map(([k,v]) => (
              <div key={k} className="flex justify-between text-xs py-0.5">
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{k}</span>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>{String(v).slice(0,40)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function MemoryPage() {
  const { currentOrg } = useOrg();
  const { on } = useWS();
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [rawNodes, setRawNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const buildGraph = useCallback((memNodes, memEdges) => {
    // Layout: simple force-ish positioning
    const positioned = memNodes.map((n, i) => ({
      id: n.id,
      type: 'default',
      position: n.position || {
        x: 150 + (i % 4) * 220,
        y: 100 + Math.floor(i / 4) * 160
      },
      data: { ...n },
    }));

    const rfEdges = memEdges.map(e => ({
      id: e.id,
      source: e.source_id,
      target: e.target_id,
      label: e.edge_type,
      style: {
        stroke: EDGE_COLORS[e.edge_type] || '#6b7280',
        strokeWidth: Math.max(1, (e.weight || 1) * 2),
        opacity: 0.7,
      },
      labelStyle: { fill: 'rgba(255,255,255,0.5)', fontSize: 9 },
      animated: e.edge_type === 'influenced',
    }));

    setNodes(positioned);
    setEdges(rfEdges);
  }, []);

  const fetchMemory = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    const [nodesRes, edgesRes] = await Promise.all([
      api.get(`/orgs/${currentOrg.id}/memory/nodes`),
      api.get(`/orgs/${currentOrg.id}/memory/edges`),
    ]);
    setRawNodes(nodesRes.data);
    buildGraph(nodesRes.data, edgesRes.data);
    setLoading(false);
  }, [currentOrg, buildGraph]);

  useEffect(() => { fetchMemory(); }, [fetchMemory]);

  useEffect(() => {
    if (!on) return;
    const u1 = on('memory.node_created', () => fetchMemory());
    return () => u1();
  }, [on, fetchMemory]);

  const filteredNodes = useMemo(() => {
    if (filter === 'all') return nodes;
    return nodes.filter(n => n.data.entity_type === filter);
  }, [nodes, filter]);

  const onNodeClick = useCallback((_, node) => {
    const raw = rawNodes.find(r => r.id === node.id);
    setSelectedNode(raw || null);
  }, [rawNodes]);

  if (loading) return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="h-full flex" data-testid="memory-page">
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <ReactFlow
            nodes={filteredNodes}
            edges={edges}
            nodeTypes={memoryNodeTypes}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.3 }}
          >
            <Background color="rgba(255,255,255,0.04)" gap={24} />
            <Controls style={{ background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
            <MiniMap style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
              nodeColor={n => ENTITY_CONFIG[n.data?.entity_type]?.color || '#6b7280'} />
            <Panel position="top-left">
              <div className="p-3 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
                <h2 className="text-sm font-semibold mb-1" style={{ fontFamily: 'Space Grotesk' }}>Memory Graph</h2>
                <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{nodes.length} nodes · {edges.length} relationships</p>
                <div className="flex flex-wrap gap-1">
                  {['all', ...Object.keys(ENTITY_CONFIG)].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      className="text-[10px] px-2 py-1 rounded-lg capitalize"
                      style={{
                        background: filter === f ? (ENTITY_CONFIG[f]?.color||'#22d3ee')+'20' : 'rgba(255,255,255,0.05)',
                        color: filter === f ? (ENTITY_CONFIG[f]?.color||'#22d3ee') : 'rgba(255,255,255,0.5)',
                        border: filter === f ? `1px solid ${ENTITY_CONFIG[f]?.color||'#22d3ee'}30` : '1px solid transparent',
                      }}
                    >{f}</button>
                  ))}
                </div>
              </div>
            </Panel>
            <Panel position="top-right">
              <Button size="sm" variant="outline" onClick={fetchMemory}
                style={{ background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <RefreshCw size={13} className="mr-1.5" />Refresh
              </Button>
            </Panel>
          </ReactFlow>
        </ReactFlowProvider>

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <Network size={48} className="mb-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No memory nodes yet</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Run a deliberation to populate the memory graph</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedNode && (
          <NodeInspector node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
