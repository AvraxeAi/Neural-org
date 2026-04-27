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

async function request<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), appConfig.apiTimeoutMs);

  try {
    const response = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      headers: { Accept: 'application/json' },
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
