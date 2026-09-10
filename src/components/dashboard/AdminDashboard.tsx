import { Check, X } from 'lucide-react';
import HeadcountStats from './HeadcountStats';
import LiveAttendance from './LiveAttendance';

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

                <div id="approval-center" className="lg:col-span-2 bg-white dark:bg-[#12151C] p-4 sm:p-6 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 h-[300px] max-h-[300px] flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <span className="panel-title text-[15px] font-semibold text-[#12151C] dark:text-white block">Approval Center</span>
                                <p className="text-[12.5px] text-[#9AA3B1] dark:text-gray-400 mt-0.5">
                                    Pending leave requests
                                </p>
                            </div>
                            <span className="w-5 h-5 rounded-full bg-[#E8ECFC] text-[#2C4FD6] text-[11px] font-bold font-mono-numbers flex items-center justify-center">
                                {pendingApprovals.length + pendingRegularizations.length}
                            </span>
                        </div>
                        <div className="border-b border-[#E2E6ED] dark:border-gray-800 mb-3"></div>
                    </div>

                    <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar flex-1 min-h-0">
                        {pendingApprovals.length === 0 && pendingRegularizations.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <p className="text-xs text-[#9AA3B1] text-center">No pending leave requests.</p>
                            </div>
                        ) : (
                            <>
                                {pendingApprovals.map((approval) => (
                                    <div 
                                        key={approval.id} 
                                        onClick={() => navigate('/leave', { state: { activeTab: 'APPROVALS' } })}
                                        className="flex items-center justify-between p-1.5 rounded-[6px] hover:bg-[#F7F8FA] dark:hover:bg-gray-800 transition-all cursor-pointer border border-transparent hover:border-[#E2E6ED]"
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-8 h-8 rounded-full bg-[#EEF1F5] dark:bg-gray-700 flex items-center justify-center text-[#5B6472] dark:text-white font-mono-numbers font-bold text-xs shrink-0">
                                                {getInitials(approval.userName)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-[14px] font-semibold text-[#12151C] dark:text-white truncate">{approval.userName}</h4>
                                                <p className="text-[12.5px] text-[#5B6472] dark:text-gray-400 truncate">
                                                    {approval.type} · <span className="font-mono-numbers">{approval.duration} days</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate('/leave', { state: { activeTab: 'APPROVALS' } });
                                                }}
                                                className="w-6 h-6 rounded-[6px] border border-[#E2E6ED] text-[#1F8A5A] hover:bg-[#E4F5EC] flex items-center justify-center transition-colors"
                                                title="Approve"
                                            >
                                                <Check size={13} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate('/leave', { state: { activeTab: 'APPROVALS' } });
                                                }}
                                                className="w-6 h-6 rounded-[6px] border border-[#E2E6ED] text-[#C13A3A] hover:bg-[#FBE7E7] flex items-center justify-center transition-colors"
                                                title="Reject"
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {pendingRegularizations.map((request) => {
                                    const name = request.user?.name || `Employee #${request.userId}`;
                                    return (
                                        <div 
                                            key={request.id} 
                                            onClick={() => navigate('/regularizations')}
                                            className="flex items-center justify-between p-1.5 rounded-[6px] hover:bg-[#F7F8FA] dark:hover:bg-gray-800 transition-all cursor-pointer border border-transparent hover:border-[#E2E6ED]"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="w-8 h-8 rounded-full bg-[#EEF1F5] dark:bg-gray-700 flex items-center justify-center text-[#5B6472] dark:text-white font-mono-numbers font-bold text-xs shrink-0">
                                                    {getInitials(name)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="text-[14px] font-semibold text-[#12151C] dark:text-white truncate">{name}</h4>
                                                    <p className="text-[12.5px] text-[#5B6472] dark:text-gray-400 truncate">
                                                        {request.reason || 'Regularization'} · <span className="font-mono-numbers">{request.date}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate('/regularizations');
                                                    }}
                                                    className="w-6 h-6 rounded-[6px] border border-[#E2E6ED] text-[#1F8A5A] hover:bg-[#E4F5EC] flex items-center justify-center transition-colors"
                                                    title="Review"
                                                >
                                                    <Check size={13} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate('/regularizations');
                                                    }}
                                                    className="w-6 h-6 rounded-[6px] border border-[#E2E6ED] text-[#C13A3A] hover:bg-[#FBE7E7] flex items-center justify-center transition-colors"
                                                    title="Reject"
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
        </div>
    );
}
