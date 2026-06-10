import React, { useCallback, useEffect, useState } from 'react';
import { Plus, UserPlus, Lock, Unlock, Edit3, UserCog } from 'lucide-react';
import type { OrgNode, OrgNodePermission, OrgNodeProvider } from '../../types/index';
import { agentsApi, chatSend, memoryApi, metricsApi, orgTasksApi, workflowsApi } from '../../lib/api';
import { OrgDocuments } from './OrgDocuments';
import { OrgMeetings } from './OrgMeetings';
import { OrgActivity, OrgCRM } from './OrgActivityCRM';
import { OrgSettings } from './OrgSettings';
import { OrgBoard } from './OrgBoard';
import { useOrgStore, type OrgMember as StoreOrgMember } from '../../store/orgStore';

// ── Types & constants ──────────────────────────────────────

type SubTab = 'overview' | 'chart' | 'board' | 'projects' | 'discussions' | 'tasks' | 'documents' | 'crm' | 'meetings' | 'activity' | 'settings';

type EditableOrgNode = OrgNode & {
  department?: string;
  description?: string;
  is_board_member?: boolean;
};

type ProposalChange =
  | { type: 'edit'; node: OrgNode }
  | { type: 'delete'; nodeId: string }
  | { type: 'add'; node: OrgNode }
  | { type: 'manager_change'; nodeId: string; managerId: string | null };

const SUB_TABS: { id: SubTab; label: string; icon: string }[] = [
  { id: 'overview',    label: 'Overview',    icon: '⊞' },
  { id: 'chart',       label: 'Org Chart',   icon: '⬡' },
  { id: 'board',       label: 'Board',       icon: '⚖' },
  { id: 'projects',    label: 'Projects',    icon: '◳' },
  { id: 'discussions', label: 'Discussions', icon: '✦' },
  { id: 'tasks',       label: 'Tasks',       icon: '✓' },
  { id: 'documents',   label: 'Documents',   icon: '❏' },
  { id: 'crm',         label: 'CRM',         icon: '📇' },
  { id: 'meetings',    label: 'Meetings',    icon: '◷' },
  { id: 'activity',    label: 'Activity',    icon: '◌' },
  { id: 'settings',    label: 'Settings',    icon: '⚙' },
];

const PRESET_COLORS = [
  '#00E6A8', '#3B82F6', '#8B5CF6', '#F59E0B',
  '#EF4444', '#EC4899', '#14B8A6', '#F97316',
];

const AGENT_URLS: Record<string, string> = {
  'openclaw-cash': 'https://cash.srv1427612.hstgr.cloud',
  'hermes-lisa':   'https://hermes.srv1427612.hstgr.cloud',
};

const OPENCLAW_CASH_NODE: OrgNode = {
  id: 'openclaw-cash', name: 'Cash', title: 'COO',
  model: 'claude-sonnet-4-6', agentName: 'openclaw-cash', provider: 'anthropic',
  initial: 'C', color: '#00E6A8', status: 'online', parentId: '1', permissionType: 'admin',
};

const HERMES_LISA_NODE: OrgNode = {
  id: 'hermes-lisa', name: 'Lisa', title: 'CMO',
  model: 'claude-sonnet-4-6', agentName: 'hermes-lisa', provider: 'anthropic',
  initial: 'L', color: '#8B5CF6', status: 'online', parentId: 'openclaw-cash', permissionType: 'admin',
};

const DEFAULT_NODES: OrgNode[] = [
  {
    id: '1', name: 'Rusty', title: 'Owner',
    model: 'claude-sonnet-4-6', agentName: 'Orchestrator', provider: 'anthropic',
    initial: 'R', color: '#F59E0B', status: 'online', parentId: null, permissionType: 'owner',
  },
  OPENCLAW_CASH_NODE,
  HERMES_LISA_NODE,
  {
    id: '2', name: 'Sarah K.', title: 'Legal Admin',
    model: 'gemini-flash-3', agentName: 'LawAssist', provider: 'google',
    initial: 'S', color: '#3B82F6', status: 'online', parentId: '1', permissionType: 'admin',
  },
  {
    id: '3', name: 'Marcus T.', title: 'Team Member',
    model: null, agentName: null, provider: null,
    initial: 'M', color: '#EC4899', status: 'busy', parentId: '1', permissionType: 'member',
  },
  {
    id: '4', name: 'Alex R.', title: 'Guest',
    model: null, agentName: null, provider: null,
    initial: 'A', color: '#94A3B8', status: 'offline', parentId: '1', permissionType: 'guest',
  },
];

function getDescendantIds(nodes: OrgNode[], nodeId: string): Set<string> {
  const descendants = new Set<string>();
  const visit = (id: string) => {
    for (const child of nodes) {
      if (child.parentId !== id || descendants.has(child.id)) continue;
      descendants.add(child.id);
      visit(child.id);
    }
  };
  visit(nodeId);
  return descendants;
}

function wouldCreateCycle(nodes: OrgNode[], nodeId: string, parentId: string | null) {
  if (!parentId || parentId === nodeId) return parentId === nodeId;
  return getDescendantIds(nodes, nodeId).has(parentId);
}

function memberToNode(member: StoreOrgMember): OrgNode {
  return {
    id: member.id,
    name: member.name,
    title: member.title,
    model: member.model ?? null,
    agentName: member.agentName ?? null,
    provider: member.provider === 'custom' ? null : member.provider ?? null,
    initial: member.initial,
    color: member.color,
    status: member.status === 'idle' ? 'offline' : member.status,
    parentId: member.parentId,
    permissionType: member.permissionType === 'operator' ? 'member' : member.permissionType,
  };
}

