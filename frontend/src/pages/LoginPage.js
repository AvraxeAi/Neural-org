import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

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
    <div className="h-screen flex" style={{background:'hsl(var(--background))'}}>
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{
          background:'hsl(222,35%,5%)',
          borderRight:'1px solid rgba(255,255,255,0.06)'
        }}
      >
        {/* Decorative glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background:'radial-gradient(600px circle at 20% 40%, rgba(34,211,238,0.10), transparent 60%), radial-gradient(400px circle at 80% 80%, rgba(245,158,11,0.07), transparent 60%)'
        }} />
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{backgroundImage:'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize:'60px 60px'}}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))'}}
            >
              <Zap size={18} />
            </div>
            <span className="text-xl font-bold" style={{fontFamily:'Space Grotesk'}}>OpenClaw</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight" style={{fontFamily:'Space Grotesk'}}>
            Run your AI company<br />
            <span style={{color:'hsl(var(--primary))'}}>in real time.</span>
          </h1>
          <p className="text-base mb-10" style={{color:'rgba(255,255,255,0.5)', lineHeight:1.7}}>
            The command center where humans and AI agents collaborate, debate, and execute work together.
          </p>
          <div className="space-y-3">
            {['Drag-and-drop org chart with live hierarchy', 'Visual workflow builder — trigger on approval', 'Board system with AI-ready voting', 'Real-time messaging between humans and agents'].map((feat, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:'hsl(var(--primary))'}} />
                <span className="text-sm" style={{color:'rgba(255,255,255,0.65)'}}>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs relative z-10" style={{color:'rgba(255,255,255,0.25)'}}>© 2024 OpenClaw Command Center</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{opacity:0, y:16}}
          animate={{opacity:1, y:0}}
          transition={{duration:0.4, ease:[0.22,1,0.36,1]}}
          className="w-full max-w-sm"
        >
          <div className="rounded-2xl p-8"
            style={{
              background:'var(--surface-1)',
              backdropFilter:'blur(20px)',
              border:'1px solid rgba(255,255,255,0.08)',
              boxShadow:'0 20px 60px rgba(0,0,0,0.5)'
            }}
          >
            <h2 className="text-xl font-semibold mb-1" style={{fontFamily:'Space Grotesk'}}>Welcome</h2>
            <p className="text-sm mb-6" style={{color:'rgba(255,255,255,0.45)'}}>Sign in to your command center</p>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="w-full mb-6" style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)'}}>
                <TabsTrigger value="login" className="flex-1 text-sm">Login</TabsTrigger>
                <TabsTrigger value="register" className="flex-1 text-sm">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.6)'}}>Email</Label>
                    <Input
                      data-testid="login-email-input"
                      type="email" value={email} onChange={e=>setEmail(e.target.value)}
                      placeholder="you@company.com" required
                      style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)'}}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.6)'}}>Password</Label>
                    <div className="relative">
                      <Input
                        data-testid="login-password-input"
                        type={showPass ? 'text' : 'password'}
                        value={password} onChange={e=>setPassword(e.target.value)}
                        placeholder="••••••••" required
                        style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', paddingRight:'2.5rem'}}
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{color:'rgba(255,255,255,0.4)'}}>
                        {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                  </div>
                  <Button
                    data-testid="login-submit-button"
                    type="submit" className="w-full" disabled={loading}
                    style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))'}}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.6)'}}>Full Name</Label>
                    <Input
                      data-testid="register-name-input"
                      value={name} onChange={e=>setName(e.target.value)}
                      placeholder="Alice Chen" required
                      style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)'}}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.6)'}}>Email</Label>
                    <Input
                      type="email" value={email} onChange={e=>setEmail(e.target.value)}
                      placeholder="you@company.com" required
                      style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)'}}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.6)'}}>Password</Label>
                    <Input
                      type="password" value={password} onChange={e=>setPassword(e.target.value)}
                      placeholder="Min. 6 chars" required
                      style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)'}}
                    />
                  </div>
                  <Button
                    data-testid="register-submit-button"
                    type="submit" className="w-full" disabled={loading}
                    style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))'}}
                  >
                    {loading ? 'Creating...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
