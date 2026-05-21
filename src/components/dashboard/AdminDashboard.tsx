import { useState, useEffect } from 'react';
import { AlertCircle, Check, X, Clock, User, MessageSquare } from 'lucide-react';
import HeadcountStats from './HeadcountStats';
import LiveAttendance from './LiveAttendance';
import toast from 'react-hot-toast';
import api from '../../utils/api';

interface AdminDashboardProps {
    navigate: any;
    stats: any;
    attendanceData: any[];
    pendingApprovals: any[];
    pendingRegularizations: any[];
    employees: any[];
}

export default function AdminDashboard({
    navigate,
    stats,
    attendanceData,
    pendingApprovals,
    pendingRegularizations = [],
    employees
}: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<'leaves' | 'regularizations'>('leaves');
    const [localPendingRegs, setLocalPendingRegs] = useState<any[]>([]);

    // Rejection Comment Modal State
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectComment, setRejectComment] = useState("");
    const [submittingReject, setSubmittingReject] = useState(false);

    // Robust 12-Hour AM/PM Formatter
    const formatTime12h = (timeStr?: string) => {
        if (!timeStr) return '--:--';
        try {
            // Check if it's a simple HH:MM or HH:MM:SS string
            if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
                const [hoursStr, minutesStr] = timeStr.split(':');
                let hours = parseInt(hoursStr, 10);
                const minutes = parseInt(minutesStr, 10);
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12; // the hour '0' should be '12'
                const minutesFormatted = minutes < 10 ? '0' + minutes : minutes;
                return `${hours}:${minutesFormatted} ${ampm}`;
            }
            
            // If it contains a T or is a full date string, parse it using Date
            const date = new Date(timeStr);
            if (isNaN(date.getTime())) {
                // Try matching HH:MM inside the string
                const match = timeStr.match(/(\d{2}):(\d{2})/);
                if (match) {
                    let hours = parseInt(match[1], 10);
                    const minutes = parseInt(match[2], 10);
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    hours = hours % 12;
                    hours = hours ? hours : 12;
                    const minutesFormatted = minutes < 10 ? '0' + minutes : minutes;
                    return `${hours}:${minutesFormatted} ${ampm}`;
                }
                return timeStr;
            }
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch (e) {
            return timeStr;
        }
    };

    // Sync local pending lists
    useEffect(() => {
        setLocalPendingRegs(pendingRegularizations);
    }, [pendingRegularizations]);

    // Action Handlers
    const handleApprove = async (id: string) => {
        try {
            await api.put(`/attendance/regularize/${id}/approve`);
            toast.success("Attendance correction approved successfully");
            setLocalPendingRegs(prev => prev.filter(r => r.id !== id));
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to approve request");
        }
    };

    const handleRejectClick = (id: string) => {
        setRejectingId(id);
        setRejectComment("");
    };

    const handleRejectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectingId || !rejectComment.trim()) return;

        setSubmittingReject(true);
        try {
            await api.put(`/attendance/regularize/${rejectingId}/reject`, {
                approverComment: rejectComment
            });
            toast.success("Attendance correction rejected");
            setLocalPendingRegs(prev => prev.filter(r => r.id !== rejectingId));
            setRejectingId(null);
            setRejectComment("");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to reject request");
        } finally {
            setSubmittingReject(false);
        }
    };

    return (
        <div className="text-gray-800 dark:text-white animate-fade-in-up">
            <header className="mb-10 lg:flex lg:justify-between lg:items-end">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 mb-2">Admin Dashboard</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">Welcome back HR Admin, here's the organizational overview.</p>
                </div>
            </header>

            {/* Regularization Alert (Dynamic) */}
            {localPendingRegs.length > 0 && (
                <div className="mb-8 relative overflow-hidden bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/10 border border-orange-200/60 dark:border-orange-500/20 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex items-start sm:items-center gap-4 relative z-10">
                        <div className="p-3 bg-white dark:bg-orange-500/20 rounded-2xl shadow-sm">
                            <AlertCircle className="text-orange-600 dark:text-orange-400" size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h5 className="font-bold text-orange-900 dark:text-orange-200 text-base mb-1">Action Required</h5>
                            <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                                There are <strong>{localPendingRegs.length}</strong> pending attendance regularization requests waiting for your review.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setActiveTab('regularizations')}
                        className="relative z-10 px-5 py-2.5 bg-orange-600 hover:bg-orange-750 dark:bg-orange-500/20 text-white dark:text-orange-200 text-sm font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
                    >
                        Review Corrections
                    </button>
                </div>
            )}

            {/* Key Metrics Widgets */}
            <HeadcountStats {...stats} navigate={navigate} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Live Attendance Chart */}
                <div className="lg:col-span-2">
                    <LiveAttendance data={attendanceData} />
                </div>

                {/* Dual-Tab Approval Widget */}
                <div className="lg:col-span-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-gray-100/50 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 h-[28rem] flex flex-col pt-7">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-black text-gray-800 dark:text-white">Approval Center</h3>
                        <div className="flex items-center gap-2">
                            <span className="bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 text-xs font-black px-2.5 py-1 rounded-full">
                                {activeTab === 'leaves' ? pendingApprovals.length : localPendingRegs.length}
                            </span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 border-b border-gray-100 dark:border-white/10 mb-4 pb-2">
                        <button
                            onClick={() => setActiveTab('leaves')}
                            className={`flex-1 pb-2 text-xs font-black tracking-wider uppercase text-center border-b-2 transition-all ${activeTab === 'leaves'
                                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            Leaves ({pendingApprovals.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('regularizations')}
                            className={`flex-1 pb-2 text-xs font-black tracking-wider uppercase text-center border-b-2 transition-all ${activeTab === 'regularizations'
                                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            REGULARIZATIONS ({localPendingRegs.length})
                        </button>
                    </div>

                    {/* Content Scroll Area */}
                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0 max-h-[220px]">
                        {activeTab === 'leaves' ? (
                            pendingApprovals.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10 font-semibold">No pending leaves.</p>
                            ) : (
                                pendingApprovals.map((approval) => (
                                    <div key={approval.id} className="group flex items-center gap-4 p-4 hover:bg-white dark:hover:bg-gray-700/50 rounded-2xl border border-transparent hover:border-gray-100 dark:hover:border-gray-600 hover:shadow-sm transition-all duration-205 cursor-pointer">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/20 dark:to-blue-400/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs shadow-inner group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                                            {approval.avatar ? <img src={approval.avatar} alt="avatar" className="w-full h-full object-cover" /> : approval.userName.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{approval.userName}</h4>
                                            <p className="text-[10px] font-medium text-gray-500 mt-0.5 truncate">{approval.type} • <span className="text-brand-600 dark:text-brand-400 font-semibold">{approval.duration} days</span></p>
                                        </div>
                                        <button
                                            onClick={() => navigate('/leave', { state: { activeTab: 'APPROVALS' } })}
                                            className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap"
                                        >
                                            Review
                                        </button>
                                    </div>
                                ))
                            )
                        ) : (
                            localPendingRegs.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10 font-semibold">No pending corrections.</p>
                            ) : (
                                <>
                                    {localPendingRegs.map((request) => (
                                        <div key={request.id} className="group p-4 hover:bg-white dark:hover:bg-gray-700/50 rounded-2xl border border-gray-50 dark:border-white/5 hover:border-gray-100 dark:hover:border-gray-600 hover:shadow-sm transition-all duration-205">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-500/20 dark:to-orange-400/10 flex items-center justify-center text-orange-600 dark:text-orange-400 font-black text-xs shadow-inner overflow-hidden shrink-0">
                                                    {request.user?.name ? request.user.name.substring(0, 2).toUpperCase() : <User size={14} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{request.user?.name || `Employee #${request.userId}`}</h4>
                                                    <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 truncate">Date: {request.date}</p>
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-gray-600 dark:text-gray-300 font-medium mb-3 italic">
                                                "{request.reason}"
                                            </p>

                                            {/* Proposed Times */}
                                            {(request.proposedIn || request.inTime || request.proposedOut || request.outTime) && (
                                                <div className="flex gap-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
                                                    {(request.proposedIn || request.inTime) && (
                                                        <span className="flex items-center gap-1"><Clock size={10} className="text-green-600" /> In: {formatTime12h(request.proposedIn || request.inTime)}</span>
                                                    )}
                                                    {(request.proposedOut || request.outTime) && (
                                                        <span className="flex items-center gap-1"><Clock size={10} className="text-red-500" /> Out: {formatTime12h(request.proposedOut || request.outTime)}</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApprove(request.id)}
                                                    className="flex-1 py-1.5 px-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all"
                                                >
                                                    <Check size={12} /> Approve
                                                </button>
                                                <button
                                                    onClick={() => handleRejectClick(request.id)}
                                                    className="flex-1 py-1.5 px-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all"
                                                >
                                                    <X size={12} /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )
                        )}
                    </div>

                    {/* Fixed Bottom Section */}
                    {activeTab === 'regularizations' && localPendingRegs.length > 0 && (
                        <div className="pt-3 mt-2 border-t border-gray-100 dark:border-white/10 shrink-0">
                            <button
                                onClick={() => navigate('/regularizations')}
                                className="w-full py-2.5 px-4 bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 font-black rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                View All Regularizations
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Employee Overview Table */}
            <div className="mt-8 mb-8 pb-4">
                <div className="flex justify-between items-center mb-6 px-1">
                    <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">Employee Overview</h3>
                    <button
                        onClick={() => navigate('/employee')}
                        className="text-sm font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline underline-offset-4 decoration-2"
                    >
                        View All
                    </button>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 dark:border-gray-700/50">
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-gray-50/80 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold border-b border-gray-100/80 dark:border-gray-700/80">
                                    <th className="py-5 px-8 font-bold">Name</th>
                                    <th className="py-5 px-8 font-bold">Role</th>
                                    <th className="py-5 px-8 font-bold">Status</th>
                                    <th className="py-5 px-8 font-bold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-50/80 dark:divide-gray-700/50">
                                {employees
                                    .filter((emp) => emp.status !== 'Inactive' && emp.status?.toLowerCase() !== 'inactive')
                                    .map((emp) => (
                                    <tr key={emp.id} onClick={() => navigate(`/employee/${emp.id}`)} className="group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                                        <td className="py-4 px-8 flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 shadow-inner group-hover:scale-105 transition-transform">
                                                {emp.name.split(' ').map((n: string) => n[0]).join('')}
                                            </div>
                                            <span className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{emp.name}</span>
                                        </td>
                                        <td className="py-4 px-8 text-gray-500 dark:text-gray-400 font-medium">{emp.role}</td>
                                        <td className="py-4 px-8">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${emp.status === 'Inactive'
                                                ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:text-rose-400'
                                                : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400'
                                                }`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-8 text-right">
                                            <button
                                                className="text-sm font-bold text-gray-400 dark:text-gray-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors hover:underline underline-offset-4 decoration-2"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/employee/${emp.id}`);
                                                }}
                                            >
                                                View Profile
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Rejection Comment Modal */}
            {rejectingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-brand-900 rounded-[2rem] p-8 max-w-sm w-full border border-gray-100 dark:border-white/10 shadow-2xl animate-scale-in">
                        <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 rounded-2xl flex items-center justify-center mb-4 text-rose-500 mx-auto">
                            <MessageSquare size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-2">Rejection Reason</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6 font-medium">Please explain why you are rejecting this attendance correction request.</p>

                        <form onSubmit={handleRejectSubmit} className="space-y-4">
                            <textarea
                                value={rejectComment}
                                onChange={(e) => setRejectComment(e.target.value)}
                                required
                                placeholder="E.g., Punch-out time doesn't match shift schedule..."
                                rows={3}
                                className="w-full p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-xs font-semibold"
                            />

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRejectingId(null)}
                                    className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all text-xs tracking-wider uppercase"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingReject}
                                    className="flex-1 py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-500/25 text-xs tracking-wider uppercase flex items-center justify-center gap-1"
                                >
                                    Reject
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
