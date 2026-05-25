import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Network, ArrowRight, Zap, Brain, Users, GitBranch, Gavel } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const FEATURES = [
  { icon: Network,   title: 'Live Org Chart',        desc: 'Visualize your AI hierarchy in real time' },
  { icon: Brain,     title: 'Multi-Agent War Room',   desc: 'Watch agents debate and reach consensus' },
  { icon: Gavel,     title: 'On-Chain Governance',    desc: 'Board proposals with transparent voting' },
  { icon: GitBranch, title: 'Visual Workflow Builder', desc: 'Trigger automation on approvals' },
];

export default function LoginPage() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success('Account created!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'hsl(var(--background))' }}>

      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col w-[52%] relative overflow-hidden"
        style={{ background: 'hsl(222,38%,5%)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Layered background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div style={{ background: 'radial-gradient(700px circle at 15% 35%, rgba(34,211,238,0.13), transparent 55%)' }} className="absolute inset-0" />
          <div style={{ background: 'radial-gradient(500px circle at 85% 75%, rgba(167,139,250,0.09), transparent 55%)' }} className="absolute inset-0" />
          <div style={{ background: 'radial-gradient(300px circle at 75% 15%, rgba(245,158,11,0.07), transparent 55%)' }} className="absolute inset-0" />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
          }}
        />

        {/* Floating orbs */}
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ y: [0, 16, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #22d3ee, #0891b2)', boxShadow: '0 0 20px rgba(34,211,238,0.3)' }}>
              <Zap size={18} style={{ color: '#0a0a0a' }} />
            </div>
            <div>
              <span className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk', color: 'rgba(255,255,255,0.95)' }}>OpenClaw</span>
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold tracking-widest uppercase"
                style={{ background: 'rgba(34,211,238,0.12)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' }}>
                BETA
              </span>
            </div>
          </div>

          {/* Hero copy */}
          <div className="flex-1 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-sm mb-3 font-medium tracking-wider uppercase"
                style={{ color: '#22d3ee', fontFamily: 'IBM Plex Mono', letterSpacing: '0.15em' }}>
                AI-Native Operating System
              </p>
              <h1 className="text-5xl font-bold mb-5 leading-[1.12]"
                style={{ fontFamily: 'Space Grotesk', color: 'rgba(255,255,255,0.96)' }}>
                Run your AI<br />
                company
                <span style={{
                  display: 'block',
                  background: 'linear-gradient(90deg, #22d3ee, #a78bfa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>in real time.</span>
              </h1>
              <p className="text-base mb-10 max-w-sm" style={{ color: 'rgba(255,255,255,0.48)', lineHeight: 1.75, fontFamily: 'IBM Plex Sans' }}>
                The command center where humans and AI agents collaborate, debate, and execute — autonomously.
              </p>

              {/* Feature cards */}
              <div className="grid grid-cols-2 gap-3 max-w-md">
                {FEATURES.map(({ icon: Icon, title, desc }, i) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-xl p-3"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                      style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.2)' }}>
                      <Icon size={13} style={{ color: '#22d3ee' }} />
                    </div>
                    <p className="text-xs font-semibold mb-0.5" style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Space Grotesk' }}>{title}</p>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>{desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <p className="text-[11px] relative z-10" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'IBM Plex Mono' }}>
            © 2025 OpenClaw Inc. — Mission Control for AI Organizations
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(600px circle at 60% 50%, rgba(34,211,238,0.04), transparent 60%)' }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm relative z-10"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #22d3ee, #0891b2)' }}>
              <Zap size={15} style={{ color: '#0a0a0a' }} />
            </div>
            <span className="text-base font-bold" style={{ fontFamily: 'Space Grotesk' }}>OpenClaw</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold mb-1.5" style={{ fontFamily: 'Space Grotesk', color: 'rgba(255,255,255,0.96)' }}>
              {tab === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.42)', fontFamily: 'IBM Plex Sans' }}>
              {tab === 'login' ? 'Sign in to your command center' : 'Start building your AI organization'}
            </p>
          </div>

          <div className="rounded-2xl p-7"
            style={{
              background: 'var(--surface-1)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.09)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)'
            }}
          >
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full mb-6"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px' }}>
                <TabsTrigger value="login" className="flex-1 text-sm rounded-lg">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="flex-1 text-sm rounded-lg">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.55)' }}>Email address</Label>
                    <Input
                      data-testid="login-email-input"
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com" required
                      className="h-10"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', transition: 'border-color 0.2s' }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.55)' }}>Password</Label>
                    <div className="relative">
                      <Input
                        data-testid="login-password-input"
                        type={showPass ? 'text' : 'password'}
                        value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••" required
                        className="h-10"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', paddingRight: '2.5rem' }}
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <Button
                    data-testid="login-submit-button"
                    type="submit" className="w-full h-10 font-semibold" disabled={loading}
                    style={{
                      background: loading ? 'rgba(34,211,238,0.6)' : 'linear-gradient(135deg, #22d3ee, #0891b2)',
                      color: '#0a0a0a',
                      boxShadow: loading ? 'none' : '0 4px 16px rgba(34,211,238,0.3)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">Sign In <ArrowRight size={15} /></span>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.55)' }}>Full Name</Label>
                    <Input
                      data-testid="register-name-input"
                      value={name} onChange={e => setName(e.target.value)}
                      placeholder="Alice Chen" required
                      className="h-10"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.55)' }}>Email address</Label>
                    <Input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com" required
                      className="h-10"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.55)' }}>Password</Label>
                    <Input
                      type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 6 characters" required
                      className="h-10"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  </div>
                  <Button
                    data-testid="register-submit-button"
                    type="submit" className="w-full h-10 font-semibold" disabled={loading}
                    style={{
                      background: loading ? 'rgba(34,211,238,0.6)' : 'linear-gradient(135deg, #22d3ee, #0891b2)',
                      color: '#0a0a0a',
                      boxShadow: loading ? 'none' : '0 4px 16px rgba(34,211,238,0.3)',
                    }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Creating account...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">Create Account <ArrowRight size={15} /></span>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="text-center text-[11px] mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
            By continuing, you agree to our terms of service
          </p>
        </motion.div>
      </div>
    </div>
  );
}
