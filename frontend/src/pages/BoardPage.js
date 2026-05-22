import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrg } from '../contexts/OrgContext';
import { useWS } from '../contexts/WSContext';
import { boardAPI, workflowAPI } from '../lib/api';
import { toast } from 'sonner';
import {
  Gavel, Plus, ThumbsUp, ThumbsDown, MessageCircle,
  CheckCircle2, XCircle, Clock, Zap, ChevronRight, X, Send
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '../components/ui/alert-dialog';

const statusStyles = {
  open:     { bg:'rgba(34,211,238,0.1)',   text:'#22d3ee',  border:'rgba(34,211,238,0.2)',  Icon: Clock },
  approved: { bg:'rgba(16,185,129,0.1)',   text:'#10b981',  border:'rgba(16,185,129,0.2)',  Icon: CheckCircle2 },
  rejected: { bg:'rgba(239,68,68,0.1)',    text:'#ef4444',  border:'rgba(239,68,68,0.2)',   Icon: XCircle },
  pending:  { bg:'rgba(245,158,11,0.1)',   text:'#f59e0b',  border:'rgba(245,158,11,0.2)',  Icon: Clock },
};

function ProposalCard({ proposal, isSelected, onClick }) {
  const s = statusStyles[proposal.status] || statusStyles.pending;
  const { Icon } = s;
  const approveVotes = proposal.votes?.filter(v => v.value === 'approve').length || 0;
  const rejectVotes  = proposal.votes?.filter(v => v.value === 'reject').length || 0;
  const total = proposal.votes?.length || 0;

  return (
    <motion.div
      whileHover={{x:2}}
      transition={{duration:0.14}}
      onClick={onClick}
      className="p-3.5 rounded-xl cursor-pointer"
      style={{
        background: isSelected ? 'rgba(34,211,238,0.05)' : 'rgba(255,255,255,0.02)',
        border: isSelected ? '1px solid rgba(34,211,238,0.25)' : '1px solid rgba(255,255,255,0.07)',
      }}
      data-testid={`proposal-${proposal.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium leading-tight flex-1 mr-2" style={{color:'rgba(255,255,255,0.9)'}}>{proposal.title}</h4>
        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0"
          style={{background:s.bg, color:s.text, border:`1px solid ${s.border}`}}>
          <Icon size={9}/>{proposal.status}
        </span>
      </div>
      <p className="text-xs mb-2 line-clamp-2" style={{color:'rgba(255,255,255,0.35)'}}>{proposal.description || 'No description'}</p>
      <div className="flex items-center gap-3 text-[10px]" style={{color:'rgba(255,255,255,0.35)'}}>
        <span className="flex items-center gap-1"><ThumbsUp size={9} className="text-emerald-400"/>{approveVotes}</span>
        <span className="flex items-center gap-1"><ThumbsDown size={9} className="text-red-400"/>{rejectVotes}</span>
        <span className="flex items-center gap-1"><MessageCircle size={9}/>{proposal.comment_count || 0}</span>
        <span className="ml-auto">{proposal.author_name}</span>
      </div>
    </motion.div>
  );
}

function ProposalDetail({ proposal, onVote, onComment, onRefresh }) {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [voting, setVoting] = useState(false);
  const approveVotes = proposal.votes?.filter(v=>v.value==='approve') || [];
  const rejectVotes  = proposal.votes?.filter(v=>v.value==='reject') || [];
  const total = approveVotes.length + rejectVotes.length;
  const approvePct = total > 0 ? (approveVotes.length / total * 100) : 0;

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try { await onComment(comment); setComment(''); }
    finally { setSubmitting(false); }
  };

  const handleVote = async (val) => {
    setVoting(true);
    try { await onVote(val); }
    finally { setVoting(false); }
  };

  const s = statusStyles[proposal.status] || statusStyles.pending;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-lg font-semibold flex-1" style={{fontFamily:'Space Grotesk'}}>{proposal.title}</h2>
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg ml-3 flex-shrink-0"
            style={{background:s.bg, color:s.text, border:`1px solid ${s.border}`}}>
            {proposal.status}
          </span>
        </div>
        <p className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>By {proposal.author_name} · {new Date(proposal.created_at).toLocaleDateString()}</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {/* Description */}
          {proposal.description && (
            <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)'}}>
              <p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.75)'}}>{proposal.description}</p>
            </div>
          )}

          {/* Vote bar */}
          <div className="rounded-xl p-4" style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)'}}>
            <p className="text-xs font-semibold mb-3" style={{color:'rgba(255,255,255,0.5)'}}>VOTING ({total} votes)</p>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.08)'}}>
                <div className="h-full rounded-full" style={{background:'#10b981', width:`${approvePct}%`, transition:'width 0.5s'}} />
              </div>
            </div>
            <div className="flex justify-between text-xs mb-4">
              <span style={{color:'#10b981'}}>{approveVotes.length} Approve ({approvePct.toFixed(0)}%)</span>
              <span style={{color:'#ef4444'}}>{rejectVotes.length} Reject</span>
            </div>
            {proposal.status === 'open' && (
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button data-testid="approve-button" size="sm" className="flex-1" disabled={voting}
                      style={{background:'rgba(16,185,129,0.15)', color:'#10b981', border:'1px solid rgba(16,185,129,0.3)'}}>
                      <ThumbsUp size={13} className="mr-1.5"/>Approve
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent style={{background:'hsl(var(--card))', border:'1px solid rgba(255,255,255,0.1)'}}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Approve Proposal?</AlertDialogTitle>
                      <AlertDialogDescription style={{color:'rgba(255,255,255,0.5)'}}>Your vote will be cast. If majority approved, the proposal passes.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleVote('approve')}
                        style={{background:'#10b981', color:'white'}}>Approve</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button data-testid="reject-button" size="sm" className="flex-1" disabled={voting}
                      style={{background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.3)'}}>
                      <ThumbsDown size={13} className="mr-1.5"/>Reject
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent style={{background:'hsl(var(--card))', border:'1px solid rgba(255,255,255,0.1)'}}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reject Proposal?</AlertDialogTitle>
                      <AlertDialogDescription style={{color:'rgba(255,255,255,0.5)'}}>Your vote will be cast against this proposal.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleVote('reject')}
                        style={{background:'hsl(var(--destructive))', color:'white'}}>Reject</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <p className="text-xs font-semibold mb-3" style={{color:'rgba(255,255,255,0.5)'}}>DEBATE ({proposal.comments?.length || 0})</p>
            <div className="space-y-2 mb-3">
              {proposal.comments?.map(c => (
                <div key={c.id} className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{color:'rgba(255,255,255,0.7)'}}>{c.author_name}</span>
                    <span className="text-[10px] font-mono" style={{color:'rgba(255,255,255,0.3)'}}>{new Date(c.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>
                  </div>
                  <p className="text-xs" style={{color:'rgba(255,255,255,0.6)'}}>{c.text}</p>
                </div>
              ))}
              {(!proposal.comments || proposal.comments.length === 0) && (
                <p className="text-xs" style={{color:'rgba(255,255,255,0.25)'}}>No comments yet. Start the debate.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                data-testid="comment-input"
                value={comment}
                onChange={e=>setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
                placeholder="Add your perspective..."
                rows={2}
                style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', resize:'none', fontSize:13}}
              />
              <Button size="sm" onClick={handleComment} disabled={submitting || !comment.trim()}
                style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))', alignSelf:'flex-end'}}>
                <Send size={13}/>
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default function BoardPage() {
  const { currentOrg } = useOrg();
  const { on } = useWS();
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [form, setForm] = useState({ title:'', description:'', workflow_id:'', voting_type:'majority' });
  const [saving, setSaving] = useState(false);

  const fetchProposals = useCallback(async () => {
    if (!currentOrg) return;
    const [pRes, wRes] = await Promise.all([
      boardAPI.listProposals(currentOrg.id),
      workflowAPI.list(currentOrg.id),
    ]);
    setProposals(pRes.data);
    setWorkflows(wRes.data);
    setLoading(false);
  }, [currentOrg]);

  useEffect(() => { fetchProposals(); }, [fetchProposals]);

  const fetchSelected = useCallback(async () => {
    if (!selectedProposal) return;
    const res = await boardAPI.getProposal(selectedProposal.id);
    setSelectedProposal(res.data);
  }, [selectedProposal?.id]);

  useEffect(() => {
    if (!on) return;
    const u1 = on('proposal_created', () => fetchProposals());
    const u2 = on('vote_cast', () => { fetchProposals(); fetchSelected(); });
    const u3 = on('comment_added', () => fetchSelected());
    const u4 = on('proposal_approved', () => { fetchProposals(); toast.success('Proposal approved! Workflow triggered.'); });
    const u5 = on('proposal_rejected', () => { fetchProposals(); toast.error('Proposal rejected.'); });
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [on, fetchProposals, fetchSelected]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const data = { title: form.title, description: form.description, voting_type: form.voting_type };
      if (form.workflow_id) data.workflow_id = form.workflow_id;
      await boardAPI.createProposal(currentOrg.id, data);
      setCreateOpen(false);
      setForm({ title:'', description:'', workflow_id:'', voting_type:'majority' });
      toast.success('Proposal created!');
    } catch { toast.error('Failed to create proposal'); }
    finally { setSaving(false); }
  };

  const handleVote = async (val) => {
    await boardAPI.vote(selectedProposal.id, val);
    await fetchSelected();
    fetchProposals();
    toast.success(`Vote cast: ${val}`);
  };

  const handleComment = async (text) => {
    await boardAPI.addComment(selectedProposal.id, text);
    await fetchSelected();
    fetchProposals();
  };

  const handleSelectProposal = async (p) => {
    const res = await boardAPI.getProposal(p.id);
    setSelectedProposal(res.data);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="h-full flex" data-testid="board-page">
      {/* Left: Proposals list */}
      <div className="w-72 flex-shrink-0 flex flex-col" style={{borderRight:'1px solid rgba(255,255,255,0.07)'}}>
        <div className="p-4 flex items-center justify-between" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div>
            <h2 className="text-sm font-semibold" style={{fontFamily:'Space Grotesk'}}>Board</h2>
            <p className="text-xs" style={{color:'rgba(255,255,255,0.35)'}}>{proposals.length} proposals</p>
          </div>
          <Button size="sm" data-testid="create-proposal-button" onClick={() => setCreateOpen(true)}
            style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))', height:28, fontSize:12, padding:'0 10px'}}>
            <Plus size={12} className="mr-1"/>New
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {proposals.map(p => (
              <ProposalCard
                key={p.id} proposal={p}
                isSelected={selectedProposal?.id === p.id}
                onClick={() => handleSelectProposal(p)}
              />
            ))}
            {proposals.length === 0 && (
              <div className="text-center py-12">
                <Gavel size={28} className="mx-auto mb-2" style={{color:'rgba(255,255,255,0.2)'}} />
                <p className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>No proposals yet</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Proposal detail */}
      <div className="flex-1 overflow-hidden">
        {selectedProposal ? (
          <ProposalDetail
            proposal={selectedProposal}
            onVote={handleVote}
            onComment={handleComment}
            onRefresh={fetchSelected}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)'}}>
              <Gavel size={28} style={{color:'#f59e0b'}} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{fontFamily:'Space Grotesk'}}>Boardroom</h3>
            <p className="text-sm" style={{color:'rgba(255,255,255,0.35)'}}>Select a proposal to view details &amp; vote</p>
          </div>
        )}
      </div>

      {/* Create Proposal Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{background:'hsl(var(--card))', border:'1px solid rgba(255,255,255,0.1)'}}>
          <DialogHeader>
            <DialogTitle style={{fontFamily:'Space Grotesk'}}>New Proposal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.6)'}}>Title *</Label>
              <Input data-testid="proposal-title-input" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
                placeholder="e.g. Hire 3 new engineers" style={{background:'hsl(var(--secondary))', border:'1px solid rgba(255,255,255,0.1)'}} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.6)'}}>Description</Label>
              <Textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                placeholder="Provide context for the board..."
                rows={3} style={{background:'hsl(var(--secondary))', border:'1px solid rgba(255,255,255,0.1)'}} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.6)'}}>Trigger Workflow on Approval</Label>
              <select value={form.workflow_id} onChange={e=>setForm(p=>({...p,workflow_id:e.target.value}))}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{background:'hsl(var(--secondary))', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.8)'}}>
                <option value="" style={{background:'hsl(var(--card))'}}>None</option>
                {workflows.map(w => <option key={w.id} value={w.id} style={{background:'hsl(var(--card))'}}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setCreateOpen(false)}>Cancel</Button>
            <Button data-testid="submit-proposal-button" onClick={handleCreate} disabled={saving || !form.title.trim()}
              style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))'}}
            >{saving ? 'Creating...' : 'Create Proposal'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
