import { Search, Bell, Moon, Sun, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import api from '../utils/api';

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
        } catch (e) {
            console.log(e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

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
                    <div className="hidden md:block p-2 bg-white dark:bg-white/5 rounded-xl shadow-sm hover:shadow-md cursor-pointer text-brand-500 dark:text-brand-300 transition-all">
                        <Search size={20} />
                    </div>
                    <div
                        onClick={() => {
                            setShowNotifications(true);
                            fetchNotifications();
                        }}
                        className="p-2 bg-white dark:bg-white/5 rounded-xl shadow-sm hover:shadow-md cursor-pointer text-brand-500 dark:text-brand-300 transition-all relative"
                    >
                        <Bell size={20} />
                        {notifications.length > 0 && (
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
                        <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-gray-200 ml-2">
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
                        <div className="absolute right-4 top-16 w-[350px] max-h-[500px] bg-white dark:bg-brand-900 rounded-2xl shadow-2xl p-4 z-20 pointer-events-auto">

                            <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
                                Notifications
                            </h2>

                            <div className="space-y-3 overflow-y-auto max-h-[350px]">

                                {loading ? (
                                    <p className="text-center text-gray-500">Loading...</p>
                                ) : notifications.length === 0 ? (
                                    <p className="text-center text-gray-500">No notifications</p>
                                ) : (
                                    notifications.map((n: any) => (
                                        <div
                                            key={n.id}
                                            onClick={async () => {
                                                await api.patch(`/notifications/${n.id}/read`);
                                                fetchNotifications();
                                            }}
                                            className="p-3 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 cursor-pointer"
                                        >
                                            <p className="text-sm font-medium text-gray-800 dark:text-white">
                                                {n.title}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {n.time}
                                            </p>
                                        </div>
                                    ))
                                )}

                            </div>

                        </div>
                    </div>,
                    document.body
                )
            }
        </>

    );
}
