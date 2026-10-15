import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { initSocketClient, getSocket } from '../services/socket';
import {
    isDesktopNotificationSupported,
    getNotificationPermission,
    requestDesktopPermission,
    showDesktopNotification,
    playNotificationChime
} from '../utils/desktopNotification';
import toast from 'react-hot-toast';

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: 'leave' | 'attendance' | 'system' | 'team' | 'employee' | 'chat' | 'call' | string;
    unread: boolean;
    link?: string | null;
    date?: string;
    time?: string;
    createdAt?: string;
}

interface NotificationContextType {
    notifications: NotificationItem[];
    unreadCount: number;
    chatUnreadCount: number;
    desktopPermission: NotificationPermission | 'unsupported';
    requestPermission: () => Promise<boolean>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    fetchNotifications: (silent?: boolean) => Promise<void>;
    resetChatUnread: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [chatUnreadCount, setChatUnreadCount] = useState<number>(0);
    const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | 'unsupported'>(
        getNotificationPermission()
    );

    // Sync unread count
    useEffect(() => {
        const count = notifications.filter(n => n.unread).length;
        setUnreadCount(count);
    }, [notifications]);

    // Fetch notifications from API
    const fetchNotifications = useCallback(async (silent = false) => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!token) return;

            const res = await api.get('/notifications');
            if (Array.isArray(res.data)) {
                setNotifications(res.data);
                const unread = res.data.filter((n: any) => n.unread).length;
                setUnreadCount(unread);
            }
        } catch (err) {
            if (!silent) console.error('[NotificationContext] Fetch error:', err);
        }
    }, []);

    // Mark single notification as read
    const markAsRead = async (id: string) => {
        setNotifications(prev =>
            prev.map(item => item.id === id ? { ...item, unread: false } : item)
        );
        try {
            await api.patch(`/notifications/${id}/read`);
        } catch (e) {
            console.error('[NotificationContext] Mark read error:', e);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(item => ({ ...item, unread: false })));
        setUnreadCount(0);
        try {
            await api.post('/notifications/read-all');
            toast.success('All notifications marked as read', { id: 'notif-read-all' });
        } catch (e) {
            console.error('[NotificationContext] Mark all read error:', e);
        }
    };

    // Request desktop notification permission
    const handleRequestPermission = async (): Promise<boolean> => {
        const granted = await requestDesktopPermission();
        setDesktopPermission(getNotificationPermission());
        if (granted) {
            toast.success('Windows desktop notifications enabled!', { id: 'desktop-notif-success' });
            showDesktopNotification({
                title: 'OmniHR Notifications Enabled',
                body: 'You will receive real-time alerts for chat messages, incoming calls, and updates.',
                tag: 'omnihr-welcome',
            });
        }
        return granted;
    };

    const resetChatUnread = () => {
        setChatUnreadCount(0);
    };

    // Setup Socket listener for real-time notifications
    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;

        fetchNotifications(true);

        const socket = getSocket() || initSocketClient();

        // 1. Generic HR / System notifications
        const handleNewNotification = (data: any) => {
            setNotifications(prev => [data, ...prev.filter(n => n.id !== data.id)]);
            setUnreadCount(prev => prev + 1);

            // Trigger Windows desktop notification
            showDesktopNotification({
                title: data.title || 'OmniHR Notification',
                body: data.message || '',
                link: data.link,
                tag: `notif-${data.id || Date.now()}`,
                onClick: () => {
                    if (data.link) {
                        window.location.href = data.link;
                    }
                }
            });

            // If user is currently looking at the app, show a toast alert too
            if (!document.hidden) {
                toast((t) => (
                    <div
                        onClick={() => {
                            toast.dismiss(t.id);
                            if (data.link) window.location.href = data.link;
                        }}
                        className="cursor-pointer flex items-start gap-3 py-1"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                            HR
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 leading-snug">{data.title}</p>
                            <p className="text-xs text-gray-500 truncate max-w-xs">{data.message}</p>
                        </div>
                    </div>
                ), { duration: 5000, position: 'top-right' });
            }
        };

        // 2. Real-time chat & message notifications (Teams-like)
        const handleChatNotification = (data: any) => {
            const currentPath = window.location.pathname;
            const currentSearch = window.location.search;
            const isLookingAtThisChat = currentPath.includes('/chat') &&
                ((data.conversationId && currentSearch.includes(`conv=${data.conversationId}`)) ||
                 (data.channelId && currentSearch.includes(`channel=${data.channelId}`)));

            // If in another tab, minimized, or viewing another section
            if (!isLookingAtThisChat || document.hidden) {
                setChatUnreadCount(prev => prev + 1);

                const senderName = data.senderName || 'Someone';
                const channelContext = data.channelName ? ` in #${data.channelName}` : '';
                const title = `${senderName}${channelContext} (OmniHR Chat)`;
                const body = data.content || 'Sent a new message';

                showDesktopNotification({
                    title,
                    body,
                    icon: data.senderAvatar || '/favicon.ico',
                    link: data.link || '/chat',
                    tag: `chat-${data.conversationId || data.channelId || 'msg'}`,
                    onClick: () => {
                        window.focus();
                        if (data.link) window.location.href = data.link;
                    }
                });

                // In-app alert if not on chat page
                if (!currentPath.includes('/chat') && !document.hidden) {
                    playNotificationChime();
                    toast((t) => (
                        <div
                            onClick={() => {
                                toast.dismiss(t.id);
                                if (data.link) window.location.href = data.link;
                            }}
                            className="cursor-pointer flex items-center gap-3 py-1"
                        >
                            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold text-sm">
                                {senderName[0]?.toUpperCase() || 'C'}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-gray-900 leading-snug">{title}</p>
                                <p className="text-xs text-gray-600 truncate max-w-xs">{body}</p>
                            </div>
                        </div>
                    ), { duration: 5000, position: 'top-right' });
                }
            }
        };

        // 3. Incoming Call notification
        const handleIncomingCall = (data: any) => {
            if (document.hidden) {
                showDesktopNotification({
                    title: `📞 Incoming Call from ${data.callerName || 'Colleague'}`,
                    body: `Incoming ${data.callType || 'Voice'} Call on OmniHR. Click to answer.`,
                    tag: 'incoming-call-alert',
                    onClick: () => {
                        window.focus();
                    }
                });
            }
        };

        socket.on('new_notification', handleNewNotification);
        socket.on('chat_notification', handleChatNotification);
        socket.on('incoming_call', handleIncomingCall);

        return () => {
            socket.off('new_notification', handleNewNotification);
            socket.off('chat_notification', handleChatNotification);
            socket.off('incoming_call', handleIncomingCall);
        };
    }, [fetchNotifications]);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                chatUnreadCount,
                desktopPermission,
                requestPermission: handleRequestPermission,
                markAsRead,
                markAllAsRead,
                fetchNotifications,
                resetChatUnread,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
export default NotificationContext;
