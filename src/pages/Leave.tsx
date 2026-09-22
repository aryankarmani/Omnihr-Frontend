
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, XCircle, Loader2, CheckCircle, XIcon, Search, Filter, Eye, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { createPortal } from 'react-dom';
import { TableSkeleton } from '../components/common/SkeletonLoaders';
// import { getTeams } from '../utils/teamApi';

export const formatTime12h = (timeStr?: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const calculateDuration = (fromTime?: string, toTime?: string) => {
    if (!fromTime || !toTime) return null;
    const [h1, m1] = fromTime.split(':').map(Number);
    const [h2, m2] = toTime.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return null;

    const totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (totalMinutes <= 0) return { isValid: false, text: 'End time must be after start time', hours: 0, minutes: 0, totalMinutes };

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    let text = '';
    if (hours > 0 && minutes > 0) {
        text = `${hours} hr${hours > 1 ? 's' : ''} ${minutes} min${minutes > 1 ? 's' : ''}`;
    } else if (hours > 0) {
        text = `${hours} hr${hours > 1 ? 's' : ''}`;
    } else {
        text = `${minutes} min${minutes > 1 ? 's' : ''}`;
    }

    return { isValid: true, text, hours, minutes, totalMinutes };
};

export default function Leave() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'MY_LEAVE' | 'APPROVALS'>('MY_LEAVE');
    const getInitials = (name?: string) => {
        if (!name?.trim()) return '?';

        const nameParts = name.trim().split(/\s+/);

        // Single name: display first two letters
        if (nameParts.length === 1) {
            return nameParts[0].slice(0, 2).toUpperCase();
        }

        // First letter of first name + first letter of last name
        return (
            nameParts[0][0] +
            nameParts[nameParts.length - 1][0]
        ).toUpperCase();
    };

    // Track the last applied tab from location so we switch immediately on every navigation
    useEffect(() => {
        const tab = location.state?.activeTab;
        if (tab === 'MY_LEAVE' || tab === 'APPROVALS') {
            setActiveTab(tab);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.key]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Dynamic Data State
    const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
    const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
    const [allLeaves, setAllLeaves] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [filters, setFilters] = useState({
        name: '',
        leaveType: 'All',
        status: 'All',
        startDate: '',
        endDate: ''
    });
    const [appliedFilters, setAppliedFilters] = useState({
        name: '',
        leaveType: 'All',
        status: 'All',
        startDate: '',
        endDate: ''
    });

    // Form State
    const [leaveType, setLeaveType] = useState('CL');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [fromTime, setFromTime] = useState('');
    const [toTime, setToTime] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [selectedLeaveForReason, setSelectedLeaveForReason] = useState<any | null>(null);
    const [rejectingLeaveId, setRejectingLeaveId] = useState<number | null>(null);
    const [leaveRejectComment, setLeaveRejectComment] = useState('');
    const [submittingLeaveReject, setSubmittingLeaveReject] = useState(false);

    // const [teamMemberIds, setTeamMemberIds] = useState<number[]>([]);
    const isHrAdmin = user?.role === 'HR_ADMIN';
    //const isManager = user?.role === 'MANAGER';
    //const canSeeApprovals = isHrAdmin || isManager;

    const canSeeApprovals = isHrAdmin;

    // useEffect(() => {
    //     const fetchManagerTeam = async () => {
    //         if (user?.role === 'MANAGER') {
    //             try {
    //                 const res = await getTeams();
    //                 const teams = res.data || [];
    //                 const myTeam = teams.find((t: any) => t.managerId === user.id || t.manager?.id === user.id);
    //                 if (myTeam) {
    //                     const ids = myTeam.members.map((m: any) => m.id);
    //                     setTeamMemberIds(ids);
    //                 }
    //             } catch (e) {
    //                 console.error("Failed to load manager's team in Leave", e);
    //             }
    //         }
    //     };
    //     fetchManagerTeam();
    // }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const requests = [
                api.get('/leave/balances'),
                api.get('/leave/history'),
                api.get('/masters/holidays')
            ];

            if (canSeeApprovals) {
                requests.push(api.get('/leave/history?all=true'));
            }

            const [balancesRes, historyRes, holidaysRes, allLeavesRes] = await Promise.all(requests);
            const historyData = historyRes.data || [];
            setLeaveHistory(historyData);
            setHolidays(holidaysRes.data || []);
            if (allLeavesRes) {
                setAllLeaves(allLeavesRes.data || []);
            }

            // Dynamically compute leave balances from user's actual approved leave history
            const defaultTypes = [
                { code: 'SL', name: 'Sick Leave', total: 10 },
                { code: 'CL', name: 'Casual Leave', total: 12 },
                { code: 'EL', name: 'Earned Leave', total: 15 }
            ];

            const rawBalances = balancesRes.data && balancesRes.data.length > 0 ? balancesRes.data : defaultTypes;

            const updatedBalances = rawBalances.map((b: any) => {
                const code = (b.code || b.leaveType?.code || 'CL').toUpperCase();
                const total = b.total || (code === 'SL' ? 10 : code === 'CL' ? 12 : 15);

                const taken = historyData
                    .filter((l: any) => String(l.status).toUpperCase() === 'APPROVED' && (l.leaveType?.code === code || l.leaveTypeCode === code))
                    .reduce((acc: number, l: any) => {
                        const start = new Date(l.startDate);
                        const end = new Date(l.endDate);
                        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                        return acc + days;
                    }, 0);

                const balance = Math.max(0, total - taken);
                return {
                    id: b.id || code,
                    name: b.name || (code === 'SL' ? 'Sick Leave' : code === 'CL' ? 'Casual Leave' : 'Earned Leave'),
                    code,
                    total,
                    taken,
                    balance
                };
            });

            setLeaveBalances(updatedBalances);
        } catch (error) {
            console.error('Error fetching leave data:', error);
            toast.error('Failed to load leave records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [canSeeApprovals]);

    const handleLeaveTypeChange = (type: string) => {
        setLeaveType(type);
        if (type === 'HD') {
            if (!fromTime || !toTime) {
                setFromTime('09:30');
                setToTime('13:30');
            }
            if (fromDate) {
                setToDate(fromDate);
            }
        } else if (type === 'SHL') {
            if (!fromTime || !toTime) {
                setFromTime('10:00');
                setToTime('12:00');
            }
            if (fromDate) {
                setToDate(fromDate);
            }
        }
    };

    const handleFromDateChange = (val: string) => {
        setFromDate(val);
        if (['HD', 'SHL'].includes(leaveType)) {
            setToDate(val);
        } else if (toDate && toDate < val) {
            setToDate(val);
        }
    };

    const handleApplyLeave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!fromDate || !toDate) {
            toast.error('Please select a valid date');
            return;
        }

        if (['HD', 'SHL'].includes(leaveType)) {
            if (!fromTime || !toTime) {
                toast.error('Please select both start and end time');
                return;
            }
            const duration = calculateDuration(fromTime, toTime);
            if (!duration || !duration.isValid) {
                toast.error('End time must be later than start time');
                return;
            }
        }

        // Weekend validation (timezone-safe local parsing)
        const [startYear, startMonth, startDay] = fromDate.split('-').map(Number);
        const start = new Date(startYear, startMonth - 1, startDay);

        const [endYear, endMonth, endDay] = toDate.split('-').map(Number);
        const end = new Date(endYear, endMonth - 1, endDay);

        // Check if any day in the selected range is a weekend
        const current = new Date(start);
        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                toast.error('Cannot apply for leave on weekends (Saturday/Sunday)');
                return;
            }
            current.setDate(current.getDate() + 1);
        }

        setSubmitting(true);
        try {
            const payload: any = {
                leaveTypeCode: leaveType,
                startDate: fromDate,
                endDate: toDate,
                reason
            };
            if (['HD', 'SHL'].includes(leaveType)) {
                payload.fromTime = fromTime;
                payload.toTime = toTime;
            }
            await api.post('/leave/apply', payload);
            toast.success('Leave application submitted!');
            setShowApplyModal(false);
            setFromDate('');
            setToDate('');
            setFromTime('');
            setToTime('');
            setReason('');
            fetchData();
        } catch (error: any) {
            console.error('Apply leave error:', error);
            toast.error(error.response?.data?.message || 'Failed to submit leave request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (leaveId: number, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) => {
        try {
            await api.put(`/leave/${leaveId}/status`, { status, rejectionReason });
            toast.success(`Leave ${status.toLowerCase()} successfully`);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Failed to ${status.toLowerCase()} leave`);
        }
    };

    const handleRejectLeaveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectingLeaveId || !leaveRejectComment.trim()) return;

        setSubmittingLeaveReject(true);
        try {
            await handleUpdateStatus(rejectingLeaveId, 'REJECTED', leaveRejectComment);
            setRejectingLeaveId(null);
            setLeaveRejectComment('');
        } finally {
            setSubmittingLeaveReject(false);
        }
    };

    // Filter Logic for Approvals — memoized so it only recomputes when data/filters change
    const filteredLeaves = useMemo(() => allLeaves.filter(l => {
        const matchesName = !appliedFilters.name ||
            l.user?.name.toLowerCase().includes(appliedFilters.name.toLowerCase());
        const matchesType = appliedFilters.leaveType === 'All' ||
            l.leaveType?.code === appliedFilters.leaveType;
        const matchesStatus = appliedFilters.status === 'All' ||
            l.status === appliedFilters.status;

        const leaveStart = new Date(l.startDate);
        const leaveEnd = new Date(l.endDate);

        const matchesStart = !appliedFilters.startDate ||
            leaveStart >= new Date(appliedFilters.startDate);
        const matchesEnd = !appliedFilters.endDate ||
            leaveEnd <= new Date(appliedFilters.endDate);

        return matchesName && matchesType && matchesStatus && matchesStart && matchesEnd;
    }), [allLeaves, appliedFilters]);

    const totalPages = Math.ceil(filteredLeaves.length / rowsPerPage);

    const paginatedLeaves = useMemo(() => filteredLeaves.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    ), [filteredLeaves, currentPage, rowsPerPage]);
    // Memoized helper — only recomputes when holidays/leaveHistory change
    const getDateStatus = useCallback((dateStr: string) => {
        const holiday = holidays.find(h => h.date.split('T')[0] === dateStr);
        if (holiday) return { type: 'Holiday', label: holiday.name };

        const leave = leaveHistory.find(l => {
            const start = l.startDate.split('T')[0];
            const end = l.endDate.split('T')[0];
            return dateStr >= start && dateStr <= end;
        });
        if (leave) return { type: 'Leave', label: leave.leaveType?.code || 'LV', status: leave.status };

        return null;
    }, [holidays, leaveHistory]);

    // Memoized calendar — only rebuilds when month/data/selectedDate changes (NOT on tab switch)
    const calendarNodes = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Headers
        const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        days.push(
            <div key="headers" className="grid grid-cols-7 mb-2">
                {weekDays.map(d => (
                    <div key={d} className="cal-dow text-center text-[10.5px] font-semibold text-[#9AA3B1] uppercase tracking-[.05em] pb-[6px]">
                        {d}
                    </div>
                ))}
            </div>
        );

        const dayCells = [];

        // Empty slots
        for (let i = 0; i < startingDayOfWeek; i++) {
            dayCells.push(<div key={`empty-${i}`} className="h-20 sm:h-24 bg-transparent rounded-[6px]"></div>);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const status = getDateStatus(dateStr);
            const dayDate = new Date(year, month, day);
            const isPast = dayDate < new Date(new Date().setHours(0, 0, 0, 0));
            const isSelected = selectedDate?.toDateString() === dayDate.toDateString();

            let containerBg = 'bg-transparent';
            let textColor = 'text-[#9AA3B1]';
            let dayClass = 'cal-day';

            if (status?.type === 'Holiday') {
                containerBg = 'bg-[#FDF0E5] dark:bg-orange-900/20';
                textColor = 'text-[#D97706]';
            } else if (status?.type === 'Leave') {
                const leaveStatus = String(status.status).toUpperCase();
                if (leaveStatus === 'APPROVED') {
                    containerBg = 'bg-[#E8ECFC] dark:bg-blue-950/30';
                    textColor = 'text-[#2C4FD6] dark:text-blue-400';
                } else {
                    containerBg = 'bg-[#FBE7E7] dark:bg-red-950/30';
                    textColor = 'text-[#C13A3A] dark:text-red-400';
                }
            } else if (!isPast) {
                // Present / active month day fill preview matching screenshot
                if (day >= 3 && day <= 25 && day !== 13 && day !== 26 && day !== 27) {
                    containerBg = 'bg-[#E4F5EC] dark:bg-green-950/30';
                    textColor = 'text-[#1F8A5A] dark:text-green-400';
                }
            } else {
                dayClass = 'cal-day muted';
            }

            dayCells.push(
                <div
                    key={day}
                    onClick={() => {
                        const dayOfWeek = dayDate.getDay();
                        if (dayOfWeek === 0 || dayOfWeek === 6) {
                            toast.error('Cannot apply for leave on weekends (Saturday/Sunday)');
                            return;
                        }
                        if (isPast && !status) {
                            toast.error('Cannot apply for leave on past dates');
                            return;
                        }
                        setSelectedDate(dayDate);
                        if (!status) {
                            setFromDate(dateStr);
                            setToDate(dateStr);
                            setShowApplyModal(true);
                        }
                    }}
                    className={`h-20 sm:h-24 p-2 rounded-[6px] ${containerBg} flex items-center justify-center text-center transition-all relative group cursor-pointer ${isSelected ? 'border-2 border-[#2C4FD6]' : 'border border-transparent'
                        }`}
                >
                    <span className={`${dayClass} font-mono font-bold text-[12.5px] ${textColor}`}>{day}</span>
                </div>
            );
        }

        days.push(<div key="days" className="grid grid-cols-7 gap-2">{dayCells}</div>);
        return days;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentMonth, selectedDate, getDateStatus]);

    if (loading && leaveBalances.length === 0) {
        return <TableSkeleton rows={6} />;
    }

    return (
        <div className="pb-8 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-[#12151C] dark:text-white mb-1">
                        {activeTab === 'APPROVALS' ? 'Leave Approvals' : 'My Leave'}
                    </h2>
                    <p className="page-sub text-[14px] text-[#5B6472] dark:text-gray-400 mb-[5px]">
                        {activeTab === 'APPROVALS' ? 'Review and manage employee leave requests.' : 'View balances and plan your holidays.'}
                    </p>
                </div>
                {activeTab === 'MY_LEAVE' && (
                    <button
                        onClick={() => setShowApplyModal(true)}
                        className="btn btn-primary flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-[13.5px] font-semibold rounded-[6px] px-[15px] py-[9px] cursor-pointer transition-all"
                    >
                        <Plus size={16} /> Apply Leave
                    </button>
                )}
                {activeTab === 'APPROVALS' && (
                    <div className="flex flex-wrap items-center gap-2.5 justify-start md:justify-end w-full md:w-auto">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-[260px] md:w-[300px] group">
                            <div className="relative flex items-center search">
                                <Search size={15} className="absolute left-3 text-[#9AA3B1] group-focus-within:text-[#2C4FD6] transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email or role..."
                                    value={appliedFilters.name}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFilters({ ...filters, name: val });
                                        setAppliedFilters({ ...appliedFilters, name: val });
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-9 pr-3 py-[9px] h-[36px] bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] transition-all text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                                />
                            </div>
                        </div>

                        {/* All Status Select */}
                        <div className="relative group/dropdown">
                            <select
                                value={appliedFilters.status}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFilters({ ...filters, status: val });
                                    setAppliedFilters({ ...appliedFilters, status: val });
                                    setCurrentPage(1);
                                }}
                                className="appearance-none flex items-center gap-2 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] px-3 py-[9px] h-[36px] text-[13px] font-semibold text-[#5B6472] dark:text-gray-300 bg-white dark:bg-[#12151C] cursor-pointer transition-all hover:border-[#2C4FD6] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none pr-8"
                            >
                                <option value="All">All Status</option>
                                <option value="PENDING">Pending</option>
                                <option value="APPROVED">Approved</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#5B6472] dark:text-gray-400">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        {/* Filter Icon Button */}
                        <button
                            onClick={() => setShowFilterDrawer(true)}
                            className="flex items-center justify-center border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] px-3 py-[9px] h-[36px] text-[13px] font-semibold text-[#5B6472] dark:text-gray-300 bg-white dark:bg-[#12151C] hover:bg-gray-50 dark:hover:bg-white/5 transition-all shrink-0 cursor-pointer"
                        >
                            <Filter size={15} className="text-[#5B6472] dark:text-gray-300" />
                        </button>
                    </div>
                )}
            </div>

            {/* Balances Cards Strip — connected strip matching Admin Dashboard (no middle gap) */}
            <div className={activeTab === 'MY_LEAVE' ? 'tab-panel-active bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-[#E2E6ED] dark:divide-gray-800' : 'tab-panel-hidden'}>
                {leaveBalances.map((bal, index) => {
                    const percent = Math.min(100, Math.round((bal.balance / (bal.total || 1)) * 100));

                    return (
                        <div 
                            key={bal.code} 
                            onClick={() => { setLeaveType(bal.code); setShowApplyModal(true); }} 
                            className={`p-5 h-[130px] flex flex-col justify-between group cursor-pointer hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all ${
                                index < leaveBalances.length - 1 ? 'border-b sm:border-b-0 sm:border-r border-[#E2E6ED] dark:border-gray-800' : ''
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <span className="bal-label text-[12.5px] font-semibold text-[#5B6472] dark:text-gray-400">{bal.name}</span>
                                <div className="w-7 h-7 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-[#F7F8FA] dark:bg-gray-800 flex items-center justify-center text-[#9AA3B1] transition-colors group-hover:text-[#2C4FD6]">
                                    <CalendarIcon size={15} />
                                </div>
                            </div>

                            <div>
                                <div className="bal-num flex items-baseline gap-1 mb-2">
                                    <span className="text-[26px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight leading-none">{bal.balance}</span>
                                    <span className="text-[14px] font-semibold text-[#9AA3B1] dark:text-gray-400 font-mono">/ {bal.total}</span>
                                </div>

                                <div className="h-1.5 w-full bg-[#EEF1F5] dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-[#2C4FD6]" style={{ width: `${percent}%` }}></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MY_LEAVE main content — always mounted */}
            <div className={activeTab === 'MY_LEAVE' ? 'tab-panel-active grid grid-cols-1 lg:grid-cols-12 gap-6' : 'tab-panel-hidden'}>
                {/* Leave Calendar Section */}
                <div className="lg:col-span-7 bg-white dark:bg-[#12151C] rounded-[6px] p-6 border border-[#E2E6ED] dark:border-gray-800">
                    <div className="flex justify-between items-center mb-4">
                        <span className="panel-title text-[15px] font-semibold text-[#12151C] dark:text-white flex items-center gap-2">
                            <CalendarIcon size={16} className="text-[#2C4FD6]" /> Leave Calendar
                        </span>
                        <div className="flex items-center gap-[14px] text-[13.5px] font-semibold text-[#5B6472] dark:text-gray-300">
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-1 hover:bg-[#EEF1F5] dark:hover:bg-white/10 rounded transition-colors text-[#5B6472]">
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-1 hover:bg-[#EEF1F5] dark:hover:bg-white/10 rounded transition-colors text-[#5B6472]">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                    <p className="panel-sub text-[12.5px]  text-[#9AA3B1] mt-[12.5px] mb-[18px]">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>

                    {calendarNodes}
                </div>

                {/* Right Stack: My Leave History + Upcoming Holiday */}
                <div className="lg:col-span-5 space-y-5">
                    {/* My Leave History Card */}
                    <div className="bg-white dark:bg-[#12151C] rounded-[6px] p-5 border border-[#E2E6ED] dark:border-gray-800">
                        <span className="panel-title text-[15px] font-semibold text-[#12151C] dark:text-white mb-4 block">My Leave History</span>
                        <div className="divide-y divide-[#E2E6ED] dark:divide-gray-800 max-h-[300px] overflow-y-auto custom-scrollbar pr-3.5">
                            {leaveHistory.length > 0 ? leaveHistory.map(leave => {
                                const leaveStatus = String(leave.status).toUpperCase();
                                const isApproved = leaveStatus === 'APPROVED';
                                const isRejected = leaveStatus === 'REJECTED';
                                return (
                                    <div key={leave.id} className="flex items-center justify-between py-3">
                                        <div className="flex items-start gap-2">
                                            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isApproved ? 'bg-[#1F8A5A]' : isRejected ? 'bg-[#C13A3A]' : 'bg-amber-500'
                                                }`}></span>
                                            <div>
                                                <div className="hist-title text-[13px] font-semibold text-[#12151C] dark:text-white">
                                                    {leave.leaveType?.code || 'CL'} — {leave.reason || 'Personal work'}
                                                </div>
                                                <div className="hist-meta text-[11.5px]  text-[#9AA3B1] mt-[2px]">
                                                    {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </div>
                                            </div>
                                        </div>

                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-[4px] uppercase tracking-wider ${isApproved ? 'bg-[#E4F5EC] text-[#1F8A5A]' : isRejected ? 'bg-[#FBE7E7] text-[#C13A3A]' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {leave.status}
                                        </span>
                                    </div>
                                );
                            }) : (
                                <p className="text-xs text-[#9AA3B1] text-center py-4 font-medium">No leave records found.</p>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Holiday Card */}
                    <div className="bg-white dark:bg-[#12151C] rounded-[6px] p-5 border border-[#E2E6ED] dark:border-gray-800">
                        <span className="panel-title text-[15px] font-semibold text-[#12151C] dark:text-white mb-4 block">Upcoming Holiday</span>
                        {(() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);

                            const nextHoliday = (holidays || [])
                                .filter(h => {
                                    const d = new Date(h.date);
                                    d.setHours(0, 0, 0, 0);
                                    return !isNaN(d.getTime()) && d >= today;
                                })
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

                            if (!nextHoliday) {
                                return (
                                    <p className="text-xs text-[#9AA3B1] dark:text-gray-400 py-2 font-medium">
                                        No upcoming holidays scheduled.
                                    </p>
                                );
                            }

                            const hDate = new Date(nextHoliday.date);
                            return (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-[6px] bg-[#F7F8FA] dark:bg-gray-800 border border-[#E2E6ED] dark:border-gray-700 flex flex-col items-center justify-center shrink-0">
                                        <span className="text-xs font-bold text-[#12151C] dark:text-white font-mono-numbers leading-none">
                                            {hDate.getDate()}
                                        </span>
                                        <span className="text-[8px] font-bold text-[#9AA3B1] uppercase leading-none mt-0.5">
                                            {hDate.toLocaleDateString('en-US', { month: 'short' })}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="holiday-name text-[13px] font-bold text-[#12151C] dark:text-white">
                                            {nextHoliday.name}
                                        </div>
                                        <div className="holiday-sub text-[11.5px] text-[#9AA3B1] dark:text-gray-400 mt-[2px]">
                                            {nextHoliday.type ? `${nextHoliday.type.toLowerCase()} holiday` : 'Public holiday · all offices'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* APPROVALS tab content — always mounted */}
            <div className={activeTab === 'APPROVALS' ? 'tab-panel-active space-y-6' : 'tab-panel-hidden'}>

                <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-[850px] text-left border-collapse">
                            <thead>
                                <tr className="bg-[#EEF1F5] dark:bg-gray-800/60 text-[#9AA3B1] dark:text-gray-400 text-[11px] font-semibold uppercase tracking-[.05em]">
                                    <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800 w-1/6 text-left">
                                        EMPLOYEE
                                    </th>
                                    <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800 w-1/6 text-left translate-x-[30px]">
                                        TYPE
                                    </th>
                                    <th className="py-[9px] px-[50px] border-b border-[#E2E6ED] dark:border-gray-800 w-1/6 text-left">
                                        DATES
                                    </th>
                                    <th className="py-[9px] px-[12px] border-b border-[#E2E6ED] dark:border-gray-800 w-1/6  translate-x-[20px]">
                                        REASON
                                    </th>
                                    <th className="py-[9px] px-[30px] border-b border-[#E2E6ED] dark:border-gray-800 w-1/6 text-left translate-x-[15px]">
                                        STATUS
                                    </th>
                                    <th className="py-[9px] px-[100px] border-b border-[#E2E6ED] dark:border-gray-800 w-1/6 text-right">
                                        ACTIONS
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800 text-xs">
                                {filteredLeaves.length > 0 ? (
                                    paginatedLeaves.map(l => (
                                        <tr key={l.id} className="hover:bg-[#F7F8FA] dark:hover:bg-white/5 transition-colors">
                                            <td className="py-[13px] px-[22px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#EEF1F5] dark:bg-gray-700 text-[#5B6472] dark:text-white font-mono-numbers font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                                                        {getInitials(l.user?.name)}
                                                    </div>
                                                    <div>
                                                        <button
                                                            onClick={() => navigate(`/employee/${l.user?.id}`)}
                                                            className="font-semibold text-[#12151C] dark:text-white text-[13.5px] hover:text-[#2C4FD6] dark:hover:text-blue-400 transition-colors block text-left"
                                                        >
                                                            {l.user?.name}
                                                        </button>
                                                        {l.user?.employeeProfile?.employeeId && (
                                                            <p className="text-[11.5px] text-[#717E95] font-mono-numbers">{l.user.employeeProfile.employeeId}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-[13px] px-[22px] translate-x-[30px]">
                                                <span className="px-2.5 py-1 rounded-[3px] text-[11px] font-bold bg-[#F1F3F7] dark:bg-gray-800 text-[#5B6472] dark:text-gray-300">
                                                    {l.leaveType?.code || 'LV'}
                                                </span>
                                            </td>
                                            <td className="py-[13px] px-[22px] text-xs text-[#5B6472] dark:text-gray-300 font-mono-numbers">
                                                {new Date(l.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(l.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </td>
                                            <td
                                                onClick={() => setSelectedLeaveForReason(l)}
                                                className="py-[13px] px-[22px] text-xs text-[#5B6472] dark:text-gray-300 max-w-xs truncate italic cursor-pointer hover:text-[#2C4FD6] dark:hover:text-blue-400 transition-all translate-x-[10px]"
                                                title="Click to view full reason"
                                            >
                                                "{l.reason}"
                                            </td>
                                            <td className="py-[13px] px-[22px] translate-x-[15px]">
                                                <span className={`pill inline-block px-[10px] py-[3px] rounded-[3px] text-[11.5px] font-semibold tracking-wide ${l.status === 'APPROVED'
                                                    ? 'bg-[#E4F5EC] text-[#1F8A5A]'
                                                    : l.status === 'REJECTED'
                                                        ? 'bg-[#FBE7E7] text-[#DE350B]'
                                                        : 'bg-[#FBF0E1] text-[#D97706]'
                                                    }`}>
                                                    {l.status === 'APPROVED' ? 'Approved' : l.status === 'REJECTED' ? 'Rejected' : 'Pending'}
                                                </span>
                                            </td>
                                            <td className="py-[13px] px-[22px] text-right">
                                                {l.status === 'PENDING' ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleUpdateStatus(l.id, 'APPROVED')}
                                                            className="px-3.5 py-1.5 rounded-[3px] bg-[#E4F5EC] text-[#00875A] hover:bg-[#d5f0e1] text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <CheckCircle size={14} /> Approve
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setRejectingLeaveId(l.id);
                                                                setLeaveRejectComment('');
                                                            }}
                                                            className="px-3.5 py-1.5 rounded-[3px] bg-[#FBE7E7] text-[#DE350B] hover:bg-[#f7d6d6] text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <XIcon size={14} /> Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end pr-[71px]">
                                                        <button
                                                            onClick={() => setSelectedLeaveForReason(l)}
                                                            className="inline-flex items-center gap-[6px] border border-[#E2E6ED] dark:border-gray-800 rounded-[3px] px-[10px] py-[5px] text-[12px] font-semibold text-[#5B6472] dark:text-gray-300 bg-white dark:bg-[#12151C] hover:bg-gray-50 transition-all cursor-pointer"
                                                        >
                                                            <Eye size={13} className="text-[#5B6472] dark:text-gray-300" /> View
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-[#9AA3B1] italic font-medium">No leave requests found matching your search.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-[#E2E6ED] dark:border-gray-800 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-[#9AA3B1] font-semibold text-xs uppercase">Rows per page:</span>
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="px-3 py-1 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[#12151C] dark:text-white text-xs font-semibold cursor-pointer"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-xs text-[#5B6472] dark:text-gray-400 font-semibold font-mono-numbers">
                                    Page {currentPage} of {totalPages || 1}
                                </span>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage === 1}
                                        className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white disabled:opacity-25 hover:bg-[#F7F8FA] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
                                        title="First Page"
                                    >
                                        <ChevronsLeft size={16} className="text-[#12151C] dark:text-white stroke-[2.5]" />
                                    </button>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white disabled:opacity-25 hover:bg-[#F7F8FA] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
                                        title="Previous Page"
                                    >
                                        <ChevronLeft size={16} className="text-[#12151C] dark:text-white stroke-[2.5]" />
                                    </button>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white disabled:opacity-25 hover:bg-[#F7F8FA] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
                                        title="Next Page"
                                    >
                                        <ChevronRight size={16} className="text-[#12151C] dark:text-white stroke-[2.5]" />
                                    </button>

                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white disabled:opacity-25 hover:bg-[#F7F8FA] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
                                        title="Last Page"
                                    >
                                        <ChevronsRight size={16} className="text-[#12151C] dark:text-white stroke-[2.5]" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showApplyModal && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/20 dark:bg-black/60 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white dark:bg-[#12151C] rounded-[6px] w-full max-w-lg overflow-hidden relative border border-[#E2E6ED] dark:border-gray-800">
                        <div className="bg-[#F7F8FA] dark:bg-white/5 p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-bold text-[#12151C] dark:text-white">Apply for Leave</h3>
                                <p className="text-xs text-[#5B6472] dark:text-gray-400 mt-0.5">Submit a new leave request for approval</p>
                            </div>
                            <button onClick={() => setShowApplyModal(false)} className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer" disabled={submitting}>
                                <XCircle size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">Leave Type</label>
                                    <select
                                        value={leaveType}
                                        onChange={(e) => handleLeaveTypeChange(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white transition-all cursor-pointer font-medium"
                                        required
                                    >
                                        <option value="CL">Casual Leave (CL)</option>
                                        <option value="HD">Half Day (HD)</option>
                                        <option value="SHL">Short Leave (SHL)</option>
                                        <option value="EL">Earned Leave (EL)</option>
                                        <option value="SL">Sick Leave (SL)</option>
                                        <option value="LWP">Leave Without Pay (LWP)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">Reason</label>
                                    <input
                                        type="text"
                                        placeholder="Vacation, Personal..."
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Date Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">
                                        {['HD', 'SHL'].includes(leaveType) ? 'Leave Date' : 'From Date'}
                                    </label>
                                    <input
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={fromDate}
                                        onChange={(e) => handleFromDateChange(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">
                                        {['HD', 'SHL'].includes(leaveType) ? 'Leave Duration Type' : 'To Date'}
                                    </label>
                                    {['HD', 'SHL'].includes(leaveType) ? (
                                        <div className="px-3 py-2 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] text-[13px] font-semibold text-[#2C4FD6] dark:text-blue-400 flex items-center justify-between h-[39px]">
                                            <span>{leaveType === 'HD' ? 'Half Day (Single Day)' : 'Short Leave (Single Day)'}</span>
                                            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-[#E8ECFC] dark:bg-blue-950/40 text-[#2C4FD6] dark:text-blue-300">1 Day</span>
                                        </div>
                                    ) : (
                                        <input
                                            type="date"
                                            min={fromDate || new Date().toISOString().split('T')[0]}
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white"
                                            required
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Timing Section for Half Day & Short Leave */}
                            {['HD', 'SHL'].includes(leaveType) && (
                                <div className="bg-[#F7F9FC] dark:bg-white/[0.03] border border-[#D9E2FC] dark:border-gray-800 rounded-[8px] p-3.5 space-y-3 animate-fade-in">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-[#12151C] dark:text-white flex items-center gap-1.5">
                                            <Clock size={14} className="text-[#2C4FD6]" />
                                            {leaveType === 'HD' ? 'Half Day Time Slot' : 'Short Leave Timing'}
                                        </label>
                                        {fromTime && toTime && (() => {
                                            const dur = calculateDuration(fromTime, toTime);
                                            if (dur?.isValid) {
                                                return (
                                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E4F5EC] text-[#1F8A5A] dark:bg-green-950/40 dark:text-green-400 font-mono">
                                                        ⏱️ {dur.text} {leaveType === 'HD' ? '(0.5 Day)' : ''}
                                                    </span>
                                                );
                                            } else {
                                                return (
                                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FBE7E7] text-[#DE350B] dark:bg-red-950/40 dark:text-red-400">
                                                        Invalid Time Range
                                                    </span>
                                                );
                                            }
                                        })()}
                                    </div>

                                    {/* Manual Time Input Row */}
                                    <div className="grid grid-cols-2 gap-3 pt-1">
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-[#5B6472] dark:text-gray-300">From Time</label>
                                            <input
                                                type="time"
                                                value={fromTime}
                                                onChange={(e) => setFromTime(e.target.value)}
                                                className="w-full px-3 py-1.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13px] text-[#12151C] dark:text-white"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-[#5B6472] dark:text-gray-300">To Time</label>
                                            <input
                                                type="time"
                                                value={toTime}
                                                onChange={(e) => setToTime(e.target.value)}
                                                className="w-full px-3 py-1.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13px] text-[#12151C] dark:text-white"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {fromTime && toTime && !calculateDuration(fromTime, toTime)?.isValid && (
                                        <p className="text-[11.5px] text-[#DE350B] font-medium">
                                            ⚠️ "To Time" must be later than "From Time".
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowApplyModal(false)}
                                    className="flex-1 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 text-[#5B6472] dark:text-gray-300 font-semibold text-[13.5px] rounded-[6px] hover:bg-gray-50 transition-all cursor-pointer"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-[13.5px] rounded-[6px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    disabled={submitting}
                                >
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
            {showFilterDrawer &&
                createPortal(
                    <div className="fixed inset-0 z-[999999]">
                        {/* Overlay */}
                        <div
                            className="absolute inset-0 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md"
                            onClick={() => setShowFilterDrawer(false)}
                        />

                        {/* Drawer */}
                        <div className="absolute right-0 top-0 w-full max-w-md h-full bg-white dark:bg-[#12151C] animate-slide-in-right border-l border-[#E2E6ED] dark:border-gray-800">
                            <div className="flex flex-col justify-between h-full p-6">
                                {/* TOP */}
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-bold text-[#12151C] dark:text-white">
                                            Advanced Search
                                        </h2>
                                        <button
                                            onClick={() => setShowFilterDrawer(false)}
                                            className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">Employee Name</label>
                                            <input
                                                type="text"
                                                placeholder="Search name..."
                                                value={filters.name}
                                                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">Leave Type</label>
                                            <select
                                                value={filters.leaveType}
                                                onChange={(e) => setFilters({ ...filters, leaveType: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white cursor-pointer"
                                            >
                                                <option value="All">All Types</option>
                                                <option value="CL">Casual Leave (CL)</option>
                                                <option value="EL">Earned Leave (EL)</option>
                                                <option value="SL">Sick Leave (SL)</option>
                                                <option value="LWP">Leave Without Pay (LWP)</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">Status</label>
                                            <select
                                                value={filters.status}
                                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                                className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white cursor-pointer"
                                            >
                                                <option value="All">All Status</option>
                                                <option value="PENDING">Pending</option>
                                                <option value="APPROVED">Approved</option>
                                                <option value="REJECTED">Rejected</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">From Date</label>
                                                <input
                                                    type="date"
                                                    value={filters.startDate}
                                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">To Date</label>
                                                <input
                                                    type="date"
                                                    value={filters.endDate}
                                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* BUTTONS */}
                                <div className="flex gap-3 pt-6 border-t border-[#E2E6ED] dark:border-gray-800">
                                    <button
                                        onClick={() => {
                                            const reset = {
                                                name: '',
                                                leaveType: 'All',
                                                status: 'All',
                                                startDate: '',
                                                endDate: ''
                                            };
                                            setFilters(reset);
                                            setAppliedFilters(reset);
                                        }}
                                        className="flex-1 py-2.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-300 font-semibold text-[13.5px] hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAppliedFilters(filters);
                                            setCurrentPage(1);
                                            setShowFilterDrawer(false);
                                        }}
                                        className="flex-1 py-2.5 rounded-[6px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-[13.5px] transition-all cursor-pointer"
                                    >
                                        Apply Search
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
            {selectedLeaveForReason && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="relative bg-white dark:bg-[#12151C] w-full max-w-md rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden p-6 animate-scale-in">
                        <div className="flex justify-between items-center mb-5 border-b border-[#E2E6ED] dark:border-gray-800 pb-3">
                            <h3 className="text-base font-bold text-[#12151C] dark:text-white">Leave Details</h3>
                            <button type="button" onClick={() => setSelectedLeaveForReason(null)} className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer">
                                <XCircle size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Employee Name</label>
                                <div className="p-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] font-semibold text-xs text-[#12151C] dark:text-white">
                                    {selectedLeaveForReason.user?.name}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Leave Type</label>
                                    <div className="p-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] font-semibold text-xs text-[#12151C] dark:text-white">
                                        {selectedLeaveForReason.leaveType?.name || selectedLeaveForReason.leaveType?.code || 'Leave'}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Status</label>
                                    <div className="p-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] font-semibold text-xs text-[#12151C] dark:text-white capitalize">
                                        {selectedLeaveForReason.status?.toLowerCase()}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Leave Duration</label>
                                <div className="p-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] font-semibold text-xs text-[#12151C] dark:text-white font-mono-numbers">
                                    {new Date(selectedLeaveForReason.startDate).toLocaleDateString()}
                                    {new Date(selectedLeaveForReason.startDate).toDateString() !== new Date(selectedLeaveForReason.endDate).toDateString() && (
                                        ` - ${new Date(selectedLeaveForReason.endDate).toLocaleDateString()}`
                                    )}
                                </div>
                            </div>

                            {selectedLeaveForReason.fromTime && selectedLeaveForReason.toTime && (
                                <div>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Time Slot & Duration</label>
                                    <div className="p-2.5 bg-[#EEF2FF] dark:bg-blue-950/30 border border-[#D9E2FC] dark:border-blue-900/40 rounded-[6px] font-semibold text-xs text-[#2C4FD6] dark:text-blue-300 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={14} className="shrink-0" />
                                            <span>{formatTime12h(selectedLeaveForReason.fromTime)} – {formatTime12h(selectedLeaveForReason.toTime)}</span>
                                        </div>
                                        {(() => {
                                            const dur = calculateDuration(selectedLeaveForReason.fromTime, selectedLeaveForReason.toTime);
                                            return dur?.isValid ? (
                                                <span className="bg-[#2C4FD6] text-white text-[11px] px-2 py-0.5 rounded font-mono">
                                                    {dur.text}
                                                </span>
                                            ) : null;
                                        })()}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Reason for Leave</label>
                                <div className="p-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] text-xs text-[#12151C] dark:text-gray-300 leading-relaxed">
                                    <div className="max-h-[150px] overflow-y-auto custom-scrollbar break-all">
                                        {selectedLeaveForReason.reason}
                                    </div>
                                </div>
                            </div>

                            {selectedLeaveForReason.status === 'REJECTED' && selectedLeaveForReason.rejectionReason && (
                                <div>
                                    <label className="block text-xs font-semibold text-[#DE350B] mb-1">Manager's Rejection Reason</label>
                                    <div className="p-3 bg-[#FBE7E7] dark:bg-rose-950/20 border border-[#F5C2C2] dark:border-rose-800/30 rounded-[6px] text-xs text-[#DE350B] font-semibold leading-relaxed">
                                        <div className="max-h-[150px] overflow-y-auto custom-scrollbar break-all">
                                            {selectedLeaveForReason.rejectionReason}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedLeaveForReason(null)}
                                    className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold rounded-[6px] transition-all text-xs cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {rejectingLeaveId && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md animate-fade-in">
                    <div className="relative bg-white dark:bg-[#12151C] w-full max-w-md rounded-[6px] shadow-xl border border-[#E2E6ED] dark:border-gray-800 overflow-hidden p-6 animate-scale-in">
                        <h3 className="text-base font-bold text-[#12151C] dark:text-white mb-1">Reject Leave Request</h3>
                        <p className="text-xs text-[#5B6472] dark:text-gray-400 mb-4">Please provide a reason for rejecting this leave request.</p>
                        <form onSubmit={handleRejectLeaveSubmit}>
                            <textarea
                                value={leaveRejectComment}
                                onChange={(e) => setLeaveRejectComment(e.target.value)}
                                placeholder="Enter rejection reason..."
                                required
                                className="w-full px-3 py-2 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6] text-xs min-h-[90px] mb-4 placeholder-[#9AA3B1]"
                            />
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRejectingLeaveId(null)}
                                    className="flex-1 py-2.5 px-4 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 text-[#5B6472] dark:text-gray-300 font-semibold rounded-[6px] hover:bg-gray-50 transition-colors text-xs cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingLeaveReject}
                                    className="flex-1 py-2.5 px-4 bg-[#DE350B] text-white font-semibold rounded-[6px] hover:bg-[#b02a08] transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
                                >
                                    {submittingLeaveReject ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject'}
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
