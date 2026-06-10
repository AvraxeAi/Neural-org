import { create } from 'zustand';

export type OrgEntityType = 'human' | 'agent' | 'department' | 'team' | 'committee' | 'board';
export type OrgRelationshipType = 'reports_to' | 'manages' | 'advises' | 'board_oversight' | 'temporary_assignment';
export type OrgStatus = 'active' | 'busy' | 'inactive' | 'invited';
export type AgentProvider = 'OpenClaw' | 'Hermes' | 'Claude' | 'Codex' | 'Gemini' | 'OpenAI' | 'Custom';

export interface OrgPosition {
  x: number;
  y: number;
}

export interface OrgGraphNode {
  id: string;
  type: OrgEntityType;
  name: string;
  description?: string;
  username?: string;
  email?: string;
  role?: string;
  title?: string;
  departmentId?: string;
  teamId?: string;
  managerId?: string;
  provider?: AgentProvider;
  model?: string;
  color: string;
  icon?: string;
  status: OrgStatus;
  boardMember?: boolean;
  votingRights?: boolean;
  permissions: string[];
  position: OrgPosition;
  createdAt: string;
  updatedAt: string;
}

export interface OrgGraphEdge {
  id: string;
  source: string;
  target: string;
  type: OrgRelationshipType;
  createdAt: string;
}

export interface OrgInvitation {
  id: string;
  email: string;
  role: string;
  departmentId?: string;
  permissions: string[];
  method: 'link' | 'email' | 'code';
  token: string;
  expiresAt: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdAt: string;
}

export interface OrgRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export interface OrgProposal {
  id: string;
  title: string;
  description: string;
  action: OrgMutation['kind'];
  payload: unknown;
  status: 'voting' | 'approved' | 'rejected' | 'applied';
  votes: Record<string, 'approve' | 'reject'>;
  createdAt: string;
}

export interface OrgGraphDocument {
  version: 2;
  nodes: OrgGraphNode[];
  edges: OrgGraphEdge[];
  invitations: OrgInvitation[];
  roles: OrgRole[];
  governanceLocked: boolean;
  proposals: OrgProposal[];
  updatedAt: string;
}

export type OrgMutation =
  | { kind: 'upsert_node'; node: OrgGraphNode }
  | { kind: 'delete_node'; nodeId: string }
  | { kind: 'move_node'; nodeId: string; position: OrgPosition; departmentId?: string; teamId?: string }
  | { kind: 'upsert_edge'; edge: OrgGraphEdge }
  | { kind: 'delete_edge'; edgeId: string }
  | { kind: 'add_invitation'; invitation: OrgInvitation };

interface OrgGraphState extends OrgGraphDocument {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setGovernanceLocked: (locked: boolean) => void;
  mutate: (mutation: OrgMutation, title?: string) => { applied: boolean; proposalId?: string };
  replaceEdge: (oldEdgeId: string, edge: OrgGraphEdge) => void;
  setRelationshipType: (edgeId: string, type: OrgRelationshipType) => void;
  setRole: (role: OrgRole) => void;
  acceptInvitation: (token: string, node: OrgGraphNode) => boolean;
  vote: (proposalId: string, voterId: string, choice: 'approve' | 'reject') => void;
  persist: () => Promise<void>;
}

const STORAGE_KEY = 'avai:organization-graph:v2';
const now = () => new Date().toISOString();

const roles: OrgRole[] = [
  { id: 'owner', name: 'Owner', description: 'Full organization control.', permissions: ['org.manage', 'people.manage', 'agents.manage', 'governance.manage', 'permissions.manage'] },
  { id: 'admin', name: 'Administrator', description: 'Day-to-day organization administration.', permissions: ['org.manage', 'people.manage', 'agents.manage', 'invites.manage'] },
  { id: 'manager', name: 'Manager', description: 'Manage assigned departments and teams.', permissions: ['people.view', 'people.assign', 'teams.manage'] },
  { id: 'member', name: 'Member', description: 'Standard organization access.', permissions: ['people.view', 'org.view'] },
  { id: 'guest', name: 'Guest', description: 'Limited read-only access.', permissions: ['org.view'] },
];

const seedTime = '2026-06-07T00:00:00.000Z';
const seedNode = (node: Omit<OrgGraphNode, 'createdAt' | 'updatedAt' | 'permissions' | 'status'> & Partial<Pick<OrgGraphNode, 'permissions' | 'status'>>): OrgGraphNode => ({
  permissions: [],
  status: 'active',
  createdAt: seedTime,
  updatedAt: seedTime,
  ...node,
});

