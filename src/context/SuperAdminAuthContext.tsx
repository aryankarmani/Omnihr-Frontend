import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
  syncSession: () => void;
}

const SuperAdminAuthContext = createContext<SuperAdminAuthContextType | undefined>(undefined);

export const SuperAdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<SuperAdminUser | null>(() => {
    const saved = sessionStorage.getItem("superadmin_user") || sessionStorage.getItem("encalm_user");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(
    () => sessionStorage.getItem("superadmin_token") || sessionStorage.getItem("token")
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async () => {
    const currentToken = sessionStorage.getItem("superadmin_token") || sessionStorage.getItem("token");
    if (!currentToken) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await superAdminApi.get("/auth/profile");
      if (response.data?.superAdmin) {
        setAdmin(response.data.superAdmin);
        sessionStorage.setItem("superadmin_user", JSON.stringify(response.data.superAdmin));
      }
    } catch (error) {
      console.warn("Could not fetch superadmin profile:", error);
      // If profile fails, check if we still have a valid superadmin session
      const savedUser = sessionStorage.getItem("superadmin_user") || sessionStorage.getItem("encalm_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.role === "SUPER_ADMIN") {
            setAdmin(parsed);
          } else {
            setAdmin(null);
            setToken(null);
          }
        } catch {
          setAdmin(null);
          setToken(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncSession = useCallback(() => {
    const savedToken = sessionStorage.getItem("superadmin_token") || sessionStorage.getItem("token");
    const savedUser = sessionStorage.getItem("superadmin_user") || sessionStorage.getItem("encalm_user");
    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.role === "SUPER_ADMIN") {
            setAdmin(parsed);
          }
        } catch {}
      }
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    const savedToken = sessionStorage.getItem("superadmin_token") || sessionStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      fetchProfile();
    } else {
      setIsLoading(false);
    }

    const handleLoginEvent = () => {
      syncSession();
    };

    window.addEventListener("superadmin-login", handleLoginEvent);
    return () => window.removeEventListener("superadmin-login", handleLoginEvent);
  }, [fetchProfile, syncSession]);

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
    sessionStorage.removeItem("encalm_user");
    sessionStorage.removeItem("token");
    setToken(null);
    setAdmin(null);
    window.location.href = "/signin";
  };

  return (
    <SuperAdminAuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!token && !!admin && (admin.role === "SUPER_ADMIN" || admin.role === "super_admin"),
        isLoading,
        login,
        logout,
        updateProfile: fetchProfile,
        syncSession,
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
