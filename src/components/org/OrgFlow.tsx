import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background, BackgroundVariant, Connection, Controls, Edge, EdgeChange, Handle, MiniMap,
  MarkerType, Node, NodeChange, NodeProps, Position, ReactFlowInstance, SelectionMode, addEdge,
  applyEdgeChanges, applyNodeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Bot, BriefcaseBusiness, Building2, Check, ChevronRight, CircleDot, Code2, Copy,
  Crown, GitBranch, KeyRound, Landmark, Link2, Lock, Mail, Network, Plus, Search,
  ShieldCheck, Sparkles, Trash2, Unlock, UserRound, Users, Vote, X,
} from 'lucide-react';
import PageLayout, { OutlineBtn, PrimaryBtn } from '../layout/PageLayout';
import {
  AgentProvider, OrgEntityType, OrgGraphEdge, OrgGraphNode, OrgInvitation,
  OrgRelationshipType, OrgRole, useOrgGraphStore,
} from '../../store/orgGraphStore';

type OrgTab = 'chart' | 'people' | 'departments' | 'teams' | 'invitations' | 'roles' | 'permissions' | 'governance';
type ModalState = { kind: 'node'; node?: OrgGraphNode; preset?: OrgEntityType } | { kind: 'invite' } | { kind: 'proposal'; title: string } | null;

const tabs: Array<{ id: OrgTab; label: string }> = [
  { id: 'chart', label: 'Org Chart' }, { id: 'people', label: 'People' },
  { id: 'departments', label: 'Departments' }, { id: 'teams', label: 'Teams' },
  { id: 'invitations', label: 'Invitations' }, { id: 'roles', label: 'Roles' },
  { id: 'permissions', label: 'Permissions' }, { id: 'governance', label: 'Governance' },
];

const typeMeta: Record<OrgEntityType, { label: string; icon: React.ElementType; color: string }> = {
  human: { label: 'Human', icon: UserRound, color: '#10b981' },
  agent: { label: 'AI Agent', icon: Bot, color: '#8b5cf6' },
  department: { label: 'Department', icon: Building2, color: '#3b82f6' },
  team: { label: 'Team', icon: Users, color: '#06b6d4' },
  committee: { label: 'Committee', icon: Vote, color: '#f59e0b' },
  board: { label: 'Board', icon: Landmark, color: '#a78bfa' },
};

const relationshipMeta: Record<OrgRelationshipType, { label: string; color: string; dashed?: boolean; animated?: boolean }> = {
  reports_to: { label: 'Reports To', color: '#10b981' },
  manages: { label: 'Manages', color: '#3b82f6' },
  advises: { label: 'Advises', color: '#a78bfa', dashed: true },
  board_oversight: { label: 'Board Oversight', color: '#f59e0b', animated: true },
  temporary_assignment: { label: 'Temporary Assignment', color: '#64748b', dashed: true },
};

const providers: AgentProvider[] = ['OpenClaw', 'Hermes', 'Claude', 'Codex', 'Gemini', 'OpenAI', 'Custom'];
const permissions = ['org.view', 'org.manage', 'people.view', 'people.manage', 'people.assign', 'agents.manage', 'teams.manage', 'invites.manage', 'governance.manage', 'permissions.manage'];

function graphNode(node: OrgGraphNode, selected: boolean): Node {
  return { id: node.id, type: 'organizationNode', position: node.position, selected, data: { node } };
}

function graphEdge(edge: OrgGraphEdge, selected: boolean): Edge {
  const meta = relationshipMeta[edge.type];
  return {
    id: edge.id, source: edge.source, target: edge.target, selected, type: 'smoothstep',
    label: meta.label, animated: meta.animated,
    style: { stroke: meta.color, strokeWidth: selected ? 2.5 : 1.5, strokeDasharray: meta.dashed ? '6 5' : undefined },
    labelStyle: { fill: '#9ca3af', fontSize: 9, fontWeight: 600 },
    labelBgStyle: { fill: '#161616', fillOpacity: 0.94 },
    markerEnd: { type: MarkerType.ArrowClosed, color: meta.color },
  };
}

const organizationNodeTypes = { organizationNode: OrganizationNode };

