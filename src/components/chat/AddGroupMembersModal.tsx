import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Search, Check, Loader2, Users } from 'lucide-react';
import type { EmployeeSummary } from '../../types/chat';
import api, { getMediaUrl } from '../../utils/api';
import toast from 'react-hot-toast';

interface AddGroupMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: number;
    groupTitle?: string;
    existingMemberIds: number[];
    employees: EmployeeSummary[];
    onMembersAdded: (updatedConv: any, addedUsers: any[]) => void;
}

export default function AddGroupMembersModal({
    isOpen,
    onClose,
    conversationId,
    groupTitle,
    existingMemberIds,
    employees,
    onMembersAdded,
}: AddGroupMembersModalProps) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // Filter available employees who are not yet members of this group
    const availableEmployees = useMemo(() => {
        const existingSet = new Set(existingMemberIds.map(Number));
        return employees.filter((emp) => !existingSet.has(Number(emp.id)));
    }, [employees, existingMemberIds]);

    const filteredEmployees = useMemo(() => {
        if (!searchQuery.trim()) return availableEmployees;
        const q = searchQuery.toLowerCase().trim();
        return availableEmployees.filter(
            (emp) =>
                emp.name?.toLowerCase().includes(q) ||
                emp.email?.toLowerCase().includes(q) ||
                emp.employeeProfile?.title?.toLowerCase().includes(q) ||
                emp.employeeProfile?.department?.toLowerCase().includes(q)
        );
    }, [availableEmployees, searchQuery]);

    if (!isOpen) return null;

    const toggleMember = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredEmployees.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredEmployees.map((e) => Number(e.id)));
        }
    };

    const handleAddMembers = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedIds.length === 0) {
            toast.error('Please select at least one employee');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post(`/communication/conversations/${conversationId}/members`, {
                userIds: selectedIds,
            });

            toast.success(
                res.data?.message || `Added ${selectedIds.length} member${selectedIds.length > 1 ? 's' : ''} to group!`
            );

            onMembersAdded(res.data.conversation, res.data.addedUsers || []);
            onClose();
        } catch (err: any) {
            console.error('[AddGroupMembersModal] error:', err);
            toast.error(err.response?.data?.message || 'Failed to add members');
        } finally {
            setLoading(false);
        }
    };

    const resolveAvatar = (emp: any) => {
        const raw =
            emp?.employeeProfile?.avatar ||
            emp?.employeeProfile?.profilePicture ||
            emp?.avatar ||
            emp?.profilePicture;
        if (!raw || typeof raw !== 'string' || raw.startsWith('bg-')) return null;
        return getMediaUrl(raw);
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md animate-fade-in"
            onClick={() => {
                if (!loading) onClose();
            }}
        >
            <div
                className="bg-white dark:bg-[#12151C] rounded-[10px] border border-[#E2E6ED] dark:border-gray-800 shadow-2xl w-full max-w-md overflow-hidden animate-scale-in flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-white/5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[8px] bg-blue-50 dark:bg-blue-950/40 text-[#2C4FD6] dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/40">
                            <UserPlus size={17} />
                        </div>
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-[#12151C] dark:text-white leading-tight">
                                Add Members
                            </h3>
                            <p className="text-[11.5px] text-[#5B6472] dark:text-gray-400 truncate max-w-[240px] sm:max-w-[280px]">
                                to {groupTitle || 'Group Chat'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white p-1 rounded transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search Bar & Counter */}
                <div className="p-4 border-b border-[#E2E6ED] dark:border-gray-800/80 space-y-2.5">
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search employees by name, title, or department..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[7px] text-[13px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6] transition-all placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {availableEmployees.length > 0 && (
                        <div className="flex items-center justify-between text-[11.5px] text-[#5B6472] dark:text-gray-400 pt-0.5 px-0.5">
                            <span>
                                {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''} available
                            </span>
                            {filteredEmployees.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    className="text-[#2C4FD6] dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                                >
                                    {selectedIds.length === filteredEmployees.length && filteredEmployees.length > 0
                                        ? 'Deselect All'
                                        : 'Select All'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Employee Selection List */}
                <div className="p-3 overflow-y-auto flex-1 custom-scrollbar space-y-1 min-h-[220px]">
                    {availableEmployees.length === 0 ? (
                        <div className="p-8 text-center text-[#5B6472] dark:text-gray-400 flex flex-col items-center justify-center">
                            <Users size={32} className="text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm font-semibold text-[#12151C] dark:text-white mb-0.5">
                                All Employees Are Already in Group
                            </p>
                            <p className="text-xs text-gray-400">
                                Every active employee in your company is already a member of this chat.
                            </p>
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-xs italic">
                            No employees match "{searchQuery}"
                        </div>
                    ) : (
                        filteredEmployees.map((emp) => {
                            const isSelected = selectedIds.includes(Number(emp.id));
                            const avatar = resolveAvatar(emp);

                            return (
                                <div
                                    key={emp.id}
                                    onClick={() => toggleMember(Number(emp.id))}
                                    className={`flex items-center justify-between p-2.5 rounded-[8px] cursor-pointer transition-all border ${
                                        isSelected
                                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-[#2C4FD6]/40 text-[#2C4FD6]'
                                            : 'hover:bg-gray-50 dark:hover:bg-white/5 border-transparent text-[#12151C] dark:text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                            {avatar ? (
                                                <img
                                                    src={avatar}
                                                    alt={emp.name}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLElement).style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                emp.name?.charAt(0)?.toUpperCase() || 'U'
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-semibold text-[#12151C] dark:text-white truncate">
                                                {emp.name}
                                            </p>
                                            <p className="text-[11px] text-[#5B6472] dark:text-gray-400 truncate">
                                                {emp.employeeProfile?.title || emp.employeeProfile?.department || emp.email}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`w-5 h-5 rounded-[5px] border flex items-center justify-center transition-all shrink-0 ${
                                            isSelected
                                                ? 'bg-[#2C4FD6] border-[#2C4FD6] text-white'
                                                : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161B26]'
                                        }`}
                                    >
                                        {isSelected && <Check size={12} strokeWidth={3} />}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-3.5 sm:p-4 border-t border-[#E2E6ED] dark:border-gray-800 bg-[#F7F8FA] dark:bg-white/5 flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">
                        {selectedIds.length > 0 ? (
                            <span className="text-[#2C4FD6] dark:text-blue-400 font-bold">
                                {selectedIds.length} selected
                            </span>
                        ) : (
                            <span className="text-gray-400">None selected</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="py-2 px-3.5 bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-300 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 font-semibold text-[13px] transition-all cursor-pointer disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleAddMembers}
                            disabled={loading || selectedIds.length === 0}
                            className="py-2 px-4 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] font-semibold text-[13px] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Adding...</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus size={14} />
                                    <span>Add {selectedIds.length > 0 ? `${selectedIds.length} ` : ''}Member{selectedIds.length !== 1 ? 's' : ''}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
