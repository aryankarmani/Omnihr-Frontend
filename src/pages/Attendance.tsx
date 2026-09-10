import { useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { createPortal } from 'react-dom';

// Types for Attendance Data
type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Holiday' | 'Weekend' | 'Pending' | 'Leave' | 'Leave (Pending)';

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
    const [_punchInTime, setPunchInTime] = useState<Date | null>(null);
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
    const [leaveHistory, setLeaveHistory] = useState<any[]>([]);

    // Attendance Regularization State
    const [regularizationRequests, setRegularizationRequests] = useState<any[]>([]);
    const [regularizeDate, setRegularizeDate] = useState<string | null>(null);
    const [rejectedRequestToShow, setRejectedRequestToShow] = useState<any | null>(null);
    const [rejectedLeaveToShow, setRejectedLeaveToShow] = useState<any | null>(null);
    const [reason, setReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [attendancePolicy, setAttendancePolicy] = useState<any>(null);

    // Text field state representations for 12-hour format display and direct editing
    const [inInputText, setInInputText] = useState('09:00 AM');
    const [outInputText, setOutInputText] = useState('06:00 PM');

    const formatTime12h = (timeStr?: string) => {
        if (!timeStr) return '--:--';
        try {
            const date = new Date(timeStr);
            if (isNaN(date.getTime())) return timeStr;
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch (e) {
            return timeStr;
        }
    };

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


            const empRes = await api.get('/employee/me');
            const jd = empRes.data.employeeProfile?.joiningDate || empRes.data.createdAt;
            if (jd) {
                const datePart = jd.split('T')[0];
                const [year, month, day] = datePart.split('-').map(Number);
                setJoiningDate(new Date(year, month - 1, day));
            }

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

            // Fetch leave history to show leaves on the calendar
            try {
                const leaveRes = await api.get('/leave/history');
                setLeaveHistory(Array.isArray(leaveRes.data) ? leaveRes.data : []);
            } catch (leaveErr) {
                console.error("Failed to fetch leave history in Attendance:", leaveErr);
            }
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
            fetchStatusAndPolicy();
            fetchHistoryAndRequests();
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
            days.push(<div key={`empty-${i}`} className="aspect-square bg-transparent rounded-[6px]"></div>);
        }

        const todayMidnight = new Date();
        todayMidnight.setHours(23, 59, 59, 999);

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const log = attendanceHistory.find(d => d.date === dateStr);
            const holiday = holidays.find(h => h.date.split('T')[0] === dateStr);

            const currentLoopDate = new Date(year, month, day);
            const isBeforeJoining = joiningDate && currentLoopDate < joiningDate;

            // Find matching leave (APPROVED or PENDING)
            const leave = leaveHistory.find(l => {
                const start = l.startDate.split('T')[0];
                const end = l.endDate.split('T')[0];
                return dateStr >= start && dateStr <= end;
            });

            // Check for regularization status
            const request = regularizationRequests.find(r => r.date === dateStr);
            const hasPendingRequest = request && request.status === 'PENDING';
            const hasRejectedRequest = request && request.status === 'REJECTED';



            // Color rules matching Reference Image 2 100%:
            // Present: soft green tile #E4F5EC, green Mono day number #1F8A5A
            // Absent: soft red tile #FBE7E7, red Mono day number #C13A3A
            // Approved Leave: soft blue tile #E8ECFC, blue Mono day number #2C4FD6
            // Weekend / Off / No data: transparent/white cell, gray Mono day number #9AA3B1
            let containerBg = 'bg-transparent';
            let textColor = 'text-[#9AA3B1]';

            if (holiday) {
                containerBg = 'bg-purple-50 dark:bg-purple-900/20';
                textColor = 'text-purple-700';
            } else if (!isBeforeJoining && log && (log.status === 'Present' || log.status === 'Late' || log.status === 'Half Day')) {
                containerBg = 'bg-[#E4F5EC] dark:bg-green-950/30';
                textColor = 'text-[#1F8A5A] dark:text-green-400';
            } else if (!isBeforeJoining && log && log.status === 'Absent') {
                containerBg = 'bg-[#FBE7E7] dark:bg-red-950/30';
                textColor = 'text-[#C13A3A] dark:text-red-400';
            } else if (!isBeforeJoining && leave && leave.status === 'APPROVED') {
                containerBg = 'bg-[#E8ECFC] dark:bg-blue-950/30';
                textColor = 'text-[#2C4FD6] dark:text-blue-400';
            } else if (!isBeforeJoining && hasPendingRequest) {
                containerBg = 'bg-amber-50/50 dark:bg-amber-950/20';
                textColor = 'text-amber-700';
            }

            days.push(
                <div
                    key={day}
                    onClick={() => {
                        if (hasRejectedRequest) {
                            setRejectedRequestToShow(request);
                        } else if (leave && leave.status === 'REJECTED') {
                            setRejectedLeaveToShow(leave);
                        }
                    }}
                    className={`cal-day present aspect-square rounded-[6px] ${containerBg} flex items-center justify-center text-center transition-all relative group cursor-pointer`}
                >
                    <span className={`font-mono font-bold text-[12.5px] ${textColor}`}>{day}</span>
                </div>
            );
        }

        return days;
    };

    return (
        <div className="animate-fade-in-up pb-8 relative">
            <header className="mb-6">
                <h2 className="text-2xl font-bold text-[#12151C] dark:text-white mb-1">My Attendance</h2>
                <p className="page-sub text-[14px] text-[#5B6472] dark:text-gray-400 mb-[26px]">Track your daily punches and regularization requests.</p>
            </header>

            {/* Top Grid: Punch Card + 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(4,1fr)] gap-3 sm:gap-4 mb-6">
                {/* Card 1: Punch Widget */}
                <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6 text-center shadow-sm flex flex-col justify-between items-center h-[340px]">
                    <p className="text-[13px] text-[#5B6472] dark:text-gray-400 mb-[6px]">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    <div className="clock-time text-[40px] text-[#12151C] dark:text-white font-mono font-bold leading-tight mb-[22px] flex flex-col items-center">
                        <div>
                            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </div>
                        <div className="text-[32px] font-mono leading-none mt-1">
                            {currentTime.getHours() >= 12 ? 'PM' : 'AM'}
                        </div>
                    </div>

                    <button
                        onClick={handlePunch}
                        disabled={punchMutation.isPending}
                        className={`w-36 h-36 rounded-full border-2 flex flex-col items-center justify-center transition-all transform active:scale-95 shadow-sm ${
                            isPunchedIn
                                ? 'border-[#C13A3A] bg-[#FBE7E7] text-[#C13A3A]'
                                : 'border-[#1F8A5A] bg-[#E4F5EC] text-[#1F8A5A]'
                        }`}
                    >
                        <MapPin size={22} className="mb-1.5" />
                        <span className="lbl text-[13px] font-extrabold uppercase tracking-wider leading-none">
                            {isPunchedIn ? 'PUNCH OUT' : 'PUNCH IN'}
                        </span>
                        <span className="loc text-[10.5px] text-[#5B6472] dark:text-gray-400">
                            Delhi Office (GPS)
                        </span>
                    </button>
                </div>

                {/* Card 2: Present Days */}
                <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 px-[18px] py-[16px] shadow-sm flex flex-col justify-start h-[340px]">
                    <div className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-[#F7F8FA] dark:bg-gray-800 flex items-center justify-center text-[#5B6472] dark:text-gray-300 mb-4">
                        <CheckCircle size={16} />
                    </div>
                    <div>
                        <div className="num text-[26px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight leading-none">{stats.present}</div>
                        <p className="text-[12px] text-[#9AA3B1] mt-[2px]">Present Days</p>
                    </div>
                </div>

                {/* Card 3: Absents */}
                <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 px-[18px] py-[16px] shadow-sm flex flex-col justify-start h-[340px]">
                    <div className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-[#F7F8FA] dark:bg-gray-800 flex items-center justify-center text-[#5B6472] dark:text-gray-300 mb-4">
                        <AlertCircle size={16} />
                    </div>
                    <div>
                        <div className="num text-[26px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight leading-none">{stats.absent}</div>
                        <p className="text-[12px] text-[#9AA3B1] mt-[2px]">Absents</p>
                    </div>
                </div>

                {/* Card 4: Late Marks */}
                <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 px-[18px] py-[16px] shadow-sm flex flex-col justify-start h-[340px]">
                    <div className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-[#F7F8FA] dark:bg-gray-800 flex items-center justify-center text-[#5B6472] dark:text-gray-300 mb-4">
                        <Clock size={16} />
                    </div>
                    <div>
                        <div className="num text-[26px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight leading-none">{stats.late}</div>
                        <p className="text-[12px] text-[#9AA3B1] mt-[2px]">Late Marks</p>
                    </div>
                </div>

                {/* Card 5: Holidays */}
                <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 px-[18px] py-[16px] shadow-sm flex flex-col justify-start h-[340px]">
                    <div className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-[#F7F8FA] dark:bg-gray-800 flex items-center justify-center text-[#5B6472] dark:text-gray-300 mb-4">
                        <Calendar size={16} />
                    </div>
                    <div>
                        <div className="num text-[26px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight leading-none">
                            {holidays.filter(h => {
                                const hDate = new Date(h.date);
                                return hDate.getMonth() === selectedMonth.getMonth() &&
                                    hDate.getFullYear() === selectedMonth.getFullYear();
                            }).length}
                        </div>
                        <p className="text-[12px] text-[#9AA3B1] mt-[2px]">Holidays</p>
                    </div>
                </div>
            </div>

            {/* Monthly Calendar View */}
            <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6 shadow-sm mb-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="flex items-center gap-[9px] text-[14.5px] font-semibold text-[#12151C] dark:text-white">
                        <Calendar size={16} className="text-[#9AA3B1]" /> Monthly Log
                    </h3>
                    <div className="flex items-center gap-[14px] text-[13.5px] font-semibold text-[#5B6472] dark:text-gray-300">
                        <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))} className="p-1 text-[#5B6472] hover:bg-[#EEF1F5] rounded-[6px] transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="font-semibold text-[13.5px] text-[#12151C] dark:text-white font-mono-numbers select-none">
                            {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))} className="p-1 text-[#5B6472] hover:bg-[#EEF1F5] rounded-[6px] transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 sm:gap-3 md:gap-4 mb-4 text-center">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                        <div key={day} className="text-center text-[10.5px] font-semibold text-[#9AA3B1] uppercase tracking-[.05em] pb-[6px] truncate">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-3 md:gap-4 relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-[6px]">
                            <Loader2 className="animate-spin text-[#2C4FD6]" size={32} />
                        </div>
                    )}
                    {generateCalendarDays()}
                </div>

                {/* Bottom Legend Footer */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-6 pt-4 border-t border-[#E2E6ED] dark:border-gray-800 text-xs  text-[#5B6472] dark:text-gray-300">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#1F8A5A]"></span> Present
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#C13A3A]"></span> Absent
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#2C4FD6]"></span> Approved leave
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#9AA3B1]"></span> Weekend / no data
                    </div>
                </div>
            </div>

            {/* Attendance Regularization Modal */}
            {regularizeDate && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-brand-900 rounded-[6px] p-5 sm:p-8 max-w-md w-full border border-gray-100 dark:border-white/10 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Attendance Correction</h3>
                            <button type="button" onClick={() => setRegularizeDate(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-[6px] transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={submitRegularization} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Requested Date</label>
                                <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[6px] font-semibold text-sm">
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
                                    className="w-full p-3 bg-gray-50 dark:bg-brand-800 border border-gray-200 dark:border-white/10 rounded-[6px] outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm font-semibold text-gray-800 dark:text-white cursor-pointer"
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
                                        className="w-full p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[6px] outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm font-semibold"
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
                                            className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-white/5 border rounded-[6px] outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm font-semibold animate-none ${inInputText && !parse12hTo24h(inInputText)
                                                ? 'border-rose-500/60 focus:ring-rose-500/30'
                                                : 'border-gray-200 dark:border-white/10'
                                                }`}
                                        />
                                    </div>
                                    <p className={`text-[10px] mt-1 font-semibold ${inInputText && !parse12hTo24h(inInputText)
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
                                            className={`w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-white/5 border rounded-[6px] outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm font-semibold animate-none ${outInputText && !parse12hTo24h(outInputText)
                                                ? 'border-rose-500/60 focus:ring-rose-500/30'
                                                : 'border-gray-200 dark:border-white/10'
                                                }`}
                                        />
                                    </div>
                                    <p className={`text-[10px] mt-1 font-semibold ${outInputText && !parse12hTo24h(outInputText)
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
                                    className="flex-1 py-3 px-6 bg-gray-150 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold rounded-[6px] transition-all text-xs tracking-wider uppercase"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingRequest}
                                    className="flex-1 py-3 px-6 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-[6px] transition-all shadow-lg shadow-brand-500/25 text-xs tracking-wider uppercase flex items-center justify-center gap-2"
                                >
                                    {submittingRequest ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Rejected Request Detail Modal */}
            {rejectedRequestToShow && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-brand-900 rounded-[6px] p-8 max-w-md w-full border border-gray-100 dark:border-white/10 shadow-2xl animate-scale-in relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 to-orange-500"></div>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <span className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-[6px]">
                                    <AlertCircle size={20} />
                                </span>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Correction Rejected</h3>
                            </div>
                            <button type="button" onClick={() => setRejectedRequestToShow(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-[6px] transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 font-sans">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Date Requested</label>
                                <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[6px] font-bold text-sm text-gray-700 dark:text-gray-200">
                                    {(() => {
                                        const [y, m, d] = rejectedRequestToShow.date.split('-').map(Number);
                                        const localDate = new Date(y, m - 1, d);
                                        return localDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                    })()}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Proposed In Time</label>
                                    <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[6px] text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                        <Clock size={14} /> {formatTime12h(rejectedRequestToShow.proposedIn || rejectedRequestToShow.inTime)}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Proposed Out Time</label>
                                    <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[6px] text-sm font-semibold text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                                        <Clock size={14} /> {formatTime12h(rejectedRequestToShow.proposedOut || rejectedRequestToShow.outTime)}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Your Reason</label>
                                <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[6px] text-sm text-gray-600 dark:text-gray-300 italic font-semibold leading-relaxed">
                                    <div className="max-h-[120px] overflow-y-auto custom-scrollbar break-words pr-2">
                                        "{rejectedRequestToShow.reason}"
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-xs font-bold text-rose-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    Manager's Rejection Reason
                                </label>
                                <div className="p-4 bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 rounded-[6px] text-sm text-rose-700 dark:text-rose-300 font-bold leading-relaxed shadow-sm">
                                    <div className="max-h-[120px] overflow-y-auto custom-scrollbar break-words pr-2">
                                        {rejectedRequestToShow.approverComment || 'No comment provided.'}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="button"
                                    onClick={() => setRejectedRequestToShow(null)}
                                    className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold rounded-[6px] transition-all shadow-lg shadow-rose-500/20 text-sm tracking-wider uppercase cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {rejectedLeaveToShow && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-brand-900 rounded-[6px] p-8 max-w-md w-full border border-gray-100 dark:border-white/10 shadow-2xl animate-scale-in relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 to-orange-500"></div>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <span className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-[6px]">
                                    <AlertCircle size={20} />
                                </span>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Leave Rejected</h3>
                            </div>
                            <button type="button" onClick={() => setRejectedLeaveToShow(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-[6px] transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 font-sans">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Leave Type</label>
                                    <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[6px] font-bold text-sm text-gray-700 dark:text-gray-200">
                                        {rejectedLeaveToShow.leaveType?.name || rejectedLeaveToShow.leaveType?.code || 'Leave'}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Dates</label>
                                    <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[6px] font-bold text-xs text-gray-700 dark:text-gray-200 leading-tight">
                                        {new Date(rejectedLeaveToShow.startDate).toLocaleDateString()} - {new Date(rejectedLeaveToShow.endDate).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Your Reason</label>
                                <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[6px] text-sm text-gray-600 dark:text-gray-300 italic font-semibold leading-relaxed">
                                    <div className="max-h-[120px] overflow-y-auto custom-scrollbar break-words pr-2">
                                        "{rejectedLeaveToShow.reason}"
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-xs font-bold text-rose-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    Manager's Rejection Reason
                                </label>
                                <div className="p-4 bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 rounded-[6px] text-sm text-rose-700 dark:text-rose-300 font-bold leading-relaxed shadow-sm">
                                    <div className="max-h-[120px] overflow-y-auto custom-scrollbar break-words pr-2">
                                        {rejectedLeaveToShow.rejectionReason || 'No comment provided.'}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="button"
                                    onClick={() => setRejectedLeaveToShow(null)}
                                    className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold rounded-[6px] transition-all shadow-lg shadow-rose-500/20 text-sm tracking-wider uppercase cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
