import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, Panel, useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrg } from '../contexts/OrgContext';
import { useWS } from '../contexts/WSContext';
import { chartAPI, agentAPI, orgAPI, msgAPI } from '../lib/api';
import { toast } from 'sonner';
import {
  Network, RefreshCw, GitBranch, Circle, Layers, Radio,
  MessageSquare, Save, ChevronDown
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { AnimatePresence as AP } from 'framer-motion';
import OrgChartNode from '../components/OrgChart/OrgChartNode';
import NodeInspector from '../components/OrgChart/NodeInspector';
import * as d3 from 'd3-force';

const nodeTypes = { orgNode: OrgChartNode };

const LAYOUTS = [
  { id: 'tree',    label: 'Tree',      Icon: GitBranch },
  { id: 'radial',  label: 'Radial',    Icon: Circle },
  { id: 'neural',  label: 'Neural',    Icon: Radio },
  { id: 'swimlane',label: 'Swim Lane', Icon: Layers },
];

// ── Layout algorithms ───────────────────────────────────────────────────────────

function computeTreeLayout(chartNodes) {
  const roots = chartNodes.filter(n => !n.manager_id);
  const positions = {};
  let col = 0;
  function placeNode(node, depth) {
    positions[node.id] = { x: col * 280, y: depth * 180 };
    col++;
    const children = chartNodes.filter(n => n.manager_id === node.id);
    children.forEach(c => placeNode(c, depth + 1));
  }
  roots.forEach(r => placeNode(r, 0));
  // any unplaced
  chartNodes.forEach(n => { if (!positions[n.id]) { positions[n.id] = { x: col * 280, y: 0 }; col++; } });
  return positions;
}

function computeRadialLayout(chartNodes) {
  const n = chartNodes.length;
  const cx = 500, cy = 400;
  const positions = {};
  if (n === 0) return positions;
  const roots = chartNodes.filter(nd => !nd.manager_id);
  if (roots.length === 0) {
    chartNodes.forEach((nd, i) => {
      const angle = (i / n) * 2 * Math.PI;
      positions[nd.id] = { x: cx + 300 * Math.cos(angle), y: cy + 300 * Math.sin(angle) };
    });
    return positions;
  }
  // Place roots at center, children in rings
  roots.forEach((r, ri) => {
    const rootAngle = (ri / roots.length) * 2 * Math.PI;
    positions[r.id] = { x: cx + 80 * Math.cos(rootAngle), y: cy + 80 * Math.sin(rootAngle) };
    const children = chartNodes.filter(nd => nd.manager_id === r.id);
    children.forEach((c, ci) => {
      const a = (ci / Math.max(children.length, 1)) * 2 * Math.PI;
      positions[c.id] = { x: cx + 280 * Math.cos(a), y: cy + 280 * Math.sin(a) };
    });
  });
  chartNodes.forEach(nd => { if (!positions[nd.id]) positions[nd.id] = { x: cx, y: cy }; });
  return positions;
}

function computeForceLayout(chartNodes) {
  if (chartNodes.length === 0) return {};
  const sim_nodes = chartNodes.map(n => ({ id: n.id, x: Math.random()*800+100, y: Math.random()*600+100 }));
  const edges_data = chartNodes.filter(n => n.manager_id).map(n => ({ source: n.manager_id, target: n.id }));
  const sim = d3.forceSimulation(sim_nodes)
    .force('link', d3.forceLink(edges_data).id(d => d.id).distance(200).strength(0.8))
    .force('charge', d3.forceManyBody().strength(-400))
    .force('center', d3.forceCenter(500, 400))
    .force('collision', d3.forceCollide(100))
    .stop();
  for (let i = 0; i < 300; i++) sim.tick();
  const positions = {};
  sim_nodes.forEach(n => { positions[n.id] = { x: n.x, y: n.y }; });
  return positions;
}

function computeSwimLaneLayout(chartNodes) {
  // Group by node_type: users in top lane, agents in bottom lane
  const users  = chartNodes.filter(n => n.node_type === 'user');
  const agents = chartNodes.filter(n => n.node_type !== 'user');
  const positions = {};
  users.forEach( (n, i) => { positions[n.id] = { x: 100 + i * 260, y: 100 }; });
  agents.forEach((n, i) => { positions[n.id] = { x: 100 + i * 260, y: 340 }; });
  return positions;
}

function buildFlowFromLayout(chartNodes, positions, layout) {
  const flowNodes = chartNodes.map(cn => ({
    id: cn.id, type: 'orgNode',
    position: positions[cn.id] || { x: 200, y: 200 },
    data: {
      chartNode: cn, nodeType: cn.node_type,
      name: cn.ref_data?.name || 'Unknown',
      role: cn.ref_data?.role || (cn.node_type === 'user' ? 'Member' : 'Agent'),
      status: cn.ref_data?.status || (cn.node_type === 'user' ? 'active' : 'idle'),
      isBoardMember: cn.is_board_member,
      avatarColor: cn.ref_data?.avatar_color || '#22d3ee',
      skills: cn.ref_data?.skills || [],
      isNeuralLayout: layout === 'neural',
    },
  }));

  const edgeStyle = layout === 'neural'
    ? { stroke: 'rgba(34,211,238,0.4)', strokeWidth: 1.5, strokeDasharray: '4 4' }
    : { stroke: 'rgba(34,211,238,0.3)', strokeWidth: 2 };

  const flowEdges = chartNodes.filter(cn => cn.manager_id).map(cn => ({
    id: `e-${cn.manager_id}-${cn.id}`,
    source: cn.manager_id, target: cn.id,
    style: edgeStyle,
    animated: layout === 'neural',
  }));

  return { flowNodes, flowEdges };
}

export default function OrgChartPage() {
  const { currentOrg } = useOrg();
  const { on } = useWS();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rawNodes, setRawNodes]   = useState([]);
  const [layout, setLayout]       = useState('tree');
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading]     = useState(true);

  const applyLayout = useCallback((chartNodes, lyt) => {
    let positions;
    switch (lyt) {
      case 'radial':  positions = computeRadialLayout(chartNodes);  break;
      case 'neural':  positions = computeForceLayout(chartNodes);   break;
      case 'swimlane':positions = computeSwimLaneLayout(chartNodes); break;
      default:        positions = computeTreeLayout(chartNodes);     break;
    }
    const { flowNodes, flowEdges } = buildFlowFromLayout(chartNodes, positions, lyt);
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [setNodes, setEdges]);

  const fetchChart = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const res = await chartAPI.get(currentOrg.id);
      setRawNodes(res.data);
      applyLayout(res.data, layout);
    } catch { toast.error('Failed to load org chart'); }
    finally { setLoading(false); }
  }, [currentOrg, layout, applyLayout]);

  useEffect(() => { fetchChart(); }, [fetchChart]);

  useEffect(() => {
    if (!on) return;
    const u1 = on('chart_updated', () => fetchChart());
    const u2 = on('agent_created', () => fetchChart());
    const u3 = on('agent_deleted', () => fetchChart());
    const u4 = on('presence.updated', (data) => {
      // update status dot on node
      setNodes(prev => prev.map(n => {
        const raw = rawNodes.find(r => r.node_ref_id === data.user_id);
        if (!raw || raw.id !== n.id) return n;
        return { ...n, data: { ...n.data, status: data.status, thinking: data.thinking } };
      }));
    });
    return () => { u1(); u2(); u3(); u4(); };
  }, [on, fetchChart, rawNodes]);

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    applyLayout(rawNodes, newLayout);
  };

  const onNodeDragStop = useCallback(async (_, node) => {
    if (!currentOrg) return;
    try { await chartAPI.updateNode(currentOrg.id, node.id, { position: node.position }); } catch {}
  }, [currentOrg]);

  const onConnect = useCallback(async (params) => {
    const newEdge = { ...params, style: { stroke: 'rgba(34,211,238,0.35)', strokeWidth: 2 }, animated: layout === 'neural' };
    setEdges(eds => addEdge(newEdge, eds));
    try { await chartAPI.updateNode(currentOrg.id, params.target, { manager_id: params.source }); } catch {}
  }, [currentOrg, layout]);

  const onNodeClick = useCallback((_, node) => {
    const raw = rawNodes.find(r => r.id === node.id);
    setSelectedNode(raw || null);
  }, [rawNodes]);

  const handleMessage = useCallback(async (chartNode) => {
    if (!currentOrg || !chartNode) return;
    try {
      const me = JSON.parse(localStorage.getItem('openclaw_user') || '{}');
      const participant = { id: chartNode.node_ref_id, type: chartNode.node_type, name: chartNode.ref_data?.name || 'Unknown' };
      await msgAPI.createThread(currentOrg.id, {
        title: `Chat with ${participant.name}`,
        participants: [{ id: me.id, type: 'user', name: me.name }, participant]
      });
      toast.success('Thread created!');
      window.location.href = '/messages';
    } catch { toast.error('Failed to create thread'); }
  }, [currentOrg]);

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-full flex" data-testid="org-chart-page">
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView fitViewOptions={{ padding: 0.3 }}
          >
            {/* Neural background */}
            {layout === 'neural' ? (
              <Background color="rgba(34,211,238,0.06)" gap={30} size={1.5} />
            ) : (
              <Background color="rgba(255,255,255,0.04)" gap={24} />
            )}
            <Controls style={{ background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
            <MiniMap
              style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
              nodeColor={n => n.data?.avatarColor || '#22d3ee'}
            />

            {/* Top-left info */}
            <Panel position="top-left">
              <div className="p-3 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
                <h2 className="text-sm font-semibold mb-1" style={{ fontFamily: 'Space Grotesk' }}>Org Chart</h2>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{nodes.length} nodes · {layout} view</p>
              </div>
            </Panel>

            {/* Layout switcher */}
            <Panel position="top-right">
              <div className="flex items-center gap-2">
                {/* Layout pills */}
                <div className="flex rounded-xl overflow-hidden" style={{ background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {LAYOUTS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      data-testid={`layout-${id}`}
                      onClick={() => handleLayoutChange(id)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs"
                      style={{
                        background: layout === id ? 'rgba(34,211,238,0.15)' : 'transparent',
                        color: layout === id ? '#22d3ee' : 'rgba(255,255,255,0.5)',
                        borderRight: id !== 'swimlane' ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      }}
                    >
                      <Icon size={12} />{label}
                    </button>
                  ))}
                </div>
                <Button size="sm" variant="outline" onClick={fetchChart}
                  style={{ background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.1)', height: 34 }}>
                  <RefreshCw size={12} className="mr-1.5" />Refresh
                </Button>
              </div>
            </Panel>

            {/* Swim lane labels */}
            {layout === 'swimlane' && (
              <Panel position="top-left" style={{ top: 80 }}>
                <div className="space-y-2">
                  {[['HUMANS', 80], ['AGENTS', 320]].map(([label, top]) => (
                    <div key={label} className="px-3 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
                      ―― {label}
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      <AnimatePresence>
        {selectedNode && (
          <NodeInspector
            chartNode={selectedNode}
            orgId={currentOrg?.id}
            onClose={() => setSelectedNode(null)}
            onMessage={handleMessage}
            onRefresh={fetchChart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
