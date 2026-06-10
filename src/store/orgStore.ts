import { create } from 'zustand';
import { apiFetch } from '../lib/api';

export type NodeType = 'human' | 'agent' | 'department' | 'committee' | 'board' | 'team';
export type NodePermission = 'owner' | 'admin' | 'operator' | 'member' | 'guest';
export type NodeProvider = 'anthropic' | 'openai' | 'google' | 'custom' | null;
export type RelationshipType = 'reports_to' | 'advises' | 'manages' | 'board_oversight' | 'temp_assignment';

export interface OrgMember {
  id: string;
  name: string;
  title: string;
  type: NodeType;
  department?: string;
  description?: string;
  model?: string | null;
  provider?: NodeProvider;
  email?: string;
  status: 'online' | 'busy' | 'offline' | 'idle';
  initial: string;
  color: string;
  parentId: string | null;
  permissionType: NodePermission;
  isBoardMember?: boolean;
  hasVotingRights?: boolean;
  governanceRole?: string;
  agentName?: string | null;
}

export interface OrgRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  label?: string;
}

export interface OrgDepartment {
  id: string;
  name: string;
  description?: string;
  headId?: string;
  color?: string;
}

interface OrgState {
  members: OrgMember[];
  relationships: OrgRelationship[];
  departments: OrgDepartment[];
  govLocked: boolean;

  // Actions
  addMember: (m: OrgMember) => void;
  updateMember: (id: string, patch: Partial<OrgMember>) => void;
  loadMembers: () => Promise<void>;
  syncMember: (member: OrgMember) => Promise<OrgMember>;
  deleteMember: (id: string) => Promise<void>;
  addRelationship: (r: OrgRelationship) => void;
  removeRelationship: (id: string) => void;
  addDepartment: (d: OrgDepartment) => void;
  updateDepartment: (id: string, patch: Partial<OrgDepartment>) => void;
  setGovLocked: (v: boolean) => void;
  toggleGovLocked: () => void;
}

const DEFAULT_MEMBERS: OrgMember[] = [
  {
    id: 'rusty', name: 'Rusty', title: 'Owner', type: 'human',
    department: 'Executive', status: 'online', initial: 'R', color: '#f59e0b',
    parentId: null, permissionType: 'owner', isBoardMember: true, hasVotingRights: true,
    governanceRole: 'Chair', provider: null, model: null,
  },
  {
    id: 'openclaw-cash', name: 'Cash', title: 'COO', type: 'agent',
    department: 'Executive', status: 'online', initial: 'C', color: '#2dd4bf',
    parentId: 'rusty', permissionType: 'admin', isBoardMember: true, hasVotingRights: true,
    agentName: 'openclaw-cash', provider: 'anthropic', model: 'claude-sonnet-4-6',
  },
  {
    id: 'hermes-lisa', name: 'Lisa', title: 'CMO', type: 'agent',
    department: 'Marketing', status: 'online', initial: 'L', color: '#8b5cf6',
    parentId: 'openclaw-cash', permissionType: 'admin', isBoardMember: true, hasVotingRights: true,
    agentName: 'hermes-lisa', provider: 'anthropic', model: 'claude-sonnet-4-6',
  },
  {
    id: 'cody', name: 'Cody', title: 'Lead Engineer', type: 'human',
    department: 'Engineering', status: 'busy', initial: 'CO', color: '#3b82f6',
    parentId: 'rusty', permissionType: 'member', hasVotingRights: false, provider: null, model: null,
  },
  {
    id: 'andrea', name: 'Andrea', title: 'Marketing Lead', type: 'human',
    department: 'Marketing', status: 'idle', initial: 'A', color: '#ec4899',
    parentId: 'hermes-lisa', permissionType: 'member', provider: null, model: null,
  },
  {
    id: 'sheryl', name: 'Sheryl', title: 'Advisor', type: 'human',
    department: 'Executive', status: 'offline', initial: 'S', color: '#94a3b8',
    parentId: 'rusty', permissionType: 'member', isBoardMember: true, hasVotingRights: true,
    provider: null, model: null,
  },
];

const DEFAULT_DEPARTMENTS: OrgDepartment[] = [
  { id: 'executive',    name: 'Executive',    description: 'Leadership and strategy', headId: 'rusty',        color: '#f59e0b' },
  { id: 'engineering',  name: 'Engineering',  description: 'Product and platform',    headId: 'cody',         color: '#3b82f6' },
  { id: 'marketing',    name: 'Marketing',    description: 'Growth and brand',        headId: 'hermes-lisa',  color: '#8b5cf6' },
];

function adaptMember(node: any): OrgMember {
  return {
    id: node.id,
    name: node.name,
    title: node.title,
    type: node.type,
    parentId: node.reports_to,
    color: node.avatar_color,
    status: node.status === 'active' ? 'online' : 'offline',
    agentName: node.container,
    initial: node.name?.[0]?.toUpperCase() || '?',
    permissionType: node.id === 'node-rusty' ? 'owner' : node.type === 'agent' ? 'admin' : 'member',
    model: null,
    provider: null,
    department: undefined,
  };
}

function serializeMember(member: OrgMember) {
  return {
    name: member.name,
    title: member.title,
    type: member.type,
    reports_to: member.parentId,
    avatar_color: member.color,
    status: member.status === 'online' ? 'active' : 'inactive',
    container: member.agentName,
  };
}

export const useOrgStore = create<OrgState>()((set, get) => ({
  members: DEFAULT_MEMBERS,
  relationships: [],
  departments: DEFAULT_DEPARTMENTS,
  govLocked: false,

  addMember: (member) => set((state) => ({ members: [...state.members, member] })),
  updateMember: (id, patch) =>
    set((state) => ({ members: state.members.map((member) => (member.id === id ? { ...member, ...patch } : member)) })),
  loadMembers: async () => {
    try {
      const rows = await apiFetch<any[]>('/org/members');
      if (rows.length > 0) set({ members: rows.map(adaptMember) });
    } catch {
      if (get().members.length === 0) set({ members: DEFAULT_MEMBERS });
    }
  },
  syncMember: async (member) => {
    const isNew = member.id.startsWith('new-');
    const row = await apiFetch<any>(isNew ? '/org/members' : `/org/members/${encodeURIComponent(member.id)}`, {
      method: isNew ? 'POST' : 'PATCH',
      body: JSON.stringify(serializeMember(member)),
    });
    const saved = adaptMember(row);
    set((state) => ({
      members: state.members.map((item) => item.id === member.id ? saved : item),
    }));
    return saved;
  },
  deleteMember: async (id) => {
    await apiFetch(`/org/members/${encodeURIComponent(id)}`, { method: 'DELETE' });
    set((state) => ({ members: state.members.filter((member) => member.id !== id) }));
  },
  addRelationship: (relationship) => set((state) => ({ relationships: [...state.relationships, relationship] })),
  removeRelationship: (id) =>
    set((state) => ({ relationships: state.relationships.filter((relationship) => relationship.id !== id) })),
  addDepartment: (department) => set((state) => ({ departments: [...state.departments, department] })),
  updateDepartment: (id, patch) =>
    set((state) => ({ departments: state.departments.map((department) => (department.id === id ? { ...department, ...patch } : department)) })),
  setGovLocked: (value) => set({ govLocked: value }),
  toggleGovLocked: () => set((state) => ({ govLocked: !state.govLocked })),
}));

if (typeof window !== 'undefined') {
  window.setTimeout(() => {
    void useOrgStore.getState().loadMembers();
  }, 0);
}
