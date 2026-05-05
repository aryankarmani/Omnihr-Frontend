import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

// Define available roles
export type UserRole = 'HR_ADMIN' | 'EMPLOYEE' | 'MANAGER';

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

    // Initialize from local storage to persist login across refreshes
    useEffect(() => {
        const storedUser = localStorage.getItem('encalm_user');
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

            const { token, user: userData } = data;

            setUser(userData);
            localStorage.setItem('encalm_user', JSON.stringify(userData));
            localStorage.setItem('token', token);
        } catch (err: any) {
            setError(err.message || 'Login failed');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('encalm_user');
        localStorage.removeItem('token');
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
