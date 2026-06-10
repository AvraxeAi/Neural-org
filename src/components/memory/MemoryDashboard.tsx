import React, { useState } from 'react';
import { Brain, Plus, Search, X } from 'lucide-react';

const MEMORY_TYPES = ['Decision', 'Project', 'Agent', 'User', 'Procedure', 'Organization'];

type MemoryEntry = [string, string, string, string];

const INITIAL_MEMORIES: MemoryEntry[] = [
  ['Decision','Security audit framework approved','The board approved the new audit framework with six votes in favor.','May 20, 2025'],
  ['Project','Q2 budget constraints','Marketing allocation remains capped until the next finance review.','May 19, 2025'],
  ['Agent','Hermes operating preference','Hermes should summarize board context before proposing actions.','May 18, 2025'],
  ['User','Rusty communication style','Prefers concise operational summaries with explicit owners.','May 17, 2025'],
  ['Procedure','Vendor onboarding sequence','Security review must complete before workspace access is granted.','May 16, 2025'],
  ['Organization','Board voting threshold','Standard proposals require five affirmative votes to pass.','May 15, 2025'],
];

export function MemoryDashboard() {
  const [memories, setMemories] = useState<MemoryEntry[]>(INITIAL_MEMORIES);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ type: 'Decision', title: '', content: '' });

  const filtered = memories.filter(m =>
    m[1].toLowerCase().includes(search.toLowerCase()) ||
    m[2].toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!form.title.trim()) return;
    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setMemories(prev => [[form.type, form.title.trim(), form.content.trim(), now], ...prev]);
    setForm({ type: 'Decision', title: '', content: '' });
    setShowNew(false);
  };

  return (
    <div className="phase-page simple-page">
      {showNew && (
        <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.65)' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(500px,95vw)', background: 'var(--surface)', border: '1px solid var(--border-hover)', borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,0.5)', animation: 'fadeUp 0.2s cubic-bezier(0.16,1,0.3,1) both', overflow: 'hidden' }}>
            <div style={{ height: 54, padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <Brain size={16} color="var(--accent)" />
                <span style={{ fontSize: 13, fontWeight: 700 }}>New Memory</span>
              </div>
              <button onClick={() => setShowNew(false)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-raise)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'grid', placeItems: 'center' }}><X size={14} /></button>
            </div>
            <div style={{ padding: '20px 18px', display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Type</span>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ height: 34, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-inset)', color: 'var(--text-primary)', padding: '0 10px', fontSize: 12 }}>
                  {MEMORY_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Title *</span>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Short descriptive title" style={{ height: 34, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-inset)', color: 'var(--text-primary)', padding: '0 10px', fontSize: 12 }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Content</span>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="What should agents remember?" rows={3} style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-inset)', color: 'var(--text-primary)', padding: '8px 10px', fontSize: 12, resize: 'none', lineHeight: 1.5 }} />
              </div>
            </div>
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowNew(false)} style={{ height: 32, padding: '0 14px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-raise)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              <button disabled={!form.title.trim()} onClick={handleCreate} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 6, background: form.title.trim() ? 'var(--accent)' : 'var(--surface-raise)', color: form.title.trim() ? '#041f14' : 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: form.title.trim() ? 'pointer' : 'not-allowed' }}>Save Memory</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-heading">
        <div><h1>Memory</h1><p>Persistent agent knowledge and context.</p></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label className="page-search">
            <Search size={14} />
            <input placeholder="Search memory..." value={search} onChange={e => setSearch(e.target.value)} />
          </label>
          <button onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 32, padding: '0 12px', background: 'var(--accent)', border: 'none', borderRadius: 7, color: '#041f14', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Plus size={14} /> Add Memory
          </button>
        </div>
      </div>

      <div className="memory-grid">
        {filtered.map(item => (
          <article className="panel memory-card" key={item[1]}>
            <div><span className="memory-type">{item[0]}</span><Brain size={16} /></div>
            <h2>{item[1]}</h2>
            <p>{item[2]}</p>
            <time>{item[3]}</time>
          </article>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No memories match your search.
          </div>
        )}
      </div>
    </div>
  );
}
