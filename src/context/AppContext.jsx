import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // 1. Load user from local storage so they don't get logged out on refresh
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('erp_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // 2. Login saves to state AND local storage
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('erp_user', JSON.stringify(userData));
  };

  // 3. Logout clears state, destroys storage, and forces a hard redirect
  const logout = () => {
    setUser(null);
    localStorage.removeItem('erp_user');
    window.location.href = '/login'; 
  };

  return (
    <AppContext.Provider value={{ user, login, logout }}>
      {children}
    </AppContext.Provider>
  );
};