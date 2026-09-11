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
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<User>;
    logout: () => void;
    error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize from session storage to persist login across refreshes
    useEffect(() => {
        const storedUser = sessionStorage.getItem('encalm_user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser && typeof parsedUser.role === 'string') {
                parsedUser.role = parsedUser.role.toUpperCase();
            }
            setUser(parsedUser);
            listenToForegroundMessages();
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        try {
            setError(null);
            setIsLoading(true);

            const res = await api.post('/auth/login', { email, password });
            const data = res.data;

            const { token, refreshToken, user: userData } = data;

            if (userData && typeof userData.role === 'string') {
                userData.role = userData.role.toUpperCase();
            }

            setUser(userData);
            sessionStorage.setItem('encalm_user', JSON.stringify(userData));
            sessionStorage.setItem('token', token);

            if (userData?.role === 'SUPER_ADMIN') {
                sessionStorage.setItem('superadmin_token', token);
                sessionStorage.setItem('superadmin_user', JSON.stringify(userData));
                window.dispatchEvent(new Event('superadmin-login'));
            } else {
                if (refreshToken) {
                    sessionStorage.setItem('refreshToken', refreshToken);
                }
                if (userData?.tenantId) {
                    sessionStorage.setItem('tenantId', userData.tenantId);
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
        try {
            // ✅ Remove FCM token from backend before clearing token
            await api.delete("/push-notification/remove-token");
        } catch (error) {
            console.log("Failed to remove FCM token:", error);
        }
        setUser(null);
        sessionStorage.removeItem('encalm_user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('tenantId');
        sessionStorage.removeItem('superadmin_token');
        sessionStorage.removeItem('superadmin_user');
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!user,
            isLoading,
            login,
            logout,
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
