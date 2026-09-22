import { useState, useEffect, useCallback } from 'react';
import { Clock, Calendar, History, LogIn, LogOut, Loader2, CheckCircle2, TrendingUp, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { DashboardSkeleton } from '../common/SkeletonLoaders';

export default function EmployeeDashboard({ user }: { user?: any }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [punchStatus, setPunchStatus] = useState<any>(null);
    const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
    const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
    const [monthlyAttendance, setMonthlyAttendance] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [isPunching, setIsPunching] = useState(false);

    const fetchEmployeeData = useCallback(async () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        try {
            // Fetch each resource individually to handle partial failures
            const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const reqs: Promise<any>[] = [
                api.get('/attendance/status'),
                api.get('/leave/balances'),
                api.get(`/attendance/history?year=${year}&month=${month}`),
                api.get('/masters/holidays')
            ];

            // If in first 7 days of month, fetch previous month too so 7-day chart has real data
            if (now.getDate() <= 7) {
                reqs.push(api.get(`/attendance/history?year=${prevMonthDate.getFullYear()}&month=${prevMonthDate.getMonth() + 1}`));
            }

            const results = await Promise.allSettled(reqs);

            if (results[0].status === 'fulfilled') setPunchStatus(results[0].value.data);
            if (results[1].status === 'fulfilled') setLeaveBalances(results[1].value.data);

            let allAttendance: any[] = [];
            if (results[2].status === 'fulfilled' && Array.isArray(results[2].value.data)) {
                allAttendance = [...results[2].value.data];
            }
            if (results[4] && results[4].status === 'fulfilled' && Array.isArray(results[4].value.data)) {
                allAttendance = [...results[4].value.data, ...allAttendance];
            }

            setMonthlyAttendance(allAttendance);
            setRecentAttendance(allAttendance.slice(-5).reverse());

            if (results[3].status === 'fulfilled') setHolidays(results[3].value.data);

        } catch (error) {
            console.error("Failed to fetch employee dashboard data:", error);
            toast.error("Some dashboard data failed to load");
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch and listen to global punch-in updates from PunchInPromptModal or other tabs
    useEffect(() => {
        fetchEmployeeData();

        const onPunchUpdated = () => {
            fetchEmployeeData();
        };
        window.addEventListener('punch-updated', onPunchUpdated);
        return () => window.removeEventListener('punch-updated', onPunchUpdated);
    }, [fetchEmployeeData]);

    const handlePunch = async () => {
        if (isPunching) return;
        setIsPunching(true);
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
            window.dispatchEvent(new Event('punch-updated'));

            // Refresh history with correct parameters
            const historyRes = await api.get(`/attendance/history?year=${year}&month=${month}`);
            if (Array.isArray(historyRes.data)) {
                setMonthlyAttendance(historyRes.data);
                setRecentAttendance(historyRes.data.slice(0, 5));
            }
        } catch (error: any) {
            console.error("Punch error:", error);
            toast.error(error.response?.data?.message || "Punch action failed");
        } finally {
            setIsPunching(false);
        }
    };

    if (loading) {
        return <DashboardSkeleton />;
    }

    const totalLeaves = leaveBalances.reduce((acc, curr) => acc + (curr.balance ?? 0), 0);
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

    const nextHoliday = [...holidays]
        .filter(h => {
            const hDate = new Date(h.date);
            hDate.setHours(0, 0, 0, 0);
            return hDate >= today;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    // Total real hours worked this month from database (100% genuine data)
    const currentMonthPrefix = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const totalMonthlyHours = monthlyAttendance
        .filter(r => {
            if (!r?.date) return false;
            const rDate = typeof r.date === 'string' && r.date.includes('T') ? r.date.split('T')[0] : String(r.date);
            return rDate.startsWith(currentMonthPrefix);
        })
        .reduce((acc, curr) => {
            let h = parseFloat(curr.hours) || parseFloat(curr.totalHours) || 0;
            if (!h && curr.inTime && curr.outTime) {
                h = (new Date(curr.outTime).getTime() - new Date(curr.inTime).getTime()) / (1000 * 60 * 60);
            }
            return acc + (isNaN(h) || h < 0 ? 0 : h);
        }, 0);

    // Weekly Working Hours Graph Data (Past 7 Days) - 100% REAL DATA FROM DATABASE ONLY
    const weeklyChartData = (() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const result = [];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayLabel = days[d.getDay()];
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;

            // Match exact record from real monthlyAttendance
            const record = monthlyAttendance.find(r => {
                if (!r?.date) return false;
                const rDate = typeof r.date === 'string' && r.date.includes('T') ? r.date.split('T')[0] : String(r.date);
                return rDate === dateStr;
            });

            let hours = 0;
            if (record) {
                if (record.hours != null && !isNaN(Number(record.hours))) {
                    hours = Number(record.hours);
                } else if (record.totalHours != null && !isNaN(Number(record.totalHours))) {
                    hours = Number(record.totalHours);
                } else if (record.inTime && record.outTime) {
                    hours = (new Date(record.outTime).getTime() - new Date(record.inTime).getTime()) / (1000 * 60 * 60);
                }
            }

            result.push({
                name: dayLabel,
                fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                hours: Number(Math.max(0, hours).toFixed(1)),
                target: isWeekend ? 0 : 8.0,
                isWeekend,
                status: record?.status || (isWeekend ? 'Weekend' : (hours > 0 ? 'Present' : 'Absent'))
            });
        }
        return result;
    })();

    // Calculate real working days and real average
    const workedDays = weeklyChartData.filter(d => d.hours > 0);
    const avgWeeklyHours = workedDays.length > 0
        ? (workedDays.reduce((acc, curr) => acc + curr.hours, 0) / workedDays.length).toFixed(1)
        : '0.0';

    // 100% Real Leave Allocation from Database (no mock data)
    const leaveBreakdownData = leaveBalances.map(lb => {
        const total = Number(lb.totalQuota ?? lb.total ?? lb.balance ?? 0);
        const remaining = Number(lb.balance ?? lb.remaining ?? 0);
        const used = Math.max(0, total - remaining);
        return {
            type: lb.name || lb.type || 'Leave',
            used,
            remaining,
            total,
            percent: total > 0 ? Math.min(100, Math.round((remaining / total) * 100)) : 0
        };
    });

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* QUICK STATS - Connected continuous card strip matching Admin Dashboard (no middle gap) */}
            <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden mb-6 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E2E6ED] dark:divide-gray-800">
                {/* 1. ATTENDANCE & PUNCH */}
                <div className="p-5 sm:p-6 flex flex-col justify-between hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all group">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="kpi-label text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-[.06em]">
                                Attendance
                            </span>
                            <div className="w-7 h-7 rounded-[6px] bg-[#EEF1F5] dark:bg-gray-800 text-[#5B6472] dark:text-gray-300 flex items-center justify-center transition-colors group-hover:text-[#2C4FD6]">
                                <Clock size={15} />
                            </div>
                        </div>
                        <p className="text-[12px] text-[#9AA3B1] mb-1 font-medium">Punch Status</p>
                        <div className="kpi-num text-[22px] sm:text-[24px] font-bold text-[#12151C] dark:text-white tracking-tight leading-none mb-1.5">
                            {punchStatus?.isPunchedIn ? 'Currently Working' : 'Not Punched In'}
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E2E6ED] dark:border-gray-800 flex items-center justify-between gap-2">
                        <button
                            onClick={handlePunch}
                            disabled={isPunching || isShiftCompleted || isHolidayToday}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] text-xs font-bold transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
                                isHolidayToday
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                    : isPunchedIn
                                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                                        : isShiftCompleted
                                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                            : 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20'
                            }`}
                        >
                            {isHolidayToday ? <Calendar size={14} /> : isPunchedIn ? <LogOut size={14} /> : <LogIn size={14} />}
                            <span>{isHolidayToday ? 'Holiday' : isPunchedIn ? 'Punch Out' : isShiftCompleted ? 'Shift Ended' : 'Punch In Now'}</span>
                        </button>

                        <button
                            onClick={() => navigate('/attendance')}
                            className="text-xs font-semibold text-[#2C4FD6] dark:text-blue-400 hover:underline cursor-pointer"
                        >
                            View →
                        </button>
                    </div>
                </div>

                {/* 2. LEAVE BALANCE */}
                <div onClick={() => navigate('/leave')} className="p-5 sm:p-6 flex flex-col justify-between hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all group cursor-pointer">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="kpi-label text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-[.06em]">
                                Leaves
                            </span>
                            <div className="w-7 h-7 rounded-[6px] bg-[#EEF1F5] dark:bg-gray-800 text-[#5B6472] dark:text-gray-300 flex items-center justify-center transition-colors group-hover:text-[#2C4FD6]">
                                <Calendar size={15} />
                            </div>
                        </div>
                        <p className="text-[12px] text-[#9AA3B1] mb-1 font-medium">Remaining </p>
                        <div className="kpi-num text-[24px] sm:text-[24px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight leading-none mb-1.5">
                            {totalLeaves} Days
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E2E6ED] dark:border-gray-800 flex items-center justify-between">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate('/leave');
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-xs font-semibold transition-all cursor-pointer"
                        >
                            Apply Leave
                        </button>
                        <span className="text-xs font-semibold text-[#2C4FD6] dark:text-blue-400 hover:underline">
                            Details →
                        </span>
                    </div>
                </div>

                {/* 3. MONTHLY WORK HOURS */}
                <div className="p-5 sm:p-6 flex flex-col justify-between hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all group">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-bold text-[#059669] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-[4px] uppercase tracking-[.06em]">
                                This Month
                            </span>
                            <div className="w-7 h-7 rounded-[6px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-colors">
                                <CheckCircle2 size={15} />
                            </div>
                        </div>
                        <p className="text-[12px] text-[#9AA3B1] mb-1 font-medium">Monthly Work Hours</p>
                        <div className="kpi-num text-[24px] sm:text-[24px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight leading-none mb-1.5">
                            {totalMonthlyHours.toFixed(1)} hrs
                        </div>
                        <p className="text-[12px] text-[#9AA3B1]">
                            Total logged across all shifts
                        </p>
                    </div>
                </div>
            </div>

            {/* EMPLOYEE ANALYTICS & CHARTS ACCORDING TO PROFILE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Working Hours & Performance Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-brand-900/50 rounded-[6px] p-6 border border-gray-100 dark:border-white/5 flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} className="text-[#2C4FD6]" />
                                <h3 className="text-[15px] font-bold text-gray-800 dark:text-white">Daily Working Hours</h3>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Past 7 days work duration & shift performance</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold px-2 py-1 rounded-[4px] bg-blue-50 dark:bg-blue-900/20 text-[#2C4FD6] dark:text-blue-400">
                                Daily Avg: {avgWeeklyHours} hrs
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-1 rounded-[4px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                                Target: 8.0 hrs
                            </span>
                        </div>
                    </div>

                    <div className="h-[210px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9AA3B1', fontSize: 11, fontWeight: 500 }}
                                />
                                <YAxis
                                    domain={[0, 12]}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9AA3B1', fontSize: 11 }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(238, 241, 245, 0.4)' }}
                                    contentStyle={{
                                        borderRadius: '6px',
                                        border: '1px solid #E2E6ED',
                                        backgroundColor: '#FFFFFF',
                                        fontSize: '12px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                                    }}
                                    formatter={(value: any) => [`${value} hrs`, 'Worked']}
                                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                />
                                <Bar
                                    dataKey="hours"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={36}
                                >
                                    {weeklyChartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.isWeekend ? '#E5E7EB' : entry.hours >= 8 ? '#2C4FD6' : entry.hours > 0 ? '#60A5FA' : '#CBD5E1'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Leave Allocation & Balances Breakdown */}
                <div className="bg-white dark:bg-brand-900/50 rounded-[6px] p-6 border border-gray-100 dark:border-white/5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <BarChart2 size={16} className="text-[#2C4FD6]" />
                            <h3 className="text-[15px] font-bold text-gray-800 dark:text-white">Leave Allocation</h3>
                        </div>
                        <span className="text-xs font-bold text-[#2C4FD6] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-[4px]">
                            {totalLeaves} Total Left
                        </span>
                    </div>

                    <div className="space-y-4 my-auto">
                        {leaveBreakdownData.length > 0 ? (
                            leaveBreakdownData.map((leave, idx) => (
                                <div key={idx} className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-gray-700 dark:text-gray-200">{leave.type}</span>
                                        <span className="text-gray-500 dark:text-gray-400 font-mono-numbers">
                                            <span className="font-bold text-gray-800 dark:text-white">{leave.remaining}</span> / {leave.total} days
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-[#2C4FD6] to-[#4F70F0] rounded-full transition-all duration-500"
                                            style={{ width: `${leave.percent}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-6 text-center text-xs text-gray-400">
                                No leave balances recorded yet
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-white/5 mt-4 flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Need time off?</span>
                        <button
                            onClick={() => navigate('/leave')}
                            className="text-xs font-semibold text-[#2C4FD6] dark:text-blue-400 hover:underline cursor-pointer"
                        >
                            Request Leave →
                        </button>
                    </div>
                </div>
            </div>

            {/* RECENT ATTENDANCE */}
            <div className="bg-white dark:bg-brand-900/50 rounded-[6px] p-6 sm:p-8 border border-gray-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">My Recent Activity</h3>
                    <button
                        onClick={() => navigate('/attendance')}
                        className="text-brand-600 dark:text-brand-400 font-bold text-sm hover:underline cursor-pointer"
                    >
                        View All
                    </button>
                </div>

                <div className="space-y-4">
                    {recentAttendance.length > 0 ? recentAttendance.map((log, index) => (
                        <div key={index} onClick={() => navigate('/attendance')} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-[6px] border border-transparent hover:border-brand-500/20 transition-all group cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-[6px] bg-white dark:bg-brand-800 flex items-center justify-center text-gray-400 group-hover:text-brand-500 transition-colors">
                                    <Clock size={16} />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 dark:text-white">{new Date(log.date).toLocaleDateString()}</p>
                                    <p className="text-xs text-gray-500">{log.totalHours || '0'} hrs worked</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`px-3 py-1 text-xs font-bold rounded-[6px] ${
                                    log.status === 'Late'
                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border border-orange-200 dark:border-orange-800/30'
                                        : log.status === 'Absent'
                                            ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-800/30'
                                            : log.status === 'Half Day'
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30'
                                                : log.status === 'Holiday'
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-200 dark:border-purple-800/30'
                                                    : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border border-green-200 dark:border-green-800/30'
                                }`}>
                                    {log.status || 'Present'}
                                </span>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No recent activity found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
