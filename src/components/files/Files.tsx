import React, { useEffect, useMemo, useState } from 'react';
import { Code2, Download, File, FileImage, FileText, Grid2X2, List, Search, Trash2, Upload, X } from 'lucide-react';
import { t } from '../../lib/designTokens';
import { apiFetch } from '../../lib/api';
import { appConfig } from '../../lib/config';

type ViewMode = 'grid' | 'list';
type SortKey = 'Name' | 'Date' | 'Size' | 'Type';
type WorkspaceFile = { id: string; name: string; type: string; project: string; date: string; size: string; url?: string };

const projects = ['Workspace', 'AvraxeAi', 'My Construction Co.', 'Memory OS'];

function normalizeFile(row: any): WorkspaceFile {
  const name = row.name || row.filename || row.originalName || row.key || 'Untitled file';
  return {
    id: String(row.id || row.key || name),
    name,
    type: String(row.type || row.kind || fileTypeFromName(name)),
    project: String(row.project || row.projectName || row.scope || 'Workspace'),
    date: String(row.date || row.created_at || row.createdAt || row.updated_at || '').slice(0, 10) || 'Unknown',
    size: formatSize(row.size || row.bytes || row.fileSize),
    url: row.url || row.downloadUrl,
  };
}

function fileTypeFromName(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['ts', 'tsx', 'js', 'json', 'py', 'md', 'yaml', 'yml'].includes(ext || '')) return 'code';
  return 'doc';
}

