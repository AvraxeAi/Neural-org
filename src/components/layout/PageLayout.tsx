import React from 'react';

interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
}

export default function PageLayout({
  title, subtitle, tabs, activeTab, onTabChange, actions, children, noPadding,
}: PageLayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* Header */}
      <div style={{ flexShrink: 0, padding: '20px 28px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: subtitle ? 4 : 12 }}>
          <div>
            <h1 style={{
              fontSize: 22, fontWeight: 700, color: 'var(--text-primary)',
              letterSpacing: '-0.025em', lineHeight: 1.2,
            }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingTop: 2 }}>
              {actions}
            </div>
          )}
        </div>

        {/* Tab bar */}
        {tabs && tabs.length > 0 && (
          <nav style={{ display: 'flex', gap: 0, marginTop: 12, borderBottom: '1px solid var(--border)' }} aria-label="Page tabs">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', border: 'none', background: 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer', position: 'relative',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    marginBottom: -1,
                    transition: 'color 0.12s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                >
                  {tab.label}
                  {tab.badge != null && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, minWidth: 16,
                      padding: '1px 5px', borderRadius: 99,
                      background: isActive ? 'var(--accent-soft)' : 'rgba(255,255,255,0.07)',
                      color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', ...(noPadding ? {} : { padding: '20px 28px' }) }}>
        {children}
      </div>
    </div>
  );
}

/* ── Button helpers ── */
export function PrimaryBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '7px 14px', borderRadius: 8, border: 'none',
      background: 'var(--accent)', color: '#0a0a0a',
      fontSize: 13, fontWeight: 600, cursor: 'pointer',
      transition: 'opacity 0.12s',
    }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  );
}

export function OutlineBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '7px 14px', borderRadius: 8,
      border: '1px solid var(--border)',
      background: 'transparent', color: 'var(--text-secondary)',
      fontSize: 13, fontWeight: 500, cursor: 'pointer',
      transition: 'background 0.12s, border-color 0.12s, color 0.12s',
    }}
      onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'var(--surface-raise)'; el.style.borderColor = 'var(--border-hover)'; el.style.color = 'var(--text-primary)'; }}
      onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'transparent'; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-secondary)'; }}
    >
      {children}
    </button>
  );
}
