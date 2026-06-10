import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Plus, X, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { memSvc } from '../../lib/memoryApi';
import { t } from '../../lib/designTokens';

export function LearningLoop() {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [form, setForm] = useState({ action: '', outcome: '', agent_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try { setLessons((await memSvc.lessons({ limit: '30' })) ?? []); }
    catch { setLessons([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await memSvc.review({ ...form, context: {} });
      setResult(r);
      if (r) load();
    } catch (e: any) { setResult({ error: e.message }); }
    finally { setSubmitting(false); }
  };

  const imp = (v: number) => v > 0.7 ? t.green : v > 0.4 ? t.amber : t.textMuted;
  const inp = { width: '100%', padding: '7px 9px', borderRadius: t.radiusSm, background: t.surface, border: `1px solid ${t.border}`, color: t.textPrimary, fontSize: 13, outline: 'none' };
  const lbl = { display: 'block' as const, fontSize: 11, fontWeight: 600 as const, color: t.textMuted, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.05em' };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', background: t.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div style={{ width: 38, height: 38, borderRadius: t.radiusSm, background: t.amberDim, border: `1px solid rgba(245,158,11,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lightbulb size={18} style={{ color: t.amber }} />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>Learning Loop</h1>
          <p style={{ fontSize: 12, color: t.textMuted }}>Action → Outcome → Lesson</p>
        </div>
        <button onClick={() => { setReviewOpen(true); setResult(null); }} style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.amberDim, border: `1px solid rgba(245,158,11,0.25)`, color: t.amber, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={13} /> Review Outcome
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total Lessons', value: lessons.length, color: t.accent },
          { label: 'High Importance', value: lessons.filter(l => l.importance > 0.7).length, color: t.green },
          { label: 'Failures Logged', value: lessons.filter(l => l.failure_mode).length, color: t.red },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '14px 16px', borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: 'DM Mono, monospace' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Lessons list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ height: 72, borderRadius: t.radius, background: t.surface, opacity: 0.5 }} />
        )) : lessons.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: t.textMuted, fontSize: 13, background: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>No lessons stored yet. Run a review to generate one.</div>
        ) : lessons.map((l, i) => (
          <motion.div key={l.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.035 }}
            style={{ padding: '13px 16px', borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}`, borderLeft: `3px solid ${imp(l.importance ?? 0.5)}` }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
              {l.failure_mode ? <AlertCircle size={14} style={{ color: t.red, flexShrink: 0, marginTop: 1 }} /> : <CheckCircle size={14} style={{ color: t.green, flexShrink: 0, marginTop: 1 }} />}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: t.textPrimary, fontWeight: 500, lineHeight: 1.5, marginBottom: 4 }}>{l.lesson || l.action}</p>
                {l.failure_mode && <p style={{ fontSize: 12, color: t.red, marginBottom: 3 }}>Failure: {l.failure_mode}</p>}
                {l.improvement && <p style={{ fontSize: 12, color: t.accent }}>→ {l.improvement}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: imp(l.importance ?? 0.5), fontWeight: 700 }}>
                  {((l.importance ?? 0.5) * 100).toFixed(0)}%
                </span>
                <span style={{ fontSize: 10, color: t.textMuted }}>{new Date(l.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            {l.agent_id && <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: t.blueDim, color: t.blue, fontWeight: 600 }}>{l.agent_id}</span>}
          </motion.div>
        ))}
      </div>

      {/* Review modal */}
      {reviewOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setReviewOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            style={{ width: 440, background: t.bgSub, border: `1px solid ${t.border}`, borderRadius: t.radiusLg, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>Review Outcome</h3>
              <button onClick={() => setReviewOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted }}><X size={14} /></button>
            </div>
            {!result ? (
              <>
                {[['Action Taken', 'action', 'textarea', 'What did the agent do?'], ['Outcome', 'outcome', 'textarea', 'What was the result?'], ['Agent ID (optional)', 'agent_id', 'text', 'e.g. cash-agent-1']].map(([label, key, type, ph]) => (
                  <div key={key} style={{ marginBottom: 11 }}>
                    <label style={lbl}>{label}</label>
                    {type === 'textarea'
                      ? <textarea value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} rows={3} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
                      : <input value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={inp} />}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={() => setReviewOpen(false)} style={{ flex: 1, padding: '8px', borderRadius: t.radiusSm, cursor: 'pointer', background: 'none', border: `1px solid ${t.border}`, color: t.textSecond, fontSize: 13, fontWeight: 600 }}>Cancel</button>
                  <button onClick={submit} disabled={submitting || !form.action || !form.outcome}
                    style={{ flex: 2, padding: '8px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.amber, border: 'none', color: '#0d1117', fontSize: 13, fontWeight: 700, opacity: submitting || !form.action || !form.outcome ? 0.5 : 1 }}>
                    {submitting ? 'Analyzing…' : 'Extract Lesson'}
                  </button>
                </div>
              </>
            ) : (
              <div>
                {result.error ? (
                  <div style={{ padding: '12px 14px', borderRadius: t.radiusSm, background: t.redDim, border: `1px solid ${t.redBorder}`, color: t.red, fontSize: 13 }}>{result.error}</div>
                ) : result.lesson ? (
                  <div style={{ padding: '14px', borderRadius: t.radiusSm, background: t.greenDim, border: `1px solid rgba(16,185,129,0.25)` }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.green, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lesson Stored</div>
                    <p style={{ fontSize: 13, color: t.textPrimary, lineHeight: 1.6 }}>{result.lesson}</p>
                    {result.improvement && <p style={{ fontSize: 12, color: t.accent, marginTop: 6 }}>→ {result.improvement}</p>}
                  </div>
                ) : (
                  <div style={{ padding: '12px 14px', borderRadius: t.radiusSm, background: t.surface, border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 13 }}>
                    Importance below threshold — lesson not stored.
                  </div>
                )}
                <button onClick={() => { setReviewOpen(false); setForm({ action: '', outcome: '', agent_id: '' }); }}
                  style={{ width: '100%', marginTop: 12, padding: '8px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.surface, border: `1px solid ${t.border}`, color: t.textSecond, fontSize: 13, fontWeight: 600 }}>Close</button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
