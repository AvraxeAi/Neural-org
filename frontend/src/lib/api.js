import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

// axios instance with auth interceptor
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('openclaw_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('openclaw_token');
      localStorage.removeItem('openclaw_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ── Orgs ──────────────────────────────────────────────────────────────────
export const orgAPI = {
  list: () => api.get('/orgs'),
  create: (data) => api.post('/orgs', data),
  get: (id) => api.get(`/orgs/${id}`),
  listMembers: (id) => api.get(`/orgs/${id}/members`),
  refreshInvite: (id) => api.post(`/orgs/${id}/invite`),
  join: (data) => api.post('/orgs/join', data),
  updateMemberRole: (orgId, memberId, role) => api.put(`/orgs/${orgId}/members/${memberId}/role`, { role }),
};

// ── Org Chart ─────────────────────────────────────────────────────────────
export const chartAPI = {
  get: (orgId) => api.get(`/orgs/${orgId}/chart`),
  updateNode: (orgId, nodeId, data) => api.put(`/orgs/${orgId}/chart/nodes/${nodeId}`, data),
};

// ── Agents ───────────────────────────────────────────────────────────────
export const agentAPI = {
  list: (orgId) => api.get(`/orgs/${orgId}/agents`),
  create: (orgId, data) => api.post(`/orgs/${orgId}/agents`, data),
  get: (id) => api.get(`/agents/${id}`),
  update: (id, data) => api.put(`/agents/${id}`, data),
  delete: (id) => api.delete(`/agents/${id}`),
};

// ── Skills ────────────────────────────────────────────────────────────────
export const skillsAPI = {
  list: () => api.get('/skills'),
};

// ── Board ─────────────────────────────────────────────────────────────────
export const boardAPI = {
  listProposals: (orgId) => api.get(`/orgs/${orgId}/proposals`),
  createProposal: (orgId, data) => api.post(`/orgs/${orgId}/proposals`, data),
  getProposal: (id) => api.get(`/proposals/${id}`),
  vote: (id, value) => api.post(`/proposals/${id}/vote`, { value }),
  addComment: (id, text) => api.post(`/proposals/${id}/comments`, { text }),
};

// ── Workflows ─────────────────────────────────────────────────────────────
export const workflowAPI = {
  list: (orgId) => api.get(`/orgs/${orgId}/workflows`),
  create: (orgId, data) => api.post(`/orgs/${orgId}/workflows`, data),
  get: (id) => api.get(`/workflows/${id}`),
  update: (id, data) => api.put(`/workflows/${id}`, data),
  delete: (id) => api.delete(`/workflows/${id}`),
  run: (id) => api.post(`/workflows/${id}/run`),
  getRun: (runId) => api.get(`/workflow-runs/${runId}`),
  listRuns: (orgId) => api.get(`/orgs/${orgId}/workflow-runs`),
};

// ── Messaging ─────────────────────────────────────────────────────────────
export const msgAPI = {
  listThreads: (orgId) => api.get(`/orgs/${orgId}/threads`),
  createThread: (orgId, data) => api.post(`/orgs/${orgId}/threads`, data),
  getMessages: (threadId) => api.get(`/threads/${threadId}/messages`),
  send: (threadId, text) => api.post(`/threads/${threadId}/messages`, { text }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────
export const dashAPI = {
  activity: (orgId) => api.get(`/orgs/${orgId}/activity`),
  stats: (orgId) => api.get(`/orgs/${orgId}/stats`),
};
