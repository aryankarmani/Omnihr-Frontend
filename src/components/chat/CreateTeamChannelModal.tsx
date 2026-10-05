import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Hash, Users, User, Lock, Globe, Search, Check } from 'lucide-react';
import type { EmployeeSummary } from '../../types/chat';
import api, { getMediaUrl } from '../../utils/api';
import toast from 'react-hot-toast';

interface CreateTeamChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    employees: EmployeeSummary[];
    teams: { id: number; name: string }[];
    onChannelCreated: (channel: any) => void;
    onConversationCreated: (conversation: any) => void;
    currentUserId: number;
}

export default function CreateTeamChannelModal({
    isOpen,
    onClose,
    employees,
    teams,
    onChannelCreated,
    onConversationCreated,
    currentUserId,
}: CreateTeamChannelModalProps) {
    const [activeTab, setActiveTab] = useState<'CHANNEL' | 'GROUP' | 'DIRECT'>('CHANNEL');

    // Channel Form State
    const [channelName, setChannelName] = useState('');
    const [channelDesc, setChannelDesc] = useState('');
    const [teamId, setTeamId] = useState<number | ''>('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

    // Group Form State
    const [groupTitle, setGroupTitle] = useState('');
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

    const toggleMember = (id: number, isGroup = false) => {
        if (isGroup) {
            setGroupMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
        } else {
            setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
        }
    };

    const handleCreateChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!channelName.trim()) {
            toast.error('Channel name is required');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/communication/channels', {
                name: channelName,
                description: channelDesc,
                teamId: teamId ? Number(teamId) : null,
                isPrivate,
                memberIds: selectedMembers,
            });
            toast.success(`Channel #${res.data.name} created!`);
            onChannelCreated(res.data);
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create channel');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroupChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupTitle.trim()) {
            toast.error('Group name is required');
            return;
        }
        if (groupMembers.length === 0) {
            toast.error('Select at least one member');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/communication/conversations', {
                isGroup: true,
                title: groupTitle,
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

    return createPortal(
        <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex items-center justify-between bg-[#F7F8FA] dark:bg-white/5">
                    <h3 className="text-base font-bold text-[#12151C] dark:text-white">
                        {activeTab === 'CHANNEL' ? 'Create Channel' : activeTab === 'GROUP' ? 'New Group Conversation' : 'Start 1:1 Chat'}
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
                        onClick={() => setActiveTab('CHANNEL')}
                        className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                            activeTab === 'CHANNEL'
                                ? 'border-[#2C4FD6] text-[#2C4FD6] dark:text-blue-400 bg-white dark:bg-[#12151C]'
                                : 'border-transparent text-[#5B6472] dark:text-gray-400 hover:text-[#12151C]'
                        }`}
                    >
                        <Hash size={15} /> Channel
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
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* TAB 1: CHANNEL */}
                    {activeTab === 'CHANNEL' && (
                        <form onSubmit={handleCreateChannel} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300 block mb-1">
                                    Channel Name
                                </label>
                                <div className="relative">
                                    <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        value={channelName}
                                        onChange={(e) => setChannelName(e.target.value)}
                                        placeholder="e.g. general, frontend, announcements"
                                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#1A1F2B] border border-[#E2E6ED] dark:border-gray-700 rounded-lg text-sm text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300 block mb-1">
                                    Description (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={channelDesc}
                                    onChange={(e) => setChannelDesc(e.target.value)}
                                    placeholder="What is this channel about?"
                                    className="w-full px-3 py-2 bg-white dark:bg-[#1A1F2B] border border-[#E2E6ED] dark:border-gray-700 rounded-lg text-sm text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                                />
                            </div>

                            {teams.length > 0 && (
                                <div>
                                    <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300 block mb-1">
                                        Attach to Team (Optional)
                                    </label>
                                    <select
                                        value={teamId}
                                        onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : '')}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#1A1F2B] border border-[#E2E6ED] dark:border-gray-700 rounded-lg text-sm text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                                    >
                                        <option value="">No Team (Standalone Company Channel)</option>
                                        {teams.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Privacy Toggle */}
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-[#E2E6ED] dark:border-gray-800 bg-[#F8FAFC] dark:bg-white/5">
                                <button
                                    type="button"
                                    onClick={() => setIsPrivate(!isPrivate)}
                                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${isPrivate ? 'bg-[#2C4FD6]' : 'bg-gray-300 dark:bg-gray-700'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isPrivate ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                                <div>
                                    <p className="text-xs font-semibold text-[#12151C] dark:text-white flex items-center gap-1.5">
                                        {isPrivate ? <Lock size={13} className="text-amber-500" /> : <Globe size={13} className="text-blue-500" />}
                                        {isPrivate ? 'Private Channel' : 'Public Channel'}
                                    </p>
                                    <p className="text-[11px] text-[#5B6472] dark:text-gray-400">
                                        {isPrivate ? 'Only invited members can view this channel' : 'Anyone in the organization can join and view'}
                                    </p>
                                </div>
                            </div>

                            {/* Members Picker */}
                            <div>
                                <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300 block mb-1">
                                    Add Initial Members ({selectedMembers.length} selected)
                                </label>
                                <div className="border border-[#E2E6ED] dark:border-gray-800 rounded-lg max-h-36 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredEmployees.map((emp) => {
                                        const isChecked = selectedMembers.includes(emp.id);
                                        return (
                                            <div
                                                key={emp.id}
                                                onClick={() => toggleMember(emp.id, false)}
                                                className={`p-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-xs ${isChecked ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] flex items-center justify-center">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-[#12151C] dark:text-white block">{emp.name}</span>
                                                        <span className="text-[10px] text-gray-400">{emp.email}</span>
                                                    </div>
                                                </div>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'bg-[#2C4FD6] border-[#2C4FD6] text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                                    {isChecked && <Check size={10} />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 rounded-lg bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-xs transition-all cursor-pointer disabled:opacity-50 mt-2"
                            >
                                {loading ? 'Creating Channel...' : 'Create Channel'}
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
                                        const avatar = emp.employeeProfile?.avatar ? getMediaUrl(emp.employeeProfile.avatar) : null;
                                        return (
                                            <div
                                                key={emp.id}
                                                onClick={() => handleStartDirectChat(emp.id)}
                                                className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                                                        {avatar ? (
                                                            <img src={avatar} alt={emp.name} className="w-full h-full object-cover" />
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

                    {/* TAB 3: GROUP CHAT */}
                    {activeTab === 'GROUP' && (
                        <form onSubmit={handleCreateGroupChat} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300 block mb-1">
                                    Group Chat Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={groupTitle}
                                    onChange={(e) => setGroupTitle(e.target.value)}
                                    placeholder="e.g. HRMS Project, Sales Q4"
                                    className="w-full px-3 py-2 bg-white dark:bg-[#1A1F2B] border border-[#E2E6ED] dark:border-gray-700 rounded-lg text-sm text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300 block mb-1">
                                    Select Members ({groupMembers.length} selected)
                                </label>
                                <div className="border border-[#E2E6ED] dark:border-gray-800 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredEmployees.map((emp) => {
                                        const isChecked = groupMembers.includes(emp.id);
                                        return (
                                            <div
                                                key={emp.id}
                                                onClick={() => toggleMember(emp.id, true)}
                                                className={`p-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-xs ${isChecked ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] flex items-center justify-center">
                                                        {emp.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-[#12151C] dark:text-white block">{emp.name}</span>
                                                        <span className="text-[10px] text-gray-400">{emp.email}</span>
                                                    </div>
                                                </div>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'bg-[#2C4FD6] border-[#2C4FD6] text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                                    {isChecked && <Check size={10} />}
                                                </div>
                                            </div>
                                        );
                                    })}
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
                </div>
            </div>
        </div>,
        document.body
    );
}
