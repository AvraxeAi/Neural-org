import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Play, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { memSvc } from '../../lib/memoryApi';
import { t } from '../../lib/designTokens';

const NIGHTLY = [
  { id: 'memory_consolidation', label: 'Memory Consolidation', desc: 'Merge near-duplicate memories (cosine > 0.95)' },
  { id: 'contradiction_detection', label: 'Contradiction Detection', desc: 'Find conflicting memory pairs' },
  { id: 'duplicate_removal', label: 'Duplicate Removal', desc: 'Remove exact content duplicates' },
  { id: 'skill_extraction', label: 'Skill Extraction', desc: 'Tag verified skills from procedures' },
  { id: 'goal_review', label: 'Goal Review', desc: 'Flag stale goals > 30 days' },
];
const WEEKLY = [
  { id: 'memory_optimization', label: 'Memory Optimization', desc: 'Re-score importance with recency decay' },
  { id: 'procedural_extraction', label: 'Procedural Extraction', desc: 'Batch extract procedures from learning events' },
  { id: 'performance_review', label: 'Performance Review', desc: 'Aggregate agent success rates' },
];

export function DreamingJobs() {
  const [status, setStatus] = useState<any>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [triggered, setTriggered] = useState<Set<string>>(new Set());

  useEffect(() => {
    memSvc.dreamingStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  const trigger = async (id: string) => {
    setTriggering(id);
    try {
      await memSvc.triggerJob(id);
      setTriggered(s => new Set([...s, id]));
      window.setTimeout(() => {
        setTriggered(current => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }, 3000);
    } catch {}
    finally { setTriggering(null); }
  };

  const JobCard = ({ job, schedule }: { job: typeof NIGHTLY[0]; schedule: string }) => {
    const jobStatus = status?.jobs?.[job.id];
    const isRunning = triggering === job.id;
    const wasDone = triggered.has(job.id);
    return (
      <div style={{ padding: '12px 14px', borderRadius: t.radiusSm, background: t.bgSub, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: t.radiusSm, background: wasDone ? t.greenDim : t.surface, border: `1px solid ${wasDone ? 'rgba(16,185,129,0.25)' : t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {wasDone ? <CheckCircle size={15} style={{ color: t.green }} /> : <Moon size={15} style={{ color: t.textMuted }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary, marginBottom: 2 }}>{job.label}</div>
          <div style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.4 }}>{job.desc}</div>
          {jobStatus?.last_run && (
            <div style={{ fontSize: 10, color: t.textMuted, marginTop: 3, fontFamily: 'DM Mono, monospace' }}>
              Last: {new Date(jobStatus.last_run).toLocaleString()}
            </div>
          )}
          {wasDone && (
            <div style={{ fontSize: 10, color: t.green, marginTop: 3, fontWeight: 700 }}>
              Job queued
            </div>
          )}
        </div>
        <div style={{ fontSize: 10, color: t.textMuted, fontFamily: 'DM Mono, monospace', marginRight: 6 }}>{schedule}</div>
        <button onClick={() => trigger(job.id)} disabled={isRunning}
          style={{ padding: '5px 10px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.accentDim, border: `1px solid ${t.accentBorder}`, color: t.accent, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {isRunning ? <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={11} />}
          {isRunning ? 'Running' : 'Trigger'}
        </button>
      </div>
    );
  };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%', background: t.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <div style={{ width: 38, height: 38, borderRadius: t.radiusSm, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Moon size={18} style={{ color: '#6366f1' }} />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>Dreaming / Sleeptime Compute</h1>
          <p style={{ fontSize: 12, color: t.textMuted }}>Background consolidation, optimization, and review jobs</p>
        </div>
        <button onClick={() => memSvc.dreamingStatus().then(setStatus)}
          style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: t.radiusSm, cursor: 'pointer', background: t.surface, border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Status banner */}
      {status && (
        <div style={{ padding: '10px 14px', borderRadius: t.radiusSm, background: t.surface, border: `1px solid ${t.border}`, marginBottom: 20, display: 'flex', gap: 20 }}>
          {[
            { label: 'Nightly Queue', value: status.nightly_depth ?? '—' },
            { label: 'Weekly Queue', value: status.weekly_depth ?? '—' },
            { label: 'Last Nightly', value: status.last_nightly ? new Date(status.last_nightly).toLocaleDateString() : 'Never' },
            { label: 'Last Weekly', value: status.last_weekly ? new Date(status.last_weekly).toLocaleDateString() : 'Never' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 10, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary, fontFamily: 'DM Mono, monospace' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Nightly jobs */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Clock size={13} style={{ color: t.textMuted }} />
          <h2 style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>Nightly Jobs</h2>
          <span style={{ fontSize: 11, color: t.textMuted, fontFamily: 'DM Mono, monospace' }}>2 AM daily</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {NIGHTLY.map(job => <JobCard key={job.id} job={job} schedule="02:00" />)}
        </div>
      </div>

      {/* Weekly jobs */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <Clock size={13} style={{ color: t.textMuted }} />
          <h2 style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>Weekly Jobs</h2>
          <span style={{ fontSize: 11, color: t.textMuted, fontFamily: 'DM Mono, monospace' }}>Sun 03:00</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {WEEKLY.map(job => <JobCard key={job.id} job={job} schedule="Sun 03:00" />)}
        </div>
      </div>
    </div>
  );
}
