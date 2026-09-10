import React from "react";
import { Menu, Sun, Moon, Shield, Search, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useSuperAdminAuth } from "../../context/SuperAdminAuthContext";

interface SuperAdminHeaderProps {
  onMenuClick: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const SuperAdminHeader: React.FC<SuperAdminHeaderProps> = ({
  onMenuClick,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { admin } = useSuperAdminAuth();

  return (
    <header className="h-16 bg-white dark:bg-[#12151C] border-b border-[#E2E6ED] dark:border-gray-800 flex items-center px-3 sm:px-6 py-3 shrink-0">
      <div className="w-full flex items-center justify-between gap-3">
        {/* Left Side: Mobile Menu & Collapse Toggle & Title */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 text-[#5B6472] dark:text-gray-300 hover:bg-[#EEF1F5] dark:hover:bg-white/5 rounded-[6px] shrink-0"
            title="Open navigation menu"
          >
            <Menu size={20} />
          </button>

          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-2 text-[#5B6472] dark:text-gray-400 hover:bg-[#EEF1F5] dark:hover:bg-white/5 rounded-[6px] shrink-0 transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[14px] font-semibold text-[#12151C] dark:text-white truncate">
              Super Admin Console
            </span>
            <span className="hidden sm:inline-block text-[#9AA3B1] text-xs">/</span>
            <span className="hidden sm:inline-block text-xs font-medium text-[#5B6472] dark:text-gray-400">
              SaaS Business Management
            </span>
          </div>
        </div>

        {/* Right Side: Theme Toggle & Admin Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dark / Light Toggle */}
          <button
            onClick={toggleTheme}
            title="Toggle theme"
            className="p-2 text-[#5B6472] dark:text-gray-400 hover:bg-[#EEF1F5] dark:hover:bg-white/5 rounded-[6px] transition-colors cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun size={18} className="text-amber-400" />
            ) : (
              <Moon size={18} className="text-[#5B6472]" />
            )}
          </button>

          {/* Super Admin Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#E8ECFC] dark:bg-white/5 border border-[#2C4FD6]/20">
            <Shield size={15} className="text-[#2C4FD6]" />
            <span className="text-xs font-semibold text-[#2C4FD6] dark:text-white">
              {admin?.email || "superadmin@encalm.com"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
