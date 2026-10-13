import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogIn, LogOut, Coffee, Play, X, Clock, Loader2, Sparkles } from 'lucide-react';

export type AttendanceActionType = 'PUNCH_IN' | 'PUNCH_OUT' | 'BREAK_IN' | 'BREAK_OUT';

interface AttendanceConfirmModalProps {
    isOpen: boolean;
    actionType: AttendanceActionType | null;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
    shiftInfo?: string;
    extraInfo?: string;
}

export default function AttendanceConfirmModal({
    isOpen,
    actionType,
    onClose,
    onConfirm,
    isLoading = false,
    shiftInfo,
    extraInfo
}: AttendanceConfirmModalProps) {
    const [currentTime, setCurrentTime] = useState(new Date());

    // Live clock timer updated every second
    useEffect(() => {
        if (!isOpen) return;
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, [isOpen]);

    // Handle ESC key press
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isLoading, onClose]);

    if (!isOpen || !actionType) return null;

    // Formatting 12-hour live time
    const rawHours = currentTime.getHours();
    const displayHours = String(rawHours % 12 || 12).padStart(2, '0');
    const displayMinutes = String(currentTime.getMinutes()).padStart(2, '0');
    const displaySeconds = String(currentTime.getSeconds()).padStart(2, '0');
    const ampm = rawHours >= 12 ? 'PM' : 'AM';
    const dateFormatted = currentTime.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    // Content configuration based on actionType
    const config = {
        PUNCH_IN: {
            title: 'Confirm Punch In',
            subtitle: 'Start your shift',
            description: 'Are you ready to clock in and start recording your attendance for today?',
            icon: LogIn,
            badgeText: 'PUNCH IN',
            badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-[#1F8A5A] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40',
            iconContainer: 'bg-[#E4F5EC] text-[#1F8A5A] dark:bg-emerald-950/50 dark:text-emerald-400 border-2 border-emerald-200 dark:border-emerald-800/50',
            confirmBtnText: 'Yes, Punch In',
            confirmBtnBg: 'bg-[#1F8A5A] hover:bg-[#186f48] text-white shadow-lg shadow-emerald-600/20 active:scale-95',
            glowColor: 'from-emerald-500/10 to-teal-500/10'
        },
        PUNCH_OUT: {
            title: 'Confirm Punch Out',
            subtitle: 'End your shift',
            description: 'Are you sure you want to punch out? This will complete your work log for today.',
            icon: LogOut,
            badgeText: 'PUNCH OUT',
            badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-[#C13A3A] dark:text-rose-400 border border-rose-200 dark:border-rose-800/40',
            iconContainer: 'bg-[#FBE7E7] text-[#C13A3A] dark:bg-rose-950/50 dark:text-rose-400 border-2 border-rose-200 dark:border-rose-800/50',
            confirmBtnText: 'Yes, Punch Out',
            confirmBtnBg: 'bg-[#C13A3A] hover:bg-[#a62f2f] text-white shadow-lg shadow-rose-600/20 active:scale-95',
            glowColor: 'from-rose-500/10 to-red-500/10'
        },
        BREAK_IN: {
            title: 'Confirm Break In',
            subtitle: 'Take a break',
            description: 'Are you taking a pause? Your working timer will be paused until you break out.',
            icon: Coffee,
            badgeText: 'BREAK IN',
            badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-[#B45309] dark:text-amber-400 border border-amber-200 dark:border-amber-800/40',
            iconContainer: 'bg-[#FEF3C7] text-[#B45309] dark:bg-amber-950/50 dark:text-amber-400 border-2 border-amber-200 dark:border-amber-800/50',
            confirmBtnText: 'Yes, Start Break',
            confirmBtnBg: 'bg-[#D97706] hover:bg-[#b45309] text-white shadow-lg shadow-amber-600/20 active:scale-95',
            glowColor: 'from-amber-500/10 to-orange-500/10'
        },
        BREAK_OUT: {
            title: 'Confirm Break Out',
            subtitle: 'Resume working',
            description: 'Are you ready to end your break and resume your shift?',
            icon: Play,
            badgeText: 'BREAK OUT',
            badgeBg: 'bg-[#D1FAE5] dark:bg-emerald-950/40 text-[#047857] dark:text-emerald-400 border border-[#059669]/30 dark:border-emerald-800/40',
            iconContainer: 'bg-[#D1FAE5] text-[#047857] dark:bg-emerald-950/50 dark:text-emerald-400 border-2 border-[#059669]/40 dark:border-emerald-800/50',
            confirmBtnText: 'Yes, Break Out',
            confirmBtnBg: 'bg-[#059669] hover:bg-[#047857] text-white shadow-lg shadow-emerald-600/20 active:scale-95',
            glowColor: 'from-emerald-500/10 to-green-500/10'
        }
    }[actionType];

    const IconComponent = config.icon;

    return createPortal(
        <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md animate-fade-in"
            onClick={() => {
                if (!isLoading) onClose();
            }}
        >
            <div
                className="bg-white dark:bg-[#12151C] rounded-[10px] border border-[#E2E6ED] dark:border-gray-800 shadow-2xl p-6 sm:p-7 w-full max-w-[390px] text-center relative flex flex-col items-center animate-scale-in overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Subtle top decorative gradient glow */}
                <div className={`absolute top-0 inset-x-0 h-28 bg-gradient-to-b ${config.glowColor} pointer-events-none -z-0`} />

                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="absolute top-3.5 right-3.5 w-7 h-7 rounded-[6px] flex items-center justify-center text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                    title="Close"
                >
                    <X size={16} />
                </button>

                {/* Circular Action Icon Badge */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3.5 mt-1 shadow-sm transition-transform duration-300 hover:scale-105 ${config.iconContainer}`}>
                    <IconComponent size={26} />
                </div>

                {/* Action Badge */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider mb-2 ${config.badgeBg}`}>
                    <Sparkles size={11} /> {config.badgeText}
                </span>

                {/* Title & Description */}
                <h3 className="text-[18px] font-bold text-[#12151C] dark:text-white tracking-tight leading-tight mb-1.5">
                    {config.title}
                </h3>
                <p className="text-[12.5px] text-[#5B6472] dark:text-gray-400 leading-relaxed mb-4 px-1">
                    {config.description}
                </p>

                {/* Live Time & Date Display Card */}
                <div className="w-full bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[8px] p-3 mb-5 flex flex-col gap-1.5 items-center">
                    <div className="flex items-center gap-1.5 text-xs text-[#5B6472] dark:text-gray-400 font-medium">
                        <Clock size={13} className="text-[#9AA3B1]" />
                        <span>{dateFormatted}</span>
                    </div>

                    <div className="font-mono font-bold text-[26px] text-[#12151C] dark:text-white tracking-tight flex items-baseline gap-1">
                        <span>{displayHours}:{displayMinutes}:{displaySeconds}</span>
                        <span className="text-[13px] font-semibold text-[#5B6472] dark:text-gray-400">{ampm}</span>
                    </div>

                    {shiftInfo && (
                        <div className="text-[10.5px] text-[#2C4FD6] dark:text-blue-400 font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 mt-0.5">
                            Shift: {shiftInfo}
                        </div>
                    )}

                    {extraInfo && (
                        <div className="text-[10.5px] text-[#B45309] dark:text-amber-400 font-medium mt-0.5">
                            {extraInfo}
                        </div>
                    )}
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center gap-2.5 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-2.5 px-4 bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-300 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 font-semibold text-[13px] transition-all cursor-pointer disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 py-2.5 px-4 rounded-[6px] font-semibold text-[13px] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed ${config.confirmBtnBg}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={15} className="animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <span>{config.confirmBtnText}</span>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
