import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import type { IncomingCallData } from '../../../types/chat';
import { getMediaUrl } from '../../../utils/api';

interface IncomingCallModalProps {
    call: IncomingCallData;
    onAccept: () => void;
    onReject: (reason?: string) => void;
}

export default function IncomingCallModal({ call, onAccept, onReject }: IncomingCallModalProps) {
    const avatarUrl = call.callerAvatar ? getMediaUrl(call.callerAvatar) : null;

    // Optional ringtone sound using web audio API oscillator
    useEffect(() => {
        let audioCtx: AudioContext | null = null;
        let interval: number | null = null;

        try {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const playBeep = () => {
                if (!audioCtx) return;
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.8);
            };

            playBeep();
            interval = window.setInterval(playBeep, 2500);
        } catch (_) {}

        return () => {
            if (interval) clearInterval(interval);
            if (audioCtx) audioCtx.close().catch(() => {});
        };
    }, []);

    return createPortal(
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-sm w-full text-center relative overflow-hidden">
                {/* Ambient glow */}
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

                {/* Avatar with pulsing ring */}
                <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-tr from-[#2C4FD6] to-indigo-500 p-0.5 relative z-10 shadow-lg mx-auto flex items-center justify-center">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={call.callerName} className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <div className="w-full h-full bg-[#1e293b] flex items-center justify-center rounded-full text-white font-bold text-2xl">
                                {call.callerName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>

                <h3 className="text-lg font-bold text-[#12151C] dark:text-white mb-1">
                    {call.callerName}
                </h3>
                <p className="text-xs font-medium text-[#5B6472] dark:text-gray-400 flex items-center justify-center gap-1.5 mb-8">
                    {call.callType === 'VIDEO' ? <Video size={14} className="text-blue-500" /> : <Phone size={14} className="text-blue-500" />}
                    <span>Incoming {call.callType === 'VIDEO' ? 'Video' : 'Voice'} Call...</span>
                </p>

                {/* Accept / Decline actions */}
                <div className="flex items-center justify-center gap-6">
                    {/* Decline Button */}
                    <button
                        onClick={() => onReject('Declined')}
                        className="flex flex-col items-center gap-1.5 group cursor-pointer"
                    >
                        <div className="w-13 h-13 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 group-hover:scale-105 active:scale-95 transition-all">
                            <PhoneOff size={22} />
                        </div>
                        <span className="text-[11px] font-semibold text-[#5B6472] dark:text-gray-400">Decline</span>
                    </button>

                    {/* Accept Button */}
                    <button
                        onClick={onAccept}
                        className="flex flex-col items-center gap-1.5 group cursor-pointer"
                    >
                        <div className="w-13 h-13 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-105 active:scale-95 transition-all">
                            {call.callType === 'VIDEO' ? <Video size={22} /> : <Phone size={22} />}
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Accept</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
