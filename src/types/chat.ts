export interface EmployeeSummary {
    id: number;
    name: string;
    email: string;
    role?: { name: string };
    employeeProfile?: {
        title?: string | null;
        department?: string | null;
        avatar?: string | null;
        phone?: string | null;
    } | null;
}

export interface CommChannelMember {
    id: number;
    channelId: number;
    userId: number;
    role: 'ADMIN' | 'MEMBER';
    user: EmployeeSummary;
}

export interface CommChannel {
    id: number;
    tenantId: string;
    teamId?: number | null;
    name: string;
    description?: string | null;
    isPrivate: boolean;
    createdById: number;
    createdAt: string;
    team?: { id: number; name: string } | null;
    members: CommChannelMember[];
    messages?: ChatMessage[];
    unreadCount?: number;
}

export interface DirectConversationMember {
    id: number;
    conversationId: number;
    userId: number;
    lastReadAt?: string;
    user: EmployeeSummary;
}

export interface DirectConversation {
    id: number;
    tenantId: string;
    isGroup: boolean;
    title?: string | null;
    createdAt: string;
    updatedAt: string;
    participants: DirectConversationMember[];
    messages?: ChatMessage[];
    unreadCount?: number;
}

export interface ChatAttachment {
    id: number;
    messageId: number;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    createdAt: string;
}

export interface ChatMessage {
    id: number;
    tenantId: string;
    senderId: number;
    channelId?: number | null;
    conversationId?: number | null;
    content: string;
    replyToId?: number | null;
    isEdited: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    sender: EmployeeSummary;
    attachments?: ChatAttachment[];
    replyTo?: {
        id: number;
        content: string;
        sender: { id: number; name: string };
    } | null;
    readReceipts?: { userId: number; readAt: string }[];
}

export interface CallRecord {
    id: number;
    callerId: number;
    callType: 'VOICE' | 'VIDEO';
    status: 'INITIATED' | 'CONNECTED' | 'COMPLETED' | 'MISSED' | 'REJECTED';
    startedAt: string;
    endedAt?: string | null;
    duration: number;
    caller: EmployeeSummary;
    participants: {
        id: number;
        userId: number;
        status: string;
        user: EmployeeSummary;
    }[];
}

export interface InCallMessage {
    id: string;
    senderId: number;
    senderName: string;
    senderAvatar?: string | null;
    text: string;
    time: string;
}

export interface CallParticipant {
    id: number;
    name: string;
    avatar?: string | null;
}

export interface IncomingCallData {
    callId: number;
    callerId: number;
    callerName: string;
    callerAvatar?: string | null;
    callType: 'VOICE' | 'VIDEO';
    isGroup?: boolean;
}

export interface ActiveCallState {
    callId: number;
    partnerId: number;
    partnerName: string;
    partnerAvatar?: string | null;
    callType: 'VOICE' | 'VIDEO';
    isInitiator: boolean;
    status: 'RINGING' | 'CONNECTING' | 'CONNECTED' | 'ENDED';
    isGroup?: boolean;
    participants?: CallParticipant[];
}
