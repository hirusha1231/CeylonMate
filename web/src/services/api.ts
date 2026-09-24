import axios, { AxiosError } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: { Accept: 'application/json' },
});

let accessToken: string | null = localStorage.getItem('token');
let unauthorizedHandler: (() => void) | null = null;
let forbiddenHandler: ((msg: string) => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export function getAccessToken(): string | null {
  return accessToken || localStorage.getItem('token');
}

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function onForbidden(handler: ((msg: string) => void) | null) {
  forbiddenHandler = handler;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !error.config?.url?.endsWith('/api/auth/login')) {
      setAccessToken(null);
      unauthorizedHandler?.();
    }
    if (error.response?.status === 403) {
      forbiddenHandler?.('Access Denied: Requires ADMIN or privileged role.');
    }
    return Promise.reject(error);
  }
);

export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      return `🚨 Backend Server Offline: Unable to connect to CeylonMate API at ${API_BASE_URL}. Please ensure the ASP.NET Core backend is running.`;
    }
    if (error.response?.status === 401) {
      return 'Invalid email or password. Please verify your credentials.';
    }
    if (error.response?.status === 403) {
      return 'Access Denied: Requires ADMIN or privileged role.';
    }
    const dataMessage = (error.response?.data as any)?.message || (error.response?.data as any)?.title || (typeof error.response?.data === 'string' ? error.response.data : null);
    if (dataMessage) {
      return dataMessage;
    }
    if (error.response?.status === 400) {
      return 'Please check the submitted details.';
    }
    return `Server Error (${error.response.status}). Please retry.`;
  }
  return 'Something went wrong. Please retry.';
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await api.get('/api/system/health', { timeout: 3000 });
    return res.status === 200;
  } catch {
    try {
      const res2 = await api.get('/health', { timeout: 3000 });
      return res2.status === 200;
    } catch {
      return false;
    }
  }
}
