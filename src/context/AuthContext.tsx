'use strict';
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import * as api from '../lib/api';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  loginUser: (examId: string, passwordHash: string) => Promise<boolean>;
  loginAdmin: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadSession() {
      try {
        api.initializeDB();
        const curUser = await api.getCurrentUser();
        setUser(curUser);
        setIsAdmin(curUser !== null && curUser.role === 'admin');
      } catch (err) {
        console.error('Failed to load session:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, []);

  const loginUser = async (examId: string, passwordHash: string): Promise<boolean> => {
    setLoading(true);
    try {
      const loggedUser = await api.login(examId, passwordHash);
      if (loggedUser) {
        setUser(loggedUser);
        setIsAdmin(false);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginAdmin = async (password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await api.adminLogin(password);
      if (success) {
        setIsAdmin(true);
        setUser(null);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.logout();
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    const curUser = await api.getCurrentUser();
    setUser(curUser);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, loginUser, loginAdmin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
