import React, { useState } from 'react';

export function OrgSettings() {
  const [orgName, setOrgName] = useState("Rusty's Org");
  const [handle, setHandle] = useState('@rustyadj');
  const [aiVoting, setAiVoting] = useState(true);
  const [agentCollab, setAgentCollab] = useState(true);
  const [guestAgents, setGuestAgents] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 680 }}>

      {/* General */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.2px' }}>General</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Organization Name">
            <input value={orgName} onChange={e => setOrgName(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Handle">
            <input value={handle} onChange={e => setHandle(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Description">
            <textarea rows={2} placeholder="What is this org for?" style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
          </Field>
        </div>
      </div>

      {/* Collaboration */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.2px' }}>Collaboration</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Toggle label="AI Agent Voting" desc="Allow AI agents to vote on decisions on behalf of their owner" value={aiVoting} onChange={setAiVoting} />
          <Toggle label="Cross-Agent Collaboration" desc="Agents from different members can communicate and collaborate on shared tasks" value={agentCollab} onChange={setAgentCollab} />
          <Toggle label="Guest Agent Access" desc="Allow guest members to bring their personal AI agents into this org" value={guestAgents} onChange={setGuestAgents} />
        </div>
      </div>

      {/* Permissions */}
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 16, letterSpacing: '-0.2px' }}>Member Permissions</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Permission','Owner','Admin','Member','Guest'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Permission' ? 'left' : 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Invite members',   true,  true,  false, false],
              ['Create projects',  true,  true,  true,  false],
              ['Manage agents',    true,  true,  false, false],
              ['View discussions', true,  true,  true,  true ],
              ['Vote on decisions',true,  true,  true,  false],
              ['Access CRM',       true,  true,  false, false],
            ].map(([perm, ...vals], i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{perm}</td>
                {vals.map((v, j) => (
                  <td key={j} style={{ padding: '10px 12px', textAlign: 'center', fontSize: 14 }}>
                    {v ? <span style={{ color: 'var(--status-green)' }}>✓</span> : <span style={{ color: 'rgba(0,0,0,0.15)' }}>—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Danger zone */}
      <div className="glass-card" style={{ padding: '20px 24px', borderColor: 'rgba(239,68,68,0.2)' }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 14, color: 'var(--status-red)', letterSpacing: '-0.2px' }}>Danger Zone</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '8px 16px', color: 'var(--status-red)', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Transfer Ownership</button>
          <button style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '8px 16px', color: 'var(--status-red)', fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete Organization</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} style={{ background: saved ? 'rgba(0,201,122,0.15)' : 'linear-gradient(135deg,#00E6A8,#00C494)', border: saved ? '1px solid rgba(0,201,122,0.3)' : 'none', borderRadius: 10, padding: '10px 24px', color: saved ? 'var(--status-green)' : '#fff', fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: saved ? 'none' : '0 4px 14px rgba(0,230,168,0.3)' }}>
          {saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface-raise)', border: '1px solid var(--border)',
  borderRadius: 9, padding: '9px 13px', fontSize: 13, color: 'var(--text-primary)',
  fontFamily: "'Outfit',sans-serif", transition: 'border-color 0.15s',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
          background: value ? 'var(--accent)' : 'rgba(0,0,0,0.12)',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          boxShadow: value ? '0 2px 8px rgba(0,230,168,0.35)' : 'none',
        }}
      >
        <div style={{
          position: 'absolute', top: 3, left: value ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%', background: 'var(--text-primary)',
          transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}
