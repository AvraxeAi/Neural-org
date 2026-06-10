import React, { useEffect, useState } from 'react';
import { metricsApi } from '../../lib/api';

type Range = '1d' | '7d' | '30d' | '90d';

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="glass-card" style={{ padding: '18px 20px', ...style }}>{children}</div>;
}
function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{children}</span>
      {action}
    </div>
  );
}

// Sparkline SVG
function Sparkline({ values, color, height = 40 }: { values: number[]; color: string; height?: number }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 200, h = height;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 6) - 3}`).join(' ');
  const area = `0,${h} ` + pts + ` ${w},${h}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace('#','')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 100 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: '100%', background: color, borderRadius: '6px 6px 0 0', height: `${(d.value / max) * 72}px`, opacity: i === data.length - 1 ? 1 : 0.45, transition: 'height 0.6s', boxShadow: i === data.length - 1 ? `0 4px 12px ${color}40` : 'none' }} />
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

const RANGE_DATA: Record<Range, {
  kpis: { label: string; val: string; delta: string; good: boolean; color: string; spark: number[] }[];
  agentCosts: { name: string; cost: number; tokens: number; sessions: number; color: string; icon: string }[];
  channelTokens: { name: string; pct: number; color: string }[];
  dailyCosts: { label: string; value: number }[];
  insights: string[];
}> = {
  '1d': {
    kpis: [
      { label: 'Total Tokens',   val: '162k',   delta: '↑ 8%',  good: true,  color: '#00E6A8', spark: [12,18,14,22,16,20,24,21,19,25,22,28] },
      { label: 'Total Cost',     val: '$0.34',  delta: '↓ 12%', good: true,  color: '#3B82F6', spark: [0.04,0.06,0.03,0.07,0.04,0.05,0.06,0.04,0.03,0.05,0.04,0.06] },
      { label: 'Avg Latency',    val: '4ms',    delta: '↓ 1ms', good: true,  color: '#8B5CF6', spark: [5,4,6,4,5,3,4,5,4,3,4,4] },
      { label: 'Sessions',       val: '6',      delta: '=',     good: true,  color: '#F59E0B', spark: [1,0,1,1,0,1,0,1,0,1,1,0] },
      { label: 'Efficiency',     val: '92%',    delta: '↑ 2%',  good: true,  color: '#00E6A8', spark: [88,90,89,91,90,92,91,93,92,91,92,92] },
      { label: 'Agent Uptime',   val: '99.9%',  delta: 'p99',   good: true,  color: '#3B82F6', spark: [100,100,100,99,100,100,100,100,100,100,100,100] },
    ],
    agentCosts: [
      { name: 'Orchestrator', cost: 0.21, tokens: 48200,  sessions: 3, color: '#00E6A8', icon: '◎' },
      { name: 'DataAgent',    cost: 0.09, tokens: 91700,  sessions: 2, color: '#8B5CF6', icon: '◳' },
      { name: 'LawAssist',    cost: 0.04, tokens: 12400,  sessions: 1, color: '#3B82F6', icon: '⚖' },
    ],
    channelTokens: [
      { name: 'Discord',  pct: 45, color: '#5865F2' },
      { name: 'Telegram', pct: 30, color: '#2AABEE' },
      { name: 'Slack',    pct: 25, color: '#4A154B' },
    ],
    dailyCosts: [{ label: '12am', value: 0.02 },{ label: '3am', value: 0.01 },{ label: '6am', value: 0.03 },{ label: '9am', value: 0.08 },{ label: '12pm', value: 0.06 },{ label: '3pm', value: 0.09 },{ label: '6pm', value: 0.05 }],
    insights: [
      'DataAgent consumed 57% of tokens but only 26% of cost — DeepSeek R1 is extremely cost-efficient for heavy workloads.',
      'Peak usage is between 9am–3pm CST. Consider scheduling heavy cron jobs overnight to reduce latency contention.',
      'No errors in the last 24 hours. System health is excellent.',
    ],
  },
  '7d': {
    kpis: [
      { label: 'Total Tokens',   val: '2.1M',   delta: '↑ 14%', good: true,  color: '#00E6A8', spark: [240,310,280,420,390,350,410] },
      { label: 'Total Cost',     val: '$2.18',  delta: '↓ 8%',  good: true,  color: '#3B82F6', spark: [0.42,0.31,0.55,0.29,0.38,0.18,0.34] },
      { label: 'Avg Latency',    val: '4ms',    delta: '↓ 2ms', good: true,  color: '#8B5CF6', spark: [6,5,7,4,5,4,4] },
      { label: 'Sessions',       val: '41',     delta: '↑ 6',   good: true,  color: '#F59E0B', spark: [5,8,4,7,6,5,6] },
      { label: 'Efficiency',     val: '91%',    delta: '↑ 3%',  good: true,  color: '#00E6A8', spark: [87,89,88,91,90,92,91] },
      { label: 'Agent Uptime',   val: '99.8%',  delta: 'p99',   good: true,  color: '#3B82F6', spark: [100,100,99,100,100,100,100] },
    ],
    agentCosts: [
      { name: 'Orchestrator', cost: 1.47, tokens: 320000, sessions: 21, color: '#00E6A8', icon: '◎' },
      { name: 'DataAgent',    cost: 0.63, tokens: 640000, sessions: 14, color: '#8B5CF6', icon: '◳' },
      { name: 'LawAssist',    cost: 0.28, tokens: 86000,  sessions: 6,  color: '#3B82F6', icon: '⚖' },
    ],
    channelTokens: [
      { name: 'Discord',  pct: 42, color: '#5865F2' },
      { name: 'Telegram', pct: 33, color: '#2AABEE' },
      { name: 'Slack',    pct: 25, color: '#4A154B' },
    ],
    dailyCosts: [{ label: 'Mon', value: 0.42 },{ label: 'Tue', value: 0.31 },{ label: 'Wed', value: 0.55 },{ label: 'Thu', value: 0.29 },{ label: 'Fri', value: 0.38 },{ label: 'Sat', value: 0.18 },{ label: 'Today', value: 0.34 }],
    insights: [
      'Weekly cost is down 8% from last week. Tiered model routing is working — cheap tasks are hitting DeepSeek, not Claude.',
      'Wednesday spike ($0.55) correlates with the legal intake pipeline deployment. Expected, not a concern.',
      'LawAssist has the lowest cost-per-token ratio. Consider routing more tasks through it for legal domain work.',
    ],
  },
  '30d': {
    kpis: [
      { label: 'Total Tokens',   val: '9.4M',   delta: '↑ 22%', good: true, color: '#00E6A8', spark: [200,240,180,320,290,340,260,410,380,350,420,390,440,410,460,440,480,510,490,520,540,560,580,600,580,620,640,660,680,640] },
      { label: 'Total Cost',     val: '$8.42',  delta: '↑ 12%', good: false, color: '#3B82F6', spark: [0.3,0.4,0.2,0.5,0.4,0.6,0.3,0.7,0.5,0.4,0.6,0.5,0.7,0.6,0.8,0.7,0.6,0.8,0.7,0.9,0.8,0.7,0.8,0.9,0.8,0.9,1.0,0.9,0.8,0.34] },
      { label: 'Avg Latency',    val: '5ms',    delta: '↑ 1ms', good: false, color: '#8B5CF6', spark: [5,6,5,7,6,5,4,5,6,5,4,5,6,5,4,5,6,5,4,5,5,4,5,6,5,4,5,4,5,4] },
      { label: 'Sessions',       val: '187',    delta: '↑ 34',  good: true,  color: '#F59E0B', spark: [5,6,4,7,8,6,5,7,6,8,7,6,8,7,9,8,6,8,7,9,8,7,9,8,7,8,9,8,7,6] },
      { label: 'Efficiency',     val: '90%',    delta: '↑ 1%',  good: true,  color: '#00E6A8', spark: [88,89,87,90,89,88,90,91,89,90,91,90,89,91,90,89,91,90,89,91,90,91,90,91,92,91,90,91,92,91] },
      { label: 'Agent Uptime',   val: '99.7%',  delta: 'p99',   good: true,  color: '#3B82F6', spark: [100,100,100,99,100,100,100,100,100,99,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100] },
    ],
    agentCosts: [
      { name: 'Orchestrator', cost: 5.62, tokens: 1400000, sessions: 94,  color: '#00E6A8', icon: '◎' },
      { name: 'DataAgent',    cost: 2.40, tokens: 2800000, sessions: 62,  color: '#8B5CF6', icon: '◳' },
      { name: 'LawAssist',    cost: 1.18, tokens: 380000,  sessions: 31,  color: '#3B82F6', icon: '⚖' },
    ],
    channelTokens: [
      { name: 'Discord',  pct: 40, color: '#5865F2' },
      { name: 'Telegram', pct: 35, color: '#2AABEE' },
      { name: 'Slack',    pct: 25, color: '#4A154B' },
    ],
    dailyCosts: [{ label: 'W1', value: 1.82 },{ label: 'W2', value: 2.14 },{ label: 'W3', value: 2.42 },{ label: 'W4', value: 2.04 }],
    insights: [
      'Monthly cost up 12% — growth is healthy but watch DataAgent token burn. 30% of its tasks could route to the free DeepSeek tier.',
      'Sessions increased 34 vs last month. LawAssist activation is driving new usage patterns.',
      'Recommend increasing monthly budget cap from $150 to $200 to account for beta attorney onboarding coming in May.',
    ],
  },
  '90d': {
    kpis: [
      { label: 'Total Tokens',   val: '24.1M',  delta: '↑ 41%', good: true, color: '#00E6A8', spark: [100,120,140,160,200,180,220,240,260,300,280,320] },
      { label: 'Total Cost',     val: '$21.40', delta: '↑ 28%', good: false, color: '#3B82F6', spark: [1.2,1.8,2.1,2.4,3.0,2.6,3.2,3.6,4.0,4.8,4.2,5.6] },
      { label: 'Avg Latency',    val: '5ms',    delta: '↓ 3ms', good: true, color: '#8B5CF6', spark: [9,8,7,7,6,6,6,5,5,5,4,5] },
      { label: 'Sessions',       val: '504',    delta: '↑ 180', good: true, color: '#F59E0B', spark: [20,30,40,45,55,60,65,70,80,90,85,90] },
      { label: 'Efficiency',     val: '90%',    delta: '↑ 8%',  good: true, color: '#00E6A8', spark: [80,82,84,85,86,87,88,89,89,90,91,90] },
      { label: 'Agent Uptime',   val: '99.6%',  delta: 'p99',   good: true, color: '#3B82F6', spark: [99,100,99,100,100,99,100,100,99,100,100,100] },
    ],
    agentCosts: [
      { name: 'Orchestrator', cost: 14.20, tokens: 3500000, sessions: 254, color: '#00E6A8', icon: '◎' },
      { name: 'DataAgent',    cost: 6.10,  tokens: 7200000, sessions: 160, color: '#8B5CF6', icon: '◳' },
      { name: 'LawAssist',    cost: 3.40,  tokens: 980000,  sessions: 90,  color: '#3B82F6', icon: '⚖' },
    ],
    channelTokens: [
      { name: 'Discord',  pct: 38, color: '#5865F2' },
      { name: 'Telegram', pct: 37, color: '#2AABEE' },
      { name: 'Slack',    pct: 25, color: '#4A154B' },
    ],
    dailyCosts: [{ label: 'Month 1', value: 5.20 },{ label: 'Month 2', value: 7.80 },{ label: 'Month 3', value: 8.40 }],
    insights: [
      'System efficiency has improved from 82% to 90% over 90 days — model routing optimizations are paying off significantly.',
      'Token volume grew 41% but cost only grew 28%, meaning cost-per-token has dropped. Excellent trajectory.',
      'LawAssist is your highest ROI agent by far. Each $1 spent on it generates 3× the business value of DataAgent tasks.',
    ],
  },
};

