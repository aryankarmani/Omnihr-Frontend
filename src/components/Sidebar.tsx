import { useState } from 'react';
import { createPortal } from 'react-dom';
import { LayoutDashboard, Clock, Users, UsersRound, CalendarDays, FileText, Settings, ClipboardList, LogOut, ChevronLeft, ChevronRight, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import vedaLogo from '../assets/veda-logo.png';
import { useNavigate, useLocation } from 'react-router-dom';

interface MenuItem {
    icon: any;
    label: string;
    path: string;
    module: string; // Key for access control
    active?: boolean;
}

const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', module: 'DASHBOARD', active: true },
    { icon: Clock, label: 'Attendance', path: '/attendance', module: 'ATTENDANCE' },
    { icon: CalendarDays, label: 'Employee Attendance', path: '/employee-attendance', module: 'EMPLOYEE_ATTENDANCE' },
    { icon: Users, label: 'Employee', path: '/employee', module: 'EMPLOYEE' },
    { icon: UsersRound, label: 'Team', path: '/team', module: 'TEAM' },
    { icon: CalendarDays, label: 'Leave', path: '/leave', module: 'LEAVE' },
    { icon: FileText, label: 'Reports', path: '/reports', module: 'REPORTS' },
    { icon: Settings, label: 'Masters', path: '/masters', module: 'MASTERS' },
    { icon: ClipboardList, label: 'Task', path: '/task', module: 'TASK' },
    { icon: User, label: 'My Profile', path: '/profile', module: 'MY_PROFILE' },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
    const { user } = useAuth(); // Use user directly for accessibleModules
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Default to all access if no role defined (or handle as restricted)
    // For now, if accessibleModules is undefined, fallback to existing RBAC or allow all?
    // Let's assume login returns it. If empty, maybe stored in localStorage needs refresh.
    // Fallback logic
    let userModules = user?.accessibleModules || [];

    // If no modules defined (legacy user or not set) BUT user is HR_ADMIN, give full access
    // Or if simply no modules are returned, we might want to default to standard Employee modules?
    // For safety during migration: if HR_ADMIN and no modules, show all.
    if (userModules.length === 0 && user?.role === 'HR_ADMIN') {
        userModules = ['DASHBOARD', 'ATTENDANCE', 'EMPLOYEE', 'TEAM', 'LEAVE', 'REPORTS', 'MASTERS', 'TASK', 'MY_PROFILE'];
    } else if (userModules.length === 0) {
        // Default for others: personal access
        userModules = ['DASHBOARD', 'ATTENDANCE', 'LEAVE', 'MY_PROFILE'];
    }

    const handleLogout = () => {
        logout();
        navigate('/signin');
    };
    const isActive = (path: string) => {
        if (path === '/dashboard') return location.pathname === '/dashboard';
        return location.pathname === path || location.pathname.startsWith(path + '/');
    };

    // Overlay for mobile
    const Overlay = () => (
        <div
            className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            onClick={onClose}
        />
    );

    return (
        <>
            <Overlay />
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50
                ${isCollapsed ? 'w-20' : 'w-64'}
                bg-sidebar min-h-screen text-white flex flex-col font-sans 
                transition-all duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                md:translate-x-0
            `}>
                <div className={`p-4 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="w-12 h-12 flex items-center justify-center shrink-0 transition-all duration-300">
                        <img src={vedaLogo} alt="EnCalm HRX" className="w-full h-full object-contain" />
                    </div>
                    {!isCollapsed && <h1 className="text-xl font-bold tracking-wide whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-brand-700 to-brand-900 dark:from-white dark:to-brand-100">EnCalm HRX</h1>}
                    {/* Toggle Button (Desktop only) */}
                    <button
                        onClick={onToggleCollapse}
                        className="hidden md:flex absolute -right-3 top-7 w-6 h-6 bg-brand-500 rounded-full items-center justify-center text-white shadow-md hover:bg-brand-600 transition-colors z-50"
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto overflow-x-hidden">
                    {menuItems.filter(item => {
                        // Always show Dashboard
                        if (item.module === 'EMPLOYEE_ATTENDANCE') {
                            return user?.role === 'HR_ADMIN';
                        }
                        // Check access
                        return userModules.includes(item.module);
                    }).map((item) => {
                        const active = isActive(item.path);

                        return (
                            <button
                                key={item.label}
                                onClick={() => {
                                    navigate(item.path);
                                    if (window.innerWidth < 768) onClose();
                                }}
                                title={isCollapsed ? item.label : ''}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active
                                    ? 'bg-brand-500 shadow-lg shadow-brand-900/20 text-white'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    } ${isCollapsed ? 'justify-center' : ''}`}
                            >
                                <item.icon size={20} className={`flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                                {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        title={isCollapsed ? 'Logout' : ''}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <LogOut size={20} className="flex-shrink-0" />
                        {!isCollapsed && <span className="font-medium text-sm whitespace-nowrap">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* LOGOUT CONFIRMATION MODAL */}
            {showLogoutConfirm && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                        onClick={() => setShowLogoutConfirm(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-white dark:bg-brand-950 w-full max-w-sm rounded-[2rem] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden animate-scale-in">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertCircle size={32} />
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                                Confirm Logout
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
                                Are you sure you want to log out of your session? You will need to sign in again to access your dashboard.
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        logout();
                                        navigate('/signin');
                                    }}
                                    className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-600/20 active:scale-95"
                                >
                                    Yes, Logout
                                </button>
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="w-full py-3.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-95"
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
}
