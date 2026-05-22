import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useOrg } from '../../contexts/OrgContext';
import api from '../../lib/api';
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartTooltip, XAxis } from 'recharts';
import { Activity, Wifi, AlertCircle, CheckCircle2, Clock, Cpu, Database } from 'lucide-react';
import { Badge } from '../ui/badge';

function ProviderCard({ provider }) {
  const isHealthy = provider.success_rate >= 90;
  const isWarning = provider.success_rate >= 70 && provider.success_rate < 90;
  const status = isHealthy ? 'healthy' : isWarning ? 'degraded' : 'down';
  const statusColors = { healthy: '#10b981', degraded: '#f59e0b', down: '#ef4444' };
  const sc = statusColors[status];

  const PROVIDER_COLORS = {
    openai: '#74aa9c', anthropic: '#d97706', gemini: '#4285f4',
    openrouter: '#8b5cf6', deepseek: '#22d3ee'
  };
  const pc = PROVIDER_COLORS[provider.provider] || '#6b7280';

  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold capitalize" style={{ color: 'rgba(255,255,255,0.85)' }}>{provider.provider}</p>
          <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{provider.model}</p>
        </div>
        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: sc, boxShadow: `0 0 6px ${sc}80` }} />
      </div>
      <div className="flex justify-between text-[10px]">
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>{provider.avg_latency_ms}ms</span>
        <span style={{ color: sc }}>{provider.success_rate}%</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>{provider.samples} samples</span>
      </div>
      <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ width: `${provider.success_rate}%`, background: sc, height: '100%', borderRadius: '9999px', transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

export default function HealthPanel({ orgId }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await api.get(`/orgs/${orgId}/health`);
      setHealth(res.data);
    } catch { } finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { fetchHealth(); const t = setInterval(fetchHealth, 30000); return () => clearInterval(t); }, [fetchHealth]);

  if (loading || !health) return (
    <div className="flex items-center justify-center h-24">
      <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = health.org_stats || {};
  const conn  = health.connections || {};

  return (
    <div className="space-y-4">
      {/* Connection stats */}
      <div className="grid grid-cols-2 gap-2">
        {[['WS Connections', conn.ws||0, Wifi, '#22d3ee'],
          ['Online Users', conn.online_users||0, Activity, '#10b981'],
          ['Events Today', stats.events_today||0, Cpu, '#f59e0b'],
          ['Memory Nodes', stats.memory_nodes||0, Database, '#a78bfa']].map(([label,val,Icon,color]) => (
          <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={12} style={{ color }} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
            </div>
            <p className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk', color }}>{val}</p>
          </div>
        ))}
      </div>

      {/* Provider health */}
      {health.providers?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>PROVIDERS</p>
          <div className="space-y-2">
            {health.providers.map((p,i) => <ProviderCard key={i} provider={p} />)}
          </div>
        </div>
      )}

      {/* Model routing */}
      {health.models?.routing && (
        <div>
          <p className="text-[10px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>MODEL ROUTING</p>
          <div className="space-y-1">
            {Object.entries(health.models.routing).slice(0,5).map(([task, {provider, model}]) => (
              <div key={task} className="flex items-center justify-between text-[10px] px-2 py-1 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="capitalize" style={{ color: 'rgba(255,255,255,0.5)' }}>{task}</span>
                <span className="font-mono" style={{ color: 'rgba(255,255,255,0.7)' }}>{provider}/{model}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
