import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { requestFcmToken, listenToForegroundMessages } from "../firebase";

export type UserRole = "HR_ADMIN" | "EMPLOYEE" | "SYSTEM_ADMIN" | "MANAGER" | "SUPER_ADMIN";

interface User {
    id: number | string;
    name: string;
    email: string;
    role: UserRole;
    tenantId?: string;
    token?: string;
    accessibleModules?: string[];
    forcePasswordChange?: boolean;
    avatar?: string | null;
    profilePicture?: string | null;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
    logout: () => Promise<void> | void;
    refreshUser: () => Promise<void>;
    updateUser: (updatedUser: Partial<User>) => void;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredItem = (key: string): string | null => {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
};

const setStoredItem = (key: string, value: string) => {
    if (localStorage.getItem('encalm_remember_me') === 'true') {
        localStorage.setItem(key, value);
    } else {
        sessionStorage.setItem(key, value);
    }
};

const removeStoredItem = (key: string) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshUser = async () => {
        try {
            const token = getStoredItem('token');
            if (!token) return;
            const res = await api.get('/auth/me');
            if (res.data?.user) {
                const userData = res.data.user;
                if (userData && typeof userData.role === 'string') {
                    userData.role = userData.role.toUpperCase();
                }

                if (!userData.avatar && !userData.profilePicture && userData.role !== 'SUPER_ADMIN') {
                    try {
                        const empRes = await api.get('/employee/me');
                        const empAvatar = empRes.data?.employeeProfile?.avatar || empRes.data?.avatar || null;
                        if (empAvatar) {
                            userData.avatar = empAvatar;
                            userData.profilePicture = empAvatar;
                        }
                    } catch (e) {
                        // ignore
                    }
                }

                setUser(userData);
                setStoredItem('encalm_user', JSON.stringify(userData));
            }
        } catch (e) {
            console.error('Failed to refresh user profile:', e);
        }
    };

    const updateUser = (updated: Partial<User>) => {
        setUser(prev => {
            if (!prev) return null;
            const merged = { ...prev, ...updated };
            setStoredItem('encalm_user', JSON.stringify(merged));
            return merged;
        });
    };

    // Initialize from session/local storage to persist login across refreshes & tabs
    useEffect(() => {
        const storedUser = getStoredItem('encalm_user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser && typeof parsedUser.role === 'string') {
                    parsedUser.role = parsedUser.role.toUpperCase();
                    if (parsedUser.role === 'ADMIN') parsedUser.role = 'HR_ADMIN';
                }
                setUser(parsedUser);
                listenToForegroundMessages();
                // Also refresh latest from server in background
                refreshUser();
            } catch (e) {
                console.error("Error parsing stored user:", e);
            }
        }
        setIsLoading(false);

        const handleAuthUpdate = () => {
            refreshUser();
        };
        window.addEventListener('auth_user_updated', handleAuthUpdate);
        return () => window.removeEventListener('auth_user_updated', handleAuthUpdate);
    }, []);

    const login = async (email: string, password: string, rememberMe: boolean = false) => {
        try {
            setError(null);
            setIsLoading(true);

            const res = await api.post('/auth/login', { email, password });
            const data = res.data;

            const { token, refreshToken, user: userData } = data;

            if (userData && typeof userData.role === 'string') {
                userData.role = userData.role.toUpperCase();
                if (userData.role === 'ADMIN') userData.role = 'HR_ADMIN';
            }

            setUser(userData);

            const storage = rememberMe ? localStorage : sessionStorage;

            if (rememberMe) {
                localStorage.setItem('encalm_remember_me', 'true');
                // Clear any leftover tab session keys so they don't conflict
                sessionStorage.removeItem('encalm_user');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('refreshToken');
                sessionStorage.removeItem('tenantId');
                sessionStorage.removeItem('superadmin_token');
                sessionStorage.removeItem('superadmin_user');
            } else {
                localStorage.removeItem('encalm_remember_me');
                localStorage.removeItem('encalm_user');
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('tenantId');
                localStorage.removeItem('superadmin_token');
                localStorage.removeItem('superadmin_user');
            }

            storage.setItem('encalm_user', JSON.stringify(userData));
            storage.setItem('token', token);

            if (userData?.role === 'SUPER_ADMIN') {
                storage.setItem('superadmin_token', token);
                if (refreshToken) {
                    storage.setItem('superadmin_refresh_token', refreshToken);
                }
                storage.setItem('superadmin_user', JSON.stringify(userData));
                window.dispatchEvent(new Event('superadmin-login'));
            } else {
                if (refreshToken) {
                    storage.setItem('refreshToken', refreshToken);
                }
                if (userData?.tenantId) {
                    storage.setItem('tenantId', userData.tenantId);
                }

                // ✅ Get FCM token from browser
                try {
                    const fcmToken = await requestFcmToken();
                    if (fcmToken) {
                        await api.post("/push-notification/save-token", {
                            fcmToken,
                        });
                    }
                    listenToForegroundMessages();
                } catch (fcmErr) {
                    console.log("FCM registration skipped or failed:", fcmErr);
                }
            }

            return userData;
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "Login failed");
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        const refreshToken =
            getStoredItem('refreshToken') ||
            sessionStorage.getItem('refreshToken') ||
            localStorage.getItem('refreshToken');

        // Clear state & storage immediately so isAuthenticated is instantly false
        setUser(null);
        removeStoredItem('encalm_user');
        removeStoredItem('token');
        removeStoredItem('refreshToken');
        removeStoredItem('tenantId');
        removeStoredItem('superadmin_token');
        removeStoredItem('superadmin_user');
        localStorage.removeItem('encalm_remember_me');

        // Revoke the refresh token on the server/database
        if (refreshToken) {
            try {
                await api.post('/auth/logout', { refreshToken });
            } catch (err) {
                console.warn('Server-side logout revocation failed:', err);
            }
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isLoading,
            login,
            logout,
            refreshUser,
            updateUser,
            error
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
