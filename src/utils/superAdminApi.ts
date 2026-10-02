import axios from "axios";

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl) {
    if (!import.meta.env.DEV && envUrl.includes('localhost')) {
      return 'https://omnihr-backend-19fx.onrender.com/api/superadmin';
    }
    const cleanUrl = envUrl.replace(/\/+$/, '');
    return cleanUrl.endsWith('/api')
      ? `${cleanUrl}/superadmin`
      : `${cleanUrl}/api/superadmin`;
  }
  return import.meta.env.DEV
    ? 'http://localhost:3001/api/superadmin'
    : 'https://omnihr-backend-19fx.onrender.com/api/superadmin';
};

const API_BASE_URL = getBaseURL();

export const superAdminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

superAdminApi.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("superadmin_token") || localStorage.getItem("superadmin_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const handleAuthSessionExpired = () => {
  sessionStorage.removeItem("superadmin_token");
  sessionStorage.removeItem("superadmin_refresh_token");
  sessionStorage.removeItem("superadmin_user");
  localStorage.removeItem("superadmin_token");
  localStorage.removeItem("superadmin_refresh_token");
  localStorage.removeItem("superadmin_user");

  // Preserve the current URL so admin can return directly after signing in
  if (window.location.pathname.startsWith("/superadmin")) {
    sessionStorage.setItem(
      "superadmin_redirect",
      window.location.pathname + window.location.search
    );
  }

  // Gracefully notify context and components instead of hard browser reload
  window.dispatchEvent(new CustomEvent("superadmin-session-expired"));
};

superAdminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip auth routes (login / register / refresh-token) and already retried requests
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register") &&
      !originalRequest.url?.includes("/auth/refresh-token")
    ) {
      const refreshToken =
        sessionStorage.getItem("superadmin_refresh_token") ||
        localStorage.getItem("superadmin_refresh_token");

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return superAdminApi(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      if (refreshToken) {
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const { token: newToken, refreshToken: newRefreshToken } = res.data;

          if (localStorage.getItem("superadmin_token")) {
            localStorage.setItem("superadmin_token", newToken);
            if (newRefreshToken) localStorage.setItem("superadmin_refresh_token", newRefreshToken);
          }
          if (sessionStorage.getItem("superadmin_token")) {
            sessionStorage.setItem("superadmin_token", newToken);
            if (newRefreshToken) sessionStorage.setItem("superadmin_refresh_token", newRefreshToken);
          }

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);

          return superAdminApi(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          handleAuthSessionExpired();
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      } else {
        // No refresh token available, gracefully expire session without page reload
        handleAuthSessionExpired();
      }
    }

    return Promise.reject(error);
  }
);
