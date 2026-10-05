import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocketServerUrl = (): string => {
    const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
    if (envUrl && !envUrl.includes('localhost')) {
        return envUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    }
    return import.meta.env.DEV ? 'http://localhost:3001' : 'https://omnihr-backend-19fx.onrender.com';
};

export const getSocket = (): Socket | null => {
    return socket;
};

export const initSocketClient = (): Socket => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const serverUrl = getSocketServerUrl();

    if (socket && socket.connected) {
        return socket;
    }

    if (socket) {
        socket.disconnect();
    }

    socket = io(serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        autoConnect: true,
    });

    socket.on('connect', () => {
        console.log('[Socket] Connected to server, ID:', socket?.id);
    });

    socket.on('connect_error', (err) => {
        console.warn('[Socket] Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
    });

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
