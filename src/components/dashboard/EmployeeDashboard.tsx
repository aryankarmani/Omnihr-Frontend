import { useState, useEffect } from 'react';
import { Clock, Calendar, History, ArrowRight, CheckCircle2, AlertCircle, LogIn, LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function EmployeeDashboard({ user }: { user: any }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [punchStatus, setPunchStatus] = useState<any>(null);
    const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
    const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);

    useEffect(() => {
        const fetchEmployeeData = async () => {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;

            try {
                // Fetch each resource individually to handle partial failures
                const [statusRes, leaveRes, historyRes, holidayRes] = await Promise.allSettled([
                    api.get('/attendance/status'),
                    api.get('/leave/balances'),
                    api.get(`/attendance/history?year=${year}&month=${month}`),
                    api.get('/masters/holidays')
                ]);

                if (statusRes.status === 'fulfilled') setPunchStatus(statusRes.value.data);
                if (leaveRes.status === 'fulfilled') setLeaveBalances(leaveRes.value.data);
                if (historyRes.status === 'fulfilled') setRecentAttendance(historyRes.value.data.slice(0, 5));
                if (holidayRes.status === 'fulfilled') setHolidays(holidayRes.value.data);

            } catch (error) {
                console.error("Failed to fetch employee dashboard data:", error);
                toast.error("Some dashboard data failed to load");
            } finally {
                setLoading(false);
            }
        };

        fetchEmployeeData();
    }, []);

    const handlePunch = async () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        try {
            const res = await api.post('/attendance/punch');
            setPunchStatus(res.data.record ? {
                isPunchedIn: res.data.record.inTime && !res.data.record.outTime,
                punchInTime: res.data.record.inTime,
                punchOutTime: res.data.record.outTime,
                status: res.data.record.status
            } : res.data);

            toast.success(res.data.message || 'Action successful');

            // Refresh history with correct parameters
            const historyRes = await api.get(`/attendance/history?year=${year}&month=${month}`);
            setRecentAttendance(historyRes.data.slice(0, 5));
        } catch (error: any) {
            console.error("Punch error:", error);
            toast.error(error.response?.data?.message || "Punch action failed");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-brand-500" size={48} />
            </div>
        );
    }

    const totalLeaves = leaveBalances.reduce((acc, curr) => acc + curr.balance, 0);
    const isPunchedIn = punchStatus?.isPunchedIn;
    const hasPunchedOut = !!punchStatus?.punchOutTime;
    const isShiftCompleted = !isPunchedIn && hasPunchedOut;

    // Holiday Check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayHoliday = holidays.find(h => {
        const hDate = new Date(h.date);
        hDate.setHours(0, 0, 0, 0);
        return hDate.getTime() === today.getTime();
    });

    const isHolidayToday = !!todayHoliday;

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* GREETING SECTION */}
            <div className="relative overflow-hidden bg-gradient-to-r from-brand-600 to-brand-800 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl shadow-brand-500/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

                <div className="relative z-10">
                    <h2 className="text-3xl md:text-4xl font-extrabold mb-2">Welcome, {user.name}!</h2>
                    <p className="text-brand-100 text-lg opacity-90 max-w-md">Your personalized workspace is ready. Have a productive day!</p>

                    <div className="mt-8 flex flex-wrap gap-4">
                        <button
                            onClick={handlePunch}
                            disabled={isShiftCompleted || isHolidayToday}
                            className={`flex items-center gap-3 px-8 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${isHolidayToday
                                ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                                : isPunchedIn
                                    ? 'bg-white text-brand-600 hover:bg-gray-100 shadow-white/10'
                                    : isShiftCompleted
                                        ? 'bg-gray-500 text-white shadow-none'
                                        : 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/20'
                                }`}
                        >
                            {isHolidayToday ? <Calendar size={22} /> : isPunchedIn ? <LogOut size={22} /> : <LogIn size={22} />}
                            {isHolidayToday ? 'Holiday Today' : isPunchedIn ? 'Punch Out Now' : isShiftCompleted ? 'Shift Completed' : 'Punch In Now'}
                        </button>

                        <button
                            onClick={() => navigate('/leave')}
                            className="flex items-center gap-3 px-8 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl font-bold transition-all active:scale-95"
                        >
                            Apply Leave
                        </button>
                    </div>
                </div>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div onClick={() => navigate('/attendance')} className="bg-white dark:bg-brand-900/50 p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <Clock size={24} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Attendance</span>
                    </div>
                    <h4 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Punch Status</h4>
                    <p className="text-2xl font-bold mt-1 text-gray-800 dark:text-white">
                        {punchStatus?.isPunchedIn ? 'Currently Working' : 'Not Punched In'}
                    </p>
                </div>

                <div onClick={() => navigate('/leave')} className="bg-white dark:bg-brand-900/50 p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 bg-brand-100 dark:bg-brand-500/20 rounded-2xl text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform">
                            <Calendar size={24} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Leaves</span>
                    </div>
                    <h4 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Remaining Balance</h4>
                    <p className="text-2xl font-bold mt-1 text-gray-800 dark:text-white">{totalLeaves} Days</p>
                </div>

                <div className="bg-white dark:bg-brand-900/50 p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-2xl text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                            <History size={24} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {isHolidayToday ? 'Today' : 'Upcoming'}
                        </span>
                    </div>
                    {(() => {
                        const nextHoliday = [...holidays]
                            .filter(h => {
                                const hDate = new Date(h.date);
                                hDate.setHours(0, 0, 0, 0);
                                return hDate >= today;
                            })
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

                        if (!nextHoliday) {
                            return (
                                <>
                                    <h4 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Holiday</h4>
                                    <p className="text-xl font-bold mt-1 text-gray-400">No holidays scheduled</p>
                                </>
                            );
                        }

                        const hDate = new Date(nextHoliday.date);
                        const isThisHolidayToday = hDate.setHours(0, 0, 0, 0) === today.getTime();

                        return (
                            <>
                                <h4 className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                                    {isThisHolidayToday ? 'Public Holiday' : 'Next Holiday'}
                                </h4>
                                <p className="text-2xl font-bold mt-1 text-gray-800 dark:text-white truncate" title={nextHoliday.name}>
                                    {nextHoliday.name}
                                </p>
                                <p className="text-xs text-purple-500 font-black mt-1 uppercase tracking-wider">
                                    {hDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </>
                        );
                    })()}
                </div>
            </div>

            {/* LOWER CONTENT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* RECENT ATTENDANCE */}
                <div className="lg:col-span-2 bg-white dark:bg-brand-900/50 rounded-3xl p-8 border border-gray-100 dark:border-white/5 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">My Recent Activity</h3>
                        <button
                            onClick={() => navigate('/attendance')}
                            className="text-brand-600 dark:text-brand-400 font-bold text-sm hover:underline"
                        >
                            View All
                        </button>
                    </div>

                    <div className="space-y-4">
                        {recentAttendance.length > 0 ? recentAttendance.map((log, index) => (
                            <div key={index} onClick={() => navigate('/attendance')} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-transparent hover:border-brand-500/20 transition-all group cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-brand-800 flex items-center justify-center text-gray-400 group-hover:text-brand-500 transition-colors shadow-sm">
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 dark:text-white">{new Date(log.date).toLocaleDateString()}</p>
                                        <p className="text-xs text-gray-500">{log.totalHours || '0'} hrs worked</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="px-3 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                                        {log.status || 'Present'}
                                    </span>
                                    <p className="text-[10px] text-gray-400 mt-1">{log.clockIn} - {log.clockOut || '---'}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">No recent activity found.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* PROFILE PREVIEW */}
                <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

                    <h3 className="text-xl font-bold mb-6 relative z-10">My Profile</h3>

                    <div className="flex flex-col items-center gap-4 relative z-10">
                        <div className="w-24 h-24 rounded-[2rem] bg-brand-500 flex items-center justify-center text-3xl font-bold shadow-2xl shadow-brand-500/40 transform -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                            {user.name.charAt(0)}
                        </div>
                        <div className="text-center">
                            <h4 className="text-lg font-bold">{user.name}</h4>
                            <p className="text-gray-400 text-sm uppercase tracking-widest font-bold mt-1">{user.role}</p>
                        </div>
                    </div>

                    <div className="mt-8 space-y-4 relative z-10">
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                            <CheckCircle2 size={16} className="text-brand-500" />
                            <span>Employee ID: EMP{user.id.toString().padStart(4, '0')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                            <AlertCircle size={16} className="text-brand-100/40" />
                            <span>{user.email}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/profile')}
                        className="mt-10 w-full py-4 bg-brand-600 hover:bg-brand-700 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group/btn"
                    >
                        View Full Profile
                        <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
