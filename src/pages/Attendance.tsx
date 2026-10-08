import { useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Loader2, X, Coffee, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { createPortal } from 'react-dom';
import { AttendanceSkeleton } from '../components/common/SkeletonLoaders';
import { useAuth } from '../context/AuthContext';

// Types for Attendance Data
type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Holiday' | 'Weekend' | 'Pending' | 'Leave' | 'Leave (Pending)';

interface DailyLog {
    date: string; // YYYY-MM-DD
    inTime?: string;
    outTime?: string;
    status: AttendanceStatus;
    hours?: number;
    totalHours?: number;
    grossHours?: number;
    netHours?: number;
    totalBreakMinutes?: number;
    breaks?: any[];
}

export default function Attendance() {
    const { user, hasPermission } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isPunchedIn, setIsPunchedIn] = useState(false);
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [activeBreak, setActiveBreak] = useState<{ id: number; startTime: string } | null>(null);
    const [totalBreakMinutes, setTotalBreakMinutes] = useState(0);
    const [todayBreaks, setTodayBreaks] = useState<any[]>([]);
    const [canPunchIn, setCanPunchIn] = useState(true);
    const [punchInMessage, setPunchInMessage] = useState<string | null>(null);
    const [punchInTime, setPunchInTime] = useState<Date | null>(null);
    const [punchOutTime, setPunchOutTime] = useState<Date | null>(null);
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
    const [regularizeErrors, setRegularizeErrors] = useState<{ reason?: string; customReason?: string }>({});
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [attendancePolicy, setAttendancePolicy] = useState<any>(null);
    const [currentShift, setCurrentShift] = useState<{
        id?: string;
        name: string;
        startTime: string;
        endTime: string;
        breakDuration: number;
        graceTime: number;
        isNightShift: boolean;
    } | null>(null);

    // Text field state representations for 12-hour format display and direct editing
    const [inInputText, setInInputText] = useState('09:00 AM');
    const [outInputText, setOutInputText] = useState('06:00 PM');
    const [breakInputText, setBreakInputText] = useState('01:00 PM');

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
        setRegularizeErrors({});
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
            setIsOnBreak(Boolean(res.data.isOnBreak));
            setActiveBreak(res.data.activeBreak || null);
            setTotalBreakMinutes(res.data.totalBreakMinutes || 0);
            setTodayBreaks(res.data.breaks || []);
            if (res.data.canPunchIn !== undefined) setCanPunchIn(res.data.canPunchIn);
            if (res.data.punchInMessage !== undefined) setPunchInMessage(res.data.punchInMessage);
            if (res.data.punchInTime) setPunchInTime(new Date(res.data.punchInTime));
            else setPunchInTime(null);
            if (res.data.punchOutTime) setPunchOutTime(new Date(res.data.punchOutTime));
            else setPunchOutTime(null);
            if (res.data.shift) setCurrentShift(res.data.shift);


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

        const onPunchUpdated = () => {
            fetchStatusAndPolicy();
            fetchHistoryAndRequests();
        };
        window.addEventListener('punch-updated', onPunchUpdated);
        return () => window.removeEventListener('punch-updated', onPunchUpdated);
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
            if (data.shift) setCurrentShift(data.shift);
            fetchStatusAndPolicy();
            fetchHistoryAndRequests();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Error during punch toggle', { id: 'punch-status-error' });
        }
    });

    const breakInMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/attendance/break/in');
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Break started');
            fetchStatusAndPolicy();
            fetchHistoryAndRequests();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to start break');
        }
    });

    const breakOutMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/attendance/break/out');
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Break ended');
            fetchStatusAndPolicy();
            fetchHistoryAndRequests();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to end break');
        }
    });

    const todayDateStrForPunch = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')}`;
    const todayLogForPunch = attendanceHistory.find(d => d.date === todayDateStrForPunch);
    const isAlreadyPunchedOut = !isPunchedIn && Boolean(punchOutTime || todayLogForPunch?.outTime);

    const handlePunch = () => {
        if (punchMutation.isPending) return;
        if (isAlreadyPunchedOut) {
            toast.error('You have already completed your punch out for today.', { id: 'punch-status-error' });
            return;
        }
        if (!isPunchedIn && canPunchIn === false) {
            toast.error(punchInMessage || `Punch-in is only allowed 1 hour before your shift starts (${currentShift?.startTime || ''}).`, { id: 'punch-status-error' });
            return;
        }
        punchMutation.mutate();
    };

    const submitRegularization = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submittingRequest) return;
        if (!regularizeDate) return;

        const newErrors: { reason?: string; customReason?: string } = {};
        if (!reason) {
            newErrors.reason = 'Please select a reason for correction';
        } else if (reason === 'Other' && !customReason.trim()) {
            newErrors.customReason = 'Please specify your reason';
        }

        if (Object.keys(newErrors).length > 0) {
            setRegularizeErrors(newErrors);
            return;
        }
        setRegularizeErrors({});

        const finalReason = reason === 'Other' ? customReason.trim() : reason;
        const isBreakCorrection = reason === 'Break In Correction' || reason === 'Break Out Correction';

        const [y, m, d] = regularizeDate.split('-').map(Number);
        const targetDate = new Date(y, m - 1, d);
        targetDate.setHours(0, 0, 0, 0);

        let parsedIn: string | null = null;
        let parsedOut: string | null = null;
        let parsedBreak: string | null = null;

        if (isBreakCorrection) {
            parsedBreak = parse12hTo24h(breakInputText);
            if (!parsedBreak) {
                toast.error('Please enter a valid Break Time (e.g., 01:00 PM)');
                return;
            }
        } else {
            parsedIn = parse12hTo24h(inInputText);
            parsedOut = parse12hTo24h(outInputText);

            if (!parsedIn) {
                toast.error('Please enter a valid Proposed In Time (e.g., 09:00 AM)');
                return;
            }
            if (!parsedOut) {
                toast.error('Please enter a valid Proposed Out Time (e.g., 06:00 PM)');
                return;
            }
        }

        // Validate Lookback policy (strictly past 3 days and not future/today)
        const lookbackDays = attendancePolicy?.regularizationDays ?? 3;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - targetDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // Check if date is a weekend (Saturday / Sunday)
        const dayOfWeek = targetDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            toast.error('Cannot apply for correction on weekends (Saturday / Sunday)');
            return;
        }

        if (diffDays < 0) {
            toast.error('Cannot apply for correction on future dates.');
            return;
        }

        if (diffDays > lookbackDays) {
            toast.error(`You can only correct attendance for the past ${lookbackDays} days.`);
            return;
        }

        setSubmittingRequest(true);
        try {
            if (isBreakCorrection && parsedBreak) {
                const [bH, bM] = parsedBreak.split(':').map(Number);
                const breakTimeDate = new Date(y, m - 1, d, bH, bM, 0);
                const breakTimeStr = breakTimeDate.toISOString();

                await api.post('/attendance/regularize', {
                    date: regularizeDate,
                    reason: finalReason,
                    correctionType: reason === 'Break In Correction' ? 'BREAK_IN' : 'BREAK_OUT',
                    proposedBreakStart: reason === 'Break In Correction' ? breakTimeStr : undefined,
                    proposedBreakEnd: reason === 'Break Out Correction' ? breakTimeStr : undefined,
                    breakTime: breakTimeStr,
                });
            } else if (parsedIn && parsedOut) {
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
                    outTime: outTimeStr,
                    proposedIn: inTimeStr,
                    proposedOut: outTimeStr
                });
            }

            toast.success('Correction request submitted to your manager');
            setRegularizeDate(null);
            setReason('');
            setCustomReason('');
            // Refresh
            fetchHistoryAndRequests();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to submit correction request');
        } finally {
            setSubmittingRequest(false);
        }
    };

    const handleOpenRegularize = (dateStr: string, log?: DailyLog) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const targetDate = new Date(y, m - 1, d);
        if (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
            toast.error('Cannot apply for correction on weekends (Saturday / Sunday)');
            return;
        }
        setRegularizeDate(dateStr);
        setReason('');
        setCustomReason('');
        if (log?.inTime) {
            setInInputText(formatTime12h(log.inTime));
        } else if (currentShift?.startTime) {
            setInInputText(format24to12(currentShift.startTime));
        } else {
            setInInputText('09:00 AM');
        }
        if (log?.outTime) {
            setOutInputText(formatTime12h(log.outTime));
        } else if (currentShift?.endTime) {
            setOutInputText(format24to12(currentShift.endTime));
        } else {
            setOutInputText('06:00 PM');
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
        todayMidnight.setHours(0, 0, 0, 0);

        // Days of current month
        const nowTime = new Date();
        const todayDateStr = `${nowTime.getFullYear()}-${String(nowTime.getMonth() + 1).padStart(2, '0')}-${String(nowTime.getDate()).padStart(2, '0')}`;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const log = attendanceHistory.find(d => d.date === dateStr);
            const holiday = holidays.find(h => h.date.split('T')[0] === dateStr);
            const isToday = dateStr === todayDateStr;

            // Resolve all break sessions for this day (prioritize live today breaks if viewing today)
            let dayBreaks: any[] = (log?.breaks && Array.isArray(log.breaks) && log.breaks.length > 0) ? [...log.breaks] : [];
            if (isToday) {
                if (todayBreaks && todayBreaks.length > 0) {
                    dayBreaks = todayBreaks;
                } else if (activeBreak && dayBreaks.length === 0) {
                    dayBreaks = [{ startTime: activeBreak.startTime }];
                }
            }
            const activeBreakSession = dayBreaks.find((b: any) => !b.endTime);
            const primaryBreak = activeBreakSession || (dayBreaks.length > 0 ? dayBreaks[0] : null);

            const currentLoopDate = new Date(year, month, day);
            const isBeforeJoining = !log && joiningDate && currentLoopDate < joiningDate;

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

            const targetDate = new Date(year, month, day);
            targetDate.setHours(0, 0, 0, 0);
            const isWeekend = targetDate.getDay() === 0 || targetDate.getDay() === 6;
            const diffDays = Math.round((todayMidnight.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
            const lookbackDays = attendancePolicy?.regularizationDays ?? 3;

            const isTargetDayEligible = diffDays > 0 ? (diffDays <= lookbackDays) : (diffDays === 0 && Boolean(log?.inTime));
            const isPastDay = targetDate < todayMidnight;
            const isApprovedLeave = !isBeforeJoining && leave && leave.status === 'APPROVED';

            // Only need regularization if there is an actual issue:
            // - Absent or no log on a past working day
            // - Marked Late
            // - Marked Half Day
            // - Missed punch (punched in but missing punch out)
            const isCleanPresent = log && log.status === 'Present' && log.inTime && log.outTime;
            const needsRegularization = !isCleanPresent;

            // Allow correction on holidays if the employee actually worked / punched on the holiday
            const isHolidayEligible = holiday ? Boolean(log?.inTime && needsRegularization) : true;

            const isEligibleForRegularize = isTargetDayEligible &&
                !isWeekend &&
                !isBeforeJoining &&
                isHolidayEligible &&
                !isApprovedLeave &&
                !hasPendingRequest &&
                needsRegularization;

            // Past working day without punch, holiday, or approved leave is Absent
            const isAbsent = !isBeforeJoining && isPastDay && !isWeekend && !holiday && !isApprovedLeave && (!log || log.status === 'Absent');

            // Check if day has any activity
            const hasActivity = log || holiday || isApprovedLeave || hasPendingRequest || hasRejectedRequest || isEligibleForRegularize || isAbsent;

            // Empty day with no data - upcoming weekdays without status get light gray styling, weekends stay clean
            if (!hasActivity) {
                const isUpcomingWeekday = !isPastDay && !isWeekend;

                days.push(
                    <div
                        key={day}
                        className={`cal-day aspect-square rounded-[6px] ${
                            isUpcomingWeekday
                                ? 'bg-[#F7F8FA] dark:bg-white/5 dark:border-gray-800'
                                : 'bg-transparent'
                        } flex items-center justify-center text-center transition-all`}
                    >
                        <span className={`font-mono font-bold text-[12.5px] ${
                            isUpcomingWeekday ? 'text-[#5B6472] dark:text-gray-300' : 'text-[#9AA3B1]'
                        }`}>{day}</span>
                    </div>
                );
                continue;
            }

            // Color rules matching employee calendar design
            let containerBg = 'bg-transparent';
            let textColor = 'text-[#9AA3B1]';

            if (holiday) {
                containerBg = 'bg-purple-50 dark:bg-purple-900/20';
                textColor = 'text-purple-700';
            } else if (log && (log.status === 'Present' || log.status === 'Late' || log.status === 'Half Day')) {
                containerBg = 'bg-[#E4F5EC] dark:bg-green-950/30';
                textColor = 'text-[#1F8A5A] dark:text-green-400';
            } else if (isApprovedLeave) {
                containerBg = 'bg-[#E8ECFC] dark:bg-blue-950/30';
                textColor = 'text-[#2C4FD6] dark:text-blue-400';
            } else if (!isBeforeJoining && hasPendingRequest) {
                containerBg = 'bg-amber-50/50 dark:bg-amber-950/20';
                textColor = 'text-amber-700';
            } else if (isAbsent) {
                // True absent day (past working day with no punch and no approved leave)
                containerBg = 'bg-[#FBE7E7] dark:bg-red-950/30';
                textColor = 'text-[#C13A3A] dark:text-red-400';
            }

            days.push(
                <div
                    key={day}
                    onClick={() => {
                        if (hasRejectedRequest) {
                            setRejectedRequestToShow(request);
                        } else if (leave && leave.status === 'REJECTED') {
                            setRejectedLeaveToShow(leave);
                        } else if (isEligibleForRegularize) {
                            handleOpenRegularize(dateStr, log);
                        }
                    }}
                    className={`cal-day min-h-[110px] aspect-square rounded-[6px] ${containerBg} p-1.5 sm:p-2 flex flex-col justify-between transition-all relative cursor-pointer hover:opacity-95`}
                >
                    {/* Top row: Day number and status badge */}
                    <div className="flex items-start justify-between h-5 sm:h-6 shrink-0">
                        <span className={`font-mono font-bold text-[12.5px] sm:text-[13.5px] leading-none pt-0.5 ${textColor}`}>
                            {day}
                        </span>
                        <div className="flex items-start">
                            {hasPendingRequest ? (
                                <span className="px-1.5 py-0.5 rounded-[3px] text-[8.5px] sm:text-[9.5px] font-medium bg-amber-100 text-amber-800 border border-amber-200 leading-none inline-block">
                                    Pending
                                </span>
                            ) : hasRejectedRequest ? (
                                <span className="px-1.5 py-0.5 rounded-[3px] text-[8.5px] sm:text-[9.5px] font-medium bg-[#FBE7E7] text-[#C13A3A] border border-red-200 leading-none inline-block">
                                    Rejected
                                </span>
                            ) : holiday ? (
                                <span className="px-1.5 py-0.5 rounded-[3px] text-[8.5px] sm:text-[9.5px] font-medium bg-purple-100 text-purple-700 border border-purple-200 leading-none inline-block">
                                    Holiday
                                </span>
                            ) : isApprovedLeave ? (
                                <span className="px-1.5 py-0.5 rounded-[3px] text-[8.5px] sm:text-[9.5px] font-medium bg-blue-100 text-blue-700 border border-blue-200 leading-none inline-block">
                                    Leave
                                </span>
                            ) : isAbsent ? (
                                <span className="px-1.5 py-0.5 rounded-[3px] text-[8.5px] sm:text-[9.5px] font-medium bg-[#FBE7E7] text-[#C13A3A] border border-red-200 leading-none inline-block">
                                    Absent
                                </span>
                            ) : null}
                        </div>
                    </div>

                    {/* Middle row: Punch In, Punch Out, Break In, Break Out times */}
                    <div className="space-y-0.5 text-left flex-1 flex flex-col justify-center my-0.5 overflow-hidden">
                        {holiday && !log?.inTime ? (
                            <div className="text-[10px] sm:text-[11.5px] font-semibold text-purple-700 dark:text-purple-300 leading-snug line-clamp-2" title={holiday.name}>
                                {holiday.name}
                            </div>
                        ) : null}

                        {/* Punch In */}
                        {log?.inTime ? (
                            <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold text-emerald-700 dark:text-emerald-400 font-mono-numbers leading-tight truncate" title={`Punch In: ${formatTime12h(log.inTime)}`}>
                                <span className="text-[8.5px] sm:text-[9px] font-extrabold text-emerald-800 bg-emerald-200/80 dark:bg-emerald-950/80 dark:text-emerald-300 px-1 py-0.5 rounded shrink-0 leading-none">IN</span>
                                <span className="truncate">{formatTime12h(log.inTime).toLowerCase()}</span>
                            </div>
                        ) : null}

                        {/* Punch Out */}
                        {log?.outTime ? (
                            <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold text-rose-700 dark:text-rose-400 font-mono-numbers leading-tight truncate" title={`Punch Out: ${formatTime12h(log.outTime)}`}>
                                <span className="text-[8.5px] sm:text-[9px] font-extrabold text-rose-800 bg-rose-200/80 dark:bg-rose-950/80 dark:text-rose-300 px-1 py-0.5 rounded shrink-0 leading-none">OUT</span>
                                <span className="truncate">{formatTime12h(log.outTime).toLowerCase()}</span>
                            </div>
                        ) : log?.inTime ? (
                            <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold text-rose-700 dark:text-rose-400 font-mono-numbers leading-tight truncate" title="Punch Out Pending">
                                <span className="text-[8.5px] sm:text-[9px] font-extrabold text-rose-800 bg-rose-200/80 dark:bg-rose-950/80 dark:text-rose-300 px-1 py-0.5 rounded shrink-0 leading-none">OUT</span>
                                <span className="font-mono">--:--</span>
                            </div>
                        ) : null}

                        {/* Break In & Break Out Timings */}
                        {dayBreaks.length > 0 && primaryBreak?.startTime ? (
                            <>
                                <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold text-amber-700 dark:text-amber-400 font-mono-numbers leading-tight truncate" title={`Break In: ${formatTime12h(primaryBreak.startTime)}`}>
                                    <span className="text-[8.5px] sm:text-[9px] font-extrabold text-amber-800 bg-amber-200/80 dark:bg-amber-950/80 dark:text-amber-300 px-1 py-0.5 rounded shrink-0 leading-none">B-IN</span>
                                    <span className="truncate">{formatTime12h(primaryBreak.startTime).toLowerCase()}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold text-amber-700 dark:text-amber-400 font-mono-numbers leading-tight truncate" title={primaryBreak.endTime ? `Break Out: ${formatTime12h(primaryBreak.endTime)}` : (isToday && isOnBreak ? 'Break In Progress' : 'Break Out Pending')}>
                                    <span className="text-[8.5px] sm:text-[9px] font-extrabold text-amber-800 bg-amber-200/80 dark:bg-amber-950/80 dark:text-amber-300 px-1 py-0.5 rounded shrink-0 leading-none">B-OUT</span>
                                    <span className="truncate">
                                        {primaryBreak.endTime
                                            ? formatTime12h(primaryBreak.endTime).toLowerCase()
                                            : (isToday && isOnBreak ? 'active' : '--:--')}
                                    </span>
                                    {dayBreaks.length > 1 && (
                                        <span className="text-[8.5px] sm:text-[9px] font-bold text-amber-800 bg-amber-100 dark:bg-amber-900/60 px-1 rounded ml-auto" title={`${dayBreaks.length} total breaks (${log?.totalBreakMinutes || totalBreakMinutes || 0}m)`}>
                                            +{dayBreaks.length - 1}
                                        </span>
                                    )}
                                </div>
                            </>
                        ) : null}

                        {/* Net Working Hours display (Gross minus Break) */}
                        {log?.inTime ? (() => {
                            const inT = new Date(log.inTime);
                            const outT = log.outTime ? new Date(log.outTime) : (isToday ? currentTime : null);
                            const breakMins = log.totalBreakMinutes ?? dayBreaks.reduce((sum: number, b: any) => sum + (b.duration || 0), 0);
                            let grossH = 0;
                            if (outT) {
                                grossH = Math.max(0, (outT.getTime() - inT.getTime()) / (1000 * 60 * 60));
                            }
                            const netH = (log.hours != null && log.hours > 0) ? Number(log.hours) : Math.max(0, grossH - (breakMins / 60));
                            const netDisplay = netH >= 0.1 ? `${netH.toFixed(1)}h` : (netH > 0 ? `${Math.max(1, Math.round(netH * 60))}m` : '0h');

                            return (
                                <div
                                    className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold text-blue-700 dark:text-blue-300 font-mono-numbers leading-tight truncate mt-0.5"
                                    title={`Total: ${grossH.toFixed(2)}h | Break: ${breakMins}m | Net: ${netH.toFixed(2)}h`}
                                >
                                    <span className="text-[8.5px] sm:text-[9px] font-extrabold text-blue-800 bg-blue-200/80 dark:bg-blue-950/80 dark:text-blue-300 px-1 py-0.5 rounded shrink-0 leading-none">HRS</span>
                                    <span className="truncate">{netDisplay}</span>
                                    {breakMins > 0 && (
                                        <span className="text-[9px] sm:text-[9.5px] font-medium text-amber-700 dark:text-amber-400 ml-auto" title={`${breakMins}m break deducted`}>
                                            (-{breakMins}m)
                                        </span>
                                    )}
                                </div>
                            );
                        })() : null}
                    </div>

                    {/* Bottom: Regularize button directly in card - fixed height container */}
                    <div className="flex justify-end items-center h-5 shrink-0">
                        {isEligibleForRegularize && (user?.role === 'SUPER_ADMIN' || hasPermission('ATTENDANCE_REGULARIZE')) ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenRegularize(dateStr, log);
                                }}
                                className="px-1.5 sm:px-2 py-0.5 bg-[#E8ECFC] hover:bg-[#2C4FD6] text-[#2C4FD6] hover:text-white border border-[#2C4FD6]/30 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700/50 rounded-[4px] text-[9px] sm:text-[9.5px] font-semibold transition-colors cursor-pointer leading-tight"
                            >
                                Correction
                            </button>
                        ) : holiday && log?.inTime ? (
                            <span className="text-[8.5px] sm:text-[9.5px] text-purple-700 dark:text-purple-300 font-medium truncate max-w-full" title={holiday.name}>
                                {holiday.name}
                            </span>
                        ) : null}
                    </div>
                </div>
            );
        }

        return days;
    };

    if (loading && attendanceHistory.length === 0) {
        return <AttendanceSkeleton />;
    }

    // 12-hour live clock values
    const rawHours = currentTime.getHours();
    const displayHours = String(rawHours % 12 || 12).padStart(2, '0');
    const displayMinutes = String(currentTime.getMinutes()).padStart(2, '0');
    const ampm = rawHours >= 12 ? 'PM' : 'AM';

    return (
        <div className="animate-fade-in-up pb-8 relative">
            <header className="mb-6">
                <h2 className="text-2xl font-bold text-[#12151C] dark:text-white mb-1">My Attendance</h2>
                <p className="page-sub text-[14px] text-[#5B6472] dark:text-gray-400 mb-[26px]">Track your daily punches and correction requests.</p>
            </header>

            {/* Top Grid: Punch Card + 4 Stat Cards - Connected continuous strip matching Admin Dashboard */}
            <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.65fr_repeat(4,1fr)] items-stretch">
                {/* Card 1: Punch Widget */}
                <div className="p-3.5 sm:p-4.5 flex items-center justify-between gap-3 min-h-[130px] self-stretch border-b sm:border-r lg:border-b-0 lg:border-r border-[#E2E6ED] dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all">
                    <div className="flex flex-col justify-between h-full min-w-0 pr-1">
                        <div>
                            <p className="text-[12.5px] sm:text-[13.5px] font-semibold text-[#5B6472] dark:text-gray-300 leading-tight truncate">
                                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <div className="clock-time flex items-baseline gap-1.5 font-mono font-bold text-[24px] sm:text-[26px] text-[#12151C] dark:text-white leading-none mt-1">
                                <span>{displayHours}:{displayMinutes}</span>
                                <span className="text-[12.5px] sm:text-[13.5px] font-bold text-[#5B6472] dark:text-gray-400">{ampm}</span>
                            </div>
                        </div>

                        {(() => {
                            const hasUsedDailyBreak = (todayBreaks && todayBreaks.length >= 1 && !isOnBreak);

                            return (
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                                        isOnBreak
                                            ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300'
                                            : isPunchedIn
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
                                            : isAlreadyPunchedOut
                                            ? 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                            : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                            isOnBreak
                                                ? 'bg-amber-500 animate-ping'
                                                : isPunchedIn
                                                ? 'bg-emerald-500 animate-pulse'
                                                : isAlreadyPunchedOut
                                                ? 'bg-gray-400'
                                                : 'bg-gray-400'
                                        }`}></span>
                                        {isOnBreak ? 'On Break ☕' : isPunchedIn ? 'Working' : isAlreadyPunchedOut ? 'Punched Out' : 'Not Clocked In'}
                                    </span>

                                    {totalBreakMinutes > 0 && (
                                        <span className="text-[9.5px] px-1.5 py-0.5 rounded-[4px] bg-amber-50 dark:bg-amber-950/40 text-[#B45309] dark:text-amber-400 font-medium border border-amber-200/50" title={hasUsedDailyBreak ? "Daily break completed (1/1 taken)" : "Break duration"}>
                                            Break: {totalBreakMinutes}m {hasUsedDailyBreak ? '(Done)' : ''}
                                        </span>
                                    )}

                                    {currentShift && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#EEF1F5] dark:bg-gray-800 text-[#2C4FD6] dark:text-blue-400 font-mono font-semibold border border-blue-100 dark:border-blue-900/40" title={`${currentShift.name} (Break: ${currentShift.breakDuration}m, Grace: ${currentShift.graceTime}m)`}>
                                            {currentShift.startTime} - {currentShift.endTime}{currentShift.isNightShift ? ' (Night)' : ''}
                                        </span>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Break In & Break Out Buttons */}
                        {(() => {
                            const hasUsedDailyBreak = (todayBreaks && todayBreaks.length >= 1 && !isOnBreak);
                            return (
                                <div className="flex flex-col gap-1.5 justify-center">
                                    <button
                                        type="button"
                                        onClick={() => breakInMutation.mutate()}
                                        disabled={!isPunchedIn || isOnBreak || hasUsedDailyBreak || breakInMutation.isPending || breakOutMutation.isPending || punchMutation.isPending}
                                        title={
                                            !isPunchedIn
                                                ? "Punch in first to start a break"
                                                : isOnBreak
                                                ? "You are already on a break"
                                                : hasUsedDailyBreak
                                                ? "Daily break limit reached (Only 1 break allowed per shift)"
                                                : "Start Break"
                                        }
                                        className={`h-[36px] sm:h-[39px] px-2.5 sm:px-3 rounded-[6px] border flex items-center justify-center gap-1.5 transition-all text-[10.5px] font-bold uppercase tracking-wider ${
                                            isOnBreak || !isPunchedIn || hasUsedDailyBreak
                                                ? 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-600 cursor-not-allowed opacity-50'
                                                : 'border-[#D97706] bg-[#FEF3C7] text-[#B45309] hover:bg-[#FDE68A] cursor-pointer active:scale-95 shadow-sm'
                                        }`}
                                    >
                                        {breakInMutation.isPending ? (
                                            <Loader2 size={13} className="animate-spin" />
                                        ) : (
                                            <Coffee size={13} />
                                        )}
                                        <span>Break In</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => breakOutMutation.mutate()}
                                        disabled={!isPunchedIn || !isOnBreak || breakOutMutation.isPending || breakInMutation.isPending || punchMutation.isPending}
                                        title={!isOnBreak ? "No active break to end" : "End Break"}
                                        className={`h-[36px] sm:h-[39px] px-2.5 sm:px-3 rounded-[6px] border flex items-center justify-center gap-1.5 transition-all text-[10.5px] font-bold uppercase tracking-wider ${
                                            isOnBreak
                                                ? 'border-[#059669] bg-[#D1FAE5] text-[#047857] hover:bg-[#A7F3D0] cursor-pointer active:scale-95 shadow-sm'
                                                : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-600 cursor-not-allowed opacity-50'
                                        }`}
                                    >
                                        {breakOutMutation.isPending ? (
                                            <Loader2 size={13} className="animate-spin" />
                                        ) : (
                                            <Play size={13} />
                                        )}
                                        <span>Break Out</span>
                                    </button>
                                </div>
                            );
                        })()}

                        {/* Punch In / Punch Out Button */}
                        <button
                            type="button"
                            onClick={handlePunch}
                            disabled={punchMutation.isPending || isAlreadyPunchedOut}
                            title={
                                isAlreadyPunchedOut
                                    ? "Shift completed: You have already punched out for today"
                                    : !isPunchedIn && canPunchIn === false
                                    ? punchInMessage || `Punch-in is only allowed 1 hour before your shift starts (${currentShift?.startTime || ''})`
                                    : isPunchedIn
                                    ? "Click to Punch Out"
                                    : "Click to Punch In"
                            }
                            className={`w-[78px] h-[78px] sm:w-[84px] sm:h-[84px] rounded-[6px] border flex flex-col items-center justify-center transition-all shrink-0 ${
                                isAlreadyPunchedOut
                                    ? 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-600 cursor-not-allowed opacity-50 shadow-none'
                                    : isPunchedIn
                                    ? 'border-2 border-[#C13A3A] bg-[#FBE7E7] text-[#C13A3A] hover:bg-[#F9D5D5] cursor-pointer transform active:scale-95'
                                    : 'border-2 border-[#1F8A5A] bg-[#E4F5EC] text-[#1F8A5A] hover:bg-[#D5EFE2] cursor-pointer transform active:scale-95'
                            } ${punchMutation.isPending ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
                        >
                            {punchMutation.isPending ? (
                                <Loader2 size={20} className="mb-1 shrink-0 animate-spin" />
                            ) : isAlreadyPunchedOut ? (
                                <CheckCircle size={20} className="mb-1 shrink-0 text-gray-400 dark:text-gray-500" />
                            ) : (
                                <MapPin size={20} className="mb-1 shrink-0" />
                            )}
                            <span className="lbl text-[10px] font-extrabold uppercase tracking-wider leading-none text-center">
                                {punchMutation.isPending
                                    ? 'WAIT...'
                                    : isAlreadyPunchedOut
                                    ? 'PUNCHED OUT'
                                    : isPunchedIn
                                    ? 'PUNCH OUT'
                                    : 'PUNCH IN'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Card 2: Present Days */}
                <div className="p-4 sm:p-5 flex flex-col justify-between min-h-[130px] self-stretch border-b sm:border-r-0 lg:border-b-0 lg:border-r border-[#E2E6ED] dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[6px] bg-[#EEF1F5] dark:bg-gray-800 text-[#5B6472] dark:text-gray-300 flex items-center justify-center shrink-0">
                            <CheckCircle size={16} />
                        </div>
                        <span className="kpi-label text-[12px] sm:text-[12.5px] font-bold text-[#12151C] dark:text-gray-200 uppercase tracking-[.05em]">
                            TOTAL DAYS PRESENT
                        </span>
                    </div>
                    <div>
                        <div className="num text-[28px] sm:text-[30px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight leading-none mb-1">
                            {stats.present}
                        </div>
                        <p className="text-[12px] text-[#9AA3B1] leading-none">this month</p>
                    </div>
                </div>

                {/* Card 3: Absents */}
                <div className="p-4 sm:p-5 flex flex-col justify-between min-h-[130px] self-stretch border-b sm:border-r lg:border-b-0 lg:border-r border-[#E2E6ED] dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[6px] bg-[#EEF1F5] dark:bg-gray-800 text-[#5B6472] dark:text-gray-300 flex items-center justify-center shrink-0">
                            <AlertCircle size={16} />
                        </div>
                        <span className="kpi-label text-[12px] sm:text-[12.5px] font-bold text-[#12151C] dark:text-gray-200 uppercase tracking-[.05em]">
                            TOTAL DAYS ABSENT
                        </span>
                    </div>
                    <div>
                        <div className="num text-[28px] sm:text-[30px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight leading-none mb-1">
                            {stats.absent}
                        </div>
                        <p className="text-[12px] text-[#9AA3B1] leading-none">this month</p>
                    </div>
                </div>

                {/* Card 4: Late Marks */}
                <div className="p-4 sm:p-5 flex flex-col justify-between min-h-[130px] self-stretch border-b sm:border-r-0 lg:border-b-0 lg:border-r border-[#E2E6ED] dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[6px] bg-[#EEF1F5] dark:bg-gray-800 text-[#5B6472] dark:text-gray-300 flex items-center justify-center shrink-0">
                            <Clock size={16} />
                        </div>
                        <span className="kpi-label text-[12px] sm:text-[12.5px] font-bold text-[#12151C] dark:text-gray-200 uppercase tracking-[.05em]">
                            TOTAL LATE ARRIVALS
                        </span>
                    </div>
                    <div>
                        <div className="num text-[28px] sm:text-[30px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight leading-none mb-1">
                            {stats.late}
                        </div>
                        <p className="text-[12px] text-[#9AA3B1] leading-none">this month</p>
                    </div>
                </div>

                {/* Card 5: Holidays */}
                <div className="p-4 sm:p-5 flex flex-col justify-between min-h-[130px] self-stretch border-0 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[6px] bg-[#EEF1F5] dark:bg-gray-800 text-[#5B6472] dark:text-gray-300 flex items-center justify-center shrink-0">
                            <Calendar size={16} />
                        </div>
                        <span className="kpi-label text-[12px] sm:text-[12.5px] font-bold text-[#12151C] dark:text-gray-200 uppercase tracking-[.05em]">
                            TOTAL HOLIDAYS
                        </span>
                    </div>
                    <div>
                        <div className="num text-[28px] sm:text-[30px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight leading-none mb-1">
                            {holidays.filter(h => {
                                const hDate = new Date(h.date);
                                return hDate.getMonth() === selectedMonth.getMonth() &&
                                    hDate.getFullYear() === selectedMonth.getFullYear();
                            }).length}
                        </div>
                        <p className="text-[12px] text-[#9AA3B1] leading-none">this month</p>
                    </div>
                </div>
            </div>

            {/* Monthly Calendar View */}
            <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6 mb-6">
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
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-md overflow-hidden shadow-xl animate-scale-in">
                        <div className="p-4 sm:p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-gray-800/30">
                            <h3 className="text-base font-bold text-[#12151C] dark:text-white">Attendance Correction</h3>
                            <button type="button" onClick={() => setRegularizeDate(null)} className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer p-1">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={submitRegularization} noValidate className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 uppercase mb-1">Requested Date</label>
                                <div className="px-3 py-2 bg-[#F7F8FA] dark:bg-gray-800/40 border border-[#E2E6ED] dark:border-gray-700/60 rounded-[6px] font-semibold text-[13px] text-[#12151C] dark:text-gray-200">
                                    {(() => {
                                        const [y, m, d] = regularizeDate.split('-').map(Number);
                                        const localDate = new Date(y, m - 1, d);
                                        return localDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                    })()}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 uppercase mb-1">Reason for correction</label>
                                <select
                                    value={reason}
                                    onChange={(e) => {
                                        setReason(e.target.value);
                                        if (regularizeErrors.reason) setRegularizeErrors(prev => ({ ...prev, reason: undefined }));
                                    }}
                                    className={`w-full px-3 py-2 bg-white dark:bg-[#12151C] border ${
                                        regularizeErrors.reason
                                            ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20'
                                            : 'border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]'
                                    } rounded-[6px] outline-none text-[13.5px] font-medium text-[#12151C] dark:text-white cursor-pointer transition-all`}
                                >
                                    <option value="" disabled className="bg-white dark:bg-[#12151C] text-gray-900 dark:text-white">Select a reason...</option>
                                    <option value="Forgot to Punch In" className="bg-white dark:bg-[#12151C] text-gray-900 dark:text-white">Forgot to Punch In</option>
                                    <option value="Forgot to Punch Out" className="bg-white dark:bg-[#12151C] text-gray-900 dark:text-white">Forgot to Punch Out</option>
                                    <option value="Break In Correction" className="bg-white dark:bg-[#12151C] text-gray-900 dark:text-white">Break In Correction</option>
                                    <option value="Break Out Correction" className="bg-white dark:bg-[#12151C] text-gray-900 dark:text-white">Break Out Correction</option>
                                    <option value="Device/Bio-metric Issue" className="bg-white dark:bg-[#12151C] text-gray-900 dark:text-white">Device/Bio-metric Issue</option>
                                    <option value="Official Duty / Client Visit" className="bg-white dark:bg-[#12151C] text-gray-900 dark:text-white">Official Duty / Client Visit</option>
                                    <option value="Other" className="bg-white dark:bg-[#12151C] text-gray-900 dark:text-white">Other (Write Custom Reason)</option>
                                </select>
                                {regularizeErrors.reason && (
                                    <p className="text-[11.5px] text-red-500 font-medium mt-1 animate-fade-in">{regularizeErrors.reason}</p>
                                )}
                            </div>

                            {reason === 'Other' && (
                                <div>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 uppercase mb-1">Specify Reason</label>
                                    <textarea
                                        value={customReason}
                                        onChange={(e) => {
                                            setCustomReason(e.target.value);
                                            if (regularizeErrors.customReason) setRegularizeErrors(prev => ({ ...prev, customReason: undefined }));
                                        }}
                                        placeholder="Briefly describe your reason..."
                                        rows={3}
                                        className={`w-full p-3 bg-white dark:bg-[#12151C] border ${
                                            regularizeErrors.customReason
                                                ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20'
                                                : 'border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]'
                                        } rounded-[6px] outline-none transition-all text-[13px] font-medium text-[#12151C] dark:text-white`}
                                    />
                                    {regularizeErrors.customReason && (
                                        <p className="text-[11.5px] text-red-500 font-medium mt-1 animate-fade-in">{regularizeErrors.customReason}</p>
                                    )}
                                </div>
                            )}

                            {reason === 'Break In Correction' || reason === 'Break Out Correction' ? (
                                <div>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 uppercase mb-1">
                                        {reason === 'Break In Correction' ? 'Proposed Break In Time' : 'Proposed Break Out Time'}
                                    </label>
                                    <div className="relative">
                                        <Coffee size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                                        <input
                                            type="text"
                                            value={breakInputText}
                                            onChange={(e) => setBreakInputText(e.target.value)}
                                            placeholder="01:00 PM"
                                            className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#12151C] border rounded-[6px] outline-none focus:border-[#2C4FD6] transition-all text-[13px] font-medium text-[#12151C] dark:text-white ${breakInputText && !parse12hTo24h(breakInputText)
                                                ? 'border-rose-500/60'
                                                : 'border-[#E2E6ED] dark:border-gray-700'
                                                }`}
                                        />
                                    </div>
                                    <p className={`text-[10.5px] mt-1 font-semibold ${breakInputText && !parse12hTo24h(breakInputText)
                                        ? 'text-rose-500'
                                        : 'text-gray-400 dark:text-gray-500'
                                        }`}>
                                        {breakInputText && parse12hTo24h(breakInputText)
                                            ? `✓ Set: ${format24to12(parse12hTo24h(breakInputText)!)}`
                                            : 'Format: HH:MM AM/PM'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 uppercase mb-1">Proposed In Time</label>
                                        <div className="relative">
                                            <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={inInputText}
                                                onChange={(e) => setInInputText(e.target.value)}
                                                placeholder="09:00 AM"
                                                className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#12151C] border rounded-[6px] outline-none focus:border-[#2C4FD6] transition-all text-[13px] font-medium text-[#12151C] dark:text-white ${inInputText && !parse12hTo24h(inInputText)
                                                    ? 'border-rose-500/60'
                                                    : 'border-[#E2E6ED] dark:border-gray-700'
                                                    }`}
                                            />
                                        </div>
                                        <p className={`text-[10.5px] mt-1 font-semibold ${inInputText && !parse12hTo24h(inInputText)
                                            ? 'text-rose-500'
                                            : 'text-gray-400 dark:text-gray-500'
                                            }`}>
                                            {inInputText && parse12hTo24h(inInputText)
                                                ? `✓ Set: ${format24to12(parse12hTo24h(inInputText)!)}`
                                                : 'Format: HH:MM AM/PM'}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 uppercase mb-1">Proposed Out Time</label>
                                        <div className="relative">
                                            <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={outInputText}
                                                onChange={(e) => setOutInputText(e.target.value)}
                                                placeholder="06:00 PM"
                                                className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#12151C] border rounded-[6px] outline-none focus:border-[#2C4FD6] transition-all text-[13px] font-medium text-[#12151C] dark:text-white ${outInputText && !parse12hTo24h(outInputText)
                                                    ? 'border-rose-500/60'
                                                    : 'border-[#E2E6ED] dark:border-gray-700'
                                                    }`}
                                            />
                                        </div>
                                        <p className={`text-[10.5px] mt-1 font-semibold ${outInputText && !parse12hTo24h(outInputText)
                                            ? 'text-rose-500'
                                            : 'text-gray-400 dark:text-gray-500'
                                            }`}>
                                            {outInputText && parse12hTo24h(outInputText)
                                                ? `✓ Set: ${format24to12(parse12hTo24h(outInputText)!)}`
                                                : 'Format: HH:MM AM/PM'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E2E6ED] dark:border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setRegularizeDate(null)}
                                    className="px-5 py-2.5 text-[#5B6472] dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-[6px] transition-all text-[13px] cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingRequest}
                                    className="px-6 py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold rounded-[6px] transition-all text-[13.5px] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                                >
                                    {submittingRequest ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        'Submit'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Rejected Request Detail Modal */}
            {rejectedRequestToShow && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-[#12151C] rounded-[6px] w-full max-w-md overflow-hidden relative border border-[#E2E6ED] dark:border-gray-800 shadow-xl animate-scale-in">
                        <div className="p-4 sm:p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-gray-800/30">
                            <div className="flex items-center gap-2.5">
                                <span className="p-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-[6px] flex items-center justify-center">
                                    <AlertCircle size={17} />
                                </span>
                                <h3 className="text-base font-bold text-[#12151C] dark:text-white">Correction Rejected</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRejectedRequestToShow(null)}
                                className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 uppercase mb-1">Date Requested</label>
                                <div className="px-3 py-2 bg-[#F7F8FA] dark:bg-gray-800/40 border border-[#E2E6ED] dark:border-gray-700/60 rounded-[6px] font-semibold text-[13px] text-[#12151C] dark:text-gray-200">
                                    {(() => {
                                        const [y, m, d] = rejectedRequestToShow.date.split('-').map(Number);
                                        const localDate = new Date(y, m - 1, d);
                                        return localDate.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                    })()}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 uppercase mb-1">Proposed In Time</label>
                                    <div className="px-3 py-2 bg-[#F7F8FA] dark:bg-gray-800/40 border border-[#E2E6ED] dark:border-gray-700/60 rounded-[6px] text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                        <Clock size={13} /> {formatTime12h(rejectedRequestToShow.proposedIn || rejectedRequestToShow.inTime)}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 uppercase mb-1">Proposed Out Time</label>
                                    <div className="px-3 py-2 bg-[#F7F8FA] dark:bg-gray-800/40 border border-[#E2E6ED] dark:border-gray-700/60 rounded-[6px] text-[13px] font-semibold text-rose-500 dark:text-rose-400 flex items-center gap-1.5">
                                        <Clock size={13} /> {formatTime12h(rejectedRequestToShow.proposedOut || rejectedRequestToShow.outTime)}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 uppercase mb-1">Your Reason</label>
                                <div className="p-3 bg-[#F7F8FA] dark:bg-gray-800/40 border border-[#E2E6ED] dark:border-gray-700/60 rounded-[6px] text-[13px] text-[#5B6472] dark:text-gray-300 italic font-medium leading-relaxed">
                                    <div className="max-h-[100px] overflow-y-auto custom-scrollbar break-words">
                                        "{rejectedRequestToShow.reason}"
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-1 flex items-center gap-1">
                                    Manager's Rejection Reason
                                </label>
                                <div className="p-3 bg-red-50/70 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 rounded-[6px] text-[13px] text-red-700 dark:text-red-300 font-medium leading-relaxed">
                                    <div className="max-h-[100px] overflow-y-auto custom-scrollbar break-words">
                                        {rejectedRequestToShow.approverComment || 'No comment provided.'}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setRejectedRequestToShow(null)}
                                    className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-[13.5px] rounded-[6px] transition-all cursor-pointer shadow-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Rejected Leave Detail Modal */}
            {rejectedLeaveToShow && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-[#12151C] rounded-[6px] w-full max-w-md overflow-hidden relative border border-[#E2E6ED] dark:border-gray-800 shadow-xl animate-scale-in">
                        <div className="p-4 sm:p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-gray-800/30">
                            <div className="flex items-center gap-2.5">
                                <span className="p-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-[6px] flex items-center justify-center">
                                    <AlertCircle size={17} />
                                </span>
                                <h3 className="text-base font-bold text-[#12151C] dark:text-white">Leave Rejected</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRejectedLeaveToShow(null)}
                                className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-3.5">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 uppercase mb-1">Leave Type</label>
                                    <div className="px-3 py-2 bg-[#F7F8FA] dark:bg-gray-800/40 border border-[#E2E6ED] dark:border-gray-700/60 rounded-[6px] font-semibold text-[13px] text-[#12151C] dark:text-gray-200">
                                        {rejectedLeaveToShow.leaveType?.name || rejectedLeaveToShow.leaveType?.code || 'Leave'}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 uppercase mb-1">Dates</label>
                                    <div className="px-3 py-2 bg-[#F7F8FA] dark:bg-gray-800/40 border border-[#E2E6ED] dark:border-gray-700/60 rounded-[6px] font-semibold text-[12px] text-[#12151C] dark:text-gray-200 leading-tight flex items-center min-h-[38px]">
                                        {new Date(rejectedLeaveToShow.startDate).toLocaleDateString()} - {new Date(rejectedLeaveToShow.endDate).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 uppercase mb-1">Your Reason</label>
                                <div className="p-3 bg-[#F7F8FA] dark:bg-gray-800/40 border border-[#E2E6ED] dark:border-gray-700/60 rounded-[6px] text-[13px] text-[#5B6472] dark:text-gray-300 italic font-medium leading-relaxed">
                                    <div className="max-h-[100px] overflow-y-auto custom-scrollbar break-words">
                                        "{rejectedLeaveToShow.reason}"
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-red-600 dark:text-red-400 uppercase mb-1 flex items-center gap-1">
                                    Manager's Rejection Reason
                                </label>
                                <div className="p-3 bg-red-50/70 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 rounded-[6px] text-[13px] text-red-700 dark:text-red-300 font-medium leading-relaxed">
                                    <div className="max-h-[100px] overflow-y-auto custom-scrollbar break-words">
                                        {rejectedLeaveToShow.rejectionReason || 'No comment provided.'}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setRejectedLeaveToShow(null)}
                                    className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-[13.5px] rounded-[6px] transition-all cursor-pointer shadow-sm"
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
