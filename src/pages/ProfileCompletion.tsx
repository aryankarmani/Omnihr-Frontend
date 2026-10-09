import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, Plus, Trash2, Mail, Loader2, CheckCircle2, RefreshCw, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

interface InviteRow {
    id: string | number;
    email: string;
    status: 'Pending' | 'Failed' | 'Completed';
    sending?: boolean;
    error?: string;
    checking?: boolean;
}

export default function ProfileCompletion() {
    const [rows, setRows] = useState<InviteRow[]>([
        { id: 'new-1', email: '', status: 'Pending' }
    ]);
    const [loading, setLoading] = useState(true);
    const [itemToDelete, setItemToDelete] = useState<{ index: number; id: string | number; email: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Fetch existing onboarding invites from backend
    const fetchInvites = async () => {
        try {
            setLoading(true);
            const res = await api.get('/employee/onboarding-invites');
            const data: any[] = res.data || [];

            if (data.length > 0) {
                setRows([
                    ...data.map((item: any, idx: number) => ({
                        id: item.id || `invite-${idx}`,
                        email: item.email || '',
                        status: (item.status as any) || 'Pending'
                    })),
                    // Keep one empty row ready for typing a new email
                    { id: `new-${Date.now()}`, email: '', status: 'Pending' }
                ]);
            } else {
                setRows([
                    { id: 'new-1', email: '', status: 'Pending' }
                ]);
            }
        } catch (error) {
            console.error('Failed to load onboarding invites:', error);
            // Default empty row
            setRows([
                { id: 'new-1', email: '', status: 'Pending' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvites();
    }, []);

    const validateRowEmail = async (index: number, emailVal?: string): Promise<boolean> => {
        const emailToCheck = (emailVal !== undefined ? emailVal : rows[index]?.email || '').trim().toLowerCase();
        if (!emailToCheck) {
            setRows(prev => {
                const updated = [...prev];
                if (updated[index]) updated[index] = { ...updated[index], error: undefined };
                return updated;
            });
            return true;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailToCheck)) {
            setRows(prev => {
                const updated = [...prev];
                if (updated[index]) updated[index] = { ...updated[index], error: 'Please enter a valid email address.' };
                return updated;
            });
            return false;
        }

        // Check duplicate within other rows in this table
        const otherIndex = rows.findIndex((r, idx) => idx !== index && r.email.trim().toLowerCase() === emailToCheck);
        if (otherIndex !== -1) {
            const dupErr = 'This email is already in the list.';
            setRows(prev => {
                const updated = [...prev];
                if (updated[index]) updated[index] = { ...updated[index], error: dupErr };
                return updated;
            });
            return false;
        }

        // Check against company database: /employee/check-email?email=...
        try {
            setRows(prev => {
                const updated = [...prev];
                if (updated[index]) updated[index] = { ...updated[index], checking: true };
                return updated;
            });

            const res = await api.get(`/employee/check-email?email=${encodeURIComponent(emailToCheck)}`);
            if (res.data?.exists) {
                const dbErr = 'This email is already in use. Please use a different email address.';
                setRows(prev => {
                    const updated = [...prev];
                    if (updated[index]) updated[index] = { ...updated[index], error: dbErr, checking: false };
                    return updated;
                });
                return false;
            } else {
                setRows(prev => {
                    const updated = [...prev];
                    if (updated[index]) updated[index] = { ...updated[index], error: undefined, checking: false };
                    return updated;
                });
                return true;
            }
        } catch (err) {
            console.error('Email check failed', err);
            setRows(prev => {
                const updated = [...prev];
                if (updated[index]) updated[index] = { ...updated[index], checking: false };
                return updated;
            });
            return true;
        }
    };

    const handleEmailChange = (index: number, newEmail: string) => {
        setRows(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                email: newEmail,
                error: undefined
            };
            return updated;
        });
    };

    const handleAddRow = () => {
        setRows(prev => [
            ...prev,
            { id: `new-${Date.now()}`, email: '', status: 'Pending' }
        ]);
    };

    // Open confirmation modal matching the website masters standard
    const handleDeleteClick = (index: number) => {
        const row = rows[index];
        if (!row) return;
        // Open the Delete Confirmation Modal
        setItemToDelete({ index, id: row.id, email: row.email });
    };

    // Confirm deletion from backend database
    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        const { index, id, email } = itemToDelete;

        try {
            setIsDeleting(true);
            // If it exists in database
            if (typeof id !== 'string' || !id.startsWith('new-')) {
                await api.delete(`/employee/onboarding-invite/${id}`);
            }

            toast.success(email ? `Invite for ${email} deleted successfully!` : 'Row deleted successfully!');

            setRows(prev => {
                const remaining = prev.filter((_, i) => i !== index);
                if (remaining.length === 0) {
                    return [{ id: `new-${Date.now()}`, email: '', status: 'Pending' }];
                }
                return remaining;
            });
            setItemToDelete(null);
        } catch (error: any) {
            console.error('Failed to delete invite:', error);
            toast.error(error.response?.data?.message || 'Failed to delete invite from database');
        } finally {
            setIsDeleting(false);
        }
    };

    // Send or Resend invitation email for a specific row
    const handleSendRow = async (index: number) => {
        const row = rows[index];
        const email = row.email.trim();

        if (!email) {
            toast.error('Please enter an email address first');
            return;
        }

        const isValid = await validateRowEmail(index, email);
        if (!isValid) {
            toast.error(rows[index]?.error || 'This email is already in use. Please use a different email address.');
            return;
        }

        try {
            setRows(prev => {
                const updated = [...prev];
                updated[index] = { ...updated[index], sending: true };
                return updated;
            });

            const res = await api.post('/employee/invite-onboarding', { email });
            toast.success(res.data?.message || `Invitation email sent to ${email}`);

            setRows(prev => {
                const updated = [...prev];
                updated[index] = {
                    ...updated[index],
                    id: res.data?.invite?.id || updated[index].id,
                    status: 'Pending',
                    sending: false,
                    error: undefined
                };
                return updated;
            });
        } catch (error: any) {
            console.error('Failed to send invite:', error);
            const errMsg = error.response?.data?.message || 'Failed to send invitation email';
            toast.error(errMsg);
            setRows(prev => {
                const updated = [...prev];
                updated[index] = { ...updated[index], sending: false, error: errMsg };
                return updated;
            });
        }
    };

    return (
        <div className="space-y-6 pb-12 animate-fade-in font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E6ED] dark:border-gray-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#12151C] dark:text-white tracking-tight">
                        Profile Completion
                    </h1>
                    <p className="text-xs sm:text-sm text-[#5B6472] dark:text-gray-400 mt-1">
                        Write new employee emails to send them an invitation link to complete their profile details.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={fetchInvites}
                    disabled={loading}
                    className="p-2 border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] hover:bg-gray-50 dark:hover:bg-white/5 rounded-[6px] text-[#5B6472] dark:text-gray-300 transition-all cursor-pointer self-start sm:self-auto"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Main Table */}
            <div className="bg-white dark:bg-[#12151C] rounded-[8px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                        <thead>
                            <tr className="bg-[#F7F8FA] dark:bg-gray-800/60 border-b border-[#E2E6ED] dark:border-gray-800 text-[#5B6472] dark:text-gray-400 font-bold uppercase tracking-wider text-[11px]">
                                <th className="p-3.5 pl-5 w-24 text-center">SR.no</th>
                                <th className="p-3.5">EMAIL</th>
                                <th className="p-3.5 w-44 text-center">STATUS</th>
                                <th className="p-3.5 pr-5 w-40 text-center">ACTION</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800 text-[#12151C] dark:text-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-[#5B6472] dark:text-gray-400">
                                        <Loader2 size={22} className="animate-spin mx-auto mb-2 text-[#2C4FD6]" />
                                        Loading onboarding records...
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row, index) => {
                                    const srNo = index + 1;
                                    const isCompleted = row.status === 'Completed';
                                    const isFailed = row.status === 'Failed';

                                    return (
                                        <tr key={row.id || index} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors">
                                            {/* 1. SR.no */}
                                            <td className="p-3.5 pl-5 text-center font-mono font-bold text-[13px] text-[#5B6472] dark:text-gray-400">
                                                <span className="w-7 h-7 inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-[#12151C] dark:text-white">
                                                    {srNo}
                                                </span>
                                            </td>

                                            {/* 2. EMAIL */}
                                            <td className="p-3.5">
                                                <div className="relative flex flex-col max-w-md">
                                                    <div className="relative flex items-center">
                                                        <Mail size={14} className="absolute left-3 text-[#9AA3B1] pointer-events-none" />
                                                        <input
                                                            type="email"
                                                            value={row.email}
                                                            disabled={isCompleted}
                                                            onChange={(e) => handleEmailChange(index, e.target.value)}
                                                            onBlur={() => validateRowEmail(index)}
                                                            placeholder="Write new employee email..."
                                                            className={`w-full pl-9 pr-8 py-2 bg-white dark:bg-[#161B26] border rounded-[6px] text-xs sm:text-[13px] text-[#12151C] dark:text-white outline-none transition-all font-medium placeholder:text-gray-400 disabled:bg-gray-50 disabled:dark:bg-gray-800/40 disabled:text-gray-500 ${
                                                                row.error
                                                                    ? 'border-red-500 focus:border-red-500 bg-red-50/20 dark:bg-red-950/10'
                                                                    : 'border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]'
                                                            }`}
                                                        />
                                                        {row.checking && (
                                                            <Loader2 size={13} className="absolute right-3 animate-spin text-gray-400" />
                                                        )}
                                                    </div>
                                                    {row.error && (
                                                        <p className="text-red-500 text-[11px] mt-1 font-medium animate-fade-in">
                                                            {row.error}
                                                        </p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 3. STATUS */}
                                            <td className="p-3.5 text-center">
                                                {isCompleted ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                                        <CheckCircle2 size={12} className="text-emerald-600" />
                                                        Completed
                                                    </span>
                                                ) : isFailed ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800/40">
                                                        <XCircle size={12} className="text-red-600" />
                                                        Failed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                                                        <Clock size={12} className="text-amber-600" />
                                                        Pending
                                                    </span>
                                                )}
                                            </td>

                                            {/* 4. ACTION */}
                                            <td className="p-3.5 pr-5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {!isCompleted && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendRow(index)}
                                                            disabled={row.sending}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                                            title={isFailed ? "Resend Invitation Email" : "Send Invitation Email"}
                                                        >
                                                            {row.sending ? (
                                                                <>
                                                                    <Loader2 size={12} className="animate-spin" />
                                                                    <span>Sending...</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Send size={12} />
                                                                    <span>{isFailed ? 'Resend' : 'Send'}</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteClick(index)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-all cursor-pointer"
                                                        title="Delete Row"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer: ONLY '+ Add Row' button */}
                <div className="p-4 sm:p-5 border-t border-[#E2E6ED] dark:border-gray-800 bg-[#F9FAFD] dark:bg-[#12151C] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-[#5B6472] dark:text-gray-400">
                        Write employee emails and click Send in Action to send the onboarding invitation.
                    </p>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handleAddRow}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#161B26] hover:bg-gray-50 dark:hover:bg-white/5 text-[#12151C] dark:text-white text-xs sm:text-[13px] font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                            <Plus size={14} />
                            <span>Add Row</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal (MATCHING WEBSITE THEME) */}
            {itemToDelete && createPortal(
                <div className="fixed inset-0 z-[999999] bg-slate-900/30 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-[#12151C] rounded-[8px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-[calc(100vw-2rem)] sm:max-w-sm p-6 text-center shadow-2xl relative animate-scale-in">
                        <div className="w-14 h-14 bg-[#FBE7E7] dark:bg-red-500/10 text-[#DE350B] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={26} />
                        </div>
                        <h3 className="text-lg font-bold text-[#12151C] dark:text-white mb-2">Delete Item?</h3>
                        <p className="text-[#5B6472] dark:text-gray-400 mb-6 text-xs leading-relaxed px-1">
                            Are you sure you want to delete <span className="font-bold text-[#12151C] dark:text-white">{itemToDelete.email || 'this row'}</span>? <br />
                            This action cannot be undone and will permanently remove all associated data.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setItemToDelete(null)}
                                className="flex-1 py-2.5 px-4 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-300 font-semibold text-[13.5px] hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 px-4 rounded-[6px] bg-[#DE350B] hover:bg-[#b02a08] text-white font-semibold text-[13.5px] transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    "Yes, Delete"
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
