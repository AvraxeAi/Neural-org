import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, AlertOctagon, CheckCircle, XCircle, Clock, Download, ShieldOff, Shield } from 'lucide-react';
import { memSvc } from '../../lib/memoryApi';
import { t } from '../../lib/designTokens';

const STATUS = {
  pending:  { color: '#f59e0b', Icon: Clock },
  approved: { color: '#10b981', Icon: CheckCircle },
  rejected: { color: '#ef4444', Icon: XCircle },
} as Record<string, { color: string; Icon: any }>;

const th = { padding: '8px 14px', textAlign: 'left' as const, fontSize: 10, fontWeight: 600 as const, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderBottom: 'rgba(255,255,255,0.08) 1px solid' };

export function Governance() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [ks, setKs] = useState<any>(null);
  const [tab, setTab] = useState<'approvals' | 'audit' | 'killswitch'>('approvals');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [killConfirm, setKillConfirm] = useState(false);
  const [killReason, setKillReason] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => {
    Promise.all([memSvc.approvals(statusFilter), memSvc.auditLog({ limit: '50' }), memSvc.killSwitchStatus()])
      .then(([a, au, k]) => { setApprovals(a || []); setAuditLog(Array.isArray(au) ? au : []); setKs(k); })
      .catch(() => {});
  };

  useEffect(() => { load(); }, [statusFilter]);

  const review = async (id: string, decision: 'approved' | 'rejected') => {
    const u = await memSvc.reviewApproval(id, { decision, reviewed_by: 'Cash' });
    setApprovals(p => p.map(a => a.id === id ? { ...a, ...u } : a));
  };

  const activate = async () => {
    setLoading(true);
    try { const k = await memSvc.activateKillSwitch({ activated_by: 'Cash', reason: killReason }); setKs(k); setKillConfirm(false); setKillReason(''); }
    catch {} finally { setLoading(false); }
  };

  const inputStyle = { width: '100%', padding: '7px 9px', borderRadius: '6px', background: t.surface, border: `1px solid ${t.border}`, color: t.textPrimary, fontSize: 13, outline: 'none' };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', background: t.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div style={{ width: 38, height: 38, borderRadius: t.radiusSm, background: t.surface, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={18} style={{ color: t.textSecond }} />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>Governance</h1>
          <p style={{ fontSize: 12, color: t.textMuted }}>Approvals · Audit · Kill switch</p>
        </div>
        <div style={{ marginLeft: 'auto', padding: '7px 12px', borderRadius: t.radiusSm, background: ks?.active ? t.redDim : t.greenDim, border: `1px solid ${ks?.active ? t.redBorder : 'rgba(16,185,129,0.25)'}`, display: 'flex', alignItems: 'center', gap: 7 }}>
          {ks?.active ? <ShieldOff size={13} style={{ color: t.red }} /> : <Shield size={13} style={{ color: t.green }} />}
          <span style={{ fontSize: 12, fontWeight: 700, color: ks?.active ? t.red : t.green }}>
            {ks?.active ? 'KILL SWITCH ACTIVE' : 'All Nominal'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
        {(['approvals', 'audit', 'killswitch'] as const).map(tp => (
          <button key={tp} onClick={() => setTab(tp)}
            style={{ padding: '5px 14px', borderRadius: t.radiusSm, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === tp ? t.surfaceHover : 'transparent', border: `1px solid ${tab === tp ? t.borderFocus : 'transparent'}`, color: tab === tp ? t.textPrimary : t.textMuted, transition: 'all 0.12s' }}>
            {tp === 'killswitch' ? 'Kill Switch' : tp.charAt(0).toUpperCase() + tp.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'approvals' && (
          <motion.div key="ap" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
              {(['pending', 'approved', 'rejected'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{ padding: '3px 11px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: statusFilter === s ? `${STATUS[s].color}15` : 'transparent', border: `1px solid ${statusFilter === s ? STATUS[s].color : t.border}`, color: statusFilter === s ? STATUS[s].color : t.textMuted, textTransform: 'capitalize' }}>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {approvals.length === 0 ? (
                <div style={{ padding: 28, textAlign: 'center', color: t.textMuted, fontSize: 13, background: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>No {statusFilter} approvals</div>
              ) : approvals.map(a => {
                const { color, Icon } = STATUS[a.status] ?? STATUS.pending;
                return (
                  <div key={a.id} style={{ padding: '12px 14px', borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <Icon size={14} style={{ color, marginTop: 1, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{a.action}</span>
                          <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: t.textMuted }}>{a.resource_type}</span>
                          <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600, color, background: `${color}15` }}>{a.status}</span>
                        </div>
                        <p style={{ fontSize: 12, color: t.textMuted }}>By <strong style={{ color: t.textSecond }}>{a.requested_by}</strong>{a.reason ? ` · ${a.reason}` : ''}</p>
                      </div>
                      {a.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => review(a.id, 'approved')} style={{ padding: '4px 10px', borderRadius: t.radiusSm, cursor: 'pointer', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: t.green, fontSize: 12, fontWeight: 600 }}>Approve</button>
                          <button onClick={() => review(a.id, 'rejected')} style={{ padding: '4px 10px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.redDim, border: `1px solid ${t.redBorder}`, color: t.red, fontSize: 12, fontWeight: 600 }}>Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {tab === 'audit' && (
          <motion.div key="au" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button style={{ padding: '5px 11px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.surface, border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Download size={12} /> Export JSONL
              </button>
            </div>
            <div style={{ borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
              {auditLog.length === 0 ? <p style={{ padding: 28, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No audit events</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Event', 'Resource', 'Actor', 'Time'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>{auditLog.map((e, i) => (
                    <tr key={e.id || i} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ padding: '8px 14px', fontSize: 12, fontFamily: 'DM Mono, monospace', color: t.accent, fontWeight: 600 }}>{e.event_type}</td>
                      <td style={{ padding: '8px 14px', fontSize: 12, color: t.textMuted }}>{e.resource_type}{e.resource_id ? ` · ${e.resource_id.slice(0, 8)}` : ''}</td>
                      <td style={{ padding: '8px 14px', fontSize: 12, color: t.textSecond }}>{e.actor || '—'}</td>
                      <td style={{ padding: '8px 14px', fontSize: 12, color: t.textMuted }}>{new Date(e.created_at).toLocaleString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}

        {tab === 'killswitch' && (
          <motion.div key="ks" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ maxWidth: 520, margin: '0 auto' }}>
              <div style={{ padding: 28, borderRadius: t.radius, textAlign: 'center', background: ks?.active ? t.redDim : t.surface, border: `1px solid ${ks?.active ? t.redBorder : t.border}`, marginBottom: 16 }}>
                {ks?.active ? (
                  <>
                    <ShieldOff size={44} style={{ color: t.red, marginBottom: 14 }} />
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: t.red, marginBottom: 6 }}>Kill Switch Active</h2>
                    <p style={{ fontSize: 13, color: t.textMuted, marginBottom: 3 }}>Halted by <strong style={{ color: t.textSecond }}>{ks.activated_by}</strong></p>
                    <p style={{ fontSize: 12, color: t.textMuted, fontStyle: 'italic' }}>{ks.reason}</p>
                  </>
                ) : (
                  <>
                    <Shield size={44} style={{ color: t.green, marginBottom: 14 }} />
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: t.green, marginBottom: 6 }}>All Systems Operational</h2>
                    <p style={{ fontSize: 13, color: t.textMuted }}>No kill switch active.</p>
                  </>
                )}
              </div>

              {!ks?.active && (
                !killConfirm ? (
                  <button onClick={() => setKillConfirm(true)}
                    style={{ width: '100%', padding: '12px', borderRadius: t.radius, cursor: 'pointer', background: t.redDim, border: `1px solid ${t.redBorder}`, color: t.red, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    <AlertOctagon size={15} /> Activate Emergency Kill Switch
                  </button>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                    style={{ padding: 18, borderRadius: t.radius, background: t.redDim, border: `1px solid ${t.redBorder}` }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: t.red, marginBottom: 10 }}>⚠️ This halts ALL agent activity. Provide reason:</p>
                    <textarea value={killReason} onChange={e => setKillReason(e.target.value)} placeholder="Reason…" rows={3}
                      style={{ width: '100%', padding: '7px 9px', borderRadius: t.radiusSm, resize: 'none', background: t.surface, border: `1px solid ${t.redBorder}`, color: t.textPrimary, fontSize: 13, outline: 'none', fontFamily: 'inherit', marginBottom: 10 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setKillConfirm(false)} style={{ flex: 1, padding: '8px', borderRadius: t.radiusSm, cursor: 'pointer', background: 'none', border: `1px solid ${t.border}`, color: t.textSecond, fontSize: 13, fontWeight: 600 }}>Cancel</button>
                      <button onClick={activate} disabled={!killReason.trim() || loading}
                        style={{ flex: 2, padding: '8px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.red, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, opacity: !killReason.trim() || loading ? 0.5 : 1 }}>
                        {loading ? 'Activating…' : 'CONFIRM KILL SWITCH'}
                      </button>
                    </div>
                  </motion.div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
