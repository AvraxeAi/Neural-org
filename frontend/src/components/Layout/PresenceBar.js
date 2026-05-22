import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrg } from '../../contexts/OrgContext';
import { useWS } from '../../contexts/WSContext';
import api from '../../lib/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

function PresenceDot({ p }) {
  const isAgent = p.is_agent;
  const isThinking = p.thinking;
  const isTyping   = !!p.typing_in;
  const isOnline   = p.status === 'online';

  const statusColor = isOnline ? '#10b981' : '#374151';
  const initials = (p.name||'?').slice(0,2).toUpperCase();

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div className="relative">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{
                background: (p.avatar_color||'#22d3ee')+'30',
                border: `1.5px solid ${p.avatar_color||'#22d3ee'}40`,
                color: p.avatar_color || '#22d3ee',
                boxShadow: isThinking ? '0 0 8px rgba(167,139,250,0.4)' : 'none',
              }}
            >
              {isAgent ? '🤖'.slice(0,1) : initials}
            </div>
            {/* Status ring for thinking/typing */}
            {(isThinking || isTyping) && (
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="absolute inset-0 rounded-full"
                style={{ border: `2px solid ${isThinking ? '#a78bfa' : '#22d3ee'}`, pointerEvents: 'none' }}
              />
            )}
            {/* Status dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-gray-900"
              style={{ background: statusColor }} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p className="font-medium">{p.name}</p>
          <p className="opacity-60">
            {isThinking ? '🧠 Thinking...' : isTyping ? '✍️ Typing...' : p.status}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function PresenceBar({ orgId, context = '' }) {
  const { on } = useWS();
  const [presence, setPresence] = useState([]);

  const fetchPresence = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await api.get(`/orgs/${orgId}/presence`);
      setPresence(res.data || []);
    } catch { }
  }, [orgId]);

  useEffect(() => { fetchPresence(); }, [fetchPresence]);

  useEffect(() => {
    if (!on) return;
    const u = on('presence.updated', (data) => {
      setPresence(prev => {
        const exists = prev.find(p => p.user_id === data.user_id);
        if (data.status === 'offline') {
          return prev.filter(p => p.user_id !== data.user_id);
        }
        if (exists) {
          return prev.map(p => p.user_id === data.user_id ? { ...p, ...data } : p);
        }
        return [...prev, data];
      });
    });
    return () => u();
  }, [on]);

  const visible = presence.filter(p => p.status !== 'offline');
  if (visible.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5" data-testid="presence-bar">
      <AnimatePresence>
        {visible.slice(0, 5).map(p => (
          <motion.div
            key={p.user_id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <PresenceDot p={p} />
          </motion.div>
        ))}
      </AnimatePresence>
      {visible.length > 5 && (
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>+{visible.length - 5}</span>
      )}
    </div>
  );
}
