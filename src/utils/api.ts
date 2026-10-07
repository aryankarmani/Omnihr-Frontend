import axios from 'axios';
import toast from 'react-hot-toast';

const getBaseURL = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
    if (envUrl && !envUrl.includes('localhost')) {
        return `${envUrl.replace(/\/+$/, '')}/api`;
    }
    return import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://omnihr-backend-19fx.onrender.com/api';
};

export const getMediaUrl = (path?: string | null): string => {
    if (!path || typeof path !== 'string') return '';
    if (
        path.startsWith('http://') ||
        path.startsWith('https://') ||
        path.startsWith('blob:') ||
        path.startsWith('data:')
    ) {
        return path;
    }
    const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
    const cleanPath = normalized.startsWith('uploads/') ? `/${normalized}` : `/uploads/${normalized}`;

    const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
    if (envUrl && !envUrl.includes('localhost')) {
        return `${envUrl.replace(/\/+$/, '')}${cleanPath}`;
    }
    if (import.meta.env.DEV) {
        return `http://localhost:3001${cleanPath}`;
    }
    return `https://omnihr-backend-19fx.onrender.com${cleanPath}`;
};

const api = axios.create({
    baseURL: getBaseURL(),
});
let isRefreshing = false;
let isRedirecting = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token!);
        }
    });
    failedQueue = [];
};

// Add a request interceptor to inject the auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // TENANT ID
        const tenantId = localStorage.getItem('tenantId') || sessionStorage.getItem('tenantId');

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
            !originalRequest._retry
        ) {
            // If another request is currently refreshing the token, queue this request
            if (isRefreshing) {
                return new Promise<string>((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        const tenantId =
                            sessionStorage.getItem('tenantId') || localStorage.getItem('tenantId');
                        if (tenantId) {
                            originalRequest.headers['x-tenant-id'] = tenantId;
                        }
                        return api(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken =
                    localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');

                if (!refreshToken) {
                    throw new Error('No refresh token found');
                }

                const res = await axios.post(
                    `${api.defaults.baseURL || '/api'}/auth/refresh-token`,
                    { refreshToken }
                );

                const newToken = res.data.token;

                localStorage.setItem('token', newToken);
                sessionStorage.setItem('token', newToken);
                localStorage.setItem('auth_sync_time', Date.now().toString());

                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                const tenantId =
                    localStorage.getItem('tenantId') || sessionStorage.getItem('tenantId');

                if (tenantId) {
                    originalRequest.headers['x-tenant-id'] = tenantId;
                }

                // Resolve all paused requests in the queue with the new token
                processQueue(null, newToken);

                return api(originalRequest);
            } catch (refreshError) {
                // Reject all queued requests and wipe session
                processQueue(refreshError, null);

                const keysToRemove = [
                    'token',
                    'refreshToken',
                    'tenantId',
                    'encalm_user',
                    'superadmin_token',
                    'superadmin_refresh_token',
                    'superadmin_user',
                    'encalm_remember_me',
                ];

                keysToRemove.forEach((key) => {
                    sessionStorage.removeItem(key);
                    localStorage.removeItem(key);
                });

                localStorage.setItem('auth_logout_time', Date.now().toString());

                if (
                    !isRedirecting &&
                    window.location.pathname !== '/signin' &&
                    window.location.pathname !== '/login'
                ) {
                    isRedirecting = true;
                    window.location.replace('/signin');
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        if (error.response?.status === 403) {
            const data = error.response?.data;
            if (
                data?.code === 'SUBSCRIPTION_SUSPENDED' ||
                data?.code === 'COMPANY_DEACTIVATED'
            ) {
                window.dispatchEvent(
                    new CustomEvent('subscription-suspended', {
                        detail: data,
                    })
                );
            } else {
                // Access Control / Permission denied notification
                if (typeof window !== 'undefined') {
                    (window as any).__lastPermissionDeniedTime = Date.now();
                }
                const msg = data?.message || "You don't have access to this";
                toast.error(msg, {
                    id: 'access-control-denied-toast',
                    duration: 4000,
                });
            }
        }

        return Promise.reject(error);
    }
);

export default api;
