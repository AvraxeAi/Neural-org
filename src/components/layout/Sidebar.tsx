import React, { useState } from 'react';
import {
  Bot, Brain, Building2, CheckSquare, ExternalLink, FileText, GitBranch, Home, LayoutGrid,
  MessageSquare, PanelLeftClose, PanelLeftOpen, Plug, Settings, Shield,
} from 'lucide-react';

interface SidebarProps {
  active: string;
  onNav: (id: string) => void;
  currentUserName: string;
  defaultCollapsed?: boolean;
}

const NAV = [
  { id: 'home',         label: 'Home',         icon: Home },
  { id: 'chat',         label: 'AI Chat',      icon: MessageSquare },
  { id: 'org',          label: 'Organization', icon: Building2 },
  { id: 'proposals',    label: 'Proposals',    icon: FileText },
  { id: 'board',        label: 'Boards',       icon: LayoutGrid },
  { id: 'tasks',        label: 'Tasks',        icon: CheckSquare },
  { id: 'workflows',    label: 'Workflows',    icon: GitBranch },
  { id: 'agents',       label: 'Agents',       icon: Bot },
  { id: 'security',     label: 'Security',     icon: Shield },
  { id: 'memory',       label: 'Memory',       icon: Brain },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'settings',     label: 'Settings',     icon: Settings },
];

const ORG_NAV = [
  ['chart', 'Org Chart'], ['people', 'People'], ['departments', 'Departments'], ['teams', 'Teams'],
  ['invitations', 'Invitations'], ['permissions', 'Roles & Permissions'], ['governance', 'Governance'],
] as const;

export default function Sidebar({ active, onNav, currentUserName, defaultCollapsed = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [organizationTab, setOrganizationTab] = useState('chart');
  const initials = currentUserName.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();

  React.useEffect(() => {
    const onTab = (event: Event) => setOrganizationTab((event as CustomEvent<string>).detail);
    window.addEventListener('avai:organization-tab', onTab);
    return () => window.removeEventListener('avai:organization-tab', onTab);
  }, []);

  return (
    <aside className={`main-sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="brand-row">
        <div className="brand-mark">O</div>
        {!collapsed && (
          <div className="brand-copy">
            <strong>OpenClaw</strong>
            <span>Command Center</span>
          </div>
        )}
        <button
          className="icon-button collapse-button"
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      <nav className="main-nav">
        {NAV.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`main-nav-item ${active === item.id ? 'is-active' : ''}`}
              onClick={() => onNav(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} strokeWidth={1.8} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
        {active === 'org' && !collapsed && (
          <div className="organization-subnav" aria-label="Organization sections">
            <span>Organization</span>
            {ORG_NAV.map(([id, label], index) => (
              <button
                key={label}
                className={organizationTab === id ? 'is-active' : ''}
                onClick={() => {
                  onNav('org');
                  window.dispatchEvent(new CustomEvent('avai:organization-tab', { detail: id }));
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </nav>

      <a
        href="https://cash.srv1427612.hstgr.cloud"
        target="_blank"
        rel="noopener noreferrer"
        className="main-nav-item"
        title="Open Cash Agent"
        style={{ textDecoration: 'none' }}
      >
        <ExternalLink size={16} strokeWidth={1.8} />
        {!collapsed && <span>Cash Agent</span>}
      </a>

      <button className="sidebar-user" onClick={() => onNav('settings')}>
        <span className="user-avatar">{initials || 'RK'}</span>
        {!collapsed && (
          <span className="user-copy">
            <strong>{currentUserName}</strong>
            <small>Administrator</small>
          </span>
        )}
      </button>
    </aside>
  );
}
