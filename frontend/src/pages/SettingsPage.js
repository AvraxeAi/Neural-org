import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { orgAPI } from '../lib/api';
import { toast } from 'sonner';
import {
  Settings, User, Building2, Users, Copy, Check,
  RefreshCw, Shield, Crown, LogOut
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { currentOrg, fetchOrgs } = useOrg();
  const [members, setMembers] = useState([]);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!currentOrg) return;
    const res = await orgAPI.listMembers(currentOrg.id);
    setMembers(res.data);
    setInviteCode(currentOrg.invite_code || '');
  }, [currentOrg]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const refreshInvite = async () => {
    setLoading(true);
    try {
      const res = await orgAPI.refreshInvite(currentOrg.id);
      setInviteCode(res.data.invite_code);
      fetchOrgs();
      toast.success('Invite code refreshed!');
    } catch { toast.error('Failed to refresh invite code'); }
    finally { setLoading(false); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied!');
  };

  const roleColors = { owner: '#f59e0b', board: '#22d3ee', member: '#6b7280' };
  const roleIcons = { owner: Crown, board: Shield, member: User };

  return (
    <div className="h-full overflow-y-auto" data-testid="settings-page">
      <div className="p-6 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6" style={{fontFamily:'Space Grotesk'}}>Settings</h1>

        <Tabs defaultValue="org">
          <TabsList style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)'}}>
            <TabsTrigger value="org">Organization</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Org tab */}
          <TabsContent value="org" className="mt-4 space-y-4">
            <div className="rounded-2xl p-5" style={{background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.07)'}}>
              <h3 className="text-sm font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Organization Info</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>Name</Label>
                  <Input value={currentOrg?.name || ''} readOnly
                    style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)'}} />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>Org ID</Label>
                  <Input value={currentOrg?.id || ''} readOnly
                    className="font-mono text-xs"
                    style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)'}} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.07)'}}>
              <h3 className="text-sm font-semibold mb-1" style={{fontFamily:'Space Grotesk'}}>Invite Code</h3>
              <p className="text-xs mb-3" style={{color:'rgba(255,255,255,0.4)'}}>Share this code with people you want to invite</p>
              <div className="flex gap-2">
                <Input value={inviteCode} readOnly
                  className="font-mono text-sm font-bold"
                  style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', letterSpacing:'0.1em'}} />
                <Button variant="outline" onClick={copyCode}
                  style={{border:'1px solid rgba(255,255,255,0.1)', minWidth:80}}
                  data-testid="copy-invite-button">
                  {copied ? <><Check size={13} className="mr-1 text-green-400" />Copied!</> : <><Copy size={13} className="mr-1" />Copy</>}
                </Button>
                <Button variant="outline" onClick={refreshInvite} disabled={loading}
                  style={{border:'1px solid rgba(255,255,255,0.1)'}}>
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Members tab */}
          <TabsContent value="members" className="mt-4">
            <div className="rounded-2xl overflow-hidden" style={{background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.07)'}}>
              <div className="p-4" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <h3 className="text-sm font-semibold" style={{fontFamily:'Space Grotesk'}}>Members ({members.length})</h3>
              </div>
              <ScrollArea className="max-h-96">
                <div className="divide-y" style={{divideColor:'rgba(255,255,255,0.06)'}}>
                  {members.map(m => {
                    const u = m.user || {};
                    const RoleIcon = roleIcons[m.role] || User;
                    return (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{background:(u.avatar_color||'#22d3ee')+'20', color:u.avatar_color||'#22d3ee'}}>
                          {(u.name||'?').slice(0,2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{color:'rgba(255,255,255,0.85)'}}>{u.name}</p>
                          <p className="text-xs truncate" style={{color:'rgba(255,255,255,0.35)'}}>{u.email}</p>
                        </div>
                        <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full flex-shrink-0"
                          style={{background:(roleColors[m.role]||'#6b7280')+'18', color:roleColors[m.role]||'#6b7280', border:`1px solid ${roleColors[m.role]||'#6b7280'}25`}}>
                          <RoleIcon size={10} />{m.role}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Profile tab */}
          <TabsContent value="profile" className="mt-4 space-y-4">
            <div className="rounded-2xl p-5" style={{background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.07)'}}>
              <h3 className="text-sm font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>Profile</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{background:(user?.avatar_color||'#22d3ee')+'25', color:user?.avatar_color||'#22d3ee', border:`2px solid ${user?.avatar_color||'#22d3ee'}35`}}>
                  {(user?.name||'?').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold" style={{fontFamily:'Space Grotesk'}}>{user?.name}</p>
                  <p className="text-sm" style={{color:'rgba(255,255,255,0.4)'}}>{user?.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>Name</Label>
                  <Input value={user?.name || ''} readOnly
                    style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)'}} />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>Email</Label>
                  <Input value={user?.email || ''} readOnly
                    style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)'}} />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>User ID</Label>
                  <Input value={user?.id || ''} readOnly
                    className="font-mono text-xs"
                    style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)'}} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.07)'}}>
              <h3 className="text-sm font-semibold mb-3" style={{fontFamily:'Space Grotesk', color:'#ef4444'}}>Danger Zone</h3>
              <Button
                data-testid="logout-btn-settings"
                variant="outline" onClick={logout} className="w-full"
                style={{border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', background:'rgba(239,68,68,0.05)'}}
              >
                <LogOut size={14} className="mr-2" />Sign Out
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
