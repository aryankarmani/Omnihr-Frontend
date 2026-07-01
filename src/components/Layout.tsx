import { useState,  useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ChatWidget from '../components/ChatWidget';

// ✅ Added for FCM push notification
import { registerFcmToken } from '../services/pushNotificationService';
import { listenToForegroundMessages } from '../firebase';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // ✅ Added: Register FCM token when user opens dashboard/layout
    useEffect(() => {
        registerFcmToken();
        listenToForegroundMessages();
    }, []);

    return (
        <div className="flex h-screen bg-brand-50 dark:bg-brand-950 overflow-hidden text-gray-900 dark:text-white transition-colors duration-300">
            {/* Sidebar with mobile state and collapse state */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            <main className="flex-1 flex flex-col overflow-hidden relative w-full">
                {/* Header with toggle callback */}
                <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

                <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8">
                    {children}
                </div>
                <ChatWidget />
            </main>
        </div>
    );
}
