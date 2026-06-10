import { create } from 'zustand';
import { apiFetch } from '../lib/api';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ThreatStatus = 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';

export interface ThreatEntry {
  id: string;
  severity: Severity;
  title: string;
  source: string;
  status: ThreatStatus;
  date: string;
  description?: string;
}

export interface SecurityEvent {
  id: string;
  type: 'login' | 'workflow_edit' | 'board_vote' | 'org_change' | 'permission_change' | 'agent_create' | 'proposal';
  actor: string;
  action: string;
  resource?: string;
  timestamp: string;
  severity?: Severity;
}

export interface AgentTrust {
  id: string;
  name: string;
  model: string;
  trustScore: number;
  lastAudit: string;
  status: 'trusted' | 'review' | 'restricted' | 'suspended';
}

interface SecurityState {
  threats: ThreatEntry[];
  events: SecurityEvent[];
  agentTrust: AgentTrust[];
  securityScore: number;
  activeAlerts: number;
  openInvestigations: number;
  threatFilter: Severity | 'all';
  setThreatFilter: (f: Severity | 'all') => void;
  loadSecurityData: () => Promise<void>;
  addSecurityEvent: (event: SecurityEvent) => Promise<void>;
  addThreat: (t: ThreatEntry) => Promise<void>;
  updateThreatStatus: (id: string, status: ThreatStatus) => Promise<void>;
}

const SEED_THREATS: ThreatEntry[] = [
  { id: 't1', severity: 'critical', title: 'Prompt injection attempt on Cash', source: 'Red Team', status: 'investigating', date: 'Jun 5, 2026' },
  { id: 't2', severity: 'high',     title: 'Unusual API key usage pattern',        source: 'Monitor',  status: 'open',          date: 'Jun 4, 2026' },
  { id: 't3', severity: 'high',     title: 'MFA disabled on 4 accounts',           source: 'Audit',    status: 'open',          date: 'Jun 4, 2026' },
  { id: 't4', severity: 'medium',   title: 'Agent memory write threshold exceeded', source: 'System',  status: 'contained',     date: 'Jun 3, 2026' },
  { id: 't5', severity: 'medium',   title: 'New device login: Sheryl',             source: 'Auth',     status: 'resolved',      date: 'Jun 2, 2026' },
  { id: 't6', severity: 'low',      title: 'Compliance scan completed with warnings', source: 'Scanner', status: 'closed',     date: 'Jun 1, 2026' },
];

const SEED_EVENTS: SecurityEvent[] = [
  { id: 'e1', type: 'login',           actor: 'Rusty',    action: 'Logged in',                  timestamp: 'Jun 5 09:14', severity: 'info'   },
  { id: 'e2', type: 'board_vote',      actor: 'Lisa',     action: 'Voted Approve on P-2024-052', timestamp: 'Jun 5 10:30', severity: 'info'   },
  { id: 'e3', type: 'workflow_edit',   actor: 'Cash', action: 'Updated onboarding workflow', timestamp: 'Jun 4 14:10', severity: 'info'   },
  { id: 'e4', type: 'permission_change', actor: 'Rusty',  action: 'Revoked access for guest-1', timestamp: 'Jun 4 15:44', severity: 'high'   },
  { id: 'e5', type: 'agent_create',    actor: 'Codex',    action: 'New agent provisioned',       timestamp: 'Jun 3 08:00', severity: 'medium' },
  { id: 'e6', type: 'org_change',      actor: 'Rusty',    action: 'Promoted Cody to Engineer',   timestamp: 'Jun 3 11:18', severity: 'info'   },
  { id: 'e7', type: 'proposal',        actor: 'Rusty',    action: 'Created P-2024-052',          timestamp: 'Jun 1 09:00', severity: 'info'   },
];

