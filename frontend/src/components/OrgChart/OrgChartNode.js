import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { User, Bot, Globe, Shield, Crown } from 'lucide-react';

const PROVIDER_COLORS = {
  'Claude':      { bg:'rgba(217,119,6,0.15)',   border:'rgba(217,119,6,0.4)',   color:'#d97706' },
  'OpenAI':      { bg:'rgba(116,170,156,0.15)', border:'rgba(116,170,156,0.4)', color:'#74aa9c' },
  'Codex':       { bg:'rgba(116,170,156,0.15)', border:'rgba(116,170,156,0.4)', color:'#74aa9c' },
  'Gemini':      { bg:'rgba(66,133,244,0.15)',  border:'rgba(66,133,244,0.4)',  color:'#4285f4' },
  'OpenRouter':  { bg:'rgba(139,92,246,0.15)',  border:'rgba(139,92,246,0.4)',  color:'#8b5cf6' },
  'Ollama':      { bg:'rgba(16,185,129,0.15)',  border:'rgba(16,185,129,0.4)',  color:'#10b981' },
  'Hermes':      { bg:'rgba(249,115,22,0.15)',  border:'rgba(249,115,22,0.4)',  color:'#f97316' },
  'DeepSeek':    { bg:'rgba(34,211,238,0.15)',  border:'rgba(34,211,238,0.4)',  color:'#22d3ee' },
  'OpenClaw':    { bg:'rgba(167,139,250,0.15)', border:'rgba(167,139,250,0.4)', color:'#a78bfa' },
  'Custom':      { bg:'rgba(107,114,128,0.15)', border:'rgba(107,114,128,0.3)', color:'#6b7280' },
};

const OrgChartNode = memo(({ data, selected }) => {
  const {
    name, role, status, nodeType, isBoardMember,
    avatarColor, skills, isGuestDelegate, isMyDelegate,
    isNeuralLayout, providerBadge, department
  } = data;

  const statusColors = { active:'#10b981', idle:'#6b7280', busy:'#f59e0b', offline:'#374151' };
  const statusColor = statusColors[status] || '#6b7280';

  // Visual theme
  let borderColor, glowColor, bgColor, typeIcon, typeBadge;
  if (isGuestDelegate) {
    borderColor = selected?'rgba(245,158,11,0.7)':'rgba(245,158,11,0.35)';
    glowColor   = 'rgba(245,158,11,0.12)';  bgColor = 'rgba(245,158,11,0.04)';
    typeIcon    = <Globe  size={9} style={{ color:'#f59e0b' }}/>;
    typeBadge   = { label:'GUEST', color:'#f59e0b', bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.25)' };
  } else if (nodeType === 'agent') {
    borderColor = selected?'rgba(167,139,250,0.65)':'rgba(167,139,250,0.25)';
    glowColor   = selected?'rgba(167,139,250,0.12)':'none';  bgColor = 'rgba(167,139,250,0.03)';
    typeIcon    = <Bot  size={9} style={{ color:'#a78bfa' }}/>;
    typeBadge   = { label:'AGENT', color:'#a78bfa', bg:'rgba(167,139,250,0.1)', border:'rgba(167,139,250,0.2)' };
  } else {
    borderColor = selected?'rgba(34,211,238,0.65)':'rgba(34,211,238,0.22)';
    glowColor   = selected?'rgba(34,211,238,0.10)':'none';  bgColor = 'rgba(34,211,238,0.02)';
    typeIcon    = <User size={9} style={{ color:'#22d3ee' }}/>;
    typeBadge   = { label:'USER', color:'#22d3ee', bg:'rgba(34,211,238,0.1)', border:'rgba(34,211,238,0.2)' };
  }

  const avatarCol = avatarColor || (isGuestDelegate?'#f59e0b':nodeType==='agent'?'#a78bfa':'#22d3ee');
  const providerCfg = providerBadge ? PROVIDER_COLORS[providerBadge] : null;

  return (
    <div
      className="relative rounded-2xl px-3.5 py-3 min-w-[170px] cursor-pointer"
      style={{
        background: selected ? bgColor : 'var(--surface-1)',
        backdropFilter: 'blur(12px)',
        border: `1.5px solid ${borderColor}`,
        boxShadow: selected
          ? `0 0 0 2px ${glowColor}, 0 8px 24px rgba(0,0,0,0.4)`
          : isGuestDelegate
          ? `0 0 14px rgba(245,158,11,0.1), 0 4px 16px rgba(0,0,0,0.3)`
          : '0 4px 16px rgba(0,0,0,0.3)',
      }}
      data-testid={`org-node-${name}`}
    >
      <Handle type="target" position={Position.Top}
        style={{ background:avatarCol+'60', border:`1px solid ${avatarCol}`, width:8, height:8 }} />
      <Handle type="source" position={Position.Bottom}
        style={{ background:avatarCol+'60', border:`1px solid ${avatarCol}`, width:8, height:8 }} />

      {/* Board badge */}
      {isBoardMember && (
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center z-10"
          style={{ background:'#f59e0b', boxShadow:'0 0 8px rgba(245,158,11,0.5)' }}>
          <Crown size={10} style={{ color:'#000' }}/>
        </div>
      )}

      {/* My delegate badge */}
      {isMyDelegate && (
        <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center z-10"
          style={{ background:'#22d3ee', boxShadow:'0 0 8px rgba(34,211,238,0.4)' }}>
          <Shield size={9} style={{ color:'#000' }}/>
        </div>
      )}

      {/* Main row */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 relative"
          style={{ background:avatarCol+'25', border:`1.5px solid ${avatarCol}40`, color:avatarCol }}>
          {nodeType==='agent' ? <Bot size={16} style={{ color:avatarCol }}/> : name.slice(0,2).toUpperCase()}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-gray-900"
            style={{ background:statusColor }}/>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color:'rgba(255,255,255,0.92)' }}>{name}</p>
          <p className="text-[10px] truncate" style={{ color:'rgba(255,255,255,0.4)' }}>{role}</p>
          {department && <p className="text-[9px] truncate" style={{ color:'rgba(255,255,255,0.28)' }}>{department}</p>}
        </div>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1 mt-2 flex-wrap">
        {/* Type badge */}
        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md"
          style={{ background:typeBadge.bg, color:typeBadge.color, border:`1px solid ${typeBadge.border}` }}>
          {typeIcon}{typeBadge.label}
        </span>
        {/* Provider badge — agents only */}
        {nodeType==='agent' && providerBadge && providerCfg && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
            style={{ background:providerCfg.bg, color:providerCfg.color, border:`1px solid ${providerCfg.border}` }}>
            {providerBadge}
          </span>
        )}
        {/* Guest indicator */}
        {isGuestDelegate && (
          <span className="text-[10px] px-1 py-0.5 rounded"
            style={{ background:'rgba(245,158,11,0.08)', color:'#f59e0b' }}>delegate</span>
        )}
        {/* Skills overflow */}
        {(skills?.length||0)>0 && (
          <span className="text-[10px] px-1 py-0.5 rounded" style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.35)' }}>
            {skills.length} skill{skills.length>1?'s':''}
          </span>
        )}
      </div>
    </div>
  );
});

OrgChartNode.displayName = 'OrgChartNode';
export default OrgChartNode;
