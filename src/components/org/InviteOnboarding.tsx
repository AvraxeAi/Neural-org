import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleUserRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useOrgGraphStore } from '../../store/orgGraphStore';

export default function InviteOnboarding({ token }: { token: string }) {
  const store = useOrgGraphStore();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', displayName: '', avatar: '' });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { void store.hydrate(); }, []);
  const invitation = useMemo(() => store.invitations.find(item => item.token.toLowerCase() === token.toLowerCase()), [store.invitations, token]);
  useEffect(() => { if (invitation?.email) setForm(current => ({ ...current, email: invitation.email })); }, [invitation?.email]);

  const expired = Boolean(invitation?.expiresAt && new Date(invitation.expiresAt) < new Date());
  const valid = Boolean(invitation && invitation.status === 'pending' && !expired);
  const canSubmit = valid && form.username.trim().length >= 3 && form.email.includes('@') && form.password.length >= 8 && form.password === form.confirm;

  const complete = () => {
    if (!canSubmit || !invitation) return;
    const name = form.displayName.trim() || form.username.trim();
    const accepted = store.acceptInvitation(token, {
      id: crypto.randomUUID(), type: 'human', name, username: form.username.trim(), email: form.email.trim(),
      role: invitation.role, title: invitation.role === 'member' ? 'Organization Member' : invitation.role,
      departmentId: invitation.departmentId, color: '#10b981', status: 'active',
      permissions: invitation.permissions, position: { x: 440 + Math.random() * 220, y: 620 + Math.random() * 120 },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    setSubmitted(accepted);
  };

  if (submitted) return <OnboardingShell><div className="join-success"><CheckCircle2 size={42} /><h1>Welcome to the organization</h1><p>Your account and organization profile were created. You have been placed into the assigned department and added to the org chart.</p><button onClick={() => window.location.assign('/')}>Open AVAI <ArrowRight size={15} /></button></div></OnboardingShell>;

  return <OnboardingShell>
    <div className="join-heading"><span><ShieldCheck size={15} /> Secure organization invitation</span><h1>Join your organization</h1><p>Complete your profile to create your account and enter the shared workspace.</p></div>
    {!valid && store.hydrated ? <div className="join-invalid"><LockKeyhole size={28} /><strong>{expired ? 'This invitation has expired' : 'Invitation not found'}</strong><p>Ask an organization owner to generate a new invitation link or code.</p></div> : <div className="join-form">
      <label><span>Username</span><input autoFocus value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} placeholder="your-username" /></label>
      <label><span>Email</span><input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
      <label><span>Password</span><input type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" /></label>
      <label><span>Confirm password</span><input type="password" value={form.confirm} onChange={event => setForm({ ...form, confirm: event.target.value })} /></label>
      <label><span>Display name <em>Optional</em></span><input value={form.displayName} onChange={event => setForm({ ...form, displayName: event.target.value })} /></label>
      <label><span>Avatar URL <em>Optional</em></span><input value={form.avatar} onChange={event => setForm({ ...form, avatar: event.target.value })} /></label>
      <div className="join-assignment"><CircleUserRound size={17} /><div><strong>{invitation?.role || 'Member'} access</strong><span>{store.nodes.find(node => node.id === invitation?.departmentId)?.name || 'Organization-wide'} department</span></div></div>
      <button className="join-submit" disabled={!canSubmit} onClick={complete}>Create account and join <ArrowRight size={15} /></button>
    </div>}
  </OnboardingShell>;
}

function OnboardingShell({ children }: { children: React.ReactNode }) {
  return <main className="join-page"><div className="join-brand"><div>O</div><span><strong>AVAI</strong><small>Organization Workspace</small></span></div><section className="join-card">{children}</section><p className="join-footnote">Invitation access is governed by your organization&apos;s roles and permissions.</p></main>;
}
