/**
 * Desktop Notification Utility for OmniHR
 * Supports native Windows/macOS desktop notifications using the HTML5 Notification API,
 * with Web Audio API chime synthesis for cross-platform audio alerts.
 */

// Synthesize a gentle Teams-like two-tone notification chime using Web Audio API
export const playNotificationChime = () => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        const playTone = (freq: number, start: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

            gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
            gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + duration);
        };

        // Two-tone bell chime (587.33 Hz [D5] -> 880 Hz [A5])
        playTone(587.33, 0, 0.18);
        playTone(880.00, 0.12, 0.35);
    } catch (e) {
        // AudioContext may be restricted by browser autoplay policy until user interacts
    }
};

/**
 * Checks whether browser desktop notifications are supported.
 */
export const isDesktopNotificationSupported = (): boolean => {
    return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Gets the current notification permission state.
 */
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
    if (!isDesktopNotificationSupported()) return 'unsupported';
    return Notification.permission;
};

/**
 * Requests desktop notification permission from the user.
 */
export const requestDesktopPermission = async (): Promise<boolean> => {
    if (!isDesktopNotificationSupported()) {
        console.warn('[DesktopNotification] Notifications not supported in this browser');
        return false;
    }

    try {
        if (Notification.permission === 'granted') return true;

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    } catch (error) {
        console.error('[DesktopNotification] Failed to request permission:', error);
        return false;
    }
};

export interface DesktopNotificationOptions {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    link?: string;
    onClick?: () => void;
    silent?: boolean;
}

/**
 * Displays a native desktop notification on Windows/macOS.
 * Works even when the browser tab is minimized or in the background.
 */
export const showDesktopNotification = ({
    title,
    body,
    icon,
    tag,
    link,
    onClick,
    silent = false,
}: DesktopNotificationOptions): Notification | null => {
    if (!isDesktopNotificationSupported()) return null;
    if (Notification.permission !== 'granted') return null;

    if (!silent) {
        playNotificationChime();
    }

    try {
        // Standard icon: favicon or OmniHR logo
        const resolvedIcon = icon || '/favicon.ico';

        const options: any = {
            body,
            icon: resolvedIcon,
            badge: resolvedIcon,
            tag: tag || `omnihr-${Date.now()}`,
            renotify: true,
        };

        // If Service Worker is active, register notification through ServiceWorker for Windows Action Center background delivery
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(title, options);
            }).catch(() => {});
        }

        const notification = new Notification(title, options);

        notification.onclick = (e) => {
            e.preventDefault();
            try {
                window.focus();
            } catch (err) {}

            if (onClick) {
                onClick();
            } else if (link) {
                // Navigate within SPA or update URL
                window.focus();
                if (window.location.pathname !== link) {
                    window.location.href = link;
                }
            }

            notification.close();
        };

        // Auto-close notification after 8 seconds
        setTimeout(() => {
            try {
                notification.close();
            } catch (e) {}
        }, 8000);

        return notification;
    } catch (error) {
        console.error('[DesktopNotification] Display error:', error);
        return null;
    }
};
