import React, { useEffect, useMemo, useState } from 'react';
import { t } from '../../lib/designTokens';
import { orgsApi } from '../../lib/api';

type Team = 'Red Team' | 'Blue Team' | 'Purple Team';
type Filter = 'All' | Team;

type Category = {
  team: Team;
  title: string;
  subtitle: string;
  accent: string;
  description: string;
  skills: string[];
};

type MarketplaceOrg = {
  id: string;
  name: string;
  initials: string;
  team: Team;
  avatarColor: string;
  verified: boolean;
  description: string;
  industry: string;
  services: string[];
  humans: number;
  aiAgents: number;
  models: string[];
  rating: number;
  reviews: number;
  pricing: string;
};

const theme = {
  bg: t.bg,
  surface: '#111111',
  surfaceRaise: '#1e1e1e',
  border: 'rgba(255,255,255,0.07)',
  textPrimary: t.textPrimary,
  textSecond: t.textSecond,
  textMuted: t.textMuted,
  accent: t.accent,
};

const categories: Category[] = [
  {
    team: 'Red Team',
    title: 'Red Team',
    subtitle: 'Operations, Security, Compliance',
    accent: '#ef4444',
    description: 'Professional operators for risk-heavy workflows: security response, legal review, fraud analysis, and regulated process support.',
    skills: ['Cybersecurity', 'Legal', 'Risk', 'Compliance', 'IT', 'Fraud Detection'],
  },
  {
    team: 'Blue Team',
    title: 'Blue Team',
    subtitle: 'Engineering, Technical',
    accent: '#3b82f6',
    description: 'Technical delivery teams for product engineering, AI development, research, data infrastructure, and developer automation.',
    skills: ['Software Dev', 'AI Dev', 'Research', 'Data Science', 'DevOps', 'Claude Code Specialists'],
  },
  {
    team: 'Purple Team',
    title: 'Purple Team',
    subtitle: 'Business, Leadership',
    accent: '#8b5cf6',
    description: 'Commercial and leadership teams for market strategy, revenue operations, executive planning, and growth systems.',
    skills: ['Marketing', 'SEO', 'Sales', 'Consulting', 'Executive Strategy', 'Growth'],
  },
];

const organizations: MarketplaceOrg[] = [
  {
    id: 'nexus-legal-ai',
    name: 'Nexus Legal AI',
    initials: 'NL',
    team: 'Red Team',
    avatarColor: '#ef4444',
    verified: true,
    description: 'Legal and compliance workforce for contract review, regulatory monitoring, policy analysis, and board-ready risk summaries.',
    industry: 'Legal + Compliance',
    services: ['Contract Review', 'Compliance', 'Policy Ops'],
    humans: 4,
    aiAgents: 12,
    models: ['claude-sonnet-4-6', 'gpt-4o'],
    rating: 4.9,
    reviews: 86,
    pricing: 'From $2,500/mo',
  },
  {
    id: 'cipherforce',
    name: 'CipherForce',
    initials: 'CF',
    team: 'Red Team',
    avatarColor: '#b91c1c',
    verified: false,
    description: 'Cybersecurity and risk cell for threat modeling, incident triage, vendor reviews, and fraud-detection workflows.',
    industry: 'Cybersecurity + Risk',
    services: ['Threat Modeling', 'Risk Audits', 'Fraud Signals'],
    humans: 6,
    aiAgents: 8,
    models: ['claude-opus-4-1', 'gpt-4o'],
    rating: 4.7,
    reviews: 42,
    pricing: 'Custom',
  },
  {
    id: 'buildstack-dev',
    name: 'BuildStack Dev',
    initials: 'BD',
    team: 'Blue Team',
    avatarColor: '#3b82f6',
    verified: true,
    description: 'Full-stack software and AI development pod for shipping product features, agents, integrations, and production automation.',
    industry: 'Software + AI Dev',
    services: ['Full-Stack Apps', 'AI Agents', 'Integrations'],
    humans: 8,
    aiAgents: 15,
    models: ['claude-sonnet-4-6', 'gpt-4o'],
    rating: 4.8,
    reviews: 73,
    pricing: 'From $6,000/mo',
  },
  {
    id: 'datapulse-labs',
    name: 'DataPulse Labs',
    initials: 'DP',
    team: 'Blue Team',
    avatarColor: '#1d4ed8',
    verified: false,
    description: 'Research and data-science workforce for market intelligence, experiment analysis, forecasting, and decision dashboards.',
    industry: 'Research + Data Science',
    services: ['Research Ops', 'Forecasting', 'Dashboards'],
    humans: 5,
    aiAgents: 20,
    models: ['gpt-4o', 'deepseek-r1-0528'],
    rating: 4.6,
    reviews: 51,
    pricing: 'From $4,200/mo',
  },
  {
    id: 'growthengine-co',
    name: 'GrowthEngine Co',
    initials: 'GE',
    team: 'Purple Team',
    avatarColor: '#8b5cf6',
    verified: true,
    description: 'Marketing, SEO, and sales workforce for campaign planning, lead generation, content systems, and revenue operations.',
    industry: 'Marketing + SEO + Sales',
    services: ['SEO Systems', 'Outbound', 'Content Ops'],
    humans: 3,
    aiAgents: 10,
    models: ['gpt-4o', 'gemini-flash-3'],
    rating: 4.9,
    reviews: 104,
    pricing: 'From $3,500/mo',
  },
  {
    id: 'vertex-strategy',
    name: 'Vertex Strategy',
    initials: 'VS',
    team: 'Purple Team',
    avatarColor: '#7c3aed',
    verified: false,
    description: 'Executive consulting and growth strategy team for market positioning, operating plans, investor narratives, and board prep.',
    industry: 'Executive Consulting + Growth',
    services: ['Strategy', 'Board Prep', 'Growth Plans'],
    humans: 6,
    aiAgents: 7,
    models: ['claude-opus-4-1', 'gpt-4o'],
    rating: 4.7,
    reviews: 39,
    pricing: 'Custom',
  },
];

