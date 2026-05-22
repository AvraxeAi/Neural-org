import React, { useState } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { WSProvider } from '../../contexts/WSContext';
import Sidebar from './Sidebar';

export default function AppLayout({ children }) {
  const { currentOrg, loading } = useOrg();

  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{background:'hsl(var(--background))'}}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading organization...</p>
      </div>
    </div>
  );

  const content = (
    <div className="flex h-screen overflow-hidden" style={{background:'hsl(var(--background))'}}>
      {/* Background wash */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(900px circle at 10% 20%, rgba(34,211,238,0.06), transparent 55%), radial-gradient(700px circle at 85% 80%, rgba(245,158,11,0.05), transparent 60%)'
      }} />
      <Sidebar />
      <main className="flex-1 overflow-hidden relative z-10">
        {children}
      </main>
    </div>
  );

  if (!currentOrg) return content;

  return (
    <WSProvider orgId={currentOrg.id}>
      {content}
    </WSProvider>
  );
}