const INITIAL: OrgGraphDocument = {
  version: 2,
  governanceLocked: false,
  updatedAt: seedTime,
  roles,
  invitations: [],
  proposals: [],
  nodes: [
    seedNode({ id: 'board', type: 'board', name: 'Board of Directors', description: 'Organization oversight and governance.', color: '#a78bfa', icon: 'landmark', position: { x: 500, y: 20 }, votingRights: true }),
    seedNode({ id: 'dept-executive', type: 'department', name: 'Executive', description: 'Strategy, governance, and operating leadership.', color: '#10b981', icon: 'briefcase', position: { x: 260, y: 210 } }),
    seedNode({ id: 'dept-engineering', type: 'department', name: 'Engineering', description: 'Product, platform, and infrastructure.', color: '#3b82f6', icon: 'code', position: { x: 720, y: 210 } }),
    seedNode({ id: 'team-platform', type: 'team', name: 'Platform Team', description: 'Core platform delivery.', departmentId: 'dept-engineering', color: '#60a5fa', icon: 'users', position: { x: 820, y: 430 } }),
    seedNode({ id: 'rusty', type: 'human', name: 'Rusty Khan', username: 'rusty', email: 'rusty@avai.app', role: 'owner', title: 'Founder & CEO', departmentId: 'dept-executive', color: '#f59e0b', boardMember: true, votingRights: true, permissions: roles[0].permissions, position: { x: 180, y: 430 } }),
    seedNode({ id: 'cash', type: 'agent', name: 'Cash', role: 'admin', title: 'Chief Operating Officer', provider: 'OpenClaw', model: 'gpt-5.5', departmentId: 'dept-executive', managerId: 'rusty', color: '#2dd4bf', boardMember: true, votingRights: true, permissions: roles[1].permissions, position: { x: 420, y: 430 } }),
    seedNode({ id: 'cody', type: 'human', name: 'Cody', username: 'cody', email: 'cody@avai.app', role: 'manager', title: 'Lead Engineer', departmentId: 'dept-engineering', teamId: 'team-platform', managerId: 'rusty', color: '#3b82f6', permissions: roles[2].permissions, position: { x: 680, y: 650 } }),
    seedNode({ id: 'codex', type: 'agent', name: 'Codex', role: 'member', title: 'Software Engineering Agent', provider: 'Codex', model: 'gpt-5.1-codex', departmentId: 'dept-engineering', teamId: 'team-platform', managerId: 'cody', color: '#8b5cf6', permissions: roles[3].permissions, position: { x: 920, y: 650 } }),
  ],
  edges: [
    { id: 'e-board-exec', source: 'board', target: 'dept-executive', type: 'board_oversight', createdAt: seedTime },
    { id: 'e-board-eng', source: 'board', target: 'dept-engineering', type: 'board_oversight', createdAt: seedTime },
    { id: 'e-rusty-cash', source: 'rusty', target: 'cash', type: 'reports_to', createdAt: seedTime },
    { id: 'e-rusty-cody', source: 'rusty', target: 'cody', type: 'reports_to', createdAt: seedTime },
    { id: 'e-cody-codex', source: 'cody', target: 'codex', type: 'manages', createdAt: seedTime },
  ],
};

function normalize(document: Partial<OrgGraphDocument>): OrgGraphDocument {
  return {
    ...INITIAL,
    ...document,
    version: 2,
    nodes: Array.isArray(document.nodes) ? document.nodes : INITIAL.nodes,
    edges: Array.isArray(document.edges) ? document.edges : INITIAL.edges,
    invitations: Array.isArray(document.invitations) ? document.invitations : [],
    roles: Array.isArray(document.roles) ? document.roles : roles,
    proposals: Array.isArray(document.proposals) ? document.proposals : [],
  };
}

function applyMutation(document: OrgGraphDocument, mutation: OrgMutation): Partial<OrgGraphDocument> {
  const updatedAt = now();
  switch (mutation.kind) {
    case 'upsert_node': {
      const exists = document.nodes.some(node => node.id === mutation.node.id);
      return { nodes: exists ? document.nodes.map(node => node.id === mutation.node.id ? mutation.node : node) : [...document.nodes, mutation.node], updatedAt };
    }
    case 'delete_node':
      return {
        nodes: document.nodes.filter(node => node.id !== mutation.nodeId),
        edges: document.edges.filter(edge => edge.source !== mutation.nodeId && edge.target !== mutation.nodeId),
        updatedAt,
      };
    case 'move_node':
      return {
        nodes: document.nodes.map(node => node.id === mutation.nodeId ? { ...node, position: mutation.position, departmentId: mutation.departmentId ?? node.departmentId, teamId: mutation.teamId ?? node.teamId, updatedAt } : node),
        updatedAt,
      };
    case 'upsert_edge': {
      const exists = document.edges.some(edge => edge.id === mutation.edge.id);
      return { edges: exists ? document.edges.map(edge => edge.id === mutation.edge.id ? mutation.edge : edge) : [...document.edges, mutation.edge], updatedAt };
    }
    case 'delete_edge':
      return { edges: document.edges.filter(edge => edge.id !== mutation.edgeId), updatedAt };
    case 'add_invitation':
      return { invitations: [mutation.invitation, ...document.invitations], updatedAt };
  }
}

