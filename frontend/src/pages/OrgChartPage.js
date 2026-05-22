import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ReactFlow,
  ReactFlowProvider, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge, Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrg } from '../contexts/OrgContext';
import { useWS } from '../contexts/WSContext';
import { chartAPI, agentAPI, orgAPI, msgAPI } from '../lib/api';
import { toast } from 'sonner';
import { Network, Plus, MessageSquare, User, Bot, Crown, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import OrgChartNode from '../components/OrgChart/OrgChartNode';
import NodeInspector from '../components/OrgChart/NodeInspector';

const nodeTypes = { orgNode: OrgChartNode };

export default function OrgChartPage() {
  const { currentOrg } = useOrg();
  const { on } = useWS();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [rawNodes, setRawNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const rfRef = useRef(null);

  const buildFlowNodes = (chartNodes) => {
    const flowNodes = chartNodes.map(cn => ({
      id: cn.id,
      type: 'orgNode',
      position: cn.position || {x: 200, y: 200},
      data: {
        chartNode: cn,
        nodeType: cn.node_type,
        name: cn.ref_data?.name || 'Unknown',
        role: cn.ref_data?.role || (cn.node_type === 'user' ? 'Member' : 'Agent'),
        status: cn.ref_data?.status || (cn.node_type === 'user' ? 'active' : 'idle'),
        isBoardMember: cn.is_board_member,
        avatarColor: cn.ref_data?.avatar_color || '#22d3ee',
        skills: cn.ref_data?.skills || [],
      },
    }));

    const flowEdges = chartNodes
      .filter(cn => cn.manager_id)
      .map(cn => ({
        id: `e-${cn.manager_id}-${cn.id}`,
        source: cn.manager_id,
        target: cn.id,
        style: { stroke: 'rgba(34,211,238,0.35)', strokeWidth: 2 },
        animated: false,
      }));

    return { flowNodes, flowEdges };
  };

  const fetchChart = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const res = await chartAPI.get(currentOrg.id);
      setRawNodes(res.data);
      const { flowNodes, flowEdges } = buildFlowNodes(res.data);
      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch { toast.error('Failed to load org chart'); }
    finally { setLoading(false); }
  }, [currentOrg]);

  useEffect(() => { fetchChart(); }, [fetchChart]);

  useEffect(() => {
    if (!on) return;
    const unsub = on('chart_updated', () => fetchChart());
    const unsub2 = on('agent_created', () => fetchChart());
    const unsub3 = on('agent_deleted', () => fetchChart());
    return () => { unsub(); unsub2(); unsub3(); };
  }, [on, fetchChart]);

  const onNodeDragStop = useCallback(async (event, node) => {
    if (!currentOrg) return;
    try {
      await chartAPI.updateNode(currentOrg.id, node.id, { position: node.position });
    } catch { }
  }, [currentOrg]);

  const onConnect = useCallback(async (params) => {
    const newEdge = { ...params, style: { stroke: 'rgba(34,211,238,0.35)', strokeWidth:2 } };
    setEdges(eds => addEdge(newEdge, eds));
    // update manager_id
    try {
      await chartAPI.updateNode(currentOrg.id, params.target, { manager_id: params.source });
    } catch { }
  }, [currentOrg]);

  const onNodeClick = useCallback((event, node) => {
    const raw = rawNodes.find(rn => rn.id === node.id);
    setSelectedNode(raw || null);
  }, [rawNodes]);

  const handleMessage = useCallback(async (chartNode) => {
    if (!currentOrg || !chartNode) return;
    try {
      const me = JSON.parse(localStorage.getItem('openclaw_user') || '{}');
      const participant = {
        id: chartNode.node_ref_id,
        type: chartNode.node_type,
        name: chartNode.ref_data?.name || 'Unknown'
      };
      const res = await msgAPI.createThread(currentOrg.id, {
        title: `Chat with ${participant.name}`,
        participants: [
          { id: me.id, type: 'user', name: me.name },
          participant
        ]
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
            ref={rfRef}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{padding:0.3}}
          >
            <Background color="rgba(255,255,255,0.04)" gap={24} />
            <Controls style={{background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12}} />
            <MiniMap
              style={{background:'hsl(var(--card))', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8}}
              nodeColor={(n) => n.data?.avatarColor || '#22d3ee'}
            />
            <Panel position="top-left">
              <div className="p-3 rounded-xl" style={{background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.08)', backdropFilter:'blur(12px)'}}>
                <h2 className="text-sm font-semibold mb-1" style={{fontFamily:'Space Grotesk'}}>Org Chart</h2>
                <p className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>
                  {nodes.length} node{nodes.length!==1?'s':''} · Drag to re-parent
                </p>
              </div>
            </Panel>
            <Panel position="top-right">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={fetchChart}
                  style={{background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.1)'}}>
                  <RefreshCw size={13} className="mr-1.5" />Refresh
                </Button>
              </div>
            </Panel>
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {/* Right Inspector */}
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
