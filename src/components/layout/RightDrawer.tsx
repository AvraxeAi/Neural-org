import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, Plus, Upload, X } from 'lucide-react';

interface RightDrawerProps {
  panel: 'memory' | 'files' | 'agents' | 'org' | null;
  onClose: () => void;
  projectId?: string;
}

type Panel = NonNullable<RightDrawerProps['panel']>;

const PANEL_TITLES: Record<Panel, string> = {
  memory: 'Memory',
  files: 'Files',
  agents: 'Agents',
  org: 'Organization',
};

const MEMORY = [
  { title: 'Deployment rollout', snippet: 'Use phased deployment after owner approval.', scope: 'Project' },
  { title: 'Memory quality', snippet: 'Prefer structured facts over raw transcript storage.', scope: 'System' },
  { title: 'Governance lock', snippet: 'High-impact actions require explicit confirmation.', scope: 'Org' },
  { title: 'Primary platform', snippet: 'AvraxeAi is the workspace operating hub.', scope: 'Identity' },
];

const FILES = [
  { name: 'deployment-plan.md', size: '18 KB' },
  { name: 'beta-intake.pdf', size: '242 KB' },
  { name: 'repo-map.json', size: '34 KB' },
  { name: 'memory-notes.txt', size: '9 KB' },
];

const AGENTS = [
  { name: 'Cash', initial: 'C', color: 'var(--status-blue)', online: true },
  { name: 'Hermes', initial: 'H', color: 'var(--accent)', online: true },
  { name: 'Titan', initial: 'T', color: 'var(--status-amber)', online: true },
  { name: 'Archivist', initial: 'A', color: 'var(--status-violet)', online: false },
];

const MEMBERS = [
  { name: 'Rusty', role: 'Owner', initial: 'R', color: 'var(--accent)' },
  { name: 'Cash', role: 'CEO', initial: 'C', color: 'var(--status-blue)' },
  { name: 'Lisa', role: 'CMO', initial: 'L', color: 'var(--status-violet)' },
  { name: 'Freida', role: 'Research', initial: 'F', color: 'var(--status-amber)' },
  { name: 'Hughes', role: 'Engineer', initial: 'H', color: 'var(--status-red)' },
];

