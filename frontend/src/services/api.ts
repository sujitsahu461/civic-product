import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach JWT access token
api.interceptors.request.use(
  (config) => {
    const isPublicAuthRoute =
      config.url?.includes('/auth/login') ||
      config.url?.includes('/auth/register') ||
      config.url?.includes('/auth/captcha') ||
      config.url?.includes('/auth/forgot-password') ||
      config.url?.includes('/auth/reset-password') ||
      config.url?.includes('/auth/refresh');

    if (!isPublicAuthRoute) {
      const token = localStorage.getItem('civicsetu_access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses for token refresh or error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    // Extract readable error message from response data if available
    if (error.response?.data) {
      const d = error.response.data;
      if (typeof d === 'string') {
        if (!d.includes('<html') && !d.includes('<!DOCTYPE') && d.length < 250) {
          error.message = d;
        } else {
          error.message = 'A server error occurred while processing your request. Please try again.';
        }
      } else if (d.detail && typeof d.detail === 'string') {
        error.message = d.detail;
      } else if (d.message && typeof d.message === 'string') {
        error.message = d.message;
      } else if (typeof d === 'object') {
        const msgs: string[] = [];
        for (const [k, v] of Object.entries(d)) {
          const text = Array.isArray(v) ? v.join(' ') : String(v);
          const field = k === 'non_field_errors' ? '' : `${k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}: `;
          msgs.push(`${field}${text}`);
        }
        if (msgs.length > 0) {
          error.message = msgs.join(' | ');
        }
      }
    }

    // Handle 429 Too Many Requests (rate limiting)
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers?.['retry-after'];
      const waitMsg = retryAfter
        ? `Please wait ${retryAfter} seconds before trying again.`
        : 'Please wait a moment before trying again.';
      const rateLimitError = new Error(
        `Too many requests. ${waitMsg}`
      );
      (rateLimitError as any).response = error.response;
      return Promise.reject(rateLimitError);
    }

    // Handle 401 Unauthorized for token refresh (exclude public login/register/auth endpoints)
    const isAuthRoute =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/captcha') ||
      originalRequest.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('civicsetu_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/v1/auth/refresh/', {
            refresh: refreshToken,
          });
          const newAccess = res.data.access;
          if (newAccess) {
            localStorage.setItem('civicsetu_access_token', newAccess);
            if (res.data.refresh) {
              localStorage.setItem('civicsetu_refresh_token', res.data.refresh);
            }
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            return api(originalRequest);
          }
        } catch {
          localStorage.removeItem('civicsetu_access_token');
          localStorage.removeItem('civicsetu_refresh_token');
          const path = window.location.pathname;
          if (path.includes('/authority')) {
            window.location.href = '/login/authority';
          } else if (path.includes('/superadmin')) {
            window.location.href = '/login/superadmin';
          } else {
            window.location.href = '/login/citizen';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
