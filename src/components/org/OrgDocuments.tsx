import React, { useState } from 'react';

const DOCS = [
  { id: '1', title: 'Attorney One-Pager — Contract AI',  type: 'Document', tag: 'AI Generated', tagClass: 'tag-accent', updated: '1h ago',  author: '◎ Orchestrator', size: '1.2 MB', pinned: true },
  { id: '2', title: 'Legal Intake Process SOP',          type: 'SOP',      tag: 'SOP',          tagClass: 'tag-blue',   updated: '3d ago',  author: '👤 Rusty',       size: '840 KB',  pinned: true },
  { id: '3', title: 'AvraxeAi Setup Guide',              type: 'Guide',    tag: 'Guide',        tagClass: 'tag-violet', updated: '1w ago',  author: '👤 Rusty',       size: '2.1 MB',  pinned: false },
  { id: '4', title: 'Beta Attorney Feedback Notes',      type: 'Notes',    tag: 'Notes',        tagClass: 'tag-amber',  updated: '2d ago',  author: '👤 Sarah K.',    size: '320 KB',  pinned: false },
  { id: '5', title: 'API Cost Optimization Report',      type: 'Report',   tag: 'Report',       tagClass: 'tag-green',  updated: '4d ago',  author: '◎ DataAgent',    size: '1.7 MB',  pinned: false },
  { id: '6', title: 'James Holloway — Client Profile',  type: 'Profile',  tag: 'CRM',          tagClass: 'tag-blue',   updated: '5d ago',  author: '◎ Orchestrator', size: '180 KB',  pinned: false },
  { id: '7', title: 'Contract Review Automation Spec',  type: 'Spec',     tag: 'Technical',    tagClass: 'tag-gray',   updated: '6d ago',  author: '👤 Rusty',       size: '950 KB',  pinned: false },
];

const TYPE_ICON: Record<string, string> = {
  Document: '❏', SOP: '📋', Guide: '📖', Notes: '✏️',
  Report: '📊', Profile: '👤', Spec: '⚙',
};

export function OrgDocuments() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [selected, setSelected] = useState<typeof DOCS[0] | null>(null);

  const filtered = DOCS.filter(d =>
    !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.tag.toLowerCase().includes(search.toLowerCase())
  );
  const pinned = filtered.filter(d => d.pinned);
  const rest = filtered.filter(d => !d.pinned);

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="AI search across all documents..."
              style={{ width: '100%', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 14px 9px 38px', fontSize: 13 }}
            />
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)' }}>⌕</span>
          </div>
          <div style={{ display: 'flex', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {(['list','grid'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '8px 12px', background: view === v ? 'var(--surface-hover)' : 'transparent', color: view === v ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 12 }}>
                {v === 'list' ? '☰' : '⊞'}
              </button>
            ))}
          </div>
          <button style={{ background: 'linear-gradient(135deg,#00E6A8,#00C494)', border: 'none', borderRadius: 9, padding: '8px 16px', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,230,168,0.3)', whiteSpace: 'nowrap' }}>+ New Doc</button>
        </div>

        {/* Pinned */}
        {pinned.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>📌 Pinned</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {pinned.map(d => (
                <DocCard key={d.id} doc={d} onClick={() => setSelected(d)} selected={selected?.id === d.id} />
              ))}
            </div>
          </div>
        )}

        {/* All docs */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>All Documents</div>
          {view === 'list' ? (
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Title','Type','Author','Updated','Size',''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rest.map(d => (
                    <tr key={d.id} onClick={() => setSelected(selected?.id === d.id ? null : d)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.12s', background: selected?.id === d.id ? 'rgba(0,230,168,0.04)' : '' }}
                      onMouseEnter={e => { if (selected?.id !== d.id) (e.currentTarget as HTMLElement).style.background = 'var(--border)'; }}
                      onMouseLeave={e => { if (selected?.id !== d.id) (e.currentTarget as HTMLElement).style.background = ''; }}
                    >
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 16 }}>{TYPE_ICON[d.type] ?? '❏'}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d.title}</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 16px' }}><span className={`tag ${d.tagClass}`}>{d.tag}</span></td>
                      <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{d.author}</td>
                      <td style={{ padding: '11px 16px', fontSize: 11, color: 'var(--text-muted)' }}>{d.updated}</td>
                      <td style={{ padding: '11px 16px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono,monospace' }}>{d.size}</td>
                      <td style={{ padding: '11px 16px' }}><button onClick={e => e.stopPropagation()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)' }}>⋯</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {rest.map(d => <DocCard key={d.id} doc={d} onClick={() => setSelected(d)} selected={selected?.id === d.id} />)}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="glass-card animate-fade-up" style={{ width: 300, padding: '20px', alignSelf: 'flex-start', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Document</span>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--text-muted)' }}>✕</button>
          </div>
          <div style={{ fontSize: 28, marginBottom: 10 }}>{TYPE_ICON[selected.type] ?? '❏'}</div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 6 }}>{selected.title}</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            <span className={`tag ${selected.tagClass}`}>{selected.tag}</span>
            <span className="tag tag-gray">{selected.size}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Author</span><span>{selected.author}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Updated</span><span>{selected.updated}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Type</span><span>{selected.type}</span></div>
          </div>
          {/* AI summary */}
          <div style={{ background: 'rgba(0,230,168,0.06)', border: '1px solid rgba(0,230,168,0.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--accent-dark)', fontWeight: 700, marginBottom: 5 }}>◎ AI Summary</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {selected.id === '1' ? 'Two-page brief covering contract review automation capabilities, time savings (avg 4hr → 22min), and accuracy metrics (94.7%). Tailored for attorney audience.' :
               selected.id === '2' ? 'Step-by-step legal intake SOP. Covers intake form, qualification criteria, agent handoff logic, and attorney review gates.' :
               'Document content available. Click Open to view full text.'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button style={{ background: 'linear-gradient(135deg,#00E6A8,#00C494)', border: 'none', borderRadius: 9, padding: '9px', color: '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(0,230,168,0.3)' }}>Open Document</button>
            <button style={{ background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px', color: 'var(--text-secondary)', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Ask AI About This</button>
            <button style={{ background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px', color: 'var(--text-secondary)', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Share</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DocCard({ doc, onClick, selected }: { doc: typeof DOCS[0]; onClick: () => void; selected: boolean }) {
  return (
    <div onClick={onClick} className="glass-card" style={{
      padding: '14px 16px', cursor: 'pointer', transition: 'all 0.18s',
      borderColor: selected ? 'rgba(0,230,168,0.4)' : undefined,
      background: selected ? 'rgba(0,230,168,0.05)' : undefined,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{TYPE_ICON[doc.type] ?? '❏'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{doc.author} · {doc.updated}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        <span className={`tag ${doc.tagClass}`}>{doc.tag}</span>
        <span className="tag tag-gray">{doc.size}</span>
      </div>
    </div>
  );
}