function nodeToMember(node: OrgNode, existing?: StoreOrgMember): StoreOrgMember {
  return {
    ...existing,
    id: node.id,
    name: node.name,
    title: node.title,
    type: existing?.type ?? (node.agentName ? 'agent' : 'human'),
    model: node.model,
    provider: node.provider === 'local' ? 'custom' : node.provider,
    initial: node.initial,
    color: node.color,
    status: node.status,
    parentId: node.parentId,
    permissionType: node.permissionType,
    agentName: node.agentName,
  };
}

// ── Shared style helpers ───────────────────────────────────

const inputSt: React.CSSProperties = {
  width: '100%',
  background: 'var(--surface-raise)',
  border: '1px solid var(--border)',
  borderRadius: 9,
  padding: '8px 11px',
  fontSize: 12,
  color: 'var(--text-primary)',
  fontFamily: "'Outfit', sans-serif",
};

const btnPrimary: React.CSSProperties = {
  background: 'linear-gradient(135deg, #00E6A8, #00C494)',
  border: 'none', borderRadius: 9,
  padding: '8px 18px', color: '#fff',
  fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700,
  cursor: 'pointer', boxShadow: '0 3px 10px rgba(0,230,168,0.25)',
};

const btnGhost: React.CSSProperties = {
  background: 'var(--surface-raise)',
  border: '1px solid var(--border)', borderRadius: 9,
  padding: '8px 16px', fontSize: 12, fontWeight: 600,
  color: 'var(--text-secondary)', cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
};

const btnDestructive: React.CSSProperties = {
  background: 'rgba(239,68,68,0.08)',
  border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9,
  padding: '8px 14px', fontSize: 12, fontWeight: 600,
  color: 'var(--status-red)', cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif",
};

function PermTag({ type }: { type: OrgNodePermission }) {
  const map: Record<OrgNodePermission, string> = {
    owner: 'tag-accent', admin: 'tag-blue', member: 'tag-violet', guest: 'tag-gray',
  };
  return <span className={`tag ${map[type]}`}>{type.charAt(0).toUpperCase() + type.slice(1)}</span>;
}

// ── Edit Node Modal ────────────────────────────────────────

