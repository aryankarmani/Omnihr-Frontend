import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ✅ Added for FCM push notification
import { registerFcmToken } from '../services/pushNotificationService';
import { listenToForegroundMessages } from '../firebase';

interface LayoutProps {
    children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    const { logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSuspended, setIsSuspended] = useState(false);
    const [suspendedMessage, setSuspendedMessage] = useState<string | null>(null);

    // ✅ Added: Register FCM token when user opens dashboard/layout
    useEffect(() => {
        registerFcmToken();
        listenToForegroundMessages();

        const handleSuspended = (e: any) => {
            setIsSuspended(true);
            if (e.detail?.message) setSuspendedMessage(e.detail.message);
        };
        window.addEventListener('subscription-suspended', handleSuspended);
        return () => window.removeEventListener('subscription-suspended', handleSuspended);
    }, []);

    if (isSuspended) {
        return (
            <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0B0D12] text-[#12151C] dark:text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-[#12151C] border border-rose-200 dark:border-rose-900/40 rounded-2xl p-8 text-center shadow-xl animate-fade-in">
                    <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-900/50">
                        <ShieldAlert size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-[#12151C] dark:text-white mb-2">
                        Subscription Suspended
                    </h2>
                    <p className="text-sm text-[#5B6472] dark:text-gray-400 leading-relaxed mb-5">
                        {suspendedMessage || "Your company's subscription to OmniHR has been suspended by the platform administrator. Access to features is temporarily unavailable."}
                    </p>
                    <div className="bg-[#F4F6FB] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-xl p-3.5 mb-6 text-left">
                        <span className="text-[11px] text-[#9AA3B1] uppercase font-bold tracking-wider block mb-1">
                            Action Required
                        </span>
                        <p className="text-xs text-[#5B6472] dark:text-gray-300">
                            Please contact your organization's Super Administrator to reactivate your subscription plan.
                        </p>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#F7F8FA] dark:bg-[#12151C] overflow-hidden text-[#12151C] dark:text-white transition-colors duration-300">
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

                <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 pb-6 flex flex-col justify-between">
                    <div className="w-full flex-1">
                        {children}
                    </div>

                    {/* Footer with BlockCoders reference */}
                    <footer className="mt-8 pt-4 border-t border-gray-200/60 dark:border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400 dark:text-gray-500 font-medium">
                        <span>© {new Date().getFullYear()} OmniHR. All rights reserved.</span>
                        <span>A product of <strong className="text-gray-700 dark:text-gray-300 font-semibold">BlockCoders</strong></span>
                    </footer>
                </div>
                {/* <ChatWidget /> */}
            </main>
        </div>
    );
}

