import { useEffect, useRef } from 'react';
import { getSocket, initSocketClient } from '../services/socket';

/**
 * Custom hook to subscribe to live WebSocket events and window focus events.
 * Automatically triggers callback whenever any of the events fire or when the tab gains focus.
 */
export const useRealtimeSync = (
    events: string | string[],
    callback: (data?: any) => void | Promise<void>,
    enabled: boolean = true
) => {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        if (!enabled) return;

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;

        const socket = getSocket() || initSocketClient();
        const eventList = Array.isArray(events) ? events : [events];

        const handleEvent = (data?: any) => {
            if (callbackRef.current) {
                callbackRef.current(data);
            }
        };

        eventList.forEach(event => {
            socket.on(event, handleEvent);
        });

        // Notification & Cross-Server Fallback:
        // When a Firebase push notification arrives or a socket notification arrives
        const handleNotificationFallback = (e: any) => {
            const detail = e?.detail || e;
            const text = (
                (detail?.notification?.title || '') + ' ' +
                (detail?.notification?.body || '') + ' ' +
                (detail?.title || '') + ' ' +
                (detail?.message || '') + ' ' +
                (detail?.type || '')
            ).toLowerCase();

            const shouldTrigger = eventList.some(ev => {
                if (ev === 'leave_updated') return text.includes('leave');
                if (ev === 'regularization_updated') return text.includes('regulariz') || text.includes('correction');
                if (ev === 'attendance_updated') return text.includes('attendance') || text.includes('punch') || text.includes('break');
                if (ev === 'onboarding_updated') return text.includes('onboard') || text.includes('invite');
                if (ev === 'employee_roster_updated') return text.includes('employee') || text.includes('team') || text.includes('roster');
                return true;
            });

            if (shouldTrigger && callbackRef.current) {
                callbackRef.current(detail);
            }
        };

        window.addEventListener('new-notification-received', handleNotificationFallback);
        socket.on('new_notification', handleNotificationFallback);

        const handleFocusOrVisible = () => {
            if (!document.hidden && callbackRef.current) {
                callbackRef.current();
            }
        };

        window.addEventListener('focus', handleFocusOrVisible);
        document.addEventListener('visibilitychange', handleFocusOrVisible);

        return () => {
            eventList.forEach(event => {
                socket.off(event, handleEvent);
            });
            window.removeEventListener('new-notification-received', handleNotificationFallback);
            socket.off('new_notification', handleNotificationFallback);
            window.removeEventListener('focus', handleFocusOrVisible);
            document.removeEventListener('visibilitychange', handleFocusOrVisible);
        };
    }, [JSON.stringify(events), enabled]);
};

