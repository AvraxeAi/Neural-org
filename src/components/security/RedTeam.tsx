import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, AlertTriangle, Eye, Play, Plus, X, Lock, CheckCircle } from 'lucide-react';
import { memSvc } from '../../lib/memoryApi';
import { t } from '../../lib/designTokens';

const LEVELS = [
  { n: 1, label: 'Passive',             color: '#10b981', desc: 'Read-only analysis' },
  { n: 2, label: 'Injection',           color: '#f59e0b', desc: 'Prompt injection' },
  { n: 3, label: 'Adversarial',         color: '#f97316', desc: 'Active red team' },
  { n: 4, label: 'Agent Abuse',         color: '#ef4444', desc: 'Requires approval', locked: true },
  { n: 5, label: 'Sandbox',             color: '#7c3aed', desc: 'Req. approval + sandbox', locked: true },
];

const TESTS = [
  { id: 'prompt-injection',  label: 'Prompt Injection',   icon: Zap,           level: 2, color: '#f59e0b' },
  { id: 'adversarial',       label: 'Adversarial',        icon: AlertTriangle, level: 3, color: '#f97316' },
  { id: 'memory-poisoning',  label: 'Memory Poisoning',   icon: Shield,        level: 3, color: '#ef4444' },
  { id: 'model-compare',     label: 'Model Compare',      icon: Eye,           level: 1, color: '#3b82f6' },
];

const SEV: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981', info: '#3b82f6' };
const STAT: Record<string, string> = { open: '#f59e0b', triaged: '#3b82f6', remediated: '#10b981', closed: '#6b7280' };

