import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// Base API configuration for Spring Boot backend integration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Render free-tier services sleep when idle and can take ~60s to wake up.
// The default timeout must cover a full cold start so the first request after
// idle does not abort with a network error. Configurable per deployment via
// VITE_API_TIMEOUT_MS (build-time env var).
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 180000;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: API_TIMEOUT_MS
});

// Request interceptor to append Auth tokens
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gem_auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const clearAuthState = (): void => {
  localStorage.removeItem('gem_auth_token');
  localStorage.removeItem('gem_user_role');
  localStorage.removeItem('gem_user_email');
  window.dispatchEvent(new Event('gem-auth-cleared'));
};

// Response interceptor for consistent error handling
type RetriableConfig = InternalAxiosRequestConfig & { __retryCount?: number };

// Bounded retry for requests that never received an HTTP response
// (network failure, timeout, or backend cold start). Server responses such as
// 401/500 are never retried. Total attempts: 3 (1 initial + 2 retries).
const MAX_NETWORK_RETRIES = 2;
const RETRY_BACKOFF_MS = [2000, 5000];

api.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    const config = error.config as RetriableConfig | undefined;
    if (!error.response && config) {
      const attempt = config.__retryCount ?? 0;
      if (attempt < MAX_NETWORK_RETRIES) {
        config.__retryCount = attempt + 1;
        await new Promise((resolve) => setTimeout(resolve, RETRY_BACKOFF_MS[attempt] ?? 5000));
        return api.request(config);
      }
    }
    if (error.response?.status === 401) {
      clearAuthState();
    }
    // Attach a meaningful message for error handling in components
    if (error.response?.data?.message) {
      error.message = error.response.data.message;
    } else if (error.response?.data?.error) {
      error.message = error.response.data.error;
    }
    return Promise.reject(error);
  }
);

// Real API mode is the safe default. Fixtures require an explicit opt-in.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

