import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrg } from '../contexts/OrgContext';
import { useWS } from '../contexts/WSContext';
import api from '../lib/api';
import { toast } from 'sonner';
import {
  Store, Search, Star, Download, Check, CheckCircle2, Shield,
  Zap, X, ChevronRight, Package, ToggleLeft, ToggleRight, ExternalLink,
  Code, Database, BarChart2, MessageSquare, Lock, Cpu, Briefcase,
  TrendingUp, Users, Megaphone, DollarSign, HeadphonesIcon, Palette, RefreshCw,
  Plus, Layers
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';

// ── Category icons ──────────────────────────────────────────────────────
const CAT_ICONS = {
  all: Layers, research: Search, coding: Code, data: Database,
  business: Briefcase, communication: MessageSquare, security: Lock,
  devops: Cpu, management: Users, marketing: Megaphone,
  finance: DollarSign, support: HeadphonesIcon, design: Palette,
};

const SOURCE_BADGES = {
  clawhub:   { bg: 'rgba(34,211,238,0.1)',  color: '#22d3ee', border: 'rgba(34,211,238,0.2)',  label: 'ClaWHub' },
  hermeshub: { bg: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: 'rgba(167,139,250,0.2)', label: 'Hermes' },
  github:    { bg: 'rgba(255,255,255,0.08)',color: 'rgba(255,255,255,0.6)', border: 'rgba(255,255,255,0.12)', label: 'GitHub' },
};

function StarRating({ rating, size = 10 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} style={{
          color: i <= Math.round(rating) ? '#f59e0b' : 'rgba(255,255,255,0.2)',
          fill:  i <= Math.round(rating) ? '#f59e0b' : 'none',
        }} />
      ))}
    </div>
  );
}