export function RedTeam() {
  const [level, setLevel] = useState(1);
  const [findings, setFindings] = useState<any[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [prompt, setPrompt] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium', level: 1 });

  useEffect(() => { memSvc.redTeamFindings().then(setFindings).catch(() => {}); }, []);

  const run = async (id: string, reqLevel: number) => {
    if (reqLevel > level) return;
    setRunning(id);
    try {
      const r = await memSvc.runRedTest(id, { prompt: prompt || 'Default test prompt.' });
      setResults(p => ({ ...p, [id]: r }));
    } catch (e: any) {
      setResults(p => ({ ...p, [id]: { error: e.message } }));
    } finally { setRunning(null); }
  };

  const submit = async () => {
    const f = await memSvc.createFinding({ ...form, team: 'red' });
    setFindings(p => [f, ...p]);
    setNewOpen(false);
    setForm({ title: '', description: '', severity: 'medium', level: 1 });
  };

  const inputStyle = { width: '100%', padding: '7px 9px', borderRadius: t.radiusSm, background: t.surface, border: `1px solid ${t.border}`, color: t.textPrimary, fontSize: 13, outline: 'none' };
  const label = { display: 'block' as const, fontSize: 11, fontWeight: 600 as const, color: t.textMuted, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.05em' };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', background: t.bg }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div style={{ width: 38, height: 38, borderRadius: t.radiusSm, background: t.redDim, border: `1px solid ${t.redBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={18} style={{ color: t.red }} />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>Red Team</h1>
          <p style={{ fontSize: 12, color: t.textMuted }}>Adversarial testing · Godmode</p>
        </div>
        <button onClick={() => setNewOpen(true)} style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.redDim, border: `1px solid ${t.redBorder}`, color: t.red, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={13} /> Log Finding
        </button>
      </div>

      {/* Level selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Level</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {LEVELS.map(lv => (
            <button key={lv.n} onClick={() => !lv.locked && setLevel(lv.n)}
              style={{
                padding: '10px 8px', borderRadius: t.radiusSm, cursor: lv.locked ? 'not-allowed' : 'pointer', textAlign: 'center',
                background: level === lv.n ? `${lv.color}15` : t.surface,
                border: `1px solid ${level === lv.n ? lv.color : t.border}`,
                opacity: lv.locked ? 0.45 : 1, transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: 3 }}>
                {lv.locked && <Lock size={10} style={{ color: lv.color }} />}
                <span style={{ fontSize: 16, fontWeight: 800, color: lv.color, fontFamily: 'DM Mono, monospace' }}>{lv.n}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: level === lv.n ? lv.color : t.textSecond }}>{lv.label}</div>
              <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>{lv.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Prompt input */}
        <div style={{ padding: 16, borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}` }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 3 }}>Test Prompt</h3>
          <p style={{ fontSize: 12, color: t.textMuted, marginBottom: 10 }}>Sent with all test runs below</p>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Enter adversarial prompt…" rows={4}
            style={{ width: '100%', padding: '7px 9px', borderRadius: t.radiusSm, resize: 'vertical', background: t.bgSub, border: `1px solid rgba(239,68,68,0.2)`, color: t.textPrimary, fontSize: 13, outline: 'none', fontFamily: 'DM Mono, monospace' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 10 }}>
            {TESTS.map(test => {
              const Icon = test.icon;
              const locked = test.level > level;
              const r = results[test.id];
              return (
                <button key={test.id} onClick={() => !locked && run(test.id, test.level)}
                  disabled={locked || running === test.id}
                  style={{
                    padding: '9px 10px', borderRadius: t.radiusSm, cursor: locked ? 'not-allowed' : 'pointer',
                    background: r?.error ? t.redDim : r ? t.greenDim : `${test.color}10`,
                    border: `1px solid ${r?.error ? t.redBorder : r ? 'rgba(16,185,129,0.25)' : `${test.color}30`}`,
                    textAlign: 'left', transition: 'all 0.12s', opacity: locked ? 0.4 : 1,
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}>
                  {locked ? <Lock size={12} style={{ color: test.color }} />
                    : running === test.id ? <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${test.color}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                    : r ? <CheckCircle size={12} style={{ color: r.error ? t.red : t.green }} />
                    : <Play size={12} style={{ color: test.color }} />}
                  <span style={{ fontSize: 11, fontWeight: 600, color: locked ? t.textMuted : test.color }}>{test.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        <div style={{ padding: 16, borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}` }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 10 }}>Results</h3>
          <div style={{ overflowY: 'auto', maxHeight: 210 }}>
            {Object.keys(results).length === 0 ? (
              <p style={{ fontSize: 12, color: t.textMuted }}>No tests run yet</p>
            ) : Object.entries(results).map(([id, r]: [string, any]) => (
              <div key={id} style={{ marginBottom: 8, padding: '9px 10px', borderRadius: t.radiusSm, background: r.error ? t.redDim : t.greenDim, border: `1px solid ${r.error ? t.redBorder : 'rgba(16,185,129,0.2)'}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: r.error ? t.red : t.green, marginBottom: 3 }}>{id}</div>
                <pre style={{ fontSize: 10, color: t.textMuted, fontFamily: 'DM Mono, monospace', whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(r, null, 2).slice(0, 280)}</pre>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Findings */}
      <div style={{ borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}` }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>Findings ({findings.length})</h3>
        </div>
        {findings.length === 0 ? (
          <p style={{ padding: '28px', textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No findings</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Title', 'Severity', 'Level', 'Status', 'Created'].map(h => (
              <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${t.border}` }}>{h}</th>
            ))}</tr></thead>
            <tbody>{findings.map(f => (
              <tr key={f.id} style={{ borderBottom: `1px solid ${t.border}` }}>
                <td style={{ padding: '9px 14px', fontSize: 13, color: t.textPrimary, fontWeight: 500 }}>{f.title}</td>
                <td style={{ padding: '9px 14px' }}><span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: SEV[f.severity], background: `${SEV[f.severity]}15` }}>{f.severity}</span></td>
                <td style={{ padding: '9px 14px', fontSize: 12, fontFamily: 'DM Mono, monospace', color: t.textMuted }}>L{f.level}</td>
                <td style={{ padding: '9px 14px' }}><span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: STAT[f.status], background: `${STAT[f.status]}15` }}>{f.status}</span></td>
                <td style={{ padding: '9px 14px', fontSize: 12, color: t.textMuted }}>{new Date(f.created_at).toLocaleDateString()}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {newOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setNewOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ width: 420, background: t.bgSub, border: `1px solid ${t.redBorder}`, borderRadius: t.radiusLg, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>Log Finding</h3>
                <button onClick={() => setNewOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted }}><X size={14} /></button>
              </div>
              {[['Title', 'title', 'text'], ['Description', 'description', 'textarea']].map(([lbl, key, type]) => (
                <div key={key} style={{ marginBottom: 11 }}>
                  <label style={label}>{lbl}</label>
                  {type === 'textarea'
                    ? <textarea value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
                    : <input value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} />}
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div>
                  <label style={label}>Severity</label>
                  <select value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value }))} style={inputStyle}>
                    {['critical', 'high', 'medium', 'low', 'info'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Level</label>
                  <select value={form.level} onChange={e => setForm(p => ({ ...p, level: +e.target.value }))} style={inputStyle}>
                    {[1, 2, 3].map(n => <option key={n} value={n}>Level {n}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setNewOpen(false)} style={{ flex: 1, padding: '8px', borderRadius: t.radiusSm, cursor: 'pointer', background: 'none', border: `1px solid ${t.border}`, color: t.textSecond, fontSize: 13, fontWeight: 600 }}>Cancel</button>
                <button onClick={submit} style={{ flex: 2, padding: '8px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.red, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700 }}>Log Finding</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
