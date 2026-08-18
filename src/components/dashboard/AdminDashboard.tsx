import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'leaves' | 'regularizations'>('leaves');
    const getInitials = (name?: string) => {
    if (!name) return '?';

    const nameParts = name.trim().split(/\s+/);

    // For a single name, show only its first letter
    if (nameParts.length === 1) {
        return nameParts[0][0].toUpperCase();
    }

    // First letter of first name + first letter of last name
    return (
        nameParts[0][0] +
        nameParts[nameParts.length - 1][0]
    ).toUpperCase();
};

    return (
        <div className="text-gray-800 dark:text-white animate-fade-in-up">
            <header className="mb-10 lg:flex lg:justify-between lg:items-end">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 mb-2">Admin Dashboard</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">WelcomeHR Admin, here's the organizational overview.</p>
                </div>
            </header>

            {pendingRegularizations.length > 0 && (
                <div className="mb-8 relative overflow-hidden bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/10 border border-orange-200/60 dark:border-orange-500/20 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="flex items-start sm:items-center gap-4 relative z-10">
                        <div className="p-3 bg-white dark:bg-orange-500/20 rounded-2xl shadow-sm">
                            <AlertCircle className="text-orange-600 dark:text-orange-400" size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h5 className="font-bold text-orange-900 dark:text-orange-200 text-base mb-1">Action Required</h5>
                            <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                                There are <strong>{pendingRegularizations.length}</strong> pending attendance regularization requests waiting for your review.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setActiveTab('regularizations');
                            setTimeout(() => {
                                document.getElementById('approval-center')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 50);
                        }}
                        className="relative z-10 px-5 py-2.5 bg-orange-600 hover:bg-orange-750 dark:bg-orange-500/20 text-white dark:text-orange-200 text-sm font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
                    >
                        Review Regularizations
                    </button>
                </div>
            )}

            <HeadcountStats {...stats} navigate={navigate} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <LiveAttendance data={attendanceData} />
                </div>

                <div id="approval-center" className="lg:col-span-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-gray-100/50 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 h-[28rem] flex flex-col pt-7">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-black text-gray-800 dark:text-white">Approval Center</h3>
                        <div className="flex items-center gap-2">
                            <span className="bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 text-xs font-black px-2.5 py-1 rounded-full">
                                {activeTab === 'leaves' ? pendingApprovals.length : pendingRegularizations.length}
                            </span>
                        </div>
                    </div>

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
                            REGULARIZATIONS ({pendingRegularizations.length})
                        </button>
                    </div>

                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0 max-h-[220px]">
                        {activeTab === 'leaves' ? (
                            pendingApprovals.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10 font-semibold">No pending leaves.</p>
                            ) : (
                                pendingApprovals.map((approval) => (
                                    <div 
                                        key={approval.id} 
                                        onClick={() => navigate('/leave', { state: { activeTab: 'APPROVALS' } })}
                                        className="group flex items-center gap-4 p-4 hover:bg-white dark:hover:bg-gray-700/50 rounded-2xl border border-transparent hover:border-gray-100 dark:hover:border-gray-600 hover:shadow-sm transition-all duration-205 cursor-pointer"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/20 dark:to-blue-400/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-xs shadow-inner group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                                          {getInitials(approval.userName)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{approval.userName}</h4>
                                            <p className="text-[10px] font-medium text-gray-500 mt-0.5 truncate">{approval.type} • <span className="text-brand-600 dark:text-brand-400 font-semibold">{approval.duration} days</span></p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate('/leave', { state: { activeTab: 'APPROVALS' } });
                                            }}
                                            className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap"
                                        >
                                            Review
                                        </button>
                                    </div>
                                ))
                            )
                        ) : (
                            pendingRegularizations.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-10 font-semibold">No pending regularizations.</p>
                            ) : (
                                pendingRegularizations.map((request) => {
                                    const name = request.user?.name || `Employee #${request.userId}`;
                                    return (
                                        <div 
                                            key={request.id} 
                                            onClick={() => navigate('/regularizations')}
                                            className="group flex items-center gap-4 p-4 hover:bg-white dark:hover:bg-gray-700/50 rounded-2xl border border-transparent hover:border-gray-100 dark:hover:border-gray-600 hover:shadow-sm transition-all duration-205 cursor-pointer"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-500/20 dark:to-orange-400/10 flex items-center justify-center text-orange-600 dark:text-orange-400 font-black text-xs shadow-inner group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                                             
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{name}</h4>
                                                <p className="text-[10px] font-medium text-gray-500 mt-0.5 truncate">
                                                    {request.reason || 'Regularization'} • <span className="text-brand-600 dark:text-brand-400 font-semibold">{request.date}</span>
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate('/regularizations');
                                                }}
                                                className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap"
                                            >
                                                Review
                                            </button>
                                        </div>
                                    );
                                })
                            )
                        )}
                    </div>
                </div>
            </div>

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
        </div>
    );
}
