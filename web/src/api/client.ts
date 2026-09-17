import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

let accessToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 &&
        !error.config?.url?.endsWith('/api/auth/login')) {
      setAccessToken(null);
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  },
);

export function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) return 'Invalid email or password.';
    if (error.response?.status === 403) return 'You do not have access to this page.';
    if (error.response?.status === 400) return 'Please check the submitted details.';
    if (!error.response) return 'The API is unavailable. Check your connection and retry.';
    return 'The request failed. Please retry.';
  }
  return 'Something went wrong. Please retry.';
}
