import React from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '../ui/scroll-area';
import {
  GitBranch, Lock, Unlock, AlertTriangle, CheckCircle2, XCircle,
  User, Bot, RotateCcw, Shield
} from 'lucide-react';

const CHANGE_TYPE_CONFIG = {
  'node_name':       { label: 'Name Change',       color: '#22d3ee', Icon: User },
  'node_role':       { label: 'Role Change',        color: '#a78bfa', Icon: User },
  'node_department': { label: 'Dept Change',        color: '#6366f1', Icon: User },
  'node_provider':   { label: 'Provider Change',    color: '#f59e0b', Icon: Bot },
  'manager_change':  { label: 'Hierarchy Change',   color: '#f97316', Icon: GitBranch },
  'board_seat':      { label: 'Board Seat Change',  color: '#f59e0b', Icon: Shield },
  'edge_label':      { label: 'Edge Label Change',  color: '#22d3ee', Icon: GitBranch },
  'edge_delete':     { label: 'Edge Deleted',       color: '#ef4444', Icon: XCircle },
  'governance.finalized':      { label: 'Chart Finalized',   color: '#10b981', Icon: Lock },
  'governance.emergency_unlock': { label: 'Emergency Override', color: '#ef4444', Icon: AlertTriangle },
  'governance.re_locked':      { label: 'Chart Re-Locked',    color: '#f59e0b', Icon: Lock },
};

function AuditEntry({ entry }) {
  const cfg = CHANGE_TYPE_CONFIG[entry.change_type] || { label: entry.change_type, color: '#6b7280', Icon: RotateCcw };
  const { Icon } = cfg;
  const time = entry.created_at ? new Date(entry.created_at).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
  const voteIcon = entry.vote_result === 'approved' || entry.vote_result === 'emergency_applied'
    ? <CheckCircle2 size={11} style={{ color:'#10b981' }}/>
    : entry.vote_result === 'rejected'
    ? <XCircle size={11} style={{ color:'#ef4444' }}/>
    : null;

  return (
    <motion.div
      initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
      className="flex items-start gap-3 py-3"
      style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}
      data-testid={`audit-entry-${entry.id}`}
    >
      {/* Icon */}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: cfg.color+'18', border:`1px solid ${cfg.color}25` }}>
        <Icon size={13} style={{ color: cfg.color }}/>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold" style={{ color:'rgba(255,255,255,0.85)' }}>{cfg.label}</span>
          {voteIcon}
          <span className="text-[10px] ml-auto" style={{ color:'rgba(255,255,255,0.3)' }}>{time}</span>
        </div>
        <p className="text-xs" style={{ color:'rgba(255,255,255,0.5)' }}>
          <span style={{ color:'rgba(255,255,255,0.7)' }}>{entry.proposed_by_name}</span>
          {entry.subject_name ? ` · ${entry.subject_name}` : ''}
        </p>

        {/* Before/after */}
        {(entry.before || entry.after) && (
          <div className="flex items-center gap-2 mt-1.5">
            {entry.before?.value && (
              <span className="text-[10px] px-1.5 py-0.5 rounded line-through"
                style={{ background:'rgba(239,68,68,0.1)', color:'rgba(239,68,68,0.8)' }}>
                {String(entry.before.value).slice(0,30)}
              </span>
            )}
            {entry.before?.value && entry.after?.value && (
              <span className="text-[10px]" style={{ color:'rgba(255,255,255,0.3)' }}>→</span>
            )}
            {entry.after?.value && (
              <span className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background:'rgba(16,185,129,0.1)', color:'#10b981' }}>
                {String(entry.after.value).slice(0,30)}
              </span>
            )}
          </div>
        )}

        {entry.reason && (
          <p className="text-[10px] mt-1 italic" style={{ color:'rgba(255,255,255,0.35)' }}>"{entry.reason.slice(0,60)}{entry.reason.length>60?'...':''}"</p>
        )}
      </div>
    </motion.div>
  );
}

export default function AuditLogPanel({ entries, loading }) {
  if (loading) return <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"/></div>;
  if (!entries?.length) return (
    <div className="text-center py-12">
      <RotateCcw size={24} className="mx-auto mb-2" style={{ color:'rgba(255,255,255,0.15)' }}/>
      <p className="text-xs" style={{ color:'rgba(255,255,255,0.3)' }}>No audit entries yet</p>
    </div>
  );
  return (
    <ScrollArea className="h-full">
      <div className="px-4">
        {entries.map(entry => <AuditEntry key={entry.id} entry={entry} />)}
      </div>
    </ScrollArea>
  );
}
