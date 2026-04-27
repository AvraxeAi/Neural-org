export type NavItem = {
  id: string;
  label: string;
  icon: string;
  badge?: number | string;
  section?: string;
};

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

export type Project = {
  id: string;
  title: string;
  status: 'active' | 'backlog' | 'review' | 'done';
  assignee: string;
  priority: 'high' | 'medium' | 'low';
  due?: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agentId?: string;
};