function formatSize(value: unknown) {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unknown';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default function Files() {
  const [scope, setScope] = useState('Workspace');
  const [view, setView] = useState<ViewMode>('grid');
  const [sort, setSort] = useState<SortKey>('Date');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [allFiles, setAllFiles] = useState<WorkspaceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadFiles = async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await apiFetch<any[]>(`${appConfig.apiBaseUrl}/files`);
      setAllFiles((Array.isArray(rows) ? rows : []).map(normalizeFile));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
      setAllFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const uploadFile = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      form.append('project', scope);
      await apiFetch(`${appConfig.apiBaseUrl}/files`, { method: 'POST', body: form });
      setSelectedFile(null);
      setUploadOpen(false);
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const files = useMemo(() => {
    const scoped = scope === 'Workspace' ? allFiles : allFiles.filter(file => file.project === scope);
    const filtered = scoped.filter(file => file.name.toLowerCase().includes(search.toLowerCase()));
    return [...filtered].sort((a, b) => {
      if (sort === 'Name') return a.name.localeCompare(b.name);
      if (sort === 'Size') return parseFloat(a.size) - parseFloat(b.size);
      if (sort === 'Type') return a.type.localeCompare(b.type);
      return b.date.localeCompare(a.date);
    });
  }, [allFiles, scope, search, sort]);

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarTitle}>Scopes</div>
        {projects.map(project => (
          <button key={project} onClick={() => setScope(project)} aria-pressed={scope === project} style={{ ...styles.scopeButton, ...(scope === project ? styles.scopeActive : {}) }}>
            {project}
          </button>
        ))}
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Files</h1>
            <p style={styles.subtitle}>Workspace and project attachments.</p>
          </div>
          <button style={styles.primaryButton} onClick={() => setUploadOpen(true)} aria-label={`Upload files to ${scope}`}><Upload size={14} /> Upload</button>
        </header>

        <div style={styles.toolbar}>
          <label style={styles.searchBox}>
            <Search size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files" style={styles.searchInput} aria-label="Search files" />
          </label>
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)} style={styles.select} aria-label="Sort files">
            {(['Name', 'Date', 'Size', 'Type'] as SortKey[]).map(item => <option key={item}>{item}</option>)}
          </select>
          <div style={styles.toggleGroup}>
            <button aria-label="Grid view" onClick={() => setView('grid')} style={{ ...styles.toggleButton, ...(view === 'grid' ? styles.toggleActive : {}) }}><Grid2X2 size={14} /></button>
            <button aria-label="List view" onClick={() => setView('list')} style={{ ...styles.toggleButton, ...(view === 'list' ? styles.toggleActive : {}) }}><List size={14} /></button>
          </div>
        </div>

        {error && <div style={{ color: t.red, fontSize: 12, marginBottom: 12 }}>{error}</div>}
        {loading ? (
          <div style={styles.empty}><File size={28} /><div>Loading files...</div></div>
        ) : files.length === 0 ? (
          <div style={styles.empty}><File size={28} /><div>No files yet. Upload or attach files in chat.</div></div>
        ) : view === 'grid' ? (
          <section style={styles.grid}>
            {files.map(file => <FileCard key={file.id} file={file} />)}
          </section>
        ) : (
          <section style={styles.list}>
            {files.map(file => <FileRow key={file.id} file={file} />)}
          </section>
        )}
      </main>

      {uploadOpen && (
        <div style={styles.overlay} role="presentation" onMouseDown={() => setUploadOpen(false)}>
          <div style={styles.uploadPanel} role="dialog" aria-modal="true" aria-label="Upload files" onMouseDown={event => event.stopPropagation()}>
            <button onClick={() => setUploadOpen(false)} aria-label="Close upload" style={styles.closeButton}><X size={15} /></button>
            <Upload size={28} style={{ color: t.accent }} />
            <div style={styles.uploadTitle}>Drop files here</div>
            <div style={styles.subtitle}>Files will attach to {scope}.</div>
            <input type="file" onChange={event => setSelectedFile(event.target.files?.[0] ?? null)} style={{ color: t.textSecond }} />
            <button disabled={!selectedFile || uploading} onClick={uploadFile} style={{ ...styles.primaryButton, opacity: !selectedFile || uploading ? 0.55 : 1 }}>
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FileCard({ file }: { file: WorkspaceFile }) {
  const Icon = fileIcon(file.type);
  return (
    <article style={styles.fileCard}>
      <Icon size={26} style={{ color: iconColor(file.type) }} />
      <div style={styles.fileName}>{file.name}</div>
      <span style={styles.projectTag}>{file.project}</span>
      <div style={styles.meta}>{file.date} · {file.size}</div>
    </article>
  );
}

function FileRow({ file }: { file: WorkspaceFile }) {
  const Icon = fileIcon(file.type);
  return (
    <div style={styles.fileRow}>
      <Icon size={18} style={{ color: iconColor(file.type) }} />
      <div style={{ flex: 1, minWidth: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
      <span style={styles.projectTag}>{file.project}</span>
      <span style={styles.meta}>{file.date}</span>
      <span style={styles.meta}>{file.size}</span>
      <button style={styles.iconButton} aria-label={`Download ${file.name}`}><Download size={14} /></button>
      <button style={styles.iconButton} aria-label={`Delete ${file.name}`}><Trash2 size={14} /></button>
    </div>
  );
}

function fileIcon(type: string) {
  if (type === 'image') return FileImage;
  if (type === 'code') return Code2;
  return FileText;
}

function iconColor(type: string) {
  if (type === 'image') return t.purple;
  if (type === 'code') return t.accent;
  if (type === 'pdf') return t.red;
  return t.blue;
}

const styles: Record<string, React.CSSProperties> = {
  shell: { flex: 1, minHeight: 0, display: 'flex', background: t.bg, color: t.textPrimary, overflow: 'hidden' },
  sidebar: { width: 224, flexShrink: 0, borderRight: `1px solid ${t.border}`, background: t.surface, padding: 12, overflowY: 'auto' },
  sidebarTitle: { color: t.textMuted, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 },
  scopeButton: { width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 8, color: t.textSecond, padding: '9px 10px', cursor: 'pointer', fontWeight: 700 },
  scopeActive: { background: t.surfaceRaise, color: t.textPrimary },
  main: { flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', padding: 18 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 14, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 20, fontWeight: 800 },
  subtitle: { margin: '4px 0 0', color: t.textMuted, fontSize: 13 },
  primaryButton: { display: 'inline-flex', alignItems: 'center', gap: 7, background: t.accent, border: 'none', borderRadius: 8, color: '#06110d', padding: '9px 12px', cursor: 'pointer', fontWeight: 800 },
  toolbar: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  searchBox: { flex: '1 1 260px', minWidth: 220, display: 'flex', alignItems: 'center', gap: 8, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 9, padding: '0 10px', color: t.textMuted },
  searchInput: { flex: 1, height: 38, border: 'none', outline: 'none', background: 'transparent', color: t.textPrimary },
  select: { height: 38, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 9, color: t.textSecond, padding: '0 10px' },
  toggleGroup: { display: 'flex', gap: 4, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 9, padding: 4 },
  toggleButton: { width: 30, height: 28, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', borderRadius: 7, color: t.textMuted, cursor: 'pointer' },
  toggleActive: { background: t.surfaceRaise, color: t.accent },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(176px, 1fr))', gap: 12 },
  fileCard: { background: t.surface, border: `1px solid ${t.border}`, borderRadius: t.radius, padding: 14, minHeight: 136, display: 'flex', flexDirection: 'column', gap: 10 },
  fileName: { fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  projectTag: { alignSelf: 'flex-start', color: t.accent, background: t.accentDim, border: `1px solid ${t.accentBorder}`, borderRadius: 99, padding: '2px 7px', fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap' },
  meta: { color: t.textMuted, fontSize: 11.5 },
  list: { display: 'grid', gap: 8, overflowX: 'auto' },
  fileRow: { minWidth: 720, display: 'grid', gridTemplateColumns: '24px minmax(180px,1fr) 150px 96px 76px 32px 32px', alignItems: 'center', gap: 10, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 9, padding: '10px 12px' },
  iconButton: { width: 30, height: 30, display: 'grid', placeItems: 'center', border: `1px solid ${t.border}`, borderRadius: 8, background: t.surfaceRaise, color: t.textSecond, cursor: 'pointer' },
  empty: { minHeight: 360, display: 'grid', placeItems: 'center', gap: 10, color: t.textMuted, textAlign: 'center' },
  overlay: { position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center', padding: 20 },
  uploadPanel: { width: 'min(520px,100%)', minHeight: 260, background: t.surface, border: `1px dashed ${t.accentBorder}`, borderRadius: t.radius, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 10, position: 'relative', textAlign: 'center' },
  closeButton: { position: 'absolute', right: 12, top: 12, width: 30, height: 30, borderRadius: 8, border: `1px solid ${t.border}`, background: t.surfaceRaise, color: t.textSecond, cursor: 'pointer' },
  uploadTitle: { fontSize: 18, fontWeight: 800 },
};
