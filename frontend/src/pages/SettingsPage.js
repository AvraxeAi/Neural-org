import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { orgAPI, userConfigAPI } from '../lib/api';
import api from '../lib/api';
import { toast } from 'sonner';
import {
  Settings, User, Building2, Users, Copy, Check, Globe,
  RefreshCw, Shield, Crown, LogOut, Cpu, Key, Zap, CheckCircle2, XCircle, Clock, Bot
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import HealthPanel from '../components/Layout/HealthPanel';
import { Textarea } from '../components/ui/textarea';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { currentOrg, fetchOrgs } = useOrg();
  const [members, setMembers] = useState([]);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgConfig, setOrgConfig] = useState({ default_provider:'', default_model:'', openrouter_key:'', api_key:'' });
  const [savingConfig, setSavingConfig] = useState(false);
  const [swapRequests, setSwapRequests] = useState([]);
  const [reviewNotes, setReviewNotes] = useState({});
  const [reviewingId, setReviewingId] = useState(null);
  const [myKeys, setMyKeys] = useState({ openrouter_key:'', emergent_key:'', preferred_provider:'', preferred_model:'' });
  const [savingMyKeys, setSavingMyKeys] = useState(false);
  const [myKeysStatus, setMyKeysStatus] = useState({ has_openrouter_key: false, has_emergent_key: false });

  const fetchMembers = useCallback(async () => {
    if (!currentOrg) return;
    const res = await orgAPI.listMembers(currentOrg.id);
    setMembers(res.data);
    setInviteCode(currentOrg.invite_code || '');
    try {
      const cfgRes = await orgAPI.getConfig(currentOrg.id);
      setOrgConfig(prev => ({ ...prev, ...cfgRes.data }));
    } catch { }
    // fetch swap requests
    try {
      const swapRes = await api.get(`/orgs/${currentOrg.id}/delegates/swap-requests`);
      setSwapRequests(swapRes.data);
    } catch { }
  }, [currentOrg]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  useEffect(() => {
    userConfigAPI.get().then(res => {
      const d = res.data;
      setMyKeysStatus({ has_openrouter_key: d.has_openrouter_key, has_emergent_key: d.has_emergent_key });
      setMyKeys({
        openrouter_key: d.openrouter_key || '',
        emergent_key:   d.emergent_key   || '',
        preferred_provider: d.preferred_provider || '',
        preferred_model:    d.preferred_model    || '',
      });
    }).catch(() => {});
  }, []);

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
            <TabsTrigger value="delegates">
              Delegates
              {swapRequests.filter(r=>r.status==='pending').length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{background:'#ef4444',color:'white'}}>
                  {swapRequests.filter(r=>r.status==='pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="providers">AI Providers</TabsTrigger>
            <TabsTrigger value="health">System Health</TabsTrigger>
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

          {/* Delegates tab — swap request approval */}
          <TabsContent value="delegates" className="mt-4 space-y-3">
            <div className="rounded-2xl p-4" style={{background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.07)'}}>
              <h3 className="text-sm font-semibold mb-1" style={{fontFamily:'Space Grotesk'}}>Delegate Swap Requests</h3>
              <p className="text-xs mb-4" style={{color:'rgba(255,255,255,0.4)'}}>Review requests from members who want to change their delegate agent.</p>
              {swapRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Globe size={28} className="mx-auto mb-2" style={{color:'rgba(255,255,255,0.15)'}} />
                  <p className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>No swap requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {swapRequests.map(req => {
                    const cur  = req.current_agent  || {};
                    const nw   = req.new_agent       || {};
                    const isPending = req.status === 'pending';
                    return (
                      <div key={req.id} className="rounded-xl p-4"
                        style={{background:'rgba(255,255,255,0.03)', border:`1px solid ${isPending?'rgba(245,158,11,0.2)':'rgba(255,255,255,0.07)'}`}}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold" style={{fontFamily:'Space Grotesk'}}>{req.requesting_user_name}</p>
                            <p className="text-xs mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>
                              {new Date(req.requested_at).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            req.status==='pending'?'bg-amber-500/15 text-amber-300':
                            req.status==='approved'?'bg-emerald-500/15 text-emerald-300':
                            'bg-red-500/15 text-red-400'}`}>
                            {req.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl"
                          style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}>
                          <div className="flex items-center gap-1.5 flex-1">
                            <Bot size={13} style={{color:'#a78bfa'}} />
                            <span className="text-xs" style={{color:'rgba(255,255,255,0.7)'}}>{cur.name||'Unknown'}</span>
                          </div>
                          <span className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>→</span>
                          <div className="flex items-center gap-1.5 flex-1">
                            <Bot size={13} style={{color:'#22d3ee'}} />
                            <span className="text-xs font-medium" style={{color:'#22d3ee'}}>{nw.name||'Unknown'}</span>
                          </div>
                        </div>

                        {req.reason && (
                          <p className="text-xs mb-3 italic" style={{color:'rgba(255,255,255,0.5)'}}>"{req.reason}"</p>
                        )}

                        {isPending && (
                          <div className="space-y-2">
                            <Textarea
                              value={reviewNotes[req.id]||''}
                              onChange={e=>setReviewNotes(prev=>({...prev,[req.id]:e.target.value}))}
                              placeholder="Optional review note..."
                              rows={2}
                              className="text-xs"
                              style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', resize:'none'}}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1 h-8"
                                disabled={reviewingId===req.id}
                                onClick={async () => {
                                  setReviewingId(req.id);
                                  try {
                                    await api.put(`/orgs/${currentOrg.id}/delegates/swap-requests/${req.id}`, {approved:true, review_note:reviewNotes[req.id]||''});
                                    toast.success('Swap approved!');
                                    fetchMembers();
                                  } catch { toast.error('Failed'); } finally { setReviewingId(null); }
                                }}
                                style={{background:'rgba(16,185,129,0.15)', color:'#10b981', border:'1px solid rgba(16,185,129,0.3)'}}>
                                <CheckCircle2 size={12} className="mr-1" />Approve
                              </Button>
                              <Button size="sm" className="flex-1 h-8"
                                disabled={reviewingId===req.id}
                                onClick={async () => {
                                  setReviewingId(req.id);
                                  try {
                                    await api.put(`/orgs/${currentOrg.id}/delegates/swap-requests/${req.id}`, {approved:false, review_note:reviewNotes[req.id]||''});
                                    toast.success('Swap rejected');
                                    fetchMembers();
                                  } catch { toast.error('Failed'); } finally { setReviewingId(null); }
                                }}
                                style={{background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.3)'}}>
                                <XCircle size={12} className="mr-1" />Reject
                              </Button>
                            </div>
                          </div>
                        )}

                        {!isPending && req.review_note && (
                          <p className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>Note: {req.review_note}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {m.brought_agent_id && (
                            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
                              style={{background:'rgba(245,158,11,0.12)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.2)'}}>
                              <Globe size={8}/>delegate
                            </span>
                          )}
                          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                            style={{background:(roleColors[m.role]||'#6b7280')+'18', color:roleColors[m.role]||'#6b7280', border:`1px solid ${roleColors[m.role]||'#6b7280'}25`}}>
                            <RoleIcon size={10} />{m.role}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* AI Providers tab */}
          <TabsContent value="providers" className="mt-4 space-y-4">
            <div className="rounded-2xl p-5" style={{background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.07)'}}>
              <div className="flex items-center gap-2 mb-4">
                <Cpu size={16} style={{color:'#a78bfa'}} />
                <h3 className="text-sm font-semibold" style={{fontFamily:'Space Grotesk'}}>AI Provider Configuration</h3>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl p-3" style={{background:'rgba(34,211,238,0.06)', border:'1px solid rgba(34,211,238,0.15)'}}>
                  <p className="text-xs font-medium mb-0.5" style={{color:'#22d3ee'}}>Default</p>
                  <p className="text-xs" style={{color:'rgba(255,255,255,0.5)'}}>Emergent Universal Key is active by default (OpenAI, Anthropic, Gemini). No setup needed.</p>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>OpenRouter API Key</Label>
                  <Input
                    type="password"
                    value={orgConfig.openrouter_key || ''}
                    onChange={e => setOrgConfig(p=>({...p, openrouter_key:e.target.value}))}
                    placeholder="sk-or-... (enables DeepSeek + 300 models)"
                    className="font-mono text-xs"
                    style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)'}}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>Default Provider Override</Label>
                  <Input
                    value={orgConfig.default_provider || ''}
                    onChange={e => setOrgConfig(p=>({...p, default_provider:e.target.value}))}
                    placeholder="openai / anthropic / gemini / openrouter"
                    style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)'}}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>Default Model Override</Label>
                  <Input
                    value={orgConfig.default_model || ''}
                    onChange={e => setOrgConfig(p=>({...p, default_model:e.target.value}))}
                    placeholder="e.g. gpt-4.1, claude-sonnet-4-6"
                    style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)'}}
                  />
                </div>
                <Button
                  data-testid="save-provider-config"
                  onClick={async () => {
                    setSavingConfig(true);
                    try {
                      await orgAPI.updateConfig(currentOrg.id, orgConfig);
                      toast.success('Provider config saved!');
                    } catch { toast.error('Failed to save'); } finally { setSavingConfig(false); }
                  }}
                  disabled={savingConfig}
                  style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))'}}>
                  {savingConfig ? 'Saving...' : 'Save Provider Config'}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Health tab */}
          <TabsContent value="health" className="mt-4">
            <div className="rounded-2xl p-5" style={{background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.07)'}}>
              <h3 className="text-sm font-semibold mb-4" style={{fontFamily:'Space Grotesk'}}>System Health</h3>
              <HealthPanel orgId={currentOrg?.id} />
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

            {/* My API Keys */}
            <div className="rounded-2xl p-5" style={{background:'var(--surface-1)', border:'1px solid rgba(255,255,255,0.07)'}}>
              <div className="flex items-center gap-2 mb-1">
                <Key size={15} style={{color:'#a78bfa'}} />
                <h3 className="text-sm font-semibold" style={{fontFamily:'Space Grotesk'}}>My API Keys</h3>
              </div>
              <p className="text-xs mb-4" style={{color:'rgba(255,255,255,0.4)'}}>
                Your personal keys are used for your agent's LLM calls. They override any org-level keys — only your agent uses your tokens.
              </p>

              {/* Key status badges */}
              <div className="flex gap-2 mb-4">
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                  style={{background: myKeysStatus.has_openrouter_key ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                          color: myKeysStatus.has_openrouter_key ? '#10b981' : 'rgba(255,255,255,0.3)',
                          border: `1px solid ${myKeysStatus.has_openrouter_key ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`}}>
                  {myKeysStatus.has_openrouter_key ? <CheckCircle2 size={11}/> : <XCircle size={11}/>}
                  OpenRouter
                </span>
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                  style={{background: myKeysStatus.has_emergent_key ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)',
                          color: myKeysStatus.has_emergent_key ? '#10b981' : 'rgba(255,255,255,0.3)',
                          border: `1px solid ${myKeysStatus.has_emergent_key ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`}}>
                  {myKeysStatus.has_emergent_key ? <CheckCircle2 size={11}/> : <XCircle size={11}/>}
                  Emergent / OpenAI
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>OpenRouter Key</Label>
                  <Input
                    type="password"
                    value={myKeys.openrouter_key}
                    onChange={e => setMyKeys(p => ({...p, openrouter_key: e.target.value}))}
                    placeholder="sk-or-... (DeepSeek + 300 models)"
                    className="font-mono text-xs"
                    style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)'}}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>Emergent / OpenAI Key</Label>
                  <Input
                    type="password"
                    value={myKeys.emergent_key}
                    onChange={e => setMyKeys(p => ({...p, emergent_key: e.target.value}))}
                    placeholder="Personal key for OpenAI / Anthropic / Gemini"
                    className="font-mono text-xs"
                    style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)'}}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>Preferred Provider</Label>
                    <Input
                      value={myKeys.preferred_provider}
                      onChange={e => setMyKeys(p => ({...p, preferred_provider: e.target.value}))}
                      placeholder="openai / anthropic / openrouter"
                      style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', fontSize:12}}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.5)'}}>Preferred Model</Label>
                    <Input
                      value={myKeys.preferred_model}
                      onChange={e => setMyKeys(p => ({...p, preferred_model: e.target.value}))}
                      placeholder="e.g. gpt-4.1-mini"
                      style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', fontSize:12}}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={async () => {
                      setSavingMyKeys(true);
                      try {
                        await userConfigAPI.update(myKeys);
                        const r = await userConfigAPI.get();
                        setMyKeysStatus({ has_openrouter_key: r.data.has_openrouter_key, has_emergent_key: r.data.has_emergent_key });
                        toast.success('Your keys saved!');
                      } catch { toast.error('Failed to save'); } finally { setSavingMyKeys(false); }
                    }}
                    disabled={savingMyKeys}
                    style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))'}}>
                    {savingMyKeys ? 'Saving...' : 'Save My Keys'}
                  </Button>
                  {(myKeysStatus.has_openrouter_key || myKeysStatus.has_emergent_key) && (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          await userConfigAPI.clearKeys();
                          setMyKeys(p => ({...p, openrouter_key:'', emergent_key:''}));
                          setMyKeysStatus({ has_openrouter_key: false, has_emergent_key: false });
                          toast.success('Keys cleared');
                        } catch { toast.error('Failed to clear'); }
                      }}
                      style={{border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', background:'rgba(239,68,68,0.05)'}}>
                      Clear Keys
                    </Button>
                  )}
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
