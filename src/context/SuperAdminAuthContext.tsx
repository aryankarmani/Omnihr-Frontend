import React, { createContext, useContext, useState, useEffect } from "react";
import { superAdminApi } from "../utils/superAdminApi";

interface SuperAdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  forcePasswordChange?: boolean;
}

interface SuperAdminAuthContextType {
  admin: SuperAdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: () => Promise<void>;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextType | undefined>(undefined);

export const SuperAdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<SuperAdminUser | null>(null);
  const [token, setToken] = useState<string | null>(sessionStorage.getItem("superadmin_token"));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      const response = await superAdminApi.get("/auth/profile");
      setAdmin(response.data.superAdmin);
    } catch (error) {
      sessionStorage.removeItem("superadmin_token");
      sessionStorage.removeItem("superadmin_user");
      setToken(null);
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = sessionStorage.getItem("superadmin_token");
    if (savedToken) {
      setToken(savedToken);
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await superAdminApi.post("/auth/login", { email, password });
    const { token: receivedToken, superAdmin } = response.data;

    sessionStorage.setItem("superadmin_token", receivedToken);
    sessionStorage.setItem("superadmin_user", JSON.stringify(superAdmin));

    setToken(receivedToken);
    setAdmin(superAdmin);
  };

  const logout = () => {
    sessionStorage.removeItem("superadmin_token");
    sessionStorage.removeItem("superadmin_user");
    setToken(null);
    setAdmin(null);
    window.location.href = "/superadmin/login";
  };

  return (
    <SuperAdminAuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!token && !!admin,
        isLoading,
        login,
        logout,
        updateProfile: fetchProfile,
      }}
    >
      {children}
    </SuperAdminAuthContext.Provider>
  );
};

export const useSuperAdminAuth = () => {
  const context = useContext(SuperAdminAuthContext);
  if (!context) {
    throw new Error("useSuperAdminAuth must be used within a SuperAdminAuthProvider");
  }
  return context;
};
