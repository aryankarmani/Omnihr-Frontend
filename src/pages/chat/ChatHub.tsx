import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import {
    User, Users, Plus, Search, Phone, Video,
    Send, Paperclip, Smile, MoreVertical, Reply, Edit2,
    Trash2, Copy, Check, CheckCheck, X, FileText, Image as ImageIcon,
    Download, Info, ChevronDown, ChevronRight, Circle, ArrowLeft, LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { getSocket } from '../../services/socket';
import type {
    DirectConversation, ChatMessage,
    EmployeeSummary, ChatAttachment
} from '../../types/chat';
import api, { getMediaUrl } from '../../utils/api';
import { downloadFile } from '../../utils/fileDownloader';
import { ChatSkeleton, ChatMessagesSkeleton } from '../../components/common/SkeletonLoaders';
import toast from 'react-hot-toast';

// Lazy loaded modal
const CreateTeamChannelModal = lazy(() => import('../../components/chat/CreateTeamChannelModal'));

export default function ChatHub() {
    const { user, hasPermission } = useAuth();
    const { startCall, startGroupCall, lastLeftCall, rejoinGroupCall, dismissRejoin, onlineUserIds, isUserOnline } = useCall();

    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState<DirectConversation[]>([]);
    const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
    const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);

    // Active Selection State
    const [activeConvId, setActiveConvId] = useState<number | null>(null);

    // Messages State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [inputText, setInputText] = useState('');
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [stagedAttachment, setStagedAttachment] = useState<ChatAttachment | null>(null);

    // UI Toggles
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailsPane, setShowDetailsPane] = useState(false);
    const [mobileView, setMobileView] = useState<'LIST' | 'CHAT'>('LIST');
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarTab, setSidebarTab] = useState<'ALL' | 'GROUPS' | 'DIRECT'>('ALL');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<number | null>(null);
    const [isDeletingMessage, setIsDeletingMessage] = useState(false);

    // Conversation Actions (Delete Chat / Leave Group)
    const [confirmModalAction, setConfirmModalAction] = useState<{
        type: 'DELETE_CHAT' | 'LEAVE_GROUP';
        convId: number;
        title: string;
    } | null>(null);
    const [isProcessingAction, setIsProcessingAction] = useState(false);

    // Lazy loading older messages state
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
    const messageContainerRef = useRef<HTMLDivElement | null>(null);
    const prevScrollHeightRef = useRef<number>(0);

    const messageEndRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const typingTimeoutRef = useRef<number | null>(null);

    // Helper to resolve avatar image URL
    const resolveAvatar = (person: any): string | null => {
        if (!person) return null;
        const raw =
            person?.employeeProfile?.avatar ||
            person?.employeeProfile?.profilePicture ||
            person?.employeeProfile?.profilePictureUrl ||
            person?.avatar ||
            person?.profilePicture ||
            person?.profilePictureUrl;
        if (!raw || typeof raw !== 'string' || raw.startsWith('bg-')) return null;
        return getMediaUrl(raw);
    };

    // 1. Fetch bootstrap data
    const fetchBootstrapData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/communication/bootstrap');
            const uniqueConvs: DirectConversation[] = (res.data.conversations || []).filter(
                (cv: any, index: number, self: any[]) => index === self.findIndex((c: any) => c.id === cv.id)
            );
            setConversations(uniqueConvs);
            setEmployees(res.data.employees || []);
            setTeams(res.data.teams || []);

            // Set default active conversation if nothing selected
            if (!activeConvId && uniqueConvs.length > 0) {
                setActiveConvId(uniqueConvs[0].id);
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
        const socket = getSocket();
        socket?.emit('get_online_users');
    }, []);

    // 2. Setup Real-Time Socket Listeners
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        socket.on('new_message', (message: ChatMessage) => {
            const isCurrentConv = Number(message.conversationId) === Number(activeConvId);

            if (isCurrentConv) {
                setMessages((prev) => {
                    if (prev.some((m) => Number(m.id) === Number(message.id))) return prev;
                    return [...prev, message];
                });
                scrollToBottom();
            } else if (message.conversationId) {
                setConversations((prev) =>
                    prev.map((cv) =>
                        cv.id === message.conversationId
                            ? { ...cv, unreadCount: (cv.unreadCount || 0) + 1, updatedAt: new Date().toISOString() }
                            : cv
                    )
                );
            }
        });

        socket.on('new_conversation_message', ({ message }: { message: ChatMessage }) => {
            if (!message) return;
            const isCurrentConv = Number(message.conversationId) === Number(activeConvId);

            if (isCurrentConv) {
                setMessages((prev) => {
                    if (prev.some((m) => Number(m.id) === Number(message.id))) return prev;
                    return [...prev, message];
                });
                scrollToBottom();
            } else if (message.conversationId) {
                setConversations((prev) =>
                    prev.map((cv) =>
                        cv.id === message.conversationId
                            ? { ...cv, unreadCount: (cv.unreadCount || 0) + 1, updatedAt: new Date().toISOString() }
                            : cv
                    )
                );
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
            if (targetType === 'conversation' && targetId === activeConvId) {
                setTypingUsers((prev) => Array.from(new Set([...prev, name])));
            }
        });

        socket.on('user_stop_typing', ({ targetType, targetId }) => {
            if (targetType === 'conversation' && targetId === activeConvId) {
                setTypingUsers([]);
            }
        });

        socket.on('conversation_deleted', ({ conversationId }: { conversationId: number }) => {
            setConversations((prev) => prev.filter((c) => c.id !== conversationId));
            if (activeConvId === conversationId) {
                setActiveConvId(null);
                setMobileView('LIST');
            }
        });

        return () => {
            socket.off('new_message');
            socket.off('new_conversation_message');
            socket.off('message_edited');
            socket.off('message_deleted');
            socket.off('user_typing');
            socket.off('user_stop_typing');
            socket.off('conversation_deleted');
        };
    }, [activeConvId]);

    // 3. Load Messages when active conversation changes
    useEffect(() => {
        if (!activeConvId) {
            setMessages([]);
            return;
        }

        const fetchConversationMessages = async () => {
            setMessagesLoading(true);
            setHasMoreMessages(true);
            setLoadingOlderMessages(false);
            try {
                const res = await api.get('/communication/messages', {
                    params: { conversationId: activeConvId, limit: 50 }
                });
                const fetched: ChatMessage[] = res.data || [];
                setMessages(fetched);
                if (fetched.length < 50) {
                    setHasMoreMessages(false);
                }
                scrollToBottom();

                // Clear unread badge in state
                setConversations((prev) =>
                    prev.map((cv) => (cv.id === activeConvId ? { ...cv, unreadCount: 0 } : cv))
                );

                // Join socket conversation room
                const socket = getSocket();
                socket?.emit('join_conversation', activeConvId);
            } catch (err: any) {
                console.error('[ChatHub] Failed to load messages', err);
                toast.error('Failed to load messages');
            } finally {
                setMessagesLoading(false);
            }
        };

        fetchConversationMessages();

        return () => {
            const socket = getSocket();
            socket?.emit('leave_conversation', activeConvId);
        };
    }, [activeConvId]);

    // Lazy load older messages when user scrolls up
    const loadOlderMessages = async () => {
        if (!activeConvId || loadingOlderMessages || !hasMoreMessages || messages.length === 0) return;

        const oldestMessage = messages[0];
        if (!oldestMessage) return;

        setLoadingOlderMessages(true);
        const container = messageContainerRef.current;
        if (container) {
            prevScrollHeightRef.current = container.scrollHeight;
        }

        try {
            const res = await api.get('/communication/messages', {
                params: {
                    conversationId: activeConvId,
                    before: oldestMessage.id,
                    limit: 30,
                },
            });
            const olderMsgs: ChatMessage[] = res.data || [];
            if (olderMsgs.length < 30) {
                setHasMoreMessages(false);
            }

            if (olderMsgs.length > 0) {
                setMessages((prev) => {
                    const existingIds = new Set(prev.map((m) => m.id));
                    const filtered = olderMsgs.filter((m) => !existingIds.has(m.id));
                    return [...filtered, ...prev];
                });

                // Maintain scroll position after older messages are prepended
                requestAnimationFrame(() => {
                    if (container) {
                        const newScrollHeight = container.scrollHeight;
                        const diff = newScrollHeight - prevScrollHeightRef.current;
                        container.scrollTop = diff;
                    }
                });
            }
        } catch (err) {
            console.error('[ChatHub] Failed to lazy load older messages', err);
        } finally {
            setLoadingOlderMessages(false);
        }
    };

    const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.scrollTop < 60 && hasMoreMessages && !loadingOlderMessages && !messagesLoading) {
            loadOlderMessages();
        }
    };

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        setTimeout(() => {
            if (messageContainerRef.current) {
                messageContainerRef.current.scrollTo({
                    top: messageContainerRef.current.scrollHeight,
                    behavior,
                });
            }
        }, 80);
    };

    // 4. Typing Indicator Handlers
    const handleInputChange = (val: string) => {
        setInputText(val);
        const socket = getSocket();
        if (!socket || !activeConvId) return;

        socket.emit('typing_start', { targetType: 'conversation', targetId: activeConvId });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => {
            socket.emit('typing_stop', { targetType: 'conversation', targetId: activeConvId });
        }, 2000);
    };

    // 5. Send Message
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const text = inputText.trim();
        if ((!text && !stagedAttachment) || !activeConvId) return;

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
        const attachmentToSend = stagedAttachment;
        setStagedAttachment(null);

        try {
            const payload: any = {
                content: text || (attachmentToSend ? `Sent an attachment: ${attachmentToSend.fileName}` : ''),
                replyToId: replyId,
                conversationId: activeConvId,
            };
            if (attachmentToSend) {
                payload.attachments = [attachmentToSend];
            }

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

    // 6. Handle File Attachment Upload - stages file into input field without auto-sending
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeConvId) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploadingFile(true);
        try {
            const uploadRes = await api.post('/communication/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const attachment: ChatAttachment = uploadRes.data;
            setStagedAttachment(attachment);
            toast.success(`Attached ${attachment.fileName}`);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to upload attachment');
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // 7. Delete Message
    const confirmDeleteMessage = async () => {
        if (!messageToDelete) return;
        setIsDeletingMessage(true);
        try {
            await api.delete(`/communication/messages/${messageToDelete}`);
            setMessages((prev) =>
                prev.map((m) => (m.id === messageToDelete ? { ...m, isDeleted: true, content: 'This message was deleted' } : m))
            );
            toast.success('Message deleted');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete message');
        } finally {
            setIsDeletingMessage(false);
            setMessageToDelete(null);
        }
    };

    // 8. Delete Conversation or Leave Group Action
    const handleConfirmConversationAction = async () => {
        if (!confirmModalAction) return;
        const { type, convId } = confirmModalAction;
        setIsProcessingAction(true);
        try {
            if (type === 'DELETE_CHAT') {
                await api.delete(`/communication/conversations/${convId}`);
                setConversations((prev) => prev.filter((c) => c.id !== convId));
                if (activeConvId === convId) {
                    setActiveConvId(null);
                    setMobileView('LIST');
                }
                toast.success('Chat deleted');
            } else if (type === 'LEAVE_GROUP') {
                await api.post(`/communication/conversations/${convId}/leave`);
                setConversations((prev) => prev.filter((c) => c.id !== convId));
                if (activeConvId === convId) {
                    setActiveConvId(null);
                    setMobileView('LIST');
                }
                toast.success('Left group');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to complete action');
        } finally {
            setIsProcessingAction(false);
            setConfirmModalAction(null);
        }
    };

    // Active Conversation Entity
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
    const isPartnerOnline = directPartner ? isUserOnline(directPartner.id) : false;

    // Filtered lists for sidebar
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

    const groupConversations = filteredConversations.filter((c) => c.isGroup);
    const directConversations = filteredConversations.filter((c) => !c.isGroup);

    // Trigger Calling (Supports 1:1 and Group Video/Voice Calls)
    const handleStartCall = (callType: 'VOICE' | 'VIDEO', targetUser?: EmployeeSummary) => {
        if (currentConversation?.isGroup) {
            const participants = (currentConversation.participants || [])
                .filter((p) => Number(p.userId) !== Number(user?.id))
                .map((p) => ({
                    id: p.userId,
                    name: p.user?.name || 'Member',
                    avatar: resolveAvatar(p.user),
                }));

            if (participants.length === 0) {
                toast.error('No other members in this group to call');
                return;
            }

            startGroupCall(currentConversation.title || 'Group Call', participants, callType, currentConversation.id);
            return;
        }

        const partner = targetUser || directPartner;
        if (!partner) {
            toast.error('Please select a conversation to start a call');
            return;
        }

        startCall(partner.id, partner.name, resolveAvatar(partner), callType);
    };

    if (loading) {
        return <ChatSkeleton />;
    }

    return (
        <div className="flex flex-1 h-full max-h-full min-h-0 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#12151C] overflow-hidden shadow-sm animate-fade-in relative">
            {/* 1. LEFT PANE: Groups & Direct Chats Sidebar */}
            <div className={`w-full sm:w-80 border-r border-[#E2E6ED] dark:border-gray-800 flex-col bg-[#F7F8FA] dark:bg-[#0E1118] shrink-0 ${mobileView === 'CHAT' ? 'hidden sm:flex' : 'flex'}`}>
                {/* Search & New Action Header */}
                <div className="p-3.5 border-b border-[#E2E6ED] dark:border-gray-800 flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search chats or groups..."
                            className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-[#1A1F2B] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-xs text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                        />
                    </div>
                    {hasPermission('CHAT_CREATE') && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="p-1.5 rounded-[6px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white transition-all cursor-pointer shadow-sm shrink-0"
                        >
                            <Plus size={16} />
                        </button>
                    )}
                </div>

                {/* Sub-tabs: All | Groups | Direct */}
                <div className="flex px-3 pt-2 gap-1 border-b border-[#E2E6ED] dark:border-gray-800 text-xs">
                    {(['ALL', 'GROUPS', 'DIRECT'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setSidebarTab(tab)}
                            className={`pb-2 px-3 font-semibold transition-all border-b-2 cursor-pointer ${
                                sidebarTab === tab
                                    ? 'border-[#2C4FD6] text-[#2C4FD6] dark:text-blue-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                            }`}
                        >
                            {tab === 'ALL' ? 'All' : tab === 'GROUPS' ? 'Groups' : 'Direct'}
                        </button>
                    ))}
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto p-2 space-y-4">
                    {/* GROUP CHATS SECTION */}
                    {(sidebarTab === 'ALL' || sidebarTab === 'GROUPS') && (
                        <div>
                            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                <span className="flex items-center gap-1.5">
                                    <Users size={12} className="text-[#2C4FD6]" />
                                    Group Chats
                                </span>
                                <span className="text-[10px] bg-gray-200 dark:bg-gray-800 px-1.5 rounded-[6px]">
                                    {groupConversations.length}
                                </span>
                            </div>

                            <div className="mt-1 space-y-0.5">
                                {groupConversations.length === 0 ? (
                                    <p className="px-3 py-2 text-[11px] text-gray-400 italic">No groups found</p>
                                ) : (
                                    groupConversations.map((cv) => {
                                        const isActive = activeConvId === cv.id;
                                        const title = cv.title || 'Group Chat';
                                        const memberCount = cv.participants?.length || 0;

                                        return (
                                            <div
                                                key={cv.id}
                                                onClick={() => {
                                                    setActiveConvId(cv.id);
                                                    setMobileView('CHAT');
                                                }}
                                                className={`group px-2.5 py-2 rounded-[6px] flex items-center justify-between text-xs cursor-pointer transition-all ${
                                                    isActive
                                                        ? 'bg-[#2C4FD6] text-white font-semibold shadow-sm'
                                                        : 'text-[#5B6472] dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] overflow-hidden shrink-0 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white">
                                                        <Users size={13} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <span className="truncate block font-medium">{title}</span>
                                                        <span className={`text-[10px] truncate block ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                                                            {cv.messages?.[0]?.content || `${memberCount} members`}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    {cv.unreadCount && cv.unreadCount > 0 ? (
                                                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center">
                                                            {cv.unreadCount}
                                                        </span>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmModalAction({
                                                                type: 'LEAVE_GROUP',
                                                                convId: cv.id,
                                                                title: title,
                                                            });
                                                        }}
                                                        className={`opacity-0 group-hover:opacity-100 p-1 rounded-[6px] transition-all cursor-pointer ${
                                                            isActive
                                                                ? 'hover:bg-white/20 text-white'
                                                                : 'hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-amber-500'
                                                        }`}
                                                    >
                                                        <LogOut size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* DIRECT CHATS SECTION */}
                    {(sidebarTab === 'ALL' || sidebarTab === 'DIRECT') && (
                        <div>
                            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                <span className="flex items-center gap-1.5">
                                    <User size={12} className="text-[#2C4FD6]" />
                                    Direct Messages
                                </span>
                                <span className="text-[10px] bg-gray-200 dark:bg-gray-800 px-1.5 rounded-[6px]">
                                    {directConversations.length}
                                </span>
                            </div>

                            <div className="mt-1 space-y-0.5">
                                {directConversations.length === 0 ? (
                                    <p className="px-3 py-2 text-[11px] text-gray-400 italic">No direct chats found</p>
                                ) : (
                                    directConversations.map((cv) => {
                                        const isActive = activeConvId === cv.id;
                                        const partner = getConversationPartner(cv);
                                        const isOnline = partner ? isUserOnline(partner.id) : false;
                                        const title = partner?.name || 'User';
                                        const avatar = resolveAvatar(partner);

                                        return (
                                            <div
                                                key={cv.id}
                                                onClick={() => {
                                                    setActiveConvId(cv.id);
                                                    setMobileView('CHAT');
                                                }}
                                                className={`group px-2.5 py-2 rounded-[6px] flex items-center justify-between text-xs cursor-pointer transition-all ${
                                                    isActive
                                                        ? 'bg-[#2C4FD6] text-white font-semibold shadow-sm'
                                                        : 'text-[#5B6472] dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-white/5'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <div className="relative shrink-0">
                                                        <div
                                                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] overflow-hidden ${
                                                                isActive ? 'bg-white/20 text-white' : 'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white'
                                                            }`}
                                                        >
                                                            {avatar ? (
                                                                <img
                                                                    src={avatar}
                                                                    alt={title}
                                                                    loading="lazy"
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                                                />
                                                            ) : (
                                                                title.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <span
                                                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0E1118] ${
                                                                isOnline ? 'bg-emerald-500' : 'bg-gray-400'
                                                            }`}
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <span className="truncate block font-medium">{title}</span>
                                                        {cv.messages?.[0] ? (
                                                            <span
                                                                className={`text-[10px] truncate block ${
                                                                    isActive ? 'text-white/80' : 'text-gray-400'
                                                                }`}
                                                            >
                                                                {cv.messages[0].content}
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className={`text-[10px] truncate block ${
                                                                    isActive ? 'text-white/80' : 'text-gray-400'
                                                                }`}
                                                            >
                                                                {partner?.employeeProfile?.title || partner?.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    {cv.unreadCount && cv.unreadCount > 0 ? (
                                                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center">
                                                            {cv.unreadCount}
                                                        </span>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmModalAction({
                                                                type: 'DELETE_CHAT',
                                                                convId: cv.id,
                                                                title: title,
                                                            });
                                                        }}
                                                        className={`opacity-0 group-hover:opacity-100 p-1 rounded-[6px] transition-all cursor-pointer ${
                                                            isActive
                                                                ? 'hover:bg-white/20 text-white'
                                                                : 'hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-rose-500'
                                                        }`}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
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
                            className="sm:hidden p-1.5 -ml-1 rounded-[6px] text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer shrink-0"
                            aria-label="Back to conversations"
                        >
                            <ArrowLeft size={18} />
                        </button>

                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#2C4FD6] to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                            {currentConversation?.isGroup ? (
                                <Users size={16} />
                            ) : resolveAvatar(directPartner) ? (
                                <img
                                    src={resolveAvatar(directPartner)!}
                                    alt={directPartner?.name}
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                />
                            ) : (
                                directPartner?.name?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-[#12151C] dark:text-white truncate">
                                {currentConversation?.isGroup
                                    ? currentConversation.title
                                    : directPartner?.name || 'Conversation'}
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
                    </div>

                    {/* Action Buttons: Voice Call, Video Call, Delete/Leave, Details */}
                    <div className="flex items-center gap-1.5">
                        {/* Voice Call Button */}
                        {hasPermission('CHAT_CALL') && (
                            <button
                                onClick={() => handleStartCall('VOICE')}
                                className="p-2 rounded-[6px] text-gray-500 hover:text-[#2C4FD6] hover:bg-blue-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                            >
                                <Phone size={17} />
                            </button>
                        )}

                        {/* Video Call Button */}
                        {hasPermission('CHAT_CALL') && (
                            <button
                                onClick={() => handleStartCall('VIDEO')}
                                className="p-2 rounded-[6px] text-gray-500 hover:text-[#2C4FD6] hover:bg-blue-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                            >
                                <Video size={17} />
                            </button>
                        )}

                        {/* Leave Group / Delete Chat Button */}
                        {currentConversation?.isGroup ? (
                            <button
                                onClick={() =>
                                    setConfirmModalAction({
                                        type: 'LEAVE_GROUP',
                                        convId: currentConversation.id,
                                        title: currentConversation.title || 'Group Chat',
                                    })
                                }
                                className="p-2 rounded-[6px] text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all cursor-pointer"
                            >
                                <LogOut size={17} />
                            </button>
                        ) : currentConversation ? (
                            <button
                                onClick={() =>
                                    setConfirmModalAction({
                                        type: 'DELETE_CHAT',
                                        convId: currentConversation.id,
                                        title: directPartner?.name || 'this conversation',
                                    })
                                }
                                className="p-2 rounded-[6px] text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                            >
                                <Trash2 size={17} />
                            </button>
                        ) : null}

                        {/* Details Panel Toggle */}
                        <button
                            onClick={() => setShowDetailsPane(!showDetailsPane)}
                            className={`p-2 rounded-[6px] transition-all cursor-pointer ${
                                showDetailsPane
                                    ? 'bg-blue-50 dark:bg-white/10 text-[#2C4FD6] dark:text-blue-400'
                                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                        >
                            <Info size={17} />
                        </button>
                    </div>
                </div>

                {/* Active Group Call Rejoin Banner (Google Meet Style) */}
                {lastLeftCall && ((currentConversation?.isGroup && lastLeftCall.conversationId === currentConversation.id) || (currentConversation?.isGroup && lastLeftCall.groupTitle === currentConversation?.title)) && (
                    <div className="bg-[#2C4FD6]/10 border-b border-[#2C4FD6]/20 px-4 py-2.5 flex items-center justify-between animate-fade-in shrink-0">
                        <div className="flex items-center gap-2.5 text-xs text-gray-800 dark:text-gray-200">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-semibold">Ongoing group video meeting in this channel</span>
                            <span className="text-gray-500 dark:text-gray-400 hidden sm:inline">• You left this meeting</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => rejoinGroupCall()}
                                className="px-3.5 py-1.5 bg-[#2C4FD6] hover:bg-blue-600 text-white font-semibold text-xs rounded-[6px] transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                            >
                                <Video size={13} />
                                Rejoin Meeting
                            </button>
                            <button
                                onClick={dismissRejoin}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded transition-colors cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Message Feed */}
                <div
                    ref={messageContainerRef}
                    onScroll={handleMessagesScroll}
                    className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
                >
                    {/* Lazy Loading Older Messages Spinner */}
                    {loadingOlderMessages && (
                        <div className="flex items-center justify-center py-2 text-xs text-gray-400 gap-2">
                            <div className="w-3.5 h-3.5 border-2 border-[#2C4FD6] border-t-transparent rounded-full animate-spin" />
                            <span>Loading older messages...</span>
                        </div>
                    )}

                    {!hasMoreMessages && messages.length > 20 && (
                        <div className="text-center py-1 text-[11px] text-gray-400 border-b border-gray-100 dark:border-gray-800/60 pb-2">
                            Beginning of conversation history
                        </div>
                    )}

                    {messagesLoading ? (
                        <ChatMessagesSkeleton />
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-400">
                            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/30 text-[#2C4FD6] flex items-center justify-center mb-2">
                                <Smile size={24} />
                            </div>
                            <h4 className="text-sm font-semibold text-[#12151C] dark:text-white">
                                Welcome to {currentConversation?.isGroup ? currentConversation.title : directPartner?.name || 'Chat'}!
                            </h4>
                            <p className="text-xs text-gray-400 mt-0.5">This is the start of your message history.</p>
                        </div>
                    ) : (
                        messages
                            .filter((msg, index, self) => index === self.findIndex((m) => Number(m.id) === Number(msg.id)))
                            .map((msg, idx) => {
                                const isMe = msg.senderId === user?.id;
                                const avatar = resolveAvatar(msg.sender);

                                return (
                                    <div
                                        key={msg.id || idx}
                                        className={`flex gap-3 group relative ${isMe ? 'flex-row-reverse' : ''}`}
                                    >
                                        {/* Avatar */}
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                            {avatar ? (
                                                <img
                                                    src={avatar}
                                                    alt={msg.sender?.name}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                                />
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
                                                    className={`text-[11px] p-2 rounded-[6px] border-l-2 bg-gray-50 dark:bg-white/5 ${
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

                                            {/* Main Bubble */}
                                            <div
                                                className={`p-3 rounded-[6px] text-xs sm:text-[13px] leading-relaxed shadow-sm break-words relative ${
                                                    isMe
                                                        ? 'bg-[#2C4FD6] text-white rounded-tr-none'
                                                        : 'bg-[#F4F6F8] dark:bg-[#1A1F2B] text-[#12151C] dark:text-gray-200 rounded-tl-none border border-[#E2E6ED]/60 dark:border-gray-800'
                                                }`}
                                            >
                                                {msg.isDeleted ? (
                                                    <span className="italic text-gray-400">This message was deleted</span>
                                                ) : (
                                                    <>
                                                        <p className="whitespace-pre-wrap">{msg.content}</p>

                                                        {/* Attachments rendering */}
                                                        {msg.attachments && msg.attachments.length > 0 && (
                                                            <div className="mt-2 space-y-2">
                                                                {msg.attachments.map((att, aIdx) => {
                                                                    const isImg = att.fileType?.startsWith('image/');
                                                                    const fullUrl = getMediaUrl(att.fileUrl);

                                                                    return isImg ? (
                                                                        <div key={aIdx} className="rounded-[6px] overflow-hidden border border-white/20 max-w-xs">
                                                                            <img
                                                                                src={fullUrl}
                                                                                alt={att.fileName}
                                                                                loading="lazy"
                                                                                className="max-h-60 w-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                                                onClick={() => window.open(fullUrl, '_blank')}
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div
                                                                            key={aIdx}
                                                                            className={`flex items-center justify-between gap-2.5 p-2 rounded-[6px] border text-xs transition-colors ${
                                                                                isMe
                                                                                    ? 'bg-blue-700/60 border-blue-400 text-white'
                                                                                    : 'bg-white dark:bg-black/30 border-gray-200 dark:border-gray-700 text-[#12151C] dark:text-white'
                                                                            }`}
                                                                        >
                                                                            <div
                                                                                onClick={() => window.open(fullUrl, '_blank')}
                                                                                className="flex items-center gap-2 min-w-0 cursor-pointer hover:underline flex-1"
                                                                            >
                                                                                <FileText size={16} className="shrink-0" />
                                                                                <span className="truncate font-medium">{att.fileName}</span>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={async (e) => {
                                                                                    e.stopPropagation();
                                                                                    toast.loading('Downloading file...', { id: `dl-${att.id || aIdx}` });
                                                                                    try {
                                                                                        await downloadFile(fullUrl, att.fileName);
                                                                                        toast.success('Downloaded successfully', { id: `dl-${att.id || aIdx}` });
                                                                                    } catch {
                                                                                        toast.error('Download failed', { id: `dl-${att.id || aIdx}` });
                                                                                    }
                                                                                }}
                                                                                className={`p-1 rounded-[6px] transition-colors cursor-pointer shrink-0 ${
                                                                                    isMe
                                                                                        ? 'hover:bg-blue-800 text-white'
                                                                                        : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300'
                                                                                }`}
                                                                            >
                                                                                <Download size={15} />
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Hover Actions Menu */}
                                            {!msg.isDeleted && (
                                                <div
                                                    className={`absolute top-0 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-[#1E232F] shadow-md border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] p-1 z-10 ${
                                                        isMe ? 'right-full mr-2' : 'left-full ml-2'
                                                    }`}
                                                >
                                                    <button
                                                        onClick={() => setReplyTo(msg)}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-[6px] text-gray-500 hover:text-gray-800 dark:hover:text-white cursor-pointer"
                                                    >
                                                        <Reply size={13} />
                                                    </button>
                                                    {isMe && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingMessage(msg);
                                                                    setInputText(msg.content);
                                                                }}
                                                                className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-[6px] text-gray-500 hover:text-gray-800 dark:hover:text-white cursor-pointer"
                                                            >
                                                                <Edit2 size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => setMessageToDelete(msg.id)}
                                                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-[6px] text-rose-500 cursor-pointer"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                    )}
                    <div ref={messageEndRef} />
                </div>

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                    <div className="px-6 py-1.5 text-[11px] text-gray-400 italic flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2C4FD6] animate-pulse" />
                        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </div>
                )}

                {/* Reply Banner */}
                {replyTo && (
                    <div className="px-6 py-2 bg-blue-50/70 dark:bg-blue-950/20 border-t border-[#E2E6ED] dark:border-gray-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                            <Reply size={14} className="text-[#2C4FD6]" />
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                                Replying to {replyTo.sender?.name}:
                            </span>
                            <span className="truncate text-gray-500">{replyTo.content}</span>
                        </div>
                        <button
                            onClick={() => setReplyTo(null)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-[6px] cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Editing Message Banner */}
                {editingMessage && (
                    <div className="px-6 py-2 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <Edit2 size={14} className="text-amber-600 dark:text-amber-400" />
                            <span className="font-semibold text-amber-700 dark:text-amber-300">
                                Editing message:
                            </span>
                            <span className="truncate text-gray-600 dark:text-gray-400 max-w-sm">
                                {editingMessage.content}
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                setEditingMessage(null);
                                setInputText('');
                            }}
                            className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-[6px] cursor-pointer text-amber-700"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Staged Attachment Preview Banner */}
                {stagedAttachment && (
                    <div className="px-4 py-2.5 bg-blue-50/80 dark:bg-[#1A1F2B] border-t border-[#E2E6ED] dark:border-gray-800 flex items-center justify-between animate-fade-in">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-[6px] bg-[#2C4FD6]/10 text-[#2C4FD6] flex items-center justify-center shrink-0">
                                <FileText size={16} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#12151C] dark:text-white truncate">
                                    {stagedAttachment.fileName}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                    {stagedAttachment.fileSize ? `${(stagedAttachment.fileSize / 1024).toFixed(1)} KB` : 'Attached file'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setStagedAttachment(null)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-[6px] text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={15} />
                        </button>
                    </div>
                )}

                {/* Message Input Box */}
                <form
                    onSubmit={handleSendMessage}
                    noValidate
                    className="p-3 sm:p-4 border-t border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#12151C] flex items-center gap-2 shrink-0"
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingFile}
                        className="p-2 rounded-[6px] text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                    >
                        {uploadingFile ? (
                            <div className="w-4 h-4 border-2 border-[#2C4FD6] border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Paperclip size={18} />
                        )}
                    </button>

                    {/* Text Input */}
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder={
                            editingMessage
                                ? 'Edit message...'
                                : stagedAttachment
                                ? 'Add a message with this file (optional)...'
                                : `Message ${currentConversation?.isGroup ? currentConversation.title : directPartner?.name || 'chat'}...`
                        }
                        className="flex-1 px-4 py-2.5 bg-[#F8FAFC] dark:bg-[#1A1F2B] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-xs sm:text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                    />

                    {/* Send Button */}
                    <button
                        type="submit"
                        disabled={!inputText.trim() && !stagedAttachment}
                        className="p-2.5 rounded-[6px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shrink-0"
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
                            className="p-1 rounded-[6px] text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Summary Info */}
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-[6px] bg-gradient-to-tr from-[#2C4FD6] to-indigo-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-2.5 shadow-md overflow-hidden">
                                {currentConversation?.isGroup ? (
                                    <Users size={28} />
                                ) : resolveAvatar(directPartner) ? (
                                    <img
                                        src={resolveAvatar(directPartner)!}
                                        alt={directPartner?.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                    />
                                ) : (
                                    directPartner?.name?.charAt(0).toUpperCase() || 'U'
                                )}
                            </div>
                            <h3 className="text-sm font-bold text-[#12151C] dark:text-white">
                                {currentConversation?.isGroup ? currentConversation.title : directPartner?.name}
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {currentConversation?.isGroup
                                    ? `${currentConversation.participants.length} group members`
                                    : directPartner?.employeeProfile?.title || directPartner?.email}
                            </p>
                        </div>

                        {/* Call Actions */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handleStartCall('VOICE')}
                                className="py-2 px-3 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#1A1F2B] text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-[#2C4FD6] transition-all cursor-pointer"
                            >
                                <Phone size={13} className="text-[#2C4FD6]" /> Voice Call
                            </button>
                            <button
                                onClick={() => handleStartCall('VIDEO')}
                                className="py-2 px-3 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#1A1F2B] text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-[#2C4FD6] transition-all cursor-pointer"
                            >
                                <Video size={13} className="text-[#2C4FD6]" /> Video Call
                            </button>
                        </div>

                        {/* Member List */}
                        <div>
                            <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Members ({currentConversation?.participants?.length || 0})
                            </h5>
                            <div className="space-y-1.5">
                                {currentConversation?.participants?.map((p) => {
                                    const emp = p.user;
                                    if (!emp) return null;
                                    const isOnline = isUserOnline(emp.id);
                                    const avatar = resolveAvatar(emp);

                                    return (
                                        <div
                                            key={emp.id}
                                            className="flex items-center justify-between p-1.5 rounded-[6px] hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="relative">
                                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                                                        {avatar ? (
                                                            <img
                                                                src={avatar}
                                                                alt={emp.name}
                                                                loading="lazy"
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                                            />
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
                                                >
                                                    <Phone size={12} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Conversation Options */}
                        <div className="pt-4 border-t border-[#E2E6ED] dark:border-gray-800 space-y-2">
                            <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Options
                            </h5>
                            {currentConversation?.isGroup ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setConfirmModalAction({
                                                type: 'LEAVE_GROUP',
                                                convId: currentConversation.id,
                                                title: currentConversation.title || 'Group Chat',
                                            })
                                        }
                                        className="w-full py-2 px-3 rounded-[6px] border border-amber-300 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 transition-all cursor-pointer"
                                    >
                                        <LogOut size={14} /> Leave Group
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setConfirmModalAction({
                                                type: 'DELETE_CHAT',
                                                convId: currentConversation.id,
                                                title: currentConversation.title || 'Group Chat',
                                            })
                                        }
                                        className="w-full py-2 px-3 rounded-[6px] border border-rose-300 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-rose-100/60 dark:hover:bg-rose-900/30 transition-all cursor-pointer"
                                    >
                                        <Trash2 size={14} /> Delete Group Chat
                                    </button>
                                </>
                            ) : currentConversation ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setConfirmModalAction({
                                            type: 'DELETE_CHAT',
                                            convId: currentConversation.id,
                                            title: directPartner?.name || 'this conversation',
                                        })
                                    }
                                    className="w-full py-2 px-3 rounded-[6px] border border-rose-300 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-rose-100/60 dark:hover:bg-rose-900/30 transition-all cursor-pointer"
                                >
                                    <Trash2 size={14} /> Delete Chat
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* Create New Group / Direct Chat Modal (Lazy Loaded) */}
            {showCreateModal && (
                <Suspense fallback={null}>
                    <CreateTeamChannelModal
                        isOpen={showCreateModal}
                        onClose={() => setShowCreateModal(false)}
                        employees={employees}
                        teams={teams}
                        currentUserId={user?.id as number}
                        onConversationCreated={(newConv) => {
                            setConversations((prev) => {
                                const withoutNew = prev.filter((c) => c.id !== newConv.id);
                                return [newConv, ...withoutNew];
                            });
                            setActiveConvId(newConv.id);
                            setMobileView('CHAT');
                        }}
                    />
                </Suspense>
            )}

            {/* Custom UI Delete Message Confirmation Modal */}
            {messageToDelete !== null && createPortal(
                <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-md animate-fade-in"
                        onClick={() => !isDeletingMessage && setMessageToDelete(null)}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-white dark:bg-[#12151C] w-full max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-[6px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden animate-scale-in p-8 text-center">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={30} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                            Delete Message?
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
                            Are you sure you want to delete this message? This action cannot be undone.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                type="button"
                                onClick={confirmDeleteMessage}
                                disabled={isDeletingMessage}
                                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-[6px] transition-all shadow-lg shadow-red-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {isDeletingMessage ? 'Deleting...' : 'Delete'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setMessageToDelete(null)}
                                disabled={isDeletingMessage}
                                className="w-full py-3.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-bold rounded-[6px] hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Custom UI Delete Chat / Leave Group Confirmation Modal */}
            {confirmModalAction !== null && createPortal(
                <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-md animate-fade-in"
                        onClick={() => !isProcessingAction && setConfirmModalAction(null)}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-white dark:bg-[#12151C] w-full max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-[6px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden animate-scale-in p-8 text-center">
                        <div
                            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${
                                confirmModalAction.type === 'LEAVE_GROUP'
                                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500'
                                    : 'bg-red-50 dark:bg-red-500/10 text-red-500'
                            }`}
                        >
                            {confirmModalAction.type === 'LEAVE_GROUP' ? <LogOut size={30} /> : <Trash2 size={30} />}
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                            {confirmModalAction.type === 'LEAVE_GROUP' ? 'Leave Group?' : 'Delete Chat?'}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
                            {confirmModalAction.type === 'LEAVE_GROUP'
                                ? `Are you sure you want to leave "${confirmModalAction.title}"? You will not receive any further messages.`
                                : `Are you sure you want to delete this chat with "${confirmModalAction.title}"? This conversation and its history will be deleted.`}
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                type="button"
                                onClick={handleConfirmConversationAction}
                                disabled={isProcessingAction}
                                className={`w-full py-3.5 text-white font-bold rounded-[6px] transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer ${
                                    confirmModalAction.type === 'LEAVE_GROUP'
                                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                                        : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                                }`}
                            >
                                {isProcessingAction
                                    ? 'Processing...'
                                    : confirmModalAction.type === 'LEAVE_GROUP'
                                    ? 'Leave'
                                    : 'Delete'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmModalAction(null)}
                                disabled={isProcessingAction}
                                className="w-full py-3.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-bold rounded-[6px] hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
