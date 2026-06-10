import React from 'react';
import {
  AlertTriangle, ArrowRight, Bot, Filter, GitBranch, Layers, LogIn, Monitor,
  Search, Shield, ShieldAlert, ShieldCheck, UserRound, Users, Vote,
} from 'lucide-react';

interface SecurityCenterProps {
  onNav?: (id: string) => void;
}

const METRICS = [
  { label:'Security Score', value:'92', suffix:'/100', sub:'↑ 4 pts from last week', icon:ShieldCheck, points:[26,17,22,12,20,13,12], color:'#10b981' },
  { label:'Active Alerts', value:'3', sub:'2 Critical  •  1 High', icon:AlertTriangle, points:[12,16,17,23,14,12,24], color:'#ef4444' },
  { label:'Open Investigations', value:'5', sub:'2 Critical  •  3 High', icon:Search, points:[22,18,25,11,10,24,13], color:'#f97316' },
  { label:'Systems Monitored', value:'48', sub:'All systems operational', icon:Monitor, points:[12,17,18,24,18,21,14], color:'#60a5fa' },
];
const TEAMS = [
  { name:'Red Team', subtitle:'Offensive Security', color:'#ef4444', icon:Shield, description:'Simulate attacks and identify weaknesses before adversaries can exploit them.', tasks:4, findings:7, extra:2 },
  { name:'Blue Team', subtitle:'Defensive Security', color:'#3b82f6', icon:ShieldCheck, description:'Monitor systems, detect threats, and respond to security incidents.', tasks:6, findings:12, extra:3 },
  { name:'Purple Team', subtitle:'Collaborative Security', color:'#8b5cf6', icon:Layers, description:'Bridge offensive and defensive insights to improve overall security posture.', tasks:3, findings:5, extra:2 },
];
const THREATS = [
  { sev:'Critical', title:'Possible credential stuffing attack', source:'Auth System', status:'Investigating', date:'May 20, 10:24 AM' },
  { sev:'High', title:'Unusual API usage detected', source:'API Gateway', status:'Investigating', date:'May 20, 9:15 AM' },
  { sev:'High', title:'Admin privilege escalation attempt', source:'Access Control', status:'Detected', date:'May 20, 8:43 AM' },
  { sev:'Medium', title:'Suspicious login location', source:'Identity Service', status:'Monitoring', date:'May 20, 7:22 AM' },
  { sev:'Low', title:'Outdated dependency detected', source:'Code Scanner', status:'Open', date:'May 19, 11:03 PM' },
];
const TIMELINE = [
  { time:'10:24 AM', icon:LogIn, text:'New login from unknown device', sub:'User: alex.morgan@avraxe.com' },
  { time:'9:41 AM', icon:GitBranch, text:'Workflow "Vendor Onboarding" was modified', sub:'By: Hermes-7' },
  { time:'8:15 AM', icon:Vote, text:'Board vote completed on "Security Policy Update"', sub:'Result: Approved' },
  { time:'Yesterday', icon:Bot, text:'New agent "Sentinel-2" was created', sub:'By: System' },
  { time:'Yesterday', icon:Users, text:'Organization chart updated', sub:'By: Ayesha Khan' },
  { time:'May 18', icon:Shield, text:'Permission changes applied to 4 agents', sub:'By: System' },
];

const AGENT_RISKS = [
  { name: 'Nexus', flag: 'Memory boundary exceeded', sev: 'high', trustScore: 71 },
  { name: 'Sentinel', flag: 'Elevated privilege scope', sev: 'medium', trustScore: 84 },
];

