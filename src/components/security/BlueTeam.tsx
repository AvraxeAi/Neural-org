import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, AlertTriangle, Activity, Plus, X, Crosshair, CheckCircle } from 'lucide-react';
import { memSvc } from '../../lib/memoryApi';
import { t } from '../../lib/designTokens';

const SEV: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981', info: '#3b82f6' };
const INC: Record<string, string> = { open: '#f59e0b', investigating: '#3b82f6', contained: '#8b5cf6', resolved: '#10b981', closed: '#6b7280' };

const Stat = ({ label, value, color, icon: Icon }: any) => (
  <div style={{ flex: 1, padding: '14px 16px', borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}` }}>
    <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 8 }}>
      <Icon size={14} style={{ color }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{label}</span>
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: 'DM Mono, monospace' }}>{value}</div>
  </div>
);

const inputStyle = (borderColor = '') => ({ width: '100%', padding: '7px 9px', borderRadius: '6px', background: '#1e1e1e', border: `1px solid ${borderColor || 'rgba(255,255,255,0.08)'}`, color: '#ececec', fontSize: 13, outline: 'none' });
const labelStyle = { display: 'block' as const, fontSize: 11, fontWeight: 600 as const, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.05em' };

function Modal({ open, onClose, title, color, form, setForm, onSubmit }: any) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            style={{ width: 400, background: t.bgSub, border: `1px solid ${color}25`, borderRadius: t.radiusLg, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>{title}</h3>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textMuted }}><X size={14} /></button>
            </div>
            {[['Title', 'title', 'text'], ['Description', 'description', 'textarea']].map(([lbl, key, type]) => (
              <div key={key} style={{ marginBottom: 11 }}>
                <label style={labelStyle}>{lbl}</label>
                {type === 'textarea'
                  ? <textarea value={form[key]} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((p: any) => ({ ...p, [key]: e.target.value }))} rows={3} style={{ ...inputStyle(color + '25'), resize: 'vertical' as const, fontFamily: 'inherit' }} />
                  : <input value={form[key]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: any) => ({ ...p, [key]: e.target.value }))} style={inputStyle(color + '25')} />}
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Severity</label>
              <select value={form.severity} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((p: any) => ({ ...p, severity: e.target.value }))} style={inputStyle(color + '25')}>
                {['critical', 'high', 'medium', 'low', 'info'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer', background: 'none', border: `1px solid ${t.border}`, color: t.textSecond, fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={onSubmit} style={{ flex: 2, padding: '8px', borderRadius: '6px', cursor: 'pointer', background: color, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700 }}>Create</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function BlueTeam() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [iocs, setIocs] = useState<any[]>([]);
  const [tab, setTab] = useState<'alerts' | 'incidents' | 'ioc'>('alerts');
  const [alertOpen, setAlertOpen] = useState(false);
  const [incOpen, setIncOpen] = useState(false);
  const [alertForm, setAlertForm] = useState({ title: '', description: '', severity: 'medium' });
  const [incForm, setIncForm] = useState({ title: '', description: '', severity: 'medium' });

  useEffect(() => {
    Promise.all([memSvc.blueAlerts(), memSvc.incidents(), memSvc.iocs()])
      .then(([a, i, c]) => { setAlerts(a || []); setIncidents(i || []); setIocs(c || []); })
      .catch(() => {});
  }, []);

  const createAlert = async () => {
    const a = await memSvc.createAlert({ ...alertForm, team: 'blue' });
    setAlerts(p => [a, ...p]); setAlertOpen(false); setAlertForm({ title: '', description: '', severity: 'medium' });
  };
  const createInc = async () => {
    const i = await memSvc.createIncident(incForm);
    setIncidents(p => [i, ...p]); setIncOpen(false); setIncForm({ title: '', description: '', severity: 'medium' });
  };

  const th = { padding: '8px 14px', textAlign: 'left' as const, fontSize: 10, fontWeight: 600 as const, color: t.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', borderBottom: `1px solid ${t.border}` };
  const td = { padding: '9px 14px', borderBottom: `1px solid ${t.border}`, fontSize: 13 };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', background: t.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 38, height: 38, borderRadius: t.radiusSm, background: t.blueDim, border: `1px solid ${t.blueBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Eye size={18} style={{ color: t.blue }} />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>Blue Team</h1>
          <p style={{ fontSize: 12, color: t.textMuted }}>Detection · Monitoring · Response</p>
        </div>
        <button onClick={() => setAlertOpen(true)} style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.blueDim, border: `1px solid ${t.blueBorder}`, color: t.blue, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={13} /> New Alert
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <Stat label="Critical" value={alerts.filter(a => a.severity === 'critical').length} color="#ef4444" icon={AlertTriangle} />
        <Stat label="Incidents" value={incidents.filter(i => i.status === 'open').length} color="#f59e0b" icon={Activity} />
        <Stat label="IOCs" value={iocs.length} color="#3b82f6" icon={Crosshair} />
        <Stat label="Total Alerts" value={alerts.length} color="#10b981" icon={CheckCircle} />
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {(['alerts', 'incidents', 'ioc'] as const).map(tp => (
          <button key={tp} onClick={() => setTab(tp)}
            style={{ padding: '5px 14px', borderRadius: t.radiusSm, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === tp ? t.blueDim : 'transparent', border: `1px solid ${tab === tp ? t.blueBorder : 'transparent'}`, color: tab === tp ? t.blue : t.textMuted, transition: 'all 0.12s' }}>
            {tp === 'ioc' ? 'IOCs' : tp.charAt(0).toUpperCase() + tp.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'alerts' && (
          <motion.div key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
              {alerts.length === 0 ? <p style={{ padding: 28, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No alerts</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Title', 'Severity', 'Status', 'Created'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>{alerts.map(a => (
                    <tr key={a.id}>
                      <td style={{ ...td, color: t.textPrimary, fontWeight: 500 }}>{a.title}</td>
                      <td style={td}><span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: SEV[a.severity], background: `${SEV[a.severity]}15` }}>{a.severity}</span></td>
                      <td style={{ ...td, color: t.textMuted }}>{a.status || 'open'}</td>
                      <td style={{ ...td, color: t.textMuted }}>{new Date(a.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}
        {tab === 'incidents' && (
          <motion.div key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <button onClick={() => setIncOpen(true)} style={{ padding: '6px 12px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.blueDim, border: `1px solid ${t.blueBorder}`, color: t.blue, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Plus size={12} /> New Incident
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {incidents.length === 0 ? <div style={{ padding: 28, textAlign: 'center', color: t.textMuted, fontSize: 13, background: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>No incidents</div>
                : incidents.map((inc, i) => (
                  <div key={inc.id} style={{ padding: '12px 14px', borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: t.textPrimary }}>{inc.title}</span>
                      <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: SEV[inc.severity], background: `${SEV[inc.severity]}15` }}>{inc.severity}</span>
                      <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: INC[inc.status], background: `${INC[inc.status]}15` }}>{inc.status}</span>
                    </div>
                    {inc.description && <p style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.5 }}>{inc.description}</p>}
                  </div>
                ))}
            </div>
          </motion.div>
        )}
        {tab === 'ioc' && (
          <motion.div key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div style={{ borderRadius: t.radius, background: t.surface, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
              {iocs.length === 0 ? <p style={{ padding: 28, textAlign: 'center', color: t.textMuted, fontSize: 13 }}>No IOCs</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Type', 'Value', 'Severity', 'Expires'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>{iocs.map(ioc => (
                    <tr key={ioc.id}>
                      <td style={{ ...td, color: t.blue, fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{ioc.ioc_type}</td>
                      <td style={{ ...td, color: t.textPrimary, fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{ioc.value}</td>
                      <td style={td}><span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600, color: SEV[ioc.severity], background: `${SEV[ioc.severity]}15` }}>{ioc.severity}</span></td>
                      <td style={{ ...td, color: t.textMuted }}>{ioc.expires_at ? new Date(ioc.expires_at).toLocaleDateString() : '∞'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={alertOpen} onClose={() => setAlertOpen(false)} title="New Alert" color={t.blue} form={alertForm} setForm={setAlertForm} onSubmit={createAlert} />
      <Modal open={incOpen} onClose={() => setIncOpen(false)} title="New Incident" color={t.amber} form={incForm} setForm={setIncForm} onSubmit={createInc} />
    </div>
  );
}
