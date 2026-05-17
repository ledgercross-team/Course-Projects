import axios from 'axios';

/** Backend base URL must end with /api (routes are /api/turfs, /api/auth, etc.). */
function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) {
    if (import.meta.env.PROD) {
      console.error(
        'VITE_API_URL is missing. Set it in Vercel to your backend URL (e.g. https://ledgerturf-backend.vercel.app/api) and redeploy.'
      );
    }
    return '/api';
  }
  const withoutTrailingSlash = raw.replace(/\/+$/, '');
  return withoutTrailingSlash.endsWith('/api')
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api`;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add auth token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
