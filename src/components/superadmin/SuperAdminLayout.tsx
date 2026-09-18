import React, { useState } from "react";
import { SuperAdminSidebar } from "./SuperAdminSidebar";
import { SuperAdminHeader } from "./SuperAdminHeader";

export const SuperAdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('omnihr_superadmin_sidebar_collapsed') === 'true';
  });

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('omnihr_superadmin_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-[#F7F8FA] dark:bg-[#12151C] overflow-hidden text-[#12151C] dark:text-white transition-colors duration-300 font-sans">
      {/* Sidebar matching exact OmniHR design and animations */}
      <SuperAdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        <SuperAdminHeader
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />

        {/* 100% Full Width container matching website */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 pb-6 w-full flex flex-col justify-between">
          <div className="w-full flex-1">
            {children}
          </div>

          {/* Footer with BlockCoders reference */}
          <footer className="mt-8 pt-4 border-t border-gray-200/60 dark:border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400 dark:text-gray-500 font-medium">
            <span>© {new Date().getFullYear()} OmniHR Super Admin.</span>
            <span>
              Developed &amp; Operated by{' '}
              <a
                href="https://theblockcoders.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 dark:text-gray-300 font-semibold hover:text-[#2C4FD6] dark:hover:text-[#2C4FD6] underline underline-offset-2 transition-colors cursor-pointer"
              >
                BlockCoders
              </a>
              . All rights reserved.
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
};
