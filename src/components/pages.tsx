import React, { useState } from 'react';

// ── DOCUMENTS ──────────────────────────────────────────────

const DOCS = [
  { title: 'Attorney One-Pager — Contract AI',    type: 'Document', updated: '1h ago',  tag: 'tag-accent', tagLabel: 'AI Generated' },
  { title: 'Legal Intake Process SOP',            type: 'Document', updated: '3d ago',  tag: 'tag-blue',   tagLabel: 'SOP' },
  { title: 'AvraxeAi Setup Guide',                type: 'Guide',    updated: '1w ago',  tag: 'tag-violet', tagLabel: 'Guide' },
  { title: 'Beta Attorney Feedback Notes',        type: 'Notes',    updated: '2d ago',  tag: 'tag-amber',  tagLabel: 'Notes' },
  { title: 'API Cost Optimization Report',        type: 'Report',   updated: '4d ago',  tag: 'tag-green',  tagLabel: 'Report' },
];

export function Documents() {
  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>Documents</h2>
        <button style={{ background: 'linear-gradient(135deg, #00E6A8, #00C494)', border: 'none', borderRadius: 9, padding: '8px 16px', color: '#fff', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,230,168,0.3)' }}>+ New Document</button>
      </div>

      <div style={{ position: 'relative' }}>
        <input placeholder="AI search across all documents..." style={{ width: '100%', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px 10px 40px', fontSize: 13 }} />
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: 'var(--text-muted)' }}>⌕</span>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Title', 'Type', 'Tag', 'Updated', ''].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DOCS.map((d, i) => (
              <tr
                key={i}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>❏</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{d.title}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{d.type}</td>
                <td style={{ padding: '12px 16px' }}><span className={`tag ${d.tag}`}>{d.tagLabel}</span></td>
                <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-muted)' }}>{d.updated}</td>
                <td style={{ padding: '12px 16px' }}><button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)' }}>⋯</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── TERMINAL ───────────────────────────────────────────────

export function Terminal() {
  const [cmd, setCmd] = useState('');
  const [lines, setLines] = useState([
    { type: 'prompt', text: 'status --all' },
    { type: 'out-green', text: '✓ Gateway running (pid 2847)' },
    { type: 'out-green', text: '✓ 3 agents active' },
    { type: 'out-green', text: '✓ 14 skills loaded' },
    { type: 'out-amber', text: '⚠ cron/cost-report: overdue' },
    { type: 'out', text: 'Cluster: GCP-US-CENTRAL | Uptime: 14d 6h 22m' },
    { type: 'prompt', text: 'agents list' },
    { type: 'out', text: 'ID: orchestrator  | Model: claude-sonnet-4-6  | Status: active | Sessions: 3' },
    { type: 'out', text: 'ID: lawassist     | Model: gemini-flash-3      | Status: active | Sessions: 1' },
    { type: 'out', text: 'ID: dataagent     | Model: deepseek-r1-0528    | Status: busy   | Sessions: 2' },
  ]);

  const run = () => {
    if (!cmd.trim()) return;
    setLines(l => [...l, { type: 'prompt', text: cmd }, { type: 'out', text: `> ${cmd} executed` }]);
    setCmd('');
  };

  return (
    <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>Terminal</h2>
        <span className="tag tag-green">GCP-US-CENTRAL · Connected</span>
      </div>
      <div style={{
        flex: 1, background: '#0F1117', borderRadius: 14,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        border: '1px solid rgba(0,0,0,0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 6, alignItems: 'center' }}>
          {['#FF5F57','#FFBD2E','#28C840'].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
          <span style={{ fontSize: 12, color: 'var(--surface-raise)', marginLeft: 8, fontFamily: 'DM Mono, monospace' }}>openclaw — GCP-US-CENTRAL</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {lines.map((l, i) => (
            <div key={i} style={{
              fontFamily: 'DM Mono, monospace', fontSize: 13, lineHeight: 1.7,
              color: l.type === 'prompt' ? '#00E6A8' : l.type === 'out-amber' ? '#F59E0B' : 'var(--surface-raise)',
              paddingLeft: l.type !== 'prompt' ? 20 : 0,
            }}>
              {l.type === 'prompt' && <span style={{ color: 'var(--surface-raise)' }}>openclaw $ </span>}
              {l.text}
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#00E6A8', flexShrink: 0 }}>openclaw $</span>
          <input
            value={cmd}
            onChange={e => setCmd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()}
            style={{ flex: 1, background: 'none', border: 'none', fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'var(--surface-raise)', caretColor: '#00E6A8' }}
            placeholder="type a command..."
          />
        </div>
      </div>
    </div>
  );
}
