import React, { useCallback, useState } from 'react';
import { Plus, Pencil, UserPlus } from 'lucide-react';
import type { OrgNode, OrgNodePermission, OrgNodeProvider } from '../../types/index';
import { OrgDocuments } from './OrgDocuments';
import { OrgMeetings } from './OrgMeetings';
import { OrgActivity, OrgCRM } from './OrgActivityCRM';
import { OrgSettings } from './OrgSettings';

// ── Types & constants ──────────────────────────────────────

type SubTab = 'overview' | 'chart' | 'projects' | 'discussions' | 'tasks' | 'documents' | 'crm' | 'meetings' | 'activity' | 'settings';

const SUB_TABS: { id: SubTab; label: string; icon: string }[] = [
  { id: 'overview',    label: 'Overview',    icon: '⊞' },
  { id: 'chart',       label: 'Org Chart',   icon: '⬡' },
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

const DEFAULT_NODES: OrgNode[] = [
  {
    id: '1', name: 'Rusty', title: 'Owner',
    model: 'claude-sonnet-4-6', agentName: 'Orchestrator', provider: 'anthropic',
    initial: 'R', color: '#00E6A8', status: 'online', parentId: null, permissionType: 'owner',
  },
  {
    id: '2', name: 'Sarah K.', title: 'Legal Admin',
    model: 'gemini-flash-3', agentName: 'LawAssist', provider: 'google',
    initial: 'S', color: '#3B82F6', status: 'online', parentId: '1', permissionType: 'admin',
  },
  {
    id: '3', name: 'Marcus T.', title: 'Team Member',
    model: null, agentName: null, provider: null,
    initial: 'M', color: '#8B5CF6', status: 'busy', parentId: '1', permissionType: 'member',
  },
  {
    id: '4', name: 'Alex R.', title: 'Guest',
    model: null, agentName: null, provider: null,
    initial: 'A', color: '#F59E0B', status: 'offline', parentId: '1', permissionType: 'guest',
  },
];

function loadNodes(): OrgNode[] {
  try {
    const raw = localStorage.getItem('openclaw:org:nodes');
    if (raw) return JSON.parse(raw) as OrgNode[];
  } catch { /* fallback */ }
  return DEFAULT_NODES;
}

function persistNodes(nodes: OrgNode[]) {
  localStorage.setItem('openclaw:org:nodes', JSON.stringify(nodes));
}

// ── Shared style helpers ───────────────────────────────────

const inputSt: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.82)',
  border: '1px solid rgba(0,0,0,0.09)',
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
  background: 'rgba(255,255,255,0.6)',
  border: '1px solid rgba(0,0,0,0.08)', borderRadius: 9,
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
  const [form, setForm] = useState<OrgNode>(
    node ?? {
      id: Date.now().toString(),
      name: '', title: '',
      model: null, agentName: null, provider: null,
      initial: '', color: '#3B82F6',
      status: 'online', parentId: null, permissionType: 'member',
    }
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = useCallback(<K extends keyof OrgNode>(key: K, val: OrgNode[K]) => {
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

  const availableParents = nodes.filter(n => n.id !== form.id);
  const canSave = form.name.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isNew ? 'Add org member' : `Edit ${form.name}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15,17,23,0.38)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 'min(100%, 480px)',
          background: 'rgba(248,249,252,0.99)',
          border: '1px solid rgba(0,0,0,0.07)',
          borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,0.16)',
          overflow: 'hidden',
          animation: 'fadeUp 0.2s cubic-bezier(0.16,1,0.3,1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '17px 20px 15px', borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px' }}>
            {isNew ? 'Add Member / Agent' : `Edit: ${node.name}`}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>✕</button>
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
              <option value="">None (root node)</option>
              {availableParents.map(n => (
                <option key={n.id} value={n.id}>{n.name} — {n.title}</option>
              ))}
            </select>
          </MField>

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
                    border: `3px solid ${form.color === c ? 'white' : 'transparent'}`,
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
          borderTop: '1px solid rgba(0,0,0,0.06)',
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
}

function OrgChartNode({ node, onEdit }: { node: OrgNode; onEdit: () => void }) {
  const [hovered, setHovered] = useState(false);
  const isRoot = node.parentId === null;

  return (
    <div
      className="org-node-wrap"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isRoot
          ? `linear-gradient(135deg, ${node.color}1A, ${node.color}0A)`
          : 'rgba(255,255,255,0.72)',
        border: `1.5px solid ${isRoot ? node.color + '40' : 'rgba(0,0,0,0.07)'}`,
        borderRadius: 14,
        padding: '13px 16px',
        minWidth: 148, maxWidth: 180,
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'box-shadow 0.18s, transform 0.18s',
        boxShadow: hovered
          ? `0 8px 24px ${node.color}25`
          : isRoot ? `0 4px 16px ${node.color}18` : '0 2px 8px rgba(0,0,0,0.06)',
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
          border: '1px solid rgba(0,0,0,0.08)',
          background: 'rgba(255,255,255,0.85)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
          padding: 0,
        }}
      >
        <Pencil size={11} />
      </button>

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

      {node.model && (
        <div style={{
          fontSize: 9, color: 'var(--text-secondary)',
          background: 'rgba(0,0,0,0.05)', borderRadius: 5,
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
    </div>
  );
}

function OrgTreeNode({
  node, childrenOf, onEditNode,
}: {
  node: OrgNode;
  childrenOf: Map<string | null, OrgNode[]>;
  onEditNode: (n: OrgNode) => void;
}) {
  const children = childrenOf.get(node.id) ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <OrgChartNode node={node} onEdit={() => onEditNode(node)} />
      {children.length > 0 && (
        <>
          <div style={{ width: 2, height: 26, background: 'rgba(0,0,0,0.08)' }} />
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {children.map(child => (
              <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 2, height: 26, background: 'rgba(0,0,0,0.08)' }} />
                <OrgTreeNode node={child} childrenOf={childrenOf} onEditNode={onEditNode} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OrgChartView({ nodes, onEditNode, onAddNode }: OrgChartViewProps) {
  const childrenOf = new Map<string | null, OrgNode[]>();
  for (const n of nodes) {
    const key = n.parentId ?? null;
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(n);
  }

  const roots = childrenOf.get(null) ?? [];

  return (
    <div className="glass-card" style={{ padding: '20px 24px', minHeight: 320, overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Organization Chart
        </div>
        <button onClick={onAddNode} style={{ ...btnPrimary, padding: '6px 12px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
          <UserPlus size={12} />
          Add Node
        </button>
      </div>

      {roots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⬡</div>
          <div style={{ fontSize: 13, marginBottom: 8 }}>No members yet</div>
          <button onClick={onAddNode} style={{ ...btnPrimary, padding: '8px 20px' }}>
            Add First Member
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 40, justifyContent: 'center', padding: '0 0 12px', overflowX: 'auto' }}>
          {roots.map(root => (
            <OrgTreeNode key={root.id} node={root} childrenOf={childrenOf} onEditNode={onEditNode} />
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
}: {
  nodes: OrgNode[];
  onEditNode: (n: OrgNode) => void;
  onAddNode: () => void;
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
            <button onClick={onAddNode} style={{ ...btnPrimary, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
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
          <button onClick={onAddNode} style={{ ...btnGhost, fontSize: 11, padding: '5px 11px', display: 'flex', alignItems: 'center', gap: 4 }}>
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
                  background: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  borderRadius: 10, cursor: 'pointer',
                  transition: 'background 0.13s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.75)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
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
            padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)',
            background: i === 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
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
                <span style={{ background: 'rgba(0,0,0,0.07)', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 7px', color: 'var(--text-muted)' }}>{items.length}</span>
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
                <div style={{ border: '1.5px dashed rgba(0,0,0,0.09)', borderRadius: 10, padding: '10px', textAlign: 'center', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}>+ Add</div>
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
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', fontWeight: 700, fontSize: 13 }}>{activeChannel}</div>
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
        <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <input placeholder={`Message ${activeChannel}...`} style={{ width: '100%', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 9, padding: '9px 14px', fontSize: 12 }} />
        </div>
      </div>
    </div>
  );
}

// ── Tasks ─────────────────────────────────────────────────

const TASKS_DATA = [
  { title: 'Review Patricia Cruz intake form', assignee: 'Rusty',        priority: 'High',   status: 'In Progress', due: 'Apr 26' },
  { title: 'Draft attorney one-pager',         assignee: 'Orchestrator', priority: 'High',   status: 'In Progress', due: 'Apr 27' },
  { title: 'Legal intake pipeline deploy',     assignee: 'LawAssist',    priority: 'High',   status: 'Backlog',     due: 'May 5'  },
  { title: 'Schedule James Holloway demo',     assignee: 'Rusty',        priority: 'High',   status: 'Backlog',     due: 'Apr 30' },
  { title: 'CRM skill install + configure',    assignee: 'Rusty',        priority: 'Medium', status: 'Backlog',     due: 'May 15' },
  { title: 'Cost report cron fix',             assignee: 'Orchestrator', priority: 'Low',    status: 'Backlog',     due: 'May 1'  },
];

function Tasks() {
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button style={{ marginLeft: 'auto', ...btnPrimary, fontSize: 12, padding: '7px 14px' }}>+ New Task</button>
      </div>
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              {['Task', 'Assignee', 'Priority', 'Status', 'Due'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TASKS_DATA.map((t, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
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

// ── Main component ─────────────────────────────────────────

export default function Organization() {
  const [sub, setSub] = useState<SubTab>('overview');
  const [nodes, setNodes] = useState<OrgNode[]>(loadNodes);
  const [editTarget, setEditTarget] = useState<OrgNode | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openEdit = useCallback((node: OrgNode) => {
    setEditTarget(node);
    setModalOpen(true);
  }, []);

  const openAdd = useCallback(() => {
    setEditTarget(null);
    setModalOpen(true);
  }, []);

  const handleSave = useCallback((updated: OrgNode) => {
    setNodes(prev => {
      const exists = prev.some(n => n.id === updated.id);
      const next = exists ? prev.map(n => n.id === updated.id ? updated : n) : [...prev, updated];
      persistNodes(next);
      return next;
    });
    setModalOpen(false);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setNodes(prev => {
      // Reassign children to deleted node's parent
      const target = prev.find(n => n.id === id);
      const next = prev
        .filter(n => n.id !== id)
        .map(n => n.parentId === id ? { ...n, parentId: target?.parentId ?? null } : n);
      persistNodes(next);
      return next;
    });
    setModalOpen(false);
  }, []);

  const renderSub = () => {
    switch (sub) {
      case 'overview':
        return <OrgOverview nodes={nodes} onEditNode={openEdit} onAddNode={openAdd} />;
      case 'chart':
        return <OrgChartView nodes={nodes} onEditNode={openEdit} onAddNode={openAdd} />;
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
        background: 'rgba(255,255,255,0.55)',
        border: '1px solid rgba(0,0,0,0.07)',
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
              background: sub === t.id ? 'white' : 'transparent',
              color: sub === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 12, fontWeight: sub === t.id ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.13s',
              boxShadow: sub === t.id ? '0 2px 6px rgba(0,0,0,0.07)' : 'none',
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
    </div>
  );
}
