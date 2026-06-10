import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, Shield, AlertTriangle, CheckCircle2, Clock, ChevronRight,
  Download, Users, Zap, TrendingUp, Brain, Lock, ExternalLink,
} from 'lucide-react';
import type { OrgNode } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Deliberation {
  id: string;
  title: string;
  category: 'strategy' | 'budget' | 'personnel' | 'risk' | 'policy';
  status: 'live' | 'voting' | 'closed';
  started: string;
  participants: string[];
  consensusPct: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface AgentMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentColor: string;
  agentInitial: string;
  content: string;
  type: 'analysis' | 'risk' | 'support' | 'oppose' | 'question' | 'decision';
  timestamp: string;
  isThinking?: boolean;
}

interface RiskItem {
  label: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  owner: string;
  mitigated: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ORG_STORAGE_KEY = 'openclaw:org:nodes';

const DEFAULT_NODES: OrgNode[] = [
  { id: 'rusty',  name: 'Rusty',  title: 'Chairman',         model: null,                agentName: null,       provider: null,        initial: 'R', color: '#00E6A8', status: 'online',  parentId: null,    permissionType: 'owner'  },
  { id: 'cash',   name: 'Cash',   title: 'CEO',               model: 'claude-sonnet-4-6', agentName: 'openclaw-cash', provider: 'anthropic', initial: 'C', color: '#3B82F6', status: 'online',  parentId: 'rusty', permissionType: 'admin'  },
  { id: 'lisa',   name: 'Lisa',   title: 'CMO',               model: 'claude-sonnet-4-6', agentName: 'hermes',   provider: 'anthropic', initial: 'L', color: '#8B5CF6', status: 'online',  parentId: 'cash',  permissionType: 'admin'  },
  { id: 'freida', name: 'Freida', title: 'Research Lead',     model: 'claude-sonnet-4-6', agentName: null,       provider: 'anthropic', initial: 'F', color: '#F59E0B', status: 'busy',    parentId: 'cash',  permissionType: 'member' },
  { id: 'hughes', name: 'Hughes', title: 'Engineer',          model: 'deepseek-r1-0528',  agentName: null,       provider: 'local',     initial: 'H', color: '#EC4899', status: 'offline', parentId: 'cash',  permissionType: 'member' },
  { id: 'titan',  name: 'Titan',  title: 'ICF Specialist',    model: 'claude-opus-4-8',   agentName: 'openclaw-cash', provider: 'anthropic', initial: 'T', color: '#14B8A6', status: 'online',  parentId: 'cash',  permissionType: 'member' },
];

const DELIBERATIONS: Deliberation[] = [
  { id: 'd1', title: 'Expand AI Sales Force — Q3 Hiring Push', category: 'personnel', status: 'live',   started: '14 min ago', participants: ['Cash','Lisa','Freida','Titan'], consensusPct: 72, riskLevel: 'medium' },
  { id: 'd2', title: 'Adopt Claude Opus 4.8 for High-Stakes Legal', category: 'strategy', status: 'voting', started: '1h ago',    participants: ['Cash','Titan','Rusty'],        consensusPct: 88, riskLevel: 'low'    },
  { id: 'd3', title: 'Q3 Infrastructure Budget — $12k Allocation',  category: 'budget',   status: 'voting', started: '2h ago',    participants: ['Cash','Hughes','Rusty'],       consensusPct: 55, riskLevel: 'high'   },
  { id: 'd4', title: 'New Data Retention Policy — 90-Day Default',  category: 'policy',   status: 'closed', started: '1d ago',    participants: ['Cash','Lisa','Titan'],         consensusPct: 100, riskLevel: 'low'   },
];

const LIVE_FEED: AgentMessage[] = [
  { id: 'm1', agentId: 'cash',   agentName: 'Cash',   agentColor: '#3B82F6', agentInitial: 'C', type: 'analysis',  timestamp: '14:02', content: 'Opening analysis: Expanding the AI sales team by 3 agents before Q3 close has a projected ROI of 2.4x based on current conversion data from the legal vertical. Pipeline coverage increases from 40% to 71%.' },
  { id: 'm2', agentId: 'freida', agentName: 'Freida', agentColor: '#F59E0B', agentInitial: 'F', type: 'risk',      timestamp: '14:03', content: 'Risk flag: Rapid team expansion without updated onboarding protocols introduces a 34% probability of inconsistent client interactions. Recommend staging across 6 weeks rather than deploying all three simultaneously.' },
  { id: 'm3', agentId: 'lisa',   agentName: 'Lisa',   agentColor: '#8B5CF6', agentInitial: 'L', type: 'support',   timestamp: '14:04', content: 'Marketing alignment confirmed. Three new campaigns are pre-loaded for Q3 launch. Delay would leave $45k in prepared creative unused. Voting support for staged rollout — week 2 start.' },
  { id: 'm4', agentId: 'titan',  agentName: 'Titan',  agentColor: '#14B8A6', agentInitial: 'T', type: 'question',  timestamp: '14:05', content: 'Requesting clarification: Are these new agents operating under existing governance protocols, or do the ICF compliance frameworks need to be extended? Critical for regulated-industry clients.' },
  { id: 'm5', agentId: 'cash',   agentName: 'Cash',   agentColor: '#3B82F6', agentInitial: 'C', type: 'decision',  timestamp: '14:06', content: 'Responding to Titan: Existing ICF protocols extend to new agents automatically. Governance lock will propagate to the expanded team within 24h of activation. Moving to vote.' },
  { id: 'm6', agentId: 'freida', agentName: 'Freida', agentColor: '#F59E0B', agentInitial: 'F', type: 'analysis',  timestamp: '14:07', content: 'Secondary analysis complete. Staging plan reduces risk score from 34% → 11%. Confidence in staged rollout: 94%. Recommend approval with the 6-week phasing condition attached.' },
];

const RISKS: RiskItem[] = [
  { label: 'Onboarding consistency gap',  severity: 'medium',   owner: 'Freida', mitigated: true  },
  { label: 'ICF compliance propagation',  severity: 'low',      owner: 'Titan',  mitigated: true  },
  { label: 'Budget overrun at scale',      severity: 'high',     owner: 'Cash',   mitigated: false },
  { label: 'Client experience variance',  severity: 'medium',   owner: 'Lisa',   mitigated: false },
];

const TIMELINE = [
  { label: 'Session opened',       time: '14:00', done: true  },
  { label: 'Analysis submitted',   time: '14:02', done: true  },
  { label: 'Risk flags raised',    time: '14:03', done: true  },
  { label: 'Marketing aligned',    time: '14:04', done: true  },
  { label: 'ICF clarified',        time: '14:05', done: true  },
  { label: 'Staged plan endorsed', time: '14:07', done: true  },
  { label: 'Vote open',            time: '14:08', done: false },
  { label: 'Decision recorded',    time: '—',     done: false },
];

const RISK_COLORS: Record<string, string> = {
  low:      '#10b981',
  medium:   '#f59e0b',
  high:     '#f97316',
  critical: '#ef4444',
};

const MSG_TYPE_COLORS: Record<string, { bg: string; border: string; label: string; labelColor: string }> = {
  analysis: { bg: 'rgba(59,130,246,0.06)',  border: 'rgba(59,130,246,0.12)',  label: 'Analysis',  labelColor: '#3B82F6' },
  risk:     { bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.12)',   label: 'Risk',      labelColor: '#ef4444' },
  support:  { bg: 'rgba(16,185,129,0.06)',  border: 'rgba(16,185,129,0.12)', label: 'Support',   labelColor: '#10b981' },
  oppose:   { bg: 'rgba(239,68,68,0.06)',   border: 'rgba(239,68,68,0.12)',   label: 'Oppose',    labelColor: '#ef4444' },
  question: { bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.12)', label: 'Question',  labelColor: '#F59E0B' },
  decision: { bg: 'rgba(0,230,168,0.06)',   border: 'rgba(0,230,168,0.12)',  label: 'Decision',  labelColor: '#00E6A8' },
};

const CATEGORY_LABELS: Record<string, string> = {
  strategy: 'Strategy', budget: 'Budget', personnel: 'Personnel', risk: 'Risk', policy: 'Policy',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadNodes(): OrgNode[] {
  try {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) return p; }
  } catch {}
  return DEFAULT_NODES;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AgentPresenceCard({ node, isActive, isSpeaking }: { node: OrgNode; isActive: boolean; isSpeaking: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '10px 8px', borderRadius: 12, flexShrink: 0, width: 72,
      background: isActive ? `${node.color}0d` : 'transparent',
      border: `1px solid ${isActive ? `${node.color}28` : 'transparent'}`,
      transition: 'all 0.3s',
    }}>
      <div style={{ position: 'relative' }}>
        {isSpeaking && (
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', inset: -5, borderRadius: '50%',
              background: node.color, opacity: 0.25,
            }}
          />
        )}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: `${node.color}22`, border: `2px solid ${isActive ? node.color : `${node.color}40`}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: node.color,
          transition: 'border-color 0.3s',
        }}>{node.initial}</div>
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 9, height: 9, borderRadius: '50%',
          background: node.status === 'offline' ? '#3a3a3a' : node.status === 'busy' ? '#f59e0b' : '#10b981',
          border: '2px solid #0a0a0a',
        }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? node.color : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 64, textAlign: 'center' }}>{node.name}</span>
      {isSpeaking && (
        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 10 }}>
          {[0, 1, 2].map(i => (
            <motion.div key={i} style={{ width: 3, borderRadius: 2, background: node.color }}
              animate={{ height: [4, 10, 4] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedMessage({ msg, visible }: { msg: AgentMessage; visible: boolean }) {
  const style = MSG_TYPE_COLORS[msg.type] ?? MSG_TYPE_COLORS.analysis;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: `${msg.agentColor}18`, border: `1px solid ${msg.agentColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: msg.agentColor, marginTop: 1,
          }}>{msg.agentInitial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{msg.agentName}</span>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: style.bg, border: `1px solid ${style.border}`, color: style.labelColor, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{style.label}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{msg.timestamp}</span>
            </div>
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: style.bg, border: `1px solid ${style.border}`,
            }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>{msg.content}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConsensusMeter({ pct, color }: { pct: number; color: string }) {
  const r = 52; const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={130} height={130} viewBox="0 0 130 130">
        <circle cx={65} cy={65} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} />
        <motion.circle
          cx={65} cy={65} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - filled }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          transform="rotate(-90 65 65)"
        />
        <text x={65} y={60} textAnchor="middle" fontSize={26} fontWeight={800} fill="var(--text-primary)" fontFamily="'Outfit', sans-serif">{pct}%</text>
        <text x={65} y={80} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--text-muted)" fontFamily="'Outfit', sans-serif">CONSENSUS</text>
      </svg>
    </div>
  );
}

