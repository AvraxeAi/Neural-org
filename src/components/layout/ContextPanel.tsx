import React, { useEffect, useMemo, useState } from 'react';
import { Bot, CheckSquare, FileText, HardDrive, Layers, Plus, X } from 'lucide-react';
import { t } from '../../lib/designTokens';

type ContextTab = 'context' | 'memory' | 'files' | 'tasks' | 'agents';

interface ContextPanelProps {
  open: boolean;
  onClose: () => void;
  activeTab?: ContextTab;
}

const tabs: { id: ContextTab; label: string }[] = [
  { id: 'context', label: 'Context' },
  { id: 'memory', label: 'Memory' },
  { id: 'files', label: 'Files' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'agents', label: 'Agents' },
];

const memories = [
  { id: 'm1', title: 'AvraxeAi should prioritize quality memories over volume.', category: 'Decision', confidence: 0.94 },
  { id: 'm2', title: 'AvraxeAi is the active organizational workspace.', category: 'Org', confidence: 0.88 },
  { id: 'm3', title: 'Construction Co. project uses governance-gated task flow.', category: 'Project', confidence: 0.81 },
  { id: 'm4', title: 'Rusty prefers direct implementation over long proposals.', category: 'Preference', confidence: 0.76 },
];

const tasks = [
  { id: 't1', title: 'Review Memory OS backend schema', status: 'active', priority: 'High', owner: 'Rusty' },
  { id: 't2', title: 'Approve board proposal lifecycle', status: 'proposed', priority: 'Medium', owner: 'Board' },
  { id: 't3', title: 'Attach repo ingestion notes', status: 'ready', priority: 'Low', owner: 'Codex' },
];

const files = [
  { id: 'f1', name: 'memory-os-spec.md', date: 'Jun 5' },
  { id: 'f2', name: 'board-policy.pdf', date: 'Jun 4' },
  { id: 'f3', name: 'repo-map.json', date: 'Jun 4' },
];

const agents = [
  { id: 'openclaw', name: 'Cash', model: 'claude-sonnet-4-6', status: 'active' },
  { id: 'codex', name: 'Codex', model: 'codex', status: 'active' },
  { id: 'hermes', name: 'Hermes', model: 'hermes', status: 'idle' },
  { id: 'lisa', name: 'Lisa', model: 'gpt-4o', status: 'busy' },
];

export default function ContextPanel({ open, onClose, activeTab = 'context' }: ContextPanelProps) {
  const [tab, setTab] = useState<ContextTab>(activeTab);
  const [taskTitle, setTaskTitle] = useState('');
  const recentMemories = useMemo(() => memories.slice(0, 3), []);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  const mentionAgent = (agentId: string) => {
    window.dispatchEvent(new CustomEvent('agent-mention', { detail: { agentId } }));
  };

  return (
    <aside
      aria-hidden={!open}
      aria-label="Workspace context panel"
      style={{
        width: 320,
        height: '100vh',
        flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderLeft: `1px solid ${t.border}`,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 180ms cubic-bezier(0.16,1,0.3,1)',
        display: 'flex',
        flexDirection: 'column',
        position: open ? 'relative' : 'absolute',
        right: 0,
        top: 0,
        zIndex: 20,
        boxShadow: open ? '-12px 0 32px rgba(0,0,0,0.18)' : 'none',
      }}
    >
      <header style={styles.header}>
        <div>
          <div style={styles.title}>Workspace Context</div>
          <div style={styles.subtle}>Scoped assistant state</div>
        </div>
        <button aria-label="Close context panel" onClick={onClose} style={styles.iconButton}><X size={15} /></button>
      </header>

      <nav style={styles.tabs} aria-label="Context panel tabs">
        {tabs.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} aria-pressed={tab === item.id} style={{ ...styles.tab, ...(tab === item.id ? styles.tabActive : {}) }}>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={styles.body}>
        {tab === 'context' && (
          <Section>
            <InfoRow label="Workspace" value="AvraxeAi" badge="Org" />
            <InfoRow label="Project" value="My Construction Co." />
            <InfoRow label="Active agent" value="Cash" badge="online" />
            <BlockTitle icon={Layers} title="Relevant Memories" />
            {recentMemories.map(memory => <MemoryRow key={memory.id} memory={memory} />)}
            <BlockTitle icon={CheckSquare} title="Active Tasks" />
            {tasks.map(task => <TaskRow key={task.id} task={task} />)}
          </Section>
        )}

        {tab === 'memory' && (
          <Section>
            {memories.map(memory => (
              <button key={memory.id} onClick={() => console.log('memory detail', memory.id)} aria-label={`Open memory ${memory.title}`} style={styles.memoryButton}>
                <span style={styles.itemTitle}>{memory.title}</span>
                <span style={styles.itemMeta}>{memory.category} · {(memory.confidence * 100).toFixed(0)}%</span>
              </button>
            ))}
          </Section>
        )}

        {tab === 'files' && (
          <Section>
            {files.length ? files.map(file => (
              <div key={file.id} style={styles.fileRow}>
                <FileText size={15} style={{ color: t.accent }} />
                <div style={{ minWidth: 0 }}>
                  <div style={styles.itemTitle}>{file.name}</div>
                  <div style={styles.itemMeta}>{file.date}</div>
                </div>
              </div>
            )) : <Empty icon={HardDrive} text="No recent files." />}
          </Section>
        )}

        {tab === 'tasks' && (
          <Section fill>
            <div style={{ display: 'grid', gap: 8 }}>
              {tasks.map(task => <TaskRow key={task.id} task={task} showOwner />)}
            </div>
            <div style={styles.addTask}>
              <input
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                placeholder="Add task"
                aria-label="Add task"
                style={styles.input}
              />
              <button aria-label="Add task" style={styles.iconButton} onClick={() => setTaskTitle('')}><Plus size={14} /></button>
            </div>
          </Section>
        )}

        {tab === 'agents' && (
          <Section>
            {agents.map(agent => (
              <button key={agent.id} onClick={() => mentionAgent(agent.id)} aria-label={`Mention ${agent.name}`} style={styles.agentRow}>
                <span style={{ ...styles.statusDot, background: agent.status === 'busy' ? t.amber : agent.status === 'active' ? t.green : t.textMuted }} />
                <div style={{ minWidth: 0, textAlign: 'left' }}>
                  <div style={styles.itemTitle}>{agent.name}</div>
                  <div style={styles.itemMeta}>{agent.model}</div>
                </div>
              </button>
            ))}
          </Section>
        )}
      </div>
    </aside>
  );
}

