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
    private peerConnection: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private screenStream: MediaStream | null = null;
    private targetUserId: number | null = null;
    private callId: number | null = null;
    private iceCandidatesQueue: RTCIceCandidateInit[] = [];

    public onRemoteStream?: (stream: MediaStream) => void;
    public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;

    constructor() {}

    public async initializeCall(
        targetUserId: number,
        callId: number,
        callType: 'VOICE' | 'VIDEO'
    ): Promise<MediaStream> {
        this.targetUserId = targetUserId;
        this.callId = callId;

        // 1. Get user media (microphone + optional camera)
        this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: callType === 'VIDEO' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
        });

        // 2. Setup RTCPeerConnection
        this.setupPeerConnection();

        // 3. Add local tracks to peer connection
        this.localStream.getTracks().forEach((track) => {
            if (this.peerConnection && this.localStream) {
                this.peerConnection.addTrack(track, this.localStream);
            }
        });

        return this.localStream;
    }

    private setupPeerConnection() {
        this.peerConnection = new RTCPeerConnection(RTC_CONFIG);
        this.remoteStream = new MediaStream();

        // Remote track received
        this.peerConnection.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                this.remoteStream = event.streams[0];
            } else {
                this.remoteStream?.addTrack(event.track);
            }
            if (this.onRemoteStream && this.remoteStream) {
                this.onRemoteStream(this.remoteStream);
            }
        };

        // ICE candidate generated locally -> send to peer via socket
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.targetUserId) {
                const socket = getSocket();
                socket?.emit('webrtc_ice_candidate', {
                    targetUserId: this.targetUserId,
                    candidate: event.candidate,
                });
            }
        };

        // Connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            if (this.peerConnection && this.onConnectionStateChange) {
                this.onConnectionStateChange(this.peerConnection.connectionState);
            }
        };
    }

    // Called by the caller to create offer
    public async createAndSendOffer(): Promise<void> {
        if (!this.peerConnection || !this.targetUserId) return;

        const offer = await this.peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        });
        await this.peerConnection.setLocalDescription(offer);

        const socket = getSocket();
        socket?.emit('webrtc_offer', {
            targetUserId: this.targetUserId,
            offer,
            callId: this.callId,
        });
    }

    // Called by receiver when receiving offer
    public async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.peerConnection || !this.targetUserId) return;

        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        // Process any queued candidates
        while (this.iceCandidatesQueue.length > 0) {
            const candidate = this.iceCandidatesQueue.shift();
            if (candidate) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        }

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        const socket = getSocket();
        socket?.emit('webrtc_answer', {
            targetUserId: this.targetUserId,
            answer,
            callId: this.callId,
        });
    }

    // Called by caller when receiving answer
    public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.peerConnection) return;
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

        // Process any queued candidates
        while (this.iceCandidatesQueue.length > 0) {
            const candidate = this.iceCandidatesQueue.shift();
            if (candidate) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        }
    }

    // Handle ICE Candidate
    public async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (this.peerConnection && this.peerConnection.remoteDescription) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
            this.iceCandidatesQueue.push(candidate);
        }
    }

    // Toggle Microphone
    public toggleAudio(enabled?: boolean): boolean {
        if (!this.localStream) return false;
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = enabled !== undefined ? enabled : !audioTrack.enabled;
            return audioTrack.enabled;
        }
        return false;
    }

    // Toggle Camera
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

                const sender = this.peerConnection
                    ?.getSenders()
                    .find((s) => s.track?.kind === 'video');

                if (sender) {
                    await sender.replaceTrack(videoTrack);
                } else if (this.peerConnection) {
                    this.peerConnection.addTrack(videoTrack, this.localStream);
                }
                return true;
            } catch (e) {
                console.error('[WebRTC] Failed to enable camera', e);
                return false;
            }
        }
        return false;
    }

    // Start Screen Share
    public async startScreenShare(): Promise<boolean> {
        try {
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });

            const screenTrack = this.screenStream.getVideoTracks()[0];

            // When user clicks browser "Stop Sharing"
            screenTrack.onended = () => {
                this.stopScreenShare();
            };

            const sender = this.peerConnection
                ?.getSenders()
                .find((s) => s.track?.kind === 'video');

            if (sender) {
                await sender.replaceTrack(screenTrack);
            }

            const socket = getSocket();
            if (this.targetUserId) {
                socket?.emit('screen_share_status', { targetUserId: this.targetUserId, isSharing: true });
            }

            return true;
        } catch (e) {
            console.warn('[WebRTC] Screen share cancelled or failed', e);
            return false;
        }
    }

    // Stop Screen Share & restore camera track
    public async stopScreenShare(): Promise<void> {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach((t) => t.stop());
            this.screenStream = null;
        }

        const cameraTrack = this.localStream?.getVideoTracks()[0];
        const sender = this.peerConnection
            ?.getSenders()
            .find((s) => s.track?.kind === 'video');

        if (sender && cameraTrack) {
            await sender.replaceTrack(cameraTrack);
        }

        const socket = getSocket();
        if (this.targetUserId) {
            socket?.emit('screen_share_status', { targetUserId: this.targetUserId, isSharing: false });
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
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.remoteStream = null;
        this.targetUserId = null;
        this.callId = null;
        this.iceCandidatesQueue = [];
    }
}

export const webrtcService = new WebRTCService();
