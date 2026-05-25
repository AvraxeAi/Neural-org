import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, Shield, AlertTriangle, CheckCircle2, GitBranch, RotateCcw, Undo2, Redo2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

export default function GovernanceBar({
  governance, onFinalize, onEmergencyUnlock, onReLock,
  canUndo, canRedo, onUndo, onRedo,
  isDraftDirty
}) {
  const [finalizeOpen, setFinalizeOpen]     = useState(false);
  const [unlockOpen, setUnlockOpen]         = useState(false);
  const [finalizeLabel, setFinalizeLabel]   = useState('');
  const [finalizeReason, setFinalizeReason] = useState('');
  const [unlockReason, setUnlockReason]     = useState('');
  const [saving, setSaving]                 = useState(false);

  const isGoverned = governance?.is_governed;
  const isOverride = governance?.emergency_override;
  const pendingProp = governance?.pending_proposals || 0;

  // Effective mode
  const mode = !isGoverned ? 'draft'
             : isOverride   ? 'override'
             : 'governed';

  const modeConfig = {
    draft:    { label: 'DRAFT', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)',  Icon: GitBranch, desc: 'Free edits — changes apply instantly' },
    governed: { label: 'GOVERNED', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', Icon: Lock,  desc: 'Edits require board approval' },
    override: { label: 'EMERGENCY OVERRIDE', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', Icon: AlertTriangle, desc: 'Owner bypass — changes logged' },
  }[mode];

  const handleFinalize = async () => {
    setSaving(true);
    try { await onFinalize(finalizeLabel, finalizeReason); setFinalizeOpen(false); }
    finally { setSaving(false); }
  };

  const handleUnlock = async () => {
    if (!unlockReason.trim()) return;
    setSaving(true);
    try { await onEmergencyUnlock(unlockReason); setUnlockOpen(false); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0"
        style={{
          background: 'rgba(0,0,0,0.35)',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${modeConfig.border}`,
        }}
        data-testid="governance-bar"
      >
        {/* Mode badge */}
        <motion.div
          key={mode}
          initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
          style={{ background: modeConfig.bg, border: `1px solid ${modeConfig.border}` }}
        >
          <modeConfig.Icon size={12} style={{ color: modeConfig.color }} />
          <span className="text-xs font-bold" style={{ color: modeConfig.color, letterSpacing:'0.06em' }}>
            {modeConfig.label}
          </span>
        </motion.div>
        <span className="text-xs" style={{ color:'rgba(255,255,255,0.4)' }}>{modeConfig.desc}</span>

        {pendingProp > 0 && (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
            style={{ background:'rgba(245,158,11,0.12)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.25)' }}>
            {pendingProp} pending vote{pendingProp>1?'s':''}
          </span>
        )}

        <div className="flex-1" />

        {/* Undo/Redo */}
        {mode !== 'governed' && (
          <div className="flex items-center gap-1">
            <button onClick={onUndo} disabled={!canUndo}
              className="p-1.5 rounded-lg" title="Undo (Ctrl+Z)"
              style={{ color: canUndo ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.05)' }}>
              <Undo2 size={13}/>
            </button>
            <button onClick={onRedo} disabled={!canRedo}
              className="p-1.5 rounded-lg" title="Redo (Ctrl+Y)"
              style={{ color: canRedo ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.05)' }}>
              <Redo2 size={13}/>
            </button>
          </div>
        )}

        {/* Controls */}
        {mode === 'draft' && (
          <Button size="sm" onClick={() => setFinalizeOpen(true)}
            data-testid="finalize-chart-button"
            style={{ background:'rgba(16,185,129,0.15)', color:'#10b981', border:'1px solid rgba(16,185,129,0.3)', height:30, fontSize:12 }}>
            <Lock size={11} className="mr-1.5" />Finalize Structure
          </Button>
        )}

        {mode === 'governed' && (
          <Button size="sm" onClick={() => setUnlockOpen(true)}
            data-testid="emergency-unlock-button"
            style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.25)', height:30, fontSize:12 }}>
            <AlertTriangle size={11} className="mr-1.5" />Emergency Override
          </Button>
        )}

        {mode === 'override' && (
          <Button size="sm" onClick={onReLock}
            data-testid="re-lock-button"
            style={{ background:'rgba(245,158,11,0.12)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.3)', height:30, fontSize:12 }}>
            <Lock size={11} className="mr-1.5" />Re-Lock
          </Button>
        )}
      </div>

      {/* Finalize dialog */}
      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent style={{ background:'hsl(var(--card))', border:'1px solid rgba(255,255,255,0.1)' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily:'Space Grotesk' }}>Finalize Org Chart Structure</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4">
            <div className="rounded-xl p-3" style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-xs" style={{ color:'rgba(255,255,255,0.7)' }}>
                <strong style={{ color:'#10b981' }}>Once finalized:</strong> all future org chart changes will require a board vote. Ensure the structure is correct.
              </p>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color:'rgba(255,255,255,0.5)' }}>Version Label</Label>
              <Input value={finalizeLabel} onChange={e=>setFinalizeLabel(e.target.value)}
                placeholder="e.g. Q1 2025 Initial Structure"
                style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' }}/>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color:'rgba(255,255,255,0.5)' }}>Reason (optional)</Label>
              <Textarea value={finalizeReason} onChange={e=>setFinalizeReason(e.target.value)}
                placeholder="Why is this structure being finalized?"
                rows={2} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', resize:'none' }}/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setFinalizeOpen(false)}>Cancel</Button>
            <Button onClick={handleFinalize} disabled={saving}
              style={{ background:'#10b981', color:'#000', fontWeight:600 }}>
              {saving ? 'Finalizing...' : '🔒 Finalize & Lock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency unlock dialog */}
      <Dialog open={unlockOpen} onOpenChange={setUnlockOpen}>
        <DialogContent style={{ background:'hsl(var(--card))', border:'1px solid rgba(239,68,68,0.3)' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ fontFamily:'Space Grotesk' }}>
              <AlertTriangle size={16} style={{ color:'#ef4444' }}/>
              Emergency Override
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <div className="rounded-xl p-3" style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs" style={{ color:'rgba(255,255,255,0.7)' }}>
                This bypasses board approval. <strong style={{ color:'#ef4444' }}>All changes made during override are logged to the audit trail.</strong>
              </p>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block" style={{ color:'rgba(255,255,255,0.5)' }}>Reason *</Label>
              <Textarea value={unlockReason} onChange={e=>setUnlockReason(e.target.value)}
                placeholder="Critical incident, personnel change, etc."
                rows={3} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', resize:'none' }}/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setUnlockOpen(false)}>Cancel</Button>
            <Button onClick={handleUnlock} disabled={saving||!unlockReason.trim()}
              style={{ background:'rgba(239,68,68,0.2)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.3)', fontWeight:600 }}>
              {saving ? 'Unlocking...' : '⚠️ Activate Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
