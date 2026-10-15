import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    Search, Bell, Menu, User, LayoutGrid, Calendar, Users, FileText, Settings,
    Sun, Moon, MessageSquare, CheckCheck, PhoneIncoming, AlertCircle, Sparkles, Volume2, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import api, { getMediaUrl } from '../utils/api';
import { getNotificationRedirectUrl } from '../utils/notificationNavigation';
import UserAvatar from './common/UserAvatar';

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'chat' | 'hr'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [employees, setEmployees] = useState<any[]>([]);
    const { user, updateUser, hasPermission } = useAuth();
    const [userAvatar, setUserAvatar] = useState<string | null>(user?.avatar || (user as any)?.profilePicture || null);
    const [avatarError, setAvatarError] = useState(false);

    const {
        notifications,
        unreadCount,
        desktopPermission,
        requestPermission,
        testDesktopNotification,
        bannerDismissed,
        dismissBanner,
        markAsRead,
        markAllAsRead,
        fetchNotifications
    } = useNotifications();

    useEffect(() => {
        const currentAvatar = user?.avatar || (user as any)?.profilePicture || null;
        setUserAvatar(currentAvatar);
        setAvatarError(false);
    }, [user?.avatar, (user as any)?.profilePicture]);

    const avatarUrl = userAvatar && typeof userAvatar === 'string' && !userAvatar.startsWith('bg-')
        ? getMediaUrl(userAvatar)
        : null;

    const fetchEmployees = async () => {
        if (!hasPermission('EMPLOYEE_VIEW')) return;
        try {
            const res = await api.get('/employee');
            setEmployees(res.data);
        } catch (e) {
            console.log(e);
        }
    };

    useEffect(() => {
        fetchNotifications(true);
        if (hasPermission('EMPLOYEE_VIEW')) {
            fetchEmployees();
        }
    }, []);



    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: <LayoutGrid size={16} />, module: 'DASHBOARD' },
        { name: 'Attendance', path: '/attendance', icon: <Calendar size={16} />, module: 'ATTENDANCE' },
        { name: 'Leave', path: '/leave', icon: <FileText size={16} />, module: 'LEAVE', state: { activeTab: 'MY_LEAVE' } },
        { name: 'My Profile', path: '/profile', icon: <User size={16} />, module: 'MY_PROFILE' },
        { name: 'Team', path: '/team', icon: <Users size={16} />, module: 'TEAM' },
        { name: 'Chat', path: '/chat', icon: <MessageSquare size={16} />, module: 'CHAT' },
        { name: 'Reports', path: '/reports', icon: <FileText size={16} />, module: 'REPORTS' },
        { name: 'Masters', path: '/masters', icon: <Settings size={16} />, module: 'MASTERS' },
        { name: 'Organization Master', path: '/masters/org', icon: <Settings size={16} />, module: 'MASTERS' },
        { name: 'Statutory Master', path: '/masters/statutory', icon: <Settings size={16} />, module: 'MASTERS' },
        { name: 'Attendance Master', path: '/masters/attendance', icon: <Settings size={16} />, module: 'MASTERS' },
        { name: 'Access Master', path: '/masters/access', icon: <Settings size={16} />, module: 'MASTERS' },
        { name: 'Employee List', path: '/employee', icon: <Users size={16} />, module: 'EMPLOYEE' },
        { name: 'Total Employees', path: '/employee', icon: <Users size={16} />, module: 'EMPLOYEE' },
        { name: 'On Leave Today', path: '/leave-today', icon: <Calendar size={16} />, module: 'EMPLOYEE' },
        { name: 'New Joiners', path: '/new-joiners', icon: <Users size={16} />, module: 'EMPLOYEE' },
        { name: 'Employee Attendance', path: '/employee-attendance', icon: <Calendar size={16} />, module: 'EMPLOYEE_ATTENDANCE' },
        { name: 'Leave Approval', path: '/leave', icon: <FileText size={16} />, module: 'EMPLOYEE', state: { activeTab: 'APPROVALS' } },
    ];


    const adminDefaultModules = ['DASHBOARD', 'ATTENDANCE', 'EMPLOYEE', 'EMPLOYEE_ATTENDANCE', 'TEAM', 'CHAT', 'LEAVE', 'REPORTS', 'MASTERS', 'LOG', 'MY_PROFILE'];
    const employeeDefaultModules = ['DASHBOARD', 'ATTENDANCE', 'LEAVE', 'MY_PROFILE', 'CHAT'];
    const hasCustomModules = Array.isArray(user?.accessibleModules) && user.accessibleModules.length > 0;

    let userModules: string[] = hasCustomModules
        ? [...user!.accessibleModules!]
        : (user?.role === 'HR_ADMIN' || (user?.role as string) === 'ADMIN' ? adminDefaultModules : employeeDefaultModules);

    if (userModules.includes('TASK') && !userModules.includes('LOG')) userModules.push('LOG');
    if (userModules.includes('LOG') && !userModules.includes('TASK')) userModules.push('TASK');

    const sortResults = (results: any[], query: string) => {
        const q = query.toLowerCase();
        return results.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            if (aName === q) return -1;
            if (bName === q) return 1;
            if (aName.startsWith(q) && !bName.startsWith(q)) return -1;
            if (!aName.startsWith(q) && bName.startsWith(q)) return 1;
            return aName.localeCompare(bName);
        });
    };

    const filteredEmployees = searchQuery.trim() === '' ? [] : sortResults(
        employees.filter(emp => {
            // Permission check: Only Admins can search other employees
            if (user?.role !== 'HR_ADMIN' && emp.id !== user?.id) return false;
            return emp.name.toLowerCase().includes(searchQuery.toLowerCase());
        }),
        searchQuery
    ).slice(0, 5);

    const chatNotifs = notifications.filter(n =>
        n.type === 'chat' || n.type === 'call' ||
        n.title?.toLowerCase().includes('message') ||
        n.title?.toLowerCase().includes('call') ||
        n.message?.toLowerCase().includes('call')
    );
    const hrNotifs = notifications.filter(n =>
        n.type !== 'chat' && n.type !== 'call' &&
        !n.title?.toLowerCase().includes('message') &&
        !n.title?.toLowerCase().includes('call')
    );

    // Filter nav items: Only show items the user has access to
    const filteredNav = searchQuery.trim() === '' ? [] : sortResults(
        navItems.filter(item => {
            const isHrAdmin = user?.role === 'HR_ADMIN';

            // Explicitly block Admin-only modules for non-admins
            const adminModules = ['EMPLOYEE', 'EMPLOYEE_ATTENDANCE', 'MASTERS', 'REPORTS', 'TEAM'];
            if (adminModules.includes(item.module) && !isHrAdmin) return false;

            if (item.module === 'MY_PROFILE' && !isHrAdmin && !hasPermission('MY_PROFILE_VIEW')) return false;

            // Fallback module check
            if (!userModules.includes(item.module)) return false;
            if (item.module === 'CHAT' && user?.hasChatAccess === false) return false;

            return item.name.toLowerCase().includes(searchQuery.toLowerCase());
        }),
        searchQuery
    );

    return (
        <>
            <header className="h-16 bg-white dark:bg-[#12151C] border-b border-[#E2E6ED] dark:border-gray-800 flex items-center px-3 sm:px-6 py-3">
                <div className="w-full flex items-center justify-between gap-2">
                    {/* Left: Search input */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <button
                            onClick={onMenuClick}
                            className="md:hidden p-2 text-[#5B6472] dark:text-gray-300 hover:bg-[#EEF1F5] dark:hover:bg-white/5 rounded-[6px] shrink-0"
                        >
                            <Menu size={20} />
                        </button>

                        <div className="relative w-full max-w-[200px] sm:max-w-[280px] md:max-w-[340px] group">
                            <div className="relative flex items-center search">
                                <Search size={15} className="absolute left-3 text-[#9AA3B1] group-focus-within:text-[#2C4FD6] transition-colors" />
                                <input
                                    type="text"
                                    placeholder={user?.role === 'HR_ADMIN' ? "Search for employees or pages..." : "Search for pages..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-[9px] h-[36px] bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] transition-all text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                                />
                            </div>

                            {/* Search Results Dropdown */}
                            {searchQuery.trim() !== '' && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#12151C] rounded-[6px] shadow-xl border border-[#E2E6ED] dark:border-gray-800 overflow-hidden z-[9999] animate-fade-in-up">
                                    <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {filteredNav.length > 0 && (
                                            <div className="mb-2">
                                                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#9AA3B1] ml-3 py-1.5">Pages</h3>
                                                {filteredNav.map(item => (
                                                    <button
                                                        key={item.name}
                                                        onClick={() => { navigate(item.path, { state: (item as any).state }); setSearchQuery(''); }}
                                                        className="w-full flex items-center gap-3 p-2 rounded-[6px] hover:bg-[#E8ECFC] transition-all text-left group/item"
                                                    >
                                                        <div className="p-1.5 bg-[#EEF1F5] dark:bg-white/5 rounded-[6px] text-[#5B6472] group-hover/item:text-[#2C4FD6]">
                                                            {item.icon}
                                                        </div>
                                                        <span className="text-xs font-semibold text-[#12151C] dark:text-gray-200 truncate flex-1">{item.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {filteredEmployees.length > 0 && (
                                            <div>
                                                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#9AA3B1] ml-3 py-1.5">Employees</h3>
                                                {filteredEmployees.map(emp => (
                                                    <button
                                                        key={emp.id}
                                                        onClick={() => { navigate(`/employee/${emp.id}`); setSearchQuery(''); }}
                                                        className="w-full flex items-center gap-3 p-2 rounded-[6px] hover:bg-[#E8ECFC] transition-all text-left group/item"
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            <UserAvatar
                                                                src={emp.avatar || emp.employeeProfile?.avatar}
                                                                name={emp.name}
                                                                size="xs"
                                                            />
                                                            <span className="text-xs font-semibold text-[#12151C] dark:text-white truncate flex-1">{emp.name}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {filteredNav.length === 0 && filteredEmployees.length === 0 && (
                                            <div className="p-6 text-center">
                                                <p className="text-xs text-[#9AA3B1] italic">No results found for "{searchQuery}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Theme Toggle, Notification Bell & User Profile */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* <button
                            type="button"
                            onClick={toggleTheme}
                            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            className="p-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] hover:bg-[#F7F8FA] dark:hover:bg-white/5 cursor-pointer text-[#5B6472] dark:text-gray-300 transition-all flex items-center justify-center"
                        >
                            {theme === 'dark' ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
                        </button> */}

                        <div
                            onClick={() => {
                                setShowNotifications(true);
                                fetchNotifications(true);
                            }}
                            className="p-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] hover:bg-[#F7F8FA] dark:hover:bg-white/5 cursor-pointer text-[#5B6472] dark:text-gray-300 transition-all relative flex items-center justify-center"
                            title="Notifications"
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-[#2C4FD6] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </div>

                        {user && (
                            <div
                                onClick={() => navigate('/profile')}
                                className="flex items-center gap-2.5 pl-2 cursor-pointer hover:opacity-85 transition-opacity"
                            >
                                <UserAvatar
                                    src={userAvatar || user.avatar || (user as any).profilePicture || (user as any).employeeProfile?.avatar}
                                    name={user.name}
                                    size="sm"
                                />
                                <div className="user-name text-left hidden md:block">
                                    <p className="text-[13.5px] font-semibold text-[#12151C] dark:text-gray-100 leading-tight capitalize">{user.name}</p>
                                    <p className="text-[11px] text-[#9AA3B1] leading-tight">
                                        {user.role === 'HR_ADMIN' || (user.role as string) === 'ADMIN'
                                            ? 'Admin'
                                            : user.role === 'EMPLOYEE'
                                                ? 'Employee'
                                                : user.role?.toLowerCase().replace('_', ' ') || 'User'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            {showNotifications &&
                createPortal(
                    <div className="fixed inset-0 z-[999999]">

                        {/* Overlay */}
                        <div
                            className="absolute inset-0 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md animate-fade-in z-10"
                            onClick={() => setShowNotifications(false)}
                        />

                        {/* Notification Panel */}
                        <div className="absolute right-3 sm:right-6 top-16 w-[calc(100vw-1.5rem)] sm:w-[420px] max-h-[85vh] sm:max-h-[620px] bg-white dark:bg-[#12151C] rounded-[10px] shadow-2xl border border-[#E2E6ED] dark:border-gray-800 p-4 sm:p-5 z-20 pointer-events-auto flex flex-col animate-scale-in">

                            {/* Panel Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-[#E2E6ED] dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Notifications
                                    </h2>
                                    {unreadCount > 0 && (
                                        <span className="px-2 py-0.5 bg-[#2C4FD6]/10 text-[#2C4FD6] text-[11px] font-black rounded-full">
                                            {unreadCount} NEW
                                        </span>
                                    )}
                                </div>
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => markAllAsRead()}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-[#2C4FD6] hover:text-blue-700 dark:text-blue-400 transition-colors cursor-pointer"
                                    >
                                        <CheckCheck size={14} />
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            {/* Windows Desktop Notification Banner */}
                            {desktopPermission === 'default' && !bannerDismissed && (
                                <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/40 rounded-[8px] flex items-start gap-3 relative">
                                    <div className="w-8 h-8 rounded-full bg-[#2C4FD6] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                        <Bell size={15} />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-6">
                                        <p className="text-xs font-bold text-gray-900 dark:text-white">Windows Desktop Alerts</p>
                                        <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 leading-snug">
                                            Get instant notifications for chat messages and incoming calls even when minimized.
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                type="button"
                                                onClick={requestPermission}
                                                className="px-3 py-1 bg-[#2C4FD6] hover:bg-blue-700 text-white text-xs font-semibold rounded-[5px] transition-colors shadow-sm cursor-pointer"
                                            >
                                                Enable Desktop Alerts
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={dismissBanner}
                                        title="Dismiss banner"
                                        className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 cursor-pointer"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {desktopPermission === 'granted' && !bannerDismissed && (
                                <div className="mt-2.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-[6px] flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400">
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Windows desktop notifications active
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={testDesktopNotification}
                                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded cursor-pointer transition-colors shadow-xs"
                                            title="Click to test Windows desktop notification"
                                        >
                                            Test Alert
                                        </button>
                                        <button
                                            type="button"
                                            onClick={dismissBanner}
                                            className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 p-0.5 cursor-pointer"
                                            title="Close banner"
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {desktopPermission === 'denied' && !bannerDismissed && (
                                <div className="mt-2.5 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-[8px] flex items-start gap-2.5 text-[11px] relative">
                                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0 pr-6">
                                        <p className="font-bold text-amber-900 dark:text-amber-200 text-xs">Desktop Alerts Blocked</p>
                                        <p className="text-amber-700 dark:text-amber-300 mt-0.5 leading-snug">
                                            Click the 🔒 lock icon beside the URL in your browser address bar and change Notifications to "Allow" to receive Windows desktop alerts.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={testDesktopNotification}
                                            className="mt-2 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[10px] rounded cursor-pointer transition-colors"
                                        >
                                            Check / Retry
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={dismissBanner}
                                        title="Dismiss"
                                        className="absolute top-2.5 right-2.5 text-amber-500 hover:text-amber-700 p-1 cursor-pointer"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Category Filter Tabs */}
                            <div className="flex items-center gap-1 mt-3 mb-2 p-1 bg-[#F4F6F9] dark:bg-white/5 rounded-[6px] text-xs">
                                <button
                                    type="button"
                                    onClick={() => setNotifFilter('all')}
                                    className={`flex-1 py-1 rounded-[5px] font-semibold transition-all text-center ${notifFilter === 'all'
                                        ? 'bg-white dark:bg-gray-800 text-[#2C4FD6] shadow-xs'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    All ({notifications.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNotifFilter('unread')}
                                    className={`flex-1 py-1 rounded-[5px] font-semibold transition-all text-center ${notifFilter === 'unread'
                                        ? 'bg-white dark:bg-gray-800 text-[#2C4FD6] shadow-xs'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    Unread ({unreadCount})
                                </button>
                                {user?.hasChatAccess !== false && (
                                    <button
                                        type="button"
                                        onClick={() => setNotifFilter('chat')}
                                        className={`flex-1 py-1 rounded-[5px] font-semibold transition-all text-center ${notifFilter === 'chat'
                                            ? 'bg-white dark:bg-gray-800 text-[#2C4FD6] shadow-xs'
                                            : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                    >
                                        Chat & Calls ({chatNotifs.length})
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setNotifFilter('hr')}
                                    className={`flex-1 py-1 rounded-[5px] font-semibold transition-all text-center ${notifFilter === 'hr'
                                        ? 'bg-white dark:bg-gray-800 text-[#2C4FD6] shadow-xs'
                                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    HR ({hrNotifs.length})
                                </button>
                            </div>

                            <div className="space-y-2 overflow-y-auto flex-1 custom-scrollbar pr-1 mt-1">
                                {(() => {
                                    const filtered = notifications.filter(n => {
                                        if (notifFilter === 'unread') return n.unread;
                                        const isChat = n.type === 'chat' || n.type === 'call' ||
                                            n.title?.toLowerCase().includes('message') ||
                                            n.title?.toLowerCase().includes('call') ||
                                            n.message?.toLowerCase().includes('call');
                                        if (notifFilter === 'chat') return isChat;
                                        if (notifFilter === 'hr') return !isChat;
                                        return true;
                                    });

                                    if (filtered.length === 0) {
                                        return (
                                            <div className="text-center py-10">
                                                <div className="w-14 h-14 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                                                    <Bell size={22} />
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300 font-bold text-sm">All caught up!</p>
                                                <p className="text-xs text-gray-400 mt-1">No notifications under this filter.</p>
                                            </div>
                                        );
                                    }

                                    return filtered.map((n: any) => {
                                        const isChat = n.type === 'chat' || n.title?.toLowerCase().includes('message');
                                        const isCall = n.type === 'call' || n.title?.toLowerCase().includes('call');
                                        const isLeave = n.type === 'leave' || n.title?.toLowerCase().includes('leave');
                                        const isAttendance = n.type === 'attendance' || n.title?.toLowerCase().includes('attendance');

                                        return (
                                            <div
                                                key={n.id}
                                                onClick={async () => {
                                                    await markAsRead(n.id);
                                                    setShowNotifications(false);
                                                    const targetUrl = getNotificationRedirectUrl(n);
                                                    if (targetUrl) {
                                                        navigate(targetUrl);
                                                    }
                                                }}
                                                className={`group relative p-3 rounded-[8px] border transition-all cursor-pointer ${n.unread
                                                    ? 'bg-blue-50/60 dark:bg-[#2C4FD6]/10 border-blue-200/80 dark:border-[#2C4FD6]/30 shadow-xs'
                                                    : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.07]'
                                                    }`}
                                            >
                                                <div className="flex gap-3">
                                                    <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 ${
                                                        isCall ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' :
                                                        isChat ? 'bg-blue-100 text-[#2C4FD6] dark:bg-blue-500/20 dark:text-blue-400' :
                                                        isLeave ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' :
                                                        isAttendance ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' :
                                                        'bg-[#EEF1F5] text-[#5B6472] dark:bg-white/10 dark:text-gray-300'
                                                    }`}>
                                                        {isCall ? <PhoneIncoming size={18} /> :
                                                         isChat ? <MessageSquare size={18} /> :
                                                         isLeave ? <FileText size={18} /> :
                                                         isAttendance ? <Calendar size={18} /> :
                                                         <Bell size={18} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                                            <h3 className={`text-xs font-bold truncate min-w-0 ${n.unread ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                                {n.title}
                                                            </h3>
                                                            <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap shrink-0">{n.time || n.date || ''}</span>
                                                        </div>
                                                        <p className={`text-xs leading-relaxed break-words line-clamp-2 ${n.unread ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                                            {n.message || n.title}
                                                        </p>
                                                    </div>
                                                </div>
                                                {n.unread && (
                                                    <div className="absolute top-2 right-2 w-2 h-2 bg-[#2C4FD6] rounded-full shadow-[0_0_6px_rgba(44,79,214,0.6)]"></div>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                        </div>
                    </div>,
                    document.body
                )
            }
        </>

    );
}
