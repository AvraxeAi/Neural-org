import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrg } from '../contexts/OrgContext';
import { useWS } from '../contexts/WSContext';
import api, { boardAPI, agentAPI } from '../lib/api';
import { toast } from 'sonner';
import {
  Swords, Play, Square, ChevronRight, CheckCircle2, XCircle,
  HelpCircle, Minus, Zap, Brain, AlertTriangle, TrendingUp,
  Users, Clock, BarChart2, RefreshCw, Maximize2, Minimize2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Progress } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';

// ── Constants ──────────────────────────────────────────────────────────────
const STANCE = {
  approve:   { color:'#10b981', bg:'rgba(16,185,129,0.12)', border:'rgba(16,185,129,0.3)',  Icon: CheckCircle2, glow:'rgba(16,185,129,0.3)'  },
  reject:    { color:'#ef4444', bg:'rgba(239,68,68,0.12)',  border:'rgba(239,68,68,0.3)',   Icon: XCircle,      glow:'rgba(239,68,68,0.3)'   },
  abstain:   { color:'#6b7280', bg:'rgba(107,114,128,0.1)', border:'rgba(107,114,128,0.2)', Icon: Minus,        glow:'rgba(107,114,128,0.2)' },
  uncertain: { color:'#f59e0b', bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.3)',  Icon: HelpCircle,   glow:'rgba(245,158,11,0.3)'  },
};

// ── Typewriter hook ─────────────────────────────────────────────────────────
function useTypewriter(text, speed = 12, active = true) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!text || !active) { setDisplayed(text || ''); setDone(true); return; }
    setDisplayed('');
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, active]);
  return { displayed, done };
}