export default function SecurityCenter({ onNav }: SecurityCenterProps) {
  return (
    <div className="phase-page security-page">
      <div className="page-heading"><div><h1>Security Center</h1><p>Monitor, detect, and respond to security risks across your organization.</p></div></div>
      <div className="metric-grid">
        {METRICS.map(metric => {
          const Icon = metric.icon;
          const path = metric.points.map((y, i) => `${i ? 'L' : 'M'}${i * 13},${y}`).join(' ');
          return (
            <section className="panel metric-card" key={metric.label}>
              <div className="metric-label" style={{color:metric.color}}><Icon size={16}/><span>{metric.label}</span></div>
              <div className="metric-value">{metric.value}<small>{metric.suffix}</small></div>
              <p style={{color:metric.color}}>{metric.sub}</p>
              <svg viewBox="0 0 80 32"><path d={path} fill="none" stroke={metric.color} strokeWidth="1.5"/></svg>
            </section>
          );
        })}
      </div>

      {AGENT_RISKS.length > 0 && (
        <section className="panel" style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
          <div className="panel-heading" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={15} color="var(--status-amber)" />
              <h2>Agent Security Flags</h2>
            </div>
            <button
              className="small-button"
              onClick={() => onNav?.('agents')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}
            >
              View Agent Dashboard <ArrowRight size={12} />
            </button>
          </div>
          <div style={{ padding: '6px 0' }}>
            {AGENT_RISKS.map(r => (
              <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                <Bot size={14} color="var(--text-muted)" />
                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 60 }}>{r.name}</span>
                <span style={{ fontSize: 11, color: r.sev === 'high' ? 'var(--status-red)' : 'var(--status-amber)', flex: 1 }}>{r.flag}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Trust: {r.trustScore}/100</span>
                <button
                  onClick={() => onNav?.('agents')}
                  style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  Review <ArrowRight size={11} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="team-grid">
        {TEAMS.map(team => {
          const Icon = team.icon;
          return (
            <section className="panel team-card" key={team.name}>
              <div className="team-heading"><span className="team-icon" style={{color:team.color, borderColor:`${team.color}55`, background:`${team.color}16`}}><Icon size={24}/></span><span><h2 style={{color:team.color}}>{team.name}</h2><small>{team.subtitle}</small></span></div>
              <p>{team.description}</p>
              <div className="team-stats">
                <div><span>Assigned Agents</span><strong className="avatar-stack">{[1,2,3].map(n => <i key={n}><Bot size={11}/></i>)}<em>+{team.extra}</em></strong></div>
                <div><span>Current Tasks</span><strong>{team.tasks}</strong></div>
                <div><span>Recent Findings</span><strong>{team.findings}</strong></div>
                <div><span>Status</span><strong className="active-status"><i/>Active</strong></div>
              </div>
              <button className="team-link">View {team.name} Dashboard <ArrowRight size={14}/></button>
            </section>
          );
        })}
      </div>

      <div className="security-bottom">
        <section className="panel threat-panel">
          <div className="panel-heading"><h2>Threat Feed</h2><button className="small-button"><Filter size={13}/> Filter</button></div>
          <div className="table-scroll">
            <table className="data-table threat-table">
              <thead><tr><th>Severity</th><th>Title</th><th>Source</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>{THREATS.map(item => <tr key={item.title}><td><span className={`severity ${item.sev.toLowerCase()}`}>{item.sev}</span></td><td>{item.title}</td><td>{item.source}</td><td><span className={`threat-status ${item.status.toLowerCase()}`}>{item.status}</span></td><td>{item.date}</td></tr>)}</tbody>
            </table>
          </div>
          <button className="panel-link"><span>View all threats</span><ArrowRight size={14}/></button>
        </section>

        <section className="panel timeline-panel">
          <div className="panel-heading"><h2>Security Timeline</h2><button className="small-button">View all</button></div>
          <div className="timeline-list">
            {TIMELINE.map((item, index) => {
              const Icon = item.icon;
              return <div className="timeline-item" key={`${item.time}-${item.text}`}><time>{item.time}</time><span className="timeline-icon"><Icon size={13}/>{index < TIMELINE.length - 1 && <i/>}</span><span><strong>{item.text}</strong><small>{item.sub}</small></span></div>;
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
