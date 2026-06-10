import React, { useState } from 'react';

type SettingsTab = 'general' | 'security' | 'notifications' | 'api' | 'team';
export default function Settings({ initialTab = 'general' }: { initialTab?: string }) {
  const [tab, setTab] = useState<SettingsTab>((initialTab as SettingsTab) || 'general');
  const labels: Array<[SettingsTab,string]> = [['general','General'],['security','Security'],['notifications','Notifications'],['api','API Keys'],['team','Team']];
  return (
    <div className="phase-page simple-page">
      <div className="page-heading"><div><h1>Settings</h1><p>Configure your workspace and preferences.</p></div></div>
      <div className="settings-layout">
        <nav className="settings-tabs">{labels.map(([id,label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>
        <section className="panel settings-panel"><h2>{labels.find(item => item[0] === tab)?.[1]}</h2><p>Manage your {tab === 'api' ? 'API keys and provider credentials' : `${tab} preferences`} for the OpenClaw workspace.</p><label>Workspace name<input defaultValue="AvraxeAi Command Center"/></label><label>Default access<select defaultValue="admin"><option value="admin">Administrator</option><option value="member">Member</option></select></label><button className="primary-button">Save changes</button></section>
      </div>
    </div>
  );
}
