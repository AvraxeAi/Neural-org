import React, { useState, useEffect } from 'react';
import { agentsApi } from '../../lib/api';
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Bot, Brain,
  Calendar, CheckCircle2, ChevronDown, ChevronRight, Circle, Clock,
  Code2, Cpu, Download, ExternalLink, Filter, Github,
  Globe, Lock, LockOpen, Package, Plug, Plus, Search, Shield,
  ShieldAlert, ShieldCheck, Sliders, Star, Terminal,
  TrendingUp, Upload, Users, Zap, XCircle, RefreshCw,
} from 'lucide-react';

type AgentTab = 'overview' | 'dashboard' | 'skills' | 'plugins' | 'memory' | 'tools' | 'permissions' | 'activity' | 'marketplace';
type SkillSource = 'all' | 'clawhub' | 'github' | 'hermes' | 'codex' | 'claude-code' | 'custom';

const TABS: { id: AgentTab; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'overview',     label: 'Overview',         icon: BarChart3 },
  { id: 'dashboard',   label: 'Agent Dashboard',   icon: Bot },
  { id: 'skills',      label: 'Skills',            icon: Zap },
  { id: 'plugins',     label: 'Plugins',           icon: Plug },
  { id: 'memory',      label: 'Memory',            icon: Brain },
  { id: 'tools',       label: 'Tools',             icon: Terminal },
  { id: 'permissions', label: 'Permissions',       icon: Lock },
  { id: 'activity',    label: 'Activity',          icon: Activity },
  { id: 'marketplace', label: 'Marketplace',       icon: Globe },
];

interface AgentData {
  id: string; name: string; initial: string; color: string;
  model: string; provider: string; role: string;
  status: 'online' | 'busy' | 'offline';
  tokenUsage: number; cost: number; tasksCompleted: number;
  successRate: number; failureRate: number; latency: number;
  toolCalls: number; memoryQualityScore: number;
  installedSkills: string[]; activeWorkflows: string[];
  recentActivity: { text: string; time: string; ok: boolean }[];
  auditStatus: 'clean' | 'flagged' | 'reviewing';
  trustScore: number; securityFlags: string[];
  description: string; contextPct: number;
  url?: string; dashboardUrl?: string;
}

interface SkillData {
  id: string; name: string; source: SkillSource;
  compatibility: string[]; version: string; installed: boolean;
  permissionsRequired: string[]; lastUpdated: string;
  assignedAgents: string[]; description: string; category: string;
}

const AGENTS: AgentData[] = [
  {
    id: 'cash', name: 'Cash', initial: 'C', color: '#10b981',
    model: 'claude-sonnet-4-6', provider: 'Anthropic', role: 'COO / Operations Lead',
    status: 'online', tokenUsage: 284600, cost: 4.27, tasksCompleted: 1842,
    successRate: 97.4, failureRate: 2.6, latency: 980, toolCalls: 6240,
    memoryQualityScore: 96, installedSkills: ['Code Review', 'Orchestration', 'Web Research', 'Memory Compaction'],
    activeWorkflows: ['Dev Pipeline', 'Daily Standup', 'Build Monitor'],
    recentActivity: [
      { text: 'Deployed OpenClaw HQ build to proxy', time: '3m ago', ok: true },
      { text: 'Pruned 16GB Docker storage', time: '12m ago', ok: true },
      { text: 'Rebuild Freida on latest image', time: '28m ago', ok: true },
    ],
    auditStatus: 'clean', trustScore: 99, securityFlags: [],
    description: 'Primary operations and development agent. Manages deployments, code reviews, and infrastructure tasks.',
    contextPct: 41,
    url: 'https://cash.srv1427612.hstgr.cloud',
  },
  {
    id: 'lisa', name: 'Lisa', initial: 'L', color: '#8b5cf6',
    model: 'claude-sonnet-4-6', provider: 'Anthropic', role: 'CMO / Strategic Agent',
    status: 'online', tokenUsage: 142800, cost: 2.14, tasksCompleted: 847,
    successRate: 96.2, failureRate: 3.8, latency: 1240, toolCalls: 2341,
    memoryQualityScore: 94, installedSkills: ['Writing', 'Research', 'Strategy', 'Analysis'],
    activeWorkflows: ['Content Pipeline', 'Weekly Briefing'],
    recentActivity: [
      { text: 'Generated Q2 strategy report', time: '2m ago', ok: true },
      { text: 'Updated org knowledge graph', time: '14m ago', ok: true },
      { text: 'Tool call exceeded latency SLA', time: '1h ago', ok: false },
    ],
    auditStatus: 'clean', trustScore: 97, securityFlags: [],
    description: 'Strategic communications and marketing intelligence agent. Owns content pipeline and brand voice.',
    contextPct: 38,
    url: 'https://hermes.srv1427612.hstgr.cloud',
    dashboardUrl: 'https://hermes-dash.srv1427612.hstgr.cloud',
  },
  {
    id: 'hughes', name: 'Hughes', initial: 'H', color: '#3b82f6',
    model: 'claude-sonnet-4-6', provider: 'Anthropic', role: 'Research Orchestrator',
    status: 'online', tokenUsage: 196300, cost: 2.94, tasksCompleted: 1031,
    successRate: 94.8, failureRate: 5.2, latency: 1580, toolCalls: 4210,
    memoryQualityScore: 91, installedSkills: ['Web Research', 'Summarization', 'Fact-check', 'Citations'],
    activeWorkflows: ['Market Analysis', 'Competitive Intel'],
    recentActivity: [
      { text: 'Completed competitor pricing sweep', time: '5m ago', ok: true },
      { text: 'Synthesized 42 sources for brief', time: '32m ago', ok: true },
      { text: 'Retrieved stale memory chunk', time: '2h ago', ok: false },
    ],
    auditStatus: 'clean', trustScore: 93, securityFlags: [],
    description: 'Deep research and synthesis. Specialized in multi-source aggregation and structured intelligence reports.',
    contextPct: 55,
    url: 'https://hughes.srv1427612.hstgr.cloud',
  },
  {
    id: 'freida', name: 'Freida', initial: 'F', color: '#f59e0b',
    model: 'claude-sonnet-4-6', provider: 'Anthropic', role: 'Support & Comms Agent',
    status: 'busy', tokenUsage: 87200, cost: 0.43, tasksCompleted: 2814,
    successRate: 98.1, failureRate: 1.9, latency: 480, toolCalls: 8120,
    memoryQualityScore: 78, installedSkills: ['Triage', 'Routing', 'FAQ', 'Escalation'],
    activeWorkflows: ['Support Queue', 'Ticket Routing'],
    recentActivity: [
      { text: 'Routed 8 tickets to correct queues', time: '1m ago', ok: true },
      { text: 'Resolved FAQ: billing cycle question', time: '4m ago', ok: true },
      { text: 'Escalated high-priority incident', time: '18m ago', ok: true },
    ],
    auditStatus: 'clean', trustScore: 99, securityFlags: [],
    description: 'High-throughput support triage and routing. Handles first-response with 98%+ CSAT.',
    contextPct: 22,
    url: 'https://freida.srv1427612.hstgr.cloud',
  },
  {
    id: 'titan', name: 'Titan', initial: 'T', color: '#ef4444',
    model: 'claude-sonnet-4-6', provider: 'Anthropic', role: 'Security & Compliance',
    status: 'online', tokenUsage: 54100, cost: 0.97, tasksCompleted: 392,
    successRate: 91.4, failureRate: 8.6, latency: 1820, toolCalls: 1047,
    memoryQualityScore: 85, installedSkills: ['Threat Detection', 'Log Analysis', 'Alerting'],
    activeWorkflows: ['Threat Monitoring', 'Anomaly Detection'],
    recentActivity: [
      { text: 'Flagged unusual API call pattern', time: '9m ago', ok: true },
      { text: 'False positive: internal scan', time: '41m ago', ok: false },
      { text: 'Security digest generated', time: '3h ago', ok: true },
    ],
    auditStatus: 'reviewing', trustScore: 87, securityFlags: ['Elevated privilege scope'],
    description: 'Security monitoring and compliance enforcement across all platform layers.',
    contextPct: 19,
    url: 'https://titan.srv1427612.hstgr.cloud',
  },
];

