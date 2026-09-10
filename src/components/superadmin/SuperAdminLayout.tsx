import React, { useState } from "react";
import { SuperAdminSidebar } from "./SuperAdminSidebar";
import { SuperAdminHeader } from "./SuperAdminHeader";

export const SuperAdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-[#F7F8FA] dark:bg-[#12151C] overflow-hidden text-[#12151C] dark:text-white transition-colors duration-300 font-sans">
      {/* Sidebar matching exact OmniHR design and animations */}
      <SuperAdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        <SuperAdminHeader
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* 100% Full Width container matching website */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 pb-12 w-full">
          <div className="w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
