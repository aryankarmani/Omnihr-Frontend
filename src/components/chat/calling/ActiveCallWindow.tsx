import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Mic, MicOff, Video, VideoOff, ScreenShare,
    PhoneOff, Maximize2, Minimize2, Radio
} from 'lucide-react';
import { useCall } from '../../../context/CallContext';
import { getMediaUrl } from '../../../utils/api';

export default function ActiveCallWindow() {
    const {
        activeCall,
        localStream,
        remoteStream,
        isMicMuted,
        isCameraOff,
        isScreenSharing,
        isMinimized,
        toggleMic,
        toggleCamera,
        toggleScreenShare,
        setIsMinimized,
        endCall,
    } = useCall();

    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const [duration, setDuration] = useState(0);

    // Attach local stream
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Attach remote stream
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Timer
    useEffect(() => {
        if (activeCall?.status === 'CONNECTED') {
            const timer = setInterval(() => {
                setDuration((d) => d + 1);
            }, 1000);
            return () => clearInterval(timer);
        } else {
            setDuration(0);
        }
    }, [activeCall?.status]);

    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (!activeCall) return null;

    const partnerAvatar = activeCall.partnerAvatar ? getMediaUrl(activeCall.partnerAvatar) : null;

    // --- Minimized floating PIP window ---
    if (isMinimized) {
        return createPortal(
            <div className="fixed bottom-6 right-6 z-[9999999] bg-[#12151C] text-white rounded-2xl shadow-2xl border border-gray-800 p-3.5 flex items-center gap-4 animate-scale-in">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-sm">
                        {partnerAvatar ? (
                            <img src={partnerAvatar} alt={activeCall.partnerName} className="w-full h-full object-cover" />
                        ) : (
                            activeCall.partnerName.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold leading-tight">{activeCall.partnerName}</h4>
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {activeCall.status === 'CONNECTED' ? formatDuration(duration) : activeCall.status}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 border-l border-gray-800 pl-3">
                    <button
                        onClick={toggleMic}
                        className={`p-2 rounded-full cursor-pointer transition-colors ${isMicMuted ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                        title={isMicMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMicMuted ? <MicOff size={14} /> : <Mic size={14} />}
                    </button>
                    <button
                        onClick={() => setIsMinimized(false)}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                        title="Expand"
                    >
                        <Maximize2 size={14} />
                    </button>
                    <button
                        onClick={endCall}
                        className="p-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white cursor-pointer transition-colors"
                        title="End Call"
                    >
                        <PhoneOff size={14} />
                    </button>
                </div>
            </div>,
            document.body
        );
    }

    // --- Full Call Window ---
    return createPortal(
        <div className="fixed inset-0 z-[9999999] bg-[#0B0D12] text-white flex flex-col justify-between overflow-hidden animate-fade-in select-none">
            {/* Top Bar */}
            <div className="p-4 sm:p-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2C4FD6] to-indigo-500 flex items-center justify-center font-bold text-sm overflow-hidden">
                        {partnerAvatar ? (
                            <img src={partnerAvatar} alt={activeCall.partnerName} className="w-full h-full object-cover" />
                        ) : (
                            activeCall.partnerName.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                            {activeCall.partnerName}
                            <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                                {activeCall.callType}
                            </span>
                        </h3>
                        <p className="text-xs text-gray-400 font-mono flex items-center gap-1.5">
                            {activeCall.status === 'CONNECTED' ? (
                                <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    {formatDuration(duration)}
                                </>
                            ) : (
                                <>
                                    <Radio size={12} className="animate-spin text-blue-400" />
                                    {activeCall.status === 'RINGING' ? 'Ringing...' : 'Connecting...'}
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 transition-colors cursor-pointer"
                        title="Minimize"
                    >
                        <Minimize2 size={18} />
                    </button>
                </div>
            </div>

            {/* Video / Audio Canvas */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#0F1218]">
                {/* Remote Stream Video */}
                {remoteStream && remoteStream.getVideoTracks().length > 0 && activeCall.status === 'CONNECTED' ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-contain bg-black"
                    />
                ) : (
                    /* Voice Call or Video Off Placeholder */
                    <div className="flex flex-col items-center justify-center text-center p-6">
                        <div className="relative mb-5">
                            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-gradient-to-tr from-[#2C4FD6] to-indigo-600 p-1 relative z-10 shadow-2xl flex items-center justify-center">
                                {partnerAvatar ? (
                                    <img src={partnerAvatar} alt={activeCall.partnerName} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <span className="text-4xl sm:text-5xl font-bold text-white">
                                        {activeCall.partnerName.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold mb-1">{activeCall.partnerName}</h2>
                        <p className="text-sm text-gray-400 font-mono">
                            {activeCall.status === 'CONNECTED' ? formatDuration(duration) : 'Calling...'}
                        </p>
                    </div>
                )}

                {/* Local Picture-in-Picture Video */}
                {activeCall.callType === 'VIDEO' && (
                    <div className="absolute bottom-6 right-6 w-36 sm:w-48 aspect-video rounded-xl overflow-hidden bg-black/80 border-2 border-white/20 shadow-2xl z-20 group">
                        {localStream && !isCameraOff ? (
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover -scale-x-100"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-gray-400 text-xs">
                                <VideoOff size={20} className="mb-1" />
                                Camera Off
                            </div>
                        )}
                        <span className="absolute bottom-1.5 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-gray-300 pointer-events-none">
                            You
                        </span>
                    </div>
                )}
            </div>

            {/* Bottom Controls Bar (Microsoft Teams inspired) */}
            <div className="p-6 pb-8 flex items-center justify-center gap-3 sm:gap-4 z-20 bg-gradient-to-t from-black/90 to-transparent">
                <div className="bg-[#1A1F2B]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 px-4 sm:px-6 flex items-center gap-3 sm:gap-4 shadow-2xl">
                    {/* Toggle Mic */}
                    <button
                        onClick={toggleMic}
                        className={`p-3 sm:p-3.5 rounded-xl cursor-pointer transition-all ${isMicMuted ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
                    >
                        {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    {/* Toggle Video */}
                    <button
                        onClick={toggleCamera}
                        className={`p-3 sm:p-3.5 rounded-xl cursor-pointer transition-all ${isCameraOff ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                    >
                        {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>

                    {/* Share Screen */}
                    <button
                        onClick={toggleScreenShare}
                        className={`p-3 sm:p-3.5 rounded-xl cursor-pointer transition-all ${isScreenSharing ? 'bg-blue-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                    >
                        <ScreenShare size={20} />
                    </button>

                    {/* End Call Button */}
                    <button
                        onClick={endCall}
                        className="px-5 sm:px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95 ml-2"
                    >
                        <PhoneOff size={18} />
                        <span className="hidden sm:inline">End Call</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
