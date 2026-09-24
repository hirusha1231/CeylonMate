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
  clearError(): void;
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

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    onUnauthorized(logout);
    return () => onUnauthorized(null);
  }, [logout]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setStatus('checking');
    try {
      const { data } = await api.post<LoginResponse>('/api/auth/login', {
        email: email.trim(),
        password,
      });

      if (!data.accessToken) {
        throw new Error('Invalid token response from backend API.');
      }

      setAccessToken(data.accessToken);

      try {
        const me = await api.get<AuthUser>('/api/auth/me');
        setUser(me.data);
      } catch {
        setUser(data.user || { id: 'usr-1', email: email.trim(), role: 'TRAVELER' });
      }

      setStatus('signedIn');
      setError(null);
      return true;
    } catch (failure) {
      setAccessToken(null);
      setUser(null);
      const errMsg = apiError(failure);
      setError(errMsg);
      setStatus('signedOut');
      return false;
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, error, login, logout, clearError }),
    [user, status, error, login, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
