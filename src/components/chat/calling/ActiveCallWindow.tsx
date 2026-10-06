import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Mic, MicOff, Video, VideoOff, ScreenShare,
    PhoneOff, Maximize2, Minimize2, Radio,
    MessageSquare, UserPlus, X, Send, Users, Search, Check
} from 'lucide-react';
import { useCall } from '../../../context/CallContext';
import { useAuth } from '../../../context/AuthContext';
import api, { getMediaUrl } from '../../../utils/api';
import type { InCallMessage } from '../../../types/chat';

export default function ActiveCallWindow() {
    const {
        activeCall,
        localStream,
        remoteStream,
        isMicMuted,
        isCameraOff,
        isScreenSharing,
        isMinimized,
        inCallMessages,
        sendInCallMessage,
        inviteToCall,
        toggleMic,
        toggleCamera,
        toggleScreenShare,
        setIsMinimized,
        endCall,
    } = useCall();
    const { user } = useAuth();

    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    const [duration, setDuration] = useState(0);
    const [showChat, setShowChat] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [inviteSearch, setInviteSearch] = useState('');
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [invitedUserIds, setInvitedUserIds] = useState<number[]>([]);

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

    // Auto-scroll in-call chat
    useEffect(() => {
        if (showChat) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [inCallMessages, showChat]);

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

    // --- Minimized floating PIP window ---
    if (isMinimized) {
        return createPortal(
            <div className="fixed bottom-6 right-6 z-[9999999] bg-[#12151C] text-white rounded-2xl shadow-2xl border border-gray-800 p-3.5 flex items-center gap-4 animate-scale-in">
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
            <div className="p-4 sm:p-5 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2C4FD6] to-indigo-500 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                        {partnerAvatar ? (
                            <img
                                src={partnerAvatar}
                                alt={activeCall.partnerName}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                            />
                        ) : activeCall.isGroup ? (
                            <Users size={18} />
                        ) : (
                            activeCall.partnerName.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                            {activeCall.partnerName}
                            <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                                {activeCall.isGroup ? 'Group Call' : activeCall.callType}
                            </span>
                            {activeCall.isGroup && activeCall.participants && (
                                <span className="text-[11px] text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full">
                                    {activeCall.participants.length + 1} participants
                                </span>
                            )}
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
                    {/* Minimize Button */}
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-200 transition-colors cursor-pointer"
                        title="Minimize"
                    >
                        <Minimize2 size={18} />
                    </button>
                </div>
            </div>

            {/* Main Stage & In-Call Chat Drawer */}
            <div className="flex-1 relative flex overflow-hidden">
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
                        /* Voice Call or Video Off / Group View Placeholder */
                        <div className="flex flex-col items-center justify-center text-center p-6 w-full max-w-2xl">
                            <div className="relative mb-5">
                                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-gradient-to-tr from-[#2C4FD6] to-indigo-600 p-1 relative z-10 shadow-2xl flex items-center justify-center">
                                    {partnerAvatar ? (
                                        <img
                                            src={partnerAvatar}
                                            alt={activeCall.partnerName}
                                            className="w-full h-full object-cover rounded-full"
                                            onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                        />
                                    ) : activeCall.isGroup ? (
                                        <Users size={48} className="text-white" />
                                    ) : (
                                        <span className="text-4xl sm:text-5xl font-bold text-white">
                                            {activeCall.partnerName.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold mb-1">{activeCall.partnerName}</h2>
                            <p className="text-sm text-gray-400 font-mono mb-4">
                                {activeCall.status === 'CONNECTED' ? formatDuration(duration) : 'Calling...'}
                            </p>

                            {/* Participant Badges for Group Call */}
                            {activeCall.participants && activeCall.participants.length > 0 && (
                                <div className="flex flex-wrap items-center justify-center gap-2 mt-2 max-w-md">
                                    <div className="px-2.5 py-1 rounded-full bg-white/10 text-xs text-gray-200 flex items-center gap-1.5 border border-white/5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                        You (Host)
                                    </div>
                                    {activeCall.participants.map((p) => {
                                        const pAvatar = resolveAvatar(p);
                                        return (
                                            <div
                                                key={p.id}
                                                className="px-2.5 py-1 rounded-full bg-white/10 text-xs text-gray-200 flex items-center gap-1.5 border border-white/5"
                                            >
                                                <div className="w-4 h-4 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-[9px] font-bold">
                                                    {pAvatar ? (
                                                        <img src={pAvatar} alt={p.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        p.name.charAt(0)
                                                    )}
                                                </div>
                                                {p.name}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
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

                {/* In-Call Chat Drawer (Side Panel) */}
                {showChat && (
                    <div className="w-80 sm:w-96 border-l border-white/10 bg-[#121620]/95 backdrop-blur-xl flex flex-col z-30 animate-fade-in shadow-2xl">
                        {/* Chat Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MessageSquare size={17} className="text-[#2C4FD6]" />
                                <h4 className="text-sm font-bold text-white">In-Call Messages</h4>
                            </div>
                            <button
                                onClick={() => setShowChat(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
                                    <p className="text-[11px] mt-1 text-gray-500">
                                        Send a message to everyone in this call.
                                    </p>
                                </div>
                            ) : (
                                inCallMessages.map((msg: InCallMessage) => {
                                    const isMe = msg.senderId === user?.id;
                                    const senderAvatar = msg.senderAvatar ? getMediaUrl(msg.senderAvatar) : null;

                                    return (
                                        <div
                                            key={msg.id}
                                            className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
                                        >
                                            <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                                                {senderAvatar ? (
                                                    <img
                                                        src={senderAvatar}
                                                        alt={msg.senderName}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    msg.senderName.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                <div className={`flex items-center gap-1.5 text-[10px] text-gray-400 mb-0.5 ${isMe ? 'justify-end' : ''}`}>
                                                    <span className="font-semibold text-gray-300">
                                                        {isMe ? 'You' : msg.senderName}
                                                    </span>
                                                    <span>{msg.time}</span>
                                                </div>
                                                <div
                                                    className={`p-2.5 rounded-xl text-xs break-words leading-relaxed ${
                                                        isMe
                                                            ? 'bg-[#2C4FD6] text-white rounded-tr-none'
                                                            : 'bg-white/10 text-gray-100 rounded-tl-none border border-white/5'
                                                    }`}
                                                >
                                                    {msg.text}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input */}
                        <form onSubmit={handleSendChatMessage} className="p-3 border-t border-white/10 bg-[#0E1118] flex items-center gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Message everyone in call..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#2C4FD6]"
                            />
                            <button
                                type="submit"
                                disabled={!chatInput.trim()}
                                className="p-2 rounded-xl bg-[#2C4FD6] hover:bg-blue-600 disabled:opacity-40 text-white transition-all cursor-pointer shadow-md shadow-blue-500/20"
                            >
                                <Send size={15} />
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Bottom Controls Bar */}
            <div className="p-5 pb-7 flex items-center justify-center gap-3 sm:gap-4 z-20 bg-gradient-to-t from-black/90 to-transparent">
                <div className="bg-[#1A1F2B]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2.5 px-4 sm:px-6 flex items-center gap-2.5 sm:gap-4 shadow-2xl">
                    {/* Toggle Mic */}
                    <button
                        onClick={toggleMic}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${isMicMuted ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title={isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
                    >
                        {isMicMuted ? <MicOff size={19} /> : <Mic size={19} />}
                    </button>

                    {/* Toggle Video */}
                    <button
                        onClick={toggleCamera}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${isCameraOff ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
                    >
                        {isCameraOff ? <VideoOff size={19} /> : <Video size={19} />}
                    </button>

                    {/* Share Screen */}
                    <button
                        onClick={toggleScreenShare}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${isScreenSharing ? 'bg-blue-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                    >
                        <ScreenShare size={19} />
                    </button>

                    {/* In-Call Chat Button */}
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className={`relative p-3 rounded-xl cursor-pointer transition-all ${showChat ? 'bg-[#2C4FD6] text-white shadow-lg shadow-blue-600/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
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
                        className="p-3 rounded-xl cursor-pointer transition-all bg-white/10 text-white hover:bg-white/20 flex items-center gap-1.5"
                        title="Add Users to Call"
                    >
                        <UserPlus size={19} />
                        <span className="hidden md:inline text-xs font-semibold">Add People</span>
                    </button>

                    {/* End Call Button */}
                    <button
                        onClick={endCall}
                        className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95 ml-1"
                    >
                        <PhoneOff size={17} />
                        <span className="hidden sm:inline">End Call</span>
                    </button>
                </div>
            </div>

            {/* Invite People Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-[99999999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#121620] border border-white/15 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-white animate-scale-in">
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <UserPlus size={18} className="text-[#2C4FD6]" />
                                <h3 className="text-sm font-bold">Invite People to Call</h3>
                            </div>
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
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
                                    placeholder="Search colleague to add..."
                                    className="w-full pl-9 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#2C4FD6]"
                                />
                            </div>
                        </div>

                        {/* Employee list */}
                        <div className="max-h-72 overflow-y-auto divide-y divide-white/5 p-2">
                            {loadingEmployees ? (
                                <div className="p-6 text-center text-xs text-gray-400">Loading colleagues...</div>
                            ) : (
                                employees
                                    .filter(
                                        (emp) =>
                                            Number(emp.id) !== Number(user?.id) &&
                                            (emp.name.toLowerCase().includes(inviteSearch.toLowerCase()) ||
                                                emp.email.toLowerCase().includes(inviteSearch.toLowerCase()))
                                    )
                                    .map((emp) => {
                                        const empAvatar = resolveAvatar(emp);
                                        const isAlreadyInCall =
                                            emp.id === activeCall.partnerId ||
                                            (activeCall.participants || []).some((p) => p.id === emp.id);
                                        const isInvited = invitedUserIds.includes(emp.id);

                                        return (
                                            <div
                                                key={emp.id}
                                                className="p-2.5 flex items-center justify-between hover:bg-white/5 rounded-xl transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {empAvatar ? (
                                                            <img
                                                                src={empAvatar}
                                                                alt={emp.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            emp.name.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h5 className="text-xs font-semibold">{emp.name}</h5>
                                                        <p className="text-[10px] text-gray-400">{emp.employeeProfile?.title || emp.email}</p>
                                                    </div>
                                                </div>

                                                {isAlreadyInCall ? (
                                                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                                                        In Call
                                                    </span>
                                                ) : isInvited ? (
                                                    <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                                        <Check size={11} /> Invited
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleInviteUser(emp)}
                                                        className="px-3 py-1 rounded-lg bg-[#2C4FD6] hover:bg-blue-600 text-white text-[11px] font-semibold transition-all cursor-pointer"
                                                    >
                                                        Invite
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-white/10 bg-[#0E1118] flex justify-end">
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-gray-300 transition-all cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
