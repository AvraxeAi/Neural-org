import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, TrendingUp, ArrowRight, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { memSvc } from '../../lib/memoryApi';
import { t } from '../../lib/designTokens';

const SEV: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981', info: '#3b82f6' };

export function PurpleTeam() {
  const [findings, setFindings] = useState<any>({ red: [] });
  const [trends, setTrends] = useState<any>(null);
  const [retesting, setRetesting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([memSvc.purpleFindings(), memSvc.purpleTrends()])
      .then(([f, tr]) => { setFindings(f || { red: [] }); setTrends(tr); })
      .catch(() => {});
  }, []);

  const retest = async (id: string) => {
    setRetesting(id);
    try { await memSvc.runRedTest('retest', { finding_id: id }); } catch {}
    finally { setRetesting(null); }
  };

  const trendData = trends?.weekly || Array.from({ length: 6 }, (_, i) => ({
    week: `W${i + 1}`, findings: Math.floor(Math.random() * 7), remediations: Math.floor(Math.random() * 5),
  }));

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', background: t.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div style={{ width: 38, height: 38, borderRadius: t.radiusSm, background: t.purpleDim, border: `1px solid rgba(139,92,246,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Layers size={18} style={{ color: t.purple }} />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>Purple Team</h1>
          <p style={{ fontSize: 12, color: t.textMuted }}>Red ↔ Blue bridge · Findings → Remediations</p>
        </div>
      </div>

      {/* Trend chart */}
      <div style={{ padding: 16, borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}`, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
          <TrendingUp size={14} style={{ color: t.purple }} />
          <h3 style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>Finding / Fix Velocity</h3>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="red" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
              <linearGradient id="green" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.18} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={t.border} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: t.textMuted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: t.textMuted }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: t.bgSub, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: 12, color: t.textPrimary }} />
            <Legend wrapperStyle={{ fontSize: 12, color: t.textMuted }} />
            <Area type="monotone" dataKey="findings" name="Findings" stroke="#ef4444" fill="url(#red)" strokeWidth={1.5} />
            <Area type="monotone" dataKey="remediations" name="Remediations" stroke="#10b981" fill="url(#green)" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Findings bridge */}
      <div style={{ borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}` }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>Active Findings Bridge</h3>
        </div>
        {(findings.red || []).length === 0 ? (
          <p style={{ padding: 28, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No findings to bridge</p>
        ) : (
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {(findings.red || []).map((f: any, i: number) => (
              <motion.div key={f.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: t.radiusSm, background: t.bgSub, border: `1px solid ${t.border}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, marginBottom: 2 }}>{f.title}</div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    <span style={{ fontSize: 11, color: SEV[f.severity] ?? '#6b7280', fontWeight: 600 }}>{f.severity}</span>
                    <span style={{ fontSize: 11, color: t.textMuted }}>L{f.level}</span>
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: t.purple, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: '7px 10px', borderRadius: t.radiusSm, background: f.remediation ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${f.remediation ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                  {f.remediation
                    ? <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle size={12} style={{ color: t.green }} /><span style={{ fontSize: 12, color: t.green, fontWeight: 600 }}>Remediated</span></div>
                    : <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={12} style={{ color: t.amber }} /><span style={{ fontSize: 12, color: t.amber, fontWeight: 600 }}>Pending</span></div>}
                </div>
                <button onClick={() => retest(f.id)} disabled={retesting === f.id}
                  style={{ padding: '5px 9px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.purpleDim, border: `1px solid rgba(139,92,246,0.25)`, color: t.purple, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RefreshCw size={10} style={retesting === f.id ? { animation: 'spin 1s linear infinite' } : {}} /> Retest
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
