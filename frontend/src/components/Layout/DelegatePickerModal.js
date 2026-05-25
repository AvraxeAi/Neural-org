import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Check, Globe, Zap, Code, Search, BarChart2, Target, FileText, AlertCircle, Star } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Badge } from '../ui/badge';
import api from '../../lib/api';

const skillIcons = { coding: Code, research: Search, analysis: BarChart2, api: Zap, writing: FileText, decision: Target };

export default function DelegatePickerModal({ open, onClose, onSelect, orgName }) {
  const [agents, setAgents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setLoading(true);
    api.get('/me/agents/available-for-delegation')
      .then(r => setAgents(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleConfirm = () => {
    if (!selected) return;
    onSelect(selected);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" style={{ background:'hsl(var(--card))', border:'1px solid rgba(255,255,255,0.1)' }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily:'Space Grotesk' }}>Choose Your Delegate</DialogTitle>
          <p className="text-xs mt-1" style={{ color:'rgba(255,255,255,0.45)' }}>
            Select one agent to represent you in <strong style={{ color:'#22d3ee' }}>{orgName}</strong>.
            This agent will act on your behalf — voting, messaging, and receiving tasks.
          </p>
        </DialogHeader>

        <div className="py-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-7 h-7 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && agents.length === 0 && (
            <div className="flex flex-col items-center py-8">
              <AlertCircle size={32} className="mb-3" style={{ color:'#f59e0b' }} />
              <p className="text-sm font-semibold mb-1" style={{ fontFamily:'Space Grotesk' }}>No agents available</p>
              <p className="text-xs" style={{ color:'rgba(255,255,255,0.4)' }}>
                All your agents are already delegated elsewhere, or you haven’t created any yet.
              </p>
              <p className="text-xs mt-1" style={{ color:'rgba(255,255,255,0.3)' }}>Create an agent in an existing org first, then join here.</p>
            </div>
          )}

          <div className="space-y-2 max-h-72 overflow-y-auto">
            <AnimatePresence>
              {agents.map(agent => {
                const isSelected = selected?.id === agent.id;
                const rep = agent.reputation_score || 5;
                return (
                  <motion.button
                    key={agent.id}
                    initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                    onClick={() => setSelected(agent)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl text-left"
                    style={{
                      background: isSelected ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid rgba(34,211,238,0.35)' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isSelected ? '0 0 16px rgba(34,211,238,0.08)' : 'none',
                    }}
                    data-testid={`pick-delegate-${agent.name}`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background:(agent.avatar_color||'#a78bfa')+'25', border:`1.5px solid ${agent.avatar_color||'#a78bfa'}40` }}>
                        <Bot size={16} style={{ color:agent.avatar_color||'#a78bfa' }} />
                      </div>
                      {isSelected && (
                        <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background:'#22d3ee', border:'2px solid hsl(var(--card))' }}>
                          <Check size={8} style={{ color:'#000' }} />
                        </motion.div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-semibold" style={{ fontFamily:'Space Grotesk', color:'rgba(255,255,255,0.92)' }}>{agent.name}</span>
                        <span className="text-[10px]" style={{ color:'rgba(255,255,255,0.4)' }}>{agent.role}</span>
                      </div>
                      <p className="text-xs line-clamp-1 mb-1.5" style={{ color:'rgba(255,255,255,0.4)' }}>
                        {agent.system_prompt || 'No system prompt'}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-wrap gap-1">
                          {(agent.skills||[]).slice(0,2).map(s => {
                            const Icon = skillIcons[s.replace('skill-','')] || Zap;
                            return (
                              <span key={s} className="flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded"
                                style={{ background:'rgba(34,211,238,0.1)', color:'#22d3ee' }}>
                                <Icon size={7}/>{s.replace('skill-','')}
                              </span>
                            );
                          })}
                        </div>
                        <span className="flex items-center gap-0.5 ml-auto text-[10px]" style={{ color:'#f59e0b' }}>
                          <Star size={9}/>{rep.toFixed(1)}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color:'rgba(255,255,255,0.3)' }}>{agent.model}</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            data-testid="confirm-delegate-button"
            onClick={handleConfirm} disabled={!selected}
            style={{ background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))' }}>
            <Globe size={13} className="mr-1.5" />
            Bring {selected?.name || 'Agent'} as Delegate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
