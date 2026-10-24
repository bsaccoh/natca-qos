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
    // Do not attempt refresh on auth endpoints (login, refresh, logout)
    if (!orig || orig.url?.includes('/auth/refresh') || orig.url?.includes('/auth/login')) {
      return Promise.reject(err);
    }

    if (err.response?.status === 401 && !orig._retry && tokenStore.refresh) {
      orig._retry = true;
      if (!refreshing) {
        const refreshEndpoint = (api.defaults.baseURL || '/api/v1').replace(/\/$/, '') + '/auth/refresh';
        refreshing = axios
          .post(refreshEndpoint, { refreshToken: tokenStore.refresh })
          .then((r) => {
            const newAccess = r.data?.data?.accessToken || r.data?.accessToken;
            if (newAccess) {
              tokenStore.set({
                accessToken: newAccess,
                refreshToken: tokenStore.refresh,
              });
              return newAccess;
            }
            throw new Error('Missing access token');
          })
          .catch((refreshErr) => {
            tokenStore.clear();
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshErr);
          })
          .finally(() => {
            refreshing = null;
          });
      }

      try {
        const newAccess = await refreshing;
        orig.headers = orig.headers || {};
        orig.headers.Authorization = `Bearer ${newAccess}`;
        return api(orig);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
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
