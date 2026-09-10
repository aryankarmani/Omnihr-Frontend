import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api/superadmin` 
  : "http://localhost:3001/api/superadmin";

export const superAdminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

superAdminApi.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("superadmin_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

superAdminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem("superadmin_token");
      sessionStorage.removeItem("superadmin_user");
      if (window.location.pathname.startsWith("/superadmin") && window.location.pathname !== "/superadmin/login") {
        window.location.href = "/superadmin/login";
      }
    }
    return Promise.reject(error);
  }
);
