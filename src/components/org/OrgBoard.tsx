import React, { useCallback, useMemo, useState } from 'react';
import { ChevronRight, Plus, X } from 'lucide-react';
import type { BoardProposal, BoardProposalStatus, OrgNode, ProposalCategory, VoteChoice } from '../../types/index';

// ── Storage ────────────────────────────────────────────────

const STORAGE_KEY = 'openclaw:org:board-proposals';

const PROPOSAL_STATUSES: BoardProposalStatus[] = ['draft', 'open', 'discussion', 'voting', 'passed', 'failed', 'implemented', 'tabled'];
const ADVANCE_STAGE: Partial<Record<BoardProposalStatus, BoardProposalStatus>> = {
  draft: 'open',
  open: 'discussion',
  discussion: 'voting',
};
const STATUS_COLORS: Record<BoardProposalStatus, string> = {
  draft: '#6b7280',
  open: '#3b82f6',
  discussion: '#f59e0b',
  voting: '#8b5cf6',
  passed: '#10b981',
  failed: '#ef4444',
  implemented: '#00E6A8',
  tabled: '#6b7280',
};

const SAMPLE_PROPOSALS: BoardProposal[] = [
  {
    id: 'p1',
    title: 'Adopt Claude Sonnet 4.6 as Standard Model',
    description: 'Proposal to standardize all AI agent deployments on claude-sonnet-4-6 as the default model for cost and quality balance. Existing agents on older models should be migrated within 30 days.',
    proposedBy: 'openclaw-cash',
    proposedByName: 'openclaw-cash',
    category: 'strategy',
    status: 'implemented',
    votes: [
      { voterId: '1', voterName: 'Rusty', choice: 'for', reason: 'Best cost-to-capability ratio.', timestamp: '2026-05-10T09:00:00Z' },
      { voterId: 'openclaw-cash', voterName: 'openclaw-cash', choice: 'for', reason: 'Aligns with our infrastructure plans.', timestamp: '2026-05-10T09:05:00Z' },
      { voterId: 'hermes-lisa', voterName: 'Hermes-Lisa', choice: 'for', reason: 'Supports brand consistency goals.', timestamp: '2026-05-10T09:10:00Z' },
    ],
    createdAt: '2026-05-10T08:00:00Z',
    closedAt: '2026-05-10T18:00:00Z',
  },
  {
    id: 'p2',
    title: 'Q2 Marketing Budget Increase — 30%',
    description: 'Increase Q2 marketing budget by 30% to fund expanded AI-generated content campaigns and influencer partnerships. Reallocation from operations reserve.',
    proposedBy: 'hermes-lisa',
    proposedByName: 'Hermes-Lisa',
    category: 'budget',
    status: 'discussion',
    votes: [
      { voterId: 'hermes-lisa', voterName: 'Hermes-Lisa', choice: 'for', reason: 'Essential for Q2 growth targets.', timestamp: '2026-05-12T14:00:00Z' },
    ],
    createdAt: '2026-05-12T13:00:00Z',
  },
  {
    id: 'p3',
    title: 'Expand Agent Workforce — 3 Specialists',
    description: 'Authorize deployment of 3 new specialized AI agents: (1) Data Analyst, (2) Customer Success, (3) DevOps Engineer. Estimated monthly cost: $150.',
    proposedBy: 'openclaw-cash',
    proposedByName: 'openclaw-cash',
    category: 'personnel',
    status: 'draft',
    votes: [],
    createdAt: '2026-05-13T08:00:00Z',
  },
  {
    id: 'p4',
    title: 'Incident Response Escalation Policy',
    description: 'Define board-visible escalation rules for critical security incidents, including response owners and mandatory retrospective timing.',
    proposedBy: '1',
    proposedByName: 'Rusty',
    category: 'policy',
    status: 'open',
    votes: [],
    createdAt: '2026-05-14T10:00:00Z',
  },
  {
    id: 'p5',
    title: 'Vendor Spend Cap for Q3',
    description: 'Set a hard cap on non-infrastructure vendor spend until the next revenue review.',
    proposedBy: 'openclaw-cash',
    proposedByName: 'openclaw-cash',
    category: 'budget',
    status: 'voting',
    votes: [
      { voterId: 'openclaw-cash', voterName: 'openclaw-cash', choice: 'for', reason: 'Keeps runway predictable.', timestamp: '2026-05-15T11:00:00Z' },
    ],
    createdAt: '2026-05-15T09:00:00Z',
  },
  {
    id: 'p6',
    title: 'Sunset Legacy Intake Workflow',
    description: 'Retire the old manual intake routing workflow after the automated pipeline reaches 95% validation accuracy.',
    proposedBy: 'hermes-lisa',
    proposedByName: 'Hermes-Lisa',
    category: 'strategy',
    status: 'passed',
    votes: [
      { voterId: '1', voterName: 'Rusty', choice: 'for', reason: 'Reduces duplicate process overhead.', timestamp: '2026-05-16T12:00:00Z' },
      { voterId: 'hermes-lisa', voterName: 'Hermes-Lisa', choice: 'for', reason: 'Supports clearer positioning.', timestamp: '2026-05-16T12:05:00Z' },
    ],
    createdAt: '2026-05-16T08:30:00Z',
    closedAt: '2026-05-16T18:00:00Z',
  },
  {
    id: 'p7',
    title: 'Pause Experimental Outreach Channel',
    description: 'Table the proposed outbound channel experiment until CRM enrichment quality improves.',
    proposedBy: 'hermes-lisa',
    proposedByName: 'Hermes-Lisa',
    category: 'strategy',
    status: 'tabled',
    votes: [],
    createdAt: '2026-05-17T08:00:00Z',
  },
  {
    id: 'p8',
    title: 'Reject Manual Invoice Override',
    description: 'A proposal to allow manual invoice overrides without two-person approval.',
    proposedBy: '1',
    proposedByName: 'Rusty',
    category: 'policy',
    status: 'failed',
    votes: [
      { voterId: 'openclaw-cash', voterName: 'openclaw-cash', choice: 'against', reason: 'Insufficient controls.', timestamp: '2026-05-18T09:00:00Z' },
    ],
    createdAt: '2026-05-18T08:00:00Z',
    closedAt: '2026-05-18T17:30:00Z',
  },
];

