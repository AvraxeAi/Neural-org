import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, MessageSquare, Lock, Building2, Users,
  Workflow, Zap, Brain, FileText, BarChart3, TerminalSquare,
  Settings, ChevronLeft, ChevronRight, type LucideIcon,
} from 'lucide-react';
import type { GatewaySummary } from '../../lib/api';

interface SidebarProps {
  active: string;
  onNav: (id: string) => void;
  summary: GatewaySummary;
  currentUserName: string;
  mobile?: boolean;
  mobileOpen?: boolean;
}

const ICON_MAP: Record<string, LucideIcon> = {
  dashboard:    LayoutDashboard,
  chat:         MessageSquare,
  personal:     Lock,
  org:          Building2,
  agents:       Users,
  workflows:    Workflow,
  capabilities: Zap,
  memory:       Brain,
  documents:    FileText,
  metrics:      BarChart3,
  terminal:     TerminalSquare,
  settings:     Settings,
};

const NAV = [
  { section: 'MAIN', items: [
    { id: 'dashboard', label: 'Dashboard'         },
    { id: 'chat',      label: 'Chat'              },
    { id: 'personal',  label: 'Personal Workspace'},
  ]},
  { section: 'WORKSPACE', items: [
    { id: 'org',          label: 'Organization'  },
    { id: 'agents',       label: 'Agents',       badge: 3 },
    { id: 'workflows',    label: 'Workflows'     },
    { id: 'capabilities', label: 'Capabilities'  },
  ]},
  { section: 'DATA', items: [
    { id: 'memory',    label: 'Memory Vault' },
    { id: 'documents', label: 'Documents'    },
    { id: 'metrics',   label: 'Metrics'      },
  ]},
  { section: 'SYSTEM', items: [
    { id: 'terminal', label: 'Terminal' },
    { id: 'settings', label: 'Settings' },
  ]},
];

export default function Sidebar({
  active, onNav, summary, currentUserName, mobile = false, mobileOpen = false,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (mobile) return false;
    return localStorage.getItem('openclaw:sidebar:collapsed') === 'true';
  });

  useEffect(() => {
    if (!mobile) {
      localStorage.setItem('openclaw:sidebar:collapsed', String(collapsed));
    }
  }, [collapsed, mobile]);

  // On mobile always show full width
  const isCollapsed = !mobile && collapsed;

  const width = isCollapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)';

  return (
    <aside
      style={{
        width,
        minWidth: width,
        background: 'var(--sidebar-bg)',
        backdropFilter: 'blur(18px) saturate(160%)',
        WebkitBackdropFilter: 'blur(18px) saturate(160%)',
        borderRight: '1px solid var(--glass-border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: mobile ? 'fixed' : 'relative',
        left: mobile ? 0 : 'auto',
        top: 0,
        zIndex: 20,
        boxShadow: '1px 0 16px rgba(0,0,0,0.04)',
        transform: mobile ? `translateX(${mobileOpen ? '0' : '-110%'})` : 'translateX(0)',
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1), transform 0.22s ease',
        overflow: 'hidden',
      }}
      aria-hidden={mobile && !mobileOpen}
    >
      {/* Logo + collapse button */}
      <div style={{
        padding: isCollapsed ? '16px 0' : '18px 16px 14px',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        position: 'relative',
      }}>
        {/* Logo icon */}
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'linear-gradient(135deg, #00E6A8 0%, #00B882 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 3px 10px rgba(0,230,168,0.3)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>C</span>
        </div>

        {/* Logo text — hidden when collapsed */}
        {!isCollapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>OpenClaw</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1 }}>Command Center</div>
          </div>
        )}

        {/* Collapse toggle — desktop only */}
        {!mobile && (
          <button
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              width: 22, height: 22,
              borderRadius: 6,
              border: '1px solid rgba(0,0,0,0.08)',
              background: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              position: isCollapsed ? 'absolute' : 'static',
              bottom: isCollapsed ? 6 : undefined,
              right: isCollapsed ? '50%' : undefined,
              transform: isCollapsed ? 'translateX(50%)' : undefined,
              color: 'var(--text-muted)',
            }}
          >
            {collapsed
              ? <ChevronRight size={12} />
              : <ChevronLeft size={12} />
            }
          </button>
        )}
      </div>

      {/* Workspace selector — hidden when collapsed */}
      {!isCollapsed && (
        <div style={{ padding: '10px 12px 8px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 10,
            padding: '7px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>
                  {currentUserName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{currentUserName}&apos;s Workspace</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Personal</div>
              </div>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>⌄</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: isCollapsed ? '8px 0' : '8px 8px' }}
      >
        {NAV.map(group => (
          <div key={group.section} style={{ marginBottom: isCollapsed ? 0 : 2 }}>
            {/* Section label — hidden when collapsed */}
            {!isCollapsed && (
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--text-muted)',
                padding: '9px 10px 4px',
              }}>
                {group.section}
              </div>
            )}

            {group.items.map(item => {
              const isActive = active === item.id;
              const Icon = ICON_MAP[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => onNav(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isCollapsed ? 0 : 9,
                    padding: isCollapsed ? '9px 0' : '8px 10px',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    borderRadius: 9,
                    border: 'none',
                    cursor: 'pointer',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(0,230,168,0.14), rgba(0,230,168,0.07))'
                      : 'transparent',
                    color: isActive ? 'var(--accent-dark)' : 'var(--text-secondary)',
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    transition: 'background 0.13s, color 0.13s',
                    marginBottom: 1,
                    boxShadow: isActive ? 'inset 0 0 0 1px rgba(0,230,168,0.22)' : 'none',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)';
                  }}
                  onMouseLeave={e => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  {Icon && (
                    <Icon
                      size={15}
                      style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }}
                    />
                  )}
                  {!isCollapsed && (
                    <>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {(item as { badge?: number }).badge != null && (
                        <span style={{
                          background: isActive ? 'var(--accent)' : 'rgba(0,0,0,0.09)',
                          color: isActive ? '#fff' : 'var(--text-secondary)',
                          fontSize: 10, fontWeight: 700,
                          padding: '1px 6px', borderRadius: 99,
                        }}>
                          {(item as { badge?: number }).badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom status */}
      <div style={{
        padding: isCollapsed ? '10px 0' : '10px 12px',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        flexShrink: 0,
      }}>
        {!isCollapsed && (
          <div style={{
            background: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 10, padding: '9px 11px',
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <span className={`status-dot ${summary.ok ? 'online' : 'offline'}`} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                {summary.environment}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Latency</span>
              <span style={{ fontSize: 10, fontWeight: 600, fontFamily: 'DM Mono, monospace', color: summary.ok ? 'var(--accent-dark)' : 'var(--text-muted)' }}>
                {summary.latencyMs != null ? `${summary.latencyMs}ms` : '—'}
              </span>
            </div>
            {summary.dailyCostUsd != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Daily spend</span>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace' }}>
                  ${summary.dailyCostUsd.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* User row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: isCollapsed ? '0' : '0 2px',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}>
          <div
            title={isCollapsed ? currentUserName : undefined}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #00E6A8, #3B82F6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            {currentUserName.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{currentUserName}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Owner</div>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)', padding: 2 }}>⋯</button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
