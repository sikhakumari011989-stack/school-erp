import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reads the logged-in person's profile (school + role)
  const loadProfile = async (session) => {
    if (!session) {
      setUser(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, role_code, full_name, school_id, schools ( code )')
      .eq('id', session.user.id)
      .single();

    if (error || !data) {
      await supabase.auth.signOut();
      setUser(null);
    } else {
      setUser({
        id: data.id,
        name: data.full_name,
        role: data.role,
        role_code: data.role_code,
        school_id: data.school_id,
        institution_code: data.schools?.code,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    // Check for an existing session when the app opens
    supabase.auth.getSession().then(({ data }) => loadProfile(data.session));

    // Keep user in sync when logging in or out
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AppContext.Provider value={{ user, loading, logout }}>
      {children}
    </AppContext.Provider>
  );
};