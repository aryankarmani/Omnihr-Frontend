import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Mic, MicOff, Video, VideoOff, ScreenShare,
    PhoneOff, Maximize2, Minimize2, Radio,
    MessageSquare, UserPlus, X, Send, Users, Search, Volume2,
    Hand, Minus
} from 'lucide-react';
import { useCall } from '../../../context/CallContext';
import { useAuth } from '../../../context/AuthContext';
import api, { getMediaUrl } from '../../../utils/api';
import type { InCallMessage } from '../../../types/chat';

// Sub-component: Participant Grid Card (When NO screen is shared)
function ParticipantGridCard({
    participant,
    stream,
    isSelf,
    isMicMuted,
    isCameraOff,
    isSpeaking,
    isHandRaised,
    resolveAvatar,
}: {
    participant: { id: number; name: string; avatar?: string | null };
    stream?: MediaStream | null;
    isSelf?: boolean;
    isMicMuted?: boolean;
    isCameraOff?: boolean;
    isSpeaking?: boolean;
    isHandRaised?: boolean;
    resolveAvatar: (p: any) => string | null;
}) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const hasVideo = !!(stream && stream.getVideoTracks().length > 0 && !isCameraOff);
    const avatar = resolveAvatar(participant);

    useEffect(() => {
        if (videoRef.current && stream) {
            if (videoRef.current.srcObject !== stream) {
                videoRef.current.srcObject = stream;
            }
        }
    }, [stream, hasVideo]);

    useEffect(() => {
        if (audioRef.current && stream && !isSelf) {
            if (audioRef.current.srcObject !== stream) {
                audioRef.current.srcObject = stream;
            }
        }
    }, [stream, isSelf]);

    return (
        <div
            className={`relative rounded-[6px] overflow-hidden bg-[#151922] transition-all duration-200 flex items-center justify-center group shadow-xl w-full h-full min-h-[160px] max-h-[75vh] ${
                isSpeaking
                    ? 'border-2 border-emerald-400 ring-2 ring-emerald-400/25 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                    : 'border border-white/10 hover:border-white/20'
            }`}
        >
            {!isSelf && stream && <audio ref={audioRef} autoPlay playsInline />}

            {/* Hand Raised Badge (Google Meet style) */}
            {isHandRaised && (
                <div className="absolute top-3 left-3 z-30 px-2.5 py-1 rounded-[6px] bg-amber-500 text-black font-bold text-xs flex items-center gap-1.5 shadow-xl animate-bounce">
                    <span>✋</span>
                    <span className="text-[11px] font-bold">Hand Raised</span>
                </div>
            )}

            {hasVideo ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isSelf}
                    className={`w-full h-full object-cover ${isSelf ? '-scale-x-100' : ''}`}
                />
            ) : (
                <div className="flex flex-col items-center justify-center p-4 text-center">
                    <div
                        className={`w-18 h-18 sm:w-24 sm:h-24 rounded-full overflow-hidden p-0.5 shadow-xl flex items-center justify-center mb-3 transition-transform duration-200 ${
                            isSpeaking
                                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 scale-105'
                                : 'bg-gradient-to-tr from-[#2C4FD6] to-indigo-600'
                        }`}
                    >
                        {avatar ? (
                            <img src={avatar} alt={participant.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <span className="text-2xl sm:text-3xl font-bold text-white">
                                {participant.name?.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                        {stream ? 'Camera off' : 'Connecting...'}
                    </span>
                </div>
            )}

            {/* Bottom bar: Name badge & speaking status */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                <span className="text-xs font-semibold bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-[6px] text-white border border-white/10 flex items-center gap-1.5 shadow-md">
                    {isSelf ? 'You' : participant.name}
                    {isSpeaking && (
                        <span className="flex items-center gap-0.5 text-emerald-400 text-[10px]">
                            <Volume2 size={12} className="animate-pulse" />
                        </span>
                    )}
                </span>
                {isMicMuted && (
                    <span className="p-1.5 rounded-[6px] bg-rose-500/85 backdrop-blur-md text-white text-[11px] shadow-md">
                        <MicOff size={13} />
                    </span>
                )}
            </div>
        </div>
    );
}

// Sub-component: Participant Thumbnail Card (When SCREEN SHARING IS ACTIVE)
function ParticipantThumbnailCard({
    participant,
    stream,
    isSelf,
    isMicMuted,
    isCameraOff,
    isSpeaking,
    isHandRaised,
    resolveAvatar,
}: {
    participant: { id: number; name: string; avatar?: string | null };
    stream?: MediaStream | null;
    isSelf?: boolean;
    isMicMuted?: boolean;
    isCameraOff?: boolean;
    isSpeaking?: boolean;
    isHandRaised?: boolean;
    resolveAvatar: (p: any) => string | null;
}) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const hasVideo = !!(stream && stream.getVideoTracks().length > 0 && !isCameraOff);
    const avatar = resolveAvatar(participant);

    useEffect(() => {
        if (videoRef.current && stream) {
            if (videoRef.current.srcObject !== stream) {
                videoRef.current.srcObject = stream;
            }
        }
    }, [stream, hasVideo]);

    useEffect(() => {
        if (audioRef.current && stream && !isSelf) {
            if (audioRef.current.srcObject !== stream) {
                audioRef.current.srcObject = stream;
            }
        }
    }, [stream, isSelf]);

    return (
        <div
            className={`relative rounded-[6px] overflow-hidden bg-[#151922] transition-all duration-150 flex items-center justify-center shrink-0 w-36 sm:w-48 aspect-video shadow-md ${
                isSpeaking
                    ? 'border-2 border-emerald-400 ring-2 ring-emerald-400/30'
                    : 'border border-white/10'
            }`}
        >
            {!isSelf && stream && <audio ref={audioRef} autoPlay playsInline />}

            {/* Hand Raised Badge (Google Meet style) */}
            {isHandRaised && (
                <div className="absolute top-1.5 left-1.5 z-30 px-1.5 py-0.5 rounded-[4px] bg-amber-500 text-black font-bold text-[10px] flex items-center gap-0.5 shadow-lg animate-bounce">
                    <span>✋</span>
                </div>
            )}

            {hasVideo ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isSelf}
                    className={`w-full h-full object-cover ${isSelf ? '-scale-x-100' : ''}`}
                />
            ) : (
                <div className="flex flex-col items-center justify-center p-2 text-center">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-gradient-to-tr from-[#2C4FD6] to-indigo-600 p-0.5 shadow flex items-center justify-center mb-1">
                        {avatar ? (
                            <img src={avatar} alt={participant.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <span className="text-sm font-bold text-white">
                                {participant.name?.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Small overlay badge with name & mic status */}
            <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none z-10">
                <span className="text-[10px] font-medium bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-white border border-white/10 truncate max-w-[85%]">
                    {isSelf ? 'You' : participant.name}
                </span>
                {isMicMuted && (
                    <span className="p-0.5 rounded bg-rose-500/80 text-white text-[9px]">
                        <MicOff size={10} />
                    </span>
                )}
            </div>
        </div>
    );
}

// Sub-component: Shared Screen Main Stage
function SharedScreenMainStage({
    stream,
    presenterName,
    isSelfPresenting,
    onStopSharing,
}: {
    stream: MediaStream | null;
    presenterName: string;
    isSelfPresenting: boolean;
    onStopSharing: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            if (videoRef.current.srcObject !== stream) {
                videoRef.current.srcObject = stream;
            }
        }
    }, [stream]);

    return (
        <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden group select-none">
            {stream ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full max-w-full max-h-full object-contain"
                />
            ) : (
                <div className="flex flex-col items-center justify-center text-gray-400 gap-2 p-6">
                    <Radio size={32} className="animate-spin text-blue-400" />
                    <span className="text-sm font-medium">Connecting to shared screen...</span>
                </div>
            )}

            {/* Top-left Presenter Tag */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-[#121620]/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-white text-xs font-semibold shadow-2xl">
                <ScreenShare size={15} className="text-blue-400" />
                <span>{isSelfPresenting ? 'You are presenting to everyone' : `${presenterName} is presenting`}</span>
            </div>

            {/* Top-right Stop Presenting button (if self is sharing) */}
            {isSelfPresenting && (
                <button
                    onClick={onStopSharing}
                    className="absolute top-4 right-4 z-20 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-2xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-rose-500/30"
                    title="Stop screen sharing"
                >
                    <ScreenShare size={14} />
                    <span>Stop Presenting</span>
                </button>
            )}
        </div>
    );
}

export default function ActiveCallWindow() {
    const {
        activeCall,
        localStream,
        remoteStream,
        remoteStreams,
        screenStream,
        screenSharingUserId,
        activeSpeakerId,
        isMicMuted,
        isCameraOff,
        isScreenSharing,
        isMinimized,
        inCallMessages,
        isMyHandRaised,
        raisedHandUserIds,
        sendInCallMessage,
        inviteToCall,
        toggleMic,
        toggleCamera,
        toggleScreenShare,
        toggleRaiseHand,
        setIsMinimized,
        endCall,
    } = useCall();
    const { user } = useAuth();

    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const callContainerRef = useRef<HTMLDivElement | null>(null);

    const [duration, setDuration] = useState(0);
    const [showChat, setShowChat] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [inviteSearch, setInviteSearch] = useState('');
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [invitedUserIds, setInvitedUserIds] = useState<number[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Attach local stream
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Attach remote stream for 1:1 view (audio and video)
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
        if (remoteAudioRef.current && remoteStream) {
            remoteAudioRef.current.srcObject = remoteStream;
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

    // Auto-scroll in-call chat
    useEffect(() => {
        if (showChat) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [inCallMessages, showChat]);

    // Track Fullscreen state
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            callContainerRef.current?.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    // Fetch employees for invite modal
    const fetchEmployeesForInvite = async () => {
        if (employees.length > 0) return;
        setLoadingEmployees(true);
        try {
            const res = await api.get('/communication/bootstrap');
            setEmployees(res.data.employees || []);
        } catch (err) {
            console.error('Failed to load employees for call invite', err);
        } finally {
            setLoadingEmployees(false);
        }
    };

    const handleSendChatMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        sendInCallMessage(chatInput.trim());
        setChatInput('');
    };

    const handleInviteUser = async (emp: any) => {
        const avatar = resolveAvatar(emp);
        await inviteToCall(emp.id, emp.name, avatar);
        setInvitedUserIds(prev => [...prev, emp.id]);
    };

    const formatDuration = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const resolveAvatar = (userObj: any) => {
        const raw =
            userObj?.employeeProfile?.avatar ||
            userObj?.employeeProfile?.profilePicture ||
            userObj?.employeeProfile?.profilePictureUrl ||
            userObj?.avatar ||
            userObj?.profilePicture ||
            userObj?.profilePictureUrl;
        if (!raw || typeof raw !== 'string' || raw.startsWith('bg-')) return null;
        return getMediaUrl(raw);
    };

    if (!activeCall) return null;

    const partnerAvatar = resolveAvatar(activeCall);

    // Screen sharing active state detection
    const isScreenShareActive = isScreenSharing || screenSharingUserId !== null;
    const presenterName = isScreenSharing
        ? 'You'
        : (activeCall.participants?.find((p) => p.id === screenSharingUserId)?.name || activeCall.partnerName || 'Participant');

    // The stream to display on the Main Stage
    const sharedScreenStream = isScreenSharing
        ? screenStream
        : (screenSharingUserId ? remoteStreams.get(screenSharingUserId) || remoteStream : remoteStream);

    // --- Minimized floating PIP window ---
    if (isMinimized) {
        return createPortal(
            <div className="fixed bottom-6 right-6 z-[9999999] bg-[#12151C] text-white rounded-[6px] shadow-2xl border border-gray-800 p-3.5 flex items-center gap-4 animate-scale-in">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                        {partnerAvatar ? (
                            <img
                                src={partnerAvatar}
                                alt={activeCall.partnerName}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                            />
                        ) : activeCall.isGroup ? (
                            <Users size={16} />
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
                        {isMicMuted ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>
                    <button
                        onClick={() => setIsMinimized(false)}
                        className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors"
                        title="Maximize"
                    >
                        <Maximize2 size={15} />
                    </button>
                    <button
                        onClick={endCall}
                        className="p-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition-colors"
                        title={activeCall.isGroup ? "Leave Call" : "End Call"}
                    >
                        <PhoneOff size={15} />
                    </button>
                </div>
            </div>,
            document.body
        );
    }

    // Grid columns calculation for normal grid
    const totalParticipantCount = 1 + (activeCall.participants?.length || 0);

    return createPortal(
        <div
            ref={callContainerRef}
            className="fixed inset-0 z-[999999] bg-[#0A0D14] text-white flex flex-col overflow-hidden font-sans select-none animate-fade-in"
        >
            {/* 1. TOP HEADER (Google Meet Style) */}
            <div className="h-14 sm:h-16 px-4 sm:px-6 border-b border-white/10 bg-[#0F1219]/90 backdrop-blur-md flex items-center justify-between z-20 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[6px] bg-gradient-to-tr from-[#2C4FD6] to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
                        {activeCall.isGroup ? <Users size={17} /> : activeCall.partnerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:base font-bold text-white tracking-tight truncate max-w-[200px] sm:max-w-md">
                                {activeCall.partnerName}
                            </h3>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-gray-300 shrink-0">
                                {activeCall.isGroup
                                    ? `${totalParticipantCount} participants`
                                    : activeCall.callType === 'VIDEO' ? 'Video Call' : 'Voice Call'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Live Duration Pill */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/10 font-mono text-xs text-gray-300">
                        {activeCall.status === 'CONNECTED' ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>{formatDuration(duration)}</span>
                            </>
                        ) : (
                            <>
                                <Radio size={12} className="animate-spin text-blue-400" />
                                <span className="text-gray-400">{activeCall.status === 'RINGING' ? 'Ringing...' : 'Connecting...'}</span>
                            </>
                        )}
                    </div>

                    {/* Fullscreen Toggle Button */}
                    <button
                        onClick={toggleFullscreen}
                        className="px-2.5 py-1.5 sm:py-2 rounded-[6px] bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    >
                        {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                        <span className="hidden md:inline text-xs font-medium">{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
                    </button>

                    {/* Minimize Window Button (Collapse to floating mini-player) */}
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="px-2.5 py-1.5 sm:py-2 rounded-[6px] bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
                        title="Minimize to mini window"
                    >
                        <Minus size={15} />
                        <span className="hidden md:inline text-xs font-medium">Minimize</span>
                    </button>
                </div>
            </div>

            {/* 2. MAIN CALL STAGE + CHAT SIDE DRAWER */}
            <div className="flex-1 relative flex overflow-hidden">
                {/* Visual Content Canvas */}
                <div className="flex-1 relative flex flex-col overflow-hidden bg-[#0A0D14]">
                    {/* CASE A: SCREEN SHARING IS ACTIVE -> MAIN STAGE (100% CONTAIN) + THUMBNAIL STRIP */}
                    {isScreenShareActive ? (
                        <div className="flex-1 flex flex-col w-full h-full overflow-hidden">
                            {/* Main Stage (Shared Screen) */}
                            <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center p-2 sm:p-3">
                                <SharedScreenMainStage
                                    stream={sharedScreenStream}
                                    presenterName={presenterName}
                                    isSelfPresenting={isScreenSharing}
                                    onStopSharing={toggleScreenShare}
                                />
                            </div>

                            {/* Participant Thumbnail Horizontal Strip (Bottom) */}
                            <div className="w-full h-28 sm:h-36 bg-[#0E121A]/95 backdrop-blur-md border-t border-white/10 px-4 py-2.5 flex items-center gap-3 overflow-x-auto scrollbar-thin shrink-0 z-10">
                                {/* Local user thumbnail */}
                                <ParticipantThumbnailCard
                                    participant={{ id: Number(user?.id) || 0, name: 'You', avatar: user?.avatar }}
                                    stream={localStream}
                                    isSelf={true}
                                    isMicMuted={isMicMuted}
                                    isCameraOff={isCameraOff}
                                    isSpeaking={Number(activeSpeakerId) === Number(user?.id)}
                                    isHandRaised={isMyHandRaised}
                                    resolveAvatar={resolveAvatar}
                                />

                                {/* Remote participant thumbnails */}
                                {activeCall.isGroup ? (
                                    activeCall.participants?.map((p) => (
                                        <ParticipantThumbnailCard
                                            key={p.id}
                                            participant={p}
                                            stream={remoteStreams.get(p.id)}
                                            isSelf={false}
                                            isSpeaking={Number(activeSpeakerId) === Number(p.id)}
                                            isHandRaised={raisedHandUserIds.has(p.id)}
                                            resolveAvatar={resolveAvatar}
                                        />
                                    ))
                                ) : (
                                    /* 1:1 Remote participant thumbnail */
                                    <ParticipantThumbnailCard
                                        participant={{ id: activeCall.partnerId, name: activeCall.partnerName, avatar: activeCall.partnerAvatar }}
                                        stream={remoteStream}
                                        isSelf={false}
                                        isSpeaking={Number(activeSpeakerId) === Number(activeCall.partnerId)}
                                        isHandRaised={raisedHandUserIds.has(activeCall.partnerId)}
                                        resolveAvatar={resolveAvatar}
                                    />
                                )}
                            </div>
                        </div>
                    ) : (
                        /* CASE B: NO SCREEN SHARING -> RESPONSIVE PARTICIPANT GRID */
                        <div className="flex-1 w-full h-full p-3 sm:p-5 flex items-center justify-center overflow-auto">
                            {activeCall.isGroup ? (
                                /* Group Call Grid */
                                <div
                                    className={`grid gap-3 sm:gap-4 w-full h-full max-h-[82vh] items-center justify-center ${
                                        totalParticipantCount === 1
                                            ? 'grid-cols-1 max-w-3xl'
                                            : totalParticipantCount === 2
                                            ? 'grid-cols-1 md:grid-cols-2 max-w-5xl'
                                            : totalParticipantCount === 3
                                            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl'
                                            : totalParticipantCount === 4
                                            ? 'grid-cols-2 max-w-5xl'
                                            : totalParticipantCount <= 6
                                            ? 'grid-cols-2 sm:grid-cols-3 max-w-6xl'
                                            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-w-7xl overflow-y-auto'
                                    }`}
                                >
                                    {/* Local Participant Tile */}
                                    <ParticipantGridCard
                                        participant={{ id: Number(user?.id) || 0, name: 'You', avatar: user?.avatar }}
                                        stream={localStream}
                                        isSelf={true}
                                        isMicMuted={isMicMuted}
                                        isCameraOff={isCameraOff}
                                        isSpeaking={Number(activeSpeakerId) === Number(user?.id)}
                                        isHandRaised={isMyHandRaised}
                                        resolveAvatar={resolveAvatar}
                                    />

                                    {/* Remote Participant Tiles */}
                                    {activeCall.participants?.map((p) => (
                                        <ParticipantGridCard
                                            key={p.id}
                                            participant={p}
                                            stream={remoteStreams.get(p.id)}
                                            isSelf={false}
                                            isSpeaking={Number(activeSpeakerId) === Number(p.id)}
                                            isHandRaised={raisedHandUserIds.has(p.id)}
                                            resolveAvatar={resolveAvatar}
                                        />
                                    ))}
                                </div>
                            ) : (
                                /* 1:1 Direct Call View */
                                <div className="relative w-full h-full max-w-5xl flex items-center justify-center">
                                    {/* Dedicated audio player ensuring 1:1 voice always plays */}
                                    <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
                                    {remoteStream && remoteStream.getVideoTracks().length > 0 && activeCall.status === 'CONNECTED' ? (
                                        <div
                                            className={`relative w-full h-full max-h-[78vh] rounded-[6px] overflow-hidden bg-black shadow-2xl ${
                                                activeSpeakerId === activeCall.partnerId
                                                    ? 'border-2 border-emerald-400 ring-2 ring-emerald-400/30'
                                                    : 'border border-white/10'
                                            }`}
                                        >
                                            {/* Hand Raised Badge (1:1 Call) */}
                                            {raisedHandUserIds.has(activeCall.partnerId) && (
                                                <div className="absolute top-4 left-4 z-20 px-2.5 py-1 rounded-[6px] bg-amber-500 text-black font-bold text-xs flex items-center gap-1.5 shadow-xl animate-bounce">
                                                    <span>✋</span>
                                                    <span className="text-[11px] font-bold">Hand Raised</span>
                                                </div>
                                            )}

                                            <video
                                                ref={remoteVideoRef}
                                                autoPlay
                                                playsInline
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-[6px] text-sm font-semibold flex items-center gap-2">
                                                <span>{activeCall.partnerName}</span>
                                                {activeSpeakerId === activeCall.partnerId && (
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-center p-6 w-full max-w-xl">
                                            {/* Hand Raised Badge (1:1 Voice Call) */}
                                            {raisedHandUserIds.has(activeCall.partnerId) && (
                                                <div className="mb-3 px-3 py-1 rounded-[6px] bg-amber-500 text-black font-bold text-xs inline-flex items-center gap-1.5 shadow-xl animate-bounce">
                                                    <span>✋</span>
                                                    <span>Hand Raised</span>
                                                </div>
                                            )}
                                            <div className="relative mb-6">
                                                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-gradient-to-tr from-[#2C4FD6] to-indigo-600 p-1 shadow-2xl flex items-center justify-center">
                                                    {partnerAvatar ? (
                                                        <img
                                                            src={partnerAvatar}
                                                            alt={activeCall.partnerName}
                                                            className="w-full h-full object-cover rounded-full"
                                                            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                                        />
                                                    ) : (
                                                        <span className="text-4xl sm:text-5xl font-bold text-white">
                                                            {activeCall.partnerName.charAt(0).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <h2 className="text-2xl font-bold mb-1.5">{activeCall.partnerName}</h2>
                                            <p className="text-sm text-gray-400 font-mono">
                                                {activeCall.status === 'CONNECTED' ? formatDuration(duration) : 'Calling...'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Local Picture-in-Picture Video (1:1 Call) */}
                                    {activeCall.callType === 'VIDEO' && (
                                        <div className="absolute bottom-4 right-4 w-40 sm:w-56 aspect-video rounded-[6px] overflow-hidden bg-black/80 border-2 border-white/20 shadow-2xl z-20 group">
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
                                                    <VideoOff size={18} className="mb-1" />
                                                    Camera Off
                                                </div>
                                            )}
                                            <span className="absolute bottom-1.5 left-2 text-[10px] bg-black/70 px-1.5 py-0.5 rounded-[6px] text-gray-200 pointer-events-none">
                                                You
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* In-Call Chat Drawer (Side Panel on Desktop, Overlay on Mobile) */}
                {showChat && (
                    <div className="absolute inset-y-0 right-0 sm:relative w-full sm:w-80 md:w-96 border-l border-white/10 bg-[#121620]/95 backdrop-blur-2xl flex flex-col z-30 animate-fade-in shadow-2xl">
                        {/* Chat Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MessageSquare size={17} className="text-[#2C4FD6]" />
                                <h4 className="text-sm font-bold text-white">In-Call Messages</h4>
                            </div>
                            <button
                                onClick={() => setShowChat(false)}
                                className="p-1.5 rounded-[6px] text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Chat Feed */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {inCallMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 text-xs p-4">
                                    <MessageSquare size={28} className="mb-2 opacity-40 text-blue-400" />
                                    <p className="font-semibold text-gray-300">No messages yet</p>
                                    <p className="text-[11px] mt-1 text-gray-500">Messages sent here are visible to everyone in the call.</p>
                                </div>
                            ) : (
                                inCallMessages.map((msg) => {
                                    const isSelfMsg = msg.senderId === user?.id;
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex flex-col ${isSelfMsg ? 'items-end' : 'items-start'}`}
                                        >
                                            <div className="flex items-center gap-1.5 mb-1 text-[11px] text-gray-400">
                                                <span className="font-semibold text-gray-300">
                                                    {isSelfMsg ? 'You' : msg.senderName}
                                                </span>
                                                <span className="text-[10px] text-gray-500">{msg.time}</span>
                                            </div>
                                            <div
                                                className={`px-3 py-2 rounded-[6px] text-xs max-w-[85%] break-words ${
                                                    isSelfMsg
                                                        ? 'bg-[#2C4FD6] text-white rounded-tr-none'
                                                        : 'bg-white/10 text-gray-200 rounded-tl-none border border-white/5'
                                                }`}
                                            >
                                                {msg.text}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input */}
                        <form onSubmit={handleSendChatMessage} noValidate className="p-3 border-t border-white/10 bg-[#0E1118]/90 flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Send message in call..."
                                className="flex-1 bg-white/10 border border-white/10 rounded-[6px] px-3.5 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#2C4FD6]"
                            />
                            <button
                                type="submit"
                                disabled={!chatInput.trim()}
                                className="p-2 rounded-[6px] bg-[#2C4FD6] hover:bg-blue-600 disabled:opacity-40 text-white transition-colors cursor-pointer"
                            >
                                <Send size={15} />
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* 3. BOTTOM FLOATING CONTROL BAR (Google Meet Style) */}
            <div className="p-3 sm:p-4 flex items-center justify-center z-30 shrink-0 bg-[#0F1219]/90 border-t border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-2 sm:gap-3 px-4 py-2 rounded-[6px] bg-[#161A24]/90 border border-white/10 shadow-2xl">
                    {/* Toggle Microphone */}
                    <button
                        onClick={toggleMic}
                        className={`p-3 rounded-[6px] cursor-pointer transition-all duration-150 active:scale-95 ${
                            isMicMuted
                                ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
                                : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                    >
                        {isMicMuted ? <MicOff size={19} /> : <Mic size={19} />}
                    </button>

                    {/* Toggle Video */}
                    <button
                        onClick={toggleCamera}
                        className={`p-3 rounded-[6px] cursor-pointer transition-all duration-150 active:scale-95 ${
                            isCameraOff
                                ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
                                : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                    >
                        {isCameraOff ? <VideoOff size={19} /> : <Video size={19} />}
                    </button>

                    {/* Share Screen Toggle */}
                    <button
                        onClick={toggleScreenShare}
                        className={`px-3.5 py-3 rounded-[6px] cursor-pointer transition-all duration-150 active:scale-95 flex items-center gap-2 ${
                            isScreenSharing
                                ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                                : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title={isScreenSharing ? 'Stop Sharing Screen' : 'Share Screen'}
                    >
                        <ScreenShare size={19} />
                        <span className="hidden md:inline text-xs font-semibold">
                            {isScreenSharing ? 'Sharing' : 'Share Screen'}
                        </span>
                    </button>

                    {/* Raise Hand Toggle (Google Meet Style) */}
                    <button
                        onClick={toggleRaiseHand}
                        className={`px-3.5 py-3 rounded-[6px] cursor-pointer transition-all duration-150 active:scale-95 flex items-center gap-2 ${
                            isMyHandRaised
                                ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/50'
                                : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title={isMyHandRaised ? 'Lower Hand' : 'Raise Hand'}
                    >
                        <Hand size={19} className={isMyHandRaised ? 'animate-bounce' : ''} />
                        <span className="hidden md:inline text-xs font-semibold">
                            {isMyHandRaised ? 'Lower Hand' : 'Raise Hand'}
                        </span>
                    </button>

                    {/* In-Call Chat Button */}
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={`relative p-3 rounded-[6px] cursor-pointer transition-all duration-150 active:scale-95 ${
                            showChat
                                ? 'bg-[#2C4FD6] text-white shadow-lg shadow-blue-600/30'
                                : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                        title="In-Call Chat"
                    >
                        <MessageSquare size={19} />
                        {inCallMessages.length > 0 && !showChat && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                                {inCallMessages.length}
                            </span>
                        )}
                    </button>

                    {/* Add People / Invite Button */}
                    <button
                        onClick={() => {
                            setShowInviteModal(true);
                            fetchEmployeesForInvite();
                        }}
                        className="p-3 rounded-[6px] cursor-pointer transition-all duration-150 bg-white/10 text-white hover:bg-white/20 flex items-center gap-1.5 active:scale-95"
                        title="Add Users to Call"
                    >
                        <UserPlus size={19} />
                        <span className="hidden md:inline text-xs font-semibold">Add People</span>
                    </button>

                    {/* End / Leave Call Button */}
                    <button
                        onClick={endCall}
                        className="px-5 py-3 rounded-[6px] bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95 ml-1 border border-rose-500/30"
                        title={activeCall.isGroup ? 'Leave Call' : 'End Call'}
                    >
                        <PhoneOff size={17} />
                        <span className="hidden sm:inline">
                            {activeCall.isGroup ? 'Leave Call' : 'End Call'}
                        </span>
                    </button>
                </div>
            </div>

            {/* 4. INVITE PEOPLE MODAL */}
            {showInviteModal && (
                <div className="fixed inset-0 z-[99999999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#121620] border border-white/15 rounded-[6px] shadow-2xl max-w-md w-full overflow-hidden text-white animate-scale-in">
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <UserPlus size={18} className="text-[#2C4FD6]" />
                                <h3 className="text-sm font-bold">Invite People to Call</h3>
                            </div>
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="p-1 rounded-[6px] text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="p-3 border-b border-white/10 bg-[#0E1118]">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={inviteSearch}
                                    onChange={(e) => setInviteSearch(e.target.value)}
                                    placeholder="Search colleague by name or department..."
                                    className="w-full pl-8 pr-3 py-1.5 bg-white/10 border border-white/10 rounded-[6px] text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#2C4FD6]"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                            {loadingEmployees ? (
                                <div className="p-8 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                                    <Radio size={20} className="animate-spin text-blue-400" />
                                    Loading coworkers...
                                </div>
                            ) : (
                                employees
                                    .filter((emp) => emp.id !== user?.id)
                                    .filter((emp) =>
                                        emp.name?.toLowerCase().includes(inviteSearch.toLowerCase()) ||
                                        emp.employeeProfile?.department?.toLowerCase().includes(inviteSearch.toLowerCase())
                                    )
                                    .map((emp) => {
                                        const isInvited = invitedUserIds.includes(emp.id);
                                        const avatar = resolveAvatar(emp);
                                        return (
                                            <div
                                                key={emp.id}
                                                className="flex items-center justify-between p-2 rounded-[6px] hover:bg-white/5 transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-[#2C4FD6] to-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {avatar ? (
                                                            <img src={avatar} alt={emp.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            emp.name.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h5 className="text-xs font-semibold text-white leading-tight">{emp.name}</h5>
                                                        <p className="text-[11px] text-gray-400">{emp.employeeProfile?.title || 'Employee'}</p>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleInviteUser(emp)}
                                                    disabled={isInvited}
                                                    className={`px-3 py-1 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer ${
                                                        isInvited
                                                            ? 'bg-emerald-500/20 text-emerald-300'
                                                            : 'bg-[#2C4FD6] hover:bg-blue-600 text-white'
                                                    }`}
                                                >
                                                    {isInvited ? 'Invited' : 'Invite'}
                                                </button>
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