function adaptEvent(row: any): SecurityEvent {
  const metadata = typeof row.metadata === 'string'
    ? (() => { try { return JSON.parse(row.metadata); } catch { return {}; } })()
    : row.metadata || {};
  return {
    id: String(row.id),
    type: metadata.type || row.event_type || 'proposal',
    actor: metadata.actor || row.user_id || row.agent_id || 'System',
    action: metadata.action || row.event_type || 'Security event',
    resource: metadata.resource,
    timestamp: metadata.timestamp || (row.created_at ? new Date(row.created_at * 1000).toLocaleString() : new Date().toLocaleString()),
    severity: metadata.severity || 'info',
  };
}

function summarizeThreats(threats: ThreatEntry[]) {
  const penalty = threats.reduce((score, threat) => {
    if (threat.severity === 'critical') return score + 15;
    if (threat.severity === 'high') return score + 8;
    if (threat.severity === 'medium') return score + 3;
    return score;
  }, 0);
  return {
    securityScore: Math.max(0, 100 - penalty),
    activeAlerts: threats.filter(threat => threat.status === 'open' || threat.status === 'investigating').length,
    openInvestigations: threats.filter(threat => threat.status === 'investigating').length,
  };
}

export const useSecurityStore = create<SecurityState>()((set, get) => ({
  threats: [],
  events: [],
  agentTrust: [],
  securityScore: 0,
  activeAlerts: 0,
  openInvestigations: 0,
  threatFilter: 'all',

  setThreatFilter: (f) => set({ threatFilter: f }),
  loadSecurityData: async () => {
    const [threatResult, eventResult, agentResult] = await Promise.allSettled([
      apiFetch<ThreatEntry[]>('/security/threats'),
      apiFetch<any[]>('/analytics/events?limit=50'),
      apiFetch<any[]>('/agents'),
    ]);
    const threats = threatResult.status === 'fulfilled' ? threatResult.value : [];
    const eventRows = eventResult.status === 'fulfilled' ? eventResult.value : [];
    const events = eventRows.length > 0 ? eventRows.map(adaptEvent) : SEED_EVENTS;
    const today = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date());
    const agentTrust = agentResult.status === 'fulfilled'
      ? agentResult.value.map((agent): AgentTrust => ({
          id: agent.id,
          name: agent.name,
          model: '',
          trustScore: agent.status === 'up' ? 95 : 40,
          lastAudit: today,
          status: agent.status === 'up' ? 'trusted' : 'review',
        }))
      : [];
    set({ threats, events, agentTrust, ...summarizeThreats(threats) });
  },
  addSecurityEvent: async (event) => {
    await apiFetch('/analytics/events', {
      method: 'POST',
      body: JSON.stringify({
        event_type: event.type,
        user_id: event.actor,
        metadata: event,
      }),
    });
    set((state) => ({ events: [event, ...state.events] }));
  },
  addThreat: async (threat) => {
    set((state) => {
      const threats = [threat, ...state.threats];
      return { threats, ...summarizeThreats(threats) };
    });
    try {
      const created = await apiFetch<ThreatEntry>('/security/threats', { method: 'POST', body: JSON.stringify(threat) });
      set((state) => ({ threats: state.threats.map((item) => (item.id === threat.id ? { ...threat, ...created } : item)) }));
    } catch (error) {
      console.error('Failed to persist threat', error);
      set((state) => {
        const threats = state.threats.filter((item) => item.id !== threat.id);
        return { threats, ...summarizeThreats(threats) };
      });
    }
  },
  updateThreatStatus: async (id, status) => {
    const previous = get().threats.find((t) => t.id === id)?.status;
    set((state) => {
      const threats = state.threats.map((threat) => (threat.id === id ? { ...threat, status } : threat));
      return { threats, ...summarizeThreats(threats) };
    });
    try {
      const updated = await apiFetch<ThreatEntry>(`/security/threats/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      set((state) => ({ threats: state.threats.map((threat) => (threat.id === id ? { ...threat, ...updated } : threat)) }));
    } catch (error) {
      console.error('Failed to update threat status', error);
      if (previous) {
        set((state) => {
          const threats = state.threats.map((threat) => (threat.id === id ? { ...threat, status: previous } : threat));
          return { threats, ...summarizeThreats(threats) };
        });
      }
    }
  },
}));
