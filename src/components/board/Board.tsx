import React, { useState } from 'react';
import {
  ArrowRight, Bot, CalendarDays, CheckSquare, MoreHorizontal, ShieldCheck,
  UserPlus, Users, Vote,
} from 'lucide-react';

const MEMBERS = [
  { id:'rk', name:'Rusty Khan', email:'rusty@avraxe.com', role:'Board Chair', type:'Human', joined:'Jan 10, 2024', status:'Active' },
  { id:'ak', name:'Ayesha Khan', email:'ayesha@avraxe.com', role:'COO', type:'Human', joined:'Jan 12, 2024', status:'Active' },
  { id:'mr', name:'Michael Roberts', email:'michael@avraxe.com', role:'CFO', type:'Human', joined:'Jan 15, 2024', status:'Active' },
  { id:'sc', name:'Sarah Chen', email:'sarah@avraxe.com', role:'CTO', type:'Human', joined:'Jan 18, 2024', status:'Active' },
  { id:'h7', name:'Hermes-7', email:'hermes@agents.openclaw.ai', role:'Chief of Staff (AI)', type:'AI Agent', joined:'Jan 20, 2024', status:'Active' },
  { id:'c3', name:'Claude-3.5', email:'claude@agents.anthropic.com', role:'Strategy Advisor (AI)', type:'AI Agent', joined:'Jan 22, 2024', status:'Active' },
  { id:'g1', name:'Gemini-1.5', email:'gemini@agents.google.com', role:'Risk Advisor (AI)', type:'AI Agent', joined:'Jan 25, 2024', status:'Standby' },
  { id:'og', name:'OpenClaw Governor', email:'governor@openclaw.systems', role:'Governance (AI)', type:'AI Agent', joined:'Jan 28, 2024', status:'Active' },
];

const MEETINGS = [
  { title:'Board Meeting – May 2025', date:'May 24, 2025 • 10:00 AM PDT', badge:'In 2 days', active:true },
  { title:'Budget Review Q2', date:'May 31, 2025 • 2:00 PM PDT', badge:'In 9 days' },
  { title:'Strategy Planning Session', date:'Jun 7, 2025 • 11:00 AM PDT', badge:'In 16 days' },
];

const VOTES = [
  { title:'AI Security Audit Framework', proposal:'Proposal #42 • May 20, 2025', result:'Approved' },
  { title:'Budget Allocation Q2', proposal:'Proposal #41 • May 18, 2025', result:'Approved' },
  { title:'New Hiring Workflow', proposal:'Proposal #40 • May 15, 2025', result:'Rejected' },
];

const ACTIVITY = [
  { time:'May 20, 2025 • 10:24 AM', icon:Vote, text:'Board vote completed on "AI Security Audit Framework"' },
  { time:'May 20, 2025 • 9:15 AM', icon:Users, text:'New board member Hermes-7 joined the board' },
  { time:'May 19, 2025 • 4:42 PM', icon:CalendarDays, text:'Meeting "Board Meeting – May 2025" scheduled' },
  { time:'May 18, 2025 • 2:08 PM', icon:CheckSquare, text:'Proposal "Budget Allocation Q2" moved to voting' },
  { time:'May 18, 2025 • 11:33 AM', icon:Bot, text:'Claude-3.5 submitted recommendation on proposal #41' },
];