function SkillCard({ skill, installed, installing, onInstall, onUninstall, onToggle, onClick }) {
  const src = SOURCE_BADGES[skill.source] || SOURCE_BADGES.github;
  const isEnabled  = installed?.enabled;
  const isPro      = skill.price === 'pro';
  const isInstalled = !!installed;

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: `0 12px 40px rgba(0,0,0,0.4)` }}
      transition={{ duration: 0.18 }}
      className="rounded-2xl p-4 cursor-pointer flex flex-col relative overflow-hidden"
      style={{
        background: 'var(--surface-1)',
        backdropFilter: 'blur(12px)',
        border: isInstalled ? `1px solid ${skill.color}30` : '1px solid rgba(255,255,255,0.08)',
        boxShadow: isInstalled ? `0 0 20px ${skill.color}08` : 'none',
      }}
      onClick={onClick}
      data-testid={`skill-card-${skill.id}`}
    >
      {/* Featured glow */}
      {skill.featured && (
        <div className="absolute top-0 right-0 left-0 h-0.5 rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, transparent, ${skill.color}, transparent)` }} />
      )}

      <div className="flex items-start gap-3 mb-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: skill.color + '20', border: `1px solid ${skill.color}30` }}>
          <Zap size={16} style={{ color: skill.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold truncate" style={{ fontFamily: 'Space Grotesk', color: 'rgba(255,255,255,0.95)' }}>
              {skill.name}
            </span>
            {skill.author_verified && (
              <Shield size={11} style={{ color: '#22d3ee', flexShrink: 0 }} />
            )}
            {isPro && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>PRO</span>
            )}
          </div>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>by {skill.author}</p>
        </div>

        {/* Install/enable toggle */}
        <div className="flex-shrink-0">
          {isInstalled ? (
            <button
              onClick={e => { e.stopPropagation(); onToggle(skill.id); }}
              className="p-1.5 rounded-lg"
              style={{ background: isEnabled ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                       border: `1px solid ${isEnabled ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.1)'}` }}
              data-testid={`skill-toggle-${skill.id}`}
            >
              {isEnabled
                ? <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                : <X size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />}
            </button>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onInstall(skill.id); }}
              disabled={installing === skill.id}
              className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
              style={{ background: skill.color + '15', color: skill.color,
                       border: `1px solid ${skill.color}30`,
                       opacity: installing === skill.id ? 0.6 : 1 }}
              data-testid={`install-skill-${skill.id}`}
            >
              {installing === skill.id ? '...' : 'Install'}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs mb-3 line-clamp-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', flex: 1 }}>
        {skill.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarRating rating={skill.rating} />
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{skill.rating}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <Download size={9} className="inline mr-0.5" />{(skill.downloads/1000).toFixed(1)}k
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: src.bg, color: src.color, border: `1px solid ${src.border}` }}>
            {src.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function SkillDetail({ skill, installed, installing, onInstall, onUninstall, onClose }) {
  const src = SOURCE_BADGES[skill.source] || SOURCE_BADGES.github;
  const isInstalled = !!installed;

  return (
    <Dialog open={!!skill} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" style={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.1)' }}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: skill.color + '20', border: `1px solid ${skill.color}30` }}>
              <Zap size={20} style={{ color: skill.color }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle style={{ fontFamily: 'Space Grotesk', fontSize: 18 }}>{skill.name}</DialogTitle>
                {skill.author_verified && <Shield size={13} style={{ color: '#22d3ee' }} />}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                by {skill.author} · v{skill.version}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{skill.description}</p>

          <div className="grid grid-cols-3 gap-2">
            {[
              ['Rating', `${skill.rating} ★`],
              ['Downloads', `${(skill.downloads/1000).toFixed(1)}k`],
              ['Reviews', skill.reviews],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl p-2.5 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-semibold" style={{ color: skill.color }}>{v}</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{k}</p>
              </div>
            ))}
          </div>

          {skill.capabilities?.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>CAPABILITIES</p>
              <div className="flex flex-wrap gap-1.5">
                {skill.capabilities.map(c => (
                  <span key={c} className="text-xs px-2 py-0.5 rounded-lg"
                    style={{ background: skill.color + '12', color: skill.color, border: `1px solid ${skill.color}25` }}>
                    {c.replace(/_/g,' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {skill.permissions?.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>PERMISSIONS REQUIRED</p>
              <div className="flex flex-wrap gap-1.5">
                {skill.permissions.map(p => (
                  <span key={p} className="text-xs px-2 py-0.5 rounded-lg flex items-center gap-1"
                    style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <Lock size={9} />{p.replace(/_/g,' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs">
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>Source:</span>
            <span className="px-1.5 py-0.5 rounded" style={{ background: src.bg, color: src.color, border: `1px solid ${src.border}` }}>{src.label}</span>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>Updated:</span>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>{skill.updated_at}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {isInstalled ? (
            <Button variant="destructive" onClick={() => { onUninstall(skill.id); onClose(); }}
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              Uninstall
            </Button>
          ) : (
            <Button onClick={() => { onInstall(skill.id); onClose(); }}
              disabled={installing === skill.id}
              style={{ background: skill.color, color: '#000', fontWeight: 600 }}>
              {installing === skill.id ? 'Installing...' : 'Install Skill'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SkillMarketplacePage() {
  const { currentOrg } = useOrg();
  const { on } = useWS();
  const [allSkills, setAllSkills]       = useState([]);
  const [categories, setCategories]     = useState([]);
  const [installed, setInstalled]       = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [query, setQuery]               = useState('');
  const [installing, setInstalling]     = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState('browse');

  const fetchData = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [mktRes, instRes] = await Promise.all([
        api.get(`/marketplace/skills?category=${activeCategory}&q=${query}`),
        api.get(`/orgs/${currentOrg.id}/skills/installed`),
      ]);
      setAllSkills(mktRes.data.skills);
      setCategories(mktRes.data.categories);
      setInstalled(instRes.data);
    } catch {} finally { setLoading(false); }
  }, [currentOrg, activeCategory, query]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!on) return;
    const u = on('skill.installed', () => fetchData());
    const u2 = on('skill.uninstalled', () => fetchData());
    return () => { u(); u2(); };
  }, [on, fetchData]);

  const handleInstall = async (skillId) => {
    if (!currentOrg) return;
    setInstalling(skillId);
    try {
      await api.post(`/orgs/${currentOrg.id}/skills/install`, { skill_id: skillId });
      const skill = allSkills.find(s => s.id === skillId);
      toast.success(`${skill?.name || 'Skill'} installed!`);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Install failed'); }
    finally { setInstalling(null); }
  };

  const handleUninstall = async (skillId) => {
    if (!currentOrg) return;
    try {
      await api.delete(`/orgs/${currentOrg.id}/skills/${skillId}`);
      toast.success('Skill uninstalled');
      fetchData();
    } catch { toast.error('Uninstall failed'); }
  };

  const handleToggle = async (skillId) => {
    if (!currentOrg) return;
    try {
      const res = await api.put(`/orgs/${currentOrg.id}/skills/${skillId}/toggle`);
      toast.success(res.data.enabled ? 'Skill enabled' : 'Skill disabled');
      fetchData();
    } catch { toast.error('Failed to toggle'); }
  };

  const getInstalled = (skillId) => installed.find(i => i.skill_id === skillId || i.id === skillId);
  const featuredSkills = allSkills.filter(s => s.featured && activeCategory === 'all' && !query);

  return (
    <div className="h-full flex flex-col" data-testid="marketplace-page">
      {/* Header */}
      <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.2)' }}>
              <Store size={16} style={{ color: '#22d3ee' }} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk' }}>Skill Marketplace</h1>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {allSkills.length} skills · {installed.length} installed
              </p>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <TabsTrigger value="browse" className="text-xs">Browse</TabsTrigger>
              <TabsTrigger value="installed" className="text-xs">Installed ({installed.length})</TabsTrigger>
              <TabsTrigger value="studio" className="text-xs">Skill Studio</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {tab === 'browse' && (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <Input
              data-testid="skill-search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search skills..."
              className="pl-8 h-9 text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar categories */}
        {tab === 'browse' && (
          <div className="w-48 flex-shrink-0 p-3" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-[10px] font-semibold mb-2 px-2" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>CATEGORIES</p>
            <div className="space-y-0.5">
              {categories.map(cat => {
                const Icon = CAT_ICONS[cat.id] || Package;
                return (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left"
                    style={{
                      background: activeCategory === cat.id ? 'rgba(34,211,238,0.08)' : 'transparent',
                      border: activeCategory === cat.id ? '1px solid rgba(34,211,238,0.2)' : '1px solid transparent',
                      color: activeCategory === cat.id ? '#22d3ee' : 'rgba(255,255,255,0.55)',
                    }}
                    data-testid={`cat-${cat.id}`}
                  >
                    <Icon size={13} style={{ flexShrink: 0 }} />
                    <span className="text-xs truncate">{cat.label}</span>
                    <span className="ml-auto text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{cat.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {tab === 'browse' && (
            <ScrollArea className="h-full">
              <div className="p-5">
                {/* Featured row */}
                {featuredSkills.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Star size={13} style={{ color: '#f59e0b' }} />
                      <h2 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>Featured</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {featuredSkills.slice(0, 3).map(skill => (
                        <SkillCard
                          key={skill.id} skill={skill}
                          installed={getInstalled(skill.id)}
                          installing={installing}
                          onInstall={handleInstall} onUninstall={handleUninstall}
                          onToggle={handleToggle}
                          onClick={() => setSelectedSkill(skill)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* All skills grid */}
                <div className="flex items-center gap-2 mb-3">
                  <Package size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                  <h2 className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>
                    {activeCategory === 'all' ? 'All Skills' : categories.find(c => c.id === activeCategory)?.label}
                    <span className="ml-2 text-xs font-normal" style={{ color: 'rgba(255,255,255,0.35)' }}>{allSkills.length}</span>
                  </h2>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <AnimatePresence>
                      {allSkills.map(skill => (
                        <motion.div key={skill.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <SkillCard
                            skill={skill}
                            installed={getInstalled(skill.id)}
                            installing={installing}
                            onInstall={handleInstall} onUninstall={handleUninstall}
                            onToggle={handleToggle}
                            onClick={() => setSelectedSkill(skill)}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {tab === 'installed' && (
            <ScrollArea className="h-full p-5">
              {installed.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {installed.map(inst => {
                    const skill = allSkills.find(s => s.id === (inst.skill_id || inst.id)) || inst;
                    return (
                      <SkillCard
                        key={inst.id} skill={skill}
                        installed={inst}
                        installing={installing}
                        onInstall={handleInstall} onUninstall={handleUninstall}
                        onToggle={handleToggle}
                        onClick={() => setSelectedSkill(skill)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24">
                  <Package size={40} className="mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  <p className="text-sm font-semibold mb-1" style={{ fontFamily: 'Space Grotesk' }}>No skills installed</p>
                  <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>Browse the marketplace to install your first skill</p>
                  <Button size="sm" onClick={() => setTab('browse')}
                    style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
                    Browse Skills
                  </Button>
                </div>
              )}
            </ScrollArea>
          )}

          {tab === 'studio' && (
            <ScrollArea className="h-full p-6">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}>
                    <Code size={16} style={{ color: '#a78bfa' }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk' }}>Skill Studio</h2>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Build, publish, and monetize custom skills</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  {[
                    { icon: Plus, title: 'New Skill', desc: 'Start from scratch', color: '#22d3ee', action: 'Create' },
                    { icon: Package, title: 'From Template', desc: 'Fork an existing skill', color: '#a78bfa', action: 'Browse' },
                    { icon: ExternalLink, title: 'Import from GitHub', desc: 'Link a repository', color: '#10b981', action: 'Connect' },
                  ].map(({ icon: Icon, title, desc, color, action }) => (
                    <button key={title}
                      className="rounded-2xl p-4 text-left"
                      style={{ background: 'var(--surface-1)', border: `1px solid ${color}25` }}
                      onClick={() => toast.info(`${title} \u2014 coming soon!`)}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                        style={{ background: color + '15' }}>
                        <Icon size={14} style={{ color }} />
                      </div>
                      <p className="text-sm font-semibold" style={{ fontFamily: 'Space Grotesk' }}>{title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>SKILL MANIFEST PREVIEW</p>
                  <pre className="text-xs font-mono leading-relaxed" style={{ color: '#22d3ee', overflowX: 'auto' }}>
{`{
  "name": "My Custom Skill",
  "version": "1.0.0",
  "description": "...",
  "capabilities": ["analyze", "summarize"],
  "permissions": ["network"],
  "entry": "skill.py",
  "author": "you@company.com"
}`}
                  </pre>
                  <Button size="sm" className="mt-3" onClick={() => toast.info('Publishing coming soon!')}
                    style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
                    Publish to ClaWHub
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Skill detail modal */}
      {selectedSkill && (
        <SkillDetail
          skill={selectedSkill}
          installed={getInstalled(selectedSkill.id)}
          installing={installing}
          onInstall={handleInstall}
          onUninstall={handleUninstall}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </div>
  );
}
