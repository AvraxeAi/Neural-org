import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageSquare, Crown, User, Bot } from 'lucide-react';

const OrgChartNode = memo(({ data, selected }) => {
  const { name, role, status, nodeType, isBoardMember, avatarColor, skills } = data;

  const statusColors = {
    active: '#10b981',
    idle: '#6b7280',
    busy: '#f59e0b',
    offline: '#374151',
  };
  const statusColor = statusColors[status] || '#6b7280';

  return (
    <div
      className="relative rounded-2xl px-4 py-3 min-w-[160px] cursor-pointer"
      style={{
        background: 'var(--surface-1)',
        backdropFilter: 'blur(12px)',
        border: selected ? '1.5px solid rgba(34,211,238,0.5)' : '1px solid rgba(255,255,255,0.1)',
        boxShadow: selected ? '0 0 0 2px rgba(34,211,238,0.15), 0 8px 24px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.3)',
      }}
      data-testid={`org-node-${name}`}
    >
      <Handle type="target" position={Position.Top}
        style={{background:'rgba(34,211,238,0.4)', border:'1px solid rgba(34,211,238,0.6)', width:8, height:8}} />
      <Handle type="source" position={Position.Bottom}
        style={{background:'rgba(34,211,238,0.4)', border:'1px solid rgba(34,211,238,0.6)', width:8, height:8}} />

      {/* Board badge */}
      {isBoardMember && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{background:'#f59e0b', boxShadow:'0 0 8px rgba(245,158,11,0.4)'}}>
          <Crown size={10} style={{color:'#000'}} />
        </div>
      )}

      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 relative"
          style={{background: avatarColor + '25', border: `1.5px solid ${avatarColor}40`, color: avatarColor}}>
          {nodeType === 'agent' ? <Bot size={16} style={{color: avatarColor}} /> : name.slice(0,2).toUpperCase()}
          {/* Status dot */}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-gray-900"
            style={{background: statusColor}} />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold truncate" style={{color:'rgba(255,255,255,0.92)'}}>{name}</p>
          <p className="text-[10px] truncate" style={{color:'rgba(255,255,255,0.4)'}}>{role}</p>
        </div>
      </div>

      {/* Node type badge */}
      <div className="flex items-center gap-1 mt-2">
        {nodeType === 'agent' ?
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md" style={{background:'rgba(167,139,250,0.15)', color:'#a78bfa', border:'1px solid rgba(167,139,250,0.2)'}}>
            <Bot size={9} />Agent
          </span> :
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md" style={{background:'rgba(34,211,238,0.1)', color:'#22d3ee', border:'1px solid rgba(34,211,238,0.2)'}}>
            <User size={9} />User
          </span>
        }
        {skills?.slice(0,1).map(s => (
          <span key={s} className="text-[10px] px-1 py-0.5 rounded" style={{background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)'}}>{s}</span>
        ))}
      </div>
    </div>
  );
});

OrgChartNode.displayName = 'OrgChartNode';
export default OrgChartNode;
