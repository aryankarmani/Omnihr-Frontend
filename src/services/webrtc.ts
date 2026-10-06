import { getSocket } from './socket';

const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
    ]
};

export class WebRTCService {
    // Multi-peer map for group & 1:1 calling
    private peers: Map<number, RTCPeerConnection> = new Map();
    private remoteStreams: Map<number, MediaStream> = new Map();
    private iceCandidatesQueues: Map<number, RTCIceCandidateInit[]> = new Map();

    private localStream: MediaStream | null = null;
    private screenStream: MediaStream | null = null;
    private defaultTargetUserId: number | null = null;
    private callId: number | null = null;

    // Callbacks
    public onRemoteStream?: (stream: MediaStream, userId?: number) => void;
    public onRemoteStreamsChange?: (streams: Map<number, MediaStream>) => void;
    public onConnectionStateChange?: (state: RTCPeerConnectionState, userId?: number) => void;
    public onParticipantDisconnected?: (userId: number) => void;
    public onScreenShareEnded?: () => void;

    constructor() {}

    public getLocalStream(): MediaStream | null {
        return this.localStream;
    }

    public getScreenStream(): MediaStream | null {
        return this.screenStream;
    }

    public getRemoteStreams(): Map<number, MediaStream> {
        return new Map(this.remoteStreams);
    }

