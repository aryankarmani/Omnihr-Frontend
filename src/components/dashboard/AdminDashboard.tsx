import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import HeadcountStats from './HeadcountStats';
import LiveAttendance from './LiveAttendance';

interface AdminDashboardProps {
    navigate: any;
    stats: any;
    attendanceData: any[];
    pendingApprovals: any[];
    pendingRegularizations?: any[];
    employees: any[];
}

export default function AdminDashboard({
    navigate,
    stats,
    attendanceData,
    pendingApprovals = [],
    pendingRegularizations = [],
    employees
}: AdminDashboardProps) {
    const [filterTab, setFilterTab] = useState<'ALL' | 'LEAVE' | 'REGULARIZATION'>('ALL');
    const [approvalsList, setApprovalsList] = useState<any[]>(pendingApprovals);
    const [regList, setRegList] = useState<any[]>(pendingRegularizations);

    // Track items processed during this session so they can remain visible with Approved/Rejected status if total <= 5
    const [processedLeaves, setProcessedLeaves] = useState<any[]>([]);
    const [processedRegs, setProcessedRegs] = useState<any[]>([]);

    // Approve Modal State
    const [approvingItem, setApprovingItem] = useState<{
        type: 'LEAVE' | 'REGULARIZATION';
        id: any;
        name: string;
        details?: string;
    } | null>(null);
    const [submittingApprove, setSubmittingApprove] = useState(false);

    // Rejection Modal State
    const [rejectingItem, setRejectingItem] = useState<{
        type: 'LEAVE' | 'REGULARIZATION';
        id: any;
        name: string;
    } | null>(null);
    const [rejectComment, setRejectComment] = useState('');
    const [submittingReject, setSubmittingReject] = useState(false);

    useEffect(() => {
        setApprovalsList(pendingApprovals || []);
    }, [pendingApprovals]);

    useEffect(() => {
        setRegList(pendingRegularizations || []);
    }, [pendingRegularizations]);

    const handleApproveConfirm = async () => {
        if (!approvingItem) return;
        setSubmittingApprove(true);
        try {
            if (approvingItem.type === 'LEAVE') {
                await api.put(`/leave/${approvingItem.id}/status`, { status: 'APPROVED' });
                toast.success('Leave request approved');
                const target = approvalsList.find(a => a.id === approvingItem.id);
                setApprovalsList(prev => prev.filter(item => item.id !== approvingItem.id));
                if (target) {
                    setProcessedLeaves(prev => [{ ...target, status: 'APPROVED', processedAt: new Date() }, ...prev]);
                }
            } else {
                await api.put(`/attendance/regularize/${approvingItem.id}/approve`);
                toast.success('Regularization approved');
                const target = regList.find(r => r.id === approvingItem.id);
                setRegList(prev => prev.filter(item => item.id !== approvingItem.id));
                if (target) {
                    setProcessedRegs(prev => [{ ...target, status: 'APPROVED', processedAt: new Date() }, ...prev]);
                }
            }
            setApprovingItem(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to approve request');
        } finally {
            setSubmittingApprove(false);
        }
    };

    const handleRejectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectingItem || !rejectComment.trim()) return;

        setSubmittingReject(true);
        try {
            if (rejectingItem.type === 'LEAVE') {
                await api.put(`/leave/${rejectingItem.id}/status`, {
                    status: 'REJECTED',
                    rejectionReason: rejectComment.trim()
                });
                toast.success('Leave request rejected');
                const target = approvalsList.find(a => a.id === rejectingItem.id);
                setApprovalsList(prev => prev.filter(item => item.id !== rejectingItem.id));
                if (target) {
                    setProcessedLeaves(prev => [{ ...target, status: 'REJECTED', processedAt: new Date() }, ...prev]);
                }
            } else {
                await api.put(`/attendance/regularize/${rejectingItem.id}/reject`, {
                    reason: rejectComment.trim(),
                    approverComment: rejectComment.trim()
                });
                toast.success('Regularization rejected');
                const target = regList.find(r => r.id === rejectingItem.id);
                setRegList(prev => prev.filter(item => item.id !== rejectingItem.id));
                if (target) {
                    setProcessedRegs(prev => [{ ...target, status: 'REJECTED', processedAt: new Date() }, ...prev]);
                }
            }
            setRejectingItem(null);
            setRejectComment('');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to reject request');
        } finally {
            setSubmittingReject(false);
        }
    };

    const totalPending = approvalsList.length + regList.length;

    const getInitials = (name?: string) => {
        if (!name) return '??';
        const nameParts = name.trim().split(/\s+/);
        if (nameParts.length === 1) {
            return nameParts[0].substring(0, 2).toUpperCase();
        }
        return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    };

    const sortByNewest = (a: any, b: any) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;
        return Number(b.id) - Number(a.id);
    };

    const mapLeave = (leave: any, status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING') => ({
        uniqueKey: `leave-${leave.id}`,
        id: leave.id,
        category: 'LEAVE' as const,
        userName: leave.userName || 'Employee',
        tag: 'Leave',
        subtext: `${leave.type || 'Leave'} · ${leave.duration || 1} days`,
        avatar: leave.avatar,
        createdAt: leave.createdAt || leave.startDate || 0,
        status: leave.status || status,
        processedAt: leave.processedAt || null,
        onClick: () => navigate('/leave', { state: { activeTab: 'APPROVALS' } })
    });

    const mapReg = (reg: any, status: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING') => {
        const name = reg.user?.name || `Employee #${reg.userId || reg.id}`;
        return {
            uniqueKey: `reg-${reg.id}`,
            id: reg.id,
            category: 'REGULARIZATION' as const,
            userName: name,
            tag: 'Regularize',
            subtext: `${reg.reason || 'Regularization'} · ${reg.date || ''}`,
            avatar: reg.user?.employeeProfile?.avatar || null,
            createdAt: reg.createdAt || reg.date || 0,
            status: reg.status || status,
            processedAt: reg.processedAt || null,
            onClick: () => navigate('/regularizations')
        };
    };

    // Calculate display list for active tab:
    // 1. Pending items are always placed on top (sorted newest first).
    // 2. If pending count >= 5, show top 5 pending items.
    // 3. If pending count < 5, fill remaining slots up to 5 with recently processed items (showing their Approved/Rejected status).
    const getDisplayItems = () => {
        // Calculate Top 5 Leaves (pending prioritized, then recently processed)
        const pLeaves = approvalsList.map(l => mapLeave(l, 'PENDING')).sort(sortByNewest);
        const prLeaves = processedLeaves.map(l => mapLeave(l)).sort((a, b) => (b.processedAt?.getTime() || 0) - (a.processedAt?.getTime() || 0));
        const top5Leaves = pLeaves.length >= 5
            ? pLeaves.slice(0, 5)
            : [...pLeaves, ...prLeaves.slice(0, 5 - pLeaves.length)];

        // Calculate Top 5 Regularizations (pending prioritized, then recently processed)
        const pRegs = regList.map(r => mapReg(r, 'PENDING')).sort(sortByNewest);
        const prRegs = processedRegs.map(r => mapReg(r)).sort((a, b) => (b.processedAt?.getTime() || 0) - (a.processedAt?.getTime() || 0));
        const top5Regs = pRegs.length >= 5
            ? pRegs.slice(0, 5)
            : [...pRegs, ...prRegs.slice(0, 5 - pRegs.length)];

        if (filterTab === 'LEAVE') {
            return top5Leaves;
        }
        if (filterTab === 'REGULARIZATION') {
            return top5Regs;
        }

        // 'ALL' tab: Shows Top 5 Leaves and Top 5 Regularizations combined, newest first
        return [...top5Leaves, ...top5Regs].sort(sortByNewest);
    };

    const displayItems = getDisplayItems();

    return (
        <div className="text-[#12151C] dark:text-white">
            <header className="mb-5">
                <h2 className="text-2xl font-bold tracking-tight text-[#12151C] dark:text-white mb-1">Admin Dashboard</h2>
                <p className="text-sm text-[#5B6472] dark:text-gray-400">Welcome back — here's the organizational overview.</p>
            </header>

            {/* Top 4 KPI Cards */}
            <HeadcountStats {...stats} navigate={navigate} />

            {/* Middle Section: Live Attendance (3/5) & Approval Center (2/5) */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">
                <div className="lg:col-span-3">
                    <LiveAttendance data={attendanceData} />
                </div>

                <div id="approval-center" className="lg:col-span-2 bg-white dark:bg-[#12151C] p-4 sm:p-5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 h-[300px] max-h-[300px] flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="panel-title text-[15px] font-semibold text-[#12151C] dark:text-white block">Approval Center</span>
                                <p className="text-[12px] text-[#9AA3B1] dark:text-gray-400 mt-0.5">
                                    Pending requests ({totalPending})
                                </p>
                            </div>
                            <span className="w-5 h-5 rounded-full bg-[#E8ECFC] text-[#2C4FD6] text-[11px] font-bold font-mono-numbers flex items-center justify-center">
                                {totalPending}
                            </span>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1.5 mb-2">
                            <button
                                onClick={() => setFilterTab('ALL')}
                                className={`px-2 py-0.5 rounded-[4px] text-[10.5px] font-semibold transition-colors cursor-pointer ${
                                    filterTab === 'ALL'
                                        ? 'bg-[#2C4FD6] text-white'
                                        : 'bg-[#EEF1F5] dark:bg-gray-800 text-[#5B6472] dark:text-gray-400 hover:text-[#12151C]'
                                }`}
                            >
                                All ({totalPending})
                            </button>
                            <button
                                onClick={() => setFilterTab('LEAVE')}
                                className={`px-2 py-0.5 rounded-[4px] text-[10.5px] font-semibold transition-colors cursor-pointer ${
                                    filterTab === 'LEAVE'
                                        ? 'bg-[#2C4FD6] text-white'
                                        : 'bg-[#EEF1F5] dark:bg-gray-800 text-[#5B6472] dark:text-gray-400 hover:text-[#12151C]'
                                }`}
                            >
                                Leaves ({approvalsList.length})
                            </button>
                            <button
                                onClick={() => setFilterTab('REGULARIZATION')}
                                className={`px-2 py-0.5 rounded-[4px] text-[10.5px] font-semibold transition-colors cursor-pointer ${
                                    filterTab === 'REGULARIZATION'
                                        ? 'bg-[#2C4FD6] text-white'
                                        : 'bg-[#EEF1F5] dark:bg-gray-800 text-[#5B6472] dark:text-gray-400 hover:text-[#12151C]'
                                }`}
                            >
                                Regularizations ({regList.length})
                            </button>
                        </div>
                        <div className="border-b border-[#E2E6ED] dark:border-gray-800 mb-2"></div>
                    </div>

                    <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar flex-1 min-h-0">
                        {displayItems.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-xs text-[#9AA3B1] text-center">No pending requests.</p>
                            </div>
                        ) : (
                            displayItems.map((item) => (
                                <div 
                                    key={item.uniqueKey} 
                                    onClick={item.onClick}
                                    className="flex items-center justify-between p-1.5 rounded-[6px] hover:bg-[#F7F8FA] dark:hover:bg-gray-800 transition-all cursor-pointer border border-transparent hover:border-[#E2E6ED]"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <div className={`w-8 h-8 rounded-full ${
                                            item.category === 'LEAVE'
                                                ? 'bg-[#EEF1F5] dark:bg-gray-700 text-[#5B6472] dark:text-white'
                                                : 'bg-[#FFF7ED] dark:bg-orange-950/40 text-[#EA580C]'
                                        } flex items-center justify-center font-mono-numbers font-bold text-xs shrink-0`}>
                                            {getInitials(item.userName)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <h4 className="text-[13px] font-semibold text-[#12151C] dark:text-white truncate">{item.userName}</h4>
                                                <span className={`text-[9px] font-semibold px-1 py-0.2 rounded-[3px] ${
                                                    item.category === 'LEAVE'
                                                        ? 'bg-[#E8ECFC] text-[#2C4FD6]'
                                                        : 'bg-[#FFF7ED] text-[#EA580C]'
                                                }`}>
                                                    {item.tag}
                                                </span>
                                            </div>
                                            <p className="text-[11.5px] text-[#5B6472] dark:text-gray-400 truncate">
                                                {item.subtext}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {item.status === 'APPROVED' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-semibold bg-[#E4F5EC] text-[#1F8A5A] dark:bg-green-950/50 dark:text-green-400">
                                                <Check size={11} strokeWidth={2.5} /> Approved
                                            </span>
                                        ) : item.status === 'REJECTED' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-semibold bg-[#FBE7E7] text-[#DE350B] dark:bg-red-950/50 dark:text-red-400">
                                                <X size={11} strokeWidth={2.5} /> Rejected
                                            </span>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setApprovingItem({
                                                            type: item.category,
                                                            id: item.id,
                                                            name: item.userName,
                                                            details: item.subtext
                                                        });
                                                    }}
                                                    className="w-6 h-6 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 text-[#1F8A5A] hover:bg-[#E4F5EC] dark:hover:bg-green-950/40 flex items-center justify-center transition-colors cursor-pointer"
                                                    title={`Approve ${item.category === 'LEAVE' ? 'Leave' : 'Regularization'}`}
                                                >
                                                    <Check size={13} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setRejectingItem({
                                                            type: item.category,
                                                            id: item.id,
                                                            name: item.userName
                                                        });
                                                        setRejectComment('');
                                                    }}
                                                    className="w-6 h-6 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 text-[#C13A3A] hover:bg-[#FBE7E7] dark:hover:bg-red-950/40 flex items-center justify-center transition-colors cursor-pointer"
                                                    title={`Reject ${item.category === 'LEAVE' ? 'Leave' : 'Regularization'}`}
                                                >
                                                    <X size={13} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Employee Overview Table */}
            <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden">
                <div className="p-5 flex justify-between items-center border-b border-[#E2E6ED] dark:border-gray-800">
                    <span className="panel-title text-[15px] font-semibold text-[#12151C] dark:text-white block">Employee Overview</span>
                    <button
                        onClick={() => navigate('/employee')}
                        className="text-[13px] font-semibold text-[#2C4FD6] hover:underline"
                    >
                        View all →
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-[#EEF1F5] dark:bg-gray-800/60 text-[#9AA3B1] dark:text-gray-400 text-[11px] uppercase tracking-[.05em] font-semibold">
                                <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800 w-[35%]">EMPLOYEE</th>
                                <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800 w-[30%]">ROLE</th>
                                <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800 w-[20%]">STATUS</th>
                                <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800 text-right w-[20%]">ATTENDANCE</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800 text-xs">
                            {employees
                                .filter((emp) => emp.status !== 'Inactive' && emp.status?.toLowerCase() !== 'inactive')
                                .slice(0, 8)
                                .map((emp) => {
                                    const attendancePct = emp.attendancePercentage !== undefined && emp.attendancePercentage !== null ? emp.attendancePercentage : null;
                                    const roleTitle = emp.role ? emp.role.replace('_', ' ') : 'Staff';
                                    const roleSub = emp.department || emp.designation || 'Team Member';

                                    return (
                                        <tr
                                            key={emp.id}
                                            onClick={() => navigate(`/employee/${emp.id}`)}
                                            className="hover:bg-[#F7F8FA] dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                                        >
                                            <td className="py-[13px] px-[22px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#EEF1F5] dark:bg-gray-700 flex items-center justify-center text-[#12151C] dark:text-white font-mono-numbers font-semibold text-xs shrink-0">
                                                        {getInitials(emp.name)}
                                                    </div>
                                                    <div>
                                                        <span className="text-[13.5px] font-semibold text-[#12151C] dark:text-white block">{emp.name}</span>
                                                        <span className="text-[11px] text-[#5B6472] dark:text-gray-400 block">{emp.email || '—'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-[13px] px-[22px]">
                                                <div>
                                                    <span className="font-semibold text-[13.5px] text-[#12151C] dark:text-white capitalize block">{roleTitle}</span>
                                                    <span className="text-[11px] text-[#5B6472] dark:text-gray-400 block">{roleSub}</span>
                                                </div>
                                            </td>
                                            <td className="py-[13px] px-[22px]">
                                                <span className="px-[10px] py-[3px] rounded-[3px] text-[11.5px] font-semibold bg-[#E4F5EC] text-[#1F8A5A] dark:bg-green-950/50 dark:text-green-400 inline-block tracking-wide">
                                                    {emp.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="py-[13px] px-[22px] text-right">
                                                <span className="font-semibold font-mono-numbers text-[13.5px] text-[#12151C] dark:text-white">
                                                    {attendancePct !== null ? `${attendancePct}%` : '0%'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Approval Confirmation Modal */}
            {approvingItem && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md" 
                        onClick={() => {
                            if (!submittingApprove) {
                                setApprovingItem(null);
                            }
                        }} 
                    />
                    <div className="relative bg-white dark:bg-[#12151C] w-full max-w-md rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden p-6 animate-scale-in shadow-xl">
                        <h3 className="text-base font-bold text-[#12151C] dark:text-white mb-1">Approve Request</h3>
                        <p className="text-xs text-[#5B6472] dark:text-gray-400 mb-4">
                            Are you sure you want to approve this {approvingItem.type === 'LEAVE' ? 'leave' : 'regularization'} request for <strong className="text-[#12151C] dark:text-white font-semibold">{approvingItem.name}</strong>?
                        </p>
                        {approvingItem.details && (
                            <div className="mb-5 p-3 rounded-[7px] bg-[#F7F8FA] dark:bg-gray-800/60 border border-[#E2E6ED] dark:border-gray-700 text-xs text-[#5B6472] dark:text-gray-300">
                                <span className="font-semibold text-[#12151C] dark:text-white block mb-0.5">Details</span>
                                <span>{approvingItem.details}</span>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setApprovingItem(null)}
                                disabled={submittingApprove}
                                className="flex-1 py-2.5 px-4 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 text-[#5B6472] dark:text-gray-300 font-semibold rounded-[8px] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-xs cursor-pointer text-center"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleApproveConfirm}
                                disabled={submittingApprove}
                                className="flex-1 py-2.5 px-4 bg-[#1F8A5A] text-white font-semibold rounded-[8px] hover:bg-[#186f48] transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-60"
                            >
                                {submittingApprove ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Rejection Modal */}
            {rejectingItem && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md" 
                        onClick={() => {
                            if (!submittingReject) {
                                setRejectingItem(null);
                                setRejectComment('');
                            }
                        }} 
                    />
                    <div className="relative bg-white dark:bg-[#12151C] w-full max-w-md rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden p-6 animate-scale-in shadow-xl">
                        <h3 className="text-base font-bold text-[#12151C] dark:text-white mb-1">Reject Request</h3>
                        <p className="text-xs text-[#5B6472] dark:text-gray-400 mb-4">
                            Please provide a reason for rejecting this {rejectingItem.type === 'LEAVE' ? 'leave' : 'regularization'} request for <strong className="text-[#12151C] dark:text-white font-semibold">{rejectingItem.name}</strong>.
                        </p>
                        <form onSubmit={handleRejectSubmit}>
                            <textarea
                                value={rejectComment}
                                onChange={(e) => setRejectComment(e.target.value)}
                                placeholder="Enter rejection reason..."
                                required
                                autoFocus
                                className="w-full px-3 py-2 rounded-[7px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white text-xs outline-none focus:border-[#2C4FD6] min-h-[90px] mb-4 placeholder-[#9AA3B1] resize-none"
                            />
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRejectingItem(null);
                                        setRejectComment('');
                                    }}
                                    disabled={submittingReject}
                                    className="flex-1 py-2.5 px-4 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 text-[#5B6472] dark:text-gray-300 font-semibold rounded-[8px] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-xs cursor-pointer text-center"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingReject}
                                    className="flex-1 py-2.5 px-4 bg-[#DE350B] text-white font-semibold rounded-[8px] hover:bg-[#b02a08] transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-60"
                                >
                                    {submittingReject ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