interface EditNodeModalProps {
  node: OrgNode | null;
  nodes: OrgNode[];
  onSave: (node: OrgNode) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function EditNodeModal({ node, nodes, onSave, onDelete, onClose }: EditNodeModalProps) {
  const isNew = node === null;
  const [form, setForm] = useState<EditableOrgNode>(
    (node as EditableOrgNode | null) ?? {
      id: `new-${Date.now()}`,
      name: '', title: '',
      model: null, agentName: null, provider: null,
      initial: '', color: '#3B82F6',
      status: 'online', parentId: null, permissionType: 'member',
    }
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = useCallback(<K extends keyof EditableOrgNode>(key: K, val: EditableOrgNode[K]) => {
    setForm(f => ({ ...f, [key]: val }));
  }, []);

  const handleNameChange = (v: string) => {
    setForm(f => ({
      ...f,
      name: v,
      initial: f.initial === '' || f.initial === f.name.charAt(0).toUpperCase()
        ? v.charAt(0).toUpperCase()
        : f.initial,
    }));
  };

  const descendantIds = getDescendantIds(nodes, form.id);
  const availableParents = nodes.filter(n => n.id !== form.id && !descendantIds.has(n.id));
  const canSave = form.name.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? 'Add org member' : `Edit ${form.name}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 'min(100%, 480px)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,0.16)',
          overflow: 'hidden',
          animation: 'fadeUp 0.2s cubic-bezier(0.16,1,0.3,1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '17px 20px 15px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>
            <UserCog size={16} color="var(--accent-dark)" />
            {isNew ? 'Add Member / Agent' : `Edit: ${node.name}`}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-raise)', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 13, maxHeight: '62vh', overflowY: 'auto' }}>
          {/* Name + Initial */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 76px', gap: 10 }}>
            <MField label="Name">
              <input value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="Name or agent label" style={inputSt} autoFocus />
            </MField>
            <MField label="Initial">
              <input
                value={form.initial}
                onChange={e => set('initial', (e.target.value.charAt(0) || '').toUpperCase())}
                maxLength={1}
                style={{ ...inputSt, textAlign: 'center', fontWeight: 800, fontSize: 16 }}
              />
            </MField>
          </div>

          {/* Title */}
          <MField label="Title / Role label">
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Owner, Legal Analyst, Senior Agent" style={inputSt} />
          </MField>

          <MField label="Department / Team">
            <input
              value={form.department ?? ''}
              onChange={e => set('department', e.target.value || undefined)}
              placeholder="e.g. Operations, Legal, Marketing"
              style={inputSt}
            />
          </MField>

          <MField label="Description / Notes">
            <textarea
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value || undefined)}
              placeholder="Responsibilities, notes, or context for this node"
              rows={3}
              style={{ ...inputSt, resize: 'vertical', lineHeight: 1.45 }}
            />
          </MField>

          {/* Permission + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MField label="Permission">
              <select value={form.permissionType} onChange={e => set('permissionType', e.target.value as OrgNodePermission)} style={inputSt}>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="guest">Guest</option>
              </select>
            </MField>
            <MField label="Status">
              <select value={form.status} onChange={e => set('status', e.target.value as OrgNode['status'])} style={inputSt}>
                <option value="online">Online</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </MField>
          </div>

          {/* Model */}
          <MField label="Model" hint="AI model assigned to this node">
            <input
              value={form.model ?? ''}
              onChange={e => set('model', e.target.value || null)}
              placeholder="e.g. claude-sonnet-4-6, gpt-4o"
              style={inputSt}
            />
          </MField>

          {/* Agent Name + Provider */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MField label="Agent Name">
              <input
                value={form.agentName ?? ''}
                onChange={e => set('agentName', e.target.value || null)}
                placeholder="e.g. LawAssist"
                style={inputSt}
              />
            </MField>
            <MField label="Provider">
              <select
                value={form.provider ?? ''}
                onChange={e => set('provider', (e.target.value as OrgNodeProvider) || null)}
                style={inputSt}
              >
                <option value="">None</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google</option>
                <option value="local">Local</option>
              </select>
            </MField>
          </div>

          {/* Reports To */}
          <MField label="Reports To">
            <select value={form.parentId ?? ''} onChange={e => set('parentId', e.target.value || null)} style={inputSt}>
              <option value="">No manager / Top level</option>
              {availableParents.map(n => (
                <option key={n.id} value={n.id}>{n.name || n.title || 'Unnamed Node'} — {n.title}</option>
              ))}
            </select>
          </MField>

          <label style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 11px',
            background: 'var(--surface-raise)',
            border: '1px solid var(--border)',
            borderRadius: 9,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={Boolean(form.is_board_member)}
              onChange={e => set('is_board_member', e.target.checked || undefined)}
            />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
              Board member
            </span>
          </label>

          {/* Color */}
          <MField label="Color">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  aria-label={`Color ${c}`}
                  aria-pressed={form.color === c}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: c,
                    border: `3px solid ${form.color === c ? 'var(--text-primary)' : 'transparent'}`,
                    outline: form.color === c ? `2.5px solid ${c}` : 'none',
                    cursor: 'pointer',
                    boxShadow: form.color === c ? `0 0 0 3px ${c}45` : 'none',
                    transition: 'all 0.13s',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </MField>
        </div>

        {/* Footer */}
        <div style={{
          padding: '13px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {!isNew && (
            confirmDelete ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--status-red)' }}>Confirm delete?</span>
                <button onClick={() => onDelete(form.id)} style={{ ...btnDestructive, fontSize: 11, padding: '6px 12px' }}>Delete</button>
                <button onClick={() => setConfirmDelete(false)} style={{ ...btnGhost, fontSize: 11, padding: '6px 12px' }}>Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={btnDestructive}>Delete</button>
            )
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button
            onClick={() => canSave && onSave({ ...form, initial: form.initial || form.name.charAt(0).toUpperCase() })}
            disabled={!canSave}
            style={{ ...btnPrimary, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
          >
            {isNew ? 'Add Node' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: hint ? 2 : 5, letterSpacing: '0.02em' }}>{label}</div>
      {hint && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, lineHeight: 1.3 }}>{hint}</div>}
      {children}
    </div>
  );
}

// ── Org Chart (dynamic) ────────────────────────────────────

interface OrgChartViewProps {
  nodes: OrgNode[];
  onEditNode: (node: OrgNode) => void;
  onAddNode: () => void;
  onChangeParent: (nodeId: string, parentId: string | null) => void;
  govLocked: boolean;
  onToggleLock: () => void;
  onBlockedAdd: () => void;
}

function OrgChartNode({
  node,
  onEdit,
  govLocked,
  connecting,
  connectMode,
  canReceiveDrop,
  onStartConnect,
  onConnectTarget,
  onDropNode,
  onUnlink,
}: {
  node: OrgNode;
  onEdit: () => void;
  govLocked: boolean;
  connecting: boolean;
  connectMode: boolean;
  canReceiveDrop: boolean;
  onStartConnect: () => void;
  onConnectTarget: () => void;
  onDropNode: (draggedId: string) => void;
  onUnlink: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [dragHover, setDragHover] = useState(false);
  const isRoot = node.parentId === null;
  const editableNode = node as EditableOrgNode;

  return (
    <div
      className="org-node-wrap"
      role="button"
      tabIndex={0}
      draggable={!govLocked}
      onDragStart={e => {
        if (govLocked) return;
        e.dataTransfer.setData('text/org-node-id', node.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={e => {
        if (!canReceiveDrop || govLocked) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragHover(true);
      }}
      onDragLeave={() => setDragHover(false)}
      onDrop={e => {
        const draggedId = e.dataTransfer.getData('text/org-node-id');
        setDragHover(false);
        if (!draggedId || govLocked) return;
        e.preventDefault();
        e.stopPropagation();
        onDropNode(draggedId);
      }}
      onClick={() => {
        if (connectMode && !connecting) {
          onConnectTarget();
          return;
        }
        onEdit();
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isRoot
          ? `linear-gradient(135deg, ${node.color}1A, ${node.color}0A)`
          : 'var(--surface-raise)',
        border: dragHover || connecting
          ? `2px solid ${node.color}`
          : govLocked
          ? '1px solid rgba(239,68,68,0.24)'
          : `1.5px solid ${isRoot ? node.color + '40' : 'var(--border)'}`,
        borderRadius: 14,
        padding: '13px 16px',
        minWidth: 148, maxWidth: 180,
        textAlign: 'center',
        cursor: govLocked ? 'pointer' : 'grab',
        transition: 'box-shadow 0.18s, transform 0.18s',
        boxShadow: dragHover || connecting
          ? `0 0 0 4px ${node.color}24, 0 12px 28px rgba(0,0,0,0.28)`
          : govLocked
          ? '0 0 0 1px rgba(239,68,68,0.08), 0 12px 28px rgba(0,0,0,0.22)'
          : hovered
          ? `0 8px 24px ${node.color}25`
          : isRoot ? `0 4px 16px ${node.color}18` : '0 2px 8px var(--border)',
        transform: hovered ? 'translateY(-2px)' : '',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Edit button */}
      <button
        className="org-node-edit-btn"
        onClick={e => { e.stopPropagation(); onEdit(); }}
        aria-label={`Edit ${node.name}`}
        style={{
          position: 'absolute', top: 6, right: 6,
          width: 22, height: 22, borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--surface-raise)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
          padding: 0,
        }}
      >
        <Edit3 size={11} />
      </button>

      {!govLocked && (
        <div style={{ position: 'absolute', left: 6, bottom: 6, display: 'flex', gap: 4, opacity: hovered || connecting ? 1 : 0, transition: 'opacity 0.15s' }}>
          <button
            title={connecting ? 'Click another node to create a hierarchy line' : 'Create hierarchy line'}
            onClick={e => { e.stopPropagation(); onStartConnect(); }}
            style={{ width: 23, height: 23, borderRadius: 6, border: '1px solid var(--border)', background: connecting ? 'var(--accent-soft)' : 'var(--surface-raise)', color: connecting ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11 }}
          >
            ↗
          </button>
          {node.parentId && (
            <button
              title="Remove hierarchy line"
              onClick={e => { e.stopPropagation(); onUnlink(); }}
              style={{ width: 23, height: 23, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface-raise)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {govLocked && (
        <div
          title="Governance lock is enabled"
          style={{
            position: 'absolute', top: 6, left: 6,
            width: 22, height: 22, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.18)',
            color: '#ef4444',
          }}
        >
          <Lock size={11} />
        </div>
      )}

      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: `${node.color}22`,
        border: `2px solid ${node.color}45`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 800, color: node.color,
        margin: '0 auto 8px',
        position: 'relative',
      }}>
        {node.initial || node.name.charAt(0).toUpperCase()}
        <span
          className={`status-dot ${node.status}`}
          style={{ position: 'absolute', bottom: -1, right: -1, border: '1.5px solid white' }}
        />
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, lineHeight: 1.2 }}>
        {node.name}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: node.model || node.agentName ? 6 : 0 }}>
        {node.title}
      </div>

      {editableNode.department && (
        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 5 }}>
          {editableNode.department}
        </div>
      )}

      {node.model && (
        <div style={{
          fontSize: 9, color: 'var(--text-secondary)',
          background: 'var(--border)', borderRadius: 5,
          padding: '2px 6px', display: 'inline-block',
          fontFamily: 'DM Mono, monospace', marginBottom: node.agentName ? 4 : 0,
        }}>
          {node.model}
        </div>
      )}
      {node.agentName && (
        <div style={{
          fontSize: 9, color: 'var(--accent-dark)',
          background: 'var(--accent-soft)', borderRadius: 5,
          padding: '2px 6px', display: 'inline-block',
          fontFamily: 'DM Mono, monospace',
        }}>
          ◎ {node.agentName}
        </div>
      )}
      {node.agentName && AGENT_URLS[node.agentName] && (
        <a
          href={AGENT_URLS[node.agentName]}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            marginTop: 7, padding: '4px 8px',
            background: 'var(--accent)', borderRadius: 6,
            fontSize: 10, fontWeight: 800, color: '#06110d',
            textDecoration: 'none', letterSpacing: '0.02em',
          }}
        >
          Open ↗
        </a>
      )}
    </div>
  );
}

function OrgTreeNode({
  node, nodes, childrenOf, onEditNode, govLocked, connectingFrom, onStartConnect, onChangeParent,
}: {
  node: OrgNode;
  nodes: OrgNode[];
  childrenOf: Map<string | null, OrgNode[]>;
  onEditNode: (n: OrgNode) => void;
  govLocked: boolean;
  connectingFrom: string | null;
  onStartConnect: (id: string) => void;
  onChangeParent: (nodeId: string, parentId: string | null) => void;
}) {
  const children = childrenOf.get(node.id) ?? [];
  const canReceiveDrop = (draggedId: string | null) => Boolean(draggedId && draggedId !== node.id && !wouldCreateCycle(nodes, draggedId, node.id));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <OrgChartNode
        node={node}
        onEdit={() => onEditNode(node)}
        govLocked={govLocked}
        connecting={connectingFrom === node.id}
        connectMode={Boolean(connectingFrom)}
        canReceiveDrop={true}
        onStartConnect={() => onStartConnect(node.id)}
        onConnectTarget={() => onStartConnect(node.id)}
        onDropNode={draggedId => { if (canReceiveDrop(draggedId)) onChangeParent(draggedId, node.id); }}
        onUnlink={() => onChangeParent(node.id, null)}
      />
      {children.length > 0 && (
        <>
          <div style={{ width: 2, height: 26, background: 'var(--border)' }} />
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {children.map(child => (
              <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 2, height: 26, background: 'var(--border)' }} />
                <OrgTreeNode node={child} nodes={nodes} childrenOf={childrenOf} onEditNode={onEditNode} govLocked={govLocked} connectingFrom={connectingFrom} onStartConnect={onStartConnect} onChangeParent={onChangeParent} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OrgChartView({ nodes, onEditNode, onAddNode, onChangeParent, govLocked, onToggleLock, onBlockedAdd }: OrgChartViewProps) {
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const childrenOf = new Map<string | null, OrgNode[]>();
  for (const n of nodes) {
    const key = n.parentId ?? null;
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(n);
  }

  const roots = childrenOf.get(null) ?? [];
  const startConnect = (nodeId: string) => {
    if (!connectingFrom) {
      setConnectingFrom(nodeId);
      return;
    }
    if (connectingFrom === nodeId || wouldCreateCycle(nodes, connectingFrom, nodeId)) {
      setConnectingFrom(null);
      return;
    }
    onChangeParent(connectingFrom, nodeId);
    setConnectingFrom(null);
  };

  return (
    <div
      className="glass-card"
      onDragOver={e => {
        if (govLocked) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={e => {
        const draggedId = e.dataTransfer.getData('text/org-node-id');
        if (!draggedId || govLocked) return;
        e.preventDefault();
        onChangeParent(draggedId, null);
      }}
      style={{ padding: '20px 24px', minHeight: 320, overflow: 'auto' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Organization Chart
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onToggleLock}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              background: govLocked ? 'rgba(239,68,68,0.1)' : 'var(--border)',
              border: `1px solid ${govLocked ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: govLocked ? '#ef4444' : 'var(--text-muted)',
              transition: 'all 0.15s',
              fontFamily: "'Outfit', sans-serif",
            }}
            title={govLocked ? 'Governance lock is enabled' : 'Governance lock is disabled'}
          >
            {govLocked ? <Lock size={13} /> : <Unlock size={13} />}
            {govLocked ? 'Locked' : 'Unlocked'}
          </button>
          <button
            onClick={() => {
              if (govLocked) {
                onBlockedAdd();
                return;
              }
              onAddNode();
            }}
            disabled={govLocked}
            title={govLocked ? 'Unlock governance to add members' : 'Add a new member'}
            style={{
              ...btnPrimary,
              padding: '6px 12px',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              opacity: govLocked ? 0.45 : 1,
              cursor: govLocked ? 'not-allowed' : 'pointer',
            }}
          >
            <UserPlus size={12} />
            Add Node
          </button>
          {connectingFrom && (
            <button
              onClick={() => setConnectingFrom(null)}
              style={{ ...btnGhost, padding: '6px 12px', fontSize: 11, color: 'var(--accent)', borderColor: 'var(--accent-mid)', background: 'var(--accent-soft)' }}
            >
              Click target manager
            </button>
          )}
        </div>
      </div>

      {roots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⬡</div>
          <div style={{ fontSize: 13, marginBottom: 8 }}>No members yet</div>
          <button
            onClick={() => {
              if (govLocked) {
                onBlockedAdd();
                return;
              }
              onAddNode();
            }}
            disabled={govLocked}
            title={govLocked ? 'Unlock governance to add members' : 'Add a new member'}
            style={{ ...btnPrimary, padding: '8px 20px', opacity: govLocked ? 0.45 : 1, cursor: govLocked ? 'not-allowed' : 'pointer' }}
          >
            Add First Member
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 40, justifyContent: 'center', padding: '0 0 12px', overflowX: 'auto' }}>
          {roots.map(root => (
            <OrgTreeNode key={root.id} node={root} nodes={nodes} childrenOf={childrenOf} onEditNode={onEditNode} govLocked={govLocked} connectingFrom={connectingFrom} onStartConnect={startConnect} onChangeParent={onChangeParent} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Org Overview ───────────────────────────────────────────

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="glass-card" style={{ padding: '16px 18px', ...style }}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
      {children}
    </div>
  );
}

function OrgOverview({
  nodes,
  onEditNode,
  onAddNode,
  govLocked,
  onBlockedAdd,
}: {
  nodes: OrgNode[];
  onEditNode: (n: OrgNode) => void;
  onAddNode: () => void;
  govLocked: boolean;
  onBlockedAdd: () => void;
}) {
  const agentCount = nodes.filter(n => n.agentName).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Org header */}
      <div className="glass-card" style={{
        padding: '20px 24px',
        background: 'linear-gradient(135deg, rgba(0,230,168,0.07), rgba(59,130,246,0.05))',
        borderColor: 'rgba(0,230,168,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #00E6A8, #3B82F6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff',
            boxShadow: '0 5px 16px rgba(0,230,168,0.28)',
          }}>
            {nodes[0]?.initial ?? 'O'}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>
              {nodes.find(n => n.permissionType === 'owner')?.name ?? 'Your'}&apos;s Org
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
              {nodes.length} member{nodes.length !== 1 ? 's' : ''} · {agentCount} AI agent{agentCount !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button style={{ ...btnGhost, fontSize: 12 }}>🔗 Invite Link</button>
            <button
              onClick={() => {
                if (govLocked) {
                  onBlockedAdd();
                  return;
                }
                onAddNode();
              }}
              disabled={govLocked}
              title={govLocked ? 'Unlock governance to add members' : 'Add a new member'}
              style={{
                ...btnPrimary,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                opacity: govLocked ? 0.45 : 1,
                cursor: govLocked ? 'not-allowed' : 'pointer',
              }}
            >
              <Plus size={12} />
              Invite Member
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Members',   val: nodes.length.toString(),  icon: '👥' },
          { label: 'AI Agents', val: agentCount.toString(),    icon: '◎' },
          { label: 'Projects',  val: '—',                       icon: '◳' },
          { label: 'Tasks',     val: '—',                       icon: '✓' },
        ].map(s => (
          <GlassCard key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{s.val}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Members */}
      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <SectionTitle>Members</SectionTitle>
          <button
            onClick={() => {
              if (govLocked) {
                onBlockedAdd();
                return;
              }
              onAddNode();
            }}
            disabled={govLocked}
            title={govLocked ? 'Unlock governance to add members' : 'Add a new member'}
            style={{
              ...btnGhost,
              fontSize: 11,
              padding: '5px 11px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              opacity: govLocked ? 0.45 : 1,
              cursor: govLocked ? 'not-allowed' : 'pointer',
            }}
          >
            <Plus size={11} />
            Add
          </button>
        </div>
        {nodes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            No members — add someone to get started.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {nodes.map(n => (
              <div
                key={n.id}
                onClick={() => onEditNode(n)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onEditNode(n)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  background: 'var(--surface-raise)',
                  border: '1px solid var(--border)',
                  borderRadius: 10, cursor: 'pointer',
                  transition: 'background 0.13s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-raise)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-raise)')}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${n.color}1E`, border: `1.5px solid ${n.color}38`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: n.color, flexShrink: 0,
                }}>
                  {n.initial || n.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{n.name}</span>
                    <span className={`status-dot ${n.status}`} />
                  </div>
                  <PermTag type={n.permissionType} />
                </div>
                {n.agentName && (
                  <div style={{
                    fontSize: 10, color: 'var(--accent-dark)',
                    background: 'var(--accent-soft)', borderRadius: 6,
                    padding: '3px 7px', fontFamily: 'DM Mono, monospace',
                    whiteSpace: 'nowrap',
                  }}>
                    ◎ {n.agentName}
                  </div>
                )}
                {n.agentName && AGENT_URLS[n.agentName] && (
                  <a
                    href={AGENT_URLS[n.agentName]}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 9px', borderRadius: 7,
                      background: 'var(--accent)',
                      fontSize: 10, fontWeight: 800, color: '#06110d',
                      textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    Open ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ── Projects (kept as-is, data is sample) ─────────────────

const PROJECTS_DATA = [
  { title: 'Dashboard UI Rebuild',      status: 'In Progress', assignee: 'Rusty',       priority: 'High',   due: 'Apr 30' },
  { title: 'Legal Intake Pipeline',     status: 'In Progress', assignee: 'LawAssist',   priority: 'High',   due: 'May 5'  },
  { title: 'Attorney Beta Onboarding',  status: 'Review',      assignee: 'Orchestrator',priority: 'High',   due: 'Apr 26' },
  { title: 'CRM Auto-Enrichment Skill', status: 'Backlog',     assignee: 'Rusty',       priority: 'Medium', due: 'May 15' },
  { title: 'Billing Integration',       status: 'Backlog',     assignee: 'Marcus T.',   priority: 'Low',    due: 'May 20' },
  { title: 'DeepSeek Model Routing',    status: 'Done',        assignee: 'Rusty',       priority: 'Medium', due: 'Apr 20' },
];

function Projects() {
  const cols = ['Backlog', 'In Progress', 'Review', 'Done'];
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['Kanban', 'List', 'Calendar', 'Timeline'].map((v, i) => (
          <button key={v} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: i === 0 ? 'var(--surface-raise)' : 'var(--surface-raise)',
            fontSize: 12, fontWeight: i === 0 ? 600 : 500,
            color: i === 0 ? 'var(--text-primary)' : 'var(--text-muted)',
            cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
          }}>{v}</button>
        ))}
        <button style={{ marginLeft: 'auto', ...btnPrimary, fontSize: 12, padding: '6px 14px' }}>+ New Project</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {cols.map(col => {
          const items = PROJECTS_DATA.filter(p => p.status === col);
          return (
            <div key={col}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{col}</span>
                <span style={{ background: 'var(--border)', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 7px', color: 'var(--text-muted)' }}>{items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(p => (
                  <div key={p.title} className="glass-card" style={{ padding: '12px 14px', cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4, marginBottom: 8 }}>{p.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.assignee}</span>
                      <span className={`tag tag-${p.priority === 'High' ? 'red' : p.priority === 'Medium' ? 'amber' : 'gray'}`}>{p.priority}</span>
                    </div>
                    {p.due && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5 }}>Due {p.due}</div>}
                  </div>
                ))}
                <div style={{ border: '1.5px dashed var(--border)', borderRadius: 10, padding: '10px', textAlign: 'center', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}>+ Add</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Discussions ────────────────────────────────────────────

const CHANNELS = [
  { name: '# general',        type: 'public', unread: 0 },
  { name: '# legal-strategy', type: 'public', unread: 3 },
  { name: '# dev',            type: 'public', unread: 0 },
  { name: '🤖 agent-room',    type: 'ai',     unread: 1 },
  { name: '📋 board-only',    type: 'board',  unread: 0 },
  { name: '@ Sarah K.',       type: 'dm',     unread: 2 },
  { name: '@ Marcus T.',      type: 'dm',     unread: 0 },
];

function Discussions() {
  const [activeChannel, setActiveChannel] = useState('# legal-strategy');
  return (
    <div style={{ display: 'flex', gap: 16, height: 500 }}>
      <div className="glass-card" style={{ width: 220, padding: '14px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 14px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Channels</div>
        {CHANNELS.map(c => (
          <div key={c.name} onClick={() => setActiveChannel(c.name)} style={{
            padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: activeChannel === c.name ? 'rgba(0,230,168,0.09)' : 'transparent',
            borderLeft: activeChannel === c.name ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'all 0.13s',
          }}>
            <span style={{ fontSize: 12, fontWeight: c.unread > 0 ? 700 : 500, color: activeChannel === c.name ? 'var(--accent-dark)' : 'var(--text-secondary)' }}>{c.name}</span>
            {c.unread > 0 && <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99 }}>{c.unread}</span>}
          </div>
        ))}
      </div>
      <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 13 }}>{activeChannel}</div>
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          {[
            { from: 'Sarah K.', time: '10:23 AM', msg: 'James Holloway confirmed for the demo on May 2nd.', initial: 'S', color: '#3B82F6' },
            { from: 'Orchestrator ◎', time: '10:24 AM', msg: "I'll draft a one-pager and post it in #documents for review.", initial: '◎', color: '#00E6A8' },
            { from: 'Rusty', time: '10:31 AM', msg: 'Keep it under 2 pages, focus on time savings and accuracy.', initial: 'R', color: '#00E6A8' },
          ].map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: `${msg.color}1E`, border: `1.5px solid ${msg.color}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: msg.color, flexShrink: 0 }}>{msg.initial}</div>
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{msg.from}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{msg.time}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{msg.msg}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
          <input placeholder={`Message ${activeChannel}...`} style={{ width: '100%', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 14px', fontSize: 12 }} />
        </div>
      </div>
    </div>
  );
}

// ── Tasks ─────────────────────────────────────────────────

function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const rows = await orgTasksApi.list();
      setTasks(rows.map(t => ({
        ...t,
        title: t.title,
        assignee: t.owner || '—',
        priority: t.priority || 'Medium',
        status: t.status || 'Backlog',
        due: t.due || '',
      })));
    } catch (error) {
      console.error('Failed to load org tasks', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const addTask = async () => {
    const title = window.prompt('Task title:');
    if (!title) return;
    try {
      await orgTasksApi.create({ title, status: 'Backlog', owner: 'Rusty', priority: 'Medium' });
      await loadTasks();
    } catch (error) {
      console.error('Failed to create org task', error);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={addTask} style={{ marginLeft: 'auto', ...btnPrimary, fontSize: 12, padding: '7px 14px' }}>+ New Task</button>
      </div>
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', opacity: loading ? 0.5 : 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Task', 'Assignee', 'Priority', 'Status', 'Due'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t, i) => (
              <tr key={t.id || i} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 500 }}>{t.title}</td>
                <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>{t.assignee}</td>
                <td style={{ padding: '11px 16px' }}><span className={`tag tag-${t.priority === 'High' ? 'red' : t.priority === 'Medium' ? 'amber' : 'gray'}`}>{t.priority}</span></td>
                <td style={{ padding: '11px 16px' }}><span className={`tag tag-${t.status === 'In Progress' ? 'blue' : 'gray'}`}>{t.status}</span></td>
                <td style={{ padding: '11px 16px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>{t.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Governance Proposal Modal ─────────────────────────────

interface GovProposalModalProps {
  change: ProposalChange;
  nodes: OrgNode[];
  onClose: () => void;
  onSubmitted: (message: string) => void;
}

function GovProposalModal({ change, nodes, onClose, onSubmitted }: GovProposalModalProps) {
  const [reason, setReason] = useState('');
  const canSubmit = reason.trim().length >= 10;

  const findNode = (id: string | null) => nodes.find(n => n.id === id);
  const nodeName = (node?: OrgNode) => node?.name || node?.title || 'Unnamed Node';

  const summary = (() => {
    if (change.type === 'edit') return `Update ${nodeName(change.node)}`;
    if (change.type === 'add') return `Add ${nodeName(change.node)} to org`;
    if (change.type === 'delete') return `Remove ${nodeName(findNode(change.nodeId))} from org`;
    return `Move ${nodeName(findNode(change.nodeId))} under ${change.managerId ? nodeName(findNode(change.managerId)) : 'No manager / Top level'}`;
  })();

  const submitProposal = () => {
    if (!canSubmit) return;
    try {
      const raw = localStorage.getItem('openclaw:gov-proposals');
      const parsed = raw ? JSON.parse(raw) : [];
      const proposals = Array.isArray(parsed) ? parsed : [];
      proposals.push({
        id: Date.now().toString(),
        type: change.type,
        summary,
        reason: reason.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        payload: change,
      });
      localStorage.setItem('openclaw:gov-proposals', JSON.stringify(proposals));
    } catch {
      // Proposal persistence is best-effort in restricted storage contexts.
    }
    onSubmitted('Proposal submitted. Awaiting vote.');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Governance Vote Required"
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 'min(100%, 460px)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          animation: 'fadeUp 0.2s cubic-bezier(0.16,1,0.3,1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'rgba(239,68,68,0.09)',
            border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ef4444',
            flexShrink: 0,
          }}>
            <Lock size={15} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>
              Governance Vote Required
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45, marginTop: 4 }}>
              This org chart is locked. Changes require a proposal and vote before they take effect.
            </div>
          </div>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            padding: '11px 12px',
            border: '1px solid var(--border)',
            background: 'var(--surface-raise)',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}>
            {summary}
          </div>

          <MField label="Reason for change" hint="Required. Minimum 10 characters.">
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              placeholder="Explain why this governance change should be approved."
              style={{ ...inputSt, resize: 'vertical', lineHeight: 1.45 }}
              autoFocus
            />
          </MField>
        </div>

        <div style={{
          padding: '13px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
        }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button
            onClick={submitProposal}
            disabled={!canSubmit}
            style={{ ...btnPrimary, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
          >
            Submit Proposal
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────

export default function Organization() {
  const [sub, setSub] = useState<SubTab>('overview');
  const {
    members,
    addMember,
    updateMember,
    deleteMember,
    loadMembers,
    syncMember,
  } = useOrgStore();
  const nodes = members.map(memberToNode);
  const [editTarget, setEditTarget] = useState<OrgNode | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [govLocked, setGovLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('openclaw:gov-lock') === 'true';
    } catch {
      return false;
    }
  });
  const [proposalChange, setProposalChange] = useState<ProposalChange | null>(null);
  const [toastMsg, setToastMsg] = useState<string>('');

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(''), 3000);
  }, []);

  const toggleLock = useCallback(() => {
    setGovLocked((current) => {
      const next = !current;
      try {
        localStorage.setItem('openclaw:gov-lock', String(next));
      } catch {}
      return next;
    });
  }, []);

  const openProposalModal = useCallback((change: ProposalChange) => {
    setProposalChange(change);
  }, []);

  const openEdit = useCallback((node: OrgNode) => {
    setEditTarget(node);
    setModalOpen(true);
  }, []);

  const openAdd = useCallback(() => {
    if (govLocked) {
      showToast('Governance lock is enabled. Submit a proposal to add members.');
      return;
    }
    setEditTarget(null);
    setModalOpen(true);
  }, [govLocked, showToast]);

  const handleSave = useCallback(async (updated: OrgNode) => {
    if (govLocked) {
      const existing = nodes.find(n => n.id === updated.id);
      if (!existing) {
        openProposalModal({ type: 'add', node: updated });
      } else if (existing.parentId !== updated.parentId) {
        openProposalModal({ type: 'manager_change', nodeId: updated.id, managerId: updated.parentId ?? null });
      } else {
        openProposalModal({ type: 'edit', node: updated });
      }
      setModalOpen(false);
      return;
    }

    const safeUpdated = wouldCreateCycle(nodes, updated.id, updated.parentId)
      ? { ...updated, parentId: null }
      : updated;
    const existing = members.find(member => member.id === updated.id);
    const member = nodeToMember(safeUpdated, existing);
    if (existing) updateMember(member.id, member);
    else addMember(member);
    try {
      await syncMember(member);
    } catch (error) {
      console.error('Failed to sync org member', error);
      await loadMembers();
    }
    setModalOpen(false);
  }, [addMember, govLocked, loadMembers, members, nodes, openProposalModal, syncMember, updateMember]);

  const handleDelete = useCallback(async (id: string) => {
    if (govLocked) {
      openProposalModal({ type: 'delete', nodeId: id });
      setModalOpen(false);
      return;
    }

    const target = members.find(member => member.id === id);
    const children = members.filter(member => member.parentId === id);
    try {
      await Promise.all(children.map(async child => {
        const updated = { ...child, parentId: target?.parentId ?? null };
        updateMember(child.id, updated);
        await syncMember(updated);
      }));
      await deleteMember(id);
    } catch (error) {
      console.error('Failed to delete org member', error);
      await loadMembers();
    }
    setModalOpen(false);
  }, [deleteMember, govLocked, loadMembers, members, openProposalModal, syncMember, updateMember]);

  const handleChangeParent = useCallback((nodeId: string, parentId: string | null) => {
    if (nodeId === parentId) return;
    if (govLocked) {
      openProposalModal({ type: 'manager_change', nodeId, managerId: parentId });
      showToast('Governance lock is enabled. Manager change queued as a proposal.');
      return;
    }

    if (wouldCreateCycle(nodes, nodeId, parentId)) {
      showToast('That hierarchy line would create a cycle.');
      return;
    }
    const member = members.find(item => item.id === nodeId);
    if (!member) return;
    const updated = { ...member, parentId };
    updateMember(nodeId, { parentId });
    void syncMember(updated).catch(async error => {
      console.error('Failed to update reporting line', error);
      await loadMembers();
    });
  }, [govLocked, loadMembers, members, nodes, openProposalModal, showToast, syncMember, updateMember]);

  const handleBlockedAdd = useCallback(() => {
    showToast('Governance lock is enabled. Submit a proposal to add members.');
  }, [showToast]);

  const renderSub = () => {
    switch (sub) {
      case 'overview':
        return <OrgOverview nodes={nodes} onEditNode={openEdit} onAddNode={openAdd} govLocked={govLocked} onBlockedAdd={handleBlockedAdd} />;
      case 'chart':
        return (
          <OrgChartView
            nodes={nodes}
            onEditNode={openEdit}
            onAddNode={openAdd}
            onChangeParent={handleChangeParent}
            govLocked={govLocked}
            onToggleLock={toggleLock}
            onBlockedAdd={handleBlockedAdd}
          />
        );
      case 'board':       return <OrgBoard nodes={nodes} />;
      case 'projects':    return <Projects />;
      case 'discussions': return <Discussions />;
      case 'tasks':       return <Tasks />;
      case 'documents':   return <OrgDocuments />;
      case 'crm':         return <OrgCRM />;
      case 'meetings':    return <OrgMeetings />;
      case 'activity':    return <OrgActivity />;
      case 'settings':    return <OrgSettings />;
      default:            return null;
    }
  };

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflowY: 'auto' }}>
      {/* Sub-tabs */}
      <div style={{
        display: 'flex', gap: 2, padding: '4px',
        background: 'var(--surface-raise)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        width: 'fit-content',
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 12px', borderRadius: 9, border: 'none',
              background: sub === t.id ? 'var(--surface-hover)' : 'transparent',
              color: sub === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12, fontWeight: sub === t.id ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.13s',
              boxShadow: sub === t.id ? '0 2px 6px var(--border)' : 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 12 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-content */}
      <div className="animate-fade-in" style={{ flex: 1 }}>
        {renderSub()}
      </div>

      {/* Edit / Add modal */}
      {modalOpen && (
        <EditNodeModal
          node={editTarget}
          nodes={nodes}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalOpen(false)}
        />
      )}

      {proposalChange && (
        <GovProposalModal
          change={proposalChange}
          nodes={nodes}
          onClose={() => setProposalChange(null)}
          onSubmitted={showToast}
        />
      )}

      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            zIndex: 9999,
            background: 'rgba(15,23,42,0.96)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'var(--text-primary)',
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 13,
            boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
          }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
