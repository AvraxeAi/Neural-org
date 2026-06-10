import React, { useState } from 'react';

const MEETINGS = [
  { id: '1', title: 'Beta Attorney Strategy Review', date: 'Apr 28 · 10:00 AM', duration: '60 min', attendees: ['Rusty','Sarah K.','◎ Orchestrator','◎ LawAssist'], status: 'upcoming', type: 'Board' },
  { id: '2', title: 'Weekly Team Sync',              date: 'Apr 25 · 2:00 PM',  duration: '30 min', attendees: ['Rusty','Marcus T.','◎ Orchestrator'],              status: 'upcoming', type: 'Team' },
  { id: '3', title: 'Legal Pipeline Demo Prep',      date: 'Apr 24 · 9:00 AM',  duration: '45 min', attendees: ['Rusty','◎ LawAssist'],                             status: 'done',     type: 'Working' },
  { id: '4', title: 'Investor Intro — Derek Nash',   date: 'Apr 22 · 3:30 PM',  duration: '30 min', attendees: ['Rusty'],                                           status: 'done',     type: 'External' },
];

const VOTES = [
  { id: '1', question: 'Should we move to a paid ClawHub skill tier for Legal Doc Parser?', yes: 3, no: 1, total: 4, myVote: null as 'yes'|'no'|null, aiRec: 'yes', aiReason: 'ROI positive at current usage rates. Estimated $12/mo vs 4hr/week manual review time.' },
  { id: '2', question: 'Approve Q2 budget: $150/month OpenRouter API budget?',              yes: 2, no: 0, total: 4, myVote: null as 'yes'|'no'|null, aiRec: 'yes', aiReason: 'Current burn rate projects $47/mo. $150 gives comfortable headroom for 3× growth.' },
  { id: '3', question: 'Add Marcus T. as Admin role?',                                       yes: 1, no: 2, total: 4, myVote: null as 'yes'|'no'|null, aiRec: 'no',  aiReason: 'Marcus has been inactive for 8 days. Recommend waiting until sustained engagement before promoting.' },
];

