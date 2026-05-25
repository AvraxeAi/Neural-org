import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, Panel,
  useNodesState, useEdgesState, addEdge, ConnectionLineType, MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrg } from '../contexts/OrgContext';
import { useWS } from '../contexts/WSContext';
import { chartAPI, msgAPI } from '../lib/api';
import api from '../lib/api';
import { toast } from 'sonner';
import {
  Network, RefreshCw, GitBranch, Circle, Layers, Radio,
  History, X, ChevronDown, Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { AnimatePresence as AP } from 'framer-motion';
import OrgChartNode from '../components/OrgChart/OrgChartNode';
import NodeEditPanel from '../components/OrgChart/NodeEditPanel';
import GovernanceBar from '../components/OrgChart/GovernanceBar';
import CustomEdge from '../components/OrgChart/CustomEdge';
import AuditLogPanel from '../components/OrgChart/AuditLogPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { EDGE_LABELS } from '../components/OrgChart/NodeEditPanel';
import * as d3 from 'd3-force';

const nodeTypes = { orgNode: OrgChartNode };
const edgeTypes = { custom: CustomEdge };

const LAYOUTS = [
  { id: 'tree',     label: 'Tree',      Icon: GitBranch },
  { id: 'radial',   label: 'Radial',    Icon: Circle },
  { id: 'neural',   label: 'Neural',    Icon: Radio },
  { id: 'swimlane', label: 'Swim Lane', Icon: Layers },
];

// ── Layout algorithms ──────────────────────────────────────────────────────
function computeTreeLayout(chartNodes) {
  const roots = chartNodes.filter(n => !n.manager_id);
  const positions = {};
  let col = 0;
  function place(node, depth) {
    positions[node.id] = { x: col * 290, y: depth * 190 };
    col++;
    chartNodes.filter(n => n.manager_id === node.id).forEach(c => place(c, depth+1));
  }
  roots.forEach(r => place(r, 0));
  chartNodes.forEach(n => { if (!positions[n.id]) { positions[n.id] = { x: col*290, y: 0 }; col++; } });
  return positions;
}
function computeRadialLayout(chartNodes) {
  const n = chartNodes.length; if (!n) return {};
  const cx = 500, cy = 350, positions = {};
  const roots = chartNodes.filter(nd => !nd.manager_id);
  roots.forEach((r,ri) => {
    const a = (ri/roots.length)*2*Math.PI;
    positions[r.id] = { x: cx + 100*Math.cos(a), y: cy + 100*Math.sin(a) };
    const children = chartNodes.filter(nd => nd.manager_id === r.id);
    children.forEach((c,ci) => {
      const ca = (ci/Math.max(children.length,1))*2*Math.PI;
      positions[c.id] = { x: cx + 280*Math.cos(ca), y: cy + 280*Math.sin(ca) };
    });
  });
  chartNodes.forEach(nd => { if (!positions[nd.id]) positions[nd.id] = { x: cx, y: cy }; });
  return positions;
}
function computeForceLayout(chartNodes) {
  if (!chartNodes.length) return {};
  const sim_nodes = chartNodes.map(n => ({ id: n.id, x: Math.random()*800+100, y: Math.random()*600+100 }));
  const edges_data = chartNodes.filter(n => n.manager_id).map(n => ({ source: n.manager_id, target: n.id }));
  const sim = d3.forceSimulation(sim_nodes)
    .force('link', d3.forceLink(edges_data).id(d=>d.id).distance(200).strength(0.8))
    .force('charge', d3.forceManyBody().strength(-450))
    .force('center', d3.forceCenter(500,380))
    .force('collision', d3.forceCollide(110))
    .stop();
  for (let i=0; i<320; i++) sim.tick();
  const positions = {};
  sim_nodes.forEach(n => { positions[n.id] = { x: n.x, y: n.y }; });
  return positions;
}
function computeSwimLaneLayout(chartNodes) {
  const users  = chartNodes.filter(n => n.node_type === 'user');
  const agents = chartNodes.filter(n => n.node_type !== 'user');
  const positions = {};
  users.forEach( (n,i) => { positions[n.id] = { x: 100+i*290, y: 100 }; });
  agents.forEach((n,i) => { positions[n.id] = { x: 100+i*290, y: 340 }; });
  return positions;
}

function buildFlow(chartNodes, positions, layout, edgeLabelMap) {
  const flowNodes = chartNodes.map(cn => ({
    id: cn.id, type: 'orgNode',
    position: positions[cn.id] || { x: 200, y: 200 },
    data: {
      chartNode: cn, nodeType: cn.node_type,
      name: cn.ref_data?.name || 'Unknown',
      role: cn.ref_data?.role || (cn.node_type==='user'?'Member':'Agent'),
      status: cn.ref_data?.status || 'idle',
      isBoardMember: cn.is_board_member,
      avatarColor: cn.ref_data?.avatar_color || '#22d3ee',
      skills: cn.ref_data?.skills || [],
      isGuestDelegate: cn.is_guest_delegate,
      isMyDelegate: cn.is_my_delegate,
      isNeuralLayout: layout === 'neural',
      providerBadge: cn.ref_data?.provider_badge_computed || cn.ref_data?.provider_badge || '',
      department: cn.ref_data?.department || '',
    },
  }));

  const flowEdges = chartNodes.filter(cn => cn.manager_id).map(cn => {
    const labelKey = `${cn.manager_id}-${cn.id}`;
    const label = edgeLabelMap?.[labelKey] || '';
    return {
      id: `e-${cn.manager_id}-${cn.id}`,
      source: cn.manager_id, target: cn.id,
      type: 'custom',
      data: { label, animated: layout === 'neural' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(34,211,238,0.4)', width: 14, height: 14 },
    };
  });

  return { flowNodes, flowEdges };
}

export default function OrgChartPage() {
  const { currentOrg } = useOrg();
  const { on } = useWS();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rawNodes, setRawNodes] = useState([]);
  const [edgeLabelMap, setEdgeLabelMap] = useState({});
  const [layout, setLayout] = useState('tree');
  const [selectedNode, setSelectedNode] = useState(null);
  const [governance, setGovernance] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [edgeLabelPicker, setEdgeLabelPicker] = useState(null); // {edgeId, sourceId, targetId}
  const [loading, setLoading] = useState(true);

  // Undo/Redo
  const historyRef = useRef({ past: [], future: [] });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushHistory = useCallback((n, e) => {
    historyRef.current.past.push({ nodes: n.map(x=>({...x})), edges: e.map(x=>({...x})) });
    historyRef.current.future = [];
    setCanUndo(true); setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (!historyRef.current.past.length) return;
    historyRef.current.future.push({ nodes: [...nodes], edges: [...edges] });
    const prev = historyRef.current.past.pop();
    setNodes(prev.nodes); setEdges(prev.edges);
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(true);
  }, [nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (!historyRef.current.future.length) return;
    historyRef.current.past.push({ nodes: [...nodes], edges: [...edges] });
    const next = historyRef.current.future.pop();
    setNodes(next.nodes); setEdges(next.edges);
    setCanRedo(historyRef.current.future.length > 0);
    setCanUndo(true);
  }, [nodes, edges, setNodes, setEdges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handle = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [undo, redo]);

  const isGoverned = governance?.is_governed && !governance?.emergency_override;

  const applyLayout = useCallback((chartNodes, lyt, labelMap) => {
    let positions;
    switch (lyt) {
      case 'radial':   positions = computeRadialLayout(chartNodes);   break;
      case 'neural':   positions = computeForceLayout(chartNodes);    break;
      case 'swimlane': positions = computeSwimLaneLayout(chartNodes); break;
      default:         positions = computeTreeLayout(chartNodes);     break;
    }
    const { flowNodes, flowEdges } = buildFlow(chartNodes, positions, lyt, labelMap);
    setNodes(flowNodes); setEdges(flowEdges);
  }, [setNodes, setEdges]);

  const fetchChart = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [chartRes, govRes] = await Promise.all([
        chartAPI.get(currentOrg.id),
        api.get(`/orgs/${currentOrg.id}/chart/governance`),
      ]);
      // chartRes.data is now {nodes, edge_labels}
      const chartData = chartRes.data;
      const chartNodes = Array.isArray(chartData) ? chartData : (chartData.nodes || []);
      const labelMap   = Array.isArray(chartData) ? {} : (chartData.edge_labels || {});
      setRawNodes(chartNodes);
      setEdgeLabelMap(labelMap);
      setGovernance(govRes.data);
      applyLayout(chartNodes, layout, labelMap);
    } catch { toast.error('Failed to load org chart'); }
    finally { setLoading(false); }
  }, [currentOrg, layout, applyLayout]);

  useEffect(() => { fetchChart(); }, [fetchChart]);

  useEffect(() => {
    if (!on) return;
    const u1 = on('chart.updated', () => fetchChart());
    const u2 = on('chart.governance_changed', (d) => {
      setGovernance(prev => prev ? {...prev, ...d} : d);
    });
    const u3 = on('chart.proposal_created', () => fetchChart());
    return () => { u1(); u2(); u3(); };
  }, [on, fetchChart]);

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    applyLayout(rawNodes, newLayout, edgeLabelMap);
  };

  const onNodeDragStop = useCallback(async (_, node) => {
    if (!currentOrg) return;
    pushHistory(nodes, edges);
    try { await api.put(`/orgs/${currentOrg.id}/chart/nodes/${node.id}`, { position: node.position }); } catch {}
  }, [currentOrg, nodes, edges, pushHistory]);

  const onConnect = useCallback((params) => {
    pushHistory(nodes, edges);
    const newEdge = {
      ...params,
      id: `e-${params.source}-${params.target}`,
      type: 'custom',
      data: { label: '', animated: layout === 'neural',
              onDeleteEdge: handleEdgeDelete },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(34,211,238,0.4)', width:14, height:14 },
    };
    setEdges(eds => addEdge(newEdge, eds));
    // Open label picker
    setEdgeLabelPicker({ edgeId: newEdge.id, sourceId: params.source, targetId: params.target });
    if (isGoverned) {
      // Create governance proposal for hierarchy change
      const srcNode = rawNodes.find(n => n.id === params.source);
      const tgtNode = rawNodes.find(n => n.id === params.target);
      proposeChange({
        change_type: 'manager_change',
        subject_id:   params.target,
        subject_name: tgtNode?.ref_data?.name || 'Node',
        ref_id:       params.target,
        before: { manager_id: tgtNode?.manager_id || null },
        after:  { manager_id: params.source },
        reason: '',
        edge_source: params.source,
        edge_target: params.target,
      }).catch(() => {});
    } else {
      // Apply directly
      api.put(`/orgs/${currentOrg.id}/chart/nodes/${params.target}`, { manager_id: params.source }).catch(() => {});
    }
  }, [nodes, edges, layout, isGoverned, rawNodes, currentOrg, pushHistory]);

  const handleEdgeDelete = useCallback(async (edgeId) => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return;
    const tgtNode = rawNodes.find(n => n.id === edge.target);
    if (isGoverned) {
      await proposeChange({
        change_type: 'edge_delete',
        subject_id:   edge.target,
        subject_name: tgtNode?.ref_data?.name || 'Node',
        before: { manager_id: tgtNode?.manager_id || edge.source },
        after:  { manager_id: null },
        reason: '',
        edge_source: edge.source,
        edge_target: edge.target,
      });
    } else {
      pushHistory(nodes, edges);
      setEdges(prev => prev.filter(e => e.id !== edgeId));
      await api.put(`/orgs/${currentOrg.id}/chart/nodes/${edge.target}`, { manager_id: null }).catch(() => {});
    }
  }, [edges, nodes, rawNodes, isGoverned, currentOrg, pushHistory]);

  const onNodeClick = useCallback((_, node) => {
    const raw = rawNodes.find(r => r.id === node.id);
    setSelectedNode(raw || null);
  }, [rawNodes]);

  // Set edge label (draft mode)
  const applyEdgeLabel = async (label) => {
    const { edgeId, sourceId, targetId } = edgeLabelPicker;
    setEdges(prev => prev.map(e => e.id === edgeId ? {...e, data: {...e.data, label}} : e));
    setEdgeLabelPicker(null);
    if (!isGoverned) {
      await api.put(`/orgs/${currentOrg.id}/chart/edge-labels`, { source: sourceId, target: targetId, label }).catch(() => {});
    }
  };

  // Save node inline (draft mode)
  const handleSaveNode = async (nodeId, form) => {
    if (!currentOrg) return;
    try {
      await api.put(`/orgs/${currentOrg.id}/chart/nodes/${nodeId}/inline`, form);
      toast.success('Node updated');
      fetchChart();
    } catch { toast.error('Failed to update node'); }
  };

  // Create change proposal (governed mode)
  const proposeChange = async (data) => {
    if (!currentOrg) return;
    try {
      await api.post(`/orgs/${currentOrg.id}/chart/change-proposals`, data);
      toast.success('Change proposal submitted — board vote required');
      fetchChart();
    } catch { toast.error('Failed to create proposal'); }
  };

  // Governance actions
  const handleFinalize = async (label, reason) => {
    await api.post(`/orgs/${currentOrg.id}/chart/finalize`, { label, reason });
    toast.success('Org chart finalized — Governed Mode active');
    fetchChart();
  };
  const handleEmergencyUnlock = async (reason) => {
    await api.post(`/orgs/${currentOrg.id}/chart/emergency-unlock`, { reason });
    toast.warning('Emergency override activated — changes will be logged');
    fetchChart();
  };
  const handleReLock = async () => {
    await api.post(`/orgs/${currentOrg.id}/chart/re-lock`);
    toast.success('Chart re-locked — Governed Mode restored');
    fetchChart();
  };

  const fetchAuditLog = async () => {
    setAuditLoading(true);
    try {
      const res = await api.get(`/orgs/${currentOrg.id}/chart/audit-log`);
      setAuditLog(res.data);
    } catch {} finally { setAuditLoading(false); }
  };

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Pass onDeleteEdge handler to edge data
  const edgesWithHandler = edges.map(e => ({
    ...e,
    data: { ...e.data, onDeleteEdge: handleEdgeDelete },
  }));

  return (
    <div className="h-full flex flex-col" data-testid="org-chart-page">
      {/* Governance bar */}
      <GovernanceBar
        governance={governance}
        onFinalize={handleFinalize}
        onEmergencyUnlock={handleEmergencyUnlock}
        onReLock={handleReLock}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Chart canvas */}
        <div className="flex-1 relative">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edgesWithHandler}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStop={onNodeDragStop}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              connectionLineType={ConnectionLineType.Bezier}
              fitView
              fitViewOptions={{ padding: 0.3 }}
            >
              {layout === 'neural' ? (
                <Background color="rgba(34,211,238,0.05)" gap={28} size={1.5} />
              ) : (
                <Background color="rgba(255,255,255,0.04)" gap={24} />
              )}
              <Controls style={{ background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12 }} />
              <MiniMap
                style={{ background:'hsl(var(--card))', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8 }}
                nodeColor={n => n.data?.avatarColor || '#22d3ee'}
              />
              <Panel position="top-left">
                <div className="p-3 rounded-xl" style={{ background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.08)', backdropFilter:'blur(12px)' }}>
                  <h2 className="text-sm font-semibold mb-1" style={{ fontFamily:'Space Grotesk' }}>Org Chart</h2>
                  <p className="text-xs" style={{ color:'rgba(255,255,255,0.4)' }}>
                    {nodes.length} nodes · {layout}
                    {isGoverned ? ' · 🔒 Governed' : ' · ✏️ Draft'}
                  </p>
                </div>
              </Panel>
              <Panel position="top-right">
                <div className="flex items-center gap-2">
                  <div className="flex rounded-xl overflow-hidden" style={{ background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.08)' }}>
                    {LAYOUTS.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        data-testid={`layout-${id}`}
                        onClick={() => handleLayoutChange(id)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs"
                        style={{
                          background: layout===id ? 'rgba(34,211,238,0.15)' : 'transparent',
                          color: layout===id ? '#22d3ee' : 'rgba(255,255,255,0.5)',
                          borderRight: id!=='swimlane' ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        }}
                      >
                        <Icon size={12}/>{label}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" onClick={fetchChart}
                    style={{ background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.1)', height:34 }}>
                    <RefreshCw size={12} className="mr-1.5"/>Refresh
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setAuditOpen(true); fetchAuditLog(); }}
                    data-testid="audit-log-button"
                    style={{ background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.1)', height:34 }}>
                    <History size={12} className="mr-1.5"/>Audit
                  </Button>
                </div>
              </Panel>
            </ReactFlow>
          </ReactFlowProvider>

          {/* Edge label picker popup */}
          <AnimatePresence>
            {edgeLabelPicker && (
              <motion.div
                initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.9 }}
                className="absolute top-24 left-1/2 -translate-x-1/2 z-50 rounded-xl overflow-hidden"
                style={{ background:'hsl(var(--card))', border:'1px solid rgba(255,255,255,0.15)', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}
              >
                <div className="px-3 py-2" style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-xs font-semibold" style={{ fontFamily:'Space Grotesk' }}>Set relationship type</p>
                  <p className="text-[10px]" style={{ color:'rgba(255,255,255,0.4)' }}>Optional — press Esc to skip</p>
                </div>
                <div className="p-2 grid grid-cols-2 gap-1">
                  {EDGE_LABELS.map(label => (
                    <button key={label} onClick={() => applyEdgeLabel(label)}
                      className="px-3 py-1.5 rounded-lg text-xs text-left hover:bg-white/5"
                      style={{ color:'rgba(255,255,255,0.8)' }}>{label}</button>
                  ))}
                  <button onClick={() => setEdgeLabelPicker(null)}
                    className="px-3 py-1.5 rounded-lg text-xs col-span-2"
                    style={{ color:'rgba(255,255,255,0.4)' }}>Skip</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Node edit panel */}
        <AnimatePresence>
          {selectedNode && (
            <NodeEditPanel
              chartNode={selectedNode}
              isGoverned={isGoverned}
              onSave={handleSaveNode}
              onPropose={proposeChange}
              onClose={() => setSelectedNode(null)}
              orgId={currentOrg?.id}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Audit Log Sheet */}
      <Sheet open={auditOpen} onOpenChange={setAuditOpen}>
        <SheetContent side="right" className="w-96 p-0"
          style={{ background:'hsl(var(--card))', border:'1px solid rgba(255,255,255,0.08)' }}>
          <SheetHeader className="px-4 py-3" style={{ borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            <SheetTitle className="text-sm flex items-center gap-2" style={{ fontFamily:'Space Grotesk' }}>
              <History size={14} style={{ color:'#22d3ee' }}/>Audit Trail
            </SheetTitle>
          </SheetHeader>
          <AuditLogPanel entries={auditLog} loading={auditLoading} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
