import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, User, Search, Check } from 'lucide-react';
import type { EmployeeSummary } from '../../types/chat';
import api, { getMediaUrl } from '../../utils/api';
import toast from 'react-hot-toast';

interface CreateTeamChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    employees: EmployeeSummary[];
    teams?: { id: number; name: string }[];
    onChannelCreated?: (channel: any) => void;
    onConversationCreated: (conversation: any) => void;
    currentUserId: number;
}

export default function CreateTeamChannelModal({
    isOpen,
    onClose,
    employees,
    onConversationCreated,
    currentUserId,
}: CreateTeamChannelModalProps) {
    const [activeTab, setActiveTab] = useState<'GROUP' | 'DIRECT'>('GROUP');

    // Group Form State
    const [groupTitle, setGroupTitle] = useState('');
    const [titleError, setTitleError] = useState('');
    const [groupMembers, setGroupMembers] = useState<number[]>([]);

    // Search query for members
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const filteredEmployees = employees.filter((emp) =>
        Number(emp.id) !== Number(currentUserId) &&
        (emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const toggleMember = (id: number) => {
        setGroupMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
    };

    const handleCreateGroupChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupTitle.trim()) {
            setTitleError('Please enter a group chat name');
            return;
        }
        setTitleError('');
        if (groupMembers.length === 0) {
            toast.error('Select at least one member');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/communication/conversations', {
                isGroup: true,
                title: groupTitle.trim(),
                participantIds: groupMembers,
            });
            toast.success('Group chat created!');
            onConversationCreated(res.data);
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    const handleStartDirectChat = async (targetUserId: number) => {
        if (Number(targetUserId) === Number(currentUserId)) {
            toast.error('You cannot start a direct chat with yourself');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/communication/conversations', {
                targetUserId,
                isGroup: false,
            });
            onConversationCreated(res.data);
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to start chat');
        } finally {
            setLoading(false);
        }
    };

    const resolveAvatar = (emp: any) => {
        const raw =
            emp?.employeeProfile?.avatar ||
            emp?.employeeProfile?.profilePicture ||
            emp?.employeeProfile?.profilePictureUrl ||
            emp?.avatar ||
            emp?.profilePicture ||
            emp?.profilePictureUrl;
        if (!raw || typeof raw !== 'string' || raw.startsWith('bg-')) return null;
        return getMediaUrl(raw);
    };

    return createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex items-center justify-between bg-[#F7F8FA] dark:bg-white/5">
                    <h3 className="text-base font-bold text-[#12151C] dark:text-white">
                        {activeTab === 'GROUP' ? 'New Group Chat' : 'Start Direct Chat'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#E2E6ED] dark:border-gray-800 bg-[#F7F8FA]/50 dark:bg-white/2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('GROUP')}
                        className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                            activeTab === 'GROUP'
                                ? 'border-[#2C4FD6] text-[#2C4FD6] dark:text-blue-400 bg-white dark:bg-[#12151C]'
                                : 'border-transparent text-[#5B6472] dark:text-gray-400 hover:text-[#12151C]'
                        }`}
                    >
                        <Users size={15} /> Group Chat
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('DIRECT')}
                        className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                            activeTab === 'DIRECT'
                                ? 'border-[#2C4FD6] text-[#2C4FD6] dark:text-blue-400 bg-white dark:bg-[#12151C]'
                                : 'border-transparent text-[#5B6472] dark:text-gray-400 hover:text-[#12151C]'
                        }`}
                    >
                        <User size={15} /> Direct Message
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* TAB 1: GROUP CHAT */}
                    {activeTab === 'GROUP' && (
                        <form onSubmit={handleCreateGroupChat} noValidate className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300 block mb-1">
                                    Group Chat Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={groupTitle}
                                    onChange={(e) => {
                                        setGroupTitle(e.target.value);
                                        if (titleError) setTitleError('');
                                    }}
                                    placeholder="e.g. Engineering Team, Design Sprint, Project Alpha"
                                    className={`w-full px-3 py-2 bg-white dark:bg-[#1A1F2B] border rounded-lg text-sm text-[#12151C] dark:text-white outline-none transition-all ${
                                        titleError
                                            ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20'
                                            : 'border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]'
                                    }`}
                                />
                                {titleError && (
                                    <p className="text-[11px] text-rose-500 font-medium mt-1 animate-fade-in">
                                        {titleError}
                                    </p>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300 block">
                                        Select Members ({groupMembers.length} selected)
                                    </label>
                                </div>
                                <div className="relative mb-2">
                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search members..."
                                        className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#1A1F2B] border border-[#E2E6ED] dark:border-gray-700 rounded-lg text-xs text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                                    />
                                </div>
                                <div className="border border-[#E2E6ED] dark:border-gray-800 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredEmployees.length === 0 ? (
                                        <div className="p-4 text-center text-xs text-gray-400">No members found</div>
                                    ) : (
                                        filteredEmployees.map((emp) => {
                                            const isChecked = groupMembers.includes(emp.id);
                                            const avatar = resolveAvatar(emp);
                                            return (
                                                <div
                                                    key={emp.id}
                                                    onClick={() => toggleMember(emp.id)}
                                                    className={`p-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-xs ${isChecked ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-[11px] flex items-center justify-center overflow-hidden shrink-0">
                                                            {avatar ? (
                                                                <img
                                                                    src={avatar}
                                                                    alt={emp.name}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                                                />
                                                            ) : (
                                                                emp.name.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-[#12151C] dark:text-white block">{emp.name}</span>
                                                            <span className="text-[10px] text-gray-400">{emp.employeeProfile?.title || emp.email}</span>
                                                        </div>
                                                    </div>
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'bg-[#2C4FD6] border-[#2C4FD6] text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                                        {isChecked && <Check size={10} />}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || groupMembers.length === 0}
                                className="w-full py-2.5 rounded-lg bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-xs transition-all cursor-pointer disabled:opacity-50 mt-2"
                            >
                                {loading ? 'Creating Group...' : 'Create Group Chat'}
                            </button>
                        </form>
                    )}

                    {/* TAB 2: DIRECT MESSAGE */}
                    {activeTab === 'DIRECT' && (
                        <div className="space-y-3">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search colleague by name or email..."
                                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#1A1F2B] border border-[#E2E6ED] dark:border-gray-700 rounded-lg text-sm text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                                />
                            </div>

                            <div className="border border-[#E2E6ED] dark:border-gray-800 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredEmployees.length === 0 ? (
                                    <div className="p-6 text-center text-xs text-gray-400">No employees found</div>
                                ) : (
                                    filteredEmployees.map((emp) => {
                                        const avatar = resolveAvatar(emp);
                                        return (
                                            <div
                                                key={emp.id}
                                                onClick={() => handleStartDirectChat(emp.id)}
                                                className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                                        {avatar ? (
                                                            <img
                                                                src={avatar}
                                                                alt={emp.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            emp.name.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-[#12151C] dark:text-white">{emp.name}</h4>
                                                        <p className="text-[11px] text-gray-400">{emp.employeeProfile?.title || emp.email}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs text-[#2C4FD6] dark:text-blue-400 font-medium">Chat</span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
