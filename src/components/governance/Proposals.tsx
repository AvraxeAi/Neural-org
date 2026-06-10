import React from 'react';

const PROPOSALS = [
  { id:'#42', title:'AI Security Audit Framework', status:'Voting', votes:'6/8', deadline:'May 24' },
  { id:'#41', title:'Budget Allocation Q2', status:'Approved', votes:'7/8', deadline:'May 18' },
  { id:'#40', title:'New Hiring Workflow', status:'Rejected', votes:'3/8', deadline:'May 15' },
];

export default function Proposals() {
  return (
    <div className="phase-page simple-page">
      <div className="page-heading"><div><h1>Proposals</h1><p>Create, discuss, and vote on organizational proposals.</p></div><button className="primary-button">New Proposal</button></div>
      <section className="panel">
        <table className="data-table"><thead><tr><th>ID</th><th>Proposal</th><th>Status</th><th>Votes</th><th>Deadline</th></tr></thead>
          <tbody>{PROPOSALS.map(item => <tr key={item.id}><td>{item.id}</td><td><strong>{item.title}</strong></td><td><span className={`proposal-status ${item.status.toLowerCase()}`}>{item.status}</span></td><td>{item.votes}</td><td>{item.deadline}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
