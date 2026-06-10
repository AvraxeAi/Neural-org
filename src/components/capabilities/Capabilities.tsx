import React, { useState } from 'react';

const CAPS = [
  { id: 'tavily',   name: 'Tavily Web Search',   author: 'tavily',    icon: '🔍', type: 'Skill',   installs: '4.2k', installed: true,  desc: 'Live web search for agents. Structured results, citation-ready, optimized for LLM consumption.' },
  { id: 'polly',    name: 'PollyReach Phone',     author: 'pollyreach',icon: '📞', type: 'Plugin',  installs: '890',  installed: true,  desc: 'Outbound/inbound phone calls. Agents can call contacts, leave voicemails, log summaries.' },
  { id: 'legal',    name: 'Legal Doc Parser',     author: 'clawhub',   icon: '⚖️', type: 'Skill',   installs: '312',  installed: false, desc: 'Extract clauses, parties, dates from legal documents. Outputs structured JSON.' },
  { id: 'memory',   name: 'Memory Summarizer',    author: 'openclaw',  icon: '🧠', type: 'Skill',   installs: '8.1k', installed: true,  desc: 'Auto-compacts long session memory. Keeps context usage low without losing key facts.' },
  { id: 'calendar', name: 'Calendar Agent',       author: 'clawhub',   icon: '📅', type: 'Plugin',  installs: '5.6k', installed: false, desc: 'Read/create calendar events across Google Calendar and Outlook. Natural language scheduling.' },
  { id: 'data',     name: 'Data Parser',          author: 'openclaw',  icon: '📊', type: 'Skill',   installs: '3.2k', installed: true,  desc: 'Parse CSV, JSON, XML, tabular data. Run transformations and output structured results.' },
  { id: 'browser',  name: 'Browser Control',      author: 'openclaw',  icon: '🌐', type: 'Skill',   installs: '6.7k', installed: true,  desc: 'Full browser automation. Navigate, fill forms, scrape content, and interact with web apps.' },
  { id: 'intake',   name: 'Client Intake Form',   author: 'clawhub',   icon: '📋', type: 'Workflow', installs: '1.1k', installed: false, desc: 'Automated client intake pipeline. Collects info, validates, routes to assigned agent.' },
];

const FILTERS = ['All', 'Skills', 'Plugins', 'Workflows', 'Installed', 'My Creations'];

export default function Capabilities() {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<typeof CAPS[0] | null>(null);

  const filtered = CAPS.filter(c => {
    if (filter === 'Installed') return c.installed;
    if (filter === 'Skills') return c.type === 'Skill';
    if (filter === 'Plugins') return c.type === 'Plugin';
    if (filter === 'Workflows') return c.type === 'Workflow';
    return true;
  }).filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>Capabilities</h2>
        <button style={{ background: 'linear-gradient(135deg, #00E6A8, #00C494)', border: 'none', borderRadius: 9, padding: '8px 16px', color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,230,168,0.3)' }}>+ Build New</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: filter === f ? 'var(--surface-raise)' : 'var(--surface-raise)',
            fontSize: 12, fontWeight: filter === f ? 700 : 500,
            color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
            boxShadow: filter === f ? '0 2px 8px var(--border)' : 'none',
            transition: 'all 0.15s',
          }}>{f}</button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ marginLeft: 'auto', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 14px', fontSize: 12, width: 180 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap: 16 }}>
        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selected ? 2 : 4}, 1fr)`, gap: 12 }}>
          {filtered.map(c => (
            <div key={c.id} className="glass-card" onClick={() => setSelected(selected?.id === c.id ? null : c)} style={{
              padding: '16px', cursor: 'pointer', transition: 'all 0.18s',
              borderColor: selected?.id === c.id ? 'rgba(0,230,168,0.4)' : undefined,
              background: selected?.id === c.id ? 'rgba(0,230,168,0.06)' : undefined,
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{c.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{c.author}</div>
                </div>
                <span className={`tag tag-${c.type === 'Skill' ? 'blue' : c.type === 'Plugin' ? 'violet' : 'amber'}`}>{c.type}</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>{c.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.installs} installs</span>
                <div style={{ display: 'flex', gap: 5 }}>
                  {c.installed ? (
                    <span className="tag tag-green">Installed</span>
                  ) : (
                    <button onClick={e => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, #00E6A8, #00C494)', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Install</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="glass-card animate-fade-up" style={{ padding: '20px', alignSelf: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Details</span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{selected.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{selected.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginBottom: 12 }}>{selected.author} · {selected.installs} installs</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>{selected.desc}</p>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Assign to Agent</div>
              <select style={{ width: '100%', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontFamily: "'Outfit', sans-serif" }}>
                <option>Orchestrator</option>
                <option>LawAssist</option>
                <option>DataAgent</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selected.installed ? (
                <button style={{ background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px', color: 'var(--text-secondary)', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit Configuration</button>
              ) : (
                <button style={{ background: 'linear-gradient(135deg, #00E6A8, #00C494)', border: 'none', borderRadius: 9, padding: '9px', color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(0,230,168,0.3)' }}>Install from ClawHub</button>
              )}
              <button style={{ background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px', color: 'var(--text-secondary)', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Bundle with Others</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
