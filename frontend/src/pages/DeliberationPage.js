import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrg } from '../contexts/OrgContext';
import { useWS } from '../contexts/WSContext';
import api, { boardAPI } from '../lib/api';
import { toast } from 'sonner';
import {
  Brain, Play, Zap, CheckCircle2, XCircle, HelpCircle, Minus,
  ChevronDown, ChevronUp, Sparkles, AlertCircle, Bot, Clock, RefreshCw
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { Progress } from '../components/ui/progress';

const STANCE_CONFIG = {
  approve:   { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  Icon: CheckCircle2, label: 'Approve' },
  reject:    { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   Icon: XCircle,      label: 'Reject' },
  abstain:   { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.3)', Icon: Minus,        label: 'Abstain' },
  uncertain: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  Icon: HelpCircle,   label: 'Uncertain' },
};

function AgentThinking({ snapshot, isThinking }) {
  const s = STANCE_CONFIG[snapshot?.stance] || STANCE_CONFIG.uncertain;
  const { Icon } = s;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22,1,0.36,1] }}
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: isThinking ? 'rgba(34,211,238,0.04)' : s.bg,
        border: isThinking ? '1px solid rgba(34,211,238,0.3)' : `1px solid ${s.border}`,
        boxShadow: isThinking ? '0 0 20px rgba(34,211,238,0.1)' : 'none',
      }}
      data-testid={`agent-snapshot-${snapshot?.agent_name}`}
    >
      {/* Thinking shimmer */}
      {isThinking && (
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <motion.div
            animate={{ x: ['-100%','200%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-y-0 w-1/3"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.08), transparent)' }}
          />
        </div>
      )}

      <div className="flex items-start gap-3 relative z-10">
        {/* Agent avatar */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: (snapshot?.agent_color||'#a78bfa')+'25',
                   border: `1.5px solid ${snapshot?.agent_color||'#a78bfa'}40` }}>
          <Bot size={16} style={{ color: snapshot?.agent_color || '#a78bfa' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk', color: 'rgba(255,255,255,0.9)' }}>
              {snapshot?.agent_name || 'Agent'}
            </span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{snapshot?.agent_role}</span>
            {isThinking ? (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)' }}>
                <motion.div animate={{ opacity: [1,0.3,1] }} transition={{ duration: 1, repeat: Infinity }}>
                  <Sparkles size={10} />
                </motion.div>
                thinking...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                <Icon size={10} />{s.label}
              </span>
            )}
          </div>

          {!isThinking && snapshot?.reasoning && (
            <>
              <p className="text-sm leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {snapshot.reasoning}
              </p>

              {snapshot.concerns?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {snapshot.concerns.slice(0,3).map((c,i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                      ⚠ {c}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Confidence</span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)', maxWidth: 80 }}>
                  <div className="h-full rounded-full" style={{ width: `${(snapshot.confidence||0)*100}%`, background: s.color, transition: 'width 0.5s' }} />
                </div>
                <span className="text-[10px] font-mono" style={{ color: s.color }}>
                  {Math.round((snapshot.confidence||0)*100)}%
                </span>
              </div>
            </>
          )}
        </div>

        {snapshot?.round && (
          <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
            R{snapshot.round}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function SummaryPanel({ summary }) {
  if (!summary) return null;
  const outcomeColors = { approve:'#10b981', reject:'#ef4444', split:'#f59e0b', inconclusive:'#6b7280' };
  const oc = outcomeColors[summary.outcome] || '#6b7280';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22,1,0.36,1] }}
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
      data-testid="deliberation-summary"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: oc+'20', border: `1px solid ${oc}30` }}>
          <Brain size={18} style={{ color: oc }} />
        </div>
        <div>
          <h3 className="font-semibold text-sm" style={{ fontFamily: 'Space Grotesk' }}>Deliberation Complete</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: oc+'18', color: oc, border: `1px solid ${oc}25` }}>
              {summary.outcome?.toUpperCase()}
            </span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {summary.vote_tally?.approve}✓ {summary.vote_tally?.reject}✗ {summary.vote_tally?.abstain}-
            </span>
          </div>
        </div>
      </div>

      {summary.consensus && (
        <p className="text-sm leading-relaxed mb-4 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {summary.consensus}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        {summary.key_arguments_for?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold mb-1.5" style={{ color: '#10b981' }}>FOR</p>
            {summary.key_arguments_for.map((a,i) => (
              <p key={i} className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>• {a}</p>
            ))}
          </div>
        )}
        {summary.key_arguments_against?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold mb-1.5" style={{ color: '#ef4444' }}>AGAINST</p>
            {summary.key_arguments_against.map((a,i) => (
              <p key={i} className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>• {a}</p>
            ))}
          </div>
        )}
      </div>

      {summary.recommended_action && (
        <div className="px-3 py-2.5 rounded-xl" style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}>
          <p className="text-[10px] font-semibold mb-1" style={{ color: '#22d3ee' }}>RECOMMENDED ACTION</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>{summary.recommended_action}</p>
        </div>
      )}
    </motion.div>
  );
}

