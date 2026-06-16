import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

// Define available roles
export type UserRole = 'HR_ADMIN' | 'EMPLOYEE' ;

interface User {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    tenantId: string;
    token?: string;
    accessibleModules?: string[];
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
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
            setUser(JSON.parse(storedUser));
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

            setUser(userData);
            sessionStorage.setItem('encalm_user', JSON.stringify(userData));
            sessionStorage.setItem('token', token);
            if (refreshToken) {
                sessionStorage.setItem('refreshToken', refreshToken);
            }
            if (userData?.tenantId) {
                sessionStorage.setItem('tenantId', userData.tenantId);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Login failed');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        sessionStorage.removeItem('encalm_user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('tenantId');
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