export function MetricsEnhanced() {
  const [range, setRange] = useState<Range>('7d');
  const [liveMetrics, setLiveMetrics] = useState<any>(null);
  const data = RANGE_DATA[range];
  const agentCosts: { name: string; cost: number; tokens: number; sessions: number; color: string; icon: string }[] = range === '1d' && liveMetrics
    ? (liveMetrics.byAgent || []).map((a: any) => ({ name: a.name, cost: a.cost, tokens: a.tokens, sessions: 0, color: '#00E6A8', icon: '◎' }))
    : data.agentCosts;
  const totalCost = agentCosts.reduce((a, b) => a + b.cost, 0);

  useEffect(() => {
    metricsApi.get()
      .then(setLiveMetrics)
      .catch(error => {
        console.error('Failed to load metrics', error);
        setLiveMetrics(null);
      });
  }, []);

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header + range picker */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>Metrics & Analytics</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Performance, cost, and AI efficiency tracking</p>
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          {(['1d','7d','30d','90d'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: range === r ? 'var(--surface-hover)' : 'transparent', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: range === r ? 700 : 500, color: range === r ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s', boxShadow: 'none' }}>{r}</button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}>
        {data.kpis.map(k => (
          <div key={k.label} className="glass-card animate-fade-up" style={{ padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${k.color},transparent)`, borderRadius: '16px 16px 0 0' }} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>{k.val}</div>
            <Sparkline values={k.spark} color={k.color} height={28} />
            <div style={{ fontSize: 10, fontWeight: 600, color: k.good ? 'var(--status-green)' : 'var(--status-red)', marginTop: 4 }}>{k.delta}</div>
          </div>
        ))}
      </div>

      {/* Main charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Cost trend */}
        <GlassCard>
          <SectionTitle>Cost Over Time</SectionTitle>
          <BarChart data={data.dailyCosts} color="#00E6A8" />
        </GlassCard>

        {/* Channel breakdown */}
        <GlassCard>
          <SectionTitle>Token Usage by Channel</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {data.channelTokens.map(c => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{c.pct}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 99 }}>
                  <div style={{ height: '100%', width: `${c.pct}%`, background: c.color, borderRadius: 99, transition: 'width 0.8s' }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Per-agent analytics */}
      <GlassCard>
        <SectionTitle action={liveMetrics ? <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--status-green)' }}>● Live</span> : undefined}>Agent Performance ({range})</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: 12, padding: '8px 12px', background: 'var(--border)', borderRadius: '8px 8px 0 0' }}>
            {['Agent','Sessions','Tokens','Cost','Cost / 1k tokens'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</span>
            ))}
          </div>
          {agentCosts.map((a, i) => {
            const costPer1k = a.tokens ? ((a.cost / a.tokens) * 1000).toFixed(4) : '0.0000';
            return (
              <div key={a.name} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: 12, padding: '12px', borderBottom: i < agentCosts.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', transition: 'background 0.12s', cursor: 'default' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${a.color}18`, border: `1.5px solid ${a.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: a.color }}>{a.icon}</div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{a.name}</span>
                </div>
                <span style={{ fontSize: 13, fontFamily: 'DM Mono,monospace' }}>{a.sessions}</span>
                <span style={{ fontSize: 13, fontFamily: 'DM Mono,monospace' }}>{a.tokens >= 1000000 ? `${(a.tokens/1000000).toFixed(1)}M` : `${(a.tokens/1000).toFixed(0)}k`}</span>
                <span style={{ fontSize: 13, fontFamily: 'DM Mono,monospace', fontWeight: 700, color: 'var(--text-primary)' }}>${a.cost.toFixed(2)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontFamily: 'DM Mono,monospace', color: 'var(--text-muted)' }}>${costPer1k}</span>
                  <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${totalCost ? (a.cost / totalCost) * 100 : 0}%`, background: a.color, borderRadius: 99 }} />
                  </div>
                </div>
              </div>
            );
          })}
          {/* Totals row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: 12, padding: '10px 12px', background: 'var(--border)', borderRadius: '0 0 8px 8px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL</span>
            <span style={{ fontSize: 12, fontFamily: 'DM Mono,monospace', fontWeight: 700 }}>{agentCosts.reduce((a,b) => a+b.sessions,0)}</span>
            <span style={{ fontSize: 12, fontFamily: 'DM Mono,monospace', fontWeight: 700 }}>
              {(() => { const t = agentCosts.reduce((a,b) => a+b.tokens,0); return t >= 1000000 ? `${(t/1000000).toFixed(1)}M` : `${(t/1000).toFixed(0)}k`; })()}
            </span>
            <span style={{ fontSize: 12, fontFamily: 'DM Mono,monospace', fontWeight: 700, color: 'var(--accent-dark)' }}>${totalCost.toFixed(2)}</span>
            <span />
          </div>
        </div>
      </GlassCard>

      {/* AI Insights */}
      <GlassCard style={{ background: 'linear-gradient(135deg,rgba(0,230,168,0.06),rgba(59,130,246,0.04))', borderColor: 'rgba(0,230,168,0.2)' }}>
        <SectionTitle>◎ AI Insights</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.insights.map((insight, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--accent-soft)', border: '1px solid rgba(0,230,168,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent-dark)', flexShrink: 0, marginTop: 1 }}>{i+1}</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{insight}</p>
            </div>
          ))}
        </div>
      </GlassCard>

    </div>
  );
}
