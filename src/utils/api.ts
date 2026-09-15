import axios from 'axios';

const getBaseURL = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl && !envUrl.includes('localhost')) {
        return `${envUrl}/api`;
    }
    return import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
};

export const getMediaUrl = (path?: string | null): string => {
    if (!path) return '';
    if (
        path.startsWith('http://') ||
        path.startsWith('https://') ||
        path.startsWith('blob:') ||
        path.startsWith('data:')
    ) {
        return path;
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl && !envUrl.includes('localhost')) {
        return `${envUrl}${cleanPath}`;
    }
    if (import.meta.env.DEV) {
        return `http://localhost:3001${cleanPath}`;
    }
    return cleanPath;
};

const api = axios.create({
    baseURL: getBaseURL(),
});
let isRefreshing = false;

// Add a request interceptor to inject the auth token
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // TENANT ID
        const tenantId = sessionStorage.getItem('tenantId');

        if (tenantId) {
            config.headers['x-tenant-id'] = tenantId;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle unauthorized errors
api.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            !originalRequest.url?.includes('/auth/login') &&
            !originalRequest._retry &&
            !isRefreshing
        ) {
            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = sessionStorage.getItem('refreshToken');

                if (!refreshToken) {
                    throw new Error('No refresh token found');
                }

                const res = await axios.post(
                    `${api.defaults.baseURL || '/api'}/auth/refresh-token`,
                    { refreshToken }
                );

                const newToken = res.data.token;


                sessionStorage.setItem('token', newToken);

                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                // IMPORTANT FIX
                const tenantId =
                    sessionStorage.getItem('tenantId');

                if (tenantId) {
                    originalRequest.headers['x-tenant-id'] =
                        tenantId;
                }

                return api(originalRequest);
            } catch (refreshError) {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('refreshToken');
                sessionStorage.removeItem('tenantId');

                window.location.href = '/signin';

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        if (
            error.response?.status === 403 &&
            (error.response?.data?.code === 'SUBSCRIPTION_SUSPENDED' ||
             error.response?.data?.code === 'COMPANY_DEACTIVATED')
        ) {
            window.dispatchEvent(
                new CustomEvent('subscription-suspended', {
                    detail: error.response.data,
                })
            );
        }

        return Promise.reject(error);
    }
);

export default api;