const governedKinds = new Set<OrgMutation['kind']>(['delete_node', 'upsert_edge', 'delete_edge']);

export const useOrgGraphStore = create<OrgGraphState>()((set, get) => ({
  ...INITIAL,
  hydrated: false,
  hydrate: async () => {
    let local: Partial<OrgGraphDocument> | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) local = JSON.parse(raw);
    } catch { /* use seed */ }
    set({ ...normalize(local ?? INITIAL), hydrated: true });
  },
  setGovernanceLocked: (governanceLocked) => {
    set({ governanceLocked, updatedAt: now() });
    void get().persist();
  },
  mutate: (mutation, title) => {
    const state = get();
    const targetNode = mutation.kind === 'delete_node' ? state.nodes.find(node => node.id === mutation.nodeId) : mutation.kind === 'upsert_node' ? mutation.node : undefined;
    const sensitiveNodeChange = mutation.kind === 'upsert_node' && (
      targetNode?.type === 'department' ||
      targetNode?.boardMember !== state.nodes.find(node => node.id === targetNode?.id)?.boardMember
    );
    if (state.governanceLocked && (governedKinds.has(mutation.kind) || sensitiveNodeChange)) {
      const proposal: OrgProposal = {
        id: crypto.randomUUID(),
        title: title ?? `Organization change: ${mutation.kind.replace(/_/g, ' ')}`,
        description: 'This change requires board approval because Governance Lock is enabled.',
        action: mutation.kind,
        payload: mutation,
        status: 'voting',
        votes: {},
        createdAt: now(),
      };
      set({ proposals: [proposal, ...state.proposals], updatedAt: now() });
      void get().persist();
      return { applied: false, proposalId: proposal.id };
    }
    set(applyMutation(state, mutation));
    void get().persist();
    return { applied: true };
  },
  replaceEdge: (oldEdgeId, edge) => {
    const state = get();
    if (state.governanceLocked) {
      get().mutate({ kind: 'upsert_edge', edge }, 'Change reporting line');
      return;
    }
    set({ edges: [...state.edges.filter(item => item.id !== oldEdgeId), edge], updatedAt: now() });
    void get().persist();
  },
  setRelationshipType: (edgeId, type) => {
    const edge = get().edges.find(item => item.id === edgeId);
    if (edge) get().mutate({ kind: 'upsert_edge', edge: { ...edge, type } }, 'Change relationship type');
  },
  setRole: (role) => {
    set(state => ({ roles: state.roles.some(item => item.id === role.id) ? state.roles.map(item => item.id === role.id ? role : item) : [...state.roles, role], updatedAt: now() }));
    void get().persist();
  },
  acceptInvitation: (token, node) => {
    const state = get();
    const invitation = state.invitations.find(item => item.token.toLowerCase() === token.toLowerCase() && item.status === 'pending');
    if (!invitation || (invitation.expiresAt && new Date(invitation.expiresAt) < new Date())) return false;
    set({
      nodes: [...state.nodes, node],
      invitations: state.invitations.map(item => item.id === invitation.id ? { ...item, status: 'accepted' } : item),
      updatedAt: now(),
    });
    void get().persist();
    return true;
  },
  vote: (proposalId, voterId, choice) => {
    const state = get();
    const boardVoters = state.nodes.filter(node => node.boardMember && node.votingRights);
    let mutationToApply: OrgMutation | undefined;
    const proposals = state.proposals.map(proposal => {
      if (proposal.id !== proposalId || proposal.status !== 'voting') return proposal;
      const votes = { ...proposal.votes, [voterId]: choice };
      const approvals = Object.values(votes).filter(vote => vote === 'approve').length;
      const rejections = Object.values(votes).filter(vote => vote === 'reject').length;
      const threshold = Math.max(1, Math.ceil(boardVoters.length / 2));
      if (approvals >= threshold) {
        mutationToApply = proposal.payload as OrgMutation;
        return { ...proposal, votes, status: 'applied' as const };
      }
      if (rejections >= threshold) return { ...proposal, votes, status: 'rejected' as const };
      return { ...proposal, votes };
    });
    set({ proposals, updatedAt: now() });
    if (mutationToApply) set(applyMutation(get(), mutationToApply));
    void get().persist();
  },
  persist: async () => {
    const { hydrated: _hydrated, ...document } = get();
    const serializable: OrgGraphDocument = {
      version: document.version,
      nodes: document.nodes,
      edges: document.edges,
      invitations: document.invitations,
      roles: document.roles,
      governanceLocked: document.governanceLocked,
      proposals: document.proposals,
      updatedAt: document.updatedAt,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    window.dispatchEvent(new CustomEvent('avai:organization-graph-updated', { detail: serializable }));
  },
}));
