import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellDot, X, Check, CheckCheck, Vote, Gavel, GitBranch, Brain, MessageSquare, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { useOrg } from '../../contexts/OrgContext';
import { useWS } from '../../contexts/WSContext';
import api from '../../lib/api';

const NOTIF_CONFIG = {
  proposal_created:      { Icon: Gavel,          color: '#22d3ee', label: 'Proposal' },
  proposal_approved:     { Icon: CheckCheck,      color: '#10b981', label: 'Approved' },
  proposal_rejected:     { Icon: X,               color: '#ef4444', label: 'Rejected' },
  vote_cast:             { Icon: Vote,             color: '#f59e0b', label: 'Vote' },
  workflow_complete:     { Icon: GitBranch,        color: '#10b981', label: 'Workflow' },
  deliberation_complete: { Icon: Brain,            color: '#a78bfa', label: 'Deliberation' },
  message_created:       { Icon: MessageSquare,   color: '#ec4899', label: 'Message' },
  agent_escalation:      { Icon: Zap,              color: '#f97316', label: 'Escalation' },
};

function NotifItem({ notif, onRead }) {
  const cfg = NOTIF_CONFIG[notif.type] || { Icon: Bell, color: '#6b7280', label: 'Alert' };
  const { Icon } = cfg;
  const time = notif.created_at ? new Date(notif.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
  const isUnread = !notif.read_at;

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 px-4 py-3 cursor-pointer"
      onClick={() => onRead(notif.id)}
      style={{
        background: isUnread ? 'rgba(34,211,238,0.03)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
      data-testid={`notification-${notif.id}`}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: cfg.color+'18', border: `1px solid ${cfg.color}25` }}>
        <Icon size={13} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-tight" style={{ color: isUnread ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)' }}>
          {notif.title}
        </p>
        {notif.body && <p className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{notif.body}</p>}
        <p className="text-[10px] mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>{time}</p>
      </div>
      {isUnread && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: '#22d3ee' }} />}
    </motion.div>
  );
}

export default function NotificationCenter() {
  const { currentOrg } = useOrg();
  const { on } = useWS();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const [nRes, cRes] = await Promise.all([
        api.get(`/orgs/${currentOrg.id}/notifications`),
        api.get(`/orgs/${currentOrg.id}/notifications/count`),
      ]);
      setNotifs(nRes.data);
      setUnreadCount(cRes.data.unread);
    } catch { }
  }, [currentOrg]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  useEffect(() => {
    if (!on) return;
    const u = on('notification.created', (data) => {
      setNotifs(prev => [data.notification, ...prev]);
      setUnreadCount(c => c + 1);
    });
    return () => u();
  }, [on]);

  const markRead = async (notifId) => {
    await api.post(`/orgs/${currentOrg.id}/notifications/read`, { notification_ids: [notifId] });
    setNotifs(prev => prev.map(n => n.id === notifId ? { ...n, read_at: new Date().toISOString() } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.post(`/orgs/${currentOrg.id}/notifications/read`, { notification_ids: [] });
    setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnreadCount(0);
  };

  return (
    <>
      {/* Bell button */}
      <button
        data-testid="notification-bell"
        onClick={() => { setOpen(true); fetchNotifs(); }}
        className="relative p-2 rounded-xl"
        style={{
          background: open ? 'rgba(34,211,238,0.08)' : 'transparent',
          border: open ? '1px solid rgba(34,211,238,0.2)' : '1px solid transparent',
          color: 'rgba(255,255,255,0.6)',
        }}
      >
        {unreadCount > 0 ? <BellDot size={17} style={{ color: '#22d3ee' }} /> : <Bell size={17} />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ background: '#ef4444', color: 'white' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-80 p-0"
          style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.08)' }}>
          <SheetHeader className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-sm" style={{ fontFamily: 'Space Grotesk' }}>
                Notifications {unreadCount > 0 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#22d3ee20', color: '#22d3ee' }}>{unreadCount}</span>}
              </SheetTitle>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs" style={{ color: '#22d3ee' }}>
                  <CheckCheck size={13} className="mr-0.5 inline" />All read
                </button>
              )}
            </div>
          </SheetHeader>
          <ScrollArea className="h-full">
            {notifs.length > 0 ? notifs.map(n => (
              <NotifItem key={n.id} notif={n} onRead={markRead} />
            )) : (
              <div className="flex flex-col items-center justify-center py-20">
                <Bell size={28} className="mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>All clear!</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
