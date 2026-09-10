import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    LayoutDashboard, Users, UsersRound, LogOut,
    AlertCircle, ChevronDown,
    Fingerprint, UserCog, FileCheck, BarChart3, Settings2,
    CheckSquare, UserCircle, CalendarRange, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

import { getMyManagerAccess } from '../utils/teamApi';

interface MenuItem {
    icon: any;
    label: string;
    path: string;
    module: string;
    state?: any;
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
            { label: 'Leave Approval', path: '/leave', module: 'LEAVE', icon: FileCheck, state: { activeTab: 'APPROVALS' } },
            // { label: 'Regularizations', path: '/regularizations', module: 'EMPLOYEE_ATTENDANCE', icon: CheckSquare },
        ]
    },
    { icon: UsersRound, label: 'Team', path: '/team', module: 'TEAM' },
    { icon: CalendarRange, label: 'Leave', path: '/leave', module: 'LEAVE', state: { activeTab: 'MY_LEAVE' } },
    { icon: BarChart3, label: 'Reports', path: '/reports', module: 'REPORTS' },
    { icon: Settings2, label: 'Masters', path: '/masters', module: 'MASTERS' },
    { icon: CheckSquare, label: 'Task', path: '/task', module: 'TASK' },
    { icon: FileText, label: 'Log', path: '/log-file', module: 'TASK' },
    { icon: UserCircle, label: 'My Profile', path: '/profile', module: 'MY_PROFILE' },

];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse: _onToggleCollapse }: SidebarProps) {
    const { user } = useAuth();
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [openMenus, setOpenMenus] = useState<string[]>([]); // Start with all menus closed
    // ✅ ADDED: manager status comes from Team.managerId
    const [managerAccess, setManagerAccess] = useState({
        isTeamManager: false,
        access: {
            list: false,
            attendance: false,
            leaveApproval: false,
            regularization: false,
        },
    });

    // ✅ CHANGED: do not check user.role === 'MANAGER'
    useEffect(() => {
        const fetchManagerAccess = async () => {
            if (!user?.id) return;

            try {
                const res = await getMyManagerAccess();

                setManagerAccess({
                    isTeamManager: !!res.data?.isTeamManager,
                    access: {
                        list: !!res.data?.access?.list,
                        attendance: !!res.data?.access?.attendance,
                        leaveApproval: !!res.data?.access?.leaveApproval,
                        regularization: !!res.data?.access?.regularization,
                    },
                });
            } catch (e) {
                console.error("Failed to load manager access", e);
                setManagerAccess({
                    isTeamManager: false,
                    access: {
                        list: false,
                        attendance: false,
                        leaveApproval: false,
                        regularization: false,
                    },
                });
            }
        };

        fetchManagerAccess();
    }, [user?.id]);

    let userModules = user?.accessibleModules || [];

    const employeeDefaultModules = [
        'DASHBOARD',
        'ATTENDANCE',
        'LEAVE',
        'MY_PROFILE',
    ];

    const adminDefaultModules = [
        'DASHBOARD',
        'ATTENDANCE',
        'EMPLOYEE',
        'TEAM',
        'LEAVE',
        'REPORTS',
        'MASTERS',
        'TASK',
        'MY_PROFILE',
    ];


    if (user?.role === 'HR_ADMIN') {
        userModules = userModules.length > 0
            ? Array.from(new Set([...adminDefaultModules, ...userModules]))
            : adminDefaultModules;
    } else {
        const baseModules = [...employeeDefaultModules];
        // ✅ ADDED: if employee is team manager, add only allowed team modules
        if (managerAccess.isTeamManager) {
            if (managerAccess.access.list) baseModules.push('EMPLOYEE');
            if (managerAccess.access.attendance || managerAccess.access.regularization) {
                baseModules.push('EMPLOYEE_ATTENDANCE');
            }
            if (managerAccess.access.leaveApproval) baseModules.push('EMPLOYEE');
        }

        userModules = Array.from(new Set([...baseModules, ...userModules]));
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
                ${isCollapsed ? 'w-20' : 'w-60'}
                bg-[#EEF2F8] dark:bg-[#12151C] border-r border-[#E2E6ED] dark:border-gray-800 min-h-screen text-[#12151C] dark:text-white flex flex-col font-sans 
                transition-all duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                md:translate-x-0
            `}>
                <div className={`p-5 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="w-8 h-8 bg-[#2C4FD6] rounded-[6px] flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0">
                        O
                    </div>
                    {!isCollapsed && <span className="word text-[16px] font-semibold tracking-[-0.01em] text-[#12151C] dark:text-white">OmniHR</span>}
                </div>

                <nav className="flex-1 px-3 space-y-1 mt-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {menuItems.filter(item => {
                        if (item.module === 'EMPLOYEE_ATTENDANCE') {
                            return user?.role === 'HR_ADMIN' ||
                                (managerAccess.isTeamManager &&
                                    (managerAccess.access.attendance || managerAccess.access.regularization));
                        }
                        return userModules.includes(item.module);
                    }).map((item) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const isOpen = openMenus.includes(item.label);
                        const active = isActive(item.path, item.state) || (item.children?.some(child => isActive(child.path, child.state)) ?? false);

                        return (
                            <div key={item.label} className="space-y-1">
                                <button
                                    onClick={() => {
                                        if (hasChildren && !isCollapsed) {
                                            toggleMenu(item.label);
                                        } else {
                                            navigate(item.path, { state: (item as any).state });
                                            if (window.innerWidth < 768) onClose();
                                        }
                                    }}
                                    title={isCollapsed ? item.label : ''}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[6px] transition-all duration-200 ease-in-out group ${active && !hasChildren
                                        ? 'bg-[#E8ECFC] text-[#2C4FD6] font-semibold border-l-[3.5px] border-[#2C4FD6]'
                                        : 'text-[#5B6472] hover:bg-white/80 hover:text-[#2C4FD6] font-medium'
                                        } ${isCollapsed ? 'justify-center' : ''}`}
                                >
                                    <item.icon size={18} className={`flex-shrink-0 transition-colors duration-200 ${(active && !hasChildren) ? 'text-[#2C4FD6]' : 'text-[#5B6472] group-hover:text-[#2C4FD6]'}`} />
                                    {!isCollapsed && (
                                        <>
                                            <span className="text-sm whitespace-nowrap flex-1 text-left">{item.label}</span>
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
                                    <div className="space-y-1 ml-4 border-l border-[#E2E6ED] dark:border-gray-800 pl-2 animate-fade-in">
                                        {item.children?.filter(child => {
                                            if (user?.role === 'HR_ADMIN') return true;
                                            if (managerAccess.isTeamManager) {
                                                if (child.label === 'List') return !!managerAccess.access.list;
                                                if (child.label === 'Attendance') return !!managerAccess.access.attendance;
                                                if (child.label === 'Leave Approval') return !!managerAccess.access.leaveApproval;
                                                if (child.label === 'Regularizations') return !!managerAccess.access.regularization;
                                            }
                                            if (child.module === 'EMPLOYEE_ATTENDANCE') return false;
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
                                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-[6px] transition-all duration-150 group ${childActive
                                                        ? 'bg-[#E8ECFC] text-[#2C4FD6] font-semibold'
                                                        : 'text-[#5B6472] hover:bg-[#EEF1F5] hover:text-[#12151C] font-medium'
                                                        }`}
                                                >
                                                    <ChildIcon size={16} className={childActive ? 'text-[#2C4FD6]' : 'text-[#5B6472] group-hover:text-[#12151C]'} />
                                                    <span className="text-xs whitespace-nowrap">{child.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-[#E2E6ED] dark:border-gray-800">
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        title={isCollapsed ? 'Logout' : ''}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-[#5B6472] hover:bg-[#FBE7E7] hover:text-[#C13A3A] font-medium transition-all ${isCollapsed ? 'justify-center' : ''}`}
                    >
                        <LogOut size={18} className="flex-shrink-0" />
                        {!isCollapsed && <span className="text-sm whitespace-nowrap">Logout</span>}
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
                    <div className="relative bg-white dark:bg-brand-950 w-full max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-[6px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden animate-scale-in">
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
                                    className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-[6px] transition-all shadow-lg shadow-red-600/20 active:scale-95"
                                >
                                    Yes, Logout
                                </button>
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="w-full py-3.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-bold rounded-[6px] hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-95"
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
