import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MessageSquare, Bot, User, Crown, Shield, Zap, Code, Search, BarChart2, Target, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { chartAPI } from '../../lib/api';
import { toast } from 'sonner';

const skillIcons = { coding: Code, research: Search, analysis: BarChart2, api: Zap, writing: FileText, decision: Target };

export default function NodeInspector({ chartNode, orgId, onClose, onMessage, onRefresh }) {
  const [isBoardMember, setIsBoardMember] = useState(chartNode.is_board_member);
  const [saving, setSaving] = useState(false);
  const ref = chartNode.ref_data || {};

  const toggleBoardMember = async (val) => {
    setIsBoardMember(val);
    setSaving(true);
    try {
      await chartAPI.updateNode(orgId, chartNode.id, { is_board_member: val });
      onRefresh();
      toast.success(val ? 'Added to board' : 'Removed from board');
    } catch {
      setIsBoardMember(!val);
      toast.error('Failed to update');
    } finally { setSaving(false); }
  };

  const statusColors = { active:'#10b981', idle:'#6b7280', busy:'#f59e0b', offline:'#374151' };
  const status = ref.status || (chartNode.node_type === 'user' ? 'active' : 'idle');

  return (
    <motion.div
      initial={{x:24, opacity:0}} animate={{x:0, opacity:1}} exit={{x:24, opacity:0}}
      transition={{duration:0.28, ease:[0.22,1,0.36,1]}}
      className="w-80 h-full flex flex-col"
      style={{
        background:'var(--surface-1)', backdropFilter:'blur(20px)',
        borderLeft:'1px solid rgba(255,255,255,0.07)',
      }}
      data-testid="node-inspector"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <h3 className="text-sm font-semibold" style={{fontFamily:'Space Grotesk'}}>Node Details</h3>
        <button onClick={onClose} className="p-1 rounded-lg" style={{color:'rgba(255,255,255,0.5)'}}>
          <X size={15}/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
            style={{background: (ref.avatar_color || '#22d3ee') + '25', border:`2px solid ${ref.avatar_color || '#22d3ee'}40`, color:ref.avatar_color || '#22d3ee'}}>
            {chartNode.node_type === 'agent' ? <Bot size={20} style={{color:ref.avatar_color||'#a78bfa'}} /> : (ref.name||'?').slice(0,2).toUpperCase()}
          </div>
          <div>
            <h4 className="font-semibold text-sm" style={{fontFamily:'Space Grotesk'}}>{ref.name || 'Unknown'}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-2 h-2 rounded-full" style={{background: statusColors[status] || '#6b7280'}} />
              <span className="text-xs capitalize" style={{color:'rgba(255,255,255,0.5)'}}>{status}</span>
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)'}}>
          <p className="text-xs font-medium mb-1" style={{color:'rgba(255,255,255,0.5)'}}>ROLE</p>
          <p className="text-sm">{ref.role || (chartNode.node_type === 'user' ? 'Member' : 'Agent')}</p>
        </div>

        {/* Skills */}
        {ref.skills && ref.skills.length > 0 && (
          <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)'}}>
            <p className="text-xs font-medium mb-2" style={{color:'rgba(255,255,255,0.5)'}}>SKILLS</p>
            <div className="flex flex-wrap gap-1.5">
              {ref.skills.map(s => {
                const Icon = skillIcons[s] || Zap;
                return (
                  <span key={s} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                    style={{background:'rgba(34,211,238,0.1)', color:'#22d3ee', border:'1px solid rgba(34,211,238,0.2)'}}>
                    <Icon size={10} />{s}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Board member toggle */}
        <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)'}}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{color:'rgba(255,255,255,0.5)'}}>BOARD MEMBER</p>
              <p className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.3)'}}>Can vote on proposals</p>
            </div>
            <Switch
              checked={isBoardMember}
              onCheckedChange={toggleBoardMember}
              disabled={saving}
              data-testid="board-member-toggle"
            />
          </div>
        </div>

        {/* Model for agents */}
        {chartNode.node_type === 'agent' && ref.model && (
          <div className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)'}}>
            <p className="text-xs font-medium mb-1" style={{color:'rgba(255,255,255,0.5)'}}>AI MODEL</p>
            <span className="text-xs font-mono" style={{color:'rgba(255,255,255,0.7)'}}>{ref.model}</span>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="p-4" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
        <Button
          className="w-full"
          onClick={() => onMessage(chartNode)}
          data-testid="node-message-button"
          style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))'}}
        >
          <MessageSquare size={14} className="mr-2" />Message
        </Button>
      </div>
    </motion.div>
  );
}
