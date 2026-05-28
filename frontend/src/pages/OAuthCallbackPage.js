import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, orgAPI, agentAPI } from '../lib/api';
import { toast } from 'sonner';
import { Zap, Bot, Building2, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

function Spinner() {
  return (
    <div className="h-screen flex flex-col items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(34,211,238,0.05))', border: '1px solid rgba(34,211,238,0.25)' }}>
        <Zap size={22} style={{ color: '#22d3ee' }} />
      </div>
      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'IBM Plex Mono' }}>Completing sign-in…</p>
    </div>
  );
}

function OnboardingStep({ user, onDone }) {
  const [orgName, setOrgName]     = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentRole, setAgentRole] = useState('Assistant');
  const [saving, setSaving]       = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (!orgName.trim() || !agentName.trim()) return;
    setSaving(true);
    try {
      const orgRes   = await orgAPI.create({ name: orgName.trim(), description: '' });
      const org      = orgRes.data;
      await agentAPI.create(org.id, { name: agentName.trim(), role: agentRole.trim() || 'Assistant', system_prompt: '' });
      toast.success('Organization and agent created!');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Setup failed');
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center p-6" style={{ background: 'hsl(var(--background))' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #22d3ee, #0891b2)', boxShadow: '0 0 20px rgba(34,211,238,0.3)' }}>
            <Zap size={18} style={{ color: '#0a0a0a' }} />
          </div>
          <span className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk' }}>OpenClaw</span>
        </div>

        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Space Grotesk' }}>Welcome, {user?.name?.split(' ')[0]}!</h2>
        <p className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Set up your organization and create your first agent to get started.
        </p>

        <form onSubmit={handle} className="rounded-2xl p-6 space-y-5"
          style={{ background: 'var(--surface-1)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

          <div className="flex items-center gap-2 mb-1">
            <Building2 size={14} style={{ color: '#22d3ee' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#22d3ee', fontFamily: 'IBM Plex Mono' }}>Organization</span>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Organization name</Label>
            <Input
              value={orgName} onChange={e => setOrgName(e.target.value)}
              placeholder="Acme AI Labs"
              autoFocus
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }} />

          <div className="flex items-center gap-2 mb-1">
            <Bot size={14} style={{ color: '#a78bfa' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#a78bfa', fontFamily: 'IBM Plex Mono' }}>Your Agent</span>
          </div>
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Agent name</Label>
            <Input
              value={agentName} onChange={e => setAgentName(e.target.value)}
              placeholder="e.g. Aria, Max, or your own name"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Agent role</Label>
            <Input
              value={agentRole} onChange={e => setAgentRole(e.target.value)}
              placeholder="CEO / Analyst / Engineer / Assistant"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>

          <Button
            type="submit"
            disabled={saving || !orgName.trim() || !agentName.trim()}
            className="w-full h-10 font-semibold"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #0891b2)',
              color: '#0a0a0a',
              boxShadow: '0 4px 16px rgba(34,211,238,0.25)',
            }}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Setting up…
              </span>
            ) : (
              <span className="flex items-center gap-2">Launch Command Center <ArrowRight size={15} /></span>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken, user } = useAuth();
  const [step, setStep] = useState('exchanging'); // exchanging | onboarding | done
  const [error, setError] = useState('');
  const [authedUser, setAuthedUser] = useState(null);

  useEffect(() => {
    const code     = searchParams.get('code');
    const provider = searchParams.get('provider');

    if (!code || !provider) {
      setError('Missing OAuth code or provider. Please try signing in again.');
      setStep('error');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;

    (async () => {
      try {
        let res;
        if (provider === 'github') {
          res = await authAPI.githubCallback({ code, redirect_uri: redirectUri });
        } else if (provider === 'google') {
          res = await authAPI.googleCallback({ code, redirect_uri: redirectUri });
        } else {
          throw new Error(`Unknown provider: ${provider}`);
        }

        const { token, user: u } = res.data;
        loginWithToken(token, u);
        setAuthedUser(u);

        // Check if user already has orgs
        const { default: api } = await import('../lib/api');
        const orgsRes = await api.default.get('/orgs');
        const hasOrgs = orgsRes.data?.length > 0;

        if (hasOrgs) {
          navigate('/dashboard', { replace: true });
        } else {
          setStep('onboarding');
        }
      } catch (err) {
        const msg = err.response?.data?.detail || err.message || 'OAuth sign-in failed';
        setError(msg);
        setStep('error');
      }
    })();
  }, []); // eslint-disable-line

  if (step === 'exchanging') return <Spinner />;

  if (step === 'error') {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
        <div className="text-center max-w-sm px-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertTriangle size={24} style={{ color: '#ef4444' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Sign-in failed</h2>
          <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>{error}</p>
          <Button onClick={() => navigate('/login', { replace: true })}
            style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}>
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'onboarding') {
    return (
      <OnboardingStep
        user={authedUser}
        onDone={() => navigate('/dashboard', { replace: true })}
      />
    );
  }

  return <Spinner />;
}
