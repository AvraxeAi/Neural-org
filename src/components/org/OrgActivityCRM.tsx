import React, { useState } from 'react';

// ── ACTIVITY FEED ──────────────────────────────────────────

const ACTIVITY_ITEMS = [
  { time: '2m ago',   actor: '◎ Orchestrator', action: 'completed contract review task for James Holloway',     type: 'Agent',    typeClass: 'tag-accent',  icon: '◎' },
  { time: '8m ago',   actor: '⚡ Tavily',       action: 'web search executed — 12 results returned',             type: 'Skill',    typeClass: 'tag-blue',    icon: '⚡' },
  { time: '14m ago',  actor: '👤 Sarah K.',     action: 'joined the organization',                               type: 'Member',   typeClass: 'tag-violet',  icon: '👤' },
  { time: '28m ago',  actor: '◎ Orchestrator', action: 'sent follow-up message to Patricia Cruz via Telegram',  type: 'Agent',    typeClass: 'tag-accent',  icon: '◎' },
  { time: '1h ago',   actor: '◫ System',        action: 'memory vault compacted — 340 entries pruned',           type: 'System',   typeClass: 'tag-gray',    icon: '◫' },
  { time: '2h ago',   actor: '⟐ Workflow',      action: 'Legal Intake pipeline deployed successfully',           type: 'Workflow', typeClass: 'tag-green',   icon: '⟐' },
  { time: '3h ago',   actor: '👤 Rusty',        action: 'updated DeepSeek R1 model route config',               type: 'Config',   typeClass: 'tag-gray',    icon: '👤' },
  { time: '4h ago',   actor: '◎ LawAssist',     action: 'generated draft attorney one-pager (1.2 MB)',           type: 'Agent',    typeClass: 'tag-accent',  icon: '◎' },
  { time: '5h ago',   actor: '👤 Marcus T.',    action: 'updated routing config document in #documents',         type: 'Document', typeClass: 'tag-blue',    icon: '👤' },
  { time: '1d ago',   actor: '⚙ System',        action: 'PollyReach skill registered and activated',             type: 'System',   typeClass: 'tag-gray',    icon: '⚙' },
  { time: '1d ago',   actor: '👤 Rusty',        action: 'created Legal Squad agent team',                        type: 'Team',     typeClass: 'tag-violet',  icon: '👤' },
  { time: '2d ago',   actor: '◎ DataAgent',     action: 'completed API cost optimization analysis',              type: 'Agent',    typeClass: 'tag-accent',  icon: '◎' },
];

const TYPE_FILTERS = ['All', 'Agent', 'Skill', 'Member', 'Workflow', 'System', 'Document'];

