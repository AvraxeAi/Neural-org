import React, { useState } from 'react';
import {
  Bot, Brain, Building2, CheckSquare, ChevronDown, ChevronRight,
  ExternalLink, FileText, Filter, GitBranch, Home, LayoutGrid,
  Lightbulb, Mic, MessageSquare, PanelLeftClose, PanelLeftOpen,
  PenLine, Plug, Plus, Search, Send, Settings, Shield,
  SlidersHorizontal, Vote,
} from 'lucide-react';

type ChatMode = 'private' | 'org' | 'ai-only';
export interface ChatProps {
  mode: ChatMode;
  onNavigate?: (id: string) => void;
}

const NAV_ITEMS = [
  { id: 'home',         label: 'Home',         icon: Home },
  { id: 'chat',         label: 'AI Chat',      icon: MessageSquare },
  { id: 'org',          label: 'Organization', icon: Building2 },
  { id: 'board',        label: 'Boards',       icon: LayoutGrid },
  { id: 'proposals',    label: 'Proposals',    icon: FileText },
  { id: 'workflows',    label: 'Workflows',    icon: GitBranch },
  { id: 'security',     label: 'Security',     icon: Shield },
  { id: 'memory',       label: 'Memory',       icon: Brain },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'settings',     label: 'Settings',     icon: Settings },
];

const RECENT_CHATS = [
  { label: 'Q2 Budget Proposal',       date: 'Today'     },
  { label: 'Security Audit Findings',  date: 'Yesterday' },
  { label: 'Workflow Automation Plan', date: 'May 18'    },
  { label: 'Agent Performance Review', date: 'May 17'    },
  { label: 'Board Meeting Summary',    date: 'May 16'    },
];

const CHIPS = [
  { label: 'Summarize board meeting from May 20',       icon: FileText    },
  { label: 'What are the pending votes?',               icon: Vote        },
  { label: 'Show security alerts from this week',       icon: Shield      },
  { label: 'Draft a proposal for workflow automation',  icon: PenLine     },
];

