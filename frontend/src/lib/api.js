import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

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
      localStorage.removeItem('openclaw_org');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

export const authAPI = {
  register: d => api.post('/auth/register', d),
  login:    d => api.post('/auth/login', d),
  me:       ()  => api.get('/auth/me'),
};

export const orgAPI = {
  list:             ()           => api.get('/orgs'),
  create:           d            => api.post('/orgs', d),
  get:              id           => api.get(`/orgs/${id}`),
  listMembers:      id           => api.get(`/orgs/${id}/members`),
  refreshInvite:    id           => api.post(`/orgs/${id}/invite`),
  join:             d            => api.post('/orgs/join', d),
  updateMemberRole: (oid,mid,r)  => api.put(`/orgs/${oid}/members/${mid}/role`, {role:r}),
  getConfig:        id           => api.get(`/orgs/${id}/config`),
  updateConfig:     (id,d)       => api.put(`/orgs/${id}/config`, d),
  getPresence:      id           => api.get(`/orgs/${id}/presence`),
};

export const chartAPI = {
  get:        orgId          => api.get(`/orgs/${orgId}/chart`),
  updateNode: (orgId,nid,d)  => api.put(`/orgs/${orgId}/chart/nodes/${nid}`, d),
};

export const agentAPI = {
  list:   orgId => api.get(`/orgs/${orgId}/agents`),
  create: (orgId,d) => api.post(`/orgs/${orgId}/agents`, d),
  get:    id    => api.get(`/agents/${id}`),
  update: (id,d)=> api.put(`/agents/${id}`, d),
  delete: id    => api.delete(`/agents/${id}`),
};

export const skillsAPI = { list: () => api.get('/skills') };

export const boardAPI = {
  listProposals:  orgId        => api.get(`/orgs/${orgId}/proposals`),
  createProposal: (orgId,d)    => api.post(`/orgs/${orgId}/proposals`, d),
  getProposal:    id           => api.get(`/proposals/${id}`),
  vote:           (id,value)   => api.post(`/proposals/${id}/vote`, {value}),
  addComment:     (id,text)    => api.post(`/proposals/${id}/comments`, {text}),
};

export const workflowAPI = {
  list:     orgId => api.get(`/orgs/${orgId}/workflows`),
  create:   (orgId,d) => api.post(`/orgs/${orgId}/workflows`, d),
  get:      id => api.get(`/workflows/${id}`),
  update:   (id,d) => api.put(`/workflows/${id}`, d),
  delete:   id => api.delete(`/workflows/${id}`),
  run:      id => api.post(`/workflows/${id}/run`),
  getRun:   id => api.get(`/workflow-runs/${id}`),
  listRuns: orgId => api.get(`/orgs/${orgId}/workflow-runs`),
};

export const msgAPI = {
  listThreads:  orgId     => api.get(`/orgs/${orgId}/threads`),
  createThread: (orgId,d) => api.post(`/orgs/${orgId}/threads`, d),
  getMessages:  tid       => api.get(`/threads/${tid}/messages`),
  send:         (tid,text)=> api.post(`/threads/${tid}/messages`, {text}),
  typing:       tid       => api.post(`/threads/${tid}/typing`),
};

export const dashAPI = {
  activity: orgId => api.get(`/orgs/${orgId}/activity`),
  stats:    orgId => api.get(`/orgs/${orgId}/stats`),
};

export const deliberationAPI = {
  start: (orgId,d)  => api.post(`/orgs/${orgId}/deliberations`, d),
  get:   id         => api.get(`/deliberations/${id}`),
  list:  orgId      => api.get(`/orgs/${orgId}/deliberations`),
};

export const memoryAPI = {
  listNodes:  orgId    => api.get(`/orgs/${orgId}/memory/nodes`),
  listEdges:  orgId    => api.get(`/orgs/${orgId}/memory/edges`),
  createNode: (oid,d)  => api.post(`/orgs/${oid}/memory/nodes`, d),
  createEdge: (oid,d)  => api.post(`/orgs/${oid}/memory/edges`, d),
};

export const healthAPI = {
  get:    orgId => api.get(`/orgs/${orgId}/health`),
  events: (orgId,limit,type) => api.get(`/orgs/${orgId}/events`, {params:{limit,event_type:type}}),
};

export const notifAPI = {
  list:     (orgId,unread) => api.get(`/orgs/${orgId}/notifications`, {params:{unread_only:unread}}),
  count:    orgId          => api.get(`/orgs/${orgId}/notifications/count`),
  markRead: (orgId,ids)    => api.post(`/orgs/${orgId}/notifications/read`, {notification_ids:ids||[]}),
};