    public async initializeCall(
        targetUserId: number,
        callId: number,
        callType: 'VOICE' | 'VIDEO'
    ): Promise<MediaStream> {
        this.cleanup();
        this.defaultTargetUserId = targetUserId > 0 ? targetUserId : null;
        this.callId = callId > 0 ? callId : null;

        // 1. Get user media (microphone + optional camera)
        this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: callType === 'VIDEO' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
        });

        // 2. In 1:1 call, pre-create the peer connection
        if (targetUserId > 0) {
            this.getOrCreatePeer(targetUserId);
        }

        return this.localStream;
    }

    public getOrCreatePeer(remoteUserId: number): RTCPeerConnection {
        if (this.peers.has(remoteUserId)) {
            return this.peers.get(remoteUserId)!;
        }

        const pc = new RTCPeerConnection(RTC_CONFIG);
        const remoteMediaStream = new MediaStream();
        this.remoteStreams.set(remoteUserId, remoteMediaStream);

        // Add local tracks to this peer
        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => {
                try {
                    pc.addTrack(track, this.localStream!);
                } catch (e) {
                    console.warn(`[WebRTC] Could not add track to peer ${remoteUserId}:`, e);
                }
            });
        }

        // Handle remote tracks
        pc.ontrack = (event) => {
            let stream = this.remoteStreams.get(remoteUserId);
            if (!stream) {
                stream = new MediaStream();
                this.remoteStreams.set(remoteUserId, stream);
            }

            if (event.streams && event.streams[0]) {
                this.remoteStreams.set(remoteUserId, event.streams[0]);
                stream = event.streams[0];
            } else {
                stream.addTrack(event.track);
            }

            if (this.onRemoteStreamsChange) {
                this.onRemoteStreamsChange(new Map(this.remoteStreams));
            }
            if (this.onRemoteStream && stream) {
                this.onRemoteStream(stream, remoteUserId);
            }
        };

        // ICE candidate generated locally -> send to target peer
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                const socket = getSocket();
                socket?.emit('webrtc_ice_candidate', {
                    targetUserId: remoteUserId,
                    candidate: event.candidate,
                    callId: this.callId,
                });
            }
        };

        // Connection state changes
        pc.onconnectionstatechange = () => {
            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(pc.connectionState, remoteUserId);
            }
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                this.removePeer(remoteUserId);
            }
        };

        this.peers.set(remoteUserId, pc);
        return pc;
    }

    // Called to create offer to a specific peer (or default 1:1 target)
    public async createAndSendOffer(targetUserId?: number): Promise<void> {
        const destUserId = targetUserId || this.defaultTargetUserId;
        if (!destUserId) return;

        const pc = this.getOrCreatePeer(destUserId);

        const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

        const socket = getSocket();
        socket?.emit('webrtc_offer', {
            targetUserId: destUserId,
            offer,
            callId: this.callId,
        });
    }

    // Called by receiver when receiving offer from a sender
    public async handleOffer(senderId: number, offer: RTCSessionDescriptionInit): Promise<void> {
        const pc = this.getOrCreatePeer(senderId);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Process any queued candidates for this sender
        const queue = this.iceCandidatesQueues.get(senderId) || [];
        while (queue.length > 0) {
            const candidate = queue.shift();
            if (candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.warn(`[WebRTC] Error adding queued ICE candidate for ${senderId}:`, e);
                }
            }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        const socket = getSocket();
        socket?.emit('webrtc_answer', {
            targetUserId: senderId,
            answer,
            callId: this.callId,
        });
    }

    // Called by caller when receiving answer from a sender
    public async handleAnswer(senderId: number, answer: RTCSessionDescriptionInit): Promise<void> {
        const pc = this.peers.get(senderId);
        if (!pc) return;

        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        // Process any queued candidates for this sender
        const queue = this.iceCandidatesQueues.get(senderId) || [];
        while (queue.length > 0) {
            const candidate = queue.shift();
            if (candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.warn(`[WebRTC] Error adding queued ICE candidate for ${senderId}:`, e);
                }
            }
        }
    }

    // Handle ICE Candidate from a sender
    public async handleIceCandidate(senderId: number, candidate: RTCIceCandidateInit): Promise<void> {
        const pc = this.peers.get(senderId);
        if (pc && pc.remoteDescription) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.warn(`[WebRTC] Error adding ICE candidate for ${senderId}:`, e);
            }
        } else {
            if (!this.iceCandidatesQueues.has(senderId)) {
                this.iceCandidatesQueues.set(senderId, []);
            }
            this.iceCandidatesQueues.get(senderId)!.push(candidate);
        }
    }

    // Remove single peer when they leave a group call
    public removePeer(userId: number): void {
        const pc = this.peers.get(userId);
        if (pc) {
            try {
                pc.close();
            } catch (_) {}
            this.peers.delete(userId);
        }
        this.remoteStreams.delete(userId);
        this.iceCandidatesQueues.delete(userId);

        if (this.onRemoteStreamsChange) {
            this.onRemoteStreamsChange(new Map(this.remoteStreams));
        }
        if (this.onParticipantDisconnected) {
            this.onParticipantDisconnected(userId);
        }
    }

    // Toggle Microphone across local stream
    public toggleAudio(enabled?: boolean): boolean {
        if (!this.localStream) return false;
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = enabled !== undefined ? enabled : !audioTrack.enabled;
            return audioTrack.enabled;
        }
        return false;
    }

    // Toggle Camera across all connected peers
    public async toggleVideo(enabled?: boolean): Promise<boolean> {
        if (!this.localStream) return false;
        let videoTrack = this.localStream.getVideoTracks()[0];

        if (videoTrack) {
            videoTrack.enabled = enabled !== undefined ? enabled : !videoTrack.enabled;
            return videoTrack.enabled;
        } else if (enabled !== false) {
            // Camera was off, request a new video track
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 } }
                });
                videoTrack = stream.getVideoTracks()[0];
                this.localStream.addTrack(videoTrack);

                // Replace/add track to all active peer connections
                for (const pc of this.peers.values()) {
                    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
                    if (sender) {
                        await sender.replaceTrack(videoTrack);
                    } else {
                        pc.addTrack(videoTrack, this.localStream);
                    }
                }
                return true;
            } catch (e) {
                console.error('[WebRTC] Failed to enable camera', e);
                return false;
            }
        }
        return false;
    }

    // Start Screen Share across all connected peers
    public async startScreenShare(): Promise<boolean> {
        try {
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });

            const screenTrack = this.screenStream.getVideoTracks()[0];

            screenTrack.onended = () => {
                this.stopScreenShare();
            };

            for (const pc of this.peers.values()) {
                const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
                if (sender) {
                    await sender.replaceTrack(screenTrack);
                }
            }

            const socket = getSocket();
            socket?.emit('screen_share_status', {
                targetUserId: this.defaultTargetUserId || 0,
                isSharing: true,
                callId: this.callId,
            });

            return true;
        } catch (e) {
            console.warn('[WebRTC] Screen share cancelled or failed', e);
            return false;
        }
    }

    // Stop Screen Share & restore camera track across all peers
    public async stopScreenShare(): Promise<void> {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach((t) => t.stop());
            this.screenStream = null;
        }

        const cameraTrack = this.localStream?.getVideoTracks()[0] || null;

        for (const pc of this.peers.values()) {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) {
                await sender.replaceTrack(cameraTrack);
            }
        }

        const socket = getSocket();
        socket?.emit('screen_share_status', {
            targetUserId: this.defaultTargetUserId || 0,
            isSharing: false,
            callId: this.callId,
        });

        if (this.onScreenShareEnded) {
            this.onScreenShareEnded();
        }
    }

    // Clean up entire call session
    public cleanup(): void {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach((t) => t.stop());
            this.screenStream = null;
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach((t) => t.stop());
            this.localStream = null;
        }

        for (const pc of this.peers.values()) {
            try {
                pc.close();
            } catch (_) {}
        }
        this.peers.clear();
        this.remoteStreams.clear();
        this.iceCandidatesQueues.clear();

        this.defaultTargetUserId = null;
        this.callId = null;

        if (this.onRemoteStreamsChange) {
            this.onRemoteStreamsChange(new Map());
        }
    }
}

export const webrtcService = new WebRTCService();