function Section({ children, fill }: { children: React.ReactNode; fill?: boolean }) {
  return <div style={{ ...styles.section, ...(fill ? { minHeight: '100%', justifyContent: 'space-between' } : {}) }}>{children}</div>;
}

function BlockTitle({ icon: Icon, title }: { icon: typeof Layers; title: string }) {
  return <div style={styles.blockTitle}><Icon size={13} /> {title}</div>;
}

function InfoRow({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.itemMeta}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span style={styles.itemTitle}>{value}</span>
        {badge && <span style={styles.badge}>{badge}</span>}
      </div>
    </div>
  );
}

function MemoryRow({ memory }: { memory: typeof memories[number] }) {
  return (
    <div style={styles.card}>
      <div style={styles.itemTitle}>{memory.title}</div>
      <div style={styles.confidenceTrack}><div style={{ ...styles.confidenceBar, width: `${memory.confidence * 100}%` }} /></div>
    </div>
  );
}

function TaskRow({ task, showOwner }: { task: typeof tasks[number]; showOwner?: boolean }) {
  return (
    <div style={styles.card}>
      <div style={styles.itemTitle}>{task.title}</div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 7 }}>
        <span style={styles.badge}>{task.status}</span>
        {showOwner && <span style={styles.itemMeta}>{task.owner}</span>}
      </div>
    </div>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof HardDrive; text: string }) {
  return <div style={styles.empty}><Icon size={22} /><span>{text}</span></div>;
}

const styles: Record<string, React.CSSProperties> = {
  header: { padding: '14px 14px 12px', borderBottom: `1px solid ${t.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { fontSize: 14, fontWeight: 800, color: t.textPrimary },
  subtle: { fontSize: 11, color: t.textMuted, marginTop: 2 },
  iconButton: { width: 30, height: 30, display: 'grid', placeItems: 'center', border: `1px solid ${t.border}`, borderRadius: 8, background: t.surfaceRaise, color: t.textSecond, cursor: 'pointer' },
  tabs: { display: 'flex', gap: 4, padding: 10, borderBottom: `1px solid ${t.border}`, overflowX: 'auto' },
  tab: { border: 'none', borderRadius: 8, padding: '6px 9px', background: 'transparent', color: t.textMuted, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  tabActive: { background: t.surfaceRaise, color: t.textPrimary },
  body: { flex: 1, minHeight: 0, overflowY: 'auto' },
  section: { padding: 14, display: 'flex', flexDirection: 'column', gap: 10 },
  blockTitle: { marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: t.textMuted, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em' },
  infoRow: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${t.border}` },
  card: { background: t.bgSub, border: `1px solid ${t.border}`, borderRadius: 8, padding: 10 },
  itemTitle: { fontSize: 12.5, fontWeight: 700, color: t.textPrimary, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis' },
  itemMeta: { fontSize: 11, color: t.textMuted },
  badge: { fontSize: 10, fontWeight: 800, color: t.accent, border: `1px solid ${t.accentBorder}`, background: t.accentDim, borderRadius: 99, padding: '2px 7px', whiteSpace: 'nowrap' },
  confidenceTrack: { height: 5, background: t.surfaceRaise, borderRadius: 99, overflow: 'hidden', marginTop: 8 },
  confidenceBar: { height: '100%', background: t.accent, borderRadius: 99 },
  memoryButton: { textAlign: 'left', background: t.bgSub, border: `1px solid ${t.border}`, borderRadius: 8, padding: 10, cursor: 'pointer', display: 'grid', gap: 4 },
  fileRow: { display: 'flex', alignItems: 'center', gap: 9, padding: 10, background: t.bgSub, border: `1px solid ${t.border}`, borderRadius: 8 },
  agentRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: 10, background: t.bgSub, border: `1px solid ${t.border}`, borderRadius: 8, cursor: 'pointer' },
  statusDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  addTask: { display: 'flex', gap: 8, paddingTop: 12, borderTop: `1px solid ${t.border}` },
  input: { flex: 1, minWidth: 0, background: t.bgSub, border: `1px solid ${t.border}`, borderRadius: 8, color: t.textPrimary, padding: '8px 10px', fontSize: 12 },
  empty: { minHeight: 180, display: 'grid', placeItems: 'center', gap: 8, color: t.textMuted, textAlign: 'center', fontSize: 13 },
};
