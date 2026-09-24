import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function PunchInPromptModal() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isPunching, setIsPunching] = useState(false);

    // Live clock timer
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Check punch status and trigger 3-second popup once per day
    useEffect(() => {
        // Only run for logged-in company users (Employees, HR Admins, Managers, etc.)
        if (!user || user.role === 'SUPER_ADMIN') return;

        let timerId: any = null;
        let isCancelled = false;

        const checkAndPrompt = async () => {
            try {
                // Today date string in local/India timezone
                const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
                const storageKey = `punch_in_prompt_shown_${user.id}_${todayStr}`;

                // If already prompted or dismissed today, do not show again
                if (localStorage.getItem(storageKey)) {
                    return;
                }

                // Check live punch status from API
                const statusRes = await api.get('/attendance/status');
                if (isCancelled) return;

                const { isPunchedIn, punchOutTime } = statusRes.data || {};

                // If user is already punched in or has already completed shift today, do not prompt
                if (isPunchedIn || punchOutTime) {
                    return;
                }

                // Wait 3 seconds after login / landing on page, then display the modal
                timerId = setTimeout(() => {
                    if (!isCancelled) {
                        // Mark as shown today so it only appears once per day
                        localStorage.setItem(storageKey, 'true');
                        setIsOpen(true);
                    }
                }, 3000);
            } catch (error) {
                console.error("Failed to check punch status for modal:", error);
            }
        };

        checkAndPrompt();

        return () => {
            isCancelled = true;
            if (timerId) clearTimeout(timerId);
        };
    }, [user]);

    const handlePunchIn = async () => {
        if (isPunching) return;
        setIsPunching(true);

        try {
            const res = await api.post('/attendance/punch');
            toast.success(res.data?.message || 'Punched in successfully!');
            setIsOpen(false);
            // Notify other components (dashboards, attendance page) to refresh immediately
            window.dispatchEvent(new Event('punch-updated'));
        } catch (error: any) {
            console.error("Punch in error:", error);
            const msg = error.response?.data?.message || error.message || 'Failed to punch in';
            toast.error(msg);
        } finally {
            setIsPunching(false);
        }
    };

    if (!isOpen) return null;

    // Use createPortal to mount on document.body for true full-screen blur (including sidebar & header)
    return createPortal(
        <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in"
            onClick={() => setIsOpen(false)}
        >
            <div 
                className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 shadow-2xl p-7 sm:p-8 w-full max-w-[340px] text-center relative flex flex-col items-center animate-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button with rounded-[6px] */}
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Dismiss"
                    className="absolute top-3.5 right-3.5 w-7 h-7 rounded-[6px] flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                    <X size={16} />
                </button>

                {/* Date */}
                <p className="text-[13px] text-[#5B6472] dark:text-gray-400 font-medium mb-3">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>

                {/* Live Digital Clock */}
                <div className="mb-6 flex flex-col items-center">
                    <span className="text-[40px] sm:text-[44px] text-[#12151C] dark:text-white font-mono font-bold leading-none tracking-tight">
                        {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                    </span>
                    <span className="text-[24px] sm:text-[26px] font-mono font-bold text-[#12151C] dark:text-white mt-1">
                        {currentTime.getHours() >= 12 ? 'PM' : 'AM'}
                    </span>
                </div>

                {/* Circular Punch In Button */}
                <button
                    type="button"
                    onClick={handlePunchIn}
                    disabled={isPunching}
                    className="w-36 h-36 rounded-full border-2 border-[#1F8A5A] bg-[#E4F5EC] hover:bg-[#d8eedf] text-[#1F8A5A] transition-all transform hover:scale-105 active:scale-95 flex flex-col items-center justify-center shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isPunching ? (
                        <Loader2 size={24} className="animate-spin mb-1.5" />
                    ) : (
                        <MapPin size={22} className="mb-1.5" />
                    )}
                    <span className="text-[13px] font-extrabold uppercase tracking-wider leading-none">
                        {isPunching ? 'PROCESSING...' : 'PUNCH IN'}
                    </span>
                </button>
            </div>
        </div>,
        document.body
    );
}
