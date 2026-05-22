import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Flag, ArrowRightCircle, SplitSquareVertical, Layers, ZapIcon } from 'lucide-react';

const TYPE_CONFIG = {
  trigger:  { color: '#f59e0b', Icon: Flag,               label: 'Trigger' },
  step:     { color: '#22d3ee', Icon: ArrowRightCircle,    label: 'Step' },
  branch:   { color: '#a78bfa', Icon: SplitSquareVertical, label: 'Branch' },
  parallel: { color: '#10b981', Icon: Layers,              label: 'Parallel' },
  output:   { color: '#f97316', Icon: ZapIcon,             label: 'Output' },
};

const STATUS_STYLES = {
  idle:      { border: 'rgba(255,255,255,0.12)', glow: 'none',                              dot: '#6b7280' },
  running:   { border: '#22d3ee',               glow: '0 0 12px rgba(34,211,238,0.3)',     dot: '#22d3ee' },
  completed: { border: '#10b981',               glow: '0 0 10px rgba(16,185,129,0.25)',    dot: '#10b981' },
  failed:    { border: '#ef4444',               glow: '0 0 10px rgba(239,68,68,0.25)',     dot: '#ef4444' },
};

const WorkflowNode = memo(({ data, selected }) => {
  const nodeType = data.nodeType || data.type || 'step';
  const config = TYPE_CONFIG[nodeType] || TYPE_CONFIG.step;
  const status = data.status || 'idle';
  const ss = STATUS_STYLES[status] || STATUS_STYLES.idle;
  const { Icon } = config;

  return (
    <div
      className="rounded-xl min-w-[140px] overflow-hidden"
      style={{
        background: 'var(--surface-1)',
        backdropFilter: 'blur(12px)',
        border: `1.5px solid ${selected ? 'rgba(34,211,238,0.6)' : ss.border}`,
        boxShadow: selected ? '0 0 0 2px rgba(34,211,238,0.15)' : ss.glow,
      }}
      data-testid={`workflow-node-${data.label}`}
    >
      <Handle type="target" position={Position.Top}
        style={{background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.3)', width:6, height:6}} />

      {/* Type header strip */}
      <div className="flex items-center gap-2 px-3 py-2"
        style={{background: config.color + '18', borderBottom:`1px solid ${config.color}25`}}>
        <Icon size={12} style={{color: config.color}} />
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{color: config.color}}>{config.label}</span>
        {/* Status indicator */}
        <span className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
          style={{background: ss.dot, boxShadow: status === 'running' ? '0 0 6px ' + ss.dot : 'none'}} />
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <p className="text-xs font-medium" style={{color:'rgba(255,255,255,0.9)'}}>{data.label || config.label}</p>
        {data.action && (
          <p className="text-[10px] mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>{data.action}</p>
        )}
        {status !== 'idle' && (
          <div className="mt-2 h-1 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
            <div className="h-full rounded-full"
              style={{
                background: ss.dot,
                width: status === 'completed' ? '100%' : status === 'running' ? '60%' : '0%',
                transition: 'width 0.5s ease',
              }} />
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom}
        style={{background:'rgba(255,255,255,0.2)', border:'1px solid rgba(255,255,255,0.3)', width:6, height:6}} />
    </div>
  );
});

WorkflowNode.displayName = 'WorkflowNode';
export default WorkflowNode;