export function OrgActivity() {
  const [typeFilter, setTypeFilter] = useState('All');

  const filtered = ACTIVITY_ITEMS.filter(a => typeFilter === 'All' || a.type === typeFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Filter row */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {TYPE_FILTERS.map(f => (
          <button key={f} onClick={() => setTypeFilter(f)} style={{ padding: '5px 12px', borderRadius: 8, background: typeFilter === f ? 'var(--surface-hover)' : 'transparent', color: typeFilter === f ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", border: '1px solid var(--border)', boxShadow: 'none', transition: 'all 0.15s' } as any}>{f}</button>
        ))}
      </div>

      {/* Feed */}
      <div className="glass-card" style={{ padding: '8px 0' }}>
        {filtered.map((item, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, padding: '12px 18px',
            borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
            transition: 'background 0.12s', cursor: 'default',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.015)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--border)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{item.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.actor}</span>
                <span style={{ color: 'var(--text-secondary)' }}> {item.action}</span>
              </div>
              <div style={{ display: 'flex', gap: 7, marginTop: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.time}</span>
                <span className={`tag ${item.typeClass}`}>{item.type}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CRM ───────────────────────────────────────────────────

const CONTACTS = [
  {
    id: '1', name: 'James Holloway', company: 'Holloway & Associates', location: 'Houston, TX',
    role: 'Trial Attorney', status: 'Hot Lead', statusClass: 'tag-amber', stage: 'Demo Scheduled',
    lastContact: '2 days ago', nextAction: 'Schedule demo — Apr 30',
    tags: ['Beta User', 'Attorney', 'Trial Law'],
    aiSummary: '20yr trial lawyer. Strong interest in contract review automation. Responded quickly to initial outreach. Has 3 associates who could also use the product.',
    email: 'j.holloway@holloway-law.com', phone: '+1 (713) 555-0192',
  },
  {
    id: '2', name: 'Patricia Cruz', company: 'Cruz Law Group', location: 'Dallas, TX',
    role: 'Managing Partner', status: 'Active', statusClass: 'tag-green', stage: 'Demo Confirmed',
    lastContact: '4 hours ago', nextAction: 'Review intake form before May 2 demo',
    tags: ['Beta User', 'Attorney', 'Family Law'],
    aiSummary: 'Family law practice, 8 attorneys. Wants AI-assisted client intake to reduce front-desk load. Demo confirmed May 2. Sent intake form for review.',
    email: 'p.cruz@cruzlawgroup.com', phone: '+1 (972) 555-0841',
  },
  {
    id: '3', name: 'Derek Nash', company: 'Nash Legal Tech Ventures', location: 'Austin, TX',
    role: 'Managing Partner / Investor', status: 'Investor', statusClass: 'tag-blue', stage: 'Intro Done',
    lastContact: '6 days ago', nextAction: 'Follow up after first beta results',
    tags: ['Investor', 'Legal Tech'],
    aiSummary: 'Seed investor with legal tech portfolio. Intro call completed. Interested in traction metrics before committing. Revisit after first paying attorney.',
    email: 'd.nash@nashlegaltech.com', phone: '+1 (512) 555-0374',
  },
];

const PIPELINE_STAGES = ['Lead', 'Outreach', 'Demo Scheduled', 'Demo Confirmed', 'Proposal', 'Closed'];

export function OrgCRM() {
  const [selected, setSelected] = useState<typeof CONTACTS[0] | null>(null);
  const [view, setView] = useState<'cards'|'pipeline'>('cards');

  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {(['cards','pipeline'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '7px 14px', background: view === v ? 'var(--surface-hover)' : 'transparent', color: view === v ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: view === v ? 700 : 500, fontFamily: "'Outfit',sans-serif" }}>
                {v === 'cards' ? '⊞ Cards' : '→ Pipeline'}
              </button>
            ))}
          </div>
          <button style={{ marginLeft: 'auto', background: 'linear-gradient(135deg,#00E6A8,#00C494)', border: 'none', borderRadius: 9, padding: '8px 16px', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,230,168,0.3)' }}>+ Add Contact</button>
        </div>

        {view === 'cards' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CONTACTS.map(c => (
              <div key={c.id} className="glass-card" onClick={() => setSelected(selected?.id === c.id ? null : c)} style={{ padding: '16px 20px', cursor: 'pointer', transition: 'all 0.18s', borderColor: selected?.id === c.id ? 'rgba(0,230,168,0.35)' : undefined, background: selected?.id === c.id ? 'rgba(0,230,168,0.04)' : undefined }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--border)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {c.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</span>
                      <span className={`tag ${c.statusClass}`}>{c.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{c.role} · {c.company} · {c.location}</div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {c.tags.map(t => <span key={t} className="tag tag-gray" style={{ fontSize: 10 }}>{t}</span>)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Last contact: {c.lastContact}</div>
                    <div style={{ fontSize: 11, color: 'var(--accent-dark)', fontWeight: 600 }}>→ {c.nextAction}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, background: 'rgba(0,230,168,0.06)', border: '1px solid rgba(0,230,168,0.15)', borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ fontSize: 10, color: 'var(--accent-dark)', fontWeight: 700 }}>◎ AI: </span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.aiSummary}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Pipeline view
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
            {PIPELINE_STAGES.map(stage => {
              const stageContacts = CONTACTS.filter(c => c.stage === stage);
              return (
                <div key={stage} style={{ minWidth: 200, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{stage}</span>
                    <span style={{ background: 'var(--border)', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 6px', color: 'var(--text-muted)' }}>{stageContacts.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stageContacts.map(c => (
                      <div key={c.id} className="glass-card" style={{ padding: '12px 14px', cursor: 'pointer' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.company}</div>
                        <span className={`tag ${c.statusClass}`} style={{ marginTop: 6 }}>{c.status}</span>
                      </div>
                    ))}
                    {stageContacts.length === 0 && (
                      <div style={{ border: '1.5px dashed var(--border)', borderRadius: 10, padding: '16px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>Empty</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact detail panel */}
      {selected && (
        <div className="glass-card animate-fade-up" style={{ width: 300, padding: '20px', alignSelf: 'flex-start', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Contact</span>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--text-muted)' }}>✕</button>
          </div>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: 'var(--border)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>{selected.name.charAt(0)}</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 3 }}>{selected.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{selected.role} · {selected.company}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
            <span className={`tag ${selected.statusClass}`}>{selected.status}</span>
            {selected.tags.map(t => <span key={t} className="tag tag-gray" style={{ fontSize: 10 }}>{t}</span>)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14, fontSize: 12 }}>
            {[['Stage', selected.stage],['Location', selected.location],['Last Contact', selected.lastContact],['Email', selected.email]].map(([k,v]) => (
              <div key={k} style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--text-muted)', minWidth: 80, flexShrink: 0 }}>{k}</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(0,230,168,0.06)', border: '1px solid rgba(0,230,168,0.15)', borderRadius: 9, padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: 'var(--accent-dark)', fontWeight: 700, marginBottom: 5 }}>◎ Next Action</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{selected.nextAction}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <button style={{ background: 'linear-gradient(135deg,#00E6A8,#00C494)', border: 'none', borderRadius: 9, padding: '9px', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(0,230,168,0.3)' }}>◎ Ask AI to Follow Up</button>
            <button style={{ background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px', color: 'var(--text-secondary)', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>📞 Call via PollyReach</button>
            <button style={{ background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px', color: 'var(--text-secondary)', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✏️ Edit Contact</button>
          </div>
        </div>
      )}
    </div>
  );
}
