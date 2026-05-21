import { useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle, Coffee, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

// Types for Attendance Data
type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Holiday' | 'Weekend' | 'Pending';

interface DailyLog {
    date: string; // YYYY-MM-DD
    inTime?: string;
    outTime?: string;
    status: AttendanceStatus;
    hours?: number;
}

export default function Attendance() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isPunchedIn, setIsPunchedIn] = useState(false);
    const [punchInTime, setPunchInTime] = useState<Date | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        present: 0,
        absent: 0,
        late: 0,
        holiday: 0
    });
    const [holidays, setHolidays] = useState<any[]>([]);
    const [joiningDate, setJoiningDate] = useState<Date | null>(null);
    const [attendanceHistory, setAttendanceHistory] = useState<DailyLog[]>([]);

    // Attendance Regularization State
    const [regularizationRequests, setRegularizationRequests] = useState<any[]>([]);
    const [regularizeDate, setRegularizeDate] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [attendancePolicy, setAttendancePolicy] = useState<any>(null);

    // Text field state representations for 12-hour format display and direct editing
    const [inInputText, setInInputText] = useState('09:00 AM');
    const [outInputText, setOutInputText] = useState('06:00 PM');

    const format24to12 = (timeStr: string) => {
        if (!timeStr) return '';
        const [hoursStr, minutesStr] = timeStr.split(':');
        const hours = parseInt(hoursStr, 10);
        if (isNaN(hours)) return timeStr;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${String(displayHours).padStart(2, '0')}:${minutesStr} ${ampm}`;
    };

    const parse12hTo24h = (str: string): string | null => {
        if (!str) return null;
        const cleaned = str.trim().toLowerCase();

        // Match 12h formats like "06:00 pm", "6:00pm", "9 am", "9:30am", "09 am"
        const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
        if (match) {
            let hours = parseInt(match[1], 10);
            const minutes = match[2] ? parseInt(match[2], 10) : 0;
            const period = match[3];

            if (hours >= 1 && hours <= 12 && minutes >= 0 && minutes < 60) {
                if (period === 'pm' && hours !== 12) {
                    hours += 12;
                } else if (period === 'am' && hours === 12) {
                    hours = 0;
                }
                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            }
        }
        return null;
    };

    // Reset inputs and fields when modal is closed or opened
    useEffect(() => {
        setReason('');
        setCustomReason('');
        setInInputText('09:00 AM');
        setOutInputText('06:00 PM');
    }, [regularizeDate]);


    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchStatusAndPolicy = async () => {
        try {
            const res = await api.get('/attendance/status');
            setIsPunchedIn(res.data.isPunchedIn);
            if (res.data.punchInTime) setPunchInTime(new Date(res.data.punchInTime));

            // Fetch joining date
            const empRes = await api.get('/employee/me');
            const jd = empRes.data.employeeProfile?.joiningDate || empRes.data.createdAt;
            if (jd) setJoiningDate(new Date(jd));

            // Fetch holidays
            const holidayRes = await api.get('/masters/holidays');
            setHolidays(holidayRes.data);

            // Fetch policy for regularization lookback days limit (defaults to 3)
            try {
                const policyRes = await api.get('/masters/attendance-policy');
                if (policyRes.data) {
                    setAttendancePolicy(policyRes.data);
                }
            } catch (e) {
                // Keep default lookback limit if masters endpoint doesn't exist yet
                setAttendancePolicy({ regularizationDays: 3 });
            }
        } catch (error) {
            console.error("Failed to fetch initial status:", error);
        }
    };

    useEffect(() => {
        fetchStatusAndPolicy();
    }, []);

    const fetchHistoryAndRequests = async () => {
        setLoading(true);
        try {
            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth() + 1;

            // Fetch history
            const historyRes = await api.get(`/attendance/history?year=${year}&month=${month}`);
            setAttendanceHistory(historyRes.data);

            // Fetch stats from backend
            const statsRes = await api.get(`/attendance/stats?year=${year}&month=${month}`);
            setStats({
                present: statsRes.data.present || 0,
                absent: statsRes.data.absent || 0,
                late: statsRes.data.late || 0,
                holiday: statsRes.data.holiday || 0
            });

            // Fetch regularization requests to show Pending approval status
            const reqRes = await api.get('/attendance/regularize/my-requests');
            setRegularizationRequests(Array.isArray(reqRes.data) ? reqRes.data : []);
        } catch (error) {
            console.error("Failed to fetch history or regularization requests:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistoryAndRequests();
    }, [selectedMonth, joiningDate]);

    const punchMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/attendance/punch');
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message);
            window.location.reload();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Error during punch toggle');
        }
    });

    const handlePunch = () => {
        punchMutation.mutate();
    };

    const submitRegularization = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!regularizeDate) return;

        const finalReason = reason === 'Other' ? customReason : reason;
        if (!finalReason.trim()) {
            toast.error('Please specify a reason');
            return;
        }

        const parsedIn = parse12hTo24h(inInputText);
        const parsedOut = parse12hTo24h(outInputText);

        if (!parsedIn) {
            toast.error('Please enter a valid Proposed In Time (e.g., 09:00 AM)');
            return;
        }
        if (!parsedOut) {
            toast.error('Please enter a valid Proposed Out Time (e.g., 06:00 PM)');
            return;
        }

        // Validate Lookback policy (strictly past 3 days and not future/today)
        const lookbackDays = attendancePolicy?.regularizationDays ?? 3;
        const [y, m, d] = regularizeDate.split('-').map(Number);
        const targetDate = new Date(y, m - 1, d);
        targetDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - targetDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 1) {
            toast.error('You can only regularize attendance for past dates.');
            return;
        }

        if (diffDays > lookbackDays) {
            toast.error(`You can only regularize attendance for the past ${lookbackDays} days.`);
            return;
        }

        setSubmittingRequest(true);
        try {
            // ISO Date strings for proposed times (completely timezone-safe parsing)
            const [inH, inM] = parsedIn.split(':').map(Number);
            const [outH, outM] = parsedOut.split(':').map(Number);
            const inTimeDate = new Date(y, m - 1, d, inH, inM, 0);
            const outTimeDate = new Date(y, m - 1, d, outH, outM, 0);
            const inTimeStr = inTimeDate.toISOString();
            const outTimeStr = outTimeDate.toISOString();

            await api.post('/attendance/regularize', {
                date: regularizeDate,
                reason: finalReason,
                inTime: inTimeStr,
                outTime: outTimeStr
            });

            toast.success('Regularization request submitted to your manager');
            setRegularizeDate(null);
            setReason('');
            setCustomReason('');
            // Refresh
            fetchHistoryAndRequests();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to submit regularization request');
        } finally {
            setSubmittingRequest(false);
        }
    };

    const getStatusColor = (status: AttendanceStatus) => {
        switch (status) {
            case 'Present': return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300';
            case 'Absent': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
            case 'Late': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300';
            case 'Holiday': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300';
            case 'Weekend': return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
            case 'Pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 animate-pulse font-semibold';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    // Calendar Generation Logic
    const generateCalendarDays = () => {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl"></div>);
        }

        const todayMidnight = new Date();
        todayMidnight.setHours(23, 59, 59, 999);

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const log = attendanceHistory.find(d => d.date === dateStr);
            const holiday = holidays.find(h => h.date.split('T')[0] === dateStr);

            const currentLoopDate = new Date(year, month, day);
            const isWeekend = currentLoopDate.getDay() === 0 || currentLoopDate.getDay() === 6;
            const isBeforeJoining = joiningDate && currentLoopDate < new Date(new Date(joiningDate).setHours(0, 0, 0, 0));

            // Precise future date checking (tomorrow or later)
            const isFuture = currentLoopDate > todayMidnight;

            // Default logic if no log exists
            let displayStatus: AttendanceStatus = log ? log.status : holiday ? 'Holiday' : isWeekend ? 'Weekend' : isBeforeJoining ? 'Weekend' : isFuture ? 'Weekend' : 'Absent';

            // Check for regularization status
            const request = regularizationRequests.find(r => r.date === dateStr);
            const hasPendingRequest = request && request.status === 'PENDING';
            const hasRejectedRequest = request && request.status === 'REJECTED';

            if (hasPendingRequest) {
                displayStatus = 'Pending';
            }

            const statusLabel = isBeforeJoining || isFuture ? '-' : (holiday ? 'Holiday' : displayStatus);
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            // Calculate if the day is older than the allowed 3 days
            const targetMidnight = new Date(currentLoopDate);
            targetMidnight.setHours(23, 59, 59, 999);
            const diffTime = todayMidnight.getTime() - targetMidnight.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            const isTooOld = diffDays > 3;

            days.push(
                <div key={day} className={`h-24 p-2 rounded-xl border ${isToday ? 'border-brand-500 ring-1 ring-brand-500' : 'border-gray-100 dark:border-white/10'} ${holiday ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200' : 'bg-white dark:bg-brand-800'} hover:shadow-md transition-shadow relative group cursor-pointer`}>
                    <div className="flex justify-between items-start">
                        <span className={`font-semibold text-sm ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>{day}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${holiday ? 'bg-purple-100 text-purple-700' : getStatusColor(isBeforeJoining || isFuture ? 'Weekend' : displayStatus)}`}>
                            {statusLabel}
                        </span>
                    </div>

                    {holiday && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-1 rounded truncate w-full block text-center mt-1 font-bold shadow-sm">
                            {holiday.name}
                        </span>
                    )}

                    {hasRejectedRequest && (
                        <div className="text-[9px] bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 px-1 py-0.5 rounded mt-1 truncate" title={`Rejected comment: ${request.approverComment || 'No comment'}`}>
                            Rejected: {request.approverComment || 'no reason'}
                        </div>
                    )}

                    {log && displayStatus !== 'Weekend' && log.inTime && (
                        <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <Clock size={10} /> {new Date(log.inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
                                <Clock size={10} /> {log.outTime ? new Date(log.outTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--'}
                            </div>
                        </div>
                    )}

                    {/* Add Regularize Button for Absent/Late/Missing Punch (strictly past 3 days and not future/today) */}
                    {!isToday && !isFuture && !isTooOld && !hasPendingRequest && !hasRejectedRequest && (displayStatus === 'Absent' || displayStatus === 'Late') && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setRegularizeDate(dateStr);
                            }}
                            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 text-[10px] bg-brand-50 text-brand-600 px-2 py-1 rounded border border-brand-200 hover:bg-brand-100 transition-all font-semibold"
                        >
                            Regularize
                        </button>
                    )}
                </div>
            );
        }

        return days;
    };

    // Find first missed/absent punch to feature in top alert (strictly past 3 days)
    const getFirstMissedPunch = () => {
        if (loading || attendanceHistory.length === 0) return null;

        // Find absent days in history that do not have regularization requests
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const missed = attendanceHistory.find(log => {
            if (log.status !== 'Absent') return false;
            const logDate = new Date(log.date);
            if (logDate >= today) return false;

            // Check if older than 3 days
            const diffTime = today.getTime() - logDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 3) return false;

            // Check requests
            const request = regularizationRequests.find(r => r.date === log.date);
            return !request;
        });

        return missed ? missed.date : null;
    };

    const missedPunchDate = getFirstMissedPunch();

    return (
        <div className="animate-fade-in-up pb-8 relative">
            <header className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">My Attendance</h2>
                <p className="text-gray-500 dark:text-gray-400">Track your daily punches and regularization requests.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

                {/* Punch Widget */}
                <div className="bg-white dark:bg-brand-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-center items-center text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-400 to-purple-500"></div>

                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-4">{currentTime.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <div className="text-5xl font-mono font-bold text-gray-800 dark:text-white mb-8 tracking-wider">
                        {currentTime.toLocaleTimeString('en-US', { hour12: true })}
                    </div>

                    {(() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isHolidayToday = holidays.some(h => {
                            const hDate = new Date(h.date);
                            hDate.setHours(0, 0, 0, 0);
                            return hDate.getTime() === today.getTime();
                        });

                        return (
                            <div className="relative group">
                                <div className={`absolute -inset-1 bg-gradient-to-r ${isHolidayToday ? 'from-purple-600 to-brand-600' : isPunchedIn ? 'from-red-600 to-orange-600' : 'from-green-600 to-emerald-600'} rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200`}></div>
                                <button
                                    onClick={handlePunch}
                                    disabled={isHolidayToday || punchMutation.isPending}
                                    className={`relative w-48 h-48 rounded-full border-4 flex flex-col items-center justify-center transition-all transform active:scale-95 shadow-xl disabled:opacity-80 disabled:cursor-not-allowed ${isHolidayToday
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10 text-purple-600'
                                        : isPunchedIn
                                            ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20'
                                            : 'border-green-500 bg-green-50 dark:bg-green-500/10 text-green-600 hover:bg-green-100 dark:hover:bg-green-500/20'
                                        }`}
                                >
                                    <div className="mb-2">
                                        {isHolidayToday ? <Calendar size={48} /> : isPunchedIn ? <Coffee size={48} /> : <MapPin size={48} />}
                                    </div>
                                    <span className="text-xl font-bold uppercase tracking-wider">
                                        {isHolidayToday ? 'Holiday' : isPunchedIn ? 'Punch Out' : 'Punch In'}
                                    </span>
                                    <span className="text-xs mt-1 font-medium opacity-70">
                                        {isHolidayToday ? 'Relax & Enjoy!' : isPunchedIn ? 'Enjoy your evening!' : 'Delhi Office (GPS)'}
                                    </span>
                                </button>
                            </div>
                        );
                    })()}

                    {isPunchedIn && punchInTime && (
                        <div className="mt-6 p-3 bg-brand-50 dark:bg-white/5 rounded-xl flex items-center gap-2 text-sm text-brand-700 dark:text-brand-300">
                            <Clock size={16} />
                            <span>In Time: <strong>{punchInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</strong></span>
                        </div>
                    )}
                </div>

                {/* Quick Stats */}
                <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                    <div className="bg-white dark:bg-brand-900 p-6 h-80 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4">
                            <CheckCircle />
                        </div>
                        <h4 className="text-2xl font-bold text-gray-800 dark:text-white">{stats.present}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mt-1">Present Days</p>
                    </div>
                    <div className="bg-white dark:bg-brand-900 p-6 h-80 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                        <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mb-4">
                            <AlertCircle />
                        </div>
                        <h4 className="text-2xl font-bold text-gray-800 dark:text-white">{stats.absent}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mt-1">Absents</p>
                    </div>
                    <div className="bg-white dark:bg-brand-900 p-6 h-80 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mb-4">
                            <Clock />
                        </div>
                        <h4 className="text-2xl font-bold text-gray-800 dark:text-white">{stats.late}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mt-1">Late Marks</p>
                    </div>
                    <div className="bg-white dark:bg-brand-900 p-6 h-80 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4">
                            <Coffee />
                        </div>
                        <h4 className="text-2xl font-bold text-gray-800 dark:text-white">
                            {holidays.filter(h => {
                                const hDate = new Date(h.date);
                                return hDate.getMonth() === selectedMonth.getMonth() &&
                                    hDate.getFullYear() === selectedMonth.getFullYear();
                            }).length}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mt-1">Holidays</p>
                    </div>

                    {/* Regularization Alert (Dynamic) */}
                    {missedPunchDate && (
                        <div className="col-span-2 lg:col-span-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-150 dark:border-orange-500/20 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-pulse">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="text-orange-600 dark:text-orange-400" size={20} />
                                <div>
                                    <h5 className="font-bold text-orange-800 dark:text-orange-200 text-sm">Action Needed: Missed Punch</h5>
                                    <p className="text-xs text-orange-600 dark:text-orange-300">You have a missed check-in on <strong>{new Date(missedPunchDate).toLocaleDateString([], { day: 'numeric', month: 'short' })}</strong>. Correct this now.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setRegularizeDate(missedPunchDate)}
                                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500/20 text-white dark:text-orange-200 text-xs font-bold rounded-lg shadow-sm transition-all hover:scale-105"
                            >
                                Fix Now
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Monthly Calendar View */}
            <div className="bg-white dark:bg-brand-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Calendar size={20} className="text-brand-500" /> Monthly Log
                    </h3>
                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-1 rounded-xl">
                        <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="font-bold w-32 text-center select-none">
                            {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-px mb-2 text-center">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-xs font-bold text-gray-400 uppercase py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 relative min-h-[400px]">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-brand-900/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                            <Loader2 className="animate-spin text-brand-500" size={40} />
                        </div>
                    )}
                    {generateCalendarDays()}
                </div>
            </div>

            {/* Attendance Regularization Modal */}
            {regularizeDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-brand-900 rounded-[2.5rem] p-8 max-w-md w-full border border-gray-100 dark:border-white/10 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Attendance Correction</h3>
                            <button onClick={() => setRegularizeDate(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={submitRegularization} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Requested Date</label>
                                <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl font-semibold text-sm">
                                    {(() => {
                                        const [y, m, d] = regularizeDate.split('-').map(Number);
                                        const localDate = new Date(y, m - 1, d);
                                        return localDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                    })()}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Reason for regularize</label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                    className="w-full p-3 bg-gray-50 dark:bg-brand-800 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm font-semibold text-gray-800 dark:text-white cursor-pointer"
                                >
                                    <option value="" disabled className="bg-white dark:bg-brand-800 text-gray-900 dark:text-white">Select a reason...</option>
                                    <option value="Forgot to Punch In" className="bg-white dark:bg-brand-800 text-gray-900 dark:text-white">Forgot to Punch In</option>
                                    <option value="Forgot to Punch Out" className="bg-white dark:bg-brand-800 text-gray-900 dark:text-white">Forgot to Punch Out</option>
                                    <option value="Device/Bio-metric Issue" className="bg-white dark:bg-brand-800 text-gray-900 dark:text-white">Device/Bio-metric Issue</option>
                                    <option value="Official Duty / Client Visit" className="bg-white dark:bg-brand-800 text-gray-900 dark:text-white">Official Duty / Client Visit</option>
                                    <option value="Other" className="bg-white dark:bg-brand-800 text-gray-900 dark:text-white">Other (Write Custom Reason)</option>
                                </select>
                            </div>

                            {reason === 'Other' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Specify Reason</label>
                                    <textarea
                                        value={customReason}
                                        onChange={(e) => setCustomReason(e.target.value)}
                                        required
                                        placeholder="Briefly describe your reason..."
                                        rows={3}
                                        className="w-full p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm font-semibold"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Proposed In Time</label>
                                    <div className="relative">
                                        <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={inInputText}
                                            onChange={(e) => setInInputText(e.target.value)}
                                            placeholder="09:00 AM"
                                            className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-white/5 border rounded-xl outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm font-semibold animate-none ${
                                                inInputText && !parse12hTo24h(inInputText)
                                                    ? 'border-rose-500/60 focus:ring-rose-500/30'
                                                    : 'border-gray-200 dark:border-white/10'
                                            }`}
                                        />
                                    </div>
                                    <p className={`text-[10px] mt-1 font-semibold ${
                                        inInputText && !parse12hTo24h(inInputText)
                                            ? 'text-rose-500'
                                            : 'text-gray-400 dark:text-gray-500'
                                    }`}>
                                        {inInputText && parse12hTo24h(inInputText)
                                            ? `✓ Set: ${format24to12(parse12hTo24h(inInputText)!)}`
                                            : 'Format: HH:MM AM/PM'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Proposed Out Time</label>
                                    <div className="relative">
                                        <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={outInputText}
                                            onChange={(e) => setOutInputText(e.target.value)}
                                            placeholder="06:00 PM"
                                            className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-white/5 border rounded-xl outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm font-semibold animate-none ${
                                                outInputText && !parse12hTo24h(outInputText)
                                                    ? 'border-rose-500/60 focus:ring-rose-500/30'
                                                    : 'border-gray-200 dark:border-white/10'
                                            }`}
                                        />
                                    </div>
                                    <p className={`text-[10px] mt-1 font-semibold ${
                                        outInputText && !parse12hTo24h(outInputText)
                                            ? 'text-rose-500'
                                            : 'text-gray-400 dark:text-gray-500'
                                    }`}>
                                        {outInputText && parse12hTo24h(outInputText)
                                            ? `✓ Set: ${format24to12(parse12hTo24h(outInputText)!)}`
                                            : 'Format: HH:MM AM/PM'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setRegularizeDate(null)}
                                    className="flex-1 py-3 px-6 bg-gray-150 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold rounded-2xl transition-all text-xs tracking-wider uppercase"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingRequest}
                                    className="flex-1 py-3 px-6 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-500/25 text-xs tracking-wider uppercase flex items-center justify-center gap-2"
                                >
                                    {submittingRequest ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
