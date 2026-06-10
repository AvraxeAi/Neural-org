import { appConfig, hasApiBaseUrl } from './config';

export type ProviderStatus = 'connected' | 'disconnected' | 'connecting';

export type ProviderUsage = {
  provider: 'openai' | 'claude';
  displayName: string;
  status: ProviderStatus;
  accountLabel?: string;
  usedPercent?: number;
  limitText?: string;
  resetDate?: string;
};

export type ProviderId = ProviderUsage['provider'];

export const DEFAULT_PROVIDER_USAGE: ProviderUsage[] = [
  { provider: 'openai', displayName: 'Codex / OpenAI', status: 'disconnected' },
  { provider: 'claude', displayName: 'Claude (Anthropic)', status: 'disconnected' },
];

export async function fetchProviderUsage(): Promise<ProviderUsage[]> {
  if (!hasApiBaseUrl) return DEFAULT_PROVIDER_USAGE;
  try {
    const data = await request<{ providers: ProviderUsage[] }>('/providers/usage');
    return Array.isArray(data.providers) && data.providers.length > 0
      ? data.providers
      : DEFAULT_PROVIDER_USAGE;
  } catch {
    return DEFAULT_PROVIDER_USAGE;
  }
}

export type GatewaySummary = {
  ok: boolean;
  source: 'live' | 'demo';
  environment: string;
  latencyMs?: number;
  activeThreads?: number;
  activeAgents?: number;
  dailyCostUsd?: number;
  message?: string;
};

const DEFAULT_SUMMARY: GatewaySummary = {
  ok: false,
  source: 'demo',
  environment: 'Not connected',
  latencyMs: undefined,
  activeThreads: undefined,
  activeAgents: undefined,
  dailyCostUsd: undefined,
  message: 'Set VITE_API_BASE_URL to wire the real gateway API.',
};

export function getToken(): string {
  return (window as any).__OPENCLAW_TOKEN || appConfig.gatewayToken || '';
}

export function authHeaders(): Record<string, string> {
  const tok = getToken();
  return tok
    ? { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), appConfig.apiTimeoutMs);
  const body = init?.body;
  const headers = { ...authHeaders(), ...(init?.headers as any) };
  const url = path.startsWith('http') ? path : `${appConfig.apiBaseUrl}/api${path.startsWith('/') ? path : `/${path}`}`;
  if (body instanceof FormData) delete (headers as any)['Content-Type'];
  try {
    const res = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

export const agentsApi = {
  list: () => apiFetch<any[]>('/agents'),
  create: (body: any) => apiFetch<any>('/agents', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: any) => apiFetch<any>(`/agents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  clone: (id: string) => apiFetch<any>(`/agents/${id}/clone`, { method: 'POST', body: '{}' }),
  disable: (id: string) => apiFetch<any>(`/agents/${id}/disable`, { method: 'POST', body: '{}' }),
  goals: (id: string) => apiFetch<any[]>(`/agents/${encodeURIComponent(id)}/goals`),
  addGoal: (id: string, body: any) => apiFetch<any>(`/agents/${encodeURIComponent(id)}/goals`, { method: 'POST', body: JSON.stringify(body) }),
  schedule: (id: string) => apiFetch<any[]>(`/agents/${encodeURIComponent(id)}/schedule`),
};

export const memoryApi = {
  list: () => apiFetch<any[]>('/memory'),
  create: (body: any) => apiFetch<any>('/memory', { method: 'POST', body: JSON.stringify(body) }),
  update: (key: string, body: any) => apiFetch<any>(`/memory/${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (key: string) => apiFetch<any>(`/memory/${encodeURIComponent(key)}`, { method: 'DELETE' }),
};

export const workflowsApi = {
  list: () => apiFetch<any[]>('/workflows'),
  save: (id: string, body: any) => apiFetch<any>(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deploy: (id: string) => apiFetch<any>('/workflows/deploy', { method: 'POST', body: JSON.stringify({ id }) }),
};

export const metricsApi = {
  get: () => apiFetch<any>('/analytics/summary'),
};

export const orgsApi = {
  list: () => apiFetch<any[]>(`${appConfig.apiBaseUrl}/orgs`),
};

export const orgTasksApi = {
  list: () => apiFetch<any[]>('/tasks'),
  create: (body: any) => apiFetch<any>('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: any) => apiFetch<any>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};

export async function chatSend(body: {
  message: string;
  agent_id: string;
  model: string;
  memory_scope: string;
  user_id?: string;
  org_id?: string | null;
  project_id?: string | null;
  chat_id?: string | null;
  threadId?: string | null;
}): Promise<Response> {
  return fetch('/chat/send', {
    method: 'POST',
    headers: { ...authHeaders(), Accept: 'text/event-stream' },
    body: JSON.stringify(body),
  });
}

async function request<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), appConfig.apiTimeoutMs);

  try {
    const response = await fetch(`${appConfig.apiBaseUrl}/api${path}`, {
      headers: { ...authHeaders(), Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
}

export async function fetchGatewaySummary(): Promise<GatewaySummary> {
  if (!hasApiBaseUrl) return DEFAULT_SUMMARY;

  const started = performance.now();

  try {
    const [health, status] = await Promise.allSettled([
      request<any>('/health'),
      request<any>('/status'),
    ]);

    const healthData = health.status === 'fulfilled' ? health.value : {};
    const statusData = status.status === 'fulfilled' ? status.value : {};
    const elapsed = Math.round(performance.now() - started);

    return {
      ok: true,
      source: 'live',
      environment:
        statusData.region ||
        statusData.environment ||
        statusData.cluster ||
        healthData.region ||
        'Connected gateway',
      latencyMs: pickNumber(statusData.latencyMs, healthData.latencyMs, elapsed),
      activeThreads: pickNumber(statusData.activeThreads, statusData.threads, statusData.threadCount),
      activeAgents: pickNumber(statusData.activeAgents, statusData.agents, statusData.agentCount),
      dailyCostUsd: pickNumber(statusData.dailyCostUsd, statusData.dailySpend, statusData.costToday),
      message: 'Live data from gateway API.',
    };
  } catch (error) {
    return {
      ...DEFAULT_SUMMARY,
      message: error instanceof Error ? error.message : 'Unable to reach gateway API.',
    };
  }
}