const filters: Filter[] = ['All', 'Red Team', 'Blue Team', 'Purple Team'];

const teamAccent: Record<Team, string> = {
  'Red Team': '#ef4444',
  'Blue Team': '#3b82f6',
  'Purple Team': '#8b5cf6',
};

function useColumnMode() {
  const getMode = () => {
    if (window.innerWidth < 760) return 1;
    if (window.innerWidth < 1180) return 2;
    return 3;
  };

  const [columns, setColumns] = useState(getMode);

  useEffect(() => {
    const onResize = () => setColumns(getMode());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return columns;
}

function HoverCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 16,
        boxShadow: hovered ? '0 18px 42px rgba(0,0,0,0.42)' : '0 10px 28px rgba(0,0,0,0.28)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function TeamBadge({ team }: { team: Team }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        border: `1px solid ${teamAccent[team]}`,
        color: teamAccent[team],
        background: theme.surfaceRaise,
        padding: '4px 9px',
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.03em',
      }}
    >
      {team}
    </span>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span
      style={{
        borderRadius: 999,
        border: `1px solid ${theme.border}`,
        color: theme.textSecond,
        background: theme.surfaceRaise,
        padding: '4px 8px',
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}

function CountPill({ icon, count, label }: { icon: 'human' | 'ai'; count: number; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: theme.textSecond,
        background: theme.surfaceRaise,
        border: `1px solid ${theme.border}`,
        borderRadius: 999,
        padding: '5px 9px',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 14,
          height: 14,
          borderRadius: icon === 'human' ? '50%' : 4,
          border: `1px solid ${icon === 'human' ? theme.textMuted : theme.accent}`,
          display: 'inline-block',
          position: 'relative',
        }}
      />
      {count} {label}
    </span>
  );
}

function OrgChartPreview({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 220 116" role="img" aria-label="Three node organization chart preview" style={{ width: '100%', height: 116, display: 'block' }}>
      <rect x="0" y="0" width="220" height="116" rx="14" fill={theme.surfaceRaise} />
      <line x1="110" y1="41" x2="110" y2="66" stroke={theme.border} strokeWidth="2" />
      <line x1="64" y1="66" x2="156" y2="66" stroke={theme.border} strokeWidth="2" />
      <line x1="64" y1="66" x2="64" y2="76" stroke={theme.border} strokeWidth="2" />
      <line x1="156" y1="66" x2="156" y2="76" stroke={theme.border} strokeWidth="2" />
      <rect x="70" y="18" width="80" height="30" rx="9" fill={theme.surface} stroke={accent} strokeWidth="1.5" />
      <rect x="24" y="76" width="80" height="28" rx="9" fill={theme.surface} stroke={theme.border} strokeWidth="1.5" />
      <rect x="116" y="76" width="80" height="28" rx="9" fill={theme.surface} stroke={theme.border} strokeWidth="1.5" />
      <text x="110" y="37" textAnchor="middle" fill={accent} fontSize="10" fontWeight="700">Lead AI</text>
      <text x="64" y="94" textAnchor="middle" fill={theme.textSecond} fontSize="9" fontWeight="700">Human Ops</text>
      <text x="156" y="94" textAnchor="middle" fill={theme.textSecond} fontSize="9" fontWeight="700">Agent Pod</text>
    </svg>
  );
}

