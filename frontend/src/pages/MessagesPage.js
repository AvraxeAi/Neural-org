import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrg } from '../contexts/OrgContext';
import { useWS } from '../contexts/WSContext';
import { msgAPI, agentAPI, orgAPI } from '../lib/api';
import { toast } from 'sonner';
import {
  MessageSquare, Send, Plus, Bot, User, X, Search,
  MoreHorizontal, ArrowLeft
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';

function ThreadItem({ thread, isSelected, onClick }) {
  const otherParticipants = thread.participants?.filter(p => {
    const me = JSON.parse(localStorage.getItem('openclaw_user') || '{}');
    return p.id !== me.id;
  }) || [];
  const displayName = otherParticipants.length > 0 ? otherParticipants.map(p => p.name).join(', ') : thread.title;
  const lastMsg = thread.last_message;

  return (
    <motion.div
      whileHover={{x:2}}
      transition={{duration:0.12}}
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-xl cursor-pointer"
      style={{
        background: isSelected ? 'rgba(34,211,238,0.06)' : 'rgba(255,255,255,0.02)',
        border: isSelected ? '1px solid rgba(34,211,238,0.2)' : '1px solid transparent',
      }}
      data-testid={`thread-${thread.id}`}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{background:'rgba(34,211,238,0.15)', border:'1px solid rgba(34,211,238,0.2)'}}>
        {otherParticipants[0]?.type === 'agent' ?
          <Bot size={15} style={{color:'#a78bfa'}} /> :
          <User size={15} style={{color:'#22d3ee'}} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{color:'rgba(255,255,255,0.9)'}}>{thread.title || displayName}</p>
        {lastMsg && <p className="text-[10px] truncate mt-0.5" style={{color:'rgba(255,255,255,0.4)'}}>{lastMsg.sender_name}: {lastMsg.text}</p>}
        {!lastMsg && <p className="text-[10px] mt-0.5" style={{color:'rgba(255,255,255,0.3)'}}>No messages yet</p>}
      </div>
    </motion.div>
  );
}

