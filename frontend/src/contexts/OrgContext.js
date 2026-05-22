import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { orgAPI } from '../lib/api';
import { useAuth } from './AuthContext';

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchOrgs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await orgAPI.list();
      setOrgs(res.data);
      const saved = localStorage.getItem('openclaw_org');
      if (saved) {
        const found = res.data.find(o => o.id === saved);
        if (found) { setCurrentOrg(found); }
        else if (res.data.length > 0) { setCurrentOrg(res.data[0]); }
      } else if (res.data.length > 0) {
        setCurrentOrg(res.data[0]);
        localStorage.setItem('openclaw_org', res.data[0].id);
      }
    } catch (e) {
      console.error('fetchOrgs error', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const switchOrg = useCallback((org) => {
    setCurrentOrg(org);
    localStorage.setItem('openclaw_org', org.id);
  }, []);

  const addOrg = useCallback((org) => {
    setOrgs(prev => [org, ...prev]);
    switchOrg(org);
  }, [switchOrg]);

  return (
    <OrgContext.Provider value={{ orgs, currentOrg, loading, fetchOrgs, switchOrg, addOrg }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
};
