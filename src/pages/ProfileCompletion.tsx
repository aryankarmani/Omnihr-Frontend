import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Send, Plus, Trash2, Mail, Loader2, CheckCircle2, RefreshCw, XCircle, Clock, AlertCircle, FileSpreadsheet, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../utils/api';

interface InviteRow {
    id: string | number;
    email: string;
    status?: 'Pending' | 'Failed' | 'Completed' | 'Cancelled' | 'Expired' | '';
    sending?: boolean;
    error?: string;
    checking?: boolean;
}

export default function ProfileCompletion() {
    const [rows, setRows] = useState<InviteRow[]>([
        { id: 'new-1', email: '', status: '' }
    ]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
    const [isBulkSending, setIsBulkSending] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ index: number; id: string | number; email: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helpers to check status capabilities
    const isPending = (status?: string) => status === 'Pending';
    const isResendable = (status?: string) => status === 'Failed' || status === 'Cancelled' || status === 'Expired';
    const isUnsent = (status?: string) => !status || status === '';
    const canSendRow = (status?: string) => isUnsent(status) || isResendable(status);

    // Eligible rows that can be selected (any valid email not completed)
    const selectableRows = rows.filter(r => r.email && r.email.trim().length > 0 && r.status !== 'Completed');
    const isAllSelected = selectableRows.length > 0 && selectableRows.every(r => selectedIds.includes(r.id));
    const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

    // Filter of currently selected rows that are eligible to be sent/resent
    const sendableSelectedRows = rows.filter(r => selectedIds.includes(r.id) && r.email && r.email.trim().length > 0 && canSendRow(r.status));

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(selectableRows.map(r => r.id));
        }
    };

    const handleToggleRow = (id: string | number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    // Fetch existing onboarding invites from backend
    const fetchInvites = async () => {
        try {
            setLoading(true);
            setSelectedIds([]);
            const res = await api.get('/employee/onboarding-invites');
            const data: any[] = (res.data || []).filter((item: any) => item.status !== 'Completed');

            if (data.length > 0) {
                setRows([
                    ...data.map((item: any, idx: number) => ({
                        id: item.id || `invite-${idx}`,
                        email: item.email || '',
                        status: (item.status as any) || 'Pending'
                    })),
                    // Keep one empty row ready for typing a new email
                    { id: `new-${Date.now()}`, email: '', status: '' }
                ]);
            } else {
                setRows([
                    { id: 'new-1', email: '', status: '' }
                ]);
            }
        } catch (error) {
            console.error('Failed to load onboarding invites:', error);
            // Default empty row
            setRows([
                { id: 'new-1', email: '', status: '' }
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
            { id: `new-${Date.now()}`, email: '', status: '' }
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
                    return [{ id: `new-${Date.now()}`, email: '', status: '' }];
                }
                return remaining;
            });
            setSelectedIds(prev => prev.filter(selId => selId !== id));
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

        if (row.status === 'Pending') {
            toast.error('Invitation is already sent and pending. You can only resend if the link expires or is cancelled.');
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

    // Send onboarding emails to eligible selected employees in ONE CLICK
    const handleSendSelected = async () => {
        const targets = rows.filter(
            r => selectedIds.includes(r.id) && r.email && r.email.trim().length > 0 && canSendRow(r.status)
        );

        if (targets.length === 0) {
            toast.error('No eligible employees selected. Invitations already marked as Pending cannot be resent until cancelled or expired.');
            return;
        }

        try {
            setIsBulkSending(true);
            const targetIds = new Set(targets.map(t => t.id));

            // Set sending animation on each selected row
            setRows(prev => prev.map(r => targetIds.has(r.id) ? { ...r, sending: true, error: undefined } : r));

            const emailList = targets.map(t => t.email.trim().toLowerCase());
            const res = await api.post('/employee/bulk-invite-onboarding', { emails: emailList });

            const results: Array<{ email: string; success: boolean; invite?: any; error?: string }> = res.data?.results || [];
            const resultMap = new Map(results.map(item => [item.email.toLowerCase(), item]));

            let successCount = 0;
            let failCount = 0;

            setRows(prev => prev.map(r => {
                const clean = r.email.trim().toLowerCase();
                const item = resultMap.get(clean);
                if (!item) {
                    return targetIds.has(r.id) ? { ...r, sending: false } : r;
                }

                if (item.success) {
                    successCount++;
                    return {
                        ...r,
                        id: item.invite?.id || r.id,
                        status: 'Pending',
                        sending: false,
                        error: undefined
                    };
                } else {
                    failCount++;
                    return {
                        ...r,
                        status: 'Failed',
                        sending: false,
                        error: item.error || 'Failed to send invitation email'
                    };
                }
            }));

            if (failCount === 0) {
                toast.success(`Successfully sent invitation emails to all ${successCount} employee${successCount > 1 ? 's' : ''}!`);
                setSelectedIds([]);
            } else if (successCount > 0) {
                toast.success(`Sent ${successCount} emails (${failCount} failed). Check failed rows.`);
                // Keep only failed rows selected so admin can retry easily
                const failedIds = targets
                    .filter(t => resultMap.get(t.email.trim().toLowerCase())?.success === false)
                    .map(t => t.id);
                setSelectedIds(failedIds);
            } else {
                toast.error(`Failed to send invitations to ${failCount} employees.`);
            }
        } catch (error: any) {
            console.error('Bulk send error:', error);
            toast.error(error.response?.data?.message || 'Failed to send bulk invitations');
            setRows(prev => prev.map(r => ({ ...r, sending: false })));
        } finally {
            setIsBulkSending(false);
        }
    };

    // Bulk delete all selected rows via custom modal
    const handleConfirmBulkDelete = async () => {
        const targets = rows.filter(r => selectedIds.includes(r.id));
        if (targets.length === 0) {
            setShowBulkDeleteModal(false);
            return;
        }

        try {
            setIsBulkDeleting(true);
            const dbTargets = targets.filter(t => typeof t.id !== 'string' || !t.id.startsWith('new-'));
            for (const t of dbTargets) {
                try {
                    await api.delete(`/employee/onboarding-invite/${t.id}`);
                } catch (e) {
                    console.error('Failed to delete invite:', e);
                }
            }

            const targetIds = new Set(targets.map(t => t.id));
            setRows(prev => {
                const remaining = prev.filter(r => !targetIds.has(r.id));
                return remaining.length > 0 ? remaining : [{ id: `new-${Date.now()}`, email: '', status: '' }];
            });
            setSelectedIds([]);
            setShowBulkDeleteModal(false);
            toast.success(`Deleted ${targets.length} row${targets.length > 1 ? 's' : ''}!`);
        } catch (err) {
            console.error('Bulk delete error:', err);
            toast.error('Failed to delete selected rows');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // 1. Generate & download sample Excel template
    const handleDownloadTemplate = () => {
        try {
            const wb = XLSX.utils.book_new();
            const sampleData = [
                { 'Email': 'rahul.sharma@example.com' },
                { 'Email': 'priya.patel@example.com' },
                { 'Email': 'amit.verma@example.com' }
            ];
            const ws = XLSX.utils.json_to_sheet(sampleData, { header: ['Email'] });
            
            // Set friendly column width
            ws['!cols'] = [{ wch: 35 }];

            XLSX.utils.book_append_sheet(wb, ws, 'Employees');
            XLSX.writeFile(wb, 'employee_onboarding_template.xlsx');
            toast.success('Excel template downloaded successfully!');
        } catch (error) {
            console.error('Failed to download Excel template:', error);
            // Fallback CSV download
            const csvContent = "data:text/csv;charset=utf-8,Email\nrahul.sharma@example.com\npriya.patel@example.com\namit.verma@example.com";
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "employee_onboarding_template.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Template downloaded successfully!');
        }
    };

    // 2. Parse uploaded Excel or CSV file and populate emails into table
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset so user can upload the same file again if desired
        e.target.value = '';

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                toast.error('The selected spreadsheet has no sheets.');
                return;
            }

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (!jsonData || jsonData.length === 0) {
                toast.error('The uploaded spreadsheet is empty.');
                return;
            }

            // Find column index containing email header
            let emailColIndex = -1;
            const headerRow = jsonData[0] || [];

            for (let i = 0; i < headerRow.length; i++) {
                const cell = String(headerRow[i] || '').trim().toLowerCase();
                if (cell.includes('email') || cell.includes('mail')) {
                    emailColIndex = i;
                    break;
                }
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            let startRow = 1;

            if (emailColIndex === -1) {
                // If row 0 column 0 has an email, assume column 0 and start from row 0
                if (headerRow[0] && emailRegex.test(String(headerRow[0]).trim())) {
                    emailColIndex = 0;
                    startRow = 0;
                } else {
                    emailColIndex = 0;
                    startRow = 1;
                }
            }

            const extractedEmails: string[] = [];
            const seen = new Set<string>();

            // Collect existing emails already in table to prevent duplicate rows
            const existingEmails = new Set(
                rows.map(r => r.email.trim().toLowerCase()).filter(Boolean)
            );

            for (let r = startRow; r < jsonData.length; r++) {
                const row = jsonData[r];
                if (!row) continue;
                const rawVal = row[emailColIndex] !== undefined ? row[emailColIndex] : row[0];
                const cleanEmail = String(rawVal || '').trim().toLowerCase();
                if (!cleanEmail) continue;

                if (!emailRegex.test(cleanEmail)) {
                    continue; // Skip invalid email formats
                }

                if (!seen.has(cleanEmail)) {
                    seen.add(cleanEmail);
                    if (!existingEmails.has(cleanEmail)) {
                        extractedEmails.push(cleanEmail);
                    }
                }
            }

            if (extractedEmails.length === 0) {
                if (seen.size > 0) {
                    toast.error('All emails in the spreadsheet are already added in the table.');
                } else {
                    toast.error('No valid email addresses found in the spreadsheet. Please use the downloaded template.');
                }
                return;
            }

            const newImportedRows: InviteRow[] = extractedEmails.map((email, i) => ({
                id: `new-${Date.now()}-${i}`,
                email,
                status: ''
            }));

            setRows(prev => {
                // Remove purely blank draft row if present
                const nonBlank = prev.filter(r => r.email.trim().length > 0 || (typeof r.id !== 'string' || !r.id.startsWith('new-')));
                return [...nonBlank, ...newImportedRows];
            });

            // Automatically select all imported rows so user can send immediately in one click!
            setSelectedIds(prev => [
                ...prev,
                ...newImportedRows.map(r => r.id)
            ]);

            toast.success(`Successfully imported ${extractedEmails.length} employee email${extractedEmails.length > 1 ? 's' : ''}!`);
        } catch (error: any) {
            console.error('File parsing error:', error);
            toast.error('Failed to parse spreadsheet file. Please upload a valid .xlsx, .xls, or .csv file.');
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
                {/* Actions: Template, Bulk Add, Send Selected / Send All, Refresh */}
                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    {/* Hidden file input for spreadsheet upload */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                    />

                    {/* Template Button */}
                    <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] hover:bg-gray-50 dark:hover:bg-white/5 text-[#12151C] dark:text-white text-xs sm:text-[13px] font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                        title="Download sample Excel template"
                    >
                        <FileSpreadsheet size={15} className="text-[#107C41]" />
                        <span>Template</span>
                    </button>

                    {/* Bulk Add Button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[6px] border border-[#2C4FD6]/30 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/40 text-[#2C4FD6] dark:text-blue-400 text-xs sm:text-[13px] font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                        title="Upload Excel or CSV file to import multiple emails"
                    >
                        <Upload size={15} />
                        <span>Bulk Add</span>
                    </button>


                    {/* Refresh Button */}
                    <button
                        type="button"
                        onClick={fetchInvites}
                        disabled={loading}
                        className="p-2 border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] hover:bg-gray-50 dark:hover:bg-white/5 rounded-[6px] text-[#5B6472] dark:text-gray-300 transition-all cursor-pointer disabled:opacity-50"
                        title="Refresh list"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Bulk Selection Notification Bar */}
            {selectedIds.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 px-4 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-[8px] animate-fade-in shadow-sm">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="w-5 h-5 rounded-full bg-[#2C4FD6] text-white text-[11px] font-bold inline-flex items-center justify-center">
                            {selectedIds.length}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-[#12151C] dark:text-white">
                            {selectedIds.length} employee{selectedIds.length > 1 ? 's' : ''} selected
                        </span>
                        <span className="text-gray-300 dark:text-gray-700">|</span>
                        <button
                            type="button"
                            onClick={() => setSelectedIds([])}
                            className="text-xs text-[#2C4FD6] dark:text-blue-400 hover:underline cursor-pointer font-medium"
                        >
                            Deselect all
                        </button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setShowBulkDeleteModal(true)}
                            disabled={isBulkSending || isBulkDeleting}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-red-200 dark:border-red-900/40 bg-white dark:bg-[#161B26] hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            <Trash2 size={13} />
                            <span>Delete Selected</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSendSelected}
                            disabled={isBulkSending || sendableSelectedRows.length === 0}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-[6px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                            title={sendableSelectedRows.length === 0 ? "All selected employees already have active pending invitations" : `Send invitations to ${sendableSelectedRows.length} eligible employee(s)`}
                        >
                            {isBulkSending ? (
                                <>
                                    <Loader2 size={13} className="animate-spin" />
                                    <span>Sending Emails...</span>
                                </>
                            ) : (
                                <>
                                    <Send size={13} />
                                    <span>
                                        {sendableSelectedRows.length > 0
                                            ? `Send (${sendableSelectedRows.length}) in One Click`
                                            : 'All Invites Pending'}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Main Table */}
            <div className="bg-white dark:bg-[#12151C] rounded-[8px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[680px]">
                        <thead>
                            <tr className="bg-[#F7F8FA] dark:bg-gray-800/60 border-b border-[#E2E6ED] dark:border-gray-800 text-[#5B6472] dark:text-gray-400 font-bold uppercase tracking-wider text-[11px]">
                                {/* 0. Checkbox Column (Select All) */}
                                <th className="p-3.5 pl-4 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={el => {
                                            if (el) el.indeterminate = isSomeSelected;
                                        }}
                                        onChange={handleToggleSelectAll}
                                        disabled={selectableRows.length === 0 || loading}
                                        title={isAllSelected ? "Deselect All" : "Select All"}
                                        className="w-4 h-4 rounded border-[#D0D5DD] text-[#2C4FD6] focus:ring-[#2C4FD6] cursor-pointer accent-[#2C4FD6] align-middle disabled:opacity-30 disabled:cursor-not-allowed"
                                    />
                                </th>
                                <th className="p-3.5 w-20 text-center">SR.no</th>
                                <th className="p-3.5">EMAIL</th>
                                <th className="p-3.5 w-40 text-center">STATUS</th>
                                <th className="p-3.5 pr-5 w-36 text-center">ACTION</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800 text-[#12151C] dark:text-gray-200">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={`skeleton-${i}`} className="animate-pulse">
                                        {/* 0. Checkbox skeleton */}
                                        <td className="p-3.5 pl-4 text-center">
                                            <div className="w-4 h-4 mx-auto rounded skeleton-shimmer" />
                                        </td>

                                        {/* 1. SR.no skeleton */}
                                        <td className="p-3.5 text-center">
                                            <div className="w-7 h-7 mx-auto rounded-full skeleton-shimmer" />
                                        </td>

                                        {/* 2. EMAIL skeleton */}
                                        <td className="p-3.5">
                                            <div className="h-9 w-full max-w-md skeleton-shimmer rounded-[6px]" />
                                        </td>

                                        {/* 3. STATUS skeleton */}
                                        <td className="p-3.5 text-center">
                                            <div className="h-6 w-24 mx-auto skeleton-shimmer rounded-full" />
                                        </td>

                                        {/* 4. ACTION skeleton */}
                                        <td className="p-3.5 pr-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="h-7 w-16 skeleton-shimmer rounded-[6px]" />
                                                <div className="h-7 w-7 skeleton-shimmer rounded-[6px]" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                rows.map((row, index) => {
                                    const srNo = index + 1;
                                    const isCompleted = row.status === 'Completed';
                                    const isFailed = row.status === 'Failed';
                                    const isSelected = selectedIds.includes(row.id);
                                    const isSelectable = Boolean(row.email && row.email.trim() && !isCompleted);

                                    return (
                                        <tr
                                            key={row.id || index}
                                            className={`transition-colors ${
                                                isSelected
                                                    ? 'bg-blue-50/50 dark:bg-blue-950/20'
                                                    : 'hover:bg-gray-50/70 dark:hover:bg-white/[0.02]'
                                            }`}
                                        >
                                            {/* 0. Row Checkbox */}
                                            <td className="p-3.5 pl-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleRow(row.id)}
                                                    disabled={!isSelectable || isBulkSending}
                                                    className="w-4 h-4 rounded border-[#D0D5DD] text-[#2C4FD6] focus:ring-[#2C4FD6] cursor-pointer accent-[#2C4FD6] align-middle disabled:opacity-30 disabled:cursor-not-allowed"
                                                />
                                            </td>

                                            {/* 1. SR.no */}
                                            <td className="p-3.5 text-center font-mono font-bold text-[13px] text-[#5B6472] dark:text-gray-400">
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
                                                ) : row.status === 'Cancelled' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
                                                        <XCircle size={12} className="text-rose-600" />
                                                        Cancelled
                                                    </span>
                                                ) : row.status === 'Expired' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40">
                                                        <AlertCircle size={12} className="text-orange-600" />
                                                        Expired
                                                    </span>
                                                ) : isFailed ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800/40">
                                                        <XCircle size={12} className="text-red-600" />
                                                        Failed
                                                    </span>
                                                ) : row.status === 'Pending' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                                                        <Clock size={12} className="text-amber-600" />
                                                        Pending
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-gray-600 font-semibold text-sm select-none">—</span>
                                                )}
                                            </td>

                                            {/* 4. ACTION */}
                                            <td className="p-3.5 pr-5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {!isCompleted && (
                                                        <>
                                                            {row.status === 'Pending' ? (
                                                                <span
                                                                    title="Invitation already sent and currently waiting for employee completion"
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[5px] bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 text-[11px] font-semibold select-none"
                                                                >
                                                                    <Clock size={11} className="text-amber-600 dark:text-amber-400" />
                                                                    <span>Link Active</span>
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSendRow(index)}
                                                                    disabled={row.sending || isBulkSending}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                                                    title={isResendable(row.status) ? "Resend Invitation Email" : "Send Invitation Email"}
                                                                >
                                                                    {row.sending ? (
                                                                        <>
                                                                            <Loader2 size={12} className="animate-spin" />
                                                                            <span>Sending...</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            {isResendable(row.status) ? (
                                                                                <RefreshCw size={12} />
                                                                            ) : (
                                                                                <Send size={12} />
                                                                            )}
                                                                            <span>{isResendable(row.status) ? 'Resend' : 'Send'}</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteClick(index)}
                                                        disabled={isBulkSending}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-all cursor-pointer disabled:opacity-50"
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
                            disabled={loading}
                            onClick={handleAddRow}
                            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#161B26] hover:bg-gray-50 dark:hover:bg-white/5 text-[#12151C] dark:text-white text-xs sm:text-[13px] font-semibold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
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

            {/* Bulk Delete Confirmation Modal (MATCHING WEBSITE THEME) */}
            {showBulkDeleteModal && createPortal(
                <div className="fixed inset-0 z-[999999] bg-slate-900/30 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-[#12151C] rounded-[8px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-[calc(100vw-2rem)] sm:max-w-sm p-6 text-center shadow-2xl relative animate-scale-in">
                        <div className="w-14 h-14 bg-[#FBE7E7] dark:bg-red-500/10 text-[#DE350B] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={26} />
                        </div>
                        <h3 className="text-lg font-bold text-[#12151C] dark:text-white mb-2">Delete Selected Items?</h3>
                        <p className="text-[#5B6472] dark:text-gray-400 mb-6 text-xs leading-relaxed px-1">
                            Are you sure you want to delete <span className="font-bold text-[#12151C] dark:text-white">{selectedIds.length} selected row{selectedIds.length > 1 ? 's' : ''}</span>? <br />
                            This action cannot be undone and will permanently remove all associated invitations.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowBulkDeleteModal(false)}
                                disabled={isBulkDeleting}
                                className="flex-1 py-2.5 px-4 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-300 font-semibold text-[13.5px] hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmBulkDelete}
                                disabled={isBulkDeleting}
                                className="flex-1 py-2.5 px-4 rounded-[6px] bg-[#DE350B] hover:bg-[#b02a08] text-white font-semibold text-[13.5px] transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isBulkDeleting ? (
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
