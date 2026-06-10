import React, { useEffect, useState } from 'react';
import { memoryApi } from '../../lib/api';

const SCOPE_COLORS: Record<string, string> = {
  Global:   'tag-accent',
  Org:      'tag-blue',
  Session:  'tag-violet',
  Personal: 'tag-amber',
};

export function MemoryVaultEnhanced() {
  const [memories, setMemories] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('All');
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newScope, setNewScope] = useState('Global');
  const [newValue, setNewValue] = useState('');

  const adaptMemory = (m: any) => ({
    ...m,
    value: m.content || m.preview || '',
    agent: m.type || 'System',
    size: m.content ? `${(m.content.length / 1024).toFixed(1)} KB` : '—',
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const rows = await memoryApi.list();
        const next = rows.map(adaptMemory);
        setMemories(next);
        setActive(next[0] || null);
      } catch (error) {
        console.error('Failed to load memory', error);
        setMemories([]);
        setActive(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = memories.filter(m =>
    (scopeFilter === 'All' || m.scope === scopeFilter) &&
    (m.key.toLowerCase().includes(search.toLowerCase()) || m.value.toLowerCase().includes(search.toLowerCase()))
  );

  const startEdit = () => {
    if (!active) return;
    setEditValue(active.value);
    setEditMode(true);
  };
  const saveEdit = async () => {
    if (!active) return;
    try {
      const updated = adaptMemory(await memoryApi.update(active.key, { content: editValue, updated: new Date().toISOString() }));
      setMemories(ms => ms.map(m => m.key === active.key ? { ...m, ...updated, value: editValue, updated: updated.updated || 'just now' } : m));
      setActive((a: any) => a ? { ...a, ...updated, value: editValue, updated: updated.updated || 'just now' } : a);
      setEditMode(false);
    } catch (error) {
      console.error('Failed to update memory', error);
    }
  };

  const deleteMemory = async () => {
    if (!active) return;
    try {
      await memoryApi.remove(active.key);
    } catch (error) {
      console.error('Failed to delete memory', error);
      return;
    }
    const remaining = memories.filter(m => m.key !== active.key);
    setMemories(remaining);
    setActive(remaining[0] || null);
  };

  const addEntry = async () => {
    if (!newKey.trim()) return;
    try {
      const created = adaptMemory(await memoryApi.create({ key: newKey, scope: newScope, type: 'Manual', content: newValue || '{}', preview: (newValue || '{}').slice(0, 160) }));
      const entry = { ...created, updated: created.updated || 'just now' };
      setMemories(ms => [entry, ...ms]);
      setActive(entry);
      setNewEntryOpen(false);
      setNewKey(''); setNewValue(''); setNewScope('Global');
    } catch (error) {
      console.error('Failed to add memory', error);
    }
  };

  const inp: React.CSSProperties = { width: '100%', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontFamily: "'Outfit',sans-serif" };

  // Stats
  const totalSize = memories.reduce((a, m) => a + (Number.isFinite(parseFloat(m.size)) ? parseFloat(m.size) : 0), 0);
  const scopeCounts = ['Global','Org','Session','Personal'].map(s => ({ scope: s, count: memories.filter(m => m.scope === s).length }));

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', opacity: loading ? 0.5 : 1 }}>

      {/* Left panel - list */}
      <div style={{ width: 300, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--surface-raise)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>Memory Vault</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setNewEntryOpen(true)} style={{ background: 'linear-gradient(135deg,#00E6A8,#00C494)', border: 'none', borderRadius: 7, padding: '5px 10px', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ New</button>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search memory..." style={{ ...inp, paddingLeft: 30 }} />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text-muted)' }}>⌕</span>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
            {['All','Global','Org','Session','Personal'].map(s => (
              <button key={s} onClick={() => setScopeFilter(s)} style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: scopeFilter === s ? 'var(--accent)' : 'var(--border)', color: scopeFilter === s ? '#fff' : 'var(--text-muted)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent-dark)' }}>{memories.length}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Entries</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{totalSize.toFixed(1)}KB</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total size</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#8B5CF6' }}>4</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Scopes</div>
          </div>
        </div>

        {/* Memory list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 && <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No entries match "{search}"</div>}
          {filtered.map(m => (
            <div key={m.key} onClick={() => { setActive(m); setEditMode(false); }} style={{ padding: '10px 12px', borderRadius: 9, cursor: 'pointer', marginBottom: 4, background: active?.key === m.key ? 'rgba(0,230,168,0.1)' : 'var(--surface-raise)', border: `1px solid ${active?.key === m.key ? 'rgba(0,230,168,0.3)' : 'var(--border)'}`, transition: 'all 0.12s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.key}</span>
                <span className={`tag ${SCOPE_COLORS[m.scope] ?? 'tag-gray'}`} style={{ fontSize: 9 }}>{m.scope}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono,monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.value.replace(/\n/g,' ').slice(0, 50)}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.updated}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>·</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono,monospace' }}>{m.size}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom actions */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
          <button style={{ flex: 1, background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", color: 'var(--text-secondary)' }}>⬆ Export</button>
          <button style={{ flex: 1, background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", color: 'var(--text-secondary)' }}>⬇ Import</button>
          <button style={{ flex: 1, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '7px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", color: 'var(--status-amber)' }}>Compact</button>
        </div>
      </div>

      {/* Right panel - detail / editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Detail toolbar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-raise)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px', fontFamily: 'DM Mono,monospace' }}>{active?.key || 'No memory selected'}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
              <span className={`tag ${SCOPE_COLORS[active?.scope] ?? 'tag-gray'}`}>{active?.scope || '—'}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Updated {active?.updated || '—'}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono,monospace' }}>{active?.size || '—'}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>via {active?.agent || '—'}</span>
            </div>
          </div>
          {!editMode ? (
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={startEdit} style={{ background: 'linear-gradient(135deg,#00E6A8,#00C494)', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
              <button style={{ background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', color: 'var(--text-secondary)', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Export</button>
              <button onClick={deleteMemory} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '7px 14px', color: 'var(--status-red)', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={saveEdit} style={{ background: 'linear-gradient(135deg,#00E6A8,#00C494)', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEditMode(false)} style={{ background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', color: 'var(--text-secondary)', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          )}
        </div>

        {/* Value area */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {!editMode ? (
            <div style={{ height: '100%', overflow: 'auto', padding: '20px', background: 'var(--border)' }}>
              <pre style={{ fontFamily: 'DM Mono,monospace', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                {active?.value || ''}
              </pre>
            </div>
          ) : (
            <textarea
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              style={{ width: '100%', height: '100%', background: 'var(--surface)', border: 'none', padding: '20px', fontFamily: 'DM Mono,monospace', fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8, resize: 'none', outline: 'none' }}
            />
          )}
        </div>
      </div>

      {/* New Entry Modal */}
      {newEntryOpen && (
        <div onClick={() => setNewEntryOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', width: 480, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>New Memory Entry</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>Key</div>
              <input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="e.g. client_preferences" style={inp} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>Scope</div>
              <select value={newScope} onChange={e => setNewScope(e.target.value)} style={inp}>
                {['Global','Org','Session','Personal'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>Value (JSON or plain text)</div>
              <textarea rows={5} value={newValue} onChange={e => setNewValue(e.target.value)} placeholder='{ "key": "value" }' style={{ ...inp, resize: 'none', lineHeight: 1.6, fontFamily: 'DM Mono,monospace' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setNewEntryOpen(false)} style={{ background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 16px', color: 'var(--text-secondary)', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addEntry} style={{ background: 'linear-gradient(135deg,#00E6A8,#00C494)', border: 'none', borderRadius: 9, padding: '9px 20px', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(0,230,168,0.3)' }}>Save Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
