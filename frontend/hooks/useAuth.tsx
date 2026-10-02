import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../services/api';

export interface User {
  userId: string;
  username: string;
  role: 'CUSTOMER' | 'ADMIN';
  customerId: string | null;
  fullName: string;
  sessionExpiresAt?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  sessionMessage: string | null;
  login: (username: string, password: string, rememberMe: boolean) => Promise<any>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clearSessionMessage: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/** localStorage keys — intentionally readable so learners can practice storage assertions. */
export const STORAGE = {
  user: 'parabank.user',
  rememberedUsername: 'parabank.rememberedUsername',
  challenges: 'parabank.challenges.completed',
  lastLogin: 'parabank.lastLoginAt',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/me', { silentAuth: true });
      const u: User = { userId: data.userId, username: data.username, role: data.role, customerId: data.customerId, fullName: data.fullName, sessionExpiresAt: data.sessionExpiresAt };
      setUser(u);
      localStorage.setItem(STORAGE.user, JSON.stringify(u));
    } catch (e: any) {
      setUser(null);
      localStorage.removeItem(STORAGE.user);
      if (e?.errorCode === 'SESSION_EXPIRED') setSessionMessage('Your session has expired. Please log in again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUnauthorized = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSessionMessage(detail?.errorCode === 'SESSION_EXPIRED' ? 'Your session has expired. Please log in again.' : 'Please log in to continue.');
      setUser(null);
      localStorage.removeItem(STORAGE.user);
    };
    window.addEventListener('parabank:unauthorized', onUnauthorized);
    return () => window.removeEventListener('parabank:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (username: string, password: string, rememberMe: boolean) => {
    const { data } = await api.post('/api/auth/login', { username, password, rememberMe }, { silentAuth: true });
    if (rememberMe) localStorage.setItem(STORAGE.rememberedUsername, username);
    else localStorage.removeItem(STORAGE.rememberedUsername);
    localStorage.setItem(STORAGE.lastLogin, new Date().toISOString());
    setSessionMessage(null);
    const u: User = { userId: data.userId, username: data.username, role: data.role, customerId: data.customerId, fullName: data.fullName, sessionExpiresAt: data.expiresAt };
    localStorage.setItem(STORAGE.user, JSON.stringify(u));
    setUser(u);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout', {}, { silentAuth: true });
    } finally {
      localStorage.removeItem(STORAGE.user);
      setUser(null);
      setSessionMessage('You have been logged out successfully.');
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, sessionMessage, login, logout, refresh, clearSessionMessage: () => setSessionMessage(null) }),
    [user, loading, sessionMessage, login, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
