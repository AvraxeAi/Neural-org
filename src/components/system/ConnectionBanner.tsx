import React, { useState } from 'react';
import type { GatewaySummary } from '../../lib/api';

export function ConnectionBanner({ summary, onConfigure }: { summary: GatewaySummary; onConfigure: () => void }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || summary.ok) return null;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 16px 7px 14px',
        borderBottom: '1px solid rgba(245,158,11,0.18)',
        background: 'rgba(245,158,11,0.07)',
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 13, flexShrink: 0, color: '#B45309' }}>⚠</span>
      <span style={{ color: '#9A6700', flex: 1, lineHeight: 1.3 }}>
        Gateway not connected —{' '}
        <span style={{ opacity: 0.8 }}>
          {summary.message ?? 'Set VITE_API_BASE_URL in your .env to connect the live gateway.'}
        </span>
      </span>
      <button
        style={{
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 7,
          padding: '4px 12px',
          fontSize: 11,
          fontWeight: 700,
          color: '#B45309',
          cursor: 'pointer',
          fontFamily: "'Outfit', sans-serif",
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
        onClick={onConfigure}
      >
        Configure API
      </button>
      <button
        aria-label="Dismiss banner"
        onClick={() => setDismissed(true)}
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          fontSize: 12,
          color: 'var(--text-muted)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ✕
      </button>
    </div>
  );
}
