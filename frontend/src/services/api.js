import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

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
    if (isDatabaseMutation(error.config)) {
      emitFeedback('error', error.response?.data?.message || 'Revisa tu conexión e inténtalo de nuevo.');
    }
    return Promise.reject(error);
  },
);
