import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    LayoutDashboard, Users, UsersRound, LogOut, ChevronLeft,
    ChevronRight, AlertCircle, ChevronDown, CalendarCheck,
    Fingerprint, UserCog, FileCheck, BarChart3, Settings2,
    CheckSquare, UserCircle, CalendarRange
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import vedaLogo from '../assets/veda-logo.png';
import { useNavigate, useLocation } from 'react-router-dom';

interface MenuItem {
    icon: any;
    label: string;
    path: string;
    module: string;
    children?: { label: string; path: string; module: string; icon?: any; state?: any }[];
}

const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', module: 'DASHBOARD' },
    { icon: Fingerprint, label: 'My Attendance', path: '/attendance', module: 'ATTENDANCE' },
    {
        icon: UserCog,
        label: 'Employee',
        path: '/employee',
        module: 'EMPLOYEE',
        children: [
            { label: 'List', path: '/employee', module: 'EMPLOYEE', icon: Users },
            { label: 'Attendance', path: '/employee-attendance', module: 'EMPLOYEE_ATTENDANCE', icon: CalendarCheck },
            { label: 'Leave Approval', path: '/leave', module: 'LEAVE', icon: FileCheck, state: { activeTab: 'APPROVALS' } },
            { label: 'Regularizations', path: '/regularizations', module: 'EMPLOYEE_ATTENDANCE', icon: CheckSquare },
        ]
    },
    { icon: UsersRound, label: 'Team', path: '/team', module: 'TEAM' },
    { icon: CalendarRange, label: 'Leave', path: '/leave', module: 'LEAVE' },
    { icon: BarChart3, label: 'Reports', path: '/reports', module: 'REPORTS' },
    { icon: Settings2, label: 'Masters', path: '/masters', module: 'MASTERS' },
    { icon: CheckSquare, label: 'Task', path: '/task', module: 'TASK' },
    { icon: UserCircle, label: 'My Profile', path: '/profile', module: 'MY_PROFILE' },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
    const { user } = useAuth();
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [openMenus, setOpenMenus] = useState<string[]>([]); // Start with all menus closed

    let userModules = user?.accessibleModules || [];

    if (userModules.length === 0 && user?.role === 'HR_ADMIN') {
        userModules = ['DASHBOARD', 'ATTENDANCE', 'EMPLOYEE', 'TEAM', 'LEAVE', 'REPORTS', 'MASTERS', 'TASK', 'MY_PROFILE'];
    } else if (userModules.length === 0) {
        userModules = ['DASHBOARD', 'ATTENDANCE', 'LEAVE', 'MY_PROFILE'];
    }

    const toggleMenu = (label: string) => {
        setOpenMenus(prev =>
            prev.includes(label) ? prev.filter(m => m !== label) : [...prev, label]
        );
    };

    const isActive = (path: string, state?: any) => {
        const pathMatches = location.pathname === path || (path !== '/' && path !== '/dashboard' && location.pathname.startsWith(path + '/'));
        if (!pathMatches) return false;

        // If a specific state is required for this menu item
        if (state && state.activeTab) {
            return location.state?.activeTab === state.activeTab;
        }

        // If the current route has a specific activeTab state, the base path item (no state) should not be active
        if (location.state?.activeTab && !state) {
            return false;
        }

        return true;
    };

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
                    <button
                        onClick={onToggleCollapse}
                        className="hidden md:flex absolute -right-3 top-7 w-6 h-6 bg-brand-500 rounded-full items-center justify-center text-white shadow-md hover:bg-brand-600 transition-colors z-50"
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {menuItems.filter(item => {
                        if (item.module === 'EMPLOYEE_ATTENDANCE') {
                            return user?.role === 'HR_ADMIN';
                        }
                        return userModules.includes(item.module);
                    }).map((item) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const isOpen = openMenus.includes(item.label);
                        const active = isActive(item.path) || (item.children?.some(child => isActive(child.path, child.state)) ?? false);

                        return (
                            <div key={item.label} className="space-y-1">
                                <button
                                    onClick={() => {
                                        if (hasChildren && !isCollapsed) {
                                            toggleMenu(item.label);
                                        } else {
                                            navigate(item.path);
                                            if (window.innerWidth < 768) onClose();
                                        }
                                    }}
                                    title={isCollapsed ? item.label : ''}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active && !hasChildren
                                        ? 'bg-brand-500 shadow-lg shadow-brand-900/20 text-white'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                        } ${isCollapsed ? 'justify-center' : ''}`}
                                >
                                    <item.icon size={20} className={`flex-shrink-0 ${(active && !hasChildren) ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                                    {!isCollapsed && (
                                        <>
                                            <span className="font-medium text-sm whitespace-nowrap flex-1 text-left">{item.label}</span>
                                            {hasChildren && (
                                                <ChevronDown
                                                    size={16}
                                                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                                />
                                            )}
                                        </>
                                    )}
                                </button>

                                {hasChildren && isOpen && !isCollapsed && (
                                    <div className="space-y-1 ml-4 border-l border-white/10 pl-2 animate-fade-in">
                                        {item.children?.filter(child => {
                                            if (child.module === 'EMPLOYEE_ATTENDANCE') return user?.role === 'HR_ADMIN';
                                            return userModules.includes(child.module);
                                        }).map((child) => {
                                            const childActive = isActive(child.path, child.state);
                                            const ChildIcon = child.icon || item.icon;

                                            return (
                                                <button
                                                    key={child.label}
                                                    onClick={() => {
                                                        navigate(child.path, { state: child.state });
                                                        if (window.innerWidth < 768) onClose();
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${childActive
                                                        ? 'bg-white/10 text-white'
                                                        : 'text-gray-500 hover:bg-white/5 hover:text-white'
                                                        }`}
                                                >
                                                    <ChildIcon size={16} className={childActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-white'} />
                                                    <span className="text-xs font-medium whitespace-nowrap">{child.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
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
