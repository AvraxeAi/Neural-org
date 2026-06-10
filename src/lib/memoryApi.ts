import { apiFetch, authHeaders } from './api';

const BASE = () => (import.meta.env.VITE_MEMORY_SERVICE_URL || `${import.meta.env.VITE_API_BASE_URL || ''}`).replace(/\/$/, '');

function cashMemoryRow(row: any) {
  return {
    ...row,
    id: row.id ?? row.key,
    key: row.key,
    memory_type: row.memory_type ?? String(row.type || row.scope || 'agent').toLowerCase(),
    importance: row.importance ?? ((row.importance_score ?? 5) / 10),
    confidence: row.confidence ?? row.confidence_score ?? 0.8,
    source: row.source ?? 'openclaw-cash',
    updated_at: row.updated_at ?? row.updated ?? new Date().toISOString(),
    tags: row.tags ?? [],
  };
}

async function memFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!import.meta.env.VITE_MEMORY_SERVICE_URL) {
    return apiFetch<T>(path, init);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${BASE()}${path}`, {
      ...init,
      headers: { ...authHeaders(), ...(init?.headers as any) },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

export const memSvc = {
  // Memory CRUD
  list: async (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    try {
      return await memFetch<any[]>(`/memory${qs}`);
    } catch {
      const rows = await apiFetch<any[]>(`/memory${qs}`);
      return rows.map(cashMemoryRow);
    }
  },
  get: async (id: string) => {
    try { return await memFetch<any>(`/memory/${id}`); }
    catch { return cashMemoryRow(await apiFetch<any>(`/memory/${encodeURIComponent(id)}`)); }
  },
  create: async (body: any) => {
    try { return await memFetch<any>('/memory', { method: 'POST', body: JSON.stringify(body) }); }
    catch {
      return cashMemoryRow(await apiFetch<any>('/memory', {
        method: 'POST',
        body: JSON.stringify({
          key: body.key,
          scope: body.scope ?? body.memory_type ?? 'user',
          type: body.type ?? body.memory_type ?? 'Manual',
          preview: body.content?.slice?.(0, 160) ?? body.preview ?? '',
          content: body.content,
          agent_id: body.agent_id,
          user_id: body.user_id,
          org_id: body.org_id,
          project_id: body.project_id,
          chat_id: body.chat_id,
          category: body.category,
          importance_score: body.importance_score ?? Math.round(Number(body.importance ?? 0.5) * 10),
          confidence_score: body.confidence_score ?? body.confidence,
          source: body.source ?? 'manual-ui',
          expiration_policy: body.expiration_policy,
        }),
      }));
    }
  },
  revise: async (id: string, body: any) => {
    try { return await memFetch<any>(`/memory/${id}`, { method: 'PATCH', body: JSON.stringify(body) }); }
    catch { return cashMemoryRow(await apiFetch<any>(`/memory/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) })); }
  },
  archive: async (id: string) => {
    try { return await memFetch<any>(`/memory/${id}`, { method: 'DELETE' }); }
    catch { return apiFetch<any>(`/memory/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
  },
  audit: async (id: string) => {
    try { return await memFetch<any>(`/memory/audit/${id}`); }
    catch { return []; }
  },
  search: (q: string, opts?: { memory_type?: string; tier?: string; limit?: number; agent_id?: string; user_id?: string; org_id?: string; project_id?: string; chat_id?: string }) =>
    memFetch<any>('/memory/search', { method: 'POST', body: JSON.stringify({ q, ...opts }) })
      .catch(async () => {
        const params = new URLSearchParams({ q, limit: String(opts?.limit ?? 10) });
        for (const key of ['agent_id', 'user_id', 'org_id', 'project_id', 'chat_id'] as const) {
          if (opts?.[key]) params.set(key, String(opts[key]));
        }
        const rows = await apiFetch<any[]>(`/memory/search?${params.toString()}`);
        return { results: rows.map(cashMemoryRow), token_count: 0, total_found: rows.length };
      }),
  health: () => memFetch<any>('/memory/health').catch(() => apiFetch<any>('/memory/health')),
  budget: (ids: string[], tier?: string) =>
    memFetch<any>('/memory/budget', { method: 'POST', body: JSON.stringify({ ids, tier }) }),

  // Graph
  relate: (body: any) => memFetch<any>('/graph/relate', { method: 'POST', body: JSON.stringify(body) }),
  subgraph: (nodeId: string, depth = 2) => memFetch<any>(`/graph/${nodeId}?depth=${depth}`),

  // Learning
  review: (body: any) => memFetch<any>('/learning/review', { method: 'POST', body: JSON.stringify(body) }),
  lessons: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return memFetch<any[]>(`/learning/lessons${qs}`);
  },

  // Dreaming
  dreamingStatus: () => memFetch<any>('/dreaming/status'),
  triggerJob: (name: string) => memFetch<any>(`/dreaming/trigger/${name}`, { method: 'POST', body: '{}' }),

  // Self-improvement
  trackOutcome: (body: any) => memFetch<any>('/self-improvement/outcome', { method: 'POST', body: JSON.stringify(body) }),
  regressions: (agentId: string) => memFetch<any>(`/self-improvement/regressions/${agentId}`),
  proposeSkill: (body: any) => memFetch<any>('/self-improvement/skills/propose', { method: 'POST', body: JSON.stringify(body) }),
  approveSkill: (body: any) => memFetch<any>('/self-improvement/skills/approve', { method: 'POST', body: JSON.stringify(body) }),
  rollbackSkill: (body: any) => memFetch<any>('/self-improvement/skills/rollback', { method: 'POST', body: JSON.stringify(body) }),
  skillHistory: (name: string) => memFetch<any>(`/self-improvement/skills/${name}/history`),

  // Resources
  registerAgent: (body: any) => memFetch<any>('/resources/agents', { method: 'POST', body: JSON.stringify(body) }),
  heartbeat: (id: string) => memFetch<any>(`/resources/agents/${id}/heartbeat`, { method: 'POST', body: '{}' }),
  recordTokens: (id: string, tokens: number) =>
    memFetch<any>(`/resources/agents/${id}/tokens`, { method: 'POST', body: JSON.stringify({ tokens }) }),
  priorityQueue: () => memFetch<any[]>('/resources/agents'),
  agentBudget: (id: string) => memFetch<any>(`/resources/agents/${id}`),
  hibernateAgent: (id: string) => memFetch<any>(`/resources/agents/${id}/hibernate`, { method: 'POST', body: '{}' }),
  wakeAgent: (id: string) => memFetch<any>(`/resources/agents/${id}/wake`, { method: 'POST', body: '{}' }),
  sweepZombies: () => memFetch<any>('/resources/sweep', { method: 'POST', body: '{}' }),

  // Security
  redTeamFindings: () => memFetch<any[]>('/red-team/findings'),
  createFinding: (body: any) => memFetch<any>('/red-team/findings', { method: 'POST', body: JSON.stringify(body) }),
  runRedTest: (type: string, body: any) =>
    memFetch<any>(`/red-team/test/${type}`, { method: 'POST', body: JSON.stringify(body) }),
  blueAlerts: () => memFetch<any[]>('/blue-team/alerts'),
  createAlert: (body: any) => memFetch<any>('/blue-team/alerts', { method: 'POST', body: JSON.stringify(body) }),
  incidents: () => memFetch<any[]>('/blue-team/incidents'),
  createIncident: (body: any) => memFetch<any>('/blue-team/incidents', { method: 'POST', body: JSON.stringify(body) }),
  iocs: () => memFetch<any[]>('/blue-team/ioc'),
  purpleFindings: () => memFetch<any>('/purple-team/findings'),
  purpleTrends: () => memFetch<any>('/purple-team/trends'),

  // Governance
  approvals: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return memFetch<any[]>(`/governance/approvals${qs}`);
  },
  requestApproval: (body: any) => memFetch<any>('/governance/approvals', { method: 'POST', body: JSON.stringify(body) }),
  reviewApproval: (id: string, body: any) =>
    memFetch<any>(`/governance/approvals/${id}/review`, { method: 'POST', body: JSON.stringify(body) }),
  killSwitchStatus: () => memFetch<any>('/governance/kill-switch'),
  activateKillSwitch: (body: any) =>
    memFetch<any>('/governance/kill-switch/activate', { method: 'POST', body: JSON.stringify(body) }),
  auditLog: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return memFetch<any[]>(`/governance/audit${qs}`);
  },
};
