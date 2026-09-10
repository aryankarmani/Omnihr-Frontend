import React from "react";
import { Navigate } from "react-router-dom";
import { useSuperAdminAuth } from "../../context/SuperAdminAuthContext";
import { SuperAdminLayout } from "./SuperAdminLayout";

export const SuperAdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useSuperAdminAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0B0D13]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500 dark:text-gray-400">Verifying Super Admin session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/superadmin/login" replace />;
  }

  return <SuperAdminLayout>{children}</SuperAdminLayout>;
};