// ── Org Profile View ─────────────────────────────────────────────────────────

const SAMPLE_REVIEWS = [
  { author: 'Rusty A.',       rating: 5, text: 'Exceptional quality. Their AI team handled our full legal intake pipeline in 2 weeks.', date: 'Apr 2026' },
  { author: 'Marcus T.',      rating: 5, text: 'Best human+AI org we\'ve worked with. Real accountability, fast iteration.',              date: 'Mar 2026' },
  { author: 'Priya K.',       rating: 4, text: 'Strong technical output. Communication could be tighter on async handoffs.',             date: 'Feb 2026' },
];

const LEADERSHIP_NODES = [
  { label: 'CEO',          type: 'human' },
  { label: 'Lead Agent',   type: 'ai'    },
  { label: 'Ops Lead',     type: 'human' },
  { label: 'Agent Pod',    type: 'ai'    },
];

function OrgProfileView({ org, onBack }: { org: MarketplaceOrg; onBack: () => void }) {
  const accent = teamAccent[org.team];
  return (
    <div style={{ height: '100%', overflowY: 'auto', background: theme.bg, fontFamily: "'Outfit', sans-serif" }}>
      {/* Hero */}
      <div style={{ borderBottom: `1px solid ${theme.border}`, background: theme.surface, padding: '20px 28px' }}>
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18,
          background: 'none', border: 'none', cursor: 'pointer',
          color: theme.textMuted, fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
        }}>
          ← Back to Marketplace
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: org.avatarColor, color: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, flexShrink: 0 }}>{org.initials}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: theme.textPrimary, letterSpacing: '-0.03em', margin: 0 }}>{org.name}</h1>
              {org.verified && <span style={{ fontSize: 10, fontWeight: 800, color: theme.accent, border: `1px solid ${theme.accent}`, borderRadius: 99, padding: '3px 8px', background: theme.surfaceRaise }}>Verified</span>}
              <TeamBadge team={org.team} />
            </div>
            <p style={{ fontSize: 13, color: theme.textSecond, lineHeight: 1.6, maxWidth: 640, margin: 0 }}>{org.description}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: theme.textPrimary }}>★ {org.rating.toFixed(1)} <span style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500 }}>({org.reviews} reviews)</span></div>
            <button style={{ padding: '10px 20px', borderRadius: 12, background: theme.accent, color: '#07110e', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 900, fontFamily: "'Outfit', sans-serif" }}>
              Contact Team
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) 320px', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Services */}
          <section style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: theme.textPrimary, marginBottom: 14, letterSpacing: '-0.01em' }}>Services</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {org.services.map(s => <Tag key={s} label={s} />)}
              <Tag label={org.industry} />
            </div>
          </section>

          {/* AI Workforce */}
          <section style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: theme.textPrimary, marginBottom: 14 }}>AI Workforce</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Human Ops', value: org.humans,   color: theme.textSecond },
                { label: 'AI Agents', value: org.aiAgents, color: theme.accent      },
                { label: 'Models',    value: org.models.length, color: '#8b5cf6'   },
              ].map(stat => (
                <div key={stat.label} style={{ padding: '12px 14px', borderRadius: 10, background: theme.surfaceRaise, border: `1px solid ${theme.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: 10, color: theme.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{stat.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {org.models.map(m => (
                <span key={m} style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: theme.textMuted, background: theme.surfaceRaise, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '4px 8px' }}>{m}</span>
              ))}
            </div>
          </section>

          {/* Org Chart Preview */}
          <section style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: theme.textPrimary, marginBottom: 14 }}>Organization Structure</h2>
            <OrgChartPreview accent={accent} />
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              {LEADERSHIP_NODES.map(n => (
                <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: n.type === 'human' ? '50%' : 3, background: n.type === 'ai' ? accent : theme.textMuted }} />
                  <span style={{ fontSize: 11, color: theme.textSecond, fontWeight: 600 }}>{n.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Availability */}
          <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: theme.textPrimary, marginBottom: 12 }}>Availability</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>Accepting new clients</span>
            </div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 14 }}>Response time: typically within 24h</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: theme.textPrimary, marginBottom: 4 }}>{org.pricing}</div>
            <div style={{ fontSize: 11, color: theme.textMuted }}>+ custom enterprise plans</div>
          </div>

          {/* Reviews */}
          <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 18 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: theme.textPrimary, marginBottom: 14 }}>Reviews</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {SAMPLE_REVIEWS.map((r, i) => (
                <div key={i} style={{ paddingBottom: 12, borderBottom: i < SAMPLE_REVIEWS.length - 1 ? `1px solid ${theme.border}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: theme.textSecond }}>{r.author}</span>
                    <span style={{ fontSize: 11, color: '#f59e0b' }}>{'★'.repeat(r.rating)}</span>
                  </div>
                  <p style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.5, margin: 0 }}>{r.text}</p>
                  <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 4 }}>{r.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Listing Card ──────────────────────────────────────────────────────────────

function ListingCard({ org, onSelect }: { org: MarketplaceOrg; onSelect: (o: MarketplaceOrg) => void }) {
  return (
    <HoverCard style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 374 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: org.avatarColor,
            color: '#0f0f0f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}
        >
          {org.initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ color: theme.textPrimary, fontSize: 16, fontWeight: 850, letterSpacing: '-0.02em', margin: 0 }}>{org.name}</h3>
            {org.verified && (
              <span style={{ color: theme.accent, border: `1px solid ${theme.accent}`, background: theme.surfaceRaise, borderRadius: 999, padding: '2px 7px', fontSize: 10, fontWeight: 800 }}>
                Verified
              </span>
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <TeamBadge team={org.team} />
          </div>
        </div>
      </div>

      <p style={{ color: theme.textSecond, fontSize: 13, lineHeight: 1.55, margin: 0 }}>{org.description}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        <Tag label={org.industry} />
        {org.services.map((service) => <Tag key={service} label={service} />)}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <CountPill icon="human" count={org.humans} label="humans" />
        <CountPill icon="ai" count={org.aiAgents} label="AI" />
      </div>

      <div style={{ color: theme.textMuted, fontSize: 11, lineHeight: 1.45, fontFamily: 'DM Mono, ui-monospace, SFMono-Regular, Menlo, monospace' }}>
        {org.models.join(', ')}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 'auto' }}>
        <div>
          <div style={{ color: theme.textPrimary, fontSize: 13, fontWeight: 850 }}>★ {org.rating.toFixed(1)}</div>
          <div style={{ color: theme.textMuted, fontSize: 11 }}>{org.reviews} reviews</div>
        </div>
        <span style={{ color: theme.textPrimary, background: theme.surfaceRaise, border: `1px solid ${theme.border}`, borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 850 }}>
          {org.pricing}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onSelect(org)}
        style={{
          width: '100%',
          border: 'none',
          borderRadius: 12,
          background: theme.accent,
          color: '#07110e',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 900,
          padding: '11px 14px',
          letterSpacing: '-0.01em',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        View Profile
      </button>
    </HoverCard>
  );
}

function CategoryBanner({ category }: { category: Category }) {
  return (
    <div
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderTop: `3px solid ${category.accent}`,
        borderRadius: 16,
        padding: 18,
        minHeight: 210,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
        <div>
          <h2 style={{ color: theme.textPrimary, fontSize: 17, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>{category.title}</h2>
          <p style={{ color: category.accent, fontSize: 12, fontWeight: 800, margin: '5px 0 0' }}>{category.subtitle}</p>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 12, background: theme.surfaceRaise, border: `1px solid ${category.accent}` }} />
      </div>
      <p style={{ color: theme.textSecond, fontSize: 13, lineHeight: 1.55, margin: '0 0 14px' }}>{category.description}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {category.skills.map((skill) => (
          <span key={skill} style={{ color: theme.textSecond, background: theme.surfaceRaise, border: `1px solid ${theme.border}`, borderRadius: 999, padding: '5px 8px', fontSize: 11, fontWeight: 750 }}>
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}

function FeaturedCard({ org, onSelect }: { org: MarketplaceOrg; onSelect: (o: MarketplaceOrg) => void }) {
  const accent = teamAccent[org.team];

  return (
    <HoverCard style={{ padding: 18, display: 'grid', gridTemplateColumns: 'minmax(180px, 0.8fr) minmax(0, 1fr)', gap: 18 }}>
      <OrgChartPreview accent={accent} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div>
            <div style={{ color: accent, fontSize: 11, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Featured organization</div>
            <h3 style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 900, margin: '5px 0 0', letterSpacing: '-0.02em' }}>{org.name}</h3>
          </div>
          <div style={{ color: theme.textPrimary, fontSize: 24, fontWeight: 950 }}>★ {org.rating.toFixed(1)}</div>
        </div>
        <p style={{ color: theme.textSecond, fontSize: 13, lineHeight: 1.55, margin: '0 0 12px' }}>{org.description}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {org.services.map((service) => <Tag key={service} label={service} />)}
        </div>
        <button type="button" onClick={() => onSelect(org)} style={{
          padding: '8px 14px', borderRadius: 10, background: 'none',
          border: `1px solid ${accent}`, color: accent, cursor: 'pointer',
          fontSize: 12, fontWeight: 800, fontFamily: "'Outfit', sans-serif",
        }}>
          View Profile →
        </button>
      </div>
    </HoverCard>
  );
}

export default function Marketplace() {
  const columns = useColumnMode();
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<MarketplaceOrg | null>(null);
  const [liveOrgs, setLiveOrgs] = useState<MarketplaceOrg[] | null>(null);

  useEffect(() => {
    orgsApi.list()
      .then(data => { if (Array.isArray(data) && data.length) setLiveOrgs(data); })
      .catch(() => {});
  }, []);

  const allOrgs = liveOrgs ?? organizations;

  if (selectedOrg) {
    return <OrgProfileView org={selectedOrg} onBack={() => setSelectedOrg(null)} />;
  }

  const filteredOrganizations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return allOrgs.filter((org) => {
      const matchesFilter = filter === 'All' || org.team === filter;
      const matchesSearch = normalized.length === 0 || org.name.toLowerCase().includes(normalized);
      return matchesFilter && matchesSearch;
    });
  }, [filter, query]);

  const featured = useMemo(() => allOrgs.filter((org) => org.rating >= 4.9).slice(0, 2), [allOrgs]);
  const categoryColumns = columns === 1 ? '1fr' : columns === 2 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))';
  const listingColumns = columns === 1 ? '1fr' : columns === 2 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))';
  const featuredColumns = columns === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))';

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: theme.bg, padding: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1440, margin: '0 auto' }}>
        <header style={{ display: 'grid', gridTemplateColumns: columns === 1 ? '1fr' : 'minmax(0, 1fr) minmax(320px, 420px)', gap: 18, alignItems: 'end' }}>
          <div>
            <div style={{ color: theme.accent, fontSize: 12, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Neural-Org Platform</div>
            <h1 style={{ color: theme.textPrimary, fontSize: columns === 1 ? 28 : 34, fontWeight: 950, letterSpacing: '-0.045em', margin: 0 }}>
              AI Workforce Marketplace
            </h1>
            <p style={{ color: theme.textSecond, fontSize: 14, lineHeight: 1.55, maxWidth: 680, margin: '9px 0 0' }}>
              Discover human-led AI organizations that can plug into your operating model across security, engineering, data, revenue, and executive workflows.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search organizations by name"
              aria-label="Search marketplace organizations by name"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: theme.surface,
                border: `1px solid ${searchFocused ? theme.accent : theme.border}`,
                borderRadius: 13,
                color: theme.textPrimary,
                outline: 'none',
                padding: '13px 14px',
                fontSize: 13,
                fontWeight: 650,
                boxShadow: searchFocused ? '0 0 0 3px rgba(0,230,168,0.16)' : 'none',
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {filters.map((item) => {
                const selected = filter === item;
                const accent = item === 'All' ? theme.accent : teamAccent[item];
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    style={{
                      background: selected ? theme.surfaceRaise : theme.surface,
                      border: `1px solid ${selected ? accent : theme.border}`,
                      color: selected ? accent : theme.textSecond,
                      borderRadius: 999,
                      cursor: 'pointer',
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 850,
                    }}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: categoryColumns, gap: 14 }}>
          {categories.map((category) => <CategoryBanner key={category.team} category={category} />)}
        </section>

        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14, marginBottom: 12 }}>
            <div>
              <h2 style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 900, margin: 0 }}>Marketplace Listings</h2>
              <p style={{ color: theme.textMuted, fontSize: 12, margin: '5px 0 0' }}>{filteredOrganizations.length} organizations shown</p>
            </div>
          </div>
          {filteredOrganizations.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: listingColumns, gap: 14 }}>
              {filteredOrganizations.map((org) => <ListingCard key={org.id} org={org} onSelect={setSelectedOrg} />)}
            </div>
          ) : (
            <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 28, color: theme.textMuted, textAlign: 'center', fontSize: 13 }}>
              No organizations match this search.
            </div>
          )}
        </section>

        <section style={{ paddingBottom: 8 }}>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ color: theme.textPrimary, fontSize: 18, fontWeight: 900, margin: 0 }}>Featured Organizations</h2>
            <p style={{ color: theme.textMuted, fontSize: 12, margin: '5px 0 0' }}>Top-rated teams with mature human-AI operating structures.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: featuredColumns, gap: 14 }}>
            {featured.map((org) => <FeaturedCard key={org.id} org={org} onSelect={setSelectedOrg} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
