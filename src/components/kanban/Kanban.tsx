import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { orgTasksApi, agentsApi } from '../../lib/api';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigned_agent_id?: string;
}

const COLUMN_MAP = [
  { key: 'todo',        label: 'Todo',        stages: ['backlog', 'research', 'proposed'] },
  { key: 'in_progress', label: 'In Progress', stages: ['approved', 'in_progress'] },
  { key: 'review',      label: 'Review',      stages: ['review', 'testing'] },
  { key: 'done',        label: 'Done',        stages: ['completed', 'done'] },
] as const;

const STAGE_FOR_COL: Record<string, string> = {
  todo: 'backlog', in_progress: 'in_progress', review: 'review', done: 'completed',
};

export default function Kanban() {
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [agents,  setAgents]  = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState({ title: '', priority: 'medium', stage: 'backlog', agent: '' });
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, a] = await Promise.all([orgTasksApi.list(), agentsApi.list()]);
      setTasks(Array.isArray(t) ? t : []);
      const entries: any[] = Array.isArray(a) ? a : Object.values(a as any);
      const map: Record<string, string> = {};
      entries.forEach((ag: any) => { map[ag.id] = ag.name || ag.id; });
      setAgents(map);
    } catch { /* silently fail */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const moveTask = async (id: string, colKey: string, dir: 1 | -1) => {
    const idx = COLUMN_MAP.findIndex(c => c.key === colKey);
    const target = COLUMN_MAP[idx + dir];
    if (!target) return;
    try {
      await orgTasksApi.update(id, { status: STAGE_FOR_COL[target.key] });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: STAGE_FOR_COL[target.key] } : t));
    } catch { /* ignore */ }
  };

  const createTask = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const t = await orgTasksApi.create({
        title: form.title.trim(),
        status: form.stage,
        priority: form.priority,
        assigned_agent_id: form.agent || null,
      }) as Task;
      setTasks(prev => [t, ...prev]);
      setModal(false);
      setForm({ title: '', priority: 'medium', stage: 'backlog', agent: '' });
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div className="phase-page simple-page task-page">
      <div className="page-heading">
        <div>
          <h1>Tasks</h1>
          <p>{tasks.length} total · {tasks.filter(t => t.status === 'in_progress').length} in progress</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="outline-button" onClick={load}><RefreshCw size={13} /></button>
          <button className="primary-button" onClick={() => setModal(true)}><Plus size={14} /> New Task</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <div className="task-board">
          {COLUMN_MAP.map(col => {
            const colTasks = tasks.filter(t => (col.stages as readonly string[]).includes(t.status));
            return (
              <section className="task-column" key={col.key}>
                <header>
                  <h2>{col.label}</h2>
                  <span>{colTasks.length}</span>
                  <button onClick={() => { setForm(f => ({ ...f, stage: STAGE_FOR_COL[col.key] })); setModal(true); }}>
                    <Plus size={14} />
                  </button>
                </header>
                <div>
                  {colTasks.length === 0 && (
                    <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No tasks</div>
                  )}
                  {colTasks.map(task => (
                    <article className="task-card" key={task.id}>
                      <span className={`priority ${(task.priority || 'medium').toLowerCase()}`}>{task.priority || 'medium'}</span>
                      <h3>{task.title}</h3>
                      <footer>
                        {task.assigned_agent_id ? (
                          <>
                            <span className="mini-avatar">{(agents[task.assigned_agent_id] || task.assigned_agent_id)[0]}</span>
                            <small>{agents[task.assigned_agent_id] || task.assigned_agent_id}</small>
                          </>
                        ) : (
                          <small style={{ color: 'var(--text-muted)' }}>Unassigned</small>
                        )}
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                          {col.key !== 'todo' && (
                            <button style={{ fontSize: 10, padding: '2px 6px', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)' }}
                              onClick={() => moveTask(task.id, col.key, -1)}>← Back</button>
                          )}
                          {col.key !== 'done' && (
                            <button style={{ fontSize: 10, padding: '2px 6px', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)' }}
                              onClick={() => moveTask(task.id, col.key, 1)}>Move →</button>
                          )}
                        </div>
                      </footer>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, width: 440, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>New Task</div>
            <input style={{ padding: '8px 10px', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
              placeholder="Task title…" value={form.title} autoFocus
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && createTask()} />
            <div style={{ display: 'flex', gap: 10 }}>
              <select style={{ flex: 1, padding: '8px 10px', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
                value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                {['backlog','research','proposed','approved','in_progress','review','testing','completed'].map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
              <select style={{ flex: 1, padding: '8px 10px', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
                value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <select style={{ padding: '8px 10px', background: 'var(--surface-raise)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
              value={form.agent} onChange={e => setForm(f => ({ ...f, agent: e.target.value }))}>
              <option value="">Unassigned</option>
              {Object.entries(agents).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13 }}
                onClick={() => setModal(false)}>Cancel</button>
              <button className="primary-button" onClick={createTask} disabled={saving || !form.title.trim()}>
                {saving ? 'Creating…' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