export default function Chat({ onNavigate }: ChatProps) {
  const [activeChat, setActiveChat] = useState('Q2 Budget Proposal');
  const [message, setMessage] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#0b0b0b' }}>
      {/* ── Combined sidebar ── */}
      <aside style={{
        width: collapsed ? 56 : 240,
        flexShrink: 0,
        background: '#111',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.18s ease',
        overflow: 'hidden',
      }}>
        {/* Branding row */}
        <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <AvaiLogo />
          {!collapsed && <strong style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', flex: 1 }}>AVAI</strong>}
          {!collapsed && (
            <button style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <ExternalLink size={12} />
            </button>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            title={collapsed ? 'Expand' : 'Collapse'}
            style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
          >
            {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        </div>

        {/* New Chat button */}
        <div style={{ padding: collapsed ? '10px 6px' : '10px 10px 6px', flexShrink: 0 }}>
          {collapsed ? (
            <button title="New Chat" style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <Plus size={16} />
            </button>
          ) : (
            <button style={{ width: '100%', display: 'flex', alignItems: 'center', height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-raise)', color: 'var(--text-primary)', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <Plus size={15} />
              <span style={{ flex: 1, textAlign: 'left' }}>New Chat</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: 4, fontFamily: 'monospace' }}>⌘K</span>
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = item.id === 'chat';
            return (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.id)}
                title={collapsed ? item.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  height: 34, padding: collapsed ? '0' : '0 10px',
                  borderRadius: 8, border: 'none',
                  background: isActive ? 'rgba(16,185,129,0.1)' : 'transparent',
                  color: isActive ? '#10b981' : 'var(--text-secondary)',
                  fontSize: 13, cursor: 'pointer',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  position: 'relative', width: '100%', textAlign: 'left',
                }}
              >
                {isActive && !collapsed && (
                  <div style={{ position: 'absolute', left: 0, top: 7, bottom: 7, width: 2.5, background: '#10b981', borderRadius: 2 }} />
                )}
                <Icon size={15} strokeWidth={1.8} />
                {!collapsed && <span style={{ fontSize: 13 }}>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Recent Chats section */}
        {!collapsed && (
          <>
            <div style={{ padding: '16px 16px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0 }}>
              Recent Chats
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px' }}>
              {RECENT_CHATS.map(chat => (
                <button
                  key={chat.label}
                  onClick={() => setActiveChat(chat.label)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    height: 34, padding: '0 10px', borderRadius: 8, border: 'none',
                    background: activeChat === chat.label ? 'rgba(255,255,255,0.05)' : 'transparent',
                    color: activeChat === chat.label ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: 12, cursor: 'pointer', textAlign: 'left', gap: 8,
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{chat.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{chat.date}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => {}}
              style={{ height: 36, padding: '0 16px', border: 'none', background: 'transparent', color: '#10b981', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
            >
              View all chats <ChevronRight size={13} />
            </button>
          </>
        )}
        {collapsed && <div style={{ flex: 1 }} />}

        {/* User row */}
        <button style={{
          height: 62, padding: collapsed ? '0 12px' : '0 14px',
          border: 'none', borderTop: '1px solid var(--border)',
          background: 'transparent', display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer', flexShrink: 0, width: '100%',
        }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'grid', placeItems: 'center', color: '#6ee7b7', fontSize: 11, fontWeight: 700, flexShrink: 0, position: 'relative' }}>
            RK
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: '#10b981', border: '2px solid #111' }} />
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Rusty Khan</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Administrator</div>
              </div>
              <ChevronDown size={14} color="var(--text-muted)" />
            </>
          )}
        </button>
      </aside>

      {/* ── Main chat area ── */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#0b0b0b', position: 'relative' }}>
        {/* Top bar */}
        <header style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid var(--border)', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>AI Chat</span>
          <ChevronDown size={15} color="var(--text-muted)" />
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px', height: 32, width: 220 }}>
            <Search size={13} color="var(--text-muted)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>Search anything...</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>⌘K</span>
          </div>
          <button style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <Filter size={14} />
          </button>
          <button style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <SlidersHorizontal size={14} />
          </button>
        </header>

        {/* Empty state */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '10%' }}>
          <AvaiHexLogo />
          <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 22, marginBottom: 8, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Hello, Rusty</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>How can I help you today?</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 280px))', gap: 10, marginTop: 36 }}>
            {CHIPS.map(chip => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.label}
                  onClick={() => setMessage(chip.label)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
                    borderRadius: 12, border: '1px solid var(--border)',
                    background: 'var(--surface)', color: 'var(--text-primary)',
                    fontSize: 13, cursor: 'pointer', textAlign: 'left', lineHeight: 1.45,
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-raise)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
                >
                  <Icon size={18} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Composer */}
        <div style={{ padding: '0 20px 20px', flexShrink: 0 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Message AVAI Assistant..."
              rows={2}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 14, resize: 'none', outline: 'none', lineHeight: 1.5 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <Plus size={18} />
              </button>
              <button style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <SlidersHorizontal size={15} />
              </button>
              <div style={{ flex: 1 }} />
              <button style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--text-muted)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <Mic size={18} />
              </button>
              <button
                aria-label="Send"
                style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#f3f4f6', color: '#111', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-subtle)', marginTop: 10 }}>
            AVAI can make mistakes. Consider checking important information.
          </p>
        </div>
      </main>
    </div>
  );
}

function AvaiLogo() {
  return (
    <div style={{ width: 28, height: 28, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
      <svg width="26" height="30" viewBox="0 0 26 30" fill="none">
        <polygon points="13,1 25,7.5 25,22.5 13,29 1,22.5 1,7.5" stroke="#10b981" strokeWidth="1.8" fill="none" />
        <polygon points="13,7 19,10.5 19,17.5 13,21 7,17.5 7,10.5" stroke="#10b981" strokeWidth="1.2" fill="none" opacity="0.55" />
        <path d="M9 11 L13 19 L17 11" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
}

function AvaiHexLogo() {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', inset: '-18px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <svg width="72" height="82" viewBox="0 0 72 82" fill="none">
        <polygon points="36,2 70,20 70,62 36,80 2,62 2,20" stroke="#10b981" strokeWidth="2" fill="rgba(16,185,129,0.04)" />
        <polygon points="36,14 58,26 58,54 36,66 14,54 14,26" stroke="#10b981" strokeWidth="1.5" fill="none" opacity="0.45" />
        <polygon points="36,24 50,32 50,50 36,58 22,50 22,32" stroke="#10b981" strokeWidth="1" fill="none" opacity="0.25" />
        <path d="M27 31 L36 53 L45 31" stroke="#10b981" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
}
