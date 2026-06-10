import React, { useCallback, useState } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap, useNodesState, useEdgesState,
  addEdge, type Connection, type Edge, type Node,
  BackgroundVariant, MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Plus, Loader, X } from 'lucide-react';
import { memSvc } from '../../lib/memoryApi';
import { t } from '../../lib/designTokens';

const NODE_COLORS: Record<string, string> = {
  Person: '#00E6A8', Agent: '#3b82f6', Project: '#8b5cf6',
  Decision: '#f97316', Organization: '#ec4899', Skill: '#06b6d4',
  Outcome: '#f59e0b', Memory: '#10b981',
};
const RELS = ['WORKS_ON','RESULTED_IN','HAS_SKILL','PRODUCED','MEMBER_OF','SUPERSEDES','CONTRADICTS','SUPPORTS'];

const makeNode = (n: any): Node => {
  const color = NODE_COLORS[n.labels?.[0]] ?? '#6b7280';
  return {
    id: n.id || n.elementId,
    data: { label: n.properties?.name || n.properties?.key || n.id },
    position: { x: Math.random() * 560 + 40, y: Math.random() * 360 + 40 },
    style: { background: `${color}15`, border: `1.5px solid ${color}`, borderRadius: 8, padding: '7px 12px', color: t.textPrimary, fontSize: 12, fontWeight: 600, boxShadow: `0 0 10px ${color}25` },
  };
};

const makeEdge = (r: any): Edge => ({
  id: r.id || r.elementId,
  source: r.startNodeElementId || r.from,
  target: r.endNodeElementId || r.to,
  label: r.type,
  markerEnd: { type: MarkerType.ArrowClosed, color: t.accent },
  style: { stroke: 'rgba(0,230,168,0.3)', strokeWidth: 1.5 },
  labelStyle: { fontSize: 10, fill: t.textMuted, fontFamily: 'DM Mono, monospace' },
  labelBgStyle: { fill: t.surface, fillOpacity: 1 },
});

export function KnowledgeGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nodeId, setNodeId] = useState('');
  const [relOpen, setRelOpen] = useState(false);
  const [rel, setRel] = useState({ from: '', fromLabel: 'Agent', to: '', toLabel: 'Skill', relType: 'HAS_SKILL' });

  const explore = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true); setError('');
    try {
      const data = await memSvc.subgraph(id, 2);
      setNodes((data.nodes || []).map(makeNode));
      setEdges((data.relationships || data.edges || []).map(makeEdge));
    } catch (e: any) { setError(e.message || 'Failed'); }
    finally { setLoading(false); }
  }, []);

  const onConnect = useCallback((p: Connection) => setEdges(e => addEdge({ ...p, markerEnd: { type: MarkerType.ArrowClosed, color: t.accent }, style: { stroke: 'rgba(0,230,168,0.3)' } }, e)), []);

  const addRel = async () => { await memSvc.relate(rel); setRelOpen(false); if (nodeId) explore(nodeId); };

  const inp = { width: '100%', padding: '7px 9px', borderRadius: t.radiusSm, background: t.surface, border: `1px solid ${t.border}`, color: t.textPrimary, fontSize: 13, outline: 'none' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: t.bg }}>
      {/* Toolbar */}
      <div style={{ padding: '11px 18px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <GitBranch size={15} style={{ color: t.accent }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginRight: 6 }}>Knowledge Graph</span>
        <input value={nodeId} onChange={e => setNodeId(e.target.value)} onKeyDown={e => e.key === 'Enter' && explore(nodeId)}
          placeholder="Node ID to explore…"
          style={{ flex: 1, maxWidth: 300, padding: '6px 9px', borderRadius: t.radiusSm, background: t.surface, border: `1px solid ${t.border}`, color: t.textPrimary, fontSize: 13, outline: 'none' }} />
        <button onClick={() => explore(nodeId)}
          style={{ padding: '6px 12px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.accentDim, border: `1px solid ${t.accentBorder}`, color: t.accent, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          {loading ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : 'Explore'}
        </button>
        <button onClick={() => setRelOpen(true)}
          style={{ padding: '6px 12px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.purpleDim, border: `1px solid rgba(139,92,246,0.25)`, color: t.purple, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={12} /> Relate
        </button>
      </div>

      {error && <div style={{ margin: '10px 18px', padding: '8px 12px', borderRadius: t.radiusSm, background: t.redDim, border: `1px solid ${t.redBorder}`, color: t.red, fontSize: 12 }}>{error}</div>}

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        {nodes.length === 0 && !loading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <GitBranch size={44} style={{ color: t.textMuted, opacity: 0.2 }} />
            <p style={{ color: t.textMuted, fontSize: 13 }}>Enter a node ID above to explore</p>
          </div>
        ) : (
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView proOptions={{ hideAttribution: true }}>
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.04)" />
            <Controls style={{ background: t.surface, border: `1px solid ${t.border}` }} />
            <MiniMap nodeColor={n => (n.style?.border as string)?.match(/#[\w]+/)?.[0] ?? '#6b7280'} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8 }} />
          </ReactFlow>
        )}
      </div>

      {/* Legend */}
      <div style={{ padding: '8px 18px', borderTop: `1px solid ${t.border}`, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {Object.entries(NODE_COLORS).map(([lbl, color]) => (
          <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
            <span style={{ fontSize: 10, color: t.textMuted }}>{lbl}</span>
          </div>
        ))}
      </div>

      {/* Add relation modal */}
      <AnimatePresence>
        {relOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setRelOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ width: 380, background: t.bgSub, border: `1px solid ${t.border}`, borderRadius: t.radiusLg, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>Add Relationship</h3>
                <button onClick={() => setRelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted }}><X size={14} /></button>
              </div>
              {[['From Node ID', 'from'], ['To Node ID', 'to']].map(([lbl, key]) => (
                <div key={key} style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lbl}</label>
                  <input value={(rel as any)[key]} onChange={e => setRel(r => ({ ...r, [key]: e.target.value }))} style={inp} />
                </div>
              ))}
              {[['From Label', 'fromLabel'], ['To Label', 'toLabel']].map(([lbl, key]) => (
                <div key={key} style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lbl}</label>
                  <select value={(rel as any)[key]} onChange={e => setRel(r => ({ ...r, [key]: e.target.value }))} style={inp}>
                    {Object.keys(NODE_COLORS).map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relationship</label>
                <select value={rel.relType} onChange={e => setRel(r => ({ ...r, relType: e.target.value }))} style={inp}>
                  {RELS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setRelOpen(false)} style={{ flex: 1, padding: '8px', borderRadius: t.radiusSm, cursor: 'pointer', background: 'none', border: `1px solid ${t.border}`, color: t.textSecond, fontSize: 13, fontWeight: 600 }}>Cancel</button>
                <button onClick={addRel} style={{ flex: 2, padding: '8px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.accent, border: 'none', color: '#0d1117', fontSize: 13, fontWeight: 700 }}>Create</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