const SKILLS_DATA: SkillData[] = [
  { id: 'sk1', name: 'Web Research', source: 'clawhub', compatibility: ['claude-sonnet-4-6', 'gpt-4o'], version: '2.3.1', installed: true, permissionsRequired: ['internet', 'cache'], lastUpdated: '2026-06-01', assignedAgents: ['Lisa', 'Hermes'], description: 'Structured web browsing and research compilation', category: 'Research' },
  { id: 'sk2', name: 'Summarization Pro', source: 'clawhub', compatibility: ['All models'], version: '1.8.0', installed: true, permissionsRequired: ['memory:read'], lastUpdated: '2026-05-28', assignedAgents: ['Hermes', 'Freida'], description: 'Multi-source document summarization with citations', category: 'Research' },
  { id: 'sk3', name: 'SQL Executor', source: 'github', compatibility: ['gpt-4o', 'gemini-2.5-pro'], version: '3.1.2', installed: true, permissionsRequired: ['database:read', 'tools:execute'], lastUpdated: '2026-05-15', assignedAgents: ['Nexus'], description: 'Safe read-only SQL query execution against warehouse', category: 'Data' },
  { id: 'sk4', name: 'Threat Detection', source: 'hermes', compatibility: ['claude-opus-4-8', 'gpt-4o'], version: '1.2.0', installed: true, permissionsRequired: ['logs:read', 'alerts:write'], lastUpdated: '2026-06-05', assignedAgents: ['Sentinel'], description: 'Pattern-based threat detection across system logs', category: 'Security' },
  { id: 'sk5', name: 'Code Review', source: 'claude-code', compatibility: ['claude-sonnet-4-6', 'claude-opus-4-8'], version: '4.1.0', installed: true, permissionsRequired: ['files:read'], lastUpdated: '2026-06-07', assignedAgents: ['Hermes'], description: 'Automated code review with security and quality checks', category: 'Dev' },
  { id: 'sk6', name: 'Memory Compaction', source: 'codex', compatibility: ['All models'], version: '2.0.3', installed: true, permissionsRequired: ['memory:read', 'memory:write'], lastUpdated: '2026-05-20', assignedAgents: ['Lisa', 'Hermes', 'Freida'], description: 'Compress and index agent memory vaults', category: 'Memory' },
  { id: 'sk7', name: 'Chart Generator', source: 'github', compatibility: ['gemini-2.5-pro', 'gpt-4o'], version: '1.4.1', installed: false, permissionsRequired: ['files:write', 'tools:execute'], lastUpdated: '2026-05-10', assignedAgents: [], description: 'Auto-generate charts from structured data', category: 'Data' },
  { id: 'sk8', name: 'Legal Drafting', source: 'custom', compatibility: ['claude-opus-4-8'], version: '0.9.2', installed: false, permissionsRequired: ['files:read', 'files:write'], lastUpdated: '2026-04-30', assignedAgents: [], description: 'Custom in-house legal document drafting skill', category: 'Writing' },
  { id: 'sk9', name: 'Ticket Router', source: 'clawhub', compatibility: ['claude-haiku-4-5', 'gpt-4o-mini'], version: '3.7.0', installed: true, permissionsRequired: ['tasks:write', 'notifications:write'], lastUpdated: '2026-06-04', assignedAgents: ['Freida'], description: 'Intelligent ticket classification and routing', category: 'Support' },
  { id: 'sk10', name: 'Fact Checker', source: 'claude-code', compatibility: ['claude-sonnet-4-6', 'claude-opus-4-8'], version: '2.2.0', installed: false, permissionsRequired: ['internet', 'memory:read'], lastUpdated: '2026-06-06', assignedAgents: [], description: 'Cross-reference claims against verified sources', category: 'Research' },
  { id: 'sk11', name: 'Anomaly Detector', source: 'hermes', compatibility: ['All models'], version: '1.6.4', installed: true, permissionsRequired: ['metrics:read', 'alerts:write'], lastUpdated: '2026-06-03', assignedAgents: ['Sentinel'], description: 'Statistical anomaly detection across time-series data', category: 'Security' },
  { id: 'sk12', name: 'Brand Voice', source: 'custom', compatibility: ['claude-sonnet-4-6', 'claude-opus-4-8'], version: '1.1.0', installed: true, permissionsRequired: ['files:read'], lastUpdated: '2026-05-25', assignedAgents: ['Lisa'], description: 'Enforces brand tone and style across all outputs', category: 'Writing' },
];

const PLUGINS_DATA: SkillData[] = [
  { id: 'pl1', name: 'Slack Connector', source: 'clawhub', compatibility: ['All models'], version: '5.2.0', installed: true, permissionsRequired: ['messages:write', 'channels:read'], lastUpdated: '2026-06-05', assignedAgents: ['Lisa', 'Freida'], description: 'Post messages and read channels from Slack', category: 'Comms' },
  { id: 'pl2', name: 'GitHub Integration', source: 'github', compatibility: ['claude-sonnet-4-6', 'gpt-4o'], version: '3.4.1', installed: true, permissionsRequired: ['repos:read', 'issues:write'], lastUpdated: '2026-06-01', assignedAgents: ['Hermes'], description: 'Read repos, manage issues, trigger workflows', category: 'Dev' },
  { id: 'pl3', name: 'Jira Sync', source: 'hermes', compatibility: ['All models'], version: '2.1.0', installed: false, permissionsRequired: ['projects:write', 'tickets:write'], lastUpdated: '2026-05-18', assignedAgents: [], description: 'Sync tasks and tickets with Jira projects', category: 'PM' },
  { id: 'pl4', name: 'Figma Reader', source: 'codex', compatibility: ['claude-opus-4-8', 'gpt-4o'], version: '1.0.3', installed: false, permissionsRequired: ['files:read'], lastUpdated: '2026-05-30', assignedAgents: [], description: 'Read and describe Figma design files', category: 'Design' },
  { id: 'pl5', name: 'Linear Tracker', source: 'clawhub', compatibility: ['All models'], version: '2.8.0', installed: true, permissionsRequired: ['issues:read', 'issues:write'], lastUpdated: '2026-06-06', assignedAgents: ['Lisa', 'Hermes'], description: 'Create and manage Linear issues from agent context', category: 'PM' },
  { id: 'pl6', name: 'PDF Parser', source: 'claude-code', compatibility: ['All models'], version: '3.0.1', installed: true, permissionsRequired: ['files:read'], lastUpdated: '2026-06-07', assignedAgents: ['Hermes', 'Freida', 'Nexus'], description: 'Extract structured content from PDF documents', category: 'Docs' },
  { id: 'pl7', name: 'Email Sender', source: 'custom', compatibility: ['claude-sonnet-4-6', 'gpt-4o'], version: '0.8.1', installed: false, permissionsRequired: ['email:send'], lastUpdated: '2026-05-12', assignedAgents: [], description: 'Compose and send emails via connected mailbox', category: 'Comms' },
  { id: 'pl8', name: 'Calendar Bridge', source: 'hermes', compatibility: ['All models'], version: '1.5.2', installed: true, permissionsRequired: ['calendar:read', 'calendar:write'], lastUpdated: '2026-05-29', assignedAgents: ['Lisa'], description: 'Read and create calendar events across providers', category: 'Comms' },
];

