import React from 'react';

interface AppShellProps {
  sidebar: React.ReactNode;
  topBar?: React.ReactNode;
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export default function AppShell({ sidebar, topBar, children, rightPanel }: AppShellProps) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--canvas)' }}>
      {sidebar}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, background: 'var(--canvas)' }}>
        {topBar}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>
      {rightPanel}
    </div>
  );
}