export default function DeliberationPage() {
  const { currentOrg } = useOrg();
  const { on } = useWS();
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState('');
  const [deliberations, setDeliberations] = useState([]);
  const [activeDelib, setActiveDelib] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [thinkingAgents, setThinkingAgents] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const bottomRef = useRef(null);

  const fetchProposals = useCallback(async () => {
    if (!currentOrg) return;
    const res = await boardAPI.listProposals(currentOrg.id);
    setProposals(res.data.filter(p => p.status === 'open'));
  }, [currentOrg]);

  const fetchDeliberations = useCallback(async () => {
    if (!currentOrg) return;
    const res = await api.get(`/orgs/${currentOrg.id}/deliberations`);
    setDeliberations(res.data);
  }, [currentOrg]);

  useEffect(() => { fetchProposals(); fetchDeliberations(); }, [fetchProposals, fetchDeliberations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [snapshots]);

  useEffect(() => {
    if (!on) return;
    const u1 = on('deliberation.agent_thinking', (data) => {
      setThinkingAgents(prev => new Set([...prev, data.agent_id]));
    });
    const u2 = on('deliberation.snapshot', (data) => {
      setThinkingAgents(prev => { const s = new Set(prev); s.delete(data.snapshot.agent_id); return s; });
      setSnapshots(prev => [...prev, data.snapshot]);
      if (activeDelib && data.delib_id === activeDelib.id) {
        setActiveDelib(prev => prev ? { ...prev, snapshots: [...(prev.snapshots||[]), data.snapshot] } : prev);
      }
    });
    const u3 = on('deliberation.completed', (data) => {
      setThinkingAgents(new Set());
      if (activeDelib && data.delib_id === activeDelib.id) {
        setActiveDelib(prev => prev ? { ...prev, status: 'completed', summary: data.summary } : prev);
      }
      fetchDeliberations();
      toast.success('Deliberation complete!');
    });
    return () => { u1(); u2(); u3(); };
  }, [on, activeDelib?.id, fetchDeliberations]);

  const startDeliberation = async () => {
    if (!selectedProposal) { toast.error('Select a proposal first'); return; }
    setStarting(true);
    setSnapshots([]);
    setThinkingAgents(new Set());
    try {
      const res = await api.post(`/orgs/${currentOrg.id}/deliberations`, {
        proposal_id: selectedProposal, rounds: 1
      });
      const delib = { id: res.data.delib_id, status: 'running', snapshots: [], summary: null,
        proposal_title: proposals.find(p => p.id === selectedProposal)?.title || 'Proposal' };
      setActiveDelib(delib);
      setDeliberations(prev => [delib, ...prev]);
      toast.info('Deliberation started — agents are thinking...');
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to start deliberation'); }
    finally { setStarting(false); }
  };

  const openExisting = async (d) => {
    const res = await api.get(`/deliberations/${d.id}`);
    setActiveDelib(res.data);
    setSnapshots(res.data.snapshots || []);
    setThinkingAgents(new Set());
  };

  const isRunning = activeDelib?.status === 'running';

  return (
    <div className="h-full flex" data-testid="deliberation-page">
      {/* Left panel */}
      <div className="w-72 flex-shrink-0 flex flex-col" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)' }}>
              <Brain size={15} style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Deliberation Room</h2>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>AI agents debate proposals</p>
            </div>
          </div>

          {/* Start new */}
          <div className="space-y-2">
            <Select value={selectedProposal} onValueChange={setSelectedProposal}>
              <SelectTrigger data-testid="proposal-select" className="h-9 text-xs"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <SelectValue placeholder="Select proposal..." />
              </SelectTrigger>
              <SelectContent style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.1)' }}>
                {proposals.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.title}</SelectItem>
                ))}
                {proposals.length === 0 && <SelectItem value="none" disabled className="text-xs">No open proposals</SelectItem>}
              </SelectContent>
            </Select>
            <Button
              data-testid="start-deliberation-button"
              onClick={startDeliberation}
              disabled={starting || isRunning || !selectedProposal}
              className="w-full h-9"
              style={{ background: 'rgba(167,139,250,0.2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)' }}
            >
              {starting ? (
                <><div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-2" />Starting...</>
              ) : isRunning ? (
                <><motion.div animate={{ opacity: [1,0.3,1] }} transition={{ duration: 0.8, repeat: Infinity }}><Sparkles size={13} className="mr-2" /></motion.div>Running...</>
              ) : (
                <><Play size={13} className="mr-2" />Start Deliberation</>
              )}
            </Button>
          </div>
        </div>

        {/* Past deliberations */}
        <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>HISTORY ({deliberations.length})</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {deliberations.map(d => (
              <button key={d.id} onClick={() => openExisting(d)}
                className="w-full text-left p-2.5 rounded-xl"
                style={{
                  background: activeDelib?.id === d.id ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.02)',
                  border: activeDelib?.id === d.id ? '1px solid rgba(167,139,250,0.25)' : '1px solid rgba(255,255,255,0.06)',
                }}
                data-testid={`deliberation-history-${d.id}`}
              >
                <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{d.proposal_title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    d.status === 'completed' ? 'text-emerald-300 bg-emerald-500/10' :
                    d.status === 'running'   ? 'text-cyan-300 bg-cyan-500/10' :
                    'text-red-300 bg-red-500/10'
                  }`}>{d.status}</span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {(d.snapshots||[]).length} snapshots
                  </span>
                </div>
              </button>
            ))}
            {deliberations.length === 0 && (
              <p className="text-xs text-center py-6" style={{ color: 'rgba(255,255,255,0.25)' }}>No deliberations yet</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main deliberation area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeDelib ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <h2 className="font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{activeDelib.proposal_title}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  {isRunning ? (
                    <span className="flex items-center gap-1 text-xs" style={{ color: '#22d3ee' }}>
                      <motion.div animate={{ opacity: [1,0.3,1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                        <Zap size={11} />
                      </motion.div>
                      Live — agents are deliberating
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {snapshots.length} snapshots · {activeDelib.status}
                    </span>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => { fetchDeliberations(); if (activeDelib) openExisting(activeDelib); }}
                style={{ border: '1px solid rgba(255,255,255,0.1)', height: 30, fontSize: 12 }}>
                <RefreshCw size={12} className="mr-1.5" />Refresh
              </Button>
            </div>

            {/* Snapshots feed */}
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-3 max-w-2xl">
                {/* Thinking agents placeholder */}
                {[...thinkingAgents].map(agentId => (
                  <AgentThinking
                    key={`thinking-${agentId}`}
                    snapshot={{ agent_id: agentId, agent_name: 'Agent', agent_color: '#a78bfa', agent_role: '...' }}
                    isThinking={true}
                  />
                ))}

                {/* Rendered snapshots */}
                <AnimatePresence>
                  {snapshots.map((snap, i) => (
                    <AgentThinking key={snap.id || i} snapshot={snap} isThinking={false} />
                  ))}
                </AnimatePresence>

                {/* Summary */}
                {activeDelib.summary && (
                  <SummaryPanel summary={activeDelib.summary} />
                )}

                {snapshots.length === 0 && !isRunning && (
                  <div className="text-center py-20">
                    <Brain size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No snapshots yet</p>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <Brain size={36} style={{ color: '#a78bfa' }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Deliberation Room</h2>
            <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Watch your AI agents debate proposals in real time.</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Select a proposal and start a deliberation session.</p>
          </div>
        )}
      </div>
    </div>
  );
}
