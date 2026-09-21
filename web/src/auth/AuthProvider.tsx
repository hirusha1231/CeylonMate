import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, apiError, onUnauthorized, setAccessToken } from '../api/client';
import type { AuthUser, LoginResponse } from './types';

type AuthStatus = 'signedOut' | 'checking' | 'signedIn';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  login(email: string, password: string): Promise<boolean>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('signedOut');
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setError(null);
    setStatus('signedOut');
  }, []);

  useEffect(() => {
    onUnauthorized(logout);
    return () => onUnauthorized(null);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setStatus('checking');
    try {
      const { data } = await api.post<LoginResponse>('/api/auth/login', {
        email: email.trim(), password,
      });
      if (!data.accessToken || Date.parse(data.expiresAtUtc) <= Date.now()) {
        throw new Error('Invalid token response');
      }
      setAccessToken(data.accessToken);
      const me = await api.get<AuthUser>('/api/auth/me');
      setUser(me.data);
      setStatus('signedIn');
      return true;
    } catch (failure) {
      setAccessToken(null);
      setUser(null);
      setError(apiError(failure));
      setStatus('signedOut');
      return false;
    }
  }, []);

  const value = useMemo(() => ({ user, status, error, login, logout }),
    [user, status, error, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
