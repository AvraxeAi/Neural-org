import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OrgProvider } from './contexts/OrgContext';
import { Toaster } from './components/ui/sonner';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrgChartPage from './pages/OrgChartPage';
import AgentsPage from './pages/AgentsPage';
import BoardPage from './pages/BoardPage';
import WorkflowsPage from './pages/WorkflowsPage';
import MessagesPage from './pages/MessagesPage';
import SettingsPage from './pages/SettingsPage';
import AppLayout from './components/Layout/AppLayout';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{background:'hsl(var(--background))'}}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading OpenClaw...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <OrgProvider>
      <AppLayout>{children}</AppLayout>
    </OrgProvider>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/org-chart" element={<ProtectedRoute><OrgChartPage /></ProtectedRoute>} />
            <Route path="/agents" element={<ProtectedRoute><AgentsPage /></ProtectedRoute>} />
            <Route path="/board" element={<ProtectedRoute><BoardPage /></ProtectedRoute>} />
            <Route path="/workflows" element={<ProtectedRoute><WorkflowsPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </div>
  );
}

export default App;