const ACTIVITY_LOG = [
  { agent: 'Lisa', action: 'Generated Q2 marketing strategy', outcome: 'success', time: '2m ago', tool: 'Writing' },
  { agent: 'Hermes', action: 'Web search: competitor pricing', outcome: 'success', time: '5m ago', tool: 'Web Research' },
  { agent: 'Freida', action: 'Routed 8 support tickets', outcome: 'success', time: '7m ago', tool: 'Ticket Router' },
  { agent: 'Sentinel', action: 'Flagged unusual API pattern', outcome: 'alert', time: '9m ago', tool: 'Threat Detection' },
  { agent: 'Lisa', action: 'Updated org knowledge graph', outcome: 'success', time: '14m ago', tool: 'Memory Compaction' },
  { agent: 'Hermes', action: 'Synthesized 42 sources for brief', outcome: 'success', time: '32m ago', tool: 'Summarization Pro' },
  { agent: 'Freida', action: 'Resolved FAQ: billing cycle', outcome: 'success', time: '35m ago', tool: 'Ticket Router' },
  { agent: 'Sentinel', action: 'False positive: internal scan', outcome: 'failure', time: '41m ago', tool: 'Anomaly Detector' },
  { agent: 'Nexus', action: 'Revenue forecast v3 delivered', outcome: 'success', time: '4h ago', tool: 'Chart Generator' },
  { agent: 'Hermes', action: 'Retrieved stale memory chunk', outcome: 'failure', time: '2h ago', tool: 'Memory Compaction' },
  { agent: 'Lisa', action: 'Tool call exceeded latency SLA', outcome: 'failure', time: '1h ago', tool: 'Web Research' },
  { agent: 'Nexus', action: 'Offline — scheduled maintenance', outcome: 'system', time: '2h ago', tool: 'System' },
];

const MARKETPLACE_ITEMS = [
  { id: 'm1', name: 'AutoDoc', source: 'clawhub', type: 'skill', description: 'Auto-generate documentation from code and comments', rating: 4.8, downloads: 2400, installed: false, category: 'Dev', new: true },
  { id: 'm2', name: 'Vision Analyzer', source: 'claude-code', type: 'skill', description: 'Image and screenshot analysis with structured output', rating: 4.9, downloads: 5100, installed: false, category: 'Vision', new: true },
  { id: 'm3', name: 'Notion Sync', source: 'hermes', type: 'plugin', description: 'Two-way sync with Notion databases and pages', rating: 4.6, downloads: 3200, installed: false, category: 'Docs', new: false },
  { id: 'm4', name: 'Sentiment Tracker', source: 'codex', type: 'skill', description: 'Real-time sentiment analysis across communication channels', rating: 4.4, downloads: 1800, installed: false, category: 'Analysis', new: false },
  { id: 'm5', name: 'Audio Transcription', source: 'clawhub', type: 'plugin', description: 'Transcribe and summarize audio recordings', rating: 4.7, downloads: 4300, installed: false, category: 'Media', new: false },
  { id: 'm6', name: 'Risk Scorer', source: 'hermes', type: 'skill', description: 'Assess and score risks across workflows and decisions', rating: 4.3, downloads: 980, installed: false, category: 'Security', new: true },
];

export default function Agents() {
  const [activeTab, setActiveTab] = useState<AgentTab>('overview');
  const [liveStatuses, setLiveStatuses] = useState<Record<string, 'online' | 'busy' | 'offline'>>({});
  const [showNewAgent, setShowNewAgent] = useState(false);

  useEffect(() => {
    agentsApi.list().then((data: any) => {
      const entries: any[] = Array.isArray(data) ? data : Object.values(data);
      const map: Record<string, 'online' | 'busy' | 'offline'> = {};
      entries.forEach((a: any) => {
        const key = (a.id || '').replace('agent-', '');
        map[key] = a.status === 'online' ? 'online' : a.status === 'busy' ? 'busy' : 'offline';
      });
      setLiveStatuses(map);
    }).catch(() => {});
  }, []);

  const agentsWithLiveStatus = AGENTS.map(a => ({
    ...a,
    status: (liveStatuses[a.id] ?? a.status) as 'online' | 'busy' | 'offline',
  }));

  return (
    <div className="phase-page" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
      {showNewAgent && <NewAgentModal onClose={() => setShowNewAgent(false)} />}
      <div style={{ padding: '0 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-sub)' }}>
        <div className="page-heading" style={{ minHeight: 56 }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700 }}>Agents</h1>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              {agentsWithLiveStatus.filter(a => a.status !== 'offline').length} active · {agentsWithLiveStatus.length} total · manage models, skills, plugins, and autonomy
            </p>
          </div>
          <button onClick={() => setShowNewAgent(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 32, padding: '0 12px', background: 'var(--accent)', border: 'none', borderRadius: 7, color: '#041f14', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={14} /> New Agent
          </button>
        </div>

        <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 12px', border: 'none',
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  background: isActive ? 'rgba(16,185,129,0.06)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 11, fontWeight: isActive ? 600 : 400,
                  borderRadius: '6px 6px 0 0', whiteSpace: 'nowrap',
                }}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 20 }}>
        {activeTab === 'overview'     && <OverviewTab />}
        {activeTab === 'dashboard'   && <AgentDashboardTab />}
        {activeTab === 'skills'      && <SkillsPluginsTab items={SKILLS_DATA} type="skill" />}
        {activeTab === 'plugins'     && <SkillsPluginsTab items={PLUGINS_DATA} type="plugin" />}
        {activeTab === 'memory'      && <MemoryTab />}
        {activeTab === 'tools'       && <ToolsTab />}
        {activeTab === 'permissions' && <PermissionsTab />}
        {activeTab === 'activity'    && <ActivityTab />}
        {activeTab === 'marketplace' && <MarketplaceTab />}
      </div>
    </div>
  );
}

