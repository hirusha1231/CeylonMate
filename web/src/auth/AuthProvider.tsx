import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, apiError, onUnauthorized, setAccessToken } from '../api/client';
import type { AuthUser } from './types';

type AuthStatus = 'signedOut' | 'checking' | 'signedIn';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  login(email: string, password: string): Promise<AuthUser | null>;
  register(email: string, password: string, fullName?: string, phoneNumber?: string): Promise<AuthUser | null>;
  logout(): void;
  clearError(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [status, setStatus] = useState<AuthStatus>(() => {
    return localStorage.getItem('token') ? 'signedIn' : 'signedOut';
  });

  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
    setStatus('signedOut');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    onUnauthorized(logout);
    const token = localStorage.getItem('token');
    if (token) {
      setAccessToken(token);
      api.get<any>('/api/auth/me')
        .then((meRes) => {
          if (meRes.data) {
            const meUser: AuthUser = {
              id: String(meRes.data.id || meRes.data.userId || 'usr-1'),
              email: meRes.data.email || meRes.data.name || '',
              role: String(meRes.data.role || meRes.data.userRole || 'TRAVELER').toUpperCase(),
              fullName: meRes.data.fullName || meRes.data.name,
            };
            setUser(meUser);
            localStorage.setItem('user', JSON.stringify(meUser));
            setStatus('signedIn');
          }
        })
        .catch(() => {
          // Retain existing localStorage user session if /me fails
        });
    }
    return () => onUnauthorized(null);
  }, [logout]);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser | null> => {
    setError(null);
    setStatus('checking');
    try {
      console.log('[AuthProvider] Sending login request:', { email: email.trim() });
      const { data } = await api.post<any>('/api/auth/login', {
        email: email.trim(),
        password,
      });

      const token = data.accessToken || data.token || data.jwt;
      if (!token) {
        throw new Error('Invalid authentication response from server.');
      }

      setAccessToken(token);

      let authenticatedUser: AuthUser;
      if (data.user && (data.user.role || data.user.id || data.user.email)) {
        authenticatedUser = {
          id: String(data.user.id || data.user.userId || 'usr-1'),
          email: data.user.email || email.trim(),
          role: String(data.user.role || 'TRAVELER').toUpperCase(),
          fullName: data.user.fullName || data.user.name,
        };
      } else {
        try {
          const me = await api.get<any>('/api/auth/me');
          authenticatedUser = {
            id: String(me.data.id || me.data.userId || 'usr-1'),
            email: me.data.email || email.trim(),
            role: String(me.data.role || 'TRAVELER').toUpperCase(),
            fullName: me.data.fullName || me.data.name,
          };
        } catch {
          authenticatedUser = {
            id: 'usr-1',
            email: email.trim(),
            role: 'TRAVELER',
          };
        }
      }

      setUser(authenticatedUser);
      localStorage.setItem('user', JSON.stringify(authenticatedUser));
      setStatus('signedIn');
      setError(null);
      return authenticatedUser;
    } catch (failure: any) {
      setAccessToken(null);
      localStorage.removeItem('user');
      setUser(null);
      const errMsg = apiError(failure);
      setError(errMsg);
      setStatus('signedOut');
      throw failure;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName?: string, phoneNumber?: string): Promise<AuthUser | null> => {
    setError(null);
    setStatus('checking');
    try {
      console.log('[AuthProvider] Registering user:', { email: email.trim(), fullName, phoneNumber });
      const response = await api.post<any>('/api/auth/register', {
        email: email.trim(),
        password,
        fullName: fullName?.trim() || undefined,
        phoneNumber: phoneNumber?.trim() || '',
        role: 'TRAVELER',
      });
      console.log('[AuthProvider] Registration successful. Status:', response.status, 'Payload:', response.data);

      const data = response.data;
      const token = data.accessToken || data.token || data.jwt;
      if (!token) {
        throw new Error('Invalid registration response from server.');
      }

      setAccessToken(token);

      const registeredUser: AuthUser = {
        id: String(data.user?.id || 'usr-reg'),
        email: data.user?.email || email.trim(),
        role: String(data.user?.role || 'TRAVELER').toUpperCase(),
        fullName: data.user?.fullName || fullName,
      };

      setUser(registeredUser);
      localStorage.setItem('user', JSON.stringify(registeredUser));
      setStatus('signedIn');
      setError(null);
      return registeredUser;
    } catch (failure: any) {
      setAccessToken(null);
      localStorage.removeItem('user');
      setUser(null);

      const status = failure?.response?.status;
      const responseData = failure?.response?.data;
      console.error('[AuthProvider] Registration API error:', { status, data: responseData, error: failure?.message });

      const errMsg = apiError(failure);
      setError(errMsg);
      setStatus('signedOut');
      throw failure;
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, error, login, register, logout, clearError }),
    [user, status, error, login, register, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
