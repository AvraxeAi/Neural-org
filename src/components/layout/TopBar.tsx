import React from 'react';
import { Bell, Search } from 'lucide-react';

interface TopBarProps {
  onNav: (id: string) => void;
  currentUserName: string;
}

export default function TopBar({ onNav, currentUserName }: TopBarProps) {
  return (
    <header className="global-topbar">
      <div />
      <div className="topbar-actions">
        <label className="global-search">
          <Search size={14} />
          <input aria-label="Search anything" placeholder="Search anything..." />
          <kbd>⌘ K</kbd>
        </label>
        <button className="icon-button" title="Notifications"><Bell size={15} /></button>
        <span className="online-indicator" />
        <button className="topbar-avatar" title={currentUserName} onClick={() => onNav('settings')}>
          {currentUserName.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}
        </button>
      </div>
    </header>
  );
}