function OverviewTab() {
  const online = AGENTS.filter(a => a.status === 'online').length;
  const busy   = AGENTS.filter(a => a.status === 'busy').length;
  const totalCost = AGENTS.reduce((s, a) => s + a.cost, 0);
  const avgSuccess = (AGENTS.reduce((s, a) => s + a.successRate, 0) / AGENTS.length).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        <MCard label="Total Agents" value={AGENTS.length} sub={`${online} online · ${busy} busy`} color="var(--accent)" icon={Bot} />
        <MCard label="Avg Success Rate" value={`${avgSuccess}%`} sub="Across all active agents" color="#60a5fa" icon={TrendingUp} />
        <MCard label="Cost Today" value={`$${totalCost.toFixed(2)}`} sub="Anthropic + OpenAI + Google" color="#a78bfa" icon={BarChart3} />
        <MCard label="Skills Installed" value={SKILLS_DATA.filter(s => s.installed).length} sub={`${SKILLS_DATA.length} available`} color="#f59e0b" icon={Zap} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
        {AGENTS.slice(0, 3).map(agent => <AgentOverviewCard key={agent.id} agent={agent} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
        {AGENTS.slice(3).map(agent => <AgentOverviewCard key={agent.id} agent={agent} />)}
      </div>
    </div>
  );
}

function AgentOverviewCard({ agent }: { agent: AgentData }) {
  return (
    <div className="panel" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
        <AgentAvatar agent={agent} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{agent.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{agent.role}</div>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
        <Micro label="Tasks" value={agent.tasksCompleted} />
        <Micro label="Success" value={`${agent.successRate}%`} />
        <Micro label="Trust" value={`${agent.trustScore}`} />
      </div>
      <TrustBar score={agent.trustScore} color={agent.color} />
      {agent.securityFlags.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, color: 'var(--status-amber)', fontSize: 10 }}>
          <ShieldAlert size={12} /> {agent.securityFlags[0]}
        </div>
      )}
      {agent.url && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <a href={agent.url} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 26, borderRadius: 6, background: 'var(--surface-raise)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
            <Terminal size={11} /> Open Terminal
          </a>
          {agent.dashboardUrl && (
            <a href={agent.dashboardUrl} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 26, borderRadius: 6, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: 'var(--accent)', fontSize: 10, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
              <ExternalLink size={11} /> Dashboard
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function AgentDashboardTab() {
  const [detailAgent, setDetailAgent] = useState<AgentData | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.2px' }}>Agent Dashboard</h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Real-time performance and operational overview of your AI agents</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 11, cursor: 'pointer' }}>
            <Calendar size={12} color="var(--text-muted)" />
            May 20 – May 26, 2025
            <ChevronDown size={12} color="var(--text-muted)" />
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>
            <Filter size={12} /> Filters
          </button>
        </div>
      </div>

      {/* 6 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 10 }}>
        <DashStatCard icon={Users}         label="Total Agents"       value="24"          trend="+2 this week"  up />
        <DashStatCard icon={Bot}           label="Active Agents"      value="18"          trend="+3 this week"  up />
        <DashStatCard icon={CheckCircle2}  label="Tasks Completed"    value="1,429"       trend="↑ 18.6%"       up />
        <DashStatCard icon={TrendingUp}    label="Success Rate"       value="97.6%"       trend="↑ 2.4%"        up />
        <DashStatCard icon={Cpu}           label="Total Token Usage"  value="12.4M"       trend="↑ 14.8%"       up />
        <DashStatCard icon={BarChart3}     label="Total Cost"         value="$2,431.68"   trend="↑ 11.3%"       up />
      </div>

      {/* Charts + Recent Activity row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px 220px', gap: 12 }}>
        <AgentPerfChart />
        <TasksByAgentChart />
        <RecentActivityPanel />
      </div>

      {/* Overview table + System Health + Security */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12 }}>
        <AgentOverviewTable onSelect={setDetailAgent} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SystemHealthPanel />
          <SecurityOverviewPanel />
        </div>
      </div>

      {detailAgent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.55)' }} onClick={() => setDetailAgent(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(820px,95vw)', maxHeight: '88vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
            <AgentDetailFull agent={detailAgent} onClose={() => setDetailAgent(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Dashboard helper components ── */

function DashStatCard({ icon: Icon, label, value, trend, up }: { icon: React.ComponentType<any>; label: string; value: string; trend: string; up: boolean }) {
  return (
    <div className="panel" style={{ padding: '13px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon size={13} color="var(--accent)" />
        <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 6, fontSize: 10, color: up ? 'var(--status-green)' : 'var(--status-red)' }}>
        <TrendingUp size={10} />
        {trend}
      </div>
    </div>
  );
}

function AgentPerfChart() {
  const dates  = ['May 20','May 21','May 22','May 23','May 24','May 25','May 26'];
  const tasks  = [200, 320, 280, 380, 310, 390, 480];
  const rates  = [96.2, 98.0, 97.2, 98.3, 97.5, 98.1, 98.8];

  const W = 400, H = 160, PL = 36, PR = 28, PT = 14, PB = 26;
  const cW = W - PL - PR, cH = H - PT - PB, N = 7;
  const step = cW / (N - 1);

  const tx = (i: number) => PL + i * step;
  const ty = (v: number) => PT + cH - (v / 700) * cH;
  const ry = (v: number) => PT + cH - ((v - 90) / 11) * cH;

  const taskPath  = tasks.map((v, i) => `${i === 0 ? 'M' : 'L'}${tx(i)},${ty(v)}`).join(' ');
  const taskArea  = `${taskPath} L${tx(N-1)},${PT+cH} L${tx(0)},${PT+cH} Z`;
  const ratePath  = rates.map((v, i) => `${i === 0 ? 'M' : 'L'}${tx(i)},${ry(v)}`).join(' ');

  const gridTs = [0, 200, 400, 600];

  return (
    <div className="panel" style={{ padding: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700 }}>Agent Performance</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#10b981' }}>
            <div style={{ width: 16, height: 2, background: '#10b981', borderRadius: 1 }} /> Tasks Completed
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#8b5cf6' }}>
            <div style={{ width: 16, height: 0, borderTop: '2px dashed #8b5cf6' }} /> Success Rate (%)
          </span>
          <button style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            7D <ChevronDown size={10} />
          </button>
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
        {gridTs.map(v => (
          <g key={v}>
            <line x1={PL} y1={ty(v)} x2={W-PR} y2={ty(v)} stroke="var(--border)" strokeWidth="0.6" />
            <text x={PL-5} y={ty(v)+3} textAnchor="end" fontSize="7.5" fill="var(--text-muted)">{v}</text>
          </g>
        ))}
        {[90, 95, 100].map(v => (
          <text key={v} x={W-PR+4} y={ry(v)+3} textAnchor="start" fontSize="7.5" fill="#8b5cf6" opacity="0.8">{v}%</text>
        ))}
        <path d={taskArea} fill="rgba(16,185,129,0.07)" />
        <path d={taskPath} fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        {tasks.map((v, i) => <circle key={i} cx={tx(i)} cy={ty(v)} r="2.5" fill="#10b981" />)}
        <path d={ratePath} fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 2.5" />
        {rates.map((v, i) => <circle key={i} cx={tx(i)} cy={ry(v)} r="2" fill="#8b5cf6" />)}
        {dates.map((d, i) => (
          <text key={d} x={tx(i)} y={H-3} textAnchor="middle" fontSize="7.5" fill="var(--text-muted)">{d}</text>
        ))}
      </svg>
    </div>
  );
}

function polarPoint(cx: number, cy: number, r: number, angle: number) {
  const rad = angle * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArcPath(cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number) {
  const s1 = polarPoint(cx, cy, outerR, startAngle);
  const e1 = polarPoint(cx, cy, outerR, endAngle);
  const s2 = polarPoint(cx, cy, innerR, endAngle);
  const e2 = polarPoint(cx, cy, innerR, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${s1.x} ${s1.y} A ${outerR} ${outerR} 0 ${large} 1 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A ${innerR} ${innerR} 0 ${large} 0 ${e2.x} ${e2.y} Z`;
}

function TasksByAgentChart() {
  const segments = [
    { label: 'Hermes-7',  pct: 42, count: 600, color: '#10b981' },
    { label: 'Codex',     pct: 28, count: 400, color: '#8b5cf6' },
    { label: 'Claude-3.5',pct: 18, count: 257, color: '#3b82f6' },
    { label: 'OpenClaw',  pct: 12, count: 172, color: '#f59e0b' },
  ];
  const total = 1429;
  const cx = 80, cy = 80, outerR = 58, innerR = 38;
  let cumPct = 0;
  const arcs = segments.map(s => {
    const start = (cumPct / 100) * 360 - 90;
    cumPct += s.pct;
    const end = (cumPct / 100) * 360 - 90;
    return { ...s, start, end };
  });

  return (
    <div className="panel" style={{ padding: 14 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Tasks by Agent</h3>
      <svg width="160" height="160" viewBox="0 0 160 160" style={{ display: 'block', margin: '0 auto' }}>
        {arcs.map(arc => (
          <path key={arc.label} d={donutArcPath(cx, cy, outerR, innerR, arc.start, arc.end)} fill={arc.color} />
        ))}
        <text x={cx} y={cy-8} textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--text-primary)">{total.toLocaleString()}</text>
        <text x={cx} y={cy+8} textAnchor="middle" fontSize="8.5" fill="var(--text-muted)">Total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, flex: 1, color: 'var(--text-secondary)' }}>{s.label}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.pct}% ({s.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivityPanel() {
  const items = [
    { agent: 'Hermes-7',   color: '#8b5cf6', action: 'Completed workflow analysis',  time: '2m ago'  },
    { agent: 'Codex',      color: '#10b981', action: 'Deployed code optimization',    time: '8m ago'  },
    { agent: 'Claude-3.5', color: '#3b82f6', action: 'Generated board summary',       time: '15m ago' },
    { agent: 'OpenClaw',   color: '#f59e0b', action: 'Monitored security event',      time: '21m ago' },
    { agent: 'Hermes-7',   color: '#8b5cf6', action: 'Updated memory context',        time: '32m ago' },
  ];
  return (
    <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Recent Activity</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${item.color}18`, border: `1.5px solid ${item.color}30`, display: 'grid', placeItems: 'center', color: item.color, fontSize: 8, fontWeight: 800, flexShrink: 0 }}>
              {item.agent.slice(0,2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)' }}>{item.agent}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{item.action}</div>
            </div>
            <span style={{ fontSize: 9, color: 'var(--text-subtle)', flexShrink: 0, paddingTop: 1 }}>{item.time}</span>
          </div>
        ))}
      </div>
      <button style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 10, padding: 0 }}>
        View all activity <ArrowRight size={11} />
      </button>
    </div>
  );
}

const DASH_AGENTS = [
  { name: 'Cash',   color: '#10b981', init: 'CA', status: 'Online',  model: 'claude-sonnet-4-6 / Anthropic', tasks: 1842, rate: 97.4, tokens: '12.4M', cost: '$4.27',  latency: '0.98s', trust: 99, url: 'https://cash.srv1427612.hstgr.cloud' },
  { name: 'Lisa',   color: '#8b5cf6', init: 'LI', status: 'Online',  model: 'claude-sonnet-4-6 / Anthropic', tasks: 847,  rate: 96.2, tokens: '5.8M',  cost: '$2.14',  latency: '1.24s', trust: 97, url: 'https://hermes-dash.srv1427612.hstgr.cloud' },
  { name: 'Hughes', color: '#3b82f6', init: 'HU', status: 'Online',  model: 'claude-sonnet-4-6 / Anthropic', tasks: 1031, rate: 94.8, tokens: '7.2M',  cost: '$2.94',  latency: '1.58s', trust: 93, url: 'https://hughes.srv1427612.hstgr.cloud' },
  { name: 'Freida', color: '#f59e0b', init: 'FR', status: 'Busy',    model: 'claude-sonnet-4-6 / Anthropic', tasks: 2814, rate: 98.1, tokens: '3.4M',  cost: '$0.43',  latency: '0.48s', trust: 99, url: 'https://freida.srv1427612.hstgr.cloud' },
  { name: 'Titan',  color: '#ef4444', init: 'TI', status: 'Online',  model: 'claude-sonnet-4-6 / Anthropic', tasks: 392,  rate: 91.4, tokens: '2.1M',  cost: '$0.97',  latency: '1.82s', trust: 87, url: 'https://titan.srv1427612.hstgr.cloud' },
];

function AgentOverviewTable({ onSelect }: { onSelect: (a: AgentData) => void }) {
  const statusDot = (s: string) => s === 'Online' ? 'var(--status-green)' : s === 'Idle' ? 'var(--status-amber)' : 'var(--text-subtle)';
  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div className="panel-heading">
        <h2>Agent Overview</h2>
        <button className="small-button" style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Search size={11} /> Search</button>
      </div>
      <div className="table-scroll">
        <table className="data-table" style={{ fontSize: 10.5 }}>
          <thead>
            <tr>
              <th>Agent</th><th>Status</th><th>Model / Provider</th>
              <th>Tasks</th><th>Success Rate</th><th>Token Usage</th>
              <th>Cost</th><th>Latency (avg)</th><th>Trust Score</th><th></th>
            </tr>
          </thead>
          <tbody>
            {DASH_AGENTS.map(row => (
              <tr key={row.name} style={{ cursor: 'pointer' }} onClick={() => {
                const a = AGENTS.find(x => x.name === row.name);
                if (a) onSelect(a);
              }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${row.color}18`, border: `1.5px solid ${row.color}35`, display: 'grid', placeItems: 'center', fontSize: 8, fontWeight: 800, color: row.color, flexShrink: 0 }}>{row.init}</div>
                    <span style={{ fontWeight: 600 }}>{row.name}</span>
                  </div>
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot(row.status) }} />
                    {row.status}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{row.model}</td>
                <td style={{ fontFamily: 'DM Mono, monospace' }}>{row.tasks || '—'}</td>
                <td style={{ color: row.rate > 95 ? 'var(--status-green)' : row.rate > 0 ? 'var(--status-amber)' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{row.rate > 0 ? `${row.rate}%` : '—'}</td>
                <td style={{ fontFamily: 'DM Mono, monospace' }}>{row.tokens}</td>
                <td style={{ fontFamily: 'DM Mono, monospace' }}>{row.cost}</td>
                <td style={{ color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{row.latency}</td>
                <td>
                  {row.trust > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 46, height: 5, background: 'var(--surface-raise)', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div style={{ height: '100%', width: `${row.trust}%`, background: row.trust >= 90 ? 'var(--status-green)' : 'var(--status-amber)', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700 }}>{row.trust}</span>
                    </div>
                  ) : <span style={{ color: 'var(--text-subtle)' }}>—</span>}
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {row.url && (
                      <a href={row.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, height: 22, padding: '0 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface-raise)', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        <ExternalLink size={10} /> Open
                      </a>
                    )}
                    <button style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 13 }}>⋮</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="panel-link"><span>View all agents</span><ArrowRight size={14}/></button>
    </div>
  );
}

function SystemHealthPanel() {
  const items = ['API Services','Database','Vector Store','Memory Service','Workflow Engine'];
  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div className="panel-heading" style={{ minHeight: 42 }}><h2>System Health</h2></div>
      {items.map(item => (
        <div key={item} style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--status-green)', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{item}</span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--status-green)', fontWeight: 600 }}>Operational</span>
        </div>
      ))}
    </div>
  );
}

function SecurityOverviewPanel() {
  return (
    <div className="panel" style={{ padding: 14 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Security Overview</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ background: 'var(--surface-inset)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Alerts</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--status-red)', fontFamily: 'DM Mono, monospace', marginTop: 4 }}>3</div>
        </div>
        <div style={{ background: 'var(--surface-inset)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Open Invest.</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace', marginTop: 4 }}>2</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Threat Level</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--status-amber)' }}>Medium</span>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Trust Score</span>
          <span style={{ fontSize: 10, fontWeight: 700 }}>87 / 100</span>
        </div>
        <div style={{ height: 6, background: 'var(--surface-raise)', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ height: '100%', width: '87%', background: 'var(--status-green)', borderRadius: 99 }} />
        </div>
      </div>
    </div>
  );
}

function AgentDetailFull({ agent, onClose }: { agent: AgentData; onClose?: () => void }) {
  const [detailTab, setDetailTab] = useState<'metrics' | 'skills' | 'activity' | 'security'>('metrics');

  const dtabs = [
    { id: 'metrics' as const,  label: 'Metrics'   },
    { id: 'skills'  as const,  label: 'Skills & Workflows' },
    { id: 'activity' as const, label: 'Recent Activity' },
    { id: 'security' as const, label: 'Security & Trust' },
  ];

  return (
    <div className="panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 13 }}>
        <AgentAvatar agent={agent} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.2px' }}>{agent.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{agent.model} · {agent.provider} · {agent.role}</div>
        </div>
        <StatusBadge status={agent.status} />
        {agent.auditStatus !== 'clean' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: agent.auditStatus === 'flagged' ? 'var(--status-red)' : 'var(--status-amber)', background: agent.auditStatus === 'flagged' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${agent.auditStatus === 'flagged' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`, borderRadius: 99, padding: '3px 8px' }}>
            <ShieldAlert size={11} /> {agent.auditStatus}
          </span>
        )}
        {agent.url && (
          <a href={agent.url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-raise)', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, textDecoration: 'none' }}>
            <Terminal size={11} /> Terminal
          </a>
        )}
        {agent.dashboardUrl && (
          <a href={agent.dashboardUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px', borderRadius: 7, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: 'var(--accent)', fontSize: 10, fontWeight: 600, textDecoration: 'none' }}>
            <ExternalLink size={11} /> Dashboard
          </a>
        )}
        {onClose && (
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-raise)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'grid', placeItems: 'center' }}>×</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 2, padding: '0 18px', borderBottom: '1px solid var(--border)' }}>
        {dtabs.map(t => (
          <button key={t.id} onClick={() => setDetailTab(t.id)} style={{ padding: '9px 12px', border: 'none', borderBottom: detailTab === t.id ? '2px solid var(--accent)' : '2px solid transparent', background: 'transparent', color: detailTab === t.id ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: detailTab === t.id ? 600 : 400, borderRadius: '5px 5px 0 0' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 18 }}>
        {detailTab === 'metrics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
              <DCard label="Token Usage" value={`${(agent.tokenUsage / 1000).toFixed(1)}k`} />
              <DCard label="Cost Today" value={`$${agent.cost.toFixed(2)}`} />
              <DCard label="Tasks Done" value={agent.tasksCompleted} />
              <DCard label="Avg Latency" value={`${agent.latency}ms`} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
              <DCard label="Success Rate" value={`${agent.successRate}%`} accent="var(--status-green)" />
              <DCard label="Failure Rate" value={`${agent.failureRate}%`} accent="var(--status-red)" />
              <DCard label="Tool Calls" value={agent.toolCalls} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 10 }}>
              <div>
                <Label>Memory Quality Score</Label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <div style={{ flex: 1, height: 8, background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${agent.memoryQualityScore}%`, background: agent.memoryQualityScore > 80 ? 'var(--status-green)' : agent.memoryQualityScore > 60 ? 'var(--status-amber)' : 'var(--status-red)', borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>{agent.memoryQualityScore}/100</span>
                </div>
              </div>
              <div>
                <Label>Context Window</Label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <div style={{ flex: 1, height: 8, background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${agent.contextPct}%`, background: agent.contextPct > 70 ? 'var(--status-amber)' : agent.color, borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>{agent.contextPct}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {detailTab === 'skills' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Label>Installed Skills</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {agent.installedSkills.map(s => <span key={s} className="tag tag-accent">{s}</span>)}
                {agent.installedSkills.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>None installed</span>}
              </div>
            </div>
            <div>
              <Label>Active Workflows</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                {agent.activeWorkflows.map(w => (
                  <div key={w} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 50, background: 'var(--status-green)' }} />
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{w}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>Running</span>
                  </div>
                ))}
                {agent.activeWorkflows.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No active workflows</span>}
              </div>
            </div>
          </div>
        )}

        {detailTab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {agent.recentActivity.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <span style={{ color: item.ok ? 'var(--status-green)' : 'var(--status-red)', fontSize: 14 }}>{item.ok ? '✓' : '✗'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{item.text}</div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{item.time}</span>
              </div>
            ))}
          </div>
        )}

        {detailTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <DCard label="Trust Score" value={`${agent.trustScore}/100`} accent={agent.trustScore >= 90 ? 'var(--status-green)' : agent.trustScore >= 75 ? 'var(--status-amber)' : 'var(--status-red)'} />
              <DCard label="Audit Status" value={agent.auditStatus.charAt(0).toUpperCase() + agent.auditStatus.slice(1)} accent={agent.auditStatus === 'clean' ? 'var(--status-green)' : agent.auditStatus === 'reviewing' ? 'var(--status-amber)' : 'var(--status-red)'} />
            </div>
            <div>
              <Label>Security Flags</Label>
              {agent.securityFlags.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, color: 'var(--status-green)', fontSize: 12 }}>
                  <ShieldCheck size={15} /> No active security flags
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {agent.securityFlags.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: 'var(--status-red)', fontSize: 12 }}>
                      <ShieldAlert size={13} /> {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Trust Score Progress</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <div style={{ flex: 1, height: 10, background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${agent.trustScore}%`, background: agent.trustScore >= 90 ? 'var(--status-green)' : agent.trustScore >= 75 ? 'var(--status-amber)' : 'var(--status-red)', borderRadius: 99, transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{agent.trustScore}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SkillsPluginsTab({ items, type }: { items: SkillData[]; type: 'skill' | 'plugin' }) {
  const [sourceFilter, setSourceFilter] = useState<SkillSource>('all');
  const [search, setSearch] = useState('');

  const sources: { id: SkillSource; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'all',        label: 'All Sources',  icon: Globe },
    { id: 'clawhub',   label: 'ClawHub',      icon: Zap },
    { id: 'github',    label: 'GitHub',        icon: Github },
    { id: 'hermes',    label: 'Hermes',        icon: Bot },
    { id: 'codex',     label: 'Codex',         icon: Code2 },
    { id: 'claude-code', label: 'Claude Code', icon: Terminal },
    { id: 'custom',    label: 'Custom',        icon: Upload },
  ];

  const filtered = items.filter(i =>
    (sourceFilter === 'all' || i.source === sourceFilter) &&
    (i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <Search size={13} color="var(--text-muted)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${type}s…`} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 12, outline: 'none', width: 180 }} />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {sources.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => setSourceFilter(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 99, background: sourceFilter === s.id ? 'var(--accent-soft)' : 'transparent', color: sourceFilter === s.id ? 'var(--accent)' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontWeight: sourceFilter === s.id ? 600 : 400 }}>
                <Icon size={11} /> {s.label}
              </button>
            );
          })}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} {type}s</span>
      </div>

      <div className="panel" style={{ overflow: 'hidden' }}>
        <div className="table-scroll">
          <table className="data-table" style={{ fontSize: 11 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Source</th>
                <th>Category</th>
                <th>Compatibility</th>
                <th>Version</th>
                <th>Status</th>
                <th>Permissions Required</th>
                <th>Last Updated</th>
                <th>Assigned Agents</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: 11, color: 'var(--text-primary)' }}>{item.name}</strong>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{item.description}</span>
                    </div>
                  </td>
                  <td><SourceBadge source={item.source} /></td>
                  <td><span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{item.category}</span></td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {item.compatibility.slice(0, 2).map(c => <span key={c} style={{ fontSize: 9, background: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderRadius: 3, padding: '1px 5px' }}>{c}</span>)}
                      {item.compatibility.length > 2 && <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{item.compatibility.length - 2}</span>}
                    </div>
                  </td>
                  <td><span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>v{item.version}</span></td>
                  <td><InstallBadge installed={item.installed} /></td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {item.permissionsRequired.map(p => <span key={p} style={{ fontSize: 9, background: 'rgba(245,158,11,0.08)', color: 'var(--status-amber)', borderRadius: 3, padding: '1px 5px' }}>{p}</span>)}
                    </div>
                  </td>
                  <td><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.lastUpdated}</span></td>
                  <td>
                    {item.assignedAgents.length > 0
                      ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>{item.assignedAgents.map(a => <span key={a} style={{ fontSize: 9, background: 'rgba(16,185,129,0.08)', color: 'var(--accent)', borderRadius: 3, padding: '1px 5px' }}>{a}</span>)}</div>
                      : <span style={{ fontSize: 9, color: 'var(--text-subtle)' }}>None</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MemoryTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
        <MCard label="Total Memory Entries" value="14,203" sub="Across all agents" color="var(--accent)" icon={Brain} />
        <MCard label="Avg Quality Score" value="84.2" sub="Target: 90+" color="#60a5fa" icon={Star} />
        <MCard label="Last Compaction" value="3h ago" sub="Next: in 21h" color="#a78bfa" icon={RefreshCw} />
      </div>
      <div className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-heading"><h2>Memory Quality by Agent</h2></div>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Agent</th><th>Memory Entries</th><th>Quality Score</th><th>Scopes</th><th>Bank Size</th><th>Last Compact</th><th>Status</th></tr></thead>
            <tbody>
              {AGENTS.map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AgentAvatar agent={a} size={22} />
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{a.name}</span>
                    </div>
                  </td>
                  <td><span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10 }}>{(2000 + a.memoryQualityScore * 40).toLocaleString()}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 60, height: 5, background: 'var(--surface-raise)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${a.memoryQualityScore}%`, background: a.memoryQualityScore > 80 ? 'var(--status-green)' : 'var(--status-amber)' }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{a.memoryQualityScore}</span>
                    </div>
                  </td>
                  <td><div style={{ display: 'flex', gap: 3 }}>{['Identity', 'Project', 'Decision'].map(s => <span key={s} style={{ fontSize: 9, background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 3, padding: '1px 5px' }}>{s}</span>)}</div></td>
                  <td><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{(a.memoryQualityScore * 12 + 200).toFixed(0)} KB</span></td>
                  <td><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>6h ago</span></td>
                  <td><span style={{ fontSize: 10, color: a.status !== 'offline' ? 'var(--status-green)' : 'var(--text-muted)' }}>{a.status !== 'offline' ? 'Active' : 'Paused'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ToolsTab() {
  const tools = ['Web Search', 'File Read', 'File Write', 'Task Create', 'Memory Read', 'Memory Write', 'Alerts', 'Email', 'Calendar', 'Database'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-heading"><h2>Tool Assignments</h2><button className="small-button"><Plus size={12} /> Assign Tool</button></div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tool</th>
                {AGENTS.map(a => <th key={a.id} style={{ textAlign: 'center' }}>{a.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {tools.map((tool, i) => (
                <tr key={tool}>
                  <td><span style={{ fontSize: 11, fontWeight: 600 }}>{tool}</span></td>
                  {AGENTS.map((a, j) => {
                    const assigned = (i + j) % 3 !== 2;
                    return (
                      <td key={a.id} style={{ textAlign: 'center' }}>
                        {assigned
                          ? <CheckCircle2 size={14} color="var(--status-green)" />
                          : <Circle size={14} color="var(--text-subtle)" />
                        }
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PermissionsTab() {
  const permScopes = ['internet', 'files:read', 'files:write', 'memory:read', 'memory:write', 'tasks:write', 'alerts:write', 'database:read', 'email:send', 'admin'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-heading">
          <h2>Permission Matrix</h2>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Manage per-agent permission scopes</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Permission Scope</th>
                {AGENTS.map(a => <th key={a.id} style={{ textAlign: 'center' }}>{a.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {permScopes.map((perm, i) => (
                <tr key={perm}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {perm === 'admin' ? <Lock size={12} color="var(--status-red)" /> : <LockOpen size={12} color="var(--text-muted)" />}
                      <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace' }}>{perm}</span>
                    </div>
                  </td>
                  {AGENTS.map((a, j) => {
                    const granted = perm === 'admin' ? false : (i + j) % 4 !== 3;
                    return (
                      <td key={a.id} style={{ textAlign: 'center' }}>
                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                          {granted
                            ? <CheckCircle2 size={14} color="var(--status-green)" />
                            : <XCircle size={14} color="var(--text-subtle)" />
                          }
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ActivityTab() {
  const [filter, setFilter] = useState<'all' | 'success' | 'failure' | 'alert'>('all');
  const filtered = ACTIVITY_LOG.filter(e => filter === 'all' || e.outcome === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {(['all', 'success', 'failure', 'alert'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 12px', border: '1px solid var(--border)', borderRadius: 99, background: filter === f ? 'var(--surface-raise)' : 'transparent', color: filter === f ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer', textTransform: 'capitalize', fontWeight: filter === f ? 600 : 400 }}>
            {f}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} events</span>
      </div>
      <div className="panel" style={{ overflow: 'hidden' }}>
        <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Agent</th><th>Action</th><th>Tool</th><th>Outcome</th><th>Time</th></tr></thead>
            <tbody>
              {filtered.map((e, i) => {
                const agent = AGENTS.find(a => a.name === e.agent);
                return (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        {agent && <AgentAvatar agent={agent} size={20} />}
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{e.agent}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: 260 }}><span style={{ fontSize: 11 }}>{e.action}</span></td>
                    <td><span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{e.tool}</span></td>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 600, color: e.outcome === 'success' ? 'var(--status-green)' : e.outcome === 'alert' ? 'var(--status-amber)' : e.outcome === 'failure' ? 'var(--status-red)' : 'var(--text-muted)' }}>
                        {e.outcome}
                      </span>
                    </td>
                    <td><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{e.time}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MarketplaceTab() {
  const [typeFilter, setTypeFilter] = useState<'all' | 'skill' | 'plugin'>('all');
  const [sourceFilter, setSourceFilter] = useState<SkillSource>('all');
  const filtered = MARKETPLACE_ITEMS.filter(i =>
    (typeFilter === 'all' || i.type === typeFilter) &&
    (sourceFilter === 'all' || i.source === sourceFilter)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'skill', 'plugin'] as const).map(f => (
            <button key={f} onClick={() => setTypeFilter(f)} style={{ padding: '5px 11px', border: '1px solid var(--border)', borderRadius: 99, background: typeFilter === f ? 'var(--surface-raise)' : 'transparent', color: typeFilter === f ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 11, cursor: 'pointer', textTransform: 'capitalize', fontWeight: typeFilter === f ? 600 : 400 }}>
              {f === 'all' ? 'All' : f === 'skill' ? 'Skills' : 'Plugins'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(['all', 'clawhub', 'github', 'hermes', 'codex', 'claude-code', 'custom'] as SkillSource[]).map(s => (
            <button key={s} onClick={() => setSourceFilter(s)} style={{ padding: '4px 9px', border: '1px solid var(--border)', borderRadius: 99, background: sourceFilter === s ? 'var(--accent-soft)' : 'transparent', color: sourceFilter === s ? 'var(--accent)' : 'var(--text-muted)', fontSize: 10, cursor: 'pointer', fontWeight: sourceFilter === s ? 600 : 400 }}>
              {s === 'all' ? 'All Sources' : s === 'claude-code' ? 'Claude Code' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
        {filtered.map(item => (
          <div key={item.id} className="panel" style={{ padding: 16, position: 'relative' }}>
            {item.new && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 99, padding: '2px 7px', fontWeight: 700 }}>NEW</span>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid var(--border)', display: 'grid', placeItems: 'center', background: 'var(--surface-raise)', color: 'var(--accent)' }}>
                {item.type === 'skill' ? <Zap size={17} /> : <Plug size={17} />}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{item.name}</div>
                <SourceBadge source={item.source as SkillSource} small />
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>{item.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: 'var(--status-amber)', display: 'flex', alignItems: 'center', gap: 3 }}><Star size={10} /> {item.rating}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.downloads.toLocaleString()} installs</span>
              <span style={{ fontSize: 10, background: 'rgba(59,130,246,0.1)', color: '#60a5fa', borderRadius: 3, padding: '1px 5px' }}>{item.category}</span>
            </div>
            <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 30, border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface-raise)', color: 'var(--text-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              <Download size={12} /> Install
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentAvatar({ agent, size = 32 }: { agent: AgentData; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3, background: `${agent.color}18`, border: `1.5px solid ${agent.color}35`, display: 'grid', placeItems: 'center', fontSize: size * 0.38, color: agent.color, fontWeight: 800, flexShrink: 0 }}>
      {agent.initial}
    </div>
  );
}

function StatusBadge({ status, dot = false }: { status: AgentData['status']; dot?: boolean }) {
  const cfg = { online: { color: 'var(--status-green)', bg: 'rgba(16,185,129,0.1)', label: 'Online' }, busy: { color: 'var(--status-amber)', bg: 'rgba(245,158,11,0.1)', label: 'Busy' }, offline: { color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)', label: 'Offline' } };
  const c = cfg[status];
  if (dot) return <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />;
  return <span style={{ fontSize: 10, fontWeight: 600, color: c.color, background: c.bg, borderRadius: 99, padding: '3px 8px', flexShrink: 0 }}>{c.label}</span>;
}

function SourceBadge({ source, small = false }: { source: SkillSource; small?: boolean }) {
  const cfg: Record<string, { label: string; color: string; bg: string }> = {
    clawhub:     { label: 'ClawHub',     color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    github:      { label: 'GitHub',      color: '#a78bfa', bg: 'rgba(139,92,246,0.1)' },
    hermes:      { label: 'Hermes',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    codex:       { label: 'Codex',       color: '#60a5fa', bg: 'rgba(59,130,246,0.1)' },
    'claude-code': { label: 'Claude Code', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
    custom:      { label: 'Custom',      color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  };
  const c = cfg[source] || { label: source, color: 'var(--text-muted)', bg: 'transparent' };
  return <span style={{ fontSize: small ? 9 : 10, fontWeight: 600, color: c.color, background: c.bg, borderRadius: 99, padding: small ? '1px 6px' : '2px 8px' }}>{c.label}</span>;
}

function InstallBadge({ installed }: { installed: boolean }) {
  return installed
    ? <span style={{ fontSize: 10, color: 'var(--status-green)', background: 'rgba(16,185,129,0.1)', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>Installed</span>
    : <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', borderRadius: 99, padding: '2px 8px' }}>Available</span>;
}

function TrustBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Trust</span>
        <span style={{ fontSize: 9, fontWeight: 700, color }}>{score}</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: 'var(--surface-raise)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 99 }} />
      </div>
    </div>
  );
}

function MCard({ label, value, sub, color, icon: Icon }: { label: string; value: React.ReactNode; sub: string; color: string; icon: React.ComponentType<any> }) {
  return (
    <div className="panel" style={{ padding: '14px 16px', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Icon size={14} color={color} />
        <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'DM Mono, monospace' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function Micro({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface-inset)', borderRadius: 6, padding: '5px 8px' }}>
      <div style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: 'var(--text-primary)', marginTop: 2 }}>{value}</div>
    </div>
  );
}

function DCard({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border)', borderRadius: 9, padding: '12px 14px' }}>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent || 'var(--text-primary)', fontFamily: 'DM Mono, monospace' }}>{value}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 8 }}>{children}</div>;
}

function NewAgentModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', role: '', model: 'claude-sonnet-4-6', provider: 'Anthropic', description: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.65)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(540px,95vw)', background: 'var(--surface)', border: '1px solid var(--border-hover)', borderRadius: 12, boxShadow: '0 24px 80px rgba(0,0,0,0.5)', animation: 'fadeUp 0.2s cubic-bezier(0.16,1,0.3,1) both', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ height: 54, padding: '0 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Bot size={16} color="var(--accent)" />
            <span style={{ fontSize: 13, fontWeight: 700 }}>New Agent</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-raise)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'grid', placeItems: 'center' }}>×</button>
        </div>
        {/* Body */}
        <div style={{ padding: '20px 18px', display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Agent Name *</span>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Aria" style={{ height: 34, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-inset)', color: 'var(--text-primary)', padding: '0 10px', fontSize: 12 }} />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Role / Title</span>
              <input value={form.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Research Analyst" style={{ height: 34, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-inset)', color: 'var(--text-primary)', padding: '0 10px', fontSize: 12 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Model</span>
              <select value={form.model} onChange={e => set('model', e.target.value)} style={{ height: 34, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-inset)', color: 'var(--text-primary)', padding: '0 10px', fontSize: 12 }}>
                <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
                <option value="claude-opus-4-8">claude-opus-4-8</option>
                <option value="claude-haiku-4-5">claude-haiku-4-5</option>
                <option value="gpt-4o">gpt-4o</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
              </select>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Provider</span>
              <select value={form.provider} onChange={e => set('provider', e.target.value)} style={{ height: 34, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-inset)', color: 'var(--text-primary)', padding: '0 10px', fontSize: 12 }}>
                <option>Anthropic</option>
                <option>OpenAI</option>
                <option>Google</option>
                <option>Custom</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Description</span>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does this agent do?" rows={3} style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-inset)', color: 'var(--text-primary)', padding: '8px 10px', fontSize: 12, resize: 'none', lineHeight: 1.5 }} />
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ height: 32, padding: '0 14px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface-raise)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          <button disabled={!form.name.trim()} onClick={onClose} style={{ height: 32, padding: '0 16px', border: 'none', borderRadius: 6, background: form.name.trim() ? 'var(--accent)' : 'var(--surface-raise)', color: form.name.trim() ? '#041f14' : 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: form.name.trim() ? 'pointer' : 'not-allowed' }}>Create Agent</button>
        </div>
      </div>
    </div>
  );
}
