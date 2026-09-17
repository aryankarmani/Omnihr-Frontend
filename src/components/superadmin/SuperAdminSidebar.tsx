import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  CreditCard,
  Layers,
  BellRing,
  Settings,
  PhoneCall,
  LogOut,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useSuperAdminAuth } from "../../context/SuperAdminAuthContext";

interface SuperAdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { logout, admin } = useSuperAdminAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { label: "Dashboard", path: "/superadmin/dashboard", icon: LayoutDashboard },
    { label: "Customers", path: "/superadmin/companies", icon: Building2 },
    { label: "Subscriptions", path: "/superadmin/subscriptions", icon: CalendarCheck },
    { label: "Payments", path: "/superadmin/payments", icon: CreditCard },
    { label: "Plans", path: "/superadmin/plans", icon: Layers },
    { label: "Demo Requests", path: "/superadmin/demo-requests", icon: PhoneCall },
    { label: "Notifications", path: "/superadmin/notifications", icon: BellRing },
    { label: "Settings", path: "/superadmin/settings", icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === "/superadmin/dashboard") {
      return location.pathname === "/superadmin/dashboard" || location.pathname === "/superadmin";
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <>
      {/* Mobile Backdrop with smooth opacity transition */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar matching OmniHR layout & animations */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          ${isCollapsed ? "w-20" : "w-60"}
          bg-[#EEF2F8] dark:bg-[#12151C] border-r border-[#E2E6ED] dark:border-gray-800 min-h-screen text-[#12151C] dark:text-white flex flex-col font-sans 
          transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"} 
          md:translate-x-0
        `}
      >
        {/* Logo Section */}
        <div className={`p-5 flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 bg-[#2C4FD6] rounded-[6px] flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
            O
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[16px] font-semibold tracking-[-0.01em] text-[#12151C] dark:text-white">
                OmniHR
              </span>
              <span className="text-[10px] font-semibold text-[#2C4FD6] uppercase tracking-wider -mt-0.5">
                Super Admin
              </span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 mt-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                onClick={() => {
                  navigate(item.path);
                  if (window.innerWidth < 768) onClose();
                }}
                title={isCollapsed ? item.label : ""}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[6px] transition-all duration-200 ease-in-out group cursor-pointer ${
                  active
                    ? "bg-[#E8ECFC] text-[#2C4FD6] font-semibold border-l-[3.5px] border-[#2C4FD6]"
                    : "text-[#5B6472] dark:text-gray-400 hover:bg-white/80 dark:hover:bg-white/5 hover:text-[#2C4FD6] font-medium"
                } ${isCollapsed ? "justify-center" : ""}`}
              >
                <Icon
                  size={18}
                  className={`shrink-0 transition-colors duration-200 ${
                    active ? "text-[#2C4FD6]" : "text-[#5B6472] dark:text-gray-400 group-hover:text-[#2C4FD6]"
                  }`}
                />
                {!isCollapsed && (
                  <span className="text-sm whitespace-nowrap flex-1 text-left">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer: User profile & Collapse Toggle */}
        <div className="p-3 border-t border-[#E2E6ED] dark:border-gray-800 shrink-0 space-y-2">
          {/* Admin Profile Box */}
          <div
            className={`p-2.5 rounded-[6px] bg-white/70 dark:bg-white/5 flex items-center ${
              isCollapsed ? "justify-center" : "justify-between"
            }`}
          >
            {!isCollapsed && (
              <div className="min-w-0 pr-2">
                <p className="text-[13px] font-semibold text-[#12151C] dark:text-white truncate">
                  {admin?.name || "Platform Owner"}
                </p>
                <p className="text-[11px] text-[#5B6472] dark:text-gray-400 truncate font-mono">
                  {admin?.email || "superadmin@encalm.com"}
                </p>
              </div>
            )}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Sign Out"
              className="p-1.5 text-[#5B6472] hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 rounded-[6px] transition-colors cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-md animate-fade-in"
              onClick={() => setShowLogoutConfirm(false)}
            />

            {/* Modal Content */}
            <div className="relative bg-white dark:bg-[#161B26] w-full max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-[6px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden animate-scale-in">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle size={32} />
                </div>

                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  Confirm Logout
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
                  Are you sure you want to log out of Super Admin? You will need to sign in again to access the console.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      logout();
                      navigate("/superadmin/login");
                    }}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-[6px] transition-all shadow-lg shadow-red-600/20 active:scale-95 cursor-pointer"
                  >
                    Yes, Logout
                  </button>
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="w-full py-3.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-bold rounded-[6px] hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                  >
                    Keep me logged in
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
