import axios, { AxiosError } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5084';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5084',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
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
      return "Unable to reach backend server (port 5084). Please verify connectivity.";
    }
    if (error.response?.status === 409) {
      return "This email address is already registered. Please sign in instead.";
    }
    if (error.response?.status === 401) {
      return 'Invalid email or password. Please verify your credentials.';
    }
    if (error.response?.status === 403) {
      return 'Access Denied: Requires ADMIN or privileged role.';
    }
    const responseData = error.response?.data as any;
    if (responseData?.errors && typeof responseData.errors === 'object') {
      const errorList = Object.entries(responseData.errors)
        .flatMap(([field, msgs]) => Array.isArray(msgs) ? msgs.map(m => `${field}: ${m}`) : [`${field}: ${msgs}`]);
      if (errorList.length > 0) {
        return errorList.join('; ');
      }
    }
    const dataMessage = responseData?.detail || responseData?.message || responseData?.title || (typeof responseData === 'string' ? responseData : null);
    if (error.response?.status === 400) {
      return dataMessage || "Invalid registration details. Please check the fields.";
    }
    if (error.response?.status === 500) {
      return `Server database error: ${dataMessage || 'Failed to save user'}`;
    }
    if (dataMessage) {
      return dataMessage;
    }
    return `Server Error (${error.response.status}). Please retry.`;
  }
  return "Unable to reach backend server (port 5084). Please verify connectivity.";
}

export async function checkServerHealth(): Promise<boolean> {
  const targetUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5084';
  try {
    const res = await axios.get(`${targetUrl}/api/system/health`, { timeout: 3000 });
    return res.status === 200;
  } catch {
    try {
      const res2 = await axios.get(`${targetUrl}/health`, { timeout: 3000 });
      return res2.status === 200;
    } catch {
      return false;
    }
  }
}
