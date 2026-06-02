import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Moon, Sun, Menu, User, LayoutGrid, Calendar, Users, FileText, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [notifications, setNotifications] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();

    const fetchNotifications = async () => {
        setLoading(true);
        try {
             const res = await api.get('/notifications');
        setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
        console.error('Failed to fetch notifications:', e);
        setNotifications([]);
    } finally {
        setLoading(false);
    }
};
    const fetchEmployees = async () => {
        try {
            const res = await api.get('/employee');
            setEmployees(res.data);
        } catch (e) {
            console.log(e);
        }
    };
useEffect(() => {
    fetchNotifications();
    fetchEmployees();

    const interval = setInterval(() => {
        fetchNotifications();
    }, 3000);

    return () => clearInterval(interval);
}, []);
    

    
    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: <LayoutGrid size={16} />, module: 'DASHBOARD' },
        { name: 'Attendance', path: '/attendance', icon: <Calendar size={16} />, module: 'ATTENDANCE' },
        { name: 'Leave', path: '/leave', icon: <FileText size={16} />, module: 'LEAVE', state: { activeTab: 'MY_LEAVE' } },
        { name: 'My Profile', path: '/profile', icon: <User size={16} />, module: 'MY_PROFILE' },
        { name: 'Team', path: '/team', icon: <Users size={16} />, module: 'TEAM' },
        { name: 'Reports', path: '/reports', icon: <FileText size={16} />, module: 'REPORTS' },
        { name: 'Masters', path: '/masters', icon: <Settings size={16} />, module: 'MASTERS' },
        { name: 'Organization Master', path: '/masters/org', icon: <Settings size={16} />, module: 'MASTERS' },
        { name: 'Statutory Master', path: '/masters/statutory', icon: <Settings size={16} />, module: 'MASTERS' },
        { name: 'Attendance Master', path: '/masters/attendance', icon: <Settings size={16} />, module: 'MASTERS' },
        { name: 'Access Master', path: '/masters/access', icon: <Settings size={16} />, module: 'MASTERS' },
        { name: 'Employee List', path: '/employee', icon: <Users size={16} />, module: 'EMPLOYEE' },
        { name: 'Total Headcount', path: '/employee', icon: <Users size={16} />, module: 'EMPLOYEE' },
        { name: 'On Leave Today', path: '/leave-today', icon: <Calendar size={16} />, module: 'EMPLOYEE' },
        { name: 'New Joiners', path: '/new-joiners', icon: <Users size={16} />, module: 'EMPLOYEE' },
        { name: 'Employee Attendance', path: '/employee-attendance', icon: <Calendar size={16} />, module: 'EMPLOYEE_ATTENDANCE' },
        { name: 'Leave Approval', path: '/leave', icon: <FileText size={16} />, module: 'EMPLOYEE', state: { activeTab: 'APPROVALS' } },
    ];

    
    let userModules = user?.accessibleModules || [];
    if (userModules.length === 0 && user?.role === 'HR_ADMIN') {
        userModules = ['DASHBOARD', 'ATTENDANCE', 'EMPLOYEE', 'EMPLOYEE_ATTENDANCE', 'TEAM', 'LEAVE', 'REPORTS', 'MASTERS', 'TASK', 'MY_PROFILE'];
    } else if (userModules.length === 0) {
        userModules = ['DASHBOARD', 'ATTENDANCE', 'LEAVE', 'MY_PROFILE'];
    }

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

    // Filter nav items: Only show items the user has access to
    const filteredNav = searchQuery.trim() === '' ? [] : sortResults(
        navItems.filter(item => {
            const isHrAdmin = user?.role === 'HR_ADMIN';
            
            // Explicitly block Admin-only modules for non-admins
            const adminModules = ['EMPLOYEE', 'EMPLOYEE_ATTENDANCE', 'MASTERS', 'REPORTS', 'TEAM'];
            if (adminModules.includes(item.module) && !isHrAdmin) return false;
            
            // Fallback module check
            if (!userModules.includes(item.module)) return false;
            
            return item.name.toLowerCase().includes(searchQuery.toLowerCase());
        }),
        searchQuery
    );

    return (
        <>
            <header className="h-16 bg-transparent flex items-center justify-between px-4 md:px-8 py-4 mb-4 md:mb-8">
                <div className="flex items-center gap-4">
                    {/* Mobile Menu Button */}
                    <button
                        onClick={onMenuClick}
                        className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg"
                    >
                        <Menu size={24} />
                    </button>
                </div>
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="hidden md:block relative w-64 lg:w-96 group">
                        <div className="relative flex items-center">
                            <Search size={18} className="absolute left-3 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={user?.role === 'HR_ADMIN' ? "Search for employees or pages..." : "Search for pages..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl shadow-sm focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-sm text-gray-800 dark:text-white"
                            />
                        </div>

                        {/* Search Results Dropdown */}
                        {searchQuery.trim() !== '' && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-brand-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-[9999] animate-fade-in-up">
                                <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                                    {filteredNav.length > 0 && (
                                        <div className="mb-2">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-500 dark:text-brand-400 ml-3 py-2 opacity-70">Pages</h3>
                                            {filteredNav.map(item => (
                                                <button
                                                    key={item.name}
                                                    onClick={() => { navigate(item.path, { state: (item as any).state }); setSearchQuery(''); }}
                                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all text-left group/item"
                                                >
                                                    <div className="p-1.5 bg-gray-100 dark:bg-white/5 rounded-lg text-gray-400 group-hover/item:text-brand-500 transition-colors">
                                                        {item.icon}
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate flex-1">{item.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {filteredEmployees.length > 0 && (
                                        <div>
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-500 dark:text-brand-400 ml-3 py-2 opacity-70">Employees</h3>
                                            {filteredEmployees.map(emp => (
                                                <button
                                                    key={emp.id}
                                                    onClick={() => { navigate(`/employee/${emp.id}`); setSearchQuery(''); }}
                                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all text-left group/item"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                                            {emp.name.charAt(0)}
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-800 dark:text-white truncate flex-1">{emp.name}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {filteredNav.length === 0 && filteredEmployees.length === 0 && (
                                        <div className="p-8 text-center">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">No results found for "{searchQuery}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div
                        onClick={() => {
                            setShowNotifications(true);
                            fetchNotifications();
                        }}
                        className="p-2 bg-white dark:bg-white/5 rounded-xl shadow-sm hover:shadow-md cursor-pointer text-brand-500 dark:text-brand-300 transition-all relative"
                    >
                        <Bell size={20} />
                        {notifications.some((n: any) => n.unread) && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                        )}
                    </div>
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-2 px-3 md:px-4 py-2 bg-brand-100/50 hover:bg-brand-100 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white rounded-xl text-brand-700 font-medium text-sm transition-all"
                    >
                        {theme === 'dark' ? (
                            <><span className="hidden md:inline">Light mode</span> <Sun size={16} /></>
                        ) : (
                            <><span className="hidden md:inline">Night mode</span> <Moon size={16} /></>
                        )}
                    </button>

                    {user && (
                        <div 
                            onClick={() => navigate('/profile')}
                            className="flex items-center gap-3 pl-2 md:pl-4 border-l border-gray-200 ml-2 cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{user.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{user.role?.toLowerCase().replace('_', ' ') || 'User'}</p>
                            </div>
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white shadow-sm bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
                                {user.name.charAt(0)}
                            </div>
                        </div>
                    )}
                </div>
            </header>
            {showNotifications &&
                createPortal(
                    <div className="fixed inset-0 z-[999999]">

                        {/* Overlay */}
                        <div
                            className="absolute inset-0 bg-black/40 backdrop-blur-md z-10"
                            onClick={() => setShowNotifications(false)}
                        />

                        {/* Notification Panel */}
                        <div className="absolute right-4 top-16 w-[380px] max-h-[550px] bg-white dark:bg-brand-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 p-5 z-20 pointer-events-auto flex flex-col">

                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black text-gray-800 dark:text-white">
                                    Notifications
                                </h2>
                                {notifications.some((n: any) => n.unread) && (
                                    <span className="px-2.5 py-1 bg-brand-500 text-white text-[10px] font-black rounded-full">
                                        {notifications.filter((n: any) => n.unread).length} NEW
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar pr-1">

                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-sm text-gray-500 font-medium">Fetching updates...</p>
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
                                            <Bell size={24} />
                                        </div>
                                        <p className="text-gray-500 font-bold">All caught up!</p>
                                        <p className="text-xs text-gray-400 mt-1">No new notifications for you.</p>
                                    </div>
                                ) : (
                                    notifications.map((n: any) => (
                                        <div
                                            key={n.id}
                                           onClick={async () => {
    setNotifications(prev =>
        prev.map(item =>
            item.id === n.id
                ? { ...item, unread: false }
                : item
        )
    );


    try {
        await api.patch(`/notifications/${n.id}/read`);
    } catch (e) {}
}}

                                            className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
                                                n.unread 
                                                ? 'bg-brand-50/50 dark:bg-brand-500/10 border-brand-100 dark:border-brand-500/20' 
                                                : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 hover:border-brand-200 dark:hover:border-brand-500/20'
                                            }`}
                                        >
                                            <div className="flex gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                    n.type === 'leave' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' :
                                                    n.type === 'attendance' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' :
                                                    'bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400'
                                                }`}>
                                                    {n.type === 'leave' ? <FileText size={20} /> :
                                                     n.type === 'attendance' ? <Calendar size={20} /> :
                                                     <Bell size={20} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <h3 className={`text-sm font-bold truncate ${n.unread ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                            {n.title}
                                                        </h3>
                                                        <span className="text-[10px] text-gray-400 font-medium">{n.time}</span>
                                                    </div>
                                                    <p className={`text-xs leading-relaxed break-all ${n.unread ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        {n.message || n.title}
                                                    </p>
                                                </div>
                                            </div>
                                            {n.unread && (
                                                <div className="absolute top-4 right-4 w-2 h-2 bg-brand-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)]"></div>
                                            )}
                                        </div>
                                    ))
                                )}

                            </div>
                            
                            {notifications.length > 0 && (
                                <button 
                                    onClick={() => { navigate('/notifications'); setShowNotifications(false); }}
                                    className="w-full mt-4 py-3 text-xs font-black text-brand-500 hover:text-brand-600 dark:text-brand-400 transition-colors uppercase tracking-widest border-t border-gray-100 dark:border-white/5"
                                >
                                    View All Notifications
                                </button>
                            )}

                        </div>
                    </div>,
                    document.body
                )
            }
        </>

    );
}
