import axios from 'axios';

// Base API configuration for Spring Boot backend integration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 15000
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
api.interceptors.response.use(
  (response) => response,
  (error) => {
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

