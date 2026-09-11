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

    // Rejection Modal State
    const [rejectingItem, setRejectingItem] = useState<{ type: 'LEAVE' | 'REGULARIZATION'; id: any } | null>(null);
    const [rejectComment, setRejectComment] = useState('');
    const [submittingReject, setSubmittingReject] = useState(false);

    useEffect(() => {
        setApprovalsList(pendingApprovals || []);
    }, [pendingApprovals]);

    useEffect(() => {
        setRegList(pendingRegularizations || []);
    }, [pendingRegularizations]);

    const handleApproveLeave = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        try {
            await api.put(`/leave/${id}/status`, { status: 'APPROVED' });
            toast.success('Leave request approved');
            setApprovalsList(prev => prev.filter(item => item.id !== id));
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to approve leave');
        }
    };

    const handleRejectLeaveClick = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setRejectingItem({ type: 'LEAVE', id });
        setRejectComment('');
    };

    const handleApproveReg = async (e: React.MouseEvent, id: any) => {
        e.stopPropagation();
        try {
            await api.put(`/attendance/regularize/${id}/approve`);
            toast.success('Regularization approved');
            setRegList(prev => prev.filter(item => item.id !== id));
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to approve regularization');
        }
    };

    const handleRejectRegClick = (e: React.MouseEvent, id: any) => {
        e.stopPropagation();
        setRejectingItem({ type: 'REGULARIZATION', id });
        setRejectComment('');
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
                setApprovalsList(prev => prev.filter(item => item.id !== rejectingItem.id));
            } else {
                await api.put(`/attendance/regularize/${rejectingItem.id}/reject`, {
                    reason: rejectComment.trim(),
                    approverComment: rejectComment.trim()
                });
                toast.success('Regularization rejected');
                setRegList(prev => prev.filter(item => item.id !== rejectingItem.id));
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
                        {((filterTab === 'ALL' && totalPending === 0) ||
                          (filterTab === 'LEAVE' && approvalsList.length === 0) ||
                          (filterTab === 'REGULARIZATION' && regList.length === 0)) ? (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-xs text-[#9AA3B1] text-center">No pending requests.</p>
                            </div>
                        ) : (
                            <>
                                {(filterTab === 'ALL' || filterTab === 'LEAVE') && approvalsList.map((approval) => (
                                    <div 
                                        key={`leave-${approval.id}`} 
                                        onClick={() => navigate('/leave', { state: { activeTab: 'APPROVALS' } })}
                                        className="flex items-center justify-between p-1.5 rounded-[6px] hover:bg-[#F7F8FA] dark:hover:bg-gray-800 transition-all cursor-pointer border border-transparent hover:border-[#E2E6ED]"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <div className="w-8 h-8 rounded-full bg-[#EEF1F5] dark:bg-gray-700 flex items-center justify-center text-[#5B6472] dark:text-white font-mono-numbers font-bold text-xs shrink-0">
                                                {getInitials(approval.userName)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <h4 className="text-[13px] font-semibold text-[#12151C] dark:text-white truncate">{approval.userName}</h4>
                                                    <span className="text-[9px] font-semibold px-1 py-0.2 bg-[#E8ECFC] text-[#2C4FD6] rounded-[3px]">Leave</span>
                                                </div>
                                                <p className="text-[11.5px] text-[#5B6472] dark:text-gray-400 truncate">
                                                    {approval.type} · <span className="font-mono-numbers">{approval.duration} days</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                            <button
                                                onClick={(e) => handleApproveLeave(e, approval.id)}
                                                className="w-6 h-6 rounded-[6px] border border-[#E2E6ED] text-[#1F8A5A] hover:bg-[#E4F5EC] flex items-center justify-center transition-colors"
                                                title="Approve Leave"
                                            >
                                                <Check size={13} />
                                            </button>
                                            <button
                                                onClick={(e) => handleRejectLeaveClick(e, approval.id)}
                                                className="w-6 h-6 rounded-[6px] border border-[#E2E6ED] text-[#C13A3A] hover:bg-[#FBE7E7] flex items-center justify-center transition-colors"
                                                title="Reject Leave"
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {(filterTab === 'ALL' || filterTab === 'REGULARIZATION') && regList.map((request) => {
                                    const name = request.user?.name || `Employee #${request.userId}`;
                                    return (
                                        <div 
                                            key={`reg-${request.id}`} 
                                            onClick={() => navigate('/regularizations')}
                                            className="flex items-center justify-between p-1.5 rounded-[6px] hover:bg-[#F7F8FA] dark:hover:bg-gray-800 transition-all cursor-pointer border border-transparent hover:border-[#E2E6ED]"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <div className="w-8 h-8 rounded-full bg-[#FFF7ED] dark:bg-orange-950/40 flex items-center justify-center text-[#EA580C] font-mono-numbers font-bold text-xs shrink-0">
                                                    {getInitials(name)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <h4 className="text-[13px] font-semibold text-[#12151C] dark:text-white truncate">{name}</h4>
                                                        <span className="text-[9px] font-semibold px-1 py-0.2 bg-[#FFF7ED] text-[#EA580C] rounded-[3px]">Regularize</span>
                                                    </div>
                                                    <p className="text-[11.5px] text-[#5B6472] dark:text-gray-400 truncate">
                                                        {request.reason || 'Regularization'} · <span className="font-mono-numbers">{request.date}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                                <button
                                                    onClick={(e) => handleApproveReg(e, request.id)}
                                                    className="w-6 h-6 rounded-[6px] border border-[#E2E6ED] text-[#1F8A5A] hover:bg-[#E4F5EC] flex items-center justify-center transition-colors"
                                                    title="Approve Regularization"
                                                >
                                                    <Check size={13} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleRejectRegClick(e, request.id)}
                                                    className="w-6 h-6 rounded-[6px] border border-[#E2E6ED] text-[#C13A3A] hover:bg-[#FBE7E7] flex items-center justify-center transition-colors"
                                                    title="Reject Regularization"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Employee Overview Table */}
            <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 shadow-sm overflow-hidden">
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
                                    const attendancePct = emp.attendancePercentage !== undefined ? emp.attendancePercentage : null;
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
                                                    {attendancePct !== null ? `${attendancePct}%` : '100%'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>

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
                            Please provide a reason for rejecting this {rejectingItem.type === 'LEAVE' ? 'leave' : 'regularization'} request.
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
