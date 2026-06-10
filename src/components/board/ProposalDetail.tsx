import React from 'react';
import { ArrowLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { t } from '../../lib/designTokens';
import { OutlineBtn, PrimaryBtn } from '../layout/PageLayout';

const votes = [
  { member: 'Rusty', vote: 'Approve', timestamp: 'Jun 1 09:14', note: '-' },
  { member: 'Lisa', vote: 'Approve', timestamp: 'Jun 1 10:30', note: '-' },
  { member: 'Cody', vote: 'Approve', timestamp: 'Jun 2 14:10', note: '-' },
  { member: 'Andrea', vote: 'Reject', timestamp: 'Jun 2 15:44', note: '"Premature"' },
  { member: 'Sheryl', vote: 'Abstain', timestamp: 'Jun 3 08:00', note: '-' },
  { member: 'Marcus', vote: 'Approve', timestamp: 'Jun 3 11:18', note: '-' },
  { member: 'Jordan', vote: 'Approve', timestamp: 'Jun 3 14:55', note: '-' },
];

const comments = [
  { initial: 'R', name: 'Rusty', date: 'Jun 1', text: 'This infrastructure is critical for Q3 delivery milestones.' },
  { initial: 'A', name: 'Andrea', date: 'Jun 2', text: "I'd prefer we revisit in Q4 after the full budget review." },
  { initial: 'L', name: 'Lisa', date: 'Jun 3', text: 'Agreed with Rusty - GPU costs are already scaling fast.' },
];

const stages = ['Proposed', 'Review', 'Voting', 'Approved', 'In Progress', 'Complete'];
const currentStage = 'Voting';

export default function ProposalDetail({ onBack }: { onBack: () => void }) {
  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <button style={styles.backButton} onClick={onBack} aria-label="Back to board">
          <ArrowLeft size={14} /> Board
        </button>
        <div style={styles.titleRow}>
          <span style={styles.idBadge}>P-2024-052</span>
          <h1 style={styles.title}>Allocate Q3 AI Infrastructure Budget</h1>
          <span style={styles.reviewBadge}>Under Review</span>
        </div>
        <div style={styles.headerBottom}>
          <p style={styles.meta}>Proposed by Rusty · Jun 1, 2026 · Finance → Infrastructure</p>
          <div style={styles.headerActions}>
            <PrimaryBtn>Approve</PrimaryBtn>
            <button style={styles.rejectButton}>Reject</button>
            <OutlineBtn>Request Changes</OutlineBtn>
          </div>
        </div>
      </header>

      <main style={styles.body}>
        <section style={styles.leftCol}>
          <Card title="Summary">
            <p style={styles.summary}>
              This proposal requests $180,000 to provision GPU clusters and managed vector database infrastructure for Q3 AI workloads. The investment enables AvraxeAi to scale memory retrieval, inference throughput, and agent parallelism. Current infrastructure bottlenecks are causing a 340ms p95 latency on complex queries. Implementation targets completion by August 2026.
            </p>
          </Card>

          <Card
            title="Votes"
            aside={<span style={styles.muted}>7 of 9 members voted</span>}
          >
            <div style={styles.voteProgress} aria-label="7 of 9 members voted">
              <div style={{ ...styles.voteProgressFill, width: `${(7 / 9) * 100}%` }} />
            </div>
            <div style={styles.bars}>
              <VoteBar label="Approve" votes={5} percent={71} color={t.green} />
              <VoteBar label="Reject" votes={1} percent={14} color={t.red} />
              <VoteBar label="Abstain" votes={1} percent={14} color={t.textMuted} />
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Member', 'Vote', 'Timestamp', 'Note'].map(label => (
                      <th key={label} style={styles.th}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {votes.map(row => (
                    <tr key={`${row.member}-${row.timestamp}`} style={styles.tr}>
                      <td style={styles.tdStrong}>{row.member}</td>
                      <td style={{ ...styles.tdStrong, color: voteColor(row.vote) }}>{row.vote}</td>
                      <td style={styles.td}>{row.timestamp}</td>
                      <td style={styles.td}>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Discussion">
            <div style={styles.comments}>
              {comments.map(comment => (
                <div key={`${comment.name}-${comment.date}`} style={styles.comment}>
                  <div style={styles.commentAvatar}>{comment.initial}</div>
                  <div>
                    <div style={styles.commentMeta}>
                      <strong>{comment.name}</strong>
                      <span>· {comment.date}</span>
                    </div>
                    <p style={styles.commentText}>{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={styles.addComment}>
              <textarea style={styles.textarea} rows={3} placeholder="Add a comment..." aria-label="Add a comment" />
              <div style={styles.commentActions}>
                <PrimaryBtn>Post Comment</PrimaryBtn>
              </div>
            </div>
          </Card>
        </section>

        <aside style={styles.rightCol}>
          <Card title="Proposal Details">
            <DetailRow label="Status"><span style={styles.reviewBadge}>Under Review</span></DetailRow>
            <DetailRow label="Category">Infrastructure</DetailRow>
            <DetailRow label="Budget Impact"><span style={styles.accentValue}>$180,000</span></DetailRow>
            <DetailRow label="Timeline">Q3 2026</DetailRow>
            <DetailRow label="Requires"><span style={styles.muted}>6 of 9 votes</span></DetailRow>
            <DetailRow label="Created">Jun 1, 2026</DetailRow>
            <DetailRow label="Last Updated">Jun 3, 2026</DetailRow>
          </Card>

          <Card title="Attachments">
            <Attachment name="budget-breakdown.xlsx" />
            <Attachment name="infrastructure-plan.pdf" />
          </Card>

          <Card title="Related Proposals">
            <RelatedProposal id="P-2024-048" status="Approved" color={t.green} />
            <RelatedProposal id="P-2024-039" status="Archived" color={t.textMuted} />
          </Card>

          <Card title="Implementation Tracker">
            <div style={styles.tracker}>
              {stages.map((stage, index) => {
                const stageIndex = stages.indexOf(currentStage);
                const complete = index < stageIndex;
                const current = stage === currentStage;
                return (
                  <div key={stage} style={styles.stage}>
                    <div style={{ ...styles.stageLine, background: complete ? t.accent : t.border }} />
                    <div style={{ ...styles.stageDot, ...(complete || current ? styles.stageDotActive : {}) }} />
                    <span style={{ ...styles.stageLabel, ...(current ? styles.stageLabelActive : {}) }}>{stage}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </aside>
      </main>
    </div>
  );
}

function Card({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function VoteBar({ label, votes, percent, color }: { label: string; votes: number; percent: number; color: string }) {
  return (
    <div style={styles.voteBarRow}>
      <div style={styles.voteBarMeta}>
        <span>{label}</span>
        <span>{votes} votes, {percent}%</span>
      </div>
      <div style={styles.miniBar}>
        <div style={{ ...styles.miniBarFill, width: `${percent}%`, background: color }} />
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{children}</span>
    </div>
  );
}

function Attachment({ name }: { name: string }) {
  return (
    <div style={styles.attachment}>
      <FileText size={15} style={{ color: t.accent }} />
      <span style={styles.attachmentName}>{name}</span>
      <button style={styles.downloadButton}>
        <Download size={13} /> Download
      </button>
    </div>
  );
}

function RelatedProposal({ id, status, color }: { id: string; status: string; color: string }) {
  return (
    <button style={styles.relatedButton}>
      <span style={styles.relatedId}>{id}</span>
      <span style={{ ...styles.statusTag, color, borderColor: color }}>{status}</span>
      <ChevronRight size={14} style={{ color: t.textMuted }} />
    </button>
  );
}

function voteColor(vote: string) {
  if (vote === 'Approve') return t.green;
  if (vote === 'Reject') return t.red;
  return t.textMuted;
}

const styles: Record<string, React.CSSProperties> = {
  shell: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: t.bg, color: t.textPrimary },
  header: { flexShrink: 0, padding: '24px 28px', borderBottom: `1px solid ${t.border}`, background: t.bg },
  backButton: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0, border: 'none', background: 'transparent', color: t.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: 800 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 11, flexWrap: 'wrap' },
  idBadge: { border: `1px solid ${t.accentBorder}`, color: t.accent, background: t.accentDim, borderRadius: 8, padding: '4px 7px', fontSize: 11, fontWeight: 900, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  title: { margin: 0, color: t.textPrimary, fontSize: 24, lineHeight: 1.18, fontWeight: 800, letterSpacing: 0 },
  reviewBadge: { display: 'inline-flex', alignItems: 'center', border: `1px solid rgba(245,158,11,0.25)`, color: t.amber, background: t.amberDim, borderRadius: 999, padding: '4px 8px', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' },
  headerBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 8, flexWrap: 'wrap' },
  meta: { margin: 0, color: t.textMuted, fontSize: 12 },
  headerActions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rejectButton: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${t.redBorder}`, background: 'transparent', color: t.red, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  body: { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', gap: 18, padding: '20px 28px 28px' },
  leftCol: { flex: 2, minWidth: 0, display: 'grid', gap: 14, alignContent: 'start' },
  rightCol: { flex: 1, minWidth: 280, display: 'grid', gap: 14, alignContent: 'start' },
  card: { background: t.surface, border: `1px solid ${t.border}`, borderRadius: t.radius, padding: 16 },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  cardTitle: { margin: 0, color: t.textPrimary, fontSize: 15, fontWeight: 900 },
  muted: { color: t.textMuted, fontSize: 12 },
  summary: { margin: 0, color: t.textSecond, fontSize: 13, lineHeight: 1.65 },
  voteProgress: { height: 9, borderRadius: 999, overflow: 'hidden', border: `1px solid ${t.border}`, background: t.surfaceRaise, marginBottom: 14 },
  voteProgressFill: { height: '100%', background: t.accent },
  bars: { display: 'grid', gap: 10, marginBottom: 14 },
  voteBarRow: { display: 'grid', gap: 5 },
  voteBarMeta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: t.textSecond, fontSize: 12 },
  miniBar: { height: 7, borderRadius: 999, overflow: 'hidden', background: t.surfaceRaise },
  miniBarFill: { height: '100%', borderRadius: 999 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', minWidth: 620, borderCollapse: 'collapse' },
  th: { color: t.textMuted, textAlign: 'left', fontSize: 11, fontWeight: 800, padding: '0 10px 9px', borderBottom: `1px solid ${t.border}` },
  tr: { borderBottom: `1px solid ${t.border}` },
  td: { color: t.textSecond, fontSize: 12.5, padding: '10px' },
  tdStrong: { color: t.textPrimary, fontSize: 12.5, fontWeight: 800, padding: '10px' },
  comments: { display: 'grid', gap: 12 },
  comment: { display: 'flex', gap: 10 },
  commentAvatar: { width: 30, height: 30, borderRadius: 999, display: 'grid', placeItems: 'center', background: t.accentDim, border: `1px solid ${t.accentBorder}`, color: t.accent, fontSize: 12, fontWeight: 900, flexShrink: 0 },
  commentMeta: { display: 'flex', gap: 5, alignItems: 'center', color: t.textMuted, fontSize: 12 },
  commentText: { margin: '4px 0 0', color: t.textSecond, fontSize: 13, lineHeight: 1.5 },
  addComment: { marginTop: 14, paddingTop: 12, borderTop: `1px solid ${t.border}` },
  textarea: { width: '100%', boxSizing: 'border-box', resize: 'vertical', background: t.bgSub, border: `1px solid ${t.border}`, borderRadius: 10, color: t.textPrimary, padding: 11, fontSize: 13, outline: 'none' },
  commentActions: { display: 'flex', justifyContent: 'flex-end', marginTop: 10 },
  detailRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '10px 0', borderBottom: `1px solid ${t.border}` },
  detailLabel: { color: t.textMuted, fontSize: 12, fontWeight: 700 },
  detailValue: { color: t.textSecond, fontSize: 12.5, fontWeight: 800, textAlign: 'right' },
  accentValue: { color: t.accent, fontWeight: 900 },
  attachment: { display: 'flex', alignItems: 'center', gap: 9, padding: '9px 0', borderBottom: `1px solid ${t.border}` },
  attachmentName: { color: t.textSecond, fontSize: 12.5, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  downloadButton: { marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent', color: t.accent, fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  relatedButton: { width: '100%', display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 8, padding: '9px 0', border: 'none', borderBottom: `1px solid ${t.border}`, background: 'transparent', cursor: 'pointer', textAlign: 'left' },
  relatedId: { color: t.textPrimary, fontSize: 12.5, fontWeight: 900, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  statusTag: { display: 'inline-flex', border: '1px solid', borderRadius: 999, background: t.bgSub, padding: '3px 7px', fontSize: 10.5, fontWeight: 800 },
  tracker: { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 0 },
  stage: { position: 'relative', display: 'grid', justifyItems: 'center', gap: 7 },
  stageLine: { position: 'absolute', top: 6, left: '-50%', width: '100%', height: 2 },
  stageDot: { width: 12, height: 12, borderRadius: 999, background: t.surfaceRaise, border: `2px solid ${t.border}`, zIndex: 1 },
  stageDotActive: { background: t.accent, borderColor: t.accent },
  stageLabel: { color: t.textMuted, fontSize: 10.5, textAlign: 'center', lineHeight: 1.25 },
  stageLabelActive: { color: t.accent, fontWeight: 900 },
};