function DeliberationRow({ d, active, onSelect }: { d: Deliberation; active: boolean; onSelect: () => void }) {
  const statusColor = d.status === 'live' ? '#00E6A8' : d.status === 'voting' ? '#8B5CF6' : 'var(--text-muted)';
  return (
    <button onClick={onSelect} style={{
      width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10,
      background: active ? 'var(--surface-raise)' : 'transparent',
      border: `1px solid ${active ? 'var(--border-hover)' : 'transparent'}`,
      cursor: 'pointer', transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: active ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 4 }}>{d.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: statusColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.status}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.started}</span>
            <span style={{ fontSize: 10, color: RISK_COLORS[d.riskLevel], fontWeight: 600, marginLeft: 'auto' }}>{d.riskLevel} risk</span>
          </div>
        </div>
        {active && <ChevronRight size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />}
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function WarRoom({ onNav }: { onNav: (id: string) => void }) {
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [activeDelib, setActiveDelib] = useState(DELIBERATIONS[0]);
  const [visibleMessages, setVisibleMessages] = useState(1);
  const [typingAgent, setTypingAgent] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setNodes(loadNodes()); }, []);

  // Simulate live feed revealing messages one by one
  useEffect(() => {
    if (visibleMessages >= LIVE_FEED.length) return;
    const next = LIVE_FEED[visibleMessages];
    const thinkDelay = 1200 + Math.random() * 800;
    const speakDelay = thinkDelay + 1400 + Math.random() * 600;
    const t1 = setTimeout(() => setTypingAgent(next.agentId), thinkDelay);
    const t2 = setTimeout(() => {
      setTypingAgent(null);
      setVisibleMessages(v => v + 1);
      feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
    }, speakDelay);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [visibleMessages]);

  const activeNodes = nodes.filter(n => activeDelib.participants.includes(n.name));
  const consensusColor = activeDelib.consensusPct >= 80 ? '#10b981' : activeDelib.consensusPct >= 60 ? '#f59e0b' : '#ef4444';

  const sessionElapsed = '14:22';

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', fontFamily: "'Outfit', sans-serif", background: '#0a0a0a' }}>

      {/* ── LEFT RAIL — Deliberation list ── */}
      <div style={{
        width: 260, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', background: '#0d0d0d',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Brain size={14} color="#00E6A8" />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00E6A8' }}>War Room</span>
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
              style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI Organizational Deliberations</p>
        </div>

        {/* Deliberation list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '8px 4px 6px' }}>Active Sessions</div>
          {DELIBERATIONS.filter(d => d.status !== 'closed').map(d => (
            <DeliberationRow key={d.id} d={d} active={activeDelib.id === d.id} onSelect={() => { setActiveDelib(d); setVisibleMessages(1); }} />
          ))}
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '14px 4px 6px' }}>Closed</div>
          {DELIBERATIONS.filter(d => d.status === 'closed').map(d => (
            <DeliberationRow key={d.id} d={d} active={activeDelib.id === d.id} onSelect={() => setActiveDelib(d)} />
          ))}
        </div>

        {/* Governance link */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => onNav('approvals')} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
            borderRadius: 8, background: 'none', border: '1px solid var(--border)', cursor: 'pointer',
          }}>
            <Lock size={11} color="var(--text-muted)" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Governance Console</span>
            <ExternalLink size={10} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
          </button>
        </div>
      </div>

      {/* ── CENTER — Live deliberation feed ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Session header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          background: '#0d0d0d', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
              background: activeDelib.status === 'live' ? 'rgba(0,230,168,0.12)' : 'rgba(139,92,246,0.12)',
              color: activeDelib.status === 'live' ? '#00E6A8' : '#8B5CF6',
              border: `1px solid ${activeDelib.status === 'live' ? 'rgba(0,230,168,0.25)' : 'rgba(139,92,246,0.25)'}`,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{activeDelib.status}</div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{CATEGORY_LABELS[activeDelib.category]}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              <Clock size={11} color="var(--text-muted)" />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{sessionElapsed}</span>
            </div>
          </div>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: 10 }}>{activeDelib.title}</h2>

          {/* Agent presence row */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
            {activeNodes.map(n => (
              <AgentPresenceCard key={n.id} node={n}
                isActive={n.status !== 'offline'}
                isSpeaking={typingAgent === n.id || (visibleMessages <= LIVE_FEED.length && LIVE_FEED[visibleMessages - 1]?.agentId === n.id)}
              />
            ))}
          </div>
        </div>

        {/* Feed */}
        <div ref={feedRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {LIVE_FEED.slice(0, visibleMessages).map(msg => (
            <FeedMessage key={msg.id} msg={msg} visible />
          ))}

          {/* Typing indicator */}
          <AnimatePresence>
            {typingAgent && (() => {
              const node = nodes.find(n => n.id === typingAgent) ?? DEFAULT_NODES.find(n => n.id === typingAgent);
              if (!node) return null;
              return (
                <motion.div key="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: `${node.color}18`, border: `1px solid ${node.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: node.color,
                  }}>{node.initial}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{node.name} is analyzing</span>
                    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 12 }}>
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} style={{ width: 4, borderRadius: 2, background: node.color }}
                          animate={{ height: [3, 10, 3] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.22, ease: 'easeInOut' }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>
      </div>

      {/* ── RIGHT PANEL — Decision panel ── */}
      <div style={{
        width: 280, flexShrink: 0, borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
        background: '#0d0d0d',
      }}>
        <div style={{ padding: '16px 14px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Decision Panel</span>
        </div>

        {/* Consensus meter */}
        <div style={{ padding: '20px 14px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <ConsensusMeter pct={activeDelib.consensusPct} color={consensusColor} />
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>{activeDelib.participants.length}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Participants</div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#3B82F6' }}>{visibleMessages}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contributions</div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: RISK_COLORS[activeDelib.riskLevel] }}>{activeDelib.riskLevel}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Risk</div>
            </div>
          </div>
        </div>

        {/* Risk matrix */}
        <div style={{ padding: '14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={11} /> Risk Matrix
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {RISKS.map(r => (
              <div key={r.label} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: RISK_COLORS[r.severity], flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: r.mitigated ? 'var(--text-muted)' : 'var(--text-secondary)', flex: 1, textDecoration: r.mitigated ? 'line-through' : 'none', lineHeight: 1.3 }}>{r.label}</span>
                {r.mitigated && <CheckCircle2 size={11} color="#10b981" />}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ padding: '14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={11} /> Decision Timeline
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {TIMELINE.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16 }}>
                  <div style={{
                    width: 9, height: 9, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    background: item.done ? '#00E6A8' : 'var(--surface-raise)',
                    border: `1px solid ${item.done ? '#00E6A8' : 'var(--border)'}`,
                    transition: 'all 0.4s',
                  }} />
                  {i < TIMELINE.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: item.done ? 'rgba(0,230,168,0.25)' : 'var(--border)', minHeight: 18 }} />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: 12 }}>
                  <div style={{ fontSize: 11, color: item.done ? 'var(--text-secondary)' : 'var(--text-muted)', fontWeight: item.done ? 500 : 400, lineHeight: 1.3 }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Export */}
        <div style={{ padding: '14px' }}>
          <button style={{
            width: '100%', padding: '10px', borderRadius: 10, cursor: 'pointer',
            background: 'rgba(0,230,168,0.08)', border: '1px solid rgba(0,230,168,0.2)',
            color: '#00E6A8', fontSize: 12, fontWeight: 700, display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: "'Outfit', sans-serif",
          }}>
            <Download size={13} /> Export Decision Record
          </button>
        </div>
      </div>
    </div>
  );
}