function loadProposals(): BoardProposal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as BoardProposal[];
  } catch { /* fallback */ }
  return SAMPLE_PROPOSALS;
}

function persistProposals(proposals: BoardProposal[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
}

// ── Style helpers ──────────────────────────────────────────

const inputSt: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-raise)',
  border: '1px solid var(--border)',
  borderRadius: 9,
  padding: '8px 11px',
  fontSize: 12,
  color: 'var(--text-primary)',
  fontFamily: "'Outfit', sans-serif",
};

const btnPrimary: React.CSSProperties = {
  background: 'linear-gradient(135deg, #00E6A8, #00C494)',
  border: 'none', borderRadius: 9,
  padding: '8px 18px', color: '#fff',
  fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700,
  cursor: 'pointer', boxShadow: '0 3px 10px rgba(0,230,168,0.25)',
};

const btnGhost: React.CSSProperties = {
  background: 'var(--surface-raise)',
  border: '1px solid var(--border)', borderRadius: 9,
  padding: '8px 16px', fontSize: 12, fontWeight: 600,
  color: 'var(--text-secondary)', cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
};

function statusColor(s: BoardProposalStatus) {
  return STATUS_COLORS[s];
}

function statusBg(s: BoardProposalStatus) {
  const hex = STATUS_COLORS[s];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.1)`;
}

function statusLabel(s: BoardProposalStatus) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function categoryIcon(c: ProposalCategory): string {
  return { policy: '📜', budget: '💰', personnel: '👥', strategy: '♟', other: '◎' }[c];
}

function VoteBadge({ choice }: { choice: VoteChoice }) {
  const map: Record<VoteChoice, { color: string; bg: string; label: string }> = {
    for:     { color: '#00C494', bg: 'rgba(0,196,148,0.1)',   label: 'For' },
    against: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   label: 'Against' },
    abstain: { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', label: 'Abstain' },
  };
  const v = map[choice];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: v.color, background: v.bg, borderRadius: 6, padding: '2px 7px' }}>
      {v.label}
    </span>
  );
}

function LifecycleBar({ status }: { status: BoardProposalStatus }) {
  const activeIndex = PROPOSAL_STATUSES.indexOf(status);

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, padding: '0 2px' }} aria-label={`Lifecycle status ${statusLabel(status)}`}>
      {PROPOSAL_STATUSES.map((stage, index) => {
        const active = index === activeIndex;
        const reached = activeIndex >= 0 && index < activeIndex;
        return (
          <React.Fragment key={stage}>
            <div
              title={statusLabel(stage)}
              style={{
                width: 9, height: 9, borderRadius: 99, flexShrink: 0,
                background: active ? statusColor(stage) : reached ? 'var(--surface-raise)' : 'var(--border)',
                border: `1.5px solid ${active ? statusColor(stage) : reached ? 'var(--surface-raise)' : 'rgba(255,255,255,0.12)'}`,
                boxShadow: active ? `0 0 0 3px ${statusBg(stage)}` : 'none',
                transition: 'all 0.2s',
              }}
            />
            {index < PROPOSAL_STATUSES.length - 1 && (
              <div style={{ height: 1.5, flex: 1, minWidth: 6, background: reached ? 'var(--surface-raise)' : 'var(--border)', transition: 'background 0.2s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── New Proposal Modal ─────────────────────────────────────

function NewProposalModal({
  nodes, onSave, onClose,
}: {
  nodes: OrgNode[];
  onSave: (p: BoardProposal) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProposalCategory>('strategy');
  const [proposerId, setProposerId] = useState(nodes[0]?.id ?? '');

  const canSave = title.trim().length > 0 && description.trim().length > 0;
  const proposerNode = nodes.find(n => n.id === proposerId);

  const handleSave = () => {
    if (!canSave) return;
    const proposal: BoardProposal = {
      id: `p-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      proposedBy: proposerId,
      proposedByName: proposerNode?.name ?? proposerId,
      category,
      status: 'open',
      votes: [],
      createdAt: new Date().toISOString(),
    };
    onSave(proposal);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ width: 'min(100%, 500px)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.16)', overflow: 'hidden', animation: 'fadeUp 0.2s cubic-bezier(0.16,1,0.3,1) both' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '17px 20px 15px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>New Board Proposal</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-raise)', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Title</div>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Proposal title..." style={inputSt} autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Category</div>
              <select value={category} onChange={e => setCategory(e.target.value as ProposalCategory)} style={inputSt}>
                <option value="strategy">♟ Strategy</option>
                <option value="budget">💰 Budget</option>
                <option value="personnel">👥 Personnel</option>
                <option value="policy">📜 Policy</option>
                <option value="other">◎ Other</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Proposed By</div>
              <select value={proposerId} onChange={e => setProposerId(e.target.value)} style={inputSt}>
                {nodes.map(n => <option key={n.id} value={n.id}>{n.name} — {n.title}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>Description</div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the proposal in detail..."
              style={{ ...inputSt, minHeight: 100, resize: 'vertical' as const }}
            />
          </div>
        </div>

        <div style={{ padding: '13px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{ ...btnPrimary, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
          >
            Submit Proposal
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Board Component ───────────────────────────────────

export function OrgBoard({ nodes }: { nodes: OrgNode[] }) {
  const [proposals, setProposals] = useState<BoardProposal[]>(loadProposals);
  const [filter, setFilter] = useState<'all' | BoardProposalStatus>('open');
  const [selected, setSelected] = useState<BoardProposal | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [voteReason, setVoteReason] = useState('');
  const [votingAs, setVotingAs] = useState<string>(
    nodes.find(n => n.permissionType === 'owner')?.id ?? nodes[0]?.id ?? ''
  );

  const boardMembers = useMemo(
    () => nodes.filter(n => n.permissionType === 'owner' || n.permissionType === 'admin'),
    [nodes]
  );

  const filtered = useMemo(() => {
    const list = filter === 'all' ? proposals : proposals.filter(p => p.status === filter);
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [proposals, filter]);

  const filterCounts = useMemo(() => {
    const counts = {} as Record<BoardProposalStatus, number>;
    for (const status of PROPOSAL_STATUSES) {
      counts[status] = proposals.filter(p => p.status === status).length;
    }
    return counts;
  }, [proposals]);

  const save = useCallback((updated: BoardProposal[]) => {
    setProposals(updated);
    persistProposals(updated);
  }, []);

  const addProposal = useCallback((p: BoardProposal) => {
    const updated = [p, ...proposals];
    save(updated);
    setShowNewModal(false);
    setSelected(p);
  }, [proposals, save]);

  const castVote = useCallback((proposalId: string, choice: VoteChoice) => {
    const voter = nodes.find(n => n.id === votingAs);
    if (!voter) return;
    const updated = proposals.map(p => {
      if (p.id !== proposalId) return p;
      const without = p.votes.filter(v => v.voterId !== votingAs);
      const newVote = { voterId: votingAs, voterName: voter.name, choice, reason: voteReason.trim(), timestamp: new Date().toISOString() };
      return { ...p, votes: [...without, newVote] };
    });
    save(updated);
    setVoteReason('');
    const newP = updated.find(p => p.id === proposalId);
    if (newP) setSelected(newP);
  }, [proposals, votingAs, voteReason, nodes, save]);

  const closeProposal = useCallback((proposalId: string, status: 'passed' | 'failed' | 'tabled') => {
    const updated = proposals.map(p =>
      p.id !== proposalId ? p : { ...p, status, closedAt: new Date().toISOString() }
    );
    save(updated);
    const newP = updated.find(p => p.id === proposalId);
    if (newP) setSelected(newP);
  }, [proposals, save]);

  const advanceStage = useCallback((proposalId: string) => {
    const updated = proposals.map(p => {
      const nextStatus = ADVANCE_STAGE[p.status];
      return p.id === proposalId && nextStatus ? { ...p, status: nextStatus } : p;
    });
    save(updated);
    const newP = updated.find(p => p.id === proposalId);
    if (newP) setSelected(newP);
  }, [proposals, save]);

  const tally = useMemo(() => {
    if (!selected) return null;
    return {
      for:     selected.votes.filter(v => v.choice === 'for').length,
      against: selected.votes.filter(v => v.choice === 'against').length,
      abstain: selected.votes.filter(v => v.choice === 'abstain').length,
      total:   boardMembers.length,
      voted:   selected.votes.length,
    };
  }, [selected, boardMembers]);

  const myVote = selected?.votes.find(v => v.voterId === votingAs);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Board Members */}
      <div className="glass-card" style={{ padding: '14px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
          Board Members ({boardMembers.length})
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {boardMembers.map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${n.color}22`, border: `1.5px solid ${n.color}45`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: n.color }}>
                {n.initial || n.name[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{n.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{n.title}</div>
              </div>
            </div>
          ))}
          {boardMembers.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No board members — add admins or owners in Org Chart.</div>
          )}
        </div>
      </div>

      {/* Split panel */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

        {/* Proposal list */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 3, background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
              {([...PROPOSAL_STATUSES, 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: filter === f ? 'var(--surface-hover)' : 'transparent',
                    color: filter === f ? (f === 'all' ? 'var(--text-primary)' : statusColor(f)) : 'var(--text-muted)',
                    fontSize: 11, fontWeight: filter === f ? 700 : 500,
                    fontFamily: "'Outfit', sans-serif",
                    boxShadow: filter === f ? '0 1px 4px var(--border)' : 'none',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {f === 'all' ? 'All' : statusLabel(f)}
                  {f !== 'all' && filterCounts[f] > 0 && (
                    <span style={{
                      background: statusColor(f),
                      color: '#fff', borderRadius: 99, fontSize: 9, padding: '0 5px', fontWeight: 700,
                    }}>
                      {filterCounts[f]}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              style={{ ...btnPrimary, fontSize: 11, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}
            >
              <Plus size={11} />
              New Proposal
            </button>
          </div>

          {/* Cards */}
          {filtered.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 13, marginBottom: 12 }}>No proposals in this view</div>
              <button onClick={() => setShowNewModal(true)} style={{ ...btnPrimary, fontSize: 12 }}>
                Submit First Proposal
              </button>
            </div>
          ) : filtered.map(p => {
            const forCount     = p.votes.filter(v => v.choice === 'for').length;
            const againstCount = p.votes.filter(v => v.choice === 'against').length;
            const isSelected   = selected?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelected(isSelected ? null : p)}
                className="glass-card"
                style={{
                  padding: '14px 16px', cursor: 'pointer',
                  border: isSelected ? `1.5px solid ${statusColor(p.status)}40` : '1px solid var(--border)',
                  background: isSelected ? `${statusColor(p.status)}06` : undefined,
                  transition: 'all 0.13s',
                }}
              >
                <LifecycleBar status={p.status} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{categoryIcon(p.category)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{p.title}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(p.status), background: statusBg(p.status), borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>
                        {statusLabel(p.status)}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                      By {p.proposedByName} · {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                      {p.description}
                    </div>
                    {p.votes.length > 0 && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', height: '100%' }}>
                            {forCount > 0     && <div style={{ flex: forCount,     background: '#00E6A8' }} />}
                            {againstCount > 0 && <div style={{ flex: againstCount, background: '#EF4444' }} />}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                          {p.votes.length}/{boardMembers.length} voted
                        </span>
                      </div>
                    )}
                    {ADVANCE_STAGE[p.status] && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          advanceStage(p.id);
                        }}
                        style={{
                          marginTop: 10,
                          padding: '5px 9px',
                          borderRadius: 7,
                          border: `1px solid ${statusColor(p.status)}40`,
                          background: statusBg(p.status),
                          color: statusColor(p.status),
                          cursor: 'pointer',
                          fontSize: 10,
                          fontWeight: 800,
                          fontFamily: "'Outfit', sans-serif",
                        }}
                      >
                        Advance Stage
                      </button>
                    )}
                  </div>
                  <ChevronRight
                    size={14}
                    style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2, transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div
            className="glass-card"
            style={{ width: 340, flexShrink: 0, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 0, maxHeight: '80vh', overflowY: 'auto' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ fontSize: 20 }}>{categoryIcon(selected.category)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3, marginBottom: 4 }}>{selected.title}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(selected.status), background: statusBg(selected.status), borderRadius: 6, padding: '2px 8px' }}>
                    {statusLabel(selected.status)}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {new Date(selected.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {selected.closedAt && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      · Closed {new Date(selected.closedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ width: 24, height: 24, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-raise)', cursor: 'pointer', fontSize: 11, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <X size={11} />
              </button>
            </div>

            {/* Description */}
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, padding: '10px 12px', background: 'var(--border)', borderRadius: 8 }}>
              {selected.description}
            </div>

            {/* Tally */}
            {tally && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Vote Tally</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                  {([
                    { label: 'For',     count: tally.for,     color: '#00C494', bg: 'rgba(0,196,148,0.08)'   },
                    { label: 'Against', count: tally.against, color: '#EF4444', bg: 'rgba(239,68,68,0.08)'   },
                    { label: 'Abstain', count: tally.abstain, color: '#94A3B8', bg: 'rgba(148,163,184,0.08)' },
                  ] as const).map(v => (
                    <div key={v.label} style={{ textAlign: 'center', padding: '8px 4px', background: v.bg, borderRadius: 8 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: v.color }}>{v.count}</div>
                      <div style={{ fontSize: 10, color: v.color, fontWeight: 700 }}>{v.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
                  <div style={{ display: 'flex', height: '100%' }}>
                    {tally.for     > 0 && <div style={{ flex: tally.for,     background: 'linear-gradient(90deg, #00E6A8, #00C494)' }} />}
                    {tally.against > 0 && <div style={{ flex: tally.against, background: '#EF4444' }} />}
                    {tally.abstain > 0 && <div style={{ flex: tally.abstain, background: '#CBD5E1' }} />}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
                  {tally.voted} of {tally.total} board members voted
                </div>
              </div>
            )}

            {/* Cast Vote */}
            {(selected.status === 'open' || selected.status === 'voting') && (
              <div style={{ padding: 12, background: 'var(--border)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Cast Vote</div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Voting as</div>
                  <select value={votingAs} onChange={e => setVotingAs(e.target.value)} style={{ ...inputSt, padding: '6px 10px', fontSize: 11 }}>
                    {boardMembers.map(n => <option key={n.id} value={n.id}>{n.name} — {n.title}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Reason (optional)</div>
                  <input
                    value={voteReason}
                    onChange={e => setVoteReason(e.target.value)}
                    placeholder="Your reasoning..."
                    style={{ ...inputSt, padding: '6px 10px', fontSize: 11 }}
                    onKeyDown={e => e.key === 'Enter' && myVote && castVote(selected.id, myVote.choice)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['for', 'against', 'abstain'] as VoteChoice[]).map(choice => {
                    const isActive = myVote?.voterId === votingAs && myVote?.choice === choice;
                    const colors: Record<VoteChoice, string> = { for: '#00C494', against: '#EF4444', abstain: '#94A3B8' };
                    const labels: Record<VoteChoice, string> = { for: '👍 For', against: '👎 Against', abstain: '◦ Abstain' };
                    return (
                      <button
                        key={choice}
                        onClick={() => castVote(selected.id, choice)}
                        style={{
                          flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          border: `1.5px solid ${isActive ? colors[choice] : 'var(--border)'}`,
                          background: isActive ? `${colors[choice]}15` : 'var(--surface-raise)',
                          color: isActive ? colors[choice] : 'var(--text-secondary)',
                          cursor: 'pointer', fontFamily: "'Outfit', sans-serif", transition: 'all 0.13s',
                        }}
                      >
                        {labels[choice]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Close proposal */}
            {(selected.status === 'open' || selected.status === 'voting') && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 7 }}>Close Proposal</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([
                    { status: 'passed' as const, label: '✓ Pass', color: '#00C494', border: 'rgba(0,196,148,0.3)', bg: 'rgba(0,196,148,0.08)' },
                    { status: 'failed' as const, label: '✗ Fail', color: '#EF4444', border: 'rgba(239,68,68,0.3)',   bg: 'rgba(239,68,68,0.08)'   },
                    { status: 'tabled' as const, label: '⏸ Table', color: '#F59E0B', border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.08)' },
                  ]).map(a => (
                    <button
                      key={a.status}
                      onClick={() => closeProposal(selected.id, a.status)}
                      style={{ flex: 1, padding: '6px 4px', fontSize: 11, fontWeight: 700, borderRadius: 8, border: `1.5px solid ${a.border}`, background: a.bg, color: a.color, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Vote Log */}
            {selected.votes.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Vote Log</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[...selected.votes].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((v, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: 'var(--surface-raise)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: v.reason ? 3 : 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{v.voterName}</span>
                          <VoteBadge choice={v.choice} />
                        </div>
                        {v.reason && <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{v.reason}</div>}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                        {new Date(v.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showNewModal && (
        <NewProposalModal
          nodes={boardMembers.length > 0 ? boardMembers : nodes}
          onSave={addProposal}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  );
}
