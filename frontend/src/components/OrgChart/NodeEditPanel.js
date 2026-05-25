import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, User, Save, Shield, Crown, Zap, Code, Search, BarChart2, Target, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';

const PROVIDERS = [
  { id:'OpenClaw',   color:'#a78bfa', desc:'Neural-Org native' },
  { id:'Claude',     color:'#d97706', desc:'Anthropic' },
  { id:'OpenAI',     color:'#74aa9c', desc:'GPT-4, o3' },
  { id:'Codex',      color:'#74aa9c', desc:'Code generation' },
  { id:'Gemini',     color:'#4285f4', desc:'Google' },
  { id:'OpenRouter', color:'#8b5cf6', desc:'Multi-model' },
  { id:'Ollama',     color:'#10b981', desc:'Local models' },
  { id:'Hermes',     color:'#f97316', desc:'HermesHub' },
  { id:'DeepSeek',   color:'#22d3ee', desc:'DeepSeek' },
  { id:'Custom',     color:'#6b7280', desc:'Custom endpoint' },
];

const EDGE_LABELS = [
  'Reports To', 'Advises', 'Board Seat', 'Workflow Owner', 'Delegate', 'Collaborates'
];

export default function NodeEditPanel({ chartNode, isGoverned, onSave, onPropose, onClose, orgId }) {
  const ref   = chartNode?.ref_data || {};
  const isAgent = chartNode?.node_type === 'agent';

  const [form, setForm] = useState({
    name:           ref.name || '',
    role:           ref.role || '',
    department:     ref.department || '',
    provider_badge: ref.provider_badge_computed || ref.provider_badge || 'Custom',
    model:          ref.model || '',
    is_board_member: chartNode?.is_board_member || false,
  });
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirtyFields, setDirtyFields] = useState({});

  const setField = (key, val) => {
    setForm(p => ({...p, [key]: val}));
    setDirtyFields(p => ({...p, [key]: true}));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isGoverned) {
        // Build proposals for each changed field
        for (const [field, isDirty] of Object.entries(dirtyFields)) {
          if (!isDirty) continue;
          const changeTypes = {
            name: 'node_name', role: 'node_role', department: 'node_department',
            provider_badge: 'node_provider', model: 'node_provider',
            is_board_member: 'board_seat'
          };
          const ct = changeTypes[field];
          if (!ct) continue;
          await onPropose({
            change_type: ct,
            subject_id: chartNode.id,
            subject_name: ref.name || 'Node',
            ref_id: chartNode.node_ref_id,
            before: { value: ref[field], [field]: ref[field] },
            after:  { value: form[field], [field]: form[field], provider_badge: form.provider_badge, model: form.model },
            reason,
          });
        }
      } else {
        await onSave(chartNode.id, form);
      }
      onClose();
    } finally { setSaving(false); }
  };

  const curProvider = PROVIDERS.find(p => p.id === form.provider_badge) || PROVIDERS[0];
  const isDirty = Object.values(dirtyFields).some(Boolean);

  return (
    <motion.div
      initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 24, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.22,1,0.36,1] }}
      className="w-80 h-full flex flex-col"
      style={{ background:'var(--surface-1)', backdropFilter:'blur(20px)', borderLeft:'1px solid rgba(255,255,255,0.07)' }}
      data-testid="node-edit-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ fontFamily:'Space Grotesk' }}>
            {isGoverned ? 'Propose Change' : 'Edit Node'}
          </h3>
          {isGoverned && <p className="text-[10px] mt-0.5" style={{ color:'#f59e0b' }}>⚠ Governed — will create vote proposal</p>}
        </div>
        <button onClick={onClose}><X size={15} style={{ color:'rgba(255,255,255,0.4)' }}/></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Avatar preview */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background:(ref.avatar_color||'#a78bfa')+'25', border:`2px solid ${ref.avatar_color||'#a78bfa'}40` }}>
            {isAgent ? <Bot size={20} style={{ color:ref.avatar_color||'#a78bfa' }}/> : form.name.slice(0,2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ fontFamily:'Space Grotesk' }}>{form.name||'Unknown'}</p>
            <p className="text-xs" style={{ color:'rgba(255,255,255,0.4)' }}>{isAgent?'Agent':'User'}</p>
          </div>
        </div>

        {/* Name */}
        <div>
          <Label className="text-xs mb-1.5 block" style={{ color:'rgba(255,255,255,0.5)' }}>Display Name</Label>
          <Input value={form.name} onChange={e=>setField('name',e.target.value)}
            style={{ background:'rgba(255,255,255,0.05)', border:`1px solid ${dirtyFields.name?'rgba(34,211,238,0.4)':'rgba(255,255,255,0.1)'}` }}/>
        </div>

        {/* Role */}
        <div>
          <Label className="text-xs mb-1.5 block" style={{ color:'rgba(255,255,255,0.5)' }}>Role / Title</Label>
          <Input value={form.role} onChange={e=>setField('role',e.target.value)}
            placeholder="CEO, Analyst, Developer..."
            style={{ background:'rgba(255,255,255,0.05)', border:`1px solid ${dirtyFields.role?'rgba(34,211,238,0.4)':'rgba(255,255,255,0.1)'}` }}/>
        </div>

        {/* Department */}
        <div>
          <Label className="text-xs mb-1.5 block" style={{ color:'rgba(255,255,255,0.5)' }}>Department / Team</Label>
          <Input value={form.department} onChange={e=>setField('department',e.target.value)}
            placeholder="Engineering, Strategy, Research..."
            style={{ background:'rgba(255,255,255,0.05)', border:`1px solid ${dirtyFields.department?'rgba(34,211,238,0.4)':'rgba(255,255,255,0.1)'}` }}/>
        </div>

        {/* Provider — agents only */}
        {isAgent && (
          <div>
            <Label className="text-xs mb-2 block" style={{ color:'rgba(255,255,255,0.5)' }}>AI Provider</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {PROVIDERS.map(p => (
                <button key={p.id}
                  onClick={()=>setField('provider_badge',p.id)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-left"
                  style={{
                    background: form.provider_badge===p.id ? p.color+'20' : 'rgba(255,255,255,0.03)',
                    border: form.provider_badge===p.id ? `1px solid ${p.color}40` : '1px solid rgba(255,255,255,0.07)',
                    color: form.provider_badge===p.id ? p.color : 'rgba(255,255,255,0.6)',
                  }}
                  data-testid={`provider-${p.id}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:p.color }}/>
                  <span className="font-medium">{p.id}</span>
                </button>
              ))}
            </div>
            {dirtyFields.provider_badge && (
              <div className="mt-2">
                <Label className="text-xs mb-1.5 block" style={{ color:'rgba(255,255,255,0.5)' }}>Model (optional)</Label>
                <Input value={form.model} onChange={e=>setField('model',e.target.value)}
                  placeholder="e.g. claude-sonnet-4-6"
                  className="font-mono text-xs"
                  style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}/>
              </div>
            )}
          </div>
        )}

        {/* Board member */}
        <div className="flex items-center justify-between p-3 rounded-xl" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p className="text-xs font-medium">Board Member</p>
            <p className="text-[10px]" style={{ color:'rgba(255,255,255,0.35)' }}>Can vote on proposals</p>
          </div>
          <Switch checked={form.is_board_member} onCheckedChange={v=>setField('is_board_member',v)} />
        </div>

        {/* Reason — governed mode only */}
        {isGoverned && isDirty && (
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color:'#f59e0b' }}>Reason for Change *</Label>
            <Textarea value={reason} onChange={e=>setReason(e.target.value)}
              placeholder="Explain why this change is needed..."
              rows={3}
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(245,158,11,0.3)', resize:'none', fontSize:12 }}/>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <Button
          data-testid="save-node-button"
          onClick={handleSave}
          disabled={saving || !isDirty || (isGoverned && !reason.trim())}
          className="w-full"
          style={{
            background: isGoverned ? 'rgba(245,158,11,0.15)' : 'hsl(var(--primary))',
            color: isGoverned ? '#f59e0b' : 'hsl(var(--primary-foreground))',
            border: isGoverned ? '1px solid rgba(245,158,11,0.35)' : 'none',
          }}
        >
          {saving ? 'Saving...' : isGoverned ? '📝 Submit Proposal' : '💾 Save Changes'}
        </Button>
      </div>
    </motion.div>
  );
}

export { PROVIDERS, EDGE_LABELS };