function ChatBubble({ msg }) {
  const me = JSON.parse(localStorage.getItem('openclaw_user') || '{}');
  const isMe = msg.sender_id === me.id;
  const isAgent = msg.sender_type === 'agent';
  const time = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isMe && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0"
          style={{background: isAgent ? 'rgba(167,139,250,0.2)' : 'rgba(34,211,238,0.2)'}}>
          {isAgent ? <Bot size={13} style={{color:'#a78bfa'}} /> : <User size={13} style={{color:'#22d3ee'}} />}
        </div>
      )}
      <div className="max-w-[70%]">
        {!isMe && <p className="text-[10px] mb-1 px-1" style={{color:'rgba(255,255,255,0.4)'}}>{msg.sender_name}</p>}
        <div className={`rounded-2xl px-3.5 py-2.5 ${isMe ? 'chat-bubble-user rounded-br-sm' : 'chat-bubble-agent rounded-bl-sm'}`}>
          <p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.88)'}}>{msg.text}</p>
        </div>
        <p className="text-[10px] mt-1 px-1 font-mono" style={{color:'rgba(255,255,255,0.25)', textAlign: isMe ? 'right' : 'left'}}>{time}</p>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { currentOrg } = useOrg();
  const { on } = useWS();
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [agents, setAgents] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [threadTitle, setThreadTitle] = useState('');
  const messagesEndRef = useRef(null);

  const fetchThreads = useCallback(async () => {
    if (!currentOrg) return;
    const res = await msgAPI.listThreads(currentOrg.id);
    setThreads(res.data);
    setLoading(false);
  }, [currentOrg]);

  const fetchMessages = useCallback(async () => {
    if (!selectedThread) return;
    const res = await msgAPI.getMessages(selectedThread.id);
    setMessages(res.data);
  }, [selectedThread?.id]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);
  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!on) return;
    const unsub = on('message_created', (data) => {
      if (selectedThread && data.thread_id === selectedThread.id) {
        setMessages(prev => [...prev, data]);
      }
      fetchThreads();
    });
    return () => unsub();
  }, [on, selectedThread?.id, fetchThreads]);

  const handleSend = async () => {
    if (!text.trim() || !selectedThread) return;
    setSending(true);
    try {
      const res = await msgAPI.send(selectedThread.id, text.trim());
      setMessages(prev => [...prev, res.data]);
      setText('');
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const openCreateDialog = async () => {
    const [agRes, memRes] = await Promise.all([
      agentAPI.list(currentOrg.id),
      orgAPI.listMembers(currentOrg.id),
    ]);
    setAgents(agRes.data);
    setMembers(memRes.data);
    setCreateOpen(true);
  };

  const handleCreateThread = async () => {
    if (!threadTitle.trim() || selectedParticipants.length === 0) return;
    const me = JSON.parse(localStorage.getItem('openclaw_user') || '{}');
    const participants = [
      { id: me.id, type: 'user', name: me.name },
      ...selectedParticipants
    ];
    try {
      const res = await msgAPI.createThread(currentOrg.id, { title: threadTitle, participants });
      setThreads(prev => [res.data, ...prev]);
      setSelectedThread(res.data);
      setMessages([]);
      setCreateOpen(false);
      setThreadTitle('');
      setSelectedParticipants([]);
      toast.success('Thread created!');
    } catch { toast.error('Failed to create thread'); }
  };

  const toggleParticipant = (p) => {
    setSelectedParticipants(prev =>
      prev.find(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p]
    );
  };

  if (loading) return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="h-full flex" data-testid="messages-page">
      {/* Thread list */}
      <div className="w-64 flex-shrink-0 flex flex-col" style={{borderRight:'1px solid rgba(255,255,255,0.07)'}}>
        <div className="p-4 flex items-center justify-between" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <h2 className="text-sm font-semibold" style={{fontFamily:'Space Grotesk'}}>Messages</h2>
          <Button size="sm" data-testid="new-thread-button" onClick={openCreateDialog}
            style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))', height:26, fontSize:11, padding:'0 8px'}}>
            <Plus size={11} className="mr-1" />New
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {threads.map(t => (
              <ThreadItem
                key={t.id} thread={t}
                isSelected={selectedThread?.id === t.id}
                onClick={() => { setSelectedThread(t); }}
              />
            ))}
            {threads.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare size={24} className="mx-auto mb-2" style={{color:'rgba(255,255,255,0.2)'}} />
                <p className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>No threads yet</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedThread ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
              style={{borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.01)'}}>
              <div>
                <h3 className="text-sm font-semibold" style={{fontFamily:'Space Grotesk'}}>{selectedThread.title}</h3>
                <p className="text-xs" style={{color:'rgba(255,255,255,0.35)'}}
                >{selectedThread.participants?.length} participants</p>
              </div>
              <div className="ml-auto flex gap-1">
                {selectedThread.participants?.map(p => (
                  <div key={p.id} className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{background: p.type==='agent' ? 'rgba(167,139,250,0.2)' : 'rgba(34,211,238,0.2)'}}>
                    {p.type === 'agent' ? <Bot size={11} style={{color:'#a78bfa'}} /> : <User size={11} style={{color:'#22d3ee'}} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-5 py-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquare size={28} className="mx-auto mb-2" style={{color:'rgba(255,255,255,0.15)'}} />
                  <p className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>No messages yet. Say hello!</p>
                </div>
              )}
              {messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Composer */}
            <div className="px-5 py-3 flex-shrink-0" style={{borderTop:'1px solid rgba(255,255,255,0.07)'}}>
              <div className="flex gap-2">
                <Textarea
                  data-testid="message-input"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Send a message..."
                  rows={1}
                  className="resize-none"
                  style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', fontSize:13}}
                />
                <Button
                  data-testid="send-message-button"
                  onClick={handleSend}
                  disabled={sending || !text.trim()}
                  style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))', alignSelf:'flex-end', height:38}}
                >
                  <Send size={14} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.2)'}}>
              <MessageSquare size={28} style={{color:'#22d3ee'}} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{fontFamily:'Space Grotesk'}}>Messages</h3>
            <p className="text-sm" style={{color:'rgba(255,255,255,0.35)'}}>Select a thread or create a new one</p>
          </div>
        )}
      </div>

      {/* Create Thread Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{background:'hsl(var(--card))', border:'1px solid rgba(255,255,255,0.1)'}}>
          <DialogHeader>
            <DialogTitle style={{fontFamily:'Space Grotesk'}}>New Thread</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs mb-1.5 block" style={{color:'rgba(255,255,255,0.6)'}}>Thread Name</Label>
              <Input value={threadTitle} onChange={e=>setThreadTitle(e.target.value)}
                placeholder="Discussion title" data-testid="thread-title-input"
                style={{background:'hsl(var(--secondary))', border:'1px solid rgba(255,255,255,0.1)'}} />
            </div>
            <div>
              <Label className="text-xs mb-2 block" style={{color:'rgba(255,255,255,0.6)'}}>Add Participants</Label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {agents.map(a => {
                  const checked = selectedParticipants.find(p => p.id === a.id);
                  return (
                    <label key={a.id} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
                      style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}>
                      <Checkbox checked={!!checked}
                        onCheckedChange={() => toggleParticipant({id:a.id, type:'agent', name:a.name})} />
                      <Bot size={12} style={{color:'#a78bfa'}} />
                      <span className="text-xs" style={{color:'rgba(255,255,255,0.8)'}}>{a.name}</span>
                      <span className="text-[10px] ml-auto" style={{color:'rgba(255,255,255,0.3)'}}>{a.role}</span>
                    </label>
                  );
                })}
                {members.map(m => {
                  const me = JSON.parse(localStorage.getItem('openclaw_user') || '{}');
                  if (m.user_id === me.id) return null;
                  const u = m.user || {};
                  const checked = selectedParticipants.find(p => p.id === m.user_id);
                  return (
                    <label key={m.user_id} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
                      style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}>
                      <Checkbox checked={!!checked}
                        onCheckedChange={() => toggleParticipant({id:m.user_id, type:'user', name:u.name||'User'})} />
                      <User size={12} style={{color:'#22d3ee'}} />
                      <span className="text-xs" style={{color:'rgba(255,255,255,0.8)'}}>{u.name || 'Unknown'}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setCreateOpen(false)}>Cancel</Button>
            <Button data-testid="create-thread-button" onClick={handleCreateThread}
              disabled={!threadTitle.trim() || selectedParticipants.length===0}
              style={{background:'hsl(var(--primary))', color:'hsl(var(--primary-foreground))'}}>Create Thread</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
