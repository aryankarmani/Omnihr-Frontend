import axios from 'axios';

const api = axios.create({
    baseURL: 'https://omnihr-backend-19fx.onrender.com/api',
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
                    'https://omnihr-backend-19fx.onrender.com/api/auth/refresh-token',
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

        return Promise.reject(error);
    }
);

export default api;
