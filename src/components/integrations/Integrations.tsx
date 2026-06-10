import React, { useState } from 'react';
import { Github, Plug, Unplug } from 'lucide-react';

const ITEMS = ['GitHub','Slack','Google Workspace','Jira','Notion','Linear'];

export default function Integrations() {
  const [connected, setConnected] = useState(new Set(['GitHub','Google Workspace']));
  const toggle = (name: string) => setConnected(current => {
    const next = new Set(current);
    next.has(name) ? next.delete(name) : next.add(name);
    return next;
  });
  return (
    <div className="phase-page simple-page">
      <div className="page-heading"><div><h1>Integrations</h1><p>Connect external tools and services.</p></div></div>
      <div className="integration-grid">
        {ITEMS.map((name, index) => {
          const isConnected = connected.has(name);
          return <section className="panel integration-card" key={name}><span className="integration-logo">{index === 0 ? <Github size={22}/> : name.slice(0,2)}</span><div><h2>{name}</h2><p>{isConnected ? 'Connected to your workspace' : 'Not connected'}</p></div><button className={isConnected ? 'outline-button' : 'primary-button'} onClick={() => toggle(name)}>{isConnected ? <Unplug size={13}/> : <Plug size={13}/>} {isConnected ? 'Disconnect' : 'Connect'}</button></section>;
        })}
      </div>
    </div>
  );
}
