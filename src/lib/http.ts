import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

// Inyectar token en cada request
http.interceptors.request.use((config) => {
  const raw = localStorage.getItem('pipe-auth');
  if (raw) {
    try {
      // Zustand persist guarda: { state: { token, ... }, version: 0 }
      const parsed = JSON.parse(raw) as { state?: { token?: string }; token?: string };
      const token = parsed.state?.token ?? (parsed as { token?: string }).token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignorar
    }
  }
  return config;
});

// Logout automático en 401
http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pipe-auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
