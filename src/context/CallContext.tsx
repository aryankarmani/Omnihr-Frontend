import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { initSocketClient, getSocket } from '../services/socket';
import { webrtcService } from '../services/webrtc';
import type { IncomingCallData, ActiveCallState } from '../types/chat';
import IncomingCallModal from '../components/chat/calling/IncomingCallModal';
import ActiveCallWindow from '../components/chat/calling/ActiveCallWindow';
import toast from 'react-hot-toast';

interface CallContextType {
    incomingCall: IncomingCallData | null;
    activeCall: ActiveCallState | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isMicMuted: boolean;
    isCameraOff: boolean;
    isScreenSharing: boolean;
    isMinimized: boolean;
    startCall: (targetUserId: number, targetUserName: string, targetUserAvatar?: string | null, callType?: 'VOICE' | 'VIDEO') => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: (reason?: string) => void;
    endCall: () => void;
    toggleMic: () => void;
    toggleCamera: () => Promise<void>;
    toggleScreenShare: () => Promise<void>;
    setIsMinimized: (val: boolean) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
    const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const callTimerRef = useRef<number | null>(null);
    const callDurationRef = useRef<number>(0);

    // Initialize socket connection whenever user is authenticated
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const socket = initSocketClient();

        // 1. Incoming Call Event
        socket.on('incoming_call', (data: IncomingCallData) => {
            console.log('[CallContext] Received incoming call:', data);
            setIncomingCall(data);
        });

        // 2. Call Ringing acknowledgement
        socket.on('call_ringing', ({ callId }) => {
            setActiveCall(prev => prev ? { ...prev, callId, status: 'RINGING' } : null);
        });

        // 3. Call Accepted by receiver
        socket.on('call_accepted', async ({ callId, receiverId }) => {
            setActiveCall(prev => prev ? { ...prev, callId, status: 'CONNECTING' } : null);
            // Initiate WebRTC offer as the caller
            await webrtcService.createAndSendOffer();
        });

        // 4. Call Rejected
        socket.on('call_rejected', ({ reason }) => {
            toast.error(reason || 'Call declined');
            cleanupCall();
        });

        // 5. Call Cancelled by caller
        socket.on('call_cancelled', () => {
            setIncomingCall(null);
            toast('Call cancelled by caller', { icon: '📞' });
        });

        // 6. Call Ended
        socket.on('call_ended', () => {
            toast('Call ended', { icon: '📞' });
            cleanupCall();
        });

        // 7. Call Failed
        socket.on('call_failed', ({ reason }) => {
            toast.error(reason || 'Call failed');
            cleanupCall();
        });

        // 8. WebRTC Signaling Listeners
        socket.on('webrtc_offer', async ({ offer }) => {
            await webrtcService.handleOffer(offer);
        });

        socket.on('webrtc_answer', async ({ answer }) => {
            await webrtcService.handleAnswer(answer);
            setActiveCall(prev => prev ? { ...prev, status: 'CONNECTED' } : null);
        });

        socket.on('webrtc_ice_candidate', async ({ candidate }) => {
            await webrtcService.handleIceCandidate(candidate);
        });

        socket.on('screen_share_status', ({ isSharing }) => {
            if (isSharing) {
                toast('Remote user started sharing screen', { icon: '🖥️' });
            }
        });

        // Setup remote stream hook
        webrtcService.onRemoteStream = (stream) => {
            setRemoteStream(new MediaStream(stream.getTracks()));
            setActiveCall(prev => prev ? { ...prev, status: 'CONNECTED' } : null);
        };

        webrtcService.onConnectionStateChange = (state) => {
            if (state === 'connected') {
                setActiveCall(prev => prev ? { ...prev, status: 'CONNECTED' } : null);
            } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                cleanupCall();
            }
        };

        return () => {
            socket.off('incoming_call');
            socket.off('call_ringing');
            socket.off('call_accepted');
            socket.off('call_rejected');
            socket.off('call_cancelled');
            socket.off('call_ended');
            socket.off('call_failed');
            socket.off('webrtc_offer');
            socket.off('webrtc_answer');
            socket.off('webrtc_ice_candidate');
            socket.off('screen_share_status');
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

    const cleanupCall = () => {
        webrtcService.cleanup();
        setIncomingCall(null);
        setActiveCall(null);
        setLocalStream(null);
        setRemoteStream(null);
        setIsMicMuted(false);
        setIsCameraOff(false);
        setIsScreenSharing(false);
        setIsMinimized(false);
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }
    };

    // Caller initiates call
    const startCall = async (
        targetUserId: number,
        targetUserName: string,
        targetUserAvatar?: string | null,
        callType: 'VOICE' | 'VIDEO' = 'VIDEO'
    ) => {
        try {
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
            });

            const stream = await webrtcService.initializeCall(targetUserId, 0, callType);
            setLocalStream(stream);

            socket.emit('call_user', {
                receiverId: targetUserId,
                callType,
                callerName: user?.name,
                callerAvatar: user?.avatar || null,
            });
        } catch (err: any) {
            console.error('[Call] Start call failed:', err);
            toast.error(err.message || 'Could not access camera/microphone');
            cleanupCall();
        }
    };

    // Receiver accepts incoming call
    const acceptCall = async () => {
        if (!incomingCall) return;

        try {
            const socket = getSocket();
            const call = incomingCall;
            setIncomingCall(null);

            setActiveCall({
                callId: call.callId,
                partnerId: call.callerId,
                partnerName: call.callerName,
                partnerAvatar: call.callerAvatar,
                callType: call.callType,
                isInitiator: false,
                status: 'CONNECTING',
            });

            const stream = await webrtcService.initializeCall(call.callerId, call.callId, call.callType);
            setLocalStream(stream);

            socket?.emit('accept_call', {
                callId: call.callId,
                callerId: call.callerId,
            });
        } catch (err: any) {
            console.error('[Call] Accept call failed:', err);
            toast.error(err.message || 'Could not access camera/microphone');
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
        });
        setIncomingCall(null);
    };

    // End active call
    const endCall = () => {
        const socket = getSocket();
        if (activeCall) {
            if (activeCall.status === 'RINGING' && activeCall.isInitiator) {
                socket?.emit('cancel_call', {
                    callId: activeCall.callId,
                    receiverId: activeCall.partnerId,
                });
            } else {
                socket?.emit('end_call', {
                    callId: activeCall.callId,
                    targetUserId: activeCall.partnerId,
                    duration: callDurationRef.current,
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
        } else {
            const success = await webrtcService.startScreenShare();
            if (success) {
                setIsScreenSharing(true);
            }
        }
    };

    return (
        <CallContext.Provider
            value={{
                incomingCall,
                activeCall,
                localStream,
                remoteStream,
                isMicMuted,
                isCameraOff,
                isScreenSharing,
                isMinimized,
                startCall,
                acceptCall,
                rejectCall,
                endCall,
                toggleMic,
                toggleCamera,
                toggleScreenShare,
                setIsMinimized,
            }}
        >
            {children}

            {/* Global Incoming Call Popup */}
            {incomingCall && (
                <IncomingCallModal
                    call={incomingCall}
                    onAccept={acceptCall}
                    onReject={rejectCall}
                />
            )}

            {/* Global Active Call Window */}
            {activeCall && (
                <ActiveCallWindow />
            )}
        </CallContext.Provider>
    );
}

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
};
