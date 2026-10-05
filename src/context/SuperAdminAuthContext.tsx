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
    const saved =
      sessionStorage.getItem("superadmin_user") ||
      localStorage.getItem("superadmin_user");
    try {
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return (parsed?.role === "SUPER_ADMIN" || parsed?.role === "super_admin") ? parsed : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(
    () =>
      sessionStorage.getItem("superadmin_token") ||
      localStorage.getItem("superadmin_token")
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async () => {
    const currentToken =
      sessionStorage.getItem("superadmin_token") ||
      localStorage.getItem("superadmin_token");
    if (!currentToken) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await superAdminApi.get("/auth/profile");
      if (response.data?.superAdmin) {
        setAdmin(response.data.superAdmin);
        if (localStorage.getItem("encalm_remember_me") === "true") {
          localStorage.setItem("superadmin_user", JSON.stringify(response.data.superAdmin));
        } else {
          sessionStorage.setItem("superadmin_user", JSON.stringify(response.data.superAdmin));
        }
      }
    } catch (error) {
      console.warn("Could not fetch superadmin profile:", error);
      const savedUser =
        sessionStorage.getItem("superadmin_user") ||
        localStorage.getItem("superadmin_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.role === "SUPER_ADMIN" || parsed?.role === "super_admin") {
            setAdmin(parsed);
          } else {
            setAdmin(null);
            setToken(null);
          }
        } catch {
          setAdmin(null);
          setToken(null);
        }
      } else {
        setAdmin(null);
        setToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncSession = useCallback(() => {
    const savedToken = sessionStorage.getItem("superadmin_token");
    const savedUser = sessionStorage.getItem("superadmin_user");
    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed?.role === "SUPER_ADMIN" || parsed?.role === "super_admin") {
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
    const savedToken = sessionStorage.getItem("superadmin_token");
    if (savedToken) {
      setToken(savedToken);
      fetchProfile();
    } else {
      setIsLoading(false);
    }

    const handleLoginEvent = () => {
      syncSession();
    };

    const handleSessionExpired = () => {
      setToken(null);
      setAdmin(null);
    };

    window.addEventListener("superadmin-login", handleLoginEvent);
    window.addEventListener("superadmin-session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("superadmin-login", handleLoginEvent);
      window.removeEventListener("superadmin-session-expired", handleSessionExpired);
    };
  }, [fetchProfile, syncSession]);

  const login = async (email: string, password: string) => {
    const response = await superAdminApi.post("/auth/login", { email, password });
    const { token: receivedToken, refreshToken: receivedRefreshToken, superAdmin } = response.data;

    sessionStorage.setItem("superadmin_token", receivedToken);
    if (receivedRefreshToken) {
      sessionStorage.setItem("superadmin_refresh_token", receivedRefreshToken);
    }
    sessionStorage.setItem("superadmin_user", JSON.stringify(superAdmin));

    setToken(receivedToken);
    setAdmin(superAdmin);
  };

  const logout = () => {
    sessionStorage.removeItem("superadmin_token");
    sessionStorage.removeItem("superadmin_refresh_token");
    sessionStorage.removeItem("superadmin_user");
    sessionStorage.removeItem("encalm_user");
    sessionStorage.removeItem("token");
    localStorage.removeItem("superadmin_token");
    localStorage.removeItem("superadmin_refresh_token");
    localStorage.removeItem("superadmin_user");
    localStorage.removeItem("encalm_user");
    localStorage.removeItem("token");
    localStorage.removeItem("encalm_remember_me");
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