// ── Agent Card ──────────────────────────────────────────────────────────────
function AgentCard({ agent, snapshot, isThinking, isActive, round }) {
  const s = STANCE[snapshot?.stance] || STANCE.uncertain;
  const confidence = snapshot?.confidence ?? 0;
  const { displayed } = useTypewriter(
    snapshot?.reasoning || '',
    10,
    !isThinking && !!snapshot?.reasoning
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: isThinking ? 'rgba(34,211,238,0.04)' : snapshot ? s.bg : 'var(--surface-2)',
        border: isThinking ? '1px solid rgba(34,211,238,0.4)'
               : snapshot  ? `1px solid ${s.border}`
               : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isThinking ? `0 0 30px rgba(34,211,238,0.12)` : snapshot ? `0 0 20px ${s.glow}` : 'none',
        minHeight: 200,
      }}
      data-testid={`war-room-agent-${agent.name}`}
    >
      {/* Scan line for thinking agents */}
      {isThinking && (
        <motion.div
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute left-0 right-0 h-px z-10 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.6), transparent)' }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Avatar */}
        <div className="relative">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: (agent.avatar_color || '#a78bfa') + '25', border: `2px solid ${agent.avatar_color || '#a78bfa'}50` }}
          >
            <Brain size={18} style={{ color: agent.avatar_color || '#a78bfa' }} />
          </div>
          {/* Status ring */}
          {isThinking && (
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.2, 0.8] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: '#22d3ee' }}
            />
          )}
          {snapshot && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: s.color, border: '2px solid hsl(var(--background))' }}
            >
              <s.Icon size={10} style={{ color: 'white' }} />
            </motion.div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ fontFamily: 'Space Grotesk', color: 'rgba(255,255,255,0.95)' }}>
            {agent.name}
          </p>
          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{agent.role}</p>
        </div>

        {/* Stance badge */}
        {snapshot && (
          <motion.span
            initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold flex-shrink-0"
            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
          >
            <s.Icon size={11} />{snapshot.stance.toUpperCase()}
          </motion.span>
        )}
        {isThinking && (
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.9, repeat: Infinity }}
            className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
            style={{ background: 'rgba(34,211,238,0.12)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)' }}
          >
            Analyzing...
          </motion.span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-3">
        {isThinking && (
          <div className="space-y-2">
            {[60, 80, 45].map((w, i) => (
              <motion.div key={i}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                className="h-2 rounded-full"
                style={{ width: `${w}%`, background: 'rgba(34,211,238,0.2)' }}
              />
            ))}
          </div>
        )}

        {snapshot && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.80)', minHeight: 40 }}>
              {displayed || snapshot.reasoning || 'No reasoning provided'}
              {displayed && displayed.length < (snapshot.reasoning || '').length && (
                <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>|</motion.span>
              )}
            </p>

            {/* Confidence bar */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)', minWidth: 24 }}>CONF</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence * 100}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ background: s.color }}
                />
              </div>
              <span className="text-[10px] font-mono font-bold" style={{ color: s.color, minWidth: 32 }}>
                {Math.round(confidence * 100)}%
              </span>
            </div>

            {/* Risk score */}
            {snapshot.risk_score !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)', minWidth: 24 }}>RISK</span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${snapshot.risk_score * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full"
                    style={{ background: snapshot.risk_score > 0.7 ? '#ef4444' : snapshot.risk_score > 0.4 ? '#f59e0b' : '#10b981' }}
                  />
                </div>
                <span className="text-[10px] font-mono" style={{
                  color: snapshot.risk_score > 0.7 ? '#ef4444' : snapshot.risk_score > 0.4 ? '#f59e0b' : '#10b981',
                  minWidth: 32
                }}>
                  {Math.round(snapshot.risk_score * 100)}%
                </span>
              </div>
            )}

            {/* Concerns */}
            {snapshot.concerns?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {snapshot.concerns.slice(0, 2).map((c, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md"
                    style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                    ⚠ {c.slice(0, 30)}{c.length > 30 ? '...' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {!isThinking && !snapshot && (
          <div className="flex items-center justify-center h-full py-6">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Waiting...</p>
          </div>
        )}
      </div>

      {/* Round indicator */}
      {round && (
        <div className="absolute top-2 right-2">
          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>R{round}</span>
        </div>
      )}
    </motion.div>
  );
}

// ── Consensus Meter ─────────────────────────────────────────────────────────
function ConsensusMeter({ snapshots }) {
  const approve  = snapshots.filter(s => s.stance === 'approve').length;
  const reject   = snapshots.filter(s => s.stance === 'reject').length;
  const total    = snapshots.length;
  const pct      = total > 0 ? Math.round((approve / total) * 100) : 0;
  const trending = pct >= 50 ? 'APPROVE' : reject > 0 ? 'REJECT' : 'PENDING';
  const tColor   = pct >= 67 ? '#10b981' : pct >= 50 ? '#22d3ee' : pct <= 33 ? '#ef4444' : '#f59e0b';

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-[10px] font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>LIVE CONSENSUS</p>

      <div className="flex items-center justify-between mb-3">
        <motion.span
          key={trending}
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk', color: tColor }}>
          {pct}%
        </motion.span>
        <span className="text-xs font-semibold px-2 py-1 rounded-lg"
          style={{ background: tColor + '18', color: tColor, border: `1px solid ${tColor}30` }}>
          {trending}
        </span>
      </div>

      <div className="h-3 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full flex">
          <motion.div
            animate={{ width: total ? `${(approve / total) * 100}%` : '0%' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: '#10b981', borderRadius: '9999px 0 0 9999px' }}
          />
          <motion.div
            animate={{ width: total ? `${(reject / total) * 100}%` : '0%' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: '#ef4444', borderRadius: '0 9999px 9999px 0' }}
          />
        </div>
      </div>

      <div className="flex justify-between text-xs">
        <span style={{ color: '#10b981' }}>{approve} Approve</span>
        <span style={{ color: 'rgba(255,255,255,0.35)' }}>{total} voted</span>
        <span style={{ color: '#ef4444' }}>{reject} Reject</span>
      </div>
    </div>
  );
}

// ── Summary Verdict ─────────────────────────────────────────────────────────
function VerdictPanel({ summary }) {
  if (!summary) return null;
  const oc = summary.outcome === 'approve' ? '#10b981' : summary.outcome === 'reject' ? '#ef4444' : '#f59e0b';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: oc + '10', border: `1px solid ${oc}35`, boxShadow: `0 0 40px ${oc}15` }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: oc + '20', border: `1px solid ${oc}30` }}>
          <Brain size={18} style={{ color: oc }} />
        </div>
        <div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>FINAL VERDICT</p>
          <p className="text-lg font-bold uppercase" style={{ fontFamily: 'Space Grotesk', color: oc }}>
            {summary.outcome}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Vote</p>
          <p className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk' }}>
            {summary.vote_tally?.approve}✓ · {summary.vote_tally?.reject}✗
          </p>
        </div>
      </div>

      {summary.consensus && (
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {summary.consensus}
        </p>
      )}

      {summary.recommended_action && (
        <div className="p-3 rounded-xl" style={{ background: oc + '0A', border: `1px solid ${oc}20` }}>
          <p className="text-[10px] font-semibold mb-1" style={{ color: oc }}>RECOMMENDED ACTION</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{summary.recommended_action}</p>
        </div>
      )}
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function WarRoomPage() {
  const { currentOrg } = useOrg();
  const { on } = useWS();
  const [proposals, setProposals]     = useState([]);
  const [agents, setAgents]           = useState([]);
  const [sessions, setSessions]       = useState([]);
  const [selectedProposal, setSelectedProposal] = useState('');
  const [activeSession, setActiveSession]       = useState(null);
  const [snapshots, setSnapshots]     = useState([]);
  const [thinkingSet, setThinkingSet] = useState(new Set());
  const [starting, setStarting]       = useState(false);
  const [fullscreen, setFullscreen]   = useState(false);
  const bottomRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!currentOrg) return;
    const [pRes, aRes, sRes] = await Promise.all([
      boardAPI.listProposals(currentOrg.id),
      agentAPI.list(currentOrg.id),
      api.get(`/orgs/${currentOrg.id}/deliberations`),
    ]);
    setProposals(pRes.data.filter(p => p.status === 'open'));
    setAgents(aRes.data);
    setSessions(sRes.data);
  }, [currentOrg]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [snapshots]);

  useEffect(() => {
    if (!on) return;
    const u1 = on('deliberation.agent_thinking', d => {
      setThinkingSet(prev => new Set([...prev, d.agent_id]));
    });
    const u2 = on('deliberation.snapshot', d => {
      setThinkingSet(prev => { const s = new Set(prev); s.delete(d.snapshot.agent_id); return s; });
      setSnapshots(prev => {
        const exists = prev.find(x => x.id === d.snapshot.id);
        return exists ? prev.map(x => x.id === d.snapshot.id ? d.snapshot : x) : [...prev, d.snapshot];
      });
      if (activeSession) {
        setActiveSession(prev => prev ? {
          ...prev,
          snapshots: [...(prev.snapshots || []).filter(s => s.agent_id !== d.snapshot.agent_id), d.snapshot]
        } : prev);
      }
    });
    const u3 = on('deliberation.completed', d => {
      setThinkingSet(new Set());
      setActiveSession(prev => prev && d.delib_id === prev.id ? { ...prev, status: 'completed', summary: d.summary } : prev);
      fetchData();
      toast.success('War Room session complete!');
    });
    return () => { u1(); u2(); u3(); };
  }, [on, activeSession?.id, fetchData]);

  const startSession = async () => {
    if (!selectedProposal) { toast.error('Select a proposal'); return; }
    setStarting(true);
    setSnapshots([]); setThinkingSet(new Set());
    try {
      const res = await api.post(`/orgs/${currentOrg.id}/deliberations`, { proposal_id: selectedProposal, rounds: 1 });
      const proposal = proposals.find(p => p.id === selectedProposal);
      const session = { id: res.data.delib_id, status: 'running', snapshots: [], summary: null, proposal_title: proposal?.title || 'Proposal' };
      setActiveSession(session);
      setSessions(prev => [session, ...prev]);
      toast.success('War Room initiated — agents assembling...');
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to start'); }
    finally { setStarting(false); }
  };

  const openSession = async (s) => {
    const res = await api.get(`/deliberations/${s.id}`);
    setActiveSession(res.data);
    setSnapshots(res.data.snapshots || []);
    setThinkingSet(new Set());
  };

  const isRunning = activeSession?.status === 'running';
  const snapshotsByAgent = new Map();
  snapshots.forEach(s => snapshotsByAgent.set(s.agent_id, s));

  return (
    <div className="h-full flex flex-col" data-testid="war-room-page"
      style={{ background: 'hsl(var(--background))' }}>

      {/* Header Bar */}
      <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
        style={{
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center gap-2">
          <Swords size={16} style={{ color: '#ef4444' }} />
          <span className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk', letterSpacing: '0.05em' }}>WAR ROOM</span>
          {isRunning && (
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              LIVE
            </motion.div>
          )}
        </div>

        {activeSession && (
          <div className="flex-1 text-center">
            <p className="text-sm font-medium truncate" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {activeSession.proposal_title}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Proposal selector + start */}
          {!isRunning && (
            <>
              <Select value={selectedProposal} onValueChange={setSelectedProposal}>
                <SelectTrigger data-testid="war-room-proposal-select"
                  className="h-8 text-xs w-52"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <SelectValue placeholder="Select proposal..." />
                </SelectTrigger>
                <SelectContent style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {proposals.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.title}</SelectItem>)}
                  {proposals.length === 0 && <SelectItem value="none" disabled className="text-xs">No open proposals</SelectItem>}
                </SelectContent>
              </Select>
              <Button
                data-testid="start-war-room-button"
                onClick={startSession} disabled={starting || !selectedProposal}
                size="sm" className="h-8"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', border: 'none' }}
              >
                <Swords size={12} className="mr-1.5" />{starting ? 'Assembling...' : 'Begin'}
              </Button>
            </>
          )}
          <button onClick={() => setFullscreen(!fullscreen)} className="p-1.5 rounded-lg"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' }}>
            {fullscreen ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Session History ── */}
        <div className="w-56 flex-shrink-0 flex flex-col" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-3 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>SESSIONS ({sessions.length})</p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {sessions.map(s => (
                <button key={s.id} onClick={() => openSession(s)}
                  className="w-full text-left p-2.5 rounded-xl"
                  data-testid={`war-session-${s.id}`}
                  style={{
                    background: activeSession?.id === s.id ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
                    border: activeSession?.id === s.id ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{s.proposal_title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      s.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300' :
                      s.status === 'running'   ? 'bg-red-500/15 text-red-300' :
                      'bg-gray-500/15 text-gray-400'
                    }`}>{s.status}</span>
                    <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {(s.snapshots||[]).length} moves
                    </span>
                  </div>
                </button>
              ))}
              {sessions.length === 0 && <p className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.2)' }}>No sessions yet</p>}
            </div>
          </ScrollArea>
        </div>

        {/* ── Center: Agent Arena ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeSession ? (
            <ScrollArea className="flex-1 p-5">
              {/* Neural background grid */}
              <div className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(34,211,238,0.08) 1px, transparent 1px)',
                  backgroundSize: '30px 30px',
                }} />

              {/* Agent grid */}
              <div className={`grid gap-4 mb-6 ${
                agents.length <= 2 ? 'grid-cols-2' :
                agents.length <= 3 ? 'grid-cols-3' :
                agents.length <= 4 ? 'grid-cols-2 lg:grid-cols-4' :
                'grid-cols-2 lg:grid-cols-3'
              }`}>
                <AnimatePresence>
                  {agents.map(agent => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      snapshot={snapshotsByAgent.get(agent.id) || null}
                      isThinking={thinkingSet.has(agent.id)}
                      isActive={isRunning}
                      round={snapshotsByAgent.get(agent.id)?.round}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Verdict */}
              {activeSession.summary && (
                <VerdictPanel summary={activeSession.summary} />
              )}

              {/* Running state */}
              {isRunning && snapshots.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)' }}
                  >
                    <Brain size={36} style={{ color: '#ef4444' }} />
                  </motion.div>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Agents entering the war room...</p>
                </div>
              )}
              <div ref={bottomRef} />
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              {/* Neural-Org animated background orb */}
              <motion.div
                animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute w-96 h-96 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.08), transparent 70%)' }}
              />
              <div className="relative z-10 text-center">
                <div className="w-24 h-24 rounded-3xl mx-auto mb-6 flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <Swords size={40} style={{ color: '#ef4444' }} />
                </div>
                <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Space Grotesk' }}>War Room</h2>
                <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Watch your AI agents debate, challenge, and converge in real time.</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Select a proposal above and click <strong className="text-red-400">Begin</strong>.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Consensus + Debate Log ── */}
        {activeSession && (
          <div className="w-64 flex-shrink-0 flex flex-col" style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <ConsensusMeter snapshots={snapshots} />
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>DEBATE LOG</p>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                  <AnimatePresence>
                    {snapshots.map((snap, i) => (
                      <motion.div key={snap.id || i}
                        initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                        className="p-2.5 rounded-xl"
                        style={{
                          background: STANCE[snap.stance]?.bg || 'rgba(255,255,255,0.03)',
                          border: `1px solid ${STANCE[snap.stance]?.border || 'rgba(255,255,255,0.06)'}`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{snap.agent_name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                            style={{ background: STANCE[snap.stance]?.bg, color: STANCE[snap.stance]?.color }}>
                            {snap.stance?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {snap.reasoning?.slice(0, 80)}{snap.reasoning?.length > 80 ? '...' : ''}
                        </p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {snapshots.length === 0 && isRunning && (
                    <p className="text-xs text-center py-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Waiting for first move...</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
