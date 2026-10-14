import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const TOKEN_KEY = 'cfe_kiosco_token';
const USER_KEY = 'cfe_kiosco_user';

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const getStoredSession = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userStr = localStorage.getItem(USER_KEY);
    if (!token || !userStr) return null;
    return { token, user: JSON.parse(userStr) };
  } catch {
    return null;
  }
};

export const saveSession = (token, user) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  setAuthToken(null);
};

// Restaurar token si existe en el almacenamiento local
const initialSession = getStoredSession();
if (initialSession?.token) {
  setAuthToken(initialSession.token);
}

const isDatabaseMutation = (config) => {
  const method = String(config?.method || '').toLowerCase();
  return ['post', 'put', 'patch', 'delete'].includes(method) && !String(config?.url || '').includes('/api/auth/login');
};

const emitFeedback = (type, message) => {
  window.dispatchEvent(new CustomEvent('app-feedback', { detail: { type, message } }));
};

api.interceptors.response.use(
  (response) => {
    if (isDatabaseMutation(response.config)) {
      emitFeedback('success', response.data?.message || 'Los cambios se guardaron correctamente en la base de datos.');
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      clearSession();
      window.dispatchEvent(new CustomEvent('auth-logout'));
    }
    if (isDatabaseMutation(error.config)) {
      emitFeedback('error', error.response?.data?.message || 'Revisa tu conexión e inténtalo de nuevo.');
    }
    return Promise.reject(error);
  },
);
