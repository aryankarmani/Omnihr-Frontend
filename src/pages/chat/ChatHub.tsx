import React, { useState, useEffect, useRef } from 'react';
import {
    Hash, User, Users, Plus, Search, Phone, Video,
    Send, Paperclip, Smile, MoreVertical, Reply, Edit2,
    Trash2, Copy, Check, CheckCheck, X, FileText, Image as ImageIcon,
    Download, Info, ChevronDown, ChevronRight, Circle, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { getSocket } from '../../services/socket';
import type {
    CommChannel, DirectConversation, ChatMessage,
    EmployeeSummary, ChatAttachment
} from '../../types/chat';
import api, { getMediaUrl } from '../../utils/api';
import CreateTeamChannelModal from '../../components/chat/CreateTeamChannelModal';
import toast from 'react-hot-toast';

export default function ChatHub() {
    const { user } = useAuth();
    const { startCall } = useCall();

    const [loading, setLoading] = useState(true);
    const [channels, setChannels] = useState<CommChannel[]>([]);
    const [conversations, setConversations] = useState<DirectConversation[]>([]);
    const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
    const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
    const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);

    // Active Selection State
    const [activeType, setActiveType] = useState<'CHANNEL' | 'CONVERSATION'>('CHANNEL');
    const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
    const [activeConvId, setActiveConvId] = useState<number | null>(null);

    // Messages State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [inputText, setInputText] = useState('');
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [uploadingFile, setUploadingFile] = useState(false);

    // UI Toggles
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailsPane, setShowDetailsPane] = useState(false);
    const [mobileView, setMobileView] = useState<'LIST' | 'CHAT'>('LIST');
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarTab, setSidebarTab] = useState<'ALL' | 'CHANNELS' | 'CHATS'>('ALL');
    const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({ company: true });
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const messageEndRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const typingTimeoutRef = useRef<number | null>(null);

    // 1. Fetch bootstrap data
    const fetchBootstrapData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/communication/bootstrap');
            setChannels(res.data.channels || []);
            const uniqueConvs = (res.data.conversations || []).filter(
                (cv: any, index: number, self: any[]) => index === self.findIndex((c: any) => c.id === cv.id)
            );
            setConversations(uniqueConvs);
            setEmployees(res.data.employees || []);
            setTeams(res.data.teams || []);

            // Set default active channel to "general" if nothing selected
            if (!activeChannelId && !activeConvId) {
                const general = res.data.channels?.find((c: any) => c.name === 'general') || res.data.channels?.[0];
                if (general) {
                    setActiveType('CHANNEL');
                    setActiveChannelId(general.id);
                }
            }
        } catch (err: any) {
            console.error('[ChatHub] Failed to bootstrap communication data', err);
            toast.error('Failed to load communication module');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBootstrapData();
    }, []);

    // 2. Setup Real-Time Socket Listeners
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        socket.on('online_users_list', (ids: number[]) => {
            setOnlineUserIds(ids);
        });

        socket.on('user_status_changed', ({ userId, status }: { userId: number; status: 'ONLINE' | 'OFFLINE' }) => {
            setOnlineUserIds((prev) =>
                status === 'ONLINE' ? Array.from(new Set([...prev, userId])) : prev.filter((id) => id !== userId)
            );
        });

        socket.on('new_message', (message: ChatMessage) => {
            const isCurrentChannel = activeType === 'CHANNEL' && Number(message.channelId) === Number(activeChannelId);
            const isCurrentConv = activeType === 'CONVERSATION' && Number(message.conversationId) === Number(activeConvId);

            if (isCurrentChannel || isCurrentConv) {
                setMessages((prev) => {
                    if (prev.some((m) => Number(m.id) === Number(message.id))) return prev;
                    return [...prev, message];
                });
                scrollToBottom();
            } else {
                // Update snippet / unread badge in sidebar
                if (message.channelId) {
                    setChannels((prev) =>
                        prev.map((c) => (c.id === message.channelId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c))
                    );
                } else if (message.conversationId) {
                    setConversations((prev) =>
                        prev.map((cv) =>
                            cv.id === message.conversationId
                                ? { ...cv, unreadCount: (cv.unreadCount || 0) + 1, updatedAt: new Date().toISOString() }
                                : cv
                        )
                    );
                }
            }
        });

        socket.on('message_edited', (updated: ChatMessage) => {
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        });

        socket.on('message_deleted', ({ messageId }: { messageId: number }) => {
            setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m))
            );
        });

        socket.on('user_typing', ({ name, targetType, targetId }) => {
            const match =
                (targetType === 'channel' && activeType === 'CHANNEL' && targetId === activeChannelId) ||
                (targetType === 'conversation' && activeType === 'CONVERSATION' && targetId === activeConvId);

            if (match) {
                setTypingUsers((prev) => Array.from(new Set([...prev, name])));
            }
        });

        socket.on('user_stop_typing', ({ targetType, targetId }) => {
            const match =
                (targetType === 'channel' && activeType === 'CHANNEL' && targetId === activeChannelId) ||
                (targetType === 'conversation' && activeType === 'CONVERSATION' && targetId === activeConvId);

            if (match) {
                setTypingUsers([]);
            }
        });

        socket.on('channel_created', (newChannel: CommChannel) => {
            setChannels((prev) => (prev.some((c) => c.id === newChannel.id) ? prev : [...prev, newChannel]));
        });

        socket.on('channel_deleted', ({ channelId }: { channelId: number }) => {
            setChannels((prev) => prev.filter((c) => c.id !== channelId));
            if (activeChannelId === channelId) {
                setActiveChannelId(null);
            }
        });

        return () => {
            socket.off('online_users_list');
            socket.off('user_status_changed');
            socket.off('new_message');
            socket.off('message_edited');
            socket.off('message_deleted');
            socket.off('user_typing');
            socket.off('user_stop_typing');
            socket.off('channel_created');
            socket.off('channel_deleted');
        };
    }, [activeType, activeChannelId, activeConvId]);

    // 3. Fetch Messages for Selected Channel / Conversation
    useEffect(() => {
        const fetchMessages = async () => {
            if (!activeChannelId && !activeConvId) return;

            setMessagesLoading(true);
            setTypingUsers([]);
            try {
                const params: any = {};
                if (activeType === 'CHANNEL' && activeChannelId) {
                    params.channelId = activeChannelId;
                    getSocket()?.emit('join_channel', activeChannelId);
                } else if (activeType === 'CONVERSATION' && activeConvId) {
                    params.conversationId = activeConvId;
                    getSocket()?.emit('join_conversation', activeConvId);
                    getSocket()?.emit('mark_read', { conversationId: activeConvId });
                }

                const res = await api.get('/communication/messages', { params });
                setMessages(res.data || []);
                scrollToBottom();

                // Clear unread badge for active
                if (activeType === 'CHANNEL') {
                    setChannels((prev) => prev.map((c) => (c.id === activeChannelId ? { ...c, unreadCount: 0 } : c)));
                } else {
                    setConversations((prev) => prev.map((cv) => (cv.id === activeConvId ? { ...cv, unreadCount: 0 } : cv)));
                }
            } catch (err) {
                console.error('[ChatHub] Failed to fetch messages', err);
            } finally {
                setMessagesLoading(false);
            }
        };

        fetchMessages();

        return () => {
            if (activeType === 'CHANNEL' && activeChannelId) {
                getSocket()?.emit('leave_channel', activeChannelId);
            } else if (activeType === 'CONVERSATION' && activeConvId) {
                getSocket()?.emit('leave_conversation', activeConvId);
            }
        };
    }, [activeType, activeChannelId, activeConvId]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // 4. Handle Typing indicator trigger
    const handleInputChange = (text: string) => {
        setInputText(text);
        const socket = getSocket();
        if (!socket) return;

        const targetType = activeType === 'CHANNEL' ? 'channel' : 'conversation';
        const targetId = activeType === 'CHANNEL' ? activeChannelId : activeConvId;
        if (!targetId) return;

        socket.emit('typing_start', { targetType, targetId });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => {
            socket.emit('typing_stop', { targetType, targetId });
        }, 2000);
    };

    // 5. Send Message
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const text = inputText.trim();
        if (!text) return;

        if (editingMessage) {
            // Edit existing message
            try {
                const res = await api.patch(`/communication/messages/${editingMessage.id}`, { content: text });
                setMessages((prev) => prev.map((m) => (m.id === editingMessage.id ? res.data : m)));
                setEditingMessage(null);
                setInputText('');
            } catch (err: any) {
                toast.error(err.response?.data?.message || 'Failed to edit message');
            }
            return;
        }

        setInputText('');
        const replyId = replyTo?.id || null;
        setReplyTo(null);

        try {
            const payload: any = {
                content: text,
                replyToId: replyId,
            };
            if (activeType === 'CHANNEL') payload.channelId = activeChannelId;
            if (activeType === 'CONVERSATION') payload.conversationId = activeConvId;

            const res = await api.post('/communication/messages', payload);
            setMessages((prev) => {
                if (prev.some((m) => Number(m.id) === Number(res.data.id))) return prev;
                return [...prev, res.data];
            });
            scrollToBottom();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to send message');
        }
    };

    // 6. Handle File Attachment Upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploadingFile(true);
        try {
            const uploadRes = await api.post('/communication/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const attachment: ChatAttachment = uploadRes.data;

            const payload: any = {
                content: inputText.trim() || `Sent an attachment: ${attachment.fileName}`,
                attachments: [attachment],
            };
            if (activeType === 'CHANNEL') payload.channelId = activeChannelId;
            if (activeType === 'CONVERSATION') payload.conversationId = activeConvId;

            const res = await api.post('/communication/messages', payload);
            setMessages((prev) => {
                if (prev.some((m) => Number(m.id) === Number(res.data.id))) return prev;
                return [...prev, res.data];
            });
            setInputText('');
            scrollToBottom();
            toast.success('File uploaded successfully');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to upload file');
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // 7. Delete Message
    const handleDeleteMessage = async (msgId: number) => {
        if (!confirm('Are you sure you want to delete this message?')) return;
        try {
            await api.delete(`/communication/messages/${msgId}`);
            setMessages((prev) =>
                prev.map((m) => (m.id === msgId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m))
            );
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete message');
        }
    };

    // Active Channel / Conversation Entity
    const currentChannel = channels.find((c) => c.id === activeChannelId);
    const currentConversation = conversations.find((c) => c.id === activeConvId);

    // Robust Partner Resolver for 1:1 Direct Chats
    const getConversationPartner = (cv: DirectConversation | null | undefined): EmployeeSummary | null => {
        if (!cv || cv.isGroup || !cv.participants || cv.participants.length === 0) return null;
        const currentId = Number(user?.id);
        const other = cv.participants.find((p) => Number(p.userId) !== currentId);
        if (other?.user) return other.user;
        return cv.participants[0]?.user || null;
    };

    // Direct Partner info for 1:1 chat
    const directPartner = getConversationPartner(currentConversation);
    const isPartnerOnline = directPartner ? onlineUserIds.includes(directPartner.id) : false;

    // Filtered lists for sidebar
    const filteredChannels = channels.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );

    const filteredConversations = conversations
        .filter((cv, index, self) => {
            if (cv.isGroup) {
                const groupKey = `${cv.title || 'group'}_${(cv.participants || []).map((p) => p.userId).sort((a, b) => Number(a) - Number(b)).join('_')}`;
                return index === self.findIndex((c) => {
                    if (!c.isGroup) return false;
                    const otherKey = `${c.title || 'group'}_${(c.participants || []).map((p) => p.userId).sort((a, b) => Number(a) - Number(b)).join('_')}`;
                    return otherKey === groupKey;
                });
            }
            return index === self.findIndex((c) => Number(c.id) === Number(cv.id));
        })
        .filter((cv) => {
            const q = searchQuery.toLowerCase().trim();
            if (!q) return true;
            if (cv.isGroup) {
                return (cv.title || 'Group Chat').toLowerCase().includes(q);
            }
            const partner = getConversationPartner(cv);
            return (
                (partner?.name && partner.name.toLowerCase().includes(q)) ||
                (partner?.email && partner.email.toLowerCase().includes(q))
            );
        });

    // Trigger Calling
    const handleStartCall = (callType: 'VOICE' | 'VIDEO', targetUser?: EmployeeSummary) => {
        const partner = targetUser || directPartner;
        if (!partner) {
            toast.error('Voice/Video calling is supported with team members in direct chat');
            return;
        }
        startCall(partner.id, partner.name, partner.employeeProfile?.avatar || null, callType);
    };

    const toggleTeamExpand = (key: string) => {
        setExpandedTeams((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="flex h-[calc(100vh-100px)] rounded-xl border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#12151C] overflow-hidden shadow-sm animate-fade-in relative">
            {/* 1. LEFT PANE: Teams, Channels & Chats Sidebar */}
            <div className={`w-full sm:w-80 border-r border-[#E2E6ED] dark:border-gray-800 flex-col bg-[#F7F8FA] dark:bg-[#0E1118] shrink-0 ${mobileView === 'CHAT' ? 'hidden sm:flex' : 'flex'}`}>
                {/* Search & New Action Header */}
                <div className="p-3.5 border-b border-[#E2E6ED] dark:border-gray-800 flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-[#1A1F2B] border border-[#E2E6ED] dark:border-gray-700 rounded-lg text-xs text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                        />
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="p-1.5 rounded-lg bg-[#2C4FD6] hover:bg-[#203FB4] text-white transition-all cursor-pointer shadow-sm shrink-0"
                        title="New Channel or Chat"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                {/* Sub-tabs: All | Channels | Direct Chats */}
                <div className="flex px-3 pt-2 gap-1 border-b border-[#E2E6ED] dark:border-gray-800 text-xs">
                    {(['ALL', 'CHANNELS', 'CHATS'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setSidebarTab(tab)}
                            className={`pb-2 px-2.5 font-semibold transition-all border-b-2 cursor-pointer ${
                                sidebarTab === tab
                                    ? 'border-[#2C4FD6] text-[#2C4FD6] dark:text-blue-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                            }`}
                        >
                            {tab === 'ALL' ? 'All' : tab === 'CHANNELS' ? 'Channels' : 'Chats'}
                        </button>
                    ))}
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto p-2 space-y-4">
                    {/* CHANNELS SECTION */}
                    {(sidebarTab === 'ALL' || sidebarTab === 'CHANNELS') && (
                        <div>
                            <div
                                onClick={() => toggleTeamExpand('company')}
                                className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <span className="flex items-center gap-1">
                                    {expandedTeams.company ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                    Company Channels
                                </span>
                                <span className="text-[10px] bg-gray-200 dark:bg-gray-800 px-1.5 rounded">
                                    {filteredChannels.length}
                                </span>
                            </div>

                            {expandedTeams.company && (
                                <div className="mt-1 space-y-0.5">
                                    {filteredChannels.map((c) => {
                                            const isActive = activeType === 'CHANNEL' && activeChannelId === c.id;
                                            return (
                                                <div
                                                    key={c.id}
                                                    onClick={() => {
                                                        setActiveType('CHANNEL');
                                                        setActiveChannelId(c.id);
                                                        setActiveConvId(null);
                                                        setMobileView('CHAT');
                                                    }}
                                                    className={`px-3 py-2 rounded-lg flex items-center justify-between text-xs font-medium cursor-pointer transition-all ${
                                                        isActive
                                                            ? 'bg-[#2C4FD6] text-white font-semibold shadow-sm'
                                                            : 'text-[#5B6472] dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-white/5'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 truncate">
                                                        <Hash size={14} className={isActive ? 'text-white' : 'text-gray-400'} />
                                                        <span className="truncate">{c.name}</span>
                                                    </div>
                                                    {c.unreadCount && c.unreadCount > 0 ? (
                                                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center">
                                                            {c.unreadCount}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* DIRECT CHATS SECTION */}
                    {(sidebarTab === 'ALL' || sidebarTab === 'CHATS') && (
                        <div>
                            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                <span>Direct Messages</span>
                                <span className="text-[10px] bg-gray-200 dark:bg-gray-800 px-1.5 rounded">
                                    {filteredConversations.length}
                                </span>
                            </div>

                            <div className="mt-1 space-y-0.5">
                                {filteredConversations.length === 0 ? (
                                    <p className="px-3 py-2 text-[11px] text-gray-400 italic">No direct chats found</p>
                                ) : (
                                    filteredConversations.map((cv) => {
                                        const isActive = activeType === 'CONVERSATION' && activeConvId === cv.id;
                                        const partner = getConversationPartner(cv);
                                        const isOnline = partner ? onlineUserIds.includes(partner.id) : false;
                                        const title = cv.isGroup ? cv.title || 'Group Chat' : partner?.name || 'User';
                                        const avatar = partner?.employeeProfile?.avatar
                                            ? getMediaUrl(partner.employeeProfile.avatar)
                                            : null;

                                        return (
                                            <div
                                                key={cv.id}
                                                onClick={() => {
                                                    setActiveType('CONVERSATION');
                                                    setActiveConvId(cv.id);
                                                    setActiveChannelId(null);
                                                    setMobileView('CHAT');
                                                }}
                                                className={`px-2.5 py-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all ${
                                                    isActive
                                                        ? 'bg-[#2C4FD6] text-white font-semibold shadow-sm'
                                                        : 'text-[#5B6472] dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="relative shrink-0">
                                                        <div
                                                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] overflow-hidden ${
                                                                isActive ? 'bg-white/20 text-white' : 'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white'
                                                            }`}
                                                        >
                                                            {avatar ? (
                                                                <img src={avatar} alt={title} className="w-full h-full object-cover" />
                                                            ) : cv.isGroup ? (
                                                                <Users size={13} />
                                                            ) : (
                                                                title.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        {!cv.isGroup && (
                                                            <span
                                                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0E1118] ${
                                                                    isOnline ? 'bg-emerald-500' : 'bg-gray-400'
                                                                }`}
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="truncate block font-medium">{title}</span>
                                                        {cv.messages?.[0] && (
                                                            <span
                                                                className={`text-[10px] truncate block ${
                                                                    isActive ? 'text-white/80' : 'text-gray-400'
                                                                }`}
                                                            >
                                                                {cv.messages[0].content}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {cv.unreadCount && cv.unreadCount > 0 ? (
                                                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                                                        {cv.unreadCount}
                                                    </span>
                                                ) : null}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. MIDDLE PANE: Active Conversation & Messages Area */}
            <div className={`flex-1 flex-col min-w-0 bg-white dark:bg-[#12151C] ${mobileView === 'CHAT' ? 'flex' : 'hidden sm:flex'}`}>
                {/* Conversation Header */}
                <div className="h-14 px-3 sm:px-6 border-b border-[#E2E6ED] dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#12151C]">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {/* Mobile Back Button: Visible only on < sm */}
                        <button
                            onClick={() => setMobileView('LIST')}
                            className="sm:hidden p-1.5 -ml-1 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer shrink-0"
                            title="Back to conversations"
                            aria-label="Back to conversations"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        {activeType === 'CHANNEL' ? (
                            <>
                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#2C4FD6] dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                                    <Hash size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-[#12151C] dark:text-white truncate">
                                        #{currentChannel?.name || 'Channel'}
                                    </h3>
                                    <p className="text-[11px] text-gray-400 truncate">
                                        {currentChannel?.description || `${currentChannel?.members?.length || 0} members`}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#2C4FD6] to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                                    {directPartner?.employeeProfile?.avatar ? (
                                        <img
                                            src={getMediaUrl(directPartner.employeeProfile.avatar)}
                                            alt={directPartner.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : currentConversation?.isGroup ? (
                                        <Users size={16} />
                                    ) : (
                                        directPartner?.name?.charAt(0).toUpperCase() || 'U'
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-[#12151C] dark:text-white truncate">
                                        {currentConversation?.isGroup
                                            ? currentConversation.title
                                            : directPartner?.name || 'Direct Chat'}
                                    </h3>
                                    <p className="text-[11px] text-gray-400 flex items-center gap-1.5 truncate">
                                        {!currentConversation?.isGroup && (
                                            <>
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        isPartnerOnline ? 'bg-emerald-500' : 'bg-gray-400'
                                                    }`}
                                                />
                                                {isPartnerOnline ? 'Online' : 'Offline'}
                                            </>
                                        )}
                                        {currentConversation?.isGroup &&
                                            `${currentConversation.participants.length} members`}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Action Buttons: Voice Call, Video Call, Details */}
                    <div className="flex items-center gap-1.5">
                        {/* Voice Call Button */}
                        <button
                            onClick={() => handleStartCall('VOICE')}
                            className="p-2 rounded-lg text-gray-500 hover:text-[#2C4FD6] hover:bg-blue-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                            title="Start Voice Call"
                        >
                            <Phone size={17} />
                        </button>

                        {/* Video Call Button */}
                        <button
                            onClick={() => handleStartCall('VIDEO')}
                            className="p-2 rounded-lg text-gray-500 hover:text-[#2C4FD6] hover:bg-blue-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                            title="Start Video Call"
                        >
                            <Video size={17} />
                        </button>

                        {/* Details Panel Toggle */}
                        <button
                            onClick={() => setShowDetailsPane(!showDetailsPane)}
                            className={`p-2 rounded-lg transition-all cursor-pointer ${
                                showDetailsPane
                                    ? 'bg-blue-50 dark:bg-white/10 text-[#2C4FD6] dark:text-blue-400'
                                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                            title="Conversation Info"
                        >
                            <Info size={17} />
                        </button>
                    </div>
                </div>

                {/* Message Feed */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {messagesLoading ? (
                        <div className="flex items-center justify-center h-full text-xs text-gray-400">
                            Loading conversation...
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
                            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/30 text-[#2C4FD6] flex items-center justify-center mb-2">
                                <Smile size={24} />
                            </div>
                            <h4 className="text-sm font-semibold text-[#12151C] dark:text-white">
                                Welcome to #{currentChannel?.name || directPartner?.name || 'Chat'}!
                            </h4>
                            <p className="text-xs text-gray-400 mt-0.5">This is the start of your message history.</p>
                        </div>
                    ) : (
                        messages
                            .filter((msg, index, self) => index === self.findIndex((m) => Number(m.id) === Number(msg.id)))
                            .map((msg, idx) => {
                            const isMe = msg.senderId === user?.id;
                            const avatar = msg.sender?.employeeProfile?.avatar
                                ? getMediaUrl(msg.sender.employeeProfile.avatar)
                                : null;

                            return (
                                <div
                                    key={msg.id || idx}
                                    className={`flex gap-3 group relative ${isMe ? 'flex-row-reverse' : ''}`}
                                >
                                    {/* Avatar */}
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                        {avatar ? (
                                            <img src={avatar} alt={msg.sender?.name} className="w-full h-full object-cover" />
                                        ) : (
                                            msg.sender?.name?.charAt(0).toUpperCase() || 'U'
                                        )}
                                    </div>

                                    {/* Message Bubble Container */}
                                    <div className={`max-w-[75%] space-y-1 relative group/bubble ${isMe ? 'items-end' : 'items-start'}`}>
                                        {/* Sender Name & Timestamp */}
                                        <div
                                            className={`flex items-center gap-2 text-[10px] text-gray-400 ${
                                                isMe ? 'justify-end' : ''
                                            }`}
                                        >
                                            <span className="font-semibold text-[#12151C] dark:text-gray-300">
                                                {isMe ? 'You' : msg.sender?.name}
                                            </span>
                                            <span>
                                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                            {msg.isEdited && <span className="italic">(edited)</span>}
                                        </div>

                                        {/* Reply Quote Banner */}
                                        {msg.replyTo && (
                                            <div
                                                className={`text-[11px] p-2 rounded-lg border-l-2 bg-gray-50 dark:bg-white/5 ${
                                                    isMe ? 'border-[#2C4FD6]' : 'border-gray-400'
                                                }`}
                                            >
                                                <span className="font-bold text-[10px] text-gray-500 block">
                                                    {msg.replyTo.sender?.name}
                                                </span>
                                                <p className="truncate text-gray-600 dark:text-gray-300">
                                                    {msg.replyTo.content}
                                                </p>
                                            </div>
                                        )}

                                        {/* Bubble */}
                                        <div
                                            className={`p-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed relative ${
                                                isMe
                                                    ? 'bg-[#2C4FD6] text-white rounded-tr-xs'
                                                    : 'bg-[#F4F6FB] dark:bg-[#1A1F2B] text-[#12151C] dark:text-gray-200 rounded-tl-xs border border-[#E2E6ED]/60 dark:border-gray-800'
                                            }`}
                                        >
                                            {msg.isDeleted ? (
                                                <span className="italic text-gray-400">{msg.content}</span>
                                            ) : (
                                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                            )}

                                            {/* Attachments */}
                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div className="mt-2 space-y-1.5">
                                                    {msg.attachments.map((att) => (
                                                        <a
                                                            key={att.id}
                                                            href={getMediaUrl(att.fileUrl)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                                                                isMe
                                                                    ? 'bg-white/15 hover:bg-white/25 text-white'
                                                                    : 'bg-white dark:bg-[#12151C] border border-gray-200 dark:border-gray-700 text-[#2C4FD6] dark:text-blue-400'
                                                            }`}
                                                        >
                                                            {att.fileType.startsWith('image/') ? (
                                                                <ImageIcon size={16} />
                                                            ) : (
                                                                <FileText size={16} />
                                                            )}
                                                            <span className="truncate max-w-[160px] font-medium">
                                                                {att.fileName}
                                                            </span>
                                                            <Download size={13} className="ml-auto" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Action icons directly anchored on message bubble hover */}
                                            {!msg.isDeleted && (
                                                <div
                                                    className={`absolute -top-3.5 opacity-0 group-hover/bubble:opacity-100 transition-all duration-150 bg-white dark:bg-[#1A1F2B] border border-gray-200 dark:border-gray-700 rounded-lg shadow-md flex items-center gap-0.5 p-0.5 z-20 ${
                                                        isMe ? 'right-2' : 'left-2'
                                                    }`}
                                                >
                                                    <button
                                                        onClick={() => setReplyTo(msg)}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-500 cursor-pointer"
                                                        title="Reply"
                                                    >
                                                        <Reply size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(msg.content);
                                                            toast.success('Message copied');
                                                        }}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-500 cursor-pointer"
                                                        title="Copy text"
                                                    >
                                                        <Copy size={13} />
                                                    </button>
                                                    {isMe && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingMessage(msg);
                                                                setInputText(msg.content);
                                                            }}
                                                            className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-500 cursor-pointer"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                    )}
                                                    {(isMe || user?.role === 'HR_ADMIN') && (
                                                        <button
                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-rose-500 cursor-pointer"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Read Receipt */}
                                        {isMe && (
                                            <div className="flex items-center justify-end gap-1 text-[10px] text-gray-400">
                                                <CheckCheck size={12} className="text-[#2C4FD6] dark:text-blue-400" />
                                                <span>Delivered</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messageEndRef} />
                </div>

                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                    <div className="px-6 py-1 text-[11px] text-gray-400 italic flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        {typingUsers.join(', ')} is typing...
                    </div>
                )}

                {/* Reply Banner */}
                {replyTo && (
                    <div className="px-6 py-2 bg-blue-50 dark:bg-white/5 border-t border-[#E2E6ED] dark:border-gray-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                            <Reply size={14} className="text-[#2C4FD6]" />
                            <span className="text-gray-500">Replying to</span>
                            <span className="font-semibold text-[#12151C] dark:text-white">
                                {replyTo.sender?.name}:
                            </span>
                            <span className="truncate text-gray-600 dark:text-gray-300">{replyTo.content}</span>
                        </div>
                        <button
                            onClick={() => setReplyTo(null)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Editing Banner */}
                {editingMessage && (
                    <div className="px-6 py-2 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate text-amber-700 dark:text-amber-400">
                            <Edit2 size={14} />
                            <span>Editing message</span>
                        </div>
                        <button
                            onClick={() => {
                                setEditingMessage(null);
                                setInputText('');
                            }}
                            className="p-1 text-amber-700 dark:text-amber-400 hover:opacity-80 cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Quick Emoji Bar */}
                {showEmojiPicker && (
                    <div className="px-6 py-2 border-t border-[#E2E6ED] dark:border-gray-800 flex items-center gap-2 bg-[#F8FAFC] dark:bg-white/2">
                        {['👍', '❤️', '😂', '🎉', '🚀', '🔥', '👀', '🙌', '👏', '✅'].map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                    setInputText((prev) => prev + emoji);
                                    setShowEmojiPicker(false);
                                }}
                                className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                {/* Bottom Input Box */}
                <form
                    onSubmit={handleSendMessage}
                    className="p-3 sm:p-4 border-t border-[#E2E6ED] dark:border-gray-800 flex items-center gap-2 bg-white dark:bg-[#12151C]"
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    {/* Attachment Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                        className="p-2.5 rounded-lg text-gray-500 hover:text-[#2C4FD6] hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
                        title="Upload file or image"
                    >
                        <Paperclip size={18} />
                    </button>

                    {/* Emoji Button */}
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-2.5 rounded-lg text-gray-500 hover:text-[#2C4FD6] hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                        title="Emojis"
                    >
                        <Smile size={18} />
                    </button>

                    {/* Text Input */}
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder={
                            editingMessage
                                ? 'Edit message...'
                                : `Message ${activeType === 'CHANNEL' ? '#' + (currentChannel?.name || 'channel') : directPartner?.name || 'chat'}...`
                        }
                        className="flex-1 px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#1A1F2B] border border-[#E2E6ED] dark:border-gray-700 rounded-xl text-xs sm:text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                    />

                    {/* Send Button */}
                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="p-2.5 rounded-xl bg-[#2C4FD6] hover:bg-[#203FB4] text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>

            {/* 3. RIGHT DETAILS PANE (Collapsible) */}
            {showDetailsPane && (
                <div className="w-full sm:w-72 border-l border-[#E2E6ED] dark:border-gray-800 bg-[#F7F8FA] dark:bg-[#0E1118] flex flex-col shrink-0 animate-fade-in absolute sm:static inset-0 z-20 sm:z-auto">
                    <div className="p-4 border-b border-[#E2E6ED] dark:border-gray-800 flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Details</h4>
                        <button
                            onClick={() => setShowDetailsPane(false)}
                            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Summary Info */}
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#2C4FD6] to-indigo-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-2.5 shadow-md">
                                {activeType === 'CHANNEL' ? (
                                    <Hash size={28} />
                                ) : (
                                    directPartner?.name?.charAt(0).toUpperCase() || 'U'
                                )}
                            </div>
                            <h3 className="text-sm font-bold text-[#12151C] dark:text-white">
                                {activeType === 'CHANNEL' ? `#${currentChannel?.name}` : directPartner?.name}
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {activeType === 'CHANNEL'
                                    ? currentChannel?.description || 'Company Channel'
                                    : directPartner?.employeeProfile?.title || directPartner?.email}
                            </p>
                        </div>

                        {/* Call Actions */}
                        {directPartner && (
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleStartCall('VOICE', directPartner)}
                                    className="py-2 px-3 rounded-lg border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#1A1F2B] text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-[#2C4FD6] transition-all cursor-pointer"
                                >
                                    <Phone size={13} className="text-[#2C4FD6]" /> Voice Call
                                </button>
                                <button
                                    onClick={() => handleStartCall('VIDEO', directPartner)}
                                    className="py-2 px-3 rounded-lg border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#1A1F2B] text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-[#2C4FD6] transition-all cursor-pointer"
                                >
                                    <Video size={13} className="text-[#2C4FD6]" /> Video Call
                                </button>
                            </div>
                        )}

                        {/* Member List */}
                        <div>
                            <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Members (
                                {activeType === 'CHANNEL'
                                    ? currentChannel?.members?.length || 0
                                    : currentConversation?.participants?.length || 0}
                                )
                            </h5>
                            <div className="space-y-1.5">
                                {(activeType === 'CHANNEL'
                                    ? currentChannel?.members?.map((m) => m.user)
                                    : currentConversation?.participants?.map((p) => p.user)
                                )?.map((emp) => {
                                    if (!emp) return null;
                                    const isOnline = onlineUserIds.includes(emp.id);
                                    const avatar = emp.employeeProfile?.avatar
                                        ? getMediaUrl(emp.employeeProfile.avatar)
                                        : null;
                                    return (
                                        <div
                                            key={emp.id}
                                            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="relative">
                                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                                                        {avatar ? (
                                                            <img src={avatar} alt={emp.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            emp.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-[#0E1118] ${
                                                            isOnline ? 'bg-emerald-500' : 'bg-gray-400'
                                                        }`}
                                                    />
                                                </div>
                                                <span className="text-xs font-medium text-[#12151C] dark:text-gray-300 truncate">
                                                    {emp.name}
                                                </span>
                                            </div>

                                            {emp.id !== user?.id && (
                                                <button
                                                    onClick={() => handleStartCall('VOICE', emp)}
                                                    className="p-1 text-gray-400 hover:text-[#2C4FD6] transition-colors cursor-pointer"
                                                    title={`Call ${emp.name}`}
                                                >
                                                    <Phone size={12} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Channel / New Chat Modal */}
            <CreateTeamChannelModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                employees={employees}
                teams={teams}
                currentUserId={user?.id as number}
                onChannelCreated={(newCh) => {
                    setChannels((prev) => [...prev, newCh]);
                    setActiveType('CHANNEL');
                    setActiveChannelId(newCh.id);
                    setMobileView('CHAT');
                }}
                onConversationCreated={(newConv) => {
                    setConversations((prev) => {
                        const withoutNew = prev.filter((c) => c.id !== newConv.id);
                        return [newConv, ...withoutNew];
                    });
                    setActiveType('CONVERSATION');
                    setActiveConvId(newConv.id);
                    setMobileView('CHAT');
                }}
            />
        </div>
    );
}
