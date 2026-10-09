import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { initSocketClient, getSocket } from '../services/socket';
import { webrtcService } from '../services/webrtc';
import type { IncomingCallData, ActiveCallState, InCallMessage, CallParticipant, RejoinCallData } from '../types/chat';
import IncomingCallModal from '../components/chat/calling/IncomingCallModal';
import ActiveCallWindow from '../components/chat/calling/ActiveCallWindow';
import { Video, Phone, X } from 'lucide-react';
import toast from 'react-hot-toast';

const formatMediaError = (err: any): string => {
    if (!err) return 'Could not access camera or microphone';
    const name = err.name || '';
    const msg = (err.message || '').toLowerCase();

    if (name === 'NotFoundError' || msg.includes('device not found') || msg.includes('not found')) {
        return 'No microphone or camera found on your device. Please plug in a headset/mic or webcam.';
    }
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || msg.includes('permission denied')) {
        return 'Microphone or camera access was blocked. Please allow permissions in your browser address bar.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError' || msg.includes('could not start')) {
        return 'Microphone or camera is currently in use by another application (e.g., Zoom, Teams).';
    }
    return err.message || 'Could not access camera or microphone';
};

interface CallContextType {
    incomingCall: IncomingCallData | null;
    activeCall: ActiveCallState | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    remoteStreams: Map<number, MediaStream>;
    screenStream: MediaStream | null;
    screenSharingUserId: number | null;
    activeSpeakerId: number | null;
    isMicMuted: boolean;
    isCameraOff: boolean;
    isScreenSharing: boolean;
    isMinimized: boolean;
    inCallMessages: InCallMessage[];
    isMyHandRaised: boolean;
    raisedHandUserIds: Set<number>;
    lastLeftCall: RejoinCallData | null;
    onlineUserIds: number[];
    isUserOnline: (userId?: number | string | null) => boolean;
    startCall: (targetUserId: number, targetUserName: string, targetUserAvatar?: string | null, callType?: 'VOICE' | 'VIDEO') => Promise<void>;
    startGroupCall: (groupTitle: string, participants: CallParticipant[], callType?: 'VOICE' | 'VIDEO', conversationId?: number) => Promise<void>;
    inviteToCall: (targetUserId: number, targetUserName: string, targetUserAvatar?: string | null) => Promise<void>;
    sendInCallMessage: (text: string) => void;
    acceptCall: () => Promise<void>;
    rejectCall: (reason?: string) => void;
    endCall: () => void;
    toggleMic: () => void;
    toggleCamera: () => Promise<void>;
    toggleScreenShare: () => Promise<void>;
    toggleRaiseHand: () => void;
    setIsMinimized: (val: boolean) => void;
    rejoinGroupCall: (callData?: RejoinCallData) => Promise<void>;
    dismissRejoin: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, hasPermission } = useAuth();
    const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
    const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<number, MediaStream>>(new Map());
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [screenSharingUserId, setScreenSharingUserId] = useState<number | null>(null);
    const [activeSpeakerId, setActiveSpeakerId] = useState<number | null>(null);

    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [inCallMessages, setInCallMessages] = useState<InCallMessage[]>([]);
    const [raisedHandUserIds, setRaisedHandUserIds] = useState<Set<number>>(new Set());
    const [lastLeftCall, setLastLeftCall] = useState<RejoinCallData | null>(null);
    const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);

    const isUserOnline = (userId?: number | string | null): boolean => {
        if (userId === undefined || userId === null) return false;
        return onlineUserIds.includes(Number(userId));
    };

    const callTimerRef = useRef<number | null>(null);
    const callDurationRef = useRef<number>(0);
    const speakerTimeoutRef = useRef<number | null>(null);

    // Initialize socket connection whenever user is authenticated
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const socket = initSocketClient();

        // 0. Real-time online presence tracking
        socket.on('online_users_list', (ids: number[]) => {
            if (Array.isArray(ids)) {
                setOnlineUserIds(ids.map(Number));
            }
        });

        socket.on('user_status_changed', ({ userId, status }: { userId: number | string; status: 'ONLINE' | 'OFFLINE' }) => {
            const numId = Number(userId);
            setOnlineUserIds((prev) =>
                status === 'ONLINE'
                    ? (prev.includes(numId) ? prev : [...prev, numId])
                    : prev.filter((id) => id !== numId)
            );
        });

        // Request online users on mount & reconnection
        socket.emit('get_online_users');
        const handleConnect = () => {
            socket.emit('get_online_users');
        };
        socket.on('connect', handleConnect);

        // 1. Incoming Call Event
        socket.on('incoming_call', (data: IncomingCallData) => {
            console.log('[CallContext] Received incoming call:', data);
            setIncomingCall(data);
        });

        // 2. Call Ringing acknowledgement
        socket.on('call_ringing', ({ callId }) => {
            setActiveCall(prev => prev ? { ...prev, callId, status: 'RINGING' } : null);
        });

        // 3. Call Accepted (1:1 or receiver acknowledgment)
        socket.on('call_accepted', async ({ callId, receiverId }) => {
            setActiveCall(prev => prev ? { ...prev, callId, status: 'CONNECTED' } : null);
            if (receiverId) {
                await webrtcService.createAndSendOffer(receiverId);
            }
        });

        // 4. Participant Joined (Group Call event)
        socket.on('participant_joined', async ({ callId, userId, userName, userAvatar }: { callId: number; userId: number; userName: string; userAvatar?: string }) => {
            if (userId === user.id) return;

            toast.success(`${userName} joined the call`, { icon: '👋' });

            setActiveCall(prev => {
                if (!prev) return null;
                const existing = prev.participants || [];
                const updated = existing.some(p => p.id === userId)
                    ? existing
                    : [...existing, { id: userId, name: userName, avatar: userAvatar || null }];
                return {
                    ...prev,
                    callId,
                    status: 'CONNECTED',
                    isGroup: true,
                    participants: updated,
                };
            });

            // As an existing participant, send offer to the newcomer
            await webrtcService.createAndSendOffer(userId);
        });

        // 5. Participant Left (Group Call event - WhatsApp style: call continues!)
        socket.on('participant_left', ({ userId, userName }: { callId: number; userId: number; userName: string }) => {
            toast(`${userName} left the call`, { icon: '📞' });
            webrtcService.removePeer(userId);

            setScreenSharingUserId(prev => prev === userId ? null : prev);

            setActiveCall(prev => {
                if (!prev) return null;
                const updated = (prev.participants || []).filter(p => p.id !== userId);
                return {
                    ...prev,
                    participants: updated,
                };
            });
        });

        // 6. Participant Declined (Invited user declined, call continues for others)
        socket.on('participant_declined', ({ userName, reason }: { userId: number; userName: string; reason?: string }) => {
            toast(`${userName} is unavailable (${reason || 'busy'})`, { icon: 'ℹ️' });
        });

        // 7. Call Rejected (1:1 call declined by receiver)
        socket.on('call_rejected', ({ reason }) => {
            toast.error(reason || 'Call declined');
            cleanupCall();
        });

        // 8. Call Cancelled by caller
        socket.on('call_cancelled', () => {
            setIncomingCall(null);
            toast('Call cancelled by caller', { icon: '📞' });
        });

        // 9. Call Ended globally (host ended for everyone or 1:1 call completed)
        socket.on('call_ended', (data?: { callId?: number }) => {
            toast('Call ended', { icon: '📞' });
            if (data?.callId) {
                setLastLeftCall(prev => prev?.callId === data.callId ? null : prev);
            } else {
                setLastLeftCall(null);
            }
            cleanupCall();
        });

        // 10. Call Failed
        socket.on('call_failed', ({ reason }) => {
            toast.error(reason || 'Call failed');
            if (reason && reason.toLowerCase().includes('ended')) {
                setLastLeftCall(null);
            }
            cleanupCall();
        });

        // Hand Raise listener (Google Meet style)
        socket.on('call_hand_raise', ({ userId, userName, isRaised }: { callId?: number; userId: number; userName: string; isRaised: boolean }) => {
            setRaisedHandUserIds(prev => {
                const next = new Set(prev);
                if (isRaised) {
                    next.add(userId);
                    if (Number(userId) !== Number(user?.id)) {
                        toast(`${userName} raised their hand`, { icon: '✋' });
                    }
                } else {
                    next.delete(userId);
                }
                return next;
            });
        });

        // 11. WebRTC Signaling Listeners
        socket.on('webrtc_offer', async ({ senderId, offer }: { senderId: number; offer: RTCSessionDescriptionInit }) => {
            if (senderId) {
                await webrtcService.handleOffer(senderId, offer);
                setActiveCall(prev => prev ? { ...prev, status: 'CONNECTED' } : null);
            }
        });

        socket.on('webrtc_answer', async ({ senderId, answer }: { senderId: number; answer: RTCSessionDescriptionInit }) => {
            if (senderId) {
                await webrtcService.handleAnswer(senderId, answer);
                setActiveCall(prev => prev ? { ...prev, status: 'CONNECTED' } : null);
            }
        });

        socket.on('webrtc_ice_candidate', async ({ senderId, candidate }: { senderId: number; candidate: RTCIceCandidateInit }) => {
            if (senderId && candidate) {
                await webrtcService.handleIceCandidate(senderId, candidate);
            }
        });

        // 12. Screen share toggle notification from peers
        socket.on('screen_share_status', ({ senderId, isSharing }: { senderId: number; isSharing: boolean }) => {
            if (isSharing) {
                setScreenSharingUserId(senderId);
                toast('A participant started sharing their screen', { icon: '🖥️' });
            } else {
                setScreenSharingUserId(prev => prev === senderId ? null : prev);
            }
        });

        // In-call chat message
        socket.on('call_chat_message', (msg: InCallMessage) => {
            setInCallMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        });

        // Setup remote stream hooks
        webrtcService.onRemoteStreamsChange = (streams) => {
            setRemoteStreams(new Map(streams));
            if (streams.size > 0) {
                const firstStream = Array.from(streams.values())[0];
                setRemoteStream(firstStream);
                setActiveCall(prev => prev ? { ...prev, status: 'CONNECTED' } : null);
            }
        };

        webrtcService.onRemoteStream = (stream) => {
            setRemoteStream(stream);
            setActiveCall(prev => prev ? { ...prev, status: 'CONNECTED' } : null);
        };

        webrtcService.onConnectionStateChange = (state) => {
            if (state === 'connected') {
                setActiveCall(prev => prev ? { ...prev, status: 'CONNECTED' } : null);
            }
        };

        webrtcService.onScreenShareEnded = () => {
            setIsScreenSharing(false);
            setScreenStream(null);
            setScreenSharingUserId(null);
        };

        return () => {
            socket.off('connect', handleConnect);
            socket.off('online_users_list');
            socket.off('user_status_changed');
            socket.off('incoming_call');
            socket.off('call_ringing');
            socket.off('call_accepted');
            socket.off('participant_joined');
            socket.off('participant_left');
            socket.off('participant_declined');
            socket.off('call_rejected');
            socket.off('call_cancelled');
            socket.off('call_ended');
            socket.off('call_failed');
            socket.off('webrtc_offer');
            socket.off('webrtc_answer');
            socket.off('webrtc_ice_candidate');
            socket.off('screen_share_status');
            socket.off('call_chat_message');
        };
    }, [isAuthenticated, user?.id]);

    // Timer for active call duration
    useEffect(() => {
        if (activeCall?.status === 'CONNECTED') {
            callDurationRef.current = 0;
            callTimerRef.current = window.setInterval(() => {
                callDurationRef.current += 1;
            }, 1000);
        } else {
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
                callTimerRef.current = null;
            }
        }
        return () => {
            if (callTimerRef.current) clearInterval(callTimerRef.current);
        };
    }, [activeCall?.status]);

    // Active speaker detection via Web Audio Analyser
    useEffect(() => {
        if (activeCall?.status !== 'CONNECTED') return;

        let audioCtx: AudioContext | null = null;
        let isCancelled = false;

        try {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (_) {
            return;
        }

        const analysers: { id: number; analyser: AnalyserNode; dataArray: Uint8Array<ArrayBuffer> }[] = [];

        // Local analyser
        if (localStream && !isMicMuted && user?.id) {
            try {
                const source = audioCtx.createMediaStreamSource(localStream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                analysers.push({
                    id: Number(user.id),
                    analyser,
                    dataArray: new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)),
                });
            } catch (_) {}
        }

        // Remote analysers
        remoteStreams.forEach((stream, pId) => {
            try {
                if (stream.getAudioTracks().length > 0 && audioCtx) {
                    const source = audioCtx.createMediaStreamSource(stream);
                    const analyser = audioCtx.createAnalyser();
                    analyser.fftSize = 256;
                    source.connect(analyser);
                    analysers.push({
                        id: pId,
                        analyser,
                        dataArray: new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)),
                    });
                }
            } catch (_) {}
        });

        const checkSpeaker = () => {
            if (isCancelled) return;

            let highestVol = 0;
            let currentSpeaker: number | null = null;

            analysers.forEach(({ id, analyser, dataArray }) => {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                if (avg > 18 && avg > highestVol) {
                    highestVol = avg;
                    currentSpeaker = id;
                }
            });

            if (currentSpeaker !== null) {
                setActiveSpeakerId(currentSpeaker);
                if (speakerTimeoutRef.current) clearTimeout(speakerTimeoutRef.current);
                speakerTimeoutRef.current = window.setTimeout(() => {
                    setActiveSpeakerId(null);
                }, 1500);
            }
        };

        const interval = window.setInterval(checkSpeaker, 300);

        return () => {
            isCancelled = true;
            clearInterval(interval);
            if (speakerTimeoutRef.current) clearTimeout(speakerTimeoutRef.current);
            if (audioCtx) audioCtx.close().catch(() => {});
        };
    }, [activeCall?.status, localStream, remoteStreams, isMicMuted, user?.id]);

    const cleanupCall = () => {
        webrtcService.cleanup();
        setIncomingCall(null);
        setActiveCall(null);
        setLocalStream(null);
        setRemoteStream(null);
        setRemoteStreams(new Map());
        setScreenStream(null);
        setScreenSharingUserId(null);
        setActiveSpeakerId(null);
        setIsMicMuted(false);
        setIsCameraOff(false);
        setIsScreenSharing(false);
        setIsMinimized(false);
        setInCallMessages([]);
        setRaisedHandUserIds(new Set());
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }
    };

    // Caller initiates 1-on-1 call
    const startCall = async (
        targetUserId: number,
        targetUserName: string,
        targetUserAvatar?: string | null,
        callType: 'VOICE' | 'VIDEO' = 'VIDEO'
    ) => {
        try {
            if (!hasPermission('CHAT_CALL')) {
                toast.error("You don't have access to this", { id: 'access-control-denied-toast' });
                return;
            }

            const socket = getSocket();
            if (!socket || !socket.connected) {
                toast.error('Not connected to communication server');
                return;
            }

            setActiveCall({
                callId: 0,
                partnerId: targetUserId,
                partnerName: targetUserName,
                partnerAvatar: targetUserAvatar || null,
                callType,
                isInitiator: true,
                status: 'RINGING',
                isGroup: false,
                participants: [{ id: targetUserId, name: targetUserName, avatar: targetUserAvatar || null }],
            });

            const { stream, fallbackToAudioOnly, listenOnly } = await webrtcService.initializeCall(targetUserId, 0, callType);
            setLocalStream(stream);

            if (fallbackToAudioOnly) {
                toast('No camera detected. Started call with voice only.', { icon: '📷' });
            }
            if (listenOnly) {
                toast('No microphone detected. You joined in listen-only mode.', { icon: '🎧' });
            }

            socket.emit('call_user', {
                receiverId: targetUserId,
                callType: fallbackToAudioOnly ? 'VOICE' : callType,
                callerName: user?.name,
                callerAvatar: user?.avatar || null,
            });
        } catch (err: any) {
            console.error('[Call] Start call failed:', err);
            toast.error(formatMediaError(err));
            cleanupCall();
        }
    };

    // Group call initiation
    const startGroupCall = async (
        groupTitle: string,
        participants: CallParticipant[],
        callType: 'VOICE' | 'VIDEO' = 'VIDEO',
        conversationId?: number
    ) => {
        try {
            if (!hasPermission('CHAT_CALL')) {
                toast.error("You don't have access to this", { id: 'access-control-denied-toast' });
                return;
            }

            const socket = getSocket();
            if (!socket || !socket.connected) {
                toast.error('Not connected to communication server');
                return;
            }

            setActiveCall({
                callId: 0,
                partnerId: 0,
                partnerName: groupTitle,
                partnerAvatar: null,
                callType,
                isInitiator: true,
                status: 'RINGING',
                isGroup: true,
                conversationId,
                participants,
            });

            // Initialize local stream with fallbacks
            const { stream, fallbackToAudioOnly, listenOnly } = await webrtcService.initializeCall(0, 0, callType);
            setLocalStream(stream);

            if (fallbackToAudioOnly) {
                toast('No camera detected. Started call with voice only.', { icon: '📷' });
            }
            if (listenOnly) {
                toast('No microphone detected. You joined in listen-only mode.', { icon: '🎧' });
            }

            socket.emit('group_call_user', {
                groupTitle,
                participantIds: participants.map(p => p.id),
                callType: fallbackToAudioOnly ? 'VOICE' : callType,
                callerAvatar: user?.avatar || null,
                conversationId,
            });
        } catch (err: any) {
            console.error('[Call] Start group call failed:', err);
            toast.error(formatMediaError(err));
            cleanupCall();
        }
    };

    // Invite user to active call
    const inviteToCall = async (
        targetUserId: number,
        targetUserName: string,
        targetUserAvatar?: string | null
    ) => {
        try {
            const socket = getSocket();
            if (!socket || !socket.connected) {
                toast.error('Not connected to communication server');
                return;
            }

            socket.emit('invite_to_call', {
                callId: activeCall?.callId || 0,
                targetUserId,
                callType: activeCall?.callType || 'VIDEO',
                callerAvatar: user?.avatar || null,
                callTitle: activeCall?.isGroup ? activeCall.partnerName : undefined,
            });

            // Update participant list in active call
            setActiveCall(prev => {
                if (!prev) return null;
                const existing = prev.participants || [];
                if (existing.some(p => p.id === targetUserId)) return prev;
                return {
                    ...prev,
                    isGroup: true,
                    participants: [...existing, { id: targetUserId, name: targetUserName, avatar: targetUserAvatar || null }],
                };
            });

            toast.success(`Invited ${targetUserName} to call`);
        } catch (err: any) {
            console.error('[Call] Invite to call error:', err);
            toast.error('Failed to invite user');
        }
    };

    // Send in-call chat message
    const sendInCallMessage = (text: string) => {
        if (!text.trim() || !activeCall) return;
        const socket = getSocket();
        if (!socket || !socket.connected) {
            toast.error('Chat not connected');
            return;
        }

        const targetUserIds = activeCall.isGroup
            ? (activeCall.participants || []).map(p => p.id)
            : [activeCall.partnerId];

        socket.emit('call_chat_message', {
            targetUserIds,
            text: text.trim(),
            senderName: user?.name,
            senderAvatar: user?.avatar || null,
        });
    };

    // Receiver accepts incoming call
    const acceptCall = async () => {
        if (!incomingCall) return;
        const socket = getSocket();
        const call = incomingCall;

        try {
            setIncomingCall(null);

            setActiveCall({
                callId: call.callId,
                partnerId: call.callerId,
                partnerName: call.callerName,
                partnerAvatar: call.callerAvatar,
                callType: call.callType,
                isInitiator: false,
                status: 'CONNECTING',
                isGroup: call.isGroup,
                conversationId: call.conversationId,
                participants: call.isGroup ? [{ id: call.callerId, name: call.callerName, avatar: call.callerAvatar }] : undefined,
            });

            const { stream, fallbackToAudioOnly, listenOnly } = await webrtcService.initializeCall(call.callerId, call.callId, call.callType);
            setLocalStream(stream);

            if (fallbackToAudioOnly) {
                toast('No camera detected. Accepted call with voice only.', { icon: '📷' });
            }
            if (listenOnly) {
                toast('No microphone detected. You joined in listen-only mode.', { icon: '🎧' });
            }

            socket?.emit('accept_call', {
                callId: call.callId,
                callerId: call.callerId,
                isGroup: call.isGroup,
            });
        } catch (err: any) {
            console.error('[Call] Accept call failed:', err);
            const userMsg = formatMediaError(err);
            toast.error(userMsg);
            socket?.emit('reject_call', {
                callId: call.callId,
                callerId: call.callerId,
                reason: userMsg,
                isGroup: call.isGroup,
            });
            cleanupCall();
        }
    };

    // Receiver rejects call
    const rejectCall = (reason = 'Declined') => {
        if (!incomingCall) return;
        const socket = getSocket();
        socket?.emit('reject_call', {
            callId: incomingCall.callId,
            callerId: incomingCall.callerId,
            reason,
            isGroup: incomingCall.isGroup,
        });
        setIncomingCall(null);
    };

    // End active call (Google Meet / WhatsApp style: group call allows leaving & rejoining)
    const endCall = () => {
        const socket = getSocket();
        if (activeCall) {
            if (activeCall.status === 'RINGING' && activeCall.isInitiator && !activeCall.isGroup) {
                socket?.emit('cancel_call', {
                    callId: activeCall.callId,
                    receiverId: activeCall.partnerId,
                });
            } else if (activeCall.isGroup) {
                // In group call, this user leaves the call room
                socket?.emit('leave_group_call', {
                    callId: activeCall.callId,
                });
                // Save rejoin data so user can re-enter Google Meet style
                setLastLeftCall({
                    callId: activeCall.callId,
                    conversationId: activeCall.conversationId,
                    groupTitle: activeCall.partnerName,
                    callType: activeCall.callType,
                    participants: activeCall.participants || [],
                });
            } else {
                // 1:1 call end
                socket?.emit('end_call', {
                    callId: activeCall.callId,
                    targetUserId: activeCall.partnerId,
                    duration: callDurationRef.current,
                    isGroup: false,
                });
            }
        }
        cleanupCall();
    };

    const toggleMic = () => {
        const isEnabled = webrtcService.toggleAudio();
        setIsMicMuted(!isEnabled);
    };

    const toggleCamera = async () => {
        const isEnabled = await webrtcService.toggleVideo();
        setIsCameraOff(!isEnabled);
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            await webrtcService.stopScreenShare();
            setIsScreenSharing(false);
            setScreenStream(null);
            setScreenSharingUserId(null);
        } else {
            const success = await webrtcService.startScreenShare();
            if (success) {
                setIsScreenSharing(true);
                setScreenStream(webrtcService.getScreenStream());
                setScreenSharingUserId(user?.id ? Number(user.id) : null);
            }
        }
    };

    // Toggle Raise Hand (Google Meet Style)
    const isMyHandRaised = user?.id ? raisedHandUserIds.has(Number(user.id)) : false;

    const toggleRaiseHand = () => {
        const socket = getSocket();
        if (!socket || !activeCall) return;
        const nextState = !isMyHandRaised;
        socket.emit('call_hand_raise', {
            callId: activeCall.callId,
            targetUserId: activeCall.partnerId,
            isRaised: nextState,
        });
    };

    // Rejoin Group Call (Google Meet Style)
    const dismissRejoin = () => {
        setLastLeftCall(null);
    };

    const rejoinGroupCall = async (callData?: RejoinCallData) => {
        const target = callData || lastLeftCall;
        if (!target) return;

        try {
            const socket = getSocket();
            if (!socket || !socket.connected) {
                toast.error('Not connected to communication server');
                return;
            }

            setActiveCall({
                callId: target.callId,
                partnerId: 0,
                partnerName: target.groupTitle,
                partnerAvatar: null,
                callType: target.callType,
                isInitiator: false,
                status: 'CONNECTED',
                isGroup: true,
                conversationId: target.conversationId,
                participants: target.participants || [],
            });

            // Initialize local camera/mic stream with fallbacks
            const { stream, fallbackToAudioOnly, listenOnly } = await webrtcService.initializeCall(0, target.callId, target.callType);
            setLocalStream(stream);

            if (fallbackToAudioOnly) {
                toast('No camera detected. Rejoined call with voice only.', { icon: '📷' });
            }
            if (listenOnly) {
                toast('No microphone detected. You joined in listen-only mode.', { icon: '🎧' });
            }

            // Notify backend room to re-join and alert peers to send WebRTC offer
            socket.emit('rejoin_group_call', {
                callId: target.callId,
            });

            setLastLeftCall(null);
            toast.success(`Rejoined ${target.groupTitle}`);
        } catch (err: any) {
            console.error('[Call] Rejoin call failed:', err);
            toast.error(formatMediaError(err));
            cleanupCall();
        }
    };

    return (
        <CallContext.Provider
            value={{
                incomingCall,
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
                lastLeftCall,
                onlineUserIds,
                isUserOnline,
                startCall,
                startGroupCall,
                inviteToCall,
                sendInCallMessage,
                acceptCall,
                rejectCall,
                endCall,
                toggleMic,
                toggleCamera,
                toggleScreenShare,
                toggleRaiseHand,
                setIsMinimized,
                rejoinGroupCall,
                dismissRejoin,
            }}
        >
            {children}

            {/* Global Incoming Call Modal */}
            {incomingCall && (
                <IncomingCallModal
                    call={incomingCall}
                    onAccept={acceptCall}
                    onReject={rejectCall}
                />
            )}

            {/* Global Active Call Window (1-on-1 or Group) */}
            {activeCall && (
                <ActiveCallWindow />
            )}

            {/* Google Meet Style "You left the meeting" Rejoin Prompt */}
            {lastLeftCall && !activeCall && (
                <div className="fixed bottom-6 right-6 z-[999999] max-w-sm w-full bg-[#121620] border border-white/15 rounded-[6px] shadow-2xl p-4 text-white animate-fade-in">
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-[6px] bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                                {lastLeftCall.callType === 'VIDEO' ? <Video size={18} /> : <Phone size={18} />}
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white">You left the meeting</h4>
                                <p className="text-[11px] text-gray-400 truncate max-w-[190px]">{lastLeftCall.groupTitle}</p>
                            </div>
                        </div>
                        <button
                            onClick={dismissRejoin}
                            className="text-gray-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
                        >
                            <X size={15} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => rejoinGroupCall()}
                            className="flex-1 py-2 bg-[#2C4FD6] hover:bg-blue-600 text-white font-semibold text-xs rounded-[6px] transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
                        >
                            {lastLeftCall.callType === 'VIDEO' ? <Video size={14} /> : <Phone size={14} />}
                            Rejoin Call
                        </button>
                        <button
                            onClick={dismissRejoin}
                            className="px-3 py-2 bg-white/10 hover:bg-white/15 text-gray-300 font-semibold text-xs rounded-[6px] transition-all cursor-pointer"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}
        </CallContext.Provider>
    );
}

export function useCall() {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
}
