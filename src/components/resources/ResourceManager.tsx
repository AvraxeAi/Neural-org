import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, RefreshCw, Play, Pause, Zap, AlertTriangle } from 'lucide-react';
import { memSvc } from '../../lib/memoryApi';
import { t } from '../../lib/designTokens';

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', normal: '#00E6A8', low: '#6b7280', background: '#4b5563',
};
const STATUS_COLOR: Record<string, string> = {
  active: '#10b981', hibernating: '#6366f1', throttled: '#f59e0b', killed: '#ef4444',
};

const ProgressBar = ({ value, max, color }: { value: number; max: number; color: string }) => {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ width: '100%', height: 4, borderRadius: 2, background: t.border, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? t.red : color, borderRadius: 2, transition: 'width 0.3s ease' }} />
    </div>
  );
};

export function ResourceManager() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setAgents((await memSvc.priorityQueue()) ?? []); }
    catch { setAgents([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, []);

  const hibernate = async (id: string) => { await memSvc.hibernateAgent(id); load(); };
  const wake = async (id: string) => { await memSvc.wakeAgent(id); load(); };
  const sweep = async () => { setSweeping(true); try { await memSvc.sweepZombies(); load(); } finally { setSweeping(false); } };

  const totalTokens = agents.reduce((s, a) => s + (a.tokens_used ?? 0), 0);
  const activeCount = agents.filter(a => a.status === 'active').length;
  const killedCount = agents.filter(a => a.status === 'killed').length;

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', background: t.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div style={{ width: 38, height: 38, borderRadius: t.radiusSm, background: t.greenDim, border: `1px solid rgba(16,185,129,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Cpu size={18} style={{ color: t.green }} />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>Agent Resource Manager</h1>
          <p style={{ fontSize: 12, color: t.textMuted }}>Token budgets · Priority queues · Hibernation</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={sweep} disabled={sweeping}
            style={{ padding: '6px 12px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.redDim, border: `1px solid ${t.redBorder}`, color: t.red, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            {sweeping ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <AlertTriangle size={12} />} Sweep Zombies
          </button>
          <button onClick={load} style={{ padding: '6px 12px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.surface, border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Active', value: activeCount, color: t.green },
          { label: 'Total Agents', value: agents.length, color: t.accent },
          { label: 'Killed', value: killedCount, color: t.red },
          { label: 'Total Tokens', value: totalTokens.toLocaleString(), color: t.amber },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '12px 14px', borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'DM Mono, monospace' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Priority queue */}
      <div style={{ borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '11px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>Priority Queue ({agents.length})</h3>
          <span style={{ fontSize: 11, color: t.textMuted }}>Auto-refresh 15s</span>
        </div>
        {loading && agents.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>Loading…</div>
        ) : agents.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No agents registered</div>
        ) : (
          <div>
            {agents.map((a, i) => (
              <motion.div key={a.id || a.agent_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Priority indicator */}
                <div style={{ width: 6, height: 38, borderRadius: 3, background: PRIORITY_COLOR[a.priority] ?? t.textMuted, flexShrink: 0 }} />

                {/* Agent info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, fontFamily: 'DM Mono, monospace' }}>{a.agent_id}</span>
                    <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: STATUS_COLOR[a.status] ?? t.textMuted, background: `${STATUS_COLOR[a.status] ?? '#6b7280'}15` }}>{a.status}</span>
                    <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: PRIORITY_COLOR[a.priority] ?? t.textMuted, background: `${PRIORITY_COLOR[a.priority] ?? '#6b7280'}15` }}>{a.priority}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 10, color: t.textMuted }}>Tokens</span>
                        <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: (a.tokens_used / a.token_budget) > 0.8 ? t.red : t.textMuted }}>
                          {(a.tokens_used ?? 0).toLocaleString()} / {(a.token_budget ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <ProgressBar value={a.tokens_used ?? 0} max={a.token_budget ?? 1} color={t.accent} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 10, color: t.textMuted }}>CPU</span>
                        <span style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: t.textMuted }}>{a.cpu_budget_pct ?? 50}%</span>
                      </div>
                      <ProgressBar value={a.cpu_budget_pct ?? 0} max={100} color={t.blue} />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {a.status === 'active' ? (
                    <button onClick={() => hibernate(a.agent_id)}
                      style={{ padding: '5px 9px', borderRadius: t.radiusSm, cursor: 'pointer', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#6366f1', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Pause size={11} /> Sleep
                    </button>
                  ) : a.status === 'hibernating' ? (
                    <button onClick={() => wake(a.agent_id)}
                      style={{ padding: '5px 9px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.greenDim, border: `1px solid rgba(16,185,129,0.25)`, color: t.green, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Play size={11} /> Wake
                    </button>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