export default function RightDrawer({ panel, onClose, projectId }: RightDrawerProps) {
  return (
    <AnimatePresence>
      {panel && (
        <motion.div
          key={panel}
          initial={{ x: 300 }}
          animate={{ x: 0 }}
          exit={{ x: 300 }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.22 }}
          style={styles.drawer}
          aria-label={`${PANEL_TITLES[panel]} panel`}
        >
          <div style={styles.header}>
            <div style={styles.titleWrap}>
              <div style={styles.title}>{PANEL_TITLES[panel]}</div>
              {projectId && <div style={styles.projectLabel}>{projectId}</div>}
            </div>
            <HeaderAction panel={panel} />
            <button type="button" onClick={onClose} style={styles.closeButton} aria-label="Close panel">
              <X size={16} />
            </button>
          </div>

          <div style={styles.body}>{renderPanel(panel)}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HeaderAction({ panel }: { panel: Panel }) {
  if (panel === 'memory') {
    return (
      <button type="button" style={styles.actionButton}>
        <Plus size={13} />
        Add Memory
      </button>
    );
  }
  if (panel === 'files') {
    return (
      <button type="button" style={styles.actionButton}>
        <Upload size={13} />
        Upload
      </button>
    );
  }
  if (panel === 'agents') {
    return (
      <button type="button" style={styles.actionButton}>
        <Plus size={13} />
        Add Agent
      </button>
    );
  }
  return null;
}

function renderPanel(panel: Panel) {
  if (panel === 'memory') return <MemoryPanel />;
  if (panel === 'files') return <FilesPanel />;
  if (panel === 'agents') return <AgentsPanel />;
  return <OrgPanel />;
}

function MemoryPanel() {
  return (
    <section>
      <div style={styles.scopeLabel}>Project Memory</div>
      <div style={styles.list}>
        {MEMORY.map(item => (
          <motion.button key={item.title} type="button" style={styles.row} whileHover={rowHover}>
            <div style={styles.memoryCopy}>
              <div style={styles.rowTitle}>{item.title}</div>
              <div style={styles.snippet}>{item.snippet}</div>
            </div>
            <span style={styles.scopeTag}>{item.scope}</span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function FilesPanel() {
  return (
    <section>
      <div style={styles.list}>
        {FILES.map(file => (
          <motion.button key={file.name} type="button" style={styles.row} whileHover={rowHover}>
            <FileText size={15} style={styles.fileIcon} />
            <span style={styles.rowTitle}>{file.name}</span>
            <span style={styles.sizeText}>{file.size}</span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function AgentsPanel() {
  return (
    <section>
      <div style={styles.list}>
        {AGENTS.map(agent => (
          <motion.button key={agent.name} type="button" style={styles.row} whileHover={rowHover}>
            <Avatar initial={agent.initial} color={agent.color} />
            <span style={styles.rowTitle}>{agent.name}</span>
            <span
              style={{
                ...styles.statusDot,
                background: agent.online ? 'var(--status-green)' : 'var(--text-muted)',
              }}
            />
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function OrgPanel() {
  return (
    <section>
      <div style={styles.orgName}>AvraxeAi</div>
      <div style={styles.list}>
        {MEMBERS.map(member => (
          <motion.button key={member.name} type="button" style={styles.row} whileHover={rowHover}>
            <Avatar initial={member.initial} color={member.color} />
            <span style={styles.rowTitle}>{member.name}</span>
            <span style={styles.roleTag}>{member.role}</span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function Avatar({ initial, color }: { initial: string; color: string }) {
  return (
    <span style={{ ...styles.avatar, background: color }}>
      {initial}
    </span>
  );
}

const rowHover = { backgroundColor: 'var(--surface-raise)' };

const styles: Record<string, React.CSSProperties> = {
  drawer: {
    width: 300,
    flexShrink: 0,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--sidebar-bg)',
    borderLeft: '1px solid var(--border)',
    color: 'var(--text-primary)',
    overflow: 'hidden',
  },
  header: {
    height: 48,
    minHeight: 48,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 10px 0 14px',
    borderBottom: '1px solid var(--border)',
  },
  titleWrap: {
    minWidth: 0,
    flex: 1,
  },
  title: {
    color: 'var(--text-primary)',
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.15,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  projectLabel: {
    color: 'var(--text-muted)',
    fontSize: 10,
    fontWeight: 600,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  closeButton: {
    width: 28,
    height: 28,
    display: 'grid',
    placeItems: 'center',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    flex: '0 0 auto',
  },
  actionButton: {
    height: 28,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '0 8px',
    border: 'none',
    borderRadius: 6,
    background: 'var(--surface-raise)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    flex: '0 0 auto',
  },
  body: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '12px 10px',
  },
  scopeLabel: {
    color: 'var(--text-muted)',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: '0 4px 8px',
  },
  orgName: {
    color: 'var(--text-muted)',
    fontSize: 12,
    fontWeight: 700,
    margin: '0 4px 10px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  row: {
    width: '100%',
    height: 40,
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '0 8px',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    textAlign: 'left',
  },
  memoryCopy: {
    minWidth: 0,
    flex: 1,
  },
  rowTitle: {
    minWidth: 0,
    flex: 1,
    color: 'var(--text-primary)',
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  snippet: {
    color: 'var(--text-muted)',
    fontSize: 12,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  scopeTag: {
    color: 'var(--text-muted)',
    background: 'var(--surface)',
    borderRadius: 999,
    padding: '1px 6px',
    fontSize: 10,
    fontWeight: 700,
    flex: '0 0 auto',
  },
  fileIcon: {
    color: 'var(--text-muted)',
    flex: '0 0 auto',
  },
  sizeText: {
    marginLeft: 'auto',
    color: 'var(--text-muted)',
    fontSize: 11,
    fontWeight: 600,
    flex: '0 0 auto',
  },
  avatar: {
    width: 24,
    height: 24,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 999,
    color: '#050505',
    fontSize: 11,
    fontWeight: 800,
    flex: '0 0 auto',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginLeft: 'auto',
    flex: '0 0 auto',
  },
  roleTag: {
    marginLeft: 'auto',
    maxWidth: 94,
    color: 'var(--text-muted)',
    background: 'var(--surface)',
    borderRadius: 999,
    padding: '2px 7px',
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: '0 0 auto',
  },
};
