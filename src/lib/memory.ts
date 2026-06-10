import type { MemoryEntry, MemoryScope } from '../types';

// ── In-memory store (replaced by API in a future phase) ───────────────────────
const STORE: MemoryEntry[] = [
  { id: 'm1', scope: 'global', scopeId: 'user', title: 'User prefers dark mode', body: 'Always use dark mode UI.', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'm2', scope: 'org',    scopeId: 'avraxeai', title: 'AvraxeAi brand colors', body: 'Primary: #00E6A8 (teal). Secondary: #3b82f6 (blue).', createdAt: '2026-02-01', updatedAt: '2026-02-01' },
  { id: 'm3', scope: 'project', scopeId: 'construction', title: 'Construction project budget', body: 'Q2 budget is $120,000. Approved by Cody.', createdAt: '2026-04-01', updatedAt: '2026-06-01' },
  { id: 'm4', scope: 'project', scopeId: 'marketing', title: 'Marketing target audience', body: 'SMB owners aged 30-55, US market.', createdAt: '2026-04-15', updatedAt: '2026-04-15' },
  { id: 'm5', scope: 'chat',    scopeId: 'c1', title: 'Lisa prefers bullet points', body: 'Lisa responds better to structured bullet lists.', createdAt: '2026-06-01', updatedAt: '2026-06-04' },
];

export interface MemoryQuery {
  chatId?: string;
  projectId?: string;
  orgId?: string;
  userId?: string;
  limit?: number;
}

/**
 * Retrieves memory entries in priority order:
 * 1. Chat memory (most specific)
 * 2. Project memory
 * 3. Org memory
 * 4. Global user memory
 *
 * Memory from unrelated projects is never included automatically.
 */
export function retrieveMemory(query: MemoryQuery): MemoryEntry[] {
  const { chatId, projectId, orgId, userId = 'user', limit = 20 } = query;
  const results: MemoryEntry[] = [];

  const add = (scope: MemoryScope, scopeId: string) => {
    const entries = STORE.filter(e => e.scope === scope && e.scopeId === scopeId);
    results.push(...entries);
  };

  if (chatId)    add('chat', chatId);
  if (projectId) add('project', projectId);
  if (orgId)     add('org', orgId);
  add('global', userId);

  return results.slice(0, limit);
}

export function getMemoryForScope(scope: MemoryScope, scopeId: string): MemoryEntry[] {
  return STORE.filter(e => e.scope === scope && e.scopeId === scopeId);
}

export function addMemory(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): MemoryEntry {
  const now = new Date().toISOString();
  const newEntry: MemoryEntry = { ...entry, id: `m-${Date.now()}`, createdAt: now, updatedAt: now };
  STORE.push(newEntry);
  return newEntry;
}

export function removeMemory(id: string): void {
  const idx = STORE.findIndex(e => e.id === id);
  if (idx !== -1) STORE.splice(idx, 1);
}