export default function Board() {
  const [tab, setTab] = useState('Overview');
  const [menu, setMenu] = useState<string | null>(null);

  return (
    <div className="phase-page board-page">
      <div className="page-heading">
        <div>
          <h1>Boards</h1>
          <p>Manage board members, meetings, votes, and governance.</p>
        </div>
      </div>
      <div className="page-tabs">
        {['Overview','Members','Committees','Meetings','Votes','Policies','Settings'].map(item => (
          <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>

      <div className="board-grid">
        <div className="board-left">
          <section className="panel members-panel">
            <div className="panel-heading">
              <h2>Board Members</h2>
              <button className="outline-button"><UserPlus size={14} /> Invite Member</button>
            </div>
            <div className="table-scroll">
              <table className="data-table members-table">
                <thead><tr><th>Member</th><th>Role</th><th>Type</th><th>Joined</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {MEMBERS.map((member, index) => (
                    <tr key={member.id}>
                      <td>
                        <div className="member-cell">
                          <span className={`member-avatar avatar-${index}`}>{member.type === 'AI Agent' ? <Bot size={14} /> : member.id.toUpperCase()}</span>
                          <span><strong>{member.name}{member.id === 'rk' && <em className="you-badge">You</em>}</strong><small>{member.email}</small></span>
                        </div>
                      </td>
                      <td>{member.role}</td>
                      <td><span className={`type-badge ${member.type === 'AI Agent' ? 'ai' : ''}`}>{member.type}</span></td>
                      <td>{member.joined}</td>
                      <td><span className={`status-line ${member.status.toLowerCase()}`}><i />{member.status}</span></td>
                      <td className="menu-cell">
                        <button className="row-menu" onClick={() => setMenu(menu === member.id ? null : member.id)}><MoreHorizontal size={15} /></button>
                        {menu === member.id && <div className="action-menu"><button>View Profile</button><button>Edit Role</button><button>Remove from Board</button></div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel-footnote">Showing 1 to 8 of 8 members</div>
          </section>

          <section className="panel activity-panel">
            <div className="panel-heading"><h2>Recent Activity</h2><button className="small-button">View all</button></div>
            <div className="activity-list">
              {ACTIVITY.map(item => {
                const Icon = item.icon;
                return <div className="activity-row" key={item.text}><Icon size={14}/><span>{item.text}</span><time>{item.time}</time></div>;
              })}
            </div>
            <PanelLink>View all activity</PanelLink>
          </section>
        </div>

        <aside className="board-right">
          <section className="panel side-card">
            <div className="panel-heading"><h2>Upcoming Meetings</h2><button className="small-button">View all</button></div>
            {MEETINGS.map(meeting => (
              <div className="side-list-row" key={meeting.title}>
                <span className="square-icon"><CalendarDays size={15}/></span>
                <span><strong>{meeting.title}</strong><small>{meeting.date}</small></span>
                <em className={meeting.active ? 'green-text' : ''}>{meeting.badge}</em>
              </div>
            ))}
            <PanelLink>View calendar</PanelLink>
          </section>

          <section className="panel side-card">
            <div className="panel-heading"><h2>Recent Votes</h2><button className="small-button">View all</button></div>
            {VOTES.map(vote => (
              <div className="side-list-row" key={vote.title}>
                <span className="square-icon"><Vote size={15}/></span>
                <span><strong>{vote.title}</strong><small>{vote.proposal}</small></span>
                <em className={`result-badge ${vote.result.toLowerCase()}`}>{vote.result}</em>
              </div>
            ))}
            <PanelLink>View all proposals</PanelLink>
          </section>

          <section className="panel composition-card">
            <h2>Board Composition</h2>
            <div className="composition-body">
              <div className="donut">
                <svg viewBox="0 0 120 120">
                  {/* circumference = 2π×44 ≈ 276.5; 4/8 = 50% each */}
                  <circle cx="60" cy="60" r="44" fill="none" stroke="#242424" strokeWidth="11"/>
                  <circle cx="60" cy="60" r="44" fill="none" stroke="#10b981" strokeWidth="11" strokeDasharray="138.2 138.3" transform="rotate(-90 60 60)"/>
                  <circle cx="60" cy="60" r="44" fill="none" stroke="#3b82f6" strokeWidth="11" strokeDasharray="138.2 138.3" strokeDashoffset="-138.3" transform="rotate(-90 60 60)"/>
                </svg>
                <span><strong>8</strong><small>Total Members</small></span>
              </div>
              <div className="legend">
                <div><i className="human"/><span>Human Members</span><strong>4</strong></div>
                <div><i className="agent"/><span>AI Agents</span><strong>4</strong></div>
                <div><i className="vacant"/><span>Vacant Seats</span><strong>0</strong></div>
              </div>
            </div>
            <div className="health-row"><span>Governance Health</span><strong><ShieldCheck size={14}/> Healthy</strong></div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PanelLink({ children }: { children: React.ReactNode }) {
  return <button className="panel-link"><span>{children}</span><ArrowRight size={14}/></button>;
}