export function OrgMeetings() {
  const [tab, setTab] = useState<'meetings'|'board'|'votes'>('meetings');
  const [votes, setVotes] = useState(VOTES);
  const [boardMode, setBoardMode] = useState(false);

  const castVote = (voteId: string, choice: 'yes'|'no') => {
    setVotes(v => v.map(vote => vote.id === voteId ? { ...vote, myVote: choice } : vote));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Inner tab bar */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[['meetings','◷ Meetings'],['board','📋 Board Mode'],['votes','🗳 Votes']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id as any)} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: tab === id ? 'var(--surface-hover)' : 'transparent', color: tab === id ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: tab === id ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s', boxShadow: 'none' }}>{label}</button>
        ))}
      </div>

      {/* ── Meetings list ── */}
      {tab === 'meetings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button style={{ background: 'linear-gradient(135deg,#00E6A8,#00C494)', border: 'none', borderRadius: 9, padding: '8px 16px', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,230,168,0.3)' }}>+ Schedule Meeting</button>
          </div>
          {MEETINGS.map(m => (
            <div key={m.id} className="glass-card" style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: m.status === 'upcoming' ? 'rgba(0,230,168,0.1)' : 'var(--border)', border: `1.5px solid ${m.status === 'upcoming' ? 'rgba(0,230,168,0.3)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {m.type === 'Board' ? '📋' : m.type === 'Team' ? '👥' : m.type === 'External' ? '🤝' : '💼'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{m.title}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>{m.date}</span>
                  <span>·</span>
                  <span>{m.duration}</span>
                  <span>·</span>
                  <span>{m.attendees.length} attendees</span>
                </div>
                <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                  {m.attendees.map(a => (
                    <span key={a} style={{ fontSize: 10, background: 'var(--border)', borderRadius: 6, padding: '2px 7px', color: 'var(--text-secondary)' }}>{a}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`tag ${m.status === 'upcoming' ? 'tag-green' : 'tag-gray'}`}>{m.status === 'upcoming' ? 'Upcoming' : 'Done'}</span>
                <span className={`tag tag-${m.type === 'Board' ? 'violet' : m.type === 'Team' ? 'blue' : m.type === 'External' ? 'amber' : 'gray'}`}>{m.type}</span>
                {m.status === 'upcoming' && (
                  <button style={{ background: 'linear-gradient(135deg,#00E6A8,#00C494)', border: 'none', borderRadius: 8, padding: '6px 14px', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Join →</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Board Meeting Mode ── */}
      {tab === 'board' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!boardMode ? (
            <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Board Meeting Mode</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 24px' }}>
                Structured decision-making session. All members and their AI agents participate. Agenda-driven, AI facilitates, votes are recorded on-chain.
              </p>
              <button onClick={() => setBoardMode(true)} style={{ background: 'linear-gradient(135deg,#00E6A8,#00C494)', border: 'none', borderRadius: 10, padding: '12px 28px', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,230,168,0.35)' }}>
                Start Board Session →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Live session banner */}
              <div style={{ background: 'linear-gradient(135deg,rgba(0,230,168,0.12),rgba(59,130,246,0.08))', border: '1px solid rgba(0,230,168,0.3)', borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00E6A8', boxShadow: '0 0 0 3px rgba(0,230,168,0.3)', animation: 'pulse-dot 1.5s ease infinite' }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Board Session Live</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>4 members · 2 AI agents · 00:04:32</span>
                </div>
                <button onClick={() => setBoardMode(false)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '6px 14px', color: 'var(--status-red)', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>End Session</button>
              </div>

              {/* Agenda */}
              <div className="glass-card" style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Agenda</div>
                {[
                  { n: 1, item: 'Q2 Budget Approval', status: 'done' },
                  { n: 2, item: 'ClawHub Paid Tier Decision', status: 'active' },
                  { n: 3, item: 'Marcus T. Role Promotion', status: 'pending' },
                  { n: 4, item: 'Beta Launch Timeline', status: 'pending' },
                ].map(a => (
                  <div key={a.n} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: a.status === 'done' ? 'rgba(0,201,122,0.15)' : a.status === 'active' ? 'rgba(0,230,168,0.15)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: a.status === 'done' ? 'var(--status-green)' : a.status === 'active' ? 'var(--accent-dark)' : 'var(--text-muted)', flexShrink: 0 }}>
                      {a.status === 'done' ? '✓' : a.n}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: a.status === 'active' ? 700 : 500, color: a.status === 'active' ? 'var(--text-primary)' : a.status === 'done' ? 'var(--text-muted)' : 'var(--text-secondary)', flex: 1 }}>{a.item}</span>
                    <span className={`tag tag-${a.status === 'done' ? 'green' : a.status === 'active' ? 'accent' : 'gray'}`}>{a.status === 'active' ? 'In Progress' : a.status === 'done' ? 'Done' : 'Pending'}</span>
                  </div>
                ))}
              </div>

              {/* AI Facilitator */}
              <div style={{ background: 'rgba(0,230,168,0.06)', border: '1px solid rgba(0,230,168,0.2)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-dark)', marginBottom: 6 }}>◎ Orchestrator — Facilitating</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  We're on agenda item 2: ClawHub Paid Tier. I recommend approving based on current ROI projections. Waiting for votes from Sarah K. and Marcus T. Rusty has already voted Yes.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AI Voting Engine ── */}
      {tab === 'votes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>AI agents vote on behalf of their owner unless overridden</div>
            <button style={{ background: 'linear-gradient(135deg,#00E6A8,#00C494)', border: 'none', borderRadius: 9, padding: '8px 16px', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ New Vote</button>
          </div>
          {votes.map(v => {
            const yesPct = Math.round((v.yes / v.total) * 100);
            const noPct = Math.round((v.no / v.total) * 100);
            return (
              <div key={v.id} className="glass-card" style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{v.question}</div>

                {/* Vote bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${yesPct}%`, background: 'var(--status-green)', borderRadius: '99px 0 0 99px', transition: 'width 0.6s' }} />
                    <div style={{ width: `${noPct}%`, background: 'var(--status-red)', borderRadius: '0 99px 99px 0', transition: 'width 0.6s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: 'var(--status-green)', fontWeight: 700 }}>Yes: {v.yes} ({yesPct}%)</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.total - v.yes - v.no} pending</span>
                    <span style={{ fontSize: 11, color: 'var(--status-red)', fontWeight: 700 }}>No: {v.no} ({noPct}%)</span>
                  </div>
                </div>

                {/* AI recommendation */}
                <div style={{ background: 'rgba(0,230,168,0.06)', border: '1px solid rgba(0,230,168,0.15)', borderRadius: 9, padding: '9px 12px', marginBottom: 12, display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--accent-dark)', fontWeight: 700, flexShrink: 0 }}>◎ AI Recommends {v.aiRec === 'yes' ? '✓ Yes' : '✗ No'}:</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v.aiReason}</span>
                </div>

                {/* My vote */}
                {!v.myVote ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => castVote(v.id, 'yes')} style={{ flex: 1, background: 'rgba(0,201,122,0.1)', border: '1px solid rgba(0,201,122,0.3)', borderRadius: 9, padding: '9px', color: 'var(--status-green)', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>✓ Vote Yes</button>
                    <button onClick={() => castVote(v.id, 'no')} style={{ flex: 1, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '9px', color: 'var(--status-red)', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>✗ Vote No</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: v.myVote === 'yes' ? 'rgba(0,201,122,0.08)' : 'rgba(239,68,68,0.06)', border: `1px solid ${v.myVote === 'yes' ? 'rgba(0,201,122,0.25)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 9 }}>
                    <span style={{ fontSize: 14 }}>{v.myVote === 'yes' ? '✓' : '✗'}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: v.myVote === 'yes' ? 'var(--status-green)' : 'var(--status-red)' }}>You voted {v.myVote}</span>
                    <button onClick={() => setVotes(vs => vs.map(vote => vote.id === v.id ? { ...vote, myVote: null } : vote))} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}>Change</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