export default function OrgFlow() {
  const store = useOrgGraphStore();
  const [activeTab, setActiveTab] = useState<OrgTab>('chart');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>();
  const [modal, setModal] = useState<ModalState>(null);
  const [relationshipType, setRelationshipType] = useState<OrgRelationshipType>('reports_to');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string }>();
  const [flow, setFlow] = useState<ReactFlowInstance>();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ department: '', role: '', type: '', board: false });
  const [notice, setNotice] = useState('');
  const [nodes, setNodes] = useState<Node[]>(() => store.nodes.map(node => graphNode(node, false)));

  useEffect(() => { void store.hydrate(); }, []);
  useEffect(() => {
    const onTab = (event: Event) => setActiveTab((event as CustomEvent<OrgTab>).detail);
    window.addEventListener('avai:organization-tab', onTab);
    return () => window.removeEventListener('avai:organization-tab', onTab);
  }, []);
  useEffect(() => {
    setNodes(current => store.nodes.map(node => {
      const existing = current.find(item => item.id === node.id);
      return {
        ...graphNode(node, selectedIds.includes(node.id)),
        position: existing?.dragging ? existing.position : node.position,
      };
    }));
  }, [store.nodes]);
  useEffect(() => {
    setNodes(current => current.map(node => ({ ...node, selected: selectedIds.includes(node.id) })));
  }, [selectedIds]);

  const edges = useMemo(() => store.edges.map(edge => graphEdge(edge, edge.id === selectedEdgeId)), [store.edges, selectedEdgeId]);
  const selectedNode = store.nodes.find(node => node.id === selectedIds[0]);
  const selectedEdge = store.edges.find(edge => edge.id === selectedEdgeId);

  const mutate = useCallback((mutation: Parameters<typeof store.mutate>[0], title?: string) => {
    const result = store.mutate(mutation, title);
    setNotice(result.applied ? 'Organization graph updated.' : 'Governance proposal created for board approval.');
    window.setTimeout(() => setNotice(''), 2800);
  }, [store]);

  const onNodesChange = (changes: NodeChange[]) => {
    setNodes(current => applyNodeChanges(changes, current));
    for (const change of changes) {
      if (change.type === 'position' && change.dragging === false && change.position) {
        mutate({ kind: 'move_node', nodeId: change.id, position: change.position }, 'Move organization node');
      }
      if (change.type === 'remove') mutate({ kind: 'delete_node', nodeId: change.id }, 'Delete organization node');
      if (change.type === 'select') setSelectedIds(current => change.selected ? [...new Set([...current, change.id])] : current.filter(id => id !== change.id));
    }
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    applyEdgeChanges(changes, edges);
    for (const change of changes) {
      if (change.type === 'remove') mutate({ kind: 'delete_edge', edgeId: change.id }, 'Delete organization relationship');
      if (change.type === 'select') setSelectedEdgeId(change.selected ? change.id : undefined);
    }
  };

  const connect = (connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    const edge: OrgGraphEdge = { id: crypto.randomUUID(), source: connection.source, target: connection.target, type: relationshipType, createdAt: new Date().toISOString() };
    addEdge(graphEdge(edge, false), edges);
    mutate({ kind: 'upsert_edge', edge }, 'Change reporting line');
  };

  const reconnect = (oldEdge: Edge, connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const edge: OrgGraphEdge = {
      id: crypto.randomUUID(), source: connection.source, target: connection.target,
      type: store.edges.find(item => item.id === oldEdge.id)?.type ?? relationshipType,
      createdAt: new Date().toISOString(),
    };
    store.replaceEdge(oldEdge.id, edge);
  };

  const departmentNodes = store.nodes.filter(node => node.type === 'department');
  const teamNodes = store.nodes.filter(node => node.type === 'team');
  const people = store.nodes.filter(node => node.type === 'human' || node.type === 'agent').filter(node => {
    const haystack = `${node.name} ${node.username ?? ''} ${node.title ?? ''} ${node.role ?? ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) &&
      (!filters.department || node.departmentId === filters.department) &&
      (!filters.role || node.role === filters.role) &&
      (!filters.type || node.type === filters.type) &&
      (!filters.board || node.boardMember);
  });

  const addAction = activeTab === 'invitations'
    ? <PrimaryBtn onClick={() => setModal({ kind: 'invite' })}><Plus size={14} /> Invite User</PrimaryBtn>
    : <PrimaryBtn onClick={() => setModal({ kind: 'node', preset: activeTab === 'departments' ? 'department' : activeTab === 'teams' ? 'team' : undefined })}><Plus size={14} /> Add</PrimaryBtn>;

  return (
    <>
      <PageLayout
        title="Organization"
        subtitle="The graph-backed source of truth for people, agents, structure, permissions, and governance."
        tabs={tabs.map(tab => ({ ...tab, badge: tab.id === 'invitations' ? store.invitations.filter(invite => invite.status === 'pending').length : tab.id === 'governance' ? store.proposals.filter(proposal => proposal.status === 'voting').length : undefined }))}
        activeTab={activeTab}
        onTabChange={id => {
          setActiveTab(id as OrgTab);
          window.dispatchEvent(new CustomEvent('avai:organization-tab', { detail: id }));
        }}
        actions={<>
          <OutlineBtn onClick={() => store.setGovernanceLocked(!store.governanceLocked)}>
            {store.governanceLocked ? <Unlock size={14} /> : <Lock size={14} />}
            {store.governanceLocked ? 'Unlock' : 'Governance Lock'}
          </OutlineBtn>
          {activeTab !== 'roles' && activeTab !== 'permissions' && activeTab !== 'governance' && addAction}
        </>}
        noPadding={activeTab === 'chart'}
      >
        {activeTab === 'chart' && (
          <div className="org-workspace" onContextMenu={event => { event.preventDefault(); setContextMenu({ x: event.clientX, y: event.clientY }); }}>
            {store.governanceLocked && <GovernanceBanner count={store.proposals.filter(proposal => proposal.status === 'voting').length} onView={() => setActiveTab('governance')} />}
            <div className="org-canvas-toolbar">
              <span><Network size={14} /> {store.nodes.length} nodes · {store.edges.length} relationships</span>
              <span className="org-canvas-hint">Drag cards to arrange · drag canvas to move</span>
              <select value={relationshipType} onChange={event => setRelationshipType(event.target.value as OrgRelationshipType)} className="org-input compact" aria-label="New relationship type">
                {Object.entries(relationshipMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
              </select>
              <button onClick={() => flow?.fitView({ padding: 0.2 })}>Fit view</button>
            </div>
            <ReactFlow
              nodes={nodes} edges={edges} nodeTypes={organizationNodeTypes}
              onInit={setFlow} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
              onConnect={connect} onEdgeUpdate={reconnect}
              onNodeDoubleClick={(_, node) => setModal({ kind: 'node', node: node.data.node })}
              onNodeContextMenu={(event, node) => { event.preventDefault(); setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id }); }}
              onPaneClick={() => { setContextMenu(undefined); setSelectedEdgeId(undefined); }}
              selectionMode={SelectionMode.Partial} multiSelectionKeyCode={['Meta', 'Control']} selectionKeyCode="Shift"
              deleteKeyCode={['Backspace', 'Delete']} nodesDraggable panOnDrag zoomOnScroll
              panOnScroll={false}
              selectionOnDrag={false}
              minZoom={0.25} maxZoom={2} fitView proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,.055)" />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable nodeColor={node => node.data.node.color} maskColor="rgba(11,11,11,.72)" />
            </ReactFlow>
            {(selectedNode || selectedEdge) && (
              <GraphInspector
                node={selectedNode} edge={selectedEdge} departments={departmentNodes} teams={teamNodes}
                onEdit={() => selectedNode && setModal({ kind: 'node', node: selectedNode })}
                onDelete={() => selectedNode ? mutate({ kind: 'delete_node', nodeId: selectedNode.id }, `Delete ${selectedNode.name}`) : selectedEdge && mutate({ kind: 'delete_edge', edgeId: selectedEdge.id }, 'Delete relationship')}
                onRelationshipType={type => selectedEdge && store.setRelationshipType(selectedEdge.id, type)}
                onClose={() => { setSelectedIds([]); setSelectedEdgeId(undefined); }}
              />
            )}
            {contextMenu && <ContextMenu menu={contextMenu} onClose={() => setContextMenu(undefined)} onAdd={type => { setModal({ kind: 'node', preset: type }); setContextMenu(undefined); }} onEdit={() => { const node = store.nodes.find(item => item.id === contextMenu.nodeId); if (node) setModal({ kind: 'node', node }); setContextMenu(undefined); }} onDelete={() => { if (contextMenu.nodeId) mutate({ kind: 'delete_node', nodeId: contextMenu.nodeId }, 'Delete organization node'); setContextMenu(undefined); }} />}
          </div>
        )}
        {activeTab === 'people' && <PeopleDirectory nodes={people} allNodes={store.nodes} departments={departmentNodes} query={query} filters={filters} onQuery={setQuery} onFilters={setFilters} onEdit={node => setModal({ kind: 'node', node })} />}
        {activeTab === 'departments' && <StructureGrid kind="department" nodes={departmentNodes} allNodes={store.nodes} onEdit={node => setModal({ kind: 'node', node })} />}
        {activeTab === 'teams' && <StructureGrid kind="team" nodes={teamNodes} allNodes={store.nodes} onEdit={node => setModal({ kind: 'node', node })} />}
        {activeTab === 'invitations' && <Invitations invitations={store.invitations} departments={departmentNodes} />}
        {activeTab === 'roles' && <Roles roles={store.roles} onSave={store.setRole} />}
        {activeTab === 'permissions' && <Permissions roles={store.roles} />}
        {activeTab === 'governance' && <Governance locked={store.governanceLocked} proposals={store.proposals} voters={store.nodes.filter(node => node.boardMember && node.votingRights)} onToggle={() => store.setGovernanceLocked(!store.governanceLocked)} onVote={store.vote} />}
      </PageLayout>
      {modal?.kind === 'node' && <NodeModal node={modal.node} preset={modal.preset} departments={departmentNodes} teams={teamNodes} roles={store.roles} onClose={() => setModal(null)} onSave={node => { mutate({ kind: 'upsert_node', node }, `${modal.node ? 'Edit' : 'Create'} ${node.type}: ${node.name}`); setModal(null); }} />}
      {modal?.kind === 'invite' && <InviteModal departments={departmentNodes} roles={store.roles} onClose={() => setModal(null)} onSave={invitation => { mutate({ kind: 'add_invitation', invitation }); setModal(null); }} />}
      {notice && <div className="org-toast" role="status">{notice}<button onClick={() => setNotice('')}><X size={13} /></button></div>}
    </>
  );
}

function OrganizationNode({ data, selected }: NodeProps) {
  const node = data.node as OrgGraphNode;
  const meta = typeMeta[node.type];
  const Icon = meta.icon;
  return (
    <div className={`org-flow-node type-${node.type} ${selected ? 'selected' : ''}`} style={{ '--node-color': node.color } as React.CSSProperties}>
      <Handle type="target" position={Position.Top} className="org-handle" />
      <div className="org-node-icon"><Icon size={15} /></div>
      <div className="org-node-copy"><strong>{node.name}</strong><span>{node.title || meta.label}</span></div>
      <div className={`org-node-status status-${node.status}`} />
      <div className="org-node-meta">
        <span>{meta.label}</span>
        {node.boardMember && <span><Crown size={9} /> Board</span>}
        {node.type === 'department' || node.type === 'team' ? <span>{node.description || 'Structure node'}</span> : null}
      </div>
      <Handle type="source" position={Position.Bottom} className="org-handle" />
    </div>
  );
}

function GovernanceBanner({ count, onView }: { count: number; onView: () => void }) {
  return <div className="org-governance-banner"><Lock size={14} /><span>Governance Lock is active. Sensitive changes create board proposals.</span><button onClick={onView}>{count} pending <ChevronRight size={13} /></button></div>;
}

function GraphInspector({ node, edge, departments, teams, onEdit, onDelete, onRelationshipType, onClose }: {
  node?: OrgGraphNode; edge?: OrgGraphEdge; departments: OrgGraphNode[]; teams: OrgGraphNode[];
  onEdit: () => void; onDelete: () => void; onRelationshipType: (type: OrgRelationshipType) => void; onClose: () => void;
}) {
  return <aside className="org-inspector">
    <header><div><span>{node ? typeMeta[node.type].label : 'Relationship'}</span><h3>{node?.name || (edge && relationshipMeta[edge.type].label)}</h3></div><button onClick={onClose}><X size={15} /></button></header>
    {node && <div className="org-inspector-body">
      <Info label="Title" value={node.title || '-'} /><Info label="Department" value={departments.find(item => item.id === node.departmentId)?.name || '-'} />
      <Info label="Team" value={teams.find(item => item.id === node.teamId)?.name || '-'} /><Info label="Role" value={node.role || '-'} />
      <Info label="Status" value={node.status} /><Info label="Permissions" value={`${node.permissions.length} assigned`} />
      {node.type === 'agent' && <><Info label="Provider" value={node.provider || '-'} /><Info label="Model" value={node.model || '-'} /></>}
    </div>}
    {edge && <div className="org-inspector-body"><label className="org-field"><span>Relationship type</span><select className="org-input" value={edge.type} onChange={event => onRelationshipType(event.target.value as OrgRelationshipType)}>{Object.entries(relationshipMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></label></div>}
    <footer>{node && <button onClick={onEdit}><GitBranch size={13} /> Edit</button>}<button className="danger" onClick={onDelete}><Trash2 size={13} /> Delete</button></footer>
  </aside>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="org-info"><span>{label}</span><strong>{value}</strong></div>;
}

function ContextMenu({ menu, onClose, onAdd, onEdit, onDelete }: {
  menu: { x: number; y: number; nodeId?: string }; onClose: () => void; onAdd: (type: OrgEntityType) => void; onEdit: () => void; onDelete: () => void;
}) {
  return <div className="org-context-menu" style={{ left: menu.x, top: menu.y }} onMouseLeave={onClose}>
    {menu.nodeId ? <><button onClick={onEdit}>Edit node</button><button className="danger" onClick={onDelete}>Delete node</button></> : Object.entries(typeMeta).map(([type, meta]) => { const Icon = meta.icon; return <button key={type} onClick={() => onAdd(type as OrgEntityType)}><Icon size={13} /> Add {meta.label}</button>; })}
  </div>;
}

function PeopleDirectory({ nodes, allNodes, departments, query, filters, onQuery, onFilters, onEdit }: {
  nodes: OrgGraphNode[]; allNodes: OrgGraphNode[]; departments: OrgGraphNode[]; query: string;
  filters: { department: string; role: string; type: string; board: boolean };
  onQuery: (value: string) => void; onFilters: (value: typeof filters) => void; onEdit: (node: OrgGraphNode) => void;
}) {
  return <div className="org-panel">
    <div className="org-directory-tools">
      <label className="org-search"><Search size={14} /><input value={query} onChange={event => onQuery(event.target.value)} placeholder="Search name, username, role, or title" /></label>
      <select className="org-input compact" value={filters.department} onChange={event => onFilters({ ...filters, department: event.target.value })}><option value="">All departments</option>{departments.map(node => <option key={node.id} value={node.id}>{node.name}</option>)}</select>
      <select className="org-input compact" value={filters.role} onChange={event => onFilters({ ...filters, role: event.target.value })}><option value="">All roles</option>{[...new Set(allNodes.map(node => node.role).filter(Boolean))].map(role => <option key={role} value={role}>{role}</option>)}</select>
      <select className="org-input compact" value={filters.type} onChange={event => onFilters({ ...filters, type: event.target.value })}><option value="">Humans & agents</option><option value="human">Human</option><option value="agent">Agent</option></select>
      <button className={filters.board ? 'active' : ''} onClick={() => onFilters({ ...filters, board: !filters.board })}><Crown size={13} /> Board</button>
    </div>
    <div className="org-table-wrap"><table className="org-table"><thead><tr>{['Name', 'Username', 'Role', 'Department', 'Reports To', 'Type', 'Status', ''].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>
      {nodes.map(node => <tr key={node.id}><td><div className="org-person"><span style={{ background: node.color }}>{node.name.slice(0, 2).toUpperCase()}</span><div><strong>{node.name}</strong><small>{node.title}</small></div></div></td><td>{node.username || '-'}</td><td>{node.role || '-'}</td><td>{allNodes.find(item => item.id === node.departmentId)?.name || '-'}</td><td>{allNodes.find(item => item.id === node.managerId)?.name || '-'}</td><td><span className={`org-type type-${node.type}`}>{typeMeta[node.type].label}</span></td><td><span className={`org-status status-${node.status}`}><i />{node.status}</span></td><td><button className="org-row-action" onClick={() => onEdit(node)}>Edit</button></td></tr>)}
    </tbody></table></div>
  </div>;
}

function StructureGrid({ kind, nodes, allNodes, onEdit }: { kind: 'department' | 'team'; nodes: OrgGraphNode[]; allNodes: OrgGraphNode[]; onEdit: (node: OrgGraphNode) => void }) {
  return <div className="org-card-grid">{nodes.map(node => {
    const members = allNodes.filter(item => kind === 'department' ? item.departmentId === node.id : item.teamId === node.id);
    const manager = allNodes.find(item => item.id === node.managerId);
    const parent = kind === 'team' ? allNodes.find(item => item.id === node.departmentId) : undefined;
    return <article className="org-structure-card" key={node.id} style={{ '--node-color': node.color } as React.CSSProperties}>
      <header><span><Building2 size={16} /></span><div><h3>{node.name}</h3><small>{parent ? `${parent.name} department` : kind}</small></div><button onClick={() => onEdit(node)}>Edit</button></header>
      <p>{node.description || `No ${kind} description yet.`}</p>
      <div className="org-card-stats"><div><span>Manager</span><strong>{manager?.name || 'Unassigned'}</strong></div><div><span>Members</span><strong>{members.length}</strong></div><div><span>Updated</span><strong>{new Date(node.updatedAt).toLocaleDateString()}</strong></div></div>
      <div className="org-avatar-stack">{members.slice(0, 7).map(member => <span key={member.id} title={member.name} style={{ background: member.color }}>{member.name.slice(0, 2).toUpperCase()}</span>)}{members.length > 7 && <em>+{members.length - 7}</em>}</div>
    </article>;
  })}</div>;
}

function Invitations({ invitations, departments }: { invitations: OrgInvitation[]; departments: OrgGraphNode[] }) {
  return <div className="org-panel"><div className="org-table-wrap"><table className="org-table"><thead><tr>{['Invitee', 'Role', 'Department', 'Method', 'Invite', 'Expires', 'Status'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>
    {invitations.length === 0 && <tr><td colSpan={7}><div className="org-empty"><Mail size={28} /><strong>No pending invitations</strong><span>Invite links, email invitations, and codes will appear here.</span></div></td></tr>}
    {invitations.map(invite => <tr key={invite.id}><td>{invite.email}</td><td>{invite.role}</td><td>{departments.find(node => node.id === invite.departmentId)?.name || '-'}</td><td>{invite.method}</td><td><code>{invite.method === 'code' ? invite.token : `avai.app/join/${invite.token}`}</code></td><td>{invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : 'Never'}</td><td><span className={`org-status status-${invite.status === 'pending' ? 'active' : 'inactive'}`}><i />{invite.status}</span></td></tr>)}
  </tbody></table></div></div>;
}

function Roles({ roles, onSave }: { roles: OrgRole[]; onSave: (role: OrgRole) => void }) {
  return <div className="org-card-grid">{roles.map(role => <article className="org-role-card" key={role.id}><header><KeyRound size={16} /><div><h3>{role.name}</h3><small>{role.permissions.length} permissions</small></div></header><p>{role.description}</p><div>{role.permissions.map(permission => <span key={permission}>{permission}</span>)}</div><button onClick={() => onSave({ ...role, permissions: [...new Set([...role.permissions, 'org.view'])] })}>Review role</button></article>)}</div>;
}

function Permissions({ roles }: { roles: OrgRole[] }) {
  return <div className="org-panel"><div className="org-table-wrap"><table className="org-table permission-matrix"><thead><tr><th>Permission</th>{roles.map(role => <th key={role.id}>{role.name}</th>)}</tr></thead><tbody>{permissions.map(permission => <tr key={permission}><td><code>{permission}</code></td>{roles.map(role => <td key={role.id}>{role.permissions.includes(permission) ? <Check size={14} className="permission-check" /> : <span className="permission-none">-</span>}</td>)}</tr>)}</tbody></table></div></div>;
}

function Governance({ locked, proposals, voters, onToggle, onVote }: {
  locked: boolean; proposals: ReturnType<typeof useOrgGraphStore.getState>['proposals']; voters: OrgGraphNode[];
  onToggle: () => void; onVote: (proposalId: string, voterId: string, choice: 'approve' | 'reject') => void;
}) {
  const voter = voters[0];
  return <div className="org-governance-layout">
    <section className="org-governance-summary"><div className={locked ? 'locked' : ''}>{locked ? <Lock size={22} /> : <Unlock size={22} />}<h2>Governance Lock</h2><p>{locked ? 'Sensitive organization changes require board approval.' : 'Authorized users can modify the organization graph directly.'}</p><button onClick={onToggle}>{locked ? 'Disable lock' : 'Enable lock'}</button></div>
      <div className="org-governance-metrics"><Info label="Board voters" value={String(voters.length)} /><Info label="Pending proposals" value={String(proposals.filter(item => item.status === 'voting').length)} /><Info label="Approval threshold" value={`${Math.max(1, Math.ceil(voters.length / 2))} votes`} /></div>
    </section>
    <section className="org-proposal-list"><header><div><h2>Organization change proposals</h2><p>Approved proposals are applied automatically to the graph.</p></div><Vote size={18} /></header>
      {proposals.length === 0 && <div className="org-empty"><ShieldCheck size={28} /><strong>No organization proposals</strong><span>Governed changes will enter the board voting queue.</span></div>}
      {proposals.map(proposal => <article key={proposal.id}><div><span className={`proposal-state ${proposal.status}`}>{proposal.status}</span><h3>{proposal.title}</h3><p>{proposal.description}</p><small>{new Date(proposal.createdAt).toLocaleString()} · {Object.keys(proposal.votes).length} votes</small></div>{proposal.status === 'voting' && voter && <div className="proposal-actions"><button onClick={() => onVote(proposal.id, voter.id, 'reject')}>Reject</button><button className="approve" onClick={() => onVote(proposal.id, voter.id, 'approve')}>Approve as {voter.name}</button></div>}</article>)}
    </section>
  </div>;
}

function NodeModal({ node, preset, departments, teams, roles, onClose, onSave }: {
  node?: OrgGraphNode; preset?: OrgEntityType; departments: OrgGraphNode[]; teams: OrgGraphNode[]; roles: OrgRole[];
  onClose: () => void; onSave: (node: OrgGraphNode) => void;
}) {
  const createdAt = node?.createdAt ?? new Date().toISOString();
  const [form, setForm] = useState<OrgGraphNode>(node ?? {
    id: crypto.randomUUID(), type: preset ?? 'human', name: '', color: typeMeta[preset ?? 'human'].color,
    status: 'active', permissions: [], position: { x: 420 + Math.random() * 180, y: 300 + Math.random() * 180 },
    createdAt, updatedAt: createdAt,
  });
  const update = (patch: Partial<OrgGraphNode>) => setForm(current => ({ ...current, ...patch }));
  const structural = ['department', 'team', 'committee', 'board'].includes(form.type);
  return <Modal title={`${node ? 'Edit' : 'Create'} ${typeMeta[form.type].label}`} onClose={onClose}>
    <div className="org-form-grid">
      <Field label="Node type"><select className="org-input" value={form.type} onChange={event => update({ type: event.target.value as OrgEntityType, color: typeMeta[event.target.value as OrgEntityType].color })}>{Object.entries(typeMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}</select></Field>
      <Field label="Name"><input className="org-input" autoFocus value={form.name} onChange={event => update({ name: event.target.value })} /></Field>
      <Field label={structural ? 'Description' : 'Title'} wide>{structural ? <textarea className="org-input" rows={3} value={form.description || ''} onChange={event => update({ description: event.target.value })} /> : <input className="org-input" value={form.title || ''} onChange={event => update({ title: event.target.value })} />}</Field>
      {!structural && <><Field label="Role"><select className="org-input" value={form.role || 'member'} onChange={event => { const role = roles.find(item => item.id === event.target.value); update({ role: event.target.value, permissions: role?.permissions ?? [] }); }}>{roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select></Field><Field label="Status"><select className="org-input" value={form.status} onChange={event => update({ status: event.target.value as OrgGraphNode['status'] })}><option value="active">Active</option><option value="busy">Busy</option><option value="inactive">Inactive</option><option value="invited">Invited</option></select></Field></>}
      {form.type === 'human' && <><Field label="Username"><input className="org-input" value={form.username || ''} onChange={event => update({ username: event.target.value })} /></Field><Field label="Email"><input type="email" className="org-input" value={form.email || ''} onChange={event => update({ email: event.target.value })} /></Field></>}
      {form.type === 'agent' && <><Field label="Provider"><select className="org-input" value={form.provider || 'OpenClaw'} onChange={event => update({ provider: event.target.value as AgentProvider })}>{providers.map(provider => <option key={provider}>{provider}</option>)}</select></Field><Field label="Model"><input className="org-input" value={form.model || ''} onChange={event => update({ model: event.target.value })} /></Field></>}
      {(form.type === 'human' || form.type === 'agent' || form.type === 'team') && <Field label="Department"><select className="org-input" value={form.departmentId || ''} onChange={event => update({ departmentId: event.target.value || undefined })}><option value="">Unassigned</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
      {(form.type === 'human' || form.type === 'agent') && <Field label="Team"><select className="org-input" value={form.teamId || ''} onChange={event => update({ teamId: event.target.value || undefined })}><option value="">Unassigned</option>{teams.filter(item => !form.departmentId || item.departmentId === form.departmentId).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
      <Field label="Color"><input type="color" className="org-color-input" value={form.color} onChange={event => update({ color: event.target.value })} /></Field>
      {!structural && <div className="org-checks"><label><input type="checkbox" checked={Boolean(form.boardMember)} onChange={event => update({ boardMember: event.target.checked })} /> Board member</label><label><input type="checkbox" checked={Boolean(form.votingRights)} onChange={event => update({ votingRights: event.target.checked })} /> Voting rights</label></div>}
    </div>
    <ModalActions onClose={onClose} disabled={!form.name.trim()} onSave={() => onSave({ ...form, updatedAt: new Date().toISOString() })} />
  </Modal>;
}

function InviteModal({ departments, roles, onClose, onSave }: { departments: OrgGraphNode[]; roles: OrgRole[]; onClose: () => void; onSave: (invite: OrgInvitation) => void }) {
  const [email, setEmail] = useState(''); const [role, setRole] = useState('member'); const [departmentId, setDepartmentId] = useState('');
  const [method, setMethod] = useState<OrgInvitation['method']>('link'); const [expiration, setExpiration] = useState('7d');
  const token = useMemo(() => method === 'code'
    ? `AVAI-${String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0')}`
    : crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase(), [method]);
  const expiresAt = expiration === 'never' ? null : new Date(Date.now() + (expiration === '24h' ? 86400000 : 604800000)).toISOString();
  return <Modal title="Invite user" onClose={onClose}><div className="org-form-grid">
    <Field label="Email" wide><input type="email" autoFocus className="org-input" value={email} onChange={event => setEmail(event.target.value)} placeholder="person@company.com" /></Field>
    <Field label="Role"><select className="org-input" value={role} onChange={event => setRole(event.target.value)}>{roles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    <Field label="Department"><select className="org-input" value={departmentId} onChange={event => setDepartmentId(event.target.value)}><option value="">Unassigned</option>{departments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    <Field label="Invite method"><select className="org-input" value={method} onChange={event => setMethod(event.target.value as OrgInvitation['method'])}><option value="link">Generate Invite Link</option><option value="email">Send Email Invite</option><option value="code">Generate Invite Code</option></select></Field>
    <Field label="Expiration"><select className="org-input" value={expiration} onChange={event => setExpiration(event.target.value)}><option value="24h">24 hours</option><option value="7d">7 days</option><option value="never">Never</option></select></Field>
    <div className="invite-preview"><Link2 size={14} /><code>{method === 'code' ? token : `avai.app/join/${token}`}</code><button onClick={() => void navigator.clipboard?.writeText(method === 'code' ? token : `https://avai.app/join/${token}`)}><Copy size={13} /></button></div>
  </div><ModalActions onClose={onClose} disabled={!email.includes('@')} label={method === 'email' ? 'Send invite' : 'Generate invite'} onSave={() => onSave({ id: crypto.randomUUID(), email, role, departmentId: departmentId || undefined, permissions: roles.find(item => item.id === role)?.permissions ?? [], method, token, expiresAt, status: 'pending', createdAt: new Date().toISOString() })} /></Modal>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="org-modal-overlay" onMouseDown={onClose}><div className="org-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}><header><div><Sparkles size={15} /><h2>{title}</h2></div><button onClick={onClose}><X size={15} /></button></header><div className="org-modal-body">{children}</div></div></div>;
}

function ModalActions({ onClose, onSave, disabled, label = 'Save changes' }: { onClose: () => void; onSave: () => void; disabled?: boolean; label?: string }) {
  return <div className="org-modal-actions"><button onClick={onClose}>Cancel</button><button className="primary" disabled={disabled} onClick={onSave}>{label}</button></div>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`org-field ${wide ? 'wide' : ''}`}><span>{label}</span>{children}</label>;
}
