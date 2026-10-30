import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api from '../utils/api';
import { initSocketClient, getSocket } from '../services/socket';
import { useAuth } from './AuthContext';
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
    testDesktopNotification: () => void;
    bannerDismissed: boolean;
    dismissBanner: () => void;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    fetchNotifications: (silent?: boolean) => Promise<void>;
    resetChatUnread: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [chatUnreadCount, setChatUnreadCount] = useState<number>(0);
    const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | 'unsupported'>(
        getNotificationPermission()
    );
    const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
        return localStorage.getItem('omnihr_dismiss_desktop_banner') === 'true';
    });

    const knownIdsRef = useRef<Set<string>>(new Set());
    const isInitialLoadRef = useRef<boolean>(true);

    // Check permission whenever window focuses
    useEffect(() => {
        const updatePerm = () => setDesktopPermission(getNotificationPermission());
        window.addEventListener('focus', updatePerm);
        return () => window.removeEventListener('focus', updatePerm);
    }, []);

    // Sync unread count
    useEffect(() => {
        const count = notifications.filter(n => n.unread).length;
        setUnreadCount(count);
    }, [notifications]);

    // Fetch notifications from API with real-time detection & desktop alert triggering
    const fetchNotifications = useCallback(async (silent = false) => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!token) return;

            const res = await api.get('/notifications');
            if (Array.isArray(res.data)) {
                const formatted: NotificationItem[] = res.data.map((n: any) => ({
                    id: String(n.id || `notif-${Math.random()}`),
                    title: n.title || 'OmniHR Notification',
                    message: n.message || '',
                    type: n.type || 'system',
                    unread: !!n.unread,
                    link: n.link || null,
                    date: n.date || (n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Today'),
                    time: n.time || (n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'),
                    createdAt: n.createdAt,
                }));

                // If not initial load, trigger desktop notifications for newly arrived unread items
                if (!isInitialLoadRef.current) {
                    const newItems = formatted.filter(item => item.unread && !knownIdsRef.current.has(item.id));
                    newItems.forEach(newItem => {
                        showDesktopNotification({
                            title: newItem.title,
                            body: newItem.message,
                            link: newItem.link || undefined,
                            tag: `notif-${newItem.id}`,
                            onClick: () => {
                                window.focus();
                                if (newItem.link) window.location.href = newItem.link;
                            }
                        });
                    });
                } else {
                    isInitialLoadRef.current = false;
                }

                // Register all current items in knownIds
                formatted.forEach(n => knownIdsRef.current.add(n.id));

                setNotifications(formatted);
                const unread = formatted.filter(n => n.unread).length;
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
            playNotificationChime();
            showDesktopNotification({
                title: 'OmniHR Notifications Enabled',
                body: 'You will receive real-time alerts for chat messages, incoming calls, and updates.',
                tag: 'omnihr-welcome',
            });
        } else if (Notification.permission === 'denied') {
            toast.error('Desktop notifications are blocked in your browser. Click the lock icon in the URL bar to allow.', { id: 'desktop-notif-denied', duration: 6000 });
        }
        return granted;
    };

    // Instant test alert
    const testDesktopNotification = () => {
        playNotificationChime();
        const currentPerm = getNotificationPermission();
        setDesktopPermission(currentPerm);

        if (currentPerm === 'granted') {
            const n = showDesktopNotification({
                title: 'OmniHR Desktop Alert (Test)',
                body: 'Windows desktop notifications are active and working!',
                tag: `omnihr-test-${Date.now()}`,
                onClick: () => {
                    window.focus();
                }
            });
            if (n) {
                toast.success('Test notification sent to Windows Action Center!', { id: 'test-notif-success' });
            } else {
                toast.error('Could not display notification. Check Windows Focus Assist.', { id: 'test-notif-fail' });
            }
        } else if (currentPerm === 'denied') {
            toast.error('Notifications are blocked by your browser. Click the lock icon in your URL bar and change Notifications to "Allow".', {
                id: 'test-notif-blocked',
                duration: 7000
            });
        } else {
            handleRequestPermission();
        }
    };

    const dismissBanner = () => {
        setBannerDismissed(true);
        localStorage.setItem('omnihr_dismiss_desktop_banner', 'true');
    };

    const resetChatUnread = () => {
        setChatUnreadCount(0);
    };

    // Setup Socket listener for real-time notifications
    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token || !isAuthenticated) return;

        fetchNotifications(true);

        const socket = getSocket() || initSocketClient();

        // 1. Generic HR / System notifications
        const handleNewNotification = (data: any) => {
            const notifId = String(data.id || `notif-${Date.now()}`);
            knownIdsRef.current.add(notifId);

            const newItem: NotificationItem = {
                id: notifId,
                title: data.title || 'OmniHR Notification',
                message: data.message || '',
                type: data.type || 'system',
                unread: true,
                link: data.link || null,
                date: data.date || 'Today',
                time: data.time || 'Just now',
                createdAt: data.createdAt || new Date().toISOString(),
            };

            setNotifications(prev => [newItem, ...prev.filter(n => n.id !== notifId)]);
            setUnreadCount(prev => prev + 1);

            // Trigger Windows desktop notification
            showDesktopNotification({
                title: newItem.title,
                body: newItem.message,
                link: newItem.link || undefined,
                tag: `notif-${notifId}`,
                onClick: () => {
                    window.focus();
                    if (newItem.link) {
                        window.location.href = newItem.link;
                    }
                }
            });

            // If user is currently looking at the app, show a toast alert too
            if (!document.hidden) {
                toast((t) => (
                    <div
                        onClick={() => {
                            toast.dismiss(t.id);
                            if (newItem.link) window.location.href = newItem.link;
                        }}
                        className="cursor-pointer flex items-start gap-3 py-1"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                            HR
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900 leading-snug">{newItem.title}</p>
                            <p className="text-xs text-gray-500 truncate max-w-xs">{newItem.message}</p>
                        </div>
                    </div>
                ), { duration: 5000, position: 'top-right' });
            }
        };

        // 2. Real-time chat & message notifications (Teams-like)
        const handleChatNotification = (data: any) => {
            // Add to in-app notification center list so Chat & Calls tab shows it
            setNotifications(prev => [
                {
                    id: data.id || `chat-${Date.now()}`,
                    title: data.title || `${data.senderName || 'Someone'} (OmniHR Chat)`,
                    message: data.content || 'Sent a new message',
                    type: 'chat',
                    unread: true,
                    link: data.link || '/chat',
                    date: 'Just now',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
                ...prev.filter(n => n.id !== data.id)
            ]);

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
                const title = data.title || `${senderName}${channelContext} (OmniHR Chat)`;
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
            setNotifications(prev => [
                {
                    id: `call-${data.callId || Date.now()}`,
                    title: `Incoming ${data.callType || 'Voice'} Call`,
                    message: `${data.callerName || 'Colleague'} is calling you on OmniHR`,
                    type: 'call',
                    unread: true,
                    link: '/chat',
                    date: 'Just now',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
                ...prev
            ]);

            showDesktopNotification({
                title: `📞 Incoming Call from ${data.callerName || 'Colleague'}`,
                body: `Incoming ${data.callType || 'Voice'} Call on OmniHR. Click to answer.`,
                tag: 'incoming-call-alert',
                onClick: () => {
                    window.focus();
                }
            });
        };

        socket.on('new_notification', handleNewNotification);
        socket.on('chat_notification', handleChatNotification);
        socket.on('incoming_call', handleIncomingCall);

        return () => {
            socket.off('new_notification', handleNewNotification);
            socket.off('chat_notification', handleChatNotification);
            socket.off('incoming_call', handleIncomingCall);
        };
    }, [fetchNotifications, isAuthenticated, user?.id]);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                chatUnreadCount,
                desktopPermission,
                requestPermission: handleRequestPermission,
                testDesktopNotification,
                bannerDismissed,
                dismissBanner,
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
