import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Plus, MessageSquare, Clock, X, Check } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import type { Project } from '../../types';

interface ProjectsProps {
  onOpenProject: (projectId: string) => void;
}

const STATUS_COLORS: Record<Project['status'], string> = {
  active:   'rgba(16,185,129,0.12)',
  backlog:  'rgba(255,255,255,0.06)',
  review:   'rgba(245,158,11,0.12)',
  done:     'rgba(59,130,246,0.12)',
  archived: 'rgba(255,255,255,0.04)',
};
const STATUS_TEXT: Record<Project['status'], string> = {
  active:   '#6ee7b7',
  backlog:  '#9ca3af',
  review:   '#fcd34d',
  done:     '#93c5fd',
  archived: '#6b7280',
};

const FOLDER_GRADIENTS = [
  'linear-gradient(135deg,#00E6A8,#3b82f6)',
  'linear-gradient(135deg,#f59e0b,#f97316)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#06b6d4,#3b82f6)',
  'linear-gradient(135deg,#10b981,#14b8a6)',
];

function gradientFor(idx: number) {
  return FOLDER_GRADIENTS[idx % FOLDER_GRADIENTS.length];
}

function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function Projects({ onOpenProject }: ProjectsProps) {
  const { projects, sessions, sessionsForProject, createProject, activeWorkspaceId } = useProject();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const workspaceProjects = projects.filter(p => p.workspaceId === activeWorkspaceId);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    createProject(name, activeWorkspaceId);
    setNewName('');
    setCreating(false);
  };

  return (
    <div style={css.shell}>
      {/* Page header */}
      <div style={css.pageHeader}>
        <div>
          <h1 style={css.pageTitle}>Projects</h1>
          <p style={css.pageSubtitle}>{workspaceProjects.length} project{workspaceProjects.length !== 1 ? 's' : ''} · isolated memory and chats</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          style={css.newBtn}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent-dark)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent)'}
        >
          <Plus size={15} strokeWidth={2.5} />
          New Project
        </button>
      </div>

      {/* Create project inline */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={css.createRow}
          >
            <div style={css.createBox}>
              <Folder size={16} strokeWidth={1.8} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                placeholder="Project name…"
                style={css.createInput}
              />
              <button onClick={handleCreate} style={css.createConfirm} disabled={!newName.trim()}>
                <Check size={14} strokeWidth={2.5} />
              </button>
              <button onClick={() => setCreating(false)} style={css.createCancel}>
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project grid */}
      <div style={css.grid}>
        {workspaceProjects.map((project, idx) => {
          const chats = sessionsForProject(project.id);
          const isHovered = hoveredId === project.id;
          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{
                ...css.card,
                ...(isHovered ? css.cardHover : {}),
              }}
              onClick={() => onOpenProject(project.id)}
              onMouseEnter={() => setHoveredId(project.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Card top */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: gradientFor(idx),
                  display: 'grid', placeItems: 'center',
                }}>
                  <Folder size={17} strokeWidth={1.8} color="rgba(255,255,255,0.9)" />
                </div>
                <span style={{
                  fontSize: 10.5, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
                  background: STATUS_COLORS[project.status],
                  color: STATUS_TEXT[project.status],
                  textTransform: 'capitalize',
                }}>
                  {project.status}
                </span>
              </div>

              {/* Name */}
              <div style={css.cardName}>{project.name}</div>
              {project.description && (
                <div style={css.cardDesc}>{project.description}</div>
              )}

              {/* Footer stats */}
              <div style={css.cardFooter}>
                <span style={css.cardStat}>
                  <MessageSquare size={11} strokeWidth={1.8} />
                  {chats.length} chat{chats.length !== 1 ? 's' : ''}
                </span>
                <span style={css.cardStat}>
                  <Clock size={11} strokeWidth={1.8} />
                  {relativeDate(project.updatedAt)}
                </span>
              </div>

              {/* Recent chats preview */}
              {chats.length > 0 && (
                <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  {chats.slice(0, 2).map(chat => (
                    <div key={chat.id} style={css.chatPreview}>
                      <MessageSquare size={11} strokeWidth={1.8} style={{ flexShrink: 0, opacity: 0.4 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chat.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Empty state */}
        {workspaceProjects.length === 0 && !creating && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={css.emptyState}
          >
            <div style={css.emptyIcon}>
              <Folder size={28} strokeWidth={1.2} color="var(--text-muted)" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>No projects yet</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 240, lineHeight: 1.6 }}>
              Create a project to isolate its memory, files, and chats from other work.
            </div>
            <button
              onClick={() => setCreating(true)}
              style={{ ...css.newBtn, marginTop: 20, fontSize: 12 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent-dark)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent)'}
            >
              <Plus size={13} strokeWidth={2.5} /> Create first project
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

const css: Record<string, React.CSSProperties> = {
  shell: {
    height: '100%', overflowY: 'auto',
    background: 'var(--canvas)', padding: '0 0 40px',
  },
  pageHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '24px 28px 20px', flexWrap: 'wrap', gap: 12,
    borderBottom: '1px solid var(--border)',
  },
  pageTitle: {
    fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
    letterSpacing: '-0.02em', margin: 0,
  },
  pageSubtitle: {
    fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3,
  },
  newBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '8px 14px', borderRadius: 9, border: 'none',
    background: 'var(--accent)', color: '#0a0a0a',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    transition: 'background 0.15s',
  },
  createRow: {
    padding: '14px 28px',
    borderBottom: '1px solid var(--border)',
  },
  createBox: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', borderRadius: 10,
    border: '1px solid var(--border-focus)',
    background: 'var(--surface)',
    maxWidth: 440,
  },
  createInput: {
    flex: 1, border: 'none', outline: 'none', background: 'transparent',
    color: 'var(--text-primary)', fontSize: 13, fontWeight: 500,
    fontFamily: 'inherit',
  },
  createConfirm: {
    width: 28, height: 28, borderRadius: 7, border: 'none',
    background: 'var(--accent)', color: '#0a0a0a',
    cursor: 'pointer', display: 'grid', placeItems: 'center',
    flexShrink: 0,
  },
  createCancel: {
    width: 28, height: 28, borderRadius: 7, border: 'none',
    background: 'transparent', color: 'var(--text-muted)',
    cursor: 'pointer', display: 'grid', placeItems: 'center',
    flexShrink: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
    padding: '24px 28px',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 14, padding: '18px',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s, transform 0.15s',
    userSelect: 'none',
  },
  cardHover: {
    background: 'var(--surface-raise)',
    borderColor: 'var(--border-hover)',
    transform: 'translateY(-1px)',
  },
  cardName: {
    fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
    marginBottom: 5, lineHeight: 1.4,
  },
  cardDesc: {
    fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5,
    marginBottom: 12,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  cardFooter: {
    display: 'flex', gap: 12,
  },
  cardStat: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11.5, color: 'var(--text-muted)',
  },
  chatPreview: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11.5, color: 'var(--text-muted)',
    padding: '3px 0',
  },
  emptyState: {
    gridColumn: '1 / -1',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 14,
    background: 'var(--surface-raise)', border: '1px solid var(--border)',
    display: 'grid', placeItems: 'center', marginBottom: 16,
  },
};
