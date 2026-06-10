import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Project, ChatSession, Workspace } from '../types';

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED_WORKSPACES: Workspace[] = [
  { id: 'personal', name: 'Personal', type: 'personal', gradient: 'linear-gradient(135deg,#00E6A8,#3b82f6)', initials: 'P' },
  { id: 'avraxeai', name: 'AvraxeAi', type: 'org', orgId: 'avraxeai', gradient: 'linear-gradient(135deg,#f59e0b,#f97316)', initials: 'A' },
];

const SEED_PROJECTS: Project[] = [
  { id: 'construction', workspaceId: 'avraxeai', name: 'My Construction Co.', status: 'active', visibility: 'private', createdAt: '2026-05-01', updatedAt: '2026-06-04' },
  { id: 'marketing',    workspaceId: 'avraxeai', name: 'Marketing Agency',     status: 'active', visibility: 'private', createdAt: '2026-04-15', updatedAt: '2026-06-03' },
];

const SEED_SESSIONS: ChatSession[] = [
  { id: 'c1', projectId: 'construction', title: 'Chat with Lisa',        mode: 'private', participants: ['user', 'lisa'],  lastMessageAt: '2026-06-04T10:00:00Z', createdAt: '2026-06-04T09:00:00Z' },
  { id: 'c2', projectId: 'construction', title: 'Project kickoff brief', mode: 'private', participants: ['user'],          lastMessageAt: '2026-06-03T18:00:00Z', createdAt: '2026-06-03T18:00:00Z' },
  { id: 'c3', projectId: 'construction', title: 'Budget review Q2',      mode: 'private', participants: ['user'],          lastMessageAt: '2026-06-01T14:00:00Z', createdAt: '2026-06-01T14:00:00Z' },
  { id: 'c4', projectId: 'marketing',    title: 'Brand strategy 2026',   mode: 'private', participants: ['user'],          lastMessageAt: '2026-06-04T08:00:00Z', createdAt: '2026-06-04T08:00:00Z' },
  { id: 'c5', projectId: 'marketing',    title: 'Social calendar',       mode: 'private', participants: ['user'],          lastMessageAt: '2026-06-02T12:00:00Z', createdAt: '2026-06-02T12:00:00Z' },
  { id: 'd1', title: 'Lisa',             mode: 'private', participants: ['user', 'lisa'],  lastMessageAt: '2026-06-04T11:00:00Z', createdAt: '2026-05-01T00:00:00Z' },
  { id: 'd2', title: 'Personal notes',   mode: 'private', participants: ['user'],          lastMessageAt: '2026-06-03T09:00:00Z', createdAt: '2026-04-01T00:00:00Z' },
  { id: 'org-main', orgId: 'avraxeai', title: 'AvraxeAi general', mode: 'org', participants: [], lastMessageAt: '2026-06-04T07:00:00Z', createdAt: '2026-01-01T00:00:00Z' },
];

// ── Context shape ─────────────────────────────────────────────────────────────
interface ProjectContextValue {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  setActiveWorkspaceId: (id: string) => void;

  projects: Project[];
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  projectsForWorkspace: (workspaceId: string) => Project[];

  sessions: ChatSession[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  sessionsForProject: (projectId: string) => ChatSession[];
  directSessions: ChatSession[];
  orgSessions: ChatSession[];

  createProject: (name: string, workspaceId: string) => Project;
  createSession: (opts: Partial<ChatSession> & { title: string; mode: ChatSession['mode'] }) => ChatSession;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [workspaces] = useState<Workspace[]>(SEED_WORKSPACES);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('avraxeai');
  const [projects, setProjects] = useState<Project[]>(SEED_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string | null>('construction');
  const [sessions, setSessions] = useState<ChatSession[]>(SEED_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string | null>('c1');

  const createProject = (name: string, workspaceId: string): Project => {
    const project: Project = {
      id: `proj-${Date.now()}`,
      workspaceId,
      name,
      status: 'active',
      visibility: 'private',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProjects(prev => [project, ...prev]);
    return project;
  };

  const createSession = (opts: Partial<ChatSession> & { title: string; mode: ChatSession['mode'] }): ChatSession => {
    const session: ChatSession = {
      id: `sess-${Date.now()}`,
      participants: ['user'],
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...opts,
    };
    setSessions(prev => [session, ...prev]);
    return session;
  };

  const value = useMemo<ProjectContextValue>(() => ({
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    projects,
    activeProjectId,
    setActiveProjectId,
    projectsForWorkspace: (id) => projects.filter(p => p.workspaceId === id),
    sessions,
    activeSessionId,
    setActiveSessionId,
    sessionsForProject: (id) => sessions.filter(s => s.projectId === id),
    directSessions: sessions.filter(s => !s.projectId && !s.orgId),
    orgSessions: sessions.filter(s => Boolean(s.orgId)),
    createProject,
    createSession,
  }), [workspaces, activeWorkspaceId, projects, activeProjectId, sessions, activeSessionId]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
