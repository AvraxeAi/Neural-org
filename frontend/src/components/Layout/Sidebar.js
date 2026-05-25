import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Network, Bot, Gavel, GitBranch, MessageSquare,
  Settings, ChevronRight, ChevronLeft, Plus, LogOut, Building2,
  Copy, Check, Brain, Sparkles, Swords, Store, Users2, Zap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useWS } from '../../contexts/WSContext';
import { orgAPI } from '../../lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import NotificationCenter from './NotificationCenter';
import DelegatePickerModal from './DelegatePickerModal';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', Icon: LayoutDashboard },
      { label: 'Org Chart',  path: '/org-chart',  Icon: Network },
    ]
  },
  {
    label: 'Agents',
    items: [
      { label: 'My Agents',  path: '/my-agents',  Icon: Users2 },
      { label: 'ClawHub',    path: '/agents',      Icon: Bot },
    ]
  },
  {
    label: 'Governance',
    items: [
      { label: 'Board',      path: '/board',       Icon: Gavel },
      { label: 'Workflows',  path: '/workflows',   Icon: GitBranch },
    ]
  },
  {
    label: 'AI Ops',
    items: [
      { label: 'War Room',   path: '/war-room',    Icon: Swords,  hot: true },
      { label: 'Skills',     path: '/marketplace', Icon: Store },
      { label: 'Deliberation', path: '/deliberation', Icon: Brain, special: true },
      { label: 'Memory',     path: '/memory',      Icon: Sparkles, special: true },
    ]
  },
  {
    label: 'Communications',
    items: [
      { label: 'Messages',   path: '/messages',    Icon: MessageSquare },
    ]
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { orgs, currentOrg, switchOrg, addOrg } = useOrg();
  const [expanded, setExpanded] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgDesc, setOrgDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [delegatePickerOpen, setDelegatePickerOpen] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const w = expanded ? 224 : 68;

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;
    setSaving(true);
    try {
      const res = await orgAPI.create({ name: orgName.trim(), description: orgDesc });
      addOrg(res.data);
      setCreateOpen(false); setOrgName(''); setOrgDesc('');
      toast.success('Organization created!');
    } catch { toast.error('Failed to create org'); } finally { setSaving(false); }
  };

  const handleInviteCodeSubmit = () => {
    if (!inviteCode.trim()) return;
    setPendingInviteCode(inviteCode.trim());
    setJoinOpen(false);
    setDelegatePickerOpen(true);
  };

  const handleJoinOrg = async (agent) => {
    setSaving(true);
    try {
      const res = await orgAPI.join({ invite_code: pendingInviteCode, agent_id: agent.id });
      addOrg(res.data);
      setInviteCode(''); setPendingInviteCode('');
      toast.success(`Joined org! ${agent.name} is your delegate.`);
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to join org'); } finally { setSaving(false); }
  };

  const copyInvite = () => {
    if (currentOrg?.invite_code) {
      navigator.clipboard.writeText(currentOrg.invite_code);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      toast.success('Invite code copied!');
    }
  };

  const initials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <>
      <TooltipProvider>
        <motion.aside
          data-testid="sidebar"
          initial={false}
          animate={{ width: w }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex-shrink-0 flex flex-col h-full relative z-20"
          style={{
            background: 'rgba(10,12,18,0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRight: '1px solid rgba(255,255,255,0.07)'
          }}
        >
          {/* Expand/collapse toggle */}
          <button onClick={() => setExpanded(!expanded)}
            className="absolute -right-3 top-6 z-30 w-6 h-6 rounded-full flex items-center justify-center transition-all"
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.5)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
            data-testid="sidebar-toggle">
            {expanded ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2.5 px-3.5 h-14 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
                boxShadow: '0 0 16px rgba(34,211,238,0.35)'
              }}>
              <Zap size={15} style={{ color: '#0a0a0a' }} />
            </div>
            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-bold text-sm truncate" style={{ fontFamily: 'Space Grotesk', color: 'rgba(255,255,255,0.95)' }}>OpenClaw</span>
                  {currentOrg && <NotificationCenter />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Org switcher */}
          <div className="px-2 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="org-switcher"
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.18)' }}>
                    <Building2 size={13} className="text-cyan-400" />
                  </div>
                  <AnimatePresence>
                    {expanded && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.88)' }}>{currentOrg?.name || 'No org selected'}</p>
                        <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>Switch organization</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {expanded && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <ChevronRight size={10} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    </motion.div>}
                  </AnimatePresence>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.1)' }}>
                {orgs.map(o => (
                  <DropdownMenuItem key={o.id} onClick={() => switchOrg(o)}
                    className={`cursor-pointer ${o.id === currentOrg?.id ? 'text-cyan-400' : ''}`}>
                    <Building2 size={14} className="mr-2 opacity-60" />{o.name}
                    {o.id === currentOrg?.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCreateOpen(true)} className="cursor-pointer">
                  <Plus size={14} className="mr-2" />Create organization
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setJoinOpen(true)} className="cursor-pointer">
                  <ChevronRight size={14} className="mr-2" />Join with invite code
                </DropdownMenuItem>
                {currentOrg && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={copyInvite} className="cursor-pointer">
                      {copied ? <Check size={14} className="mr-2 text-green-400" /> : <Copy size={14} className="mr-2" />}
                      {copied ? 'Copied!' : 'Copy invite code'}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Navigation with section groups */}
          <nav className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'none' }}>
            {NAV_GROUPS.map((group, gi) => (
              <div key={group.label} className={gi > 0 ? 'mt-1' : ''}>
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="nav-section-label px-3 pt-3 pb-1"
                    >
                      {group.label}
                    </motion.div>
                  )}
                </AnimatePresence>
                {!expanded && gi > 0 && (
                  <div className="mx-2 my-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
                )}
                <div className="px-2 space-y-0.5">
                  {group.items.map(({ label, path, Icon, hot, special }) => {
                    const active = location.pathname === path;
                    return (
                      <Tooltip key={path} delayDuration={200}>
                        <TooltipTrigger asChild>
                          <button
                            data-testid={`sidebar-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
                            onClick={() => navigate(path)}
                            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left relative transition-all group"
                            style={{
                              background: active
                                ? (hot ? 'rgba(239,68,68,0.1)' : special ? 'rgba(167,139,250,0.1)' : 'rgba(34,211,238,0.1)')
                                : 'transparent',
                              border: active
                                ? `1px solid ${hot ? 'rgba(239,68,68,0.25)' : special ? 'rgba(167,139,250,0.25)' : 'rgba(34,211,238,0.25)'}`
                                : '1px solid transparent',
                            }}
                          >
                            {/* Active indicator bar */}
                            {active && (
                              <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full"
                                style={{ background: hot ? '#ef4444' : special ? '#a78bfa' : '#22d3ee' }} />
                            )}
                            <Icon size={15}
                              style={{
                                color: active
                                  ? (hot ? '#ef4444' : special ? '#a78bfa' : '#22d3ee')
                                  : hot ? '#f87171' : special ? '#a78bfa' : 'rgba(255,255,255,0.45)',
                                flexShrink: 0,
                                transition: 'color 0.15s'
                              }}
                            />
                            <AnimatePresence>
                              {expanded && (
                                <motion.span
                                  initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                                  transition={{ duration: 0.13 }}
                                  className="text-xs font-medium truncate flex-1"
                                  style={{ color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)' }}
                                >{label}</motion.span>
                              )}
                            </AnimatePresence>
                            {hot && expanded && !active && (
                              <motion.span
                                animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
                                className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>HOT</motion.span>
                            )}
                            {special && expanded && !active && !hot && (
                              <motion.div animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 2.5, repeat: Infinity }}
                                className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#a78bfa' }} />
                            )}
                          </button>
                        </TooltipTrigger>
                        {!expanded && (
                          <TooltipContent side="right" style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {label}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer: settings + user */}
          <div className="p-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  data-testid="sidebar-nav-settings"
                  onClick={() => navigate('/settings')}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl mb-1.5 transition-all"
                  style={{
                    background: location.pathname === '/settings' ? 'rgba(34,211,238,0.08)' : 'transparent',
                    border: location.pathname === '/settings' ? '1px solid rgba(34,211,238,0.2)' : '1px solid transparent',
                  }}>
                  <Settings size={15} style={{ color: location.pathname === '/settings' ? '#22d3ee' : 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                  <AnimatePresence>
                    {expanded && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>Settings</motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </TooltipTrigger>
              {!expanded && <TooltipContent side="right">Settings</TooltipContent>}
            </Tooltip>

            {/* User profile */}
            <div className="flex items-center gap-2 px-2 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{ background: user?.avatar_color || '#22d3ee', color: '#0a0a0a', boxShadow: `0 0 10px ${(user?.avatar_color || '#22d3ee')}40` }}>
                {initials(user?.name)}
              </div>
              <AnimatePresence>
                {expanded && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{user?.name}</p>
                    <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'IBM Plex Mono' }}>{user?.email}</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {expanded && (
                  <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={logout} data-testid="logout-button"
                    className="p-1.5 rounded-lg transition-all flex-shrink-0"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                    title="Sign out">
                    <LogOut size={12} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.aside>
      </TooltipProvider>

      {/* Create Org Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.1)' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Space Grotesk' }}>Create Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Name *</Label>
              <Input data-testid="create-org-name" value={orgName} onChange={e => setOrgName(e.target.value)}
                placeholder="Acme AI Labs" style={{ background: 'hsl(var(--secondary))', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <Label className="text-xs mb-1 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Description</Label>
              <Input value={orgDesc} onChange={e => setOrgDesc(e.target.value)}
                placeholder="What does this org do?" style={{ background: 'hsl(var(--secondary))', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button data-testid="create-org-submit" onClick={handleCreateOrg} disabled={saving || !orgName.trim()}
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Join Org Dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.1)' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Space Grotesk' }}>Join Organization</DialogTitle>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Enter an invite code. Next you'll choose an agent delegate.
            </p>
          </DialogHeader>
          <div className="py-3">
            <Label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.6)' }}>Invite Code *</Label>
            <Input
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleInviteCodeSubmit()}
              placeholder="ABCD1234"
              data-testid="join-invite-code"
              style={{ background: 'hsl(var(--secondary))', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)}>Cancel</Button>
            <Button
              data-testid="join-next-button"
              onClick={handleInviteCodeSubmit}
              disabled={!inviteCode.trim()}
              style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
              Next: Choose Delegate →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DelegatePickerModal
        open={delegatePickerOpen}
        onClose={() => setDelegatePickerOpen(false)}
        onSelect={handleJoinOrg}
        orgName="the organization"
      />
    </>
  );
}
