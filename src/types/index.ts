// ── Core nav ─────────────────────────────────────────────────────────────────
export type NavItem = {
  id: string;
  label: string;
  icon: string;
  badge?: number | string;
  section?: string;
};

// ── Agent ─────────────────────────────────────────────────────────────────────
export type Agent = {
  id: string;
  name: string;
  model: string;
  status: 'active' | 'busy' | 'idle' | 'offline';
  avatar: string;
  tokensToday: number;
  costToday: number;
  sessions: number;
  contextPct: number;
  skills: string[];
  channels: string[];
};

// ── Org ───────────────────────────────────────────────────────────────────────
export type OrgMember = {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  status: 'online' | 'busy' | 'offline';
  avatar: string;
  agentId?: string;
  title?: string;
};

export type OrgNodePermission = 'owner' | 'admin' | 'member' | 'guest';
export type OrgNodeProvider = 'anthropic' | 'openai' | 'google' | 'local';

export type OrgNode = {
  id: string;
  name: string;
  title: string;
  model: string | null;
  agentName: string | null;
  provider: OrgNodeProvider | null;
  initial: string;
  color: string;
  status: 'online' | 'busy' | 'offline';
  parentId: string | null;
  permissionType: OrgNodePermission;
};

// ── Projects & Workspaces ─────────────────────────────────────────────────────
export type ProjectStatus = 'active' | 'backlog' | 'review' | 'done' | 'archived';
export type ProjectVisibility = 'private' | 'org' | 'public';

export type Workspace = {
  id: string;
  name: string;
  type: 'personal' | 'org';
  orgId?: string;
  gradient?: string;
  initials: string;
};

export type Project = {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  color?: string;
  createdAt: string;
  updatedAt: string;
};

// ── Chat & Messages ───────────────────────────────────────────────────────────
export type ChatMode = 'private' | 'org' | 'ai-only';

export type ChatSession = {
  id: string;
  projectId?: string;
  workspaceId?: string;
  orgId?: string;
  title: string;
  mode: ChatMode;
  participants: string[];
  lastMessageAt: string;
  createdAt: string;
};

export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageKind = 'message' | 'proposal' | 'decision' | 'event';

export type Message = {
  id: string;
  sessionId: string;
  role: MessageRole;
  kind: MessageKind;
  content: string;
  authorId?: string;
  authorName?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

// Legacy alias kept for backward compat
export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agentId?: string;
};

// ── Memory ────────────────────────────────────────────────────────────────────
export type MemoryScope = 'chat' | 'project' | 'org' | 'global';

export type MemoryEntry = {
  id: string;
  scope: MemoryScope;
  scopeId: string;
  title: string;
  body: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

// ── Board / Proposals ─────────────────────────────────────────────────────────
export type BoardProposalStatus = 'draft' | 'open' | 'discussion' | 'voting' | 'passed' | 'failed' | 'implemented' | 'tabled';
export type VoteChoice = 'for' | 'against' | 'abstain';
export type ProposalCategory = 'policy' | 'budget' | 'personnel' | 'strategy' | 'other';

export type BoardVote = {
  voterId: string;
  voterName: string;
  choice: VoteChoice;
  reason: string;
  timestamp: string;
};

export type BoardProposal = {
  id: string;
  title: string;
  description: string;
  proposedBy: string;
  proposedByName: string;
  category: ProposalCategory;
  status: BoardProposalStatus;
  votes: BoardVote[];
  createdAt: string;
  closedAt?: string;
};
