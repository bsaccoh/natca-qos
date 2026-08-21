import axios from 'axios';

const tokenStore = {
  get access() {
    return localStorage.getItem('cms_access');
  },
  get refresh() {
    return localStorage.getItem('cms_refresh');
  },
  set({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem('cms_access', accessToken);
    if (refreshToken) localStorage.setItem('cms_refresh', refreshToken);
  },
  clear() {
    localStorage.removeItem('cms_access');
    localStorage.removeItem('cms_refresh');
  },
};

// Multi-tab logout listener
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'cms_access' && !e.newValue && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  });
}

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/v1' });

api.interceptors.request.use((cfg) => {
  if (tokenStore.access) {
    cfg.headers.Authorization = `Bearer ${tokenStore.access}`;
  }
  return cfg;
});

let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry && tokenStore.refresh) {
      if (!refreshing) {
        refreshing = api
          .post('/auth/refresh', { refreshToken: tokenStore.refresh })
          .then((r) => {
            tokenStore.set({
              accessToken: r.data?.data?.accessToken || r.data?.accessToken,
              refreshToken: tokenStore.refresh,
            });
          })
          .catch(() => {
            tokenStore.clear();
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          })
          .finally(() => {
            refreshing = null;
          });
      }
      await refreshing;
      orig._retry = true;
      return api(orig);
    }
    return Promise.reject(err);
  }
);

/**
 * Standard error message extractor from Axios error or JS Error
 */
export function getErrorMessage(err, defaultMsg = 'An unexpected error occurred.') {
  if (!err) return defaultMsg;
  if (typeof err === 'string') return err;
  return (
    err.response?.data?.error ||
    err.response?.data?.message ||
    err.message ||
    defaultMsg
  );
}

export { api, tokenStore };
export const get = (url, cfg) => api.get(url, cfg).then((r) => r.data);
export const post = (url, data, cfg) => api.post(url, data, cfg).then((r) => r.data);
export const put = (url, data, cfg) => api.put(url, data, cfg).then((r) => r.data);
export const patch = (url, data, cfg) => api.patch(url, data, cfg).then((r) => r.data);
export const del = (url, cfg) => api.delete(url, cfg).then((r) => r.data);
