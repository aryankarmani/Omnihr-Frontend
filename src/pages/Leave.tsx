import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, XCircle, Loader2, CheckCircle, XIcon, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { createPortal } from 'react-dom';

export default function Leave() {
    const { user } = useAuth();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'MY_LEAVE' | 'APPROVALS'>('MY_LEAVE');

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Dynamic Data State
    const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
    const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
    const [allLeaves, setAllLeaves] = useState<any[]>([]);
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
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const isHrAdmin = user?.role === 'HR_ADMIN';

    const fetchData = async () => {
        setLoading(true);
        try {
            const requests = [
                api.get('/leave/balances'),
                api.get('/leave/history'),
                api.get('/masters/holidays')
            ];

            if (isHrAdmin) {
                requests.push(api.get('/leave/history?all=true'));
            }

            const [balancesRes, historyRes, holidaysRes, allLeavesRes] = await Promise.all(requests);
            setLeaveBalances(balancesRes.data);
            setLeaveHistory(historyRes.data);
            setHolidays(holidaysRes.data);
            if (allLeavesRes) {
                setAllLeaves(allLeavesRes.data);
            }
        } catch (error) {
            console.error('Error fetching leave data:', error);
            toast.error('Failed to load leave records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [isHrAdmin]);

    const handleApplyLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.post('/leave/apply', {
                leaveTypeCode: leaveType,
                startDate: fromDate,
                endDate: toDate,
                reason
            });
            toast.success('Leave application submitted!');
            setShowApplyModal(false);
            fetchData();
        } catch (error: any) {
            console.error('Apply leave error:', error);
            toast.error(error.response?.data?.message || 'Failed to submit leave request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (leaveId: number, status: 'APPROVED' | 'REJECTED') => {
        try {
            await api.put(`/leave/${leaveId}/status`, { status });
            toast.success(`Leave ${status.toLowerCase()} successfully`);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Failed to ${status.toLowerCase()} leave`);
        }
    };

    // Filter Logic for Approvals
    const filteredLeaves = allLeaves.filter(l => {
        const matchesName = !appliedFilters.name ||
            l.user?.name.toLowerCase().includes(appliedFilters.name.toLowerCase());
        const matchesType = appliedFilters.leaveType === 'All' ||
            l.leaveType?.code === appliedFilters.leaveType;
        const matchesStatus = appliedFilters.status === 'All' ||
            l.status === appliedFilters.status;

        // Date range filtering
        const leaveStart = new Date(l.startDate);
        const leaveEnd = new Date(l.endDate);

        const matchesStart = !appliedFilters.startDate ||
            leaveStart >= new Date(appliedFilters.startDate);
        const matchesEnd = !appliedFilters.endDate ||
            leaveEnd <= new Date(appliedFilters.endDate);

        return matchesName && matchesType && matchesStatus && matchesStart && matchesEnd;
    });

    // Helper to check if a date string matches a leave or holiday
    const getDateStatus = (dateStr: string) => {
        // Normalize date comparison by splitting at T
        const holiday = holidays.find(h => h.date.split('T')[0] === dateStr);
        if (holiday) return { type: 'Holiday', label: holiday.name };

        const leave = leaveHistory.find(l => {
            const start = l.startDate.split('T')[0];
            const end = l.endDate.split('T')[0];
            return dateStr >= start && dateStr <= end;
        });
        if (leave) return { type: 'Leave', label: leave.leaveType?.code || 'LV', status: leave.status };

        return null;
    };

    const getLeaveTypeStyle = (code: string) => {
        switch (code) {
            case 'EL': return { color: 'text-purple-600', bg: 'bg-purple-100', darkBg: 'dark:bg-purple-900/30' };
            case 'CL': return { color: 'text-blue-600', bg: 'bg-blue-100', darkBg: 'dark:bg-blue-900/30' };
            case 'SL': return { color: 'text-pink-600', bg: 'bg-pink-100', darkBg: 'dark:bg-pink-900/30' };
            default: return { color: 'text-gray-600', bg: 'bg-gray-100', darkBg: 'dark:bg-white/10' };
        }
    };

    const generateCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        // Headers
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.push(
            <div key="headers" className="grid grid-cols-7 mb-2">
                {weekDays.map(d => <div key={d} className="text-center text-xs font-bold text-gray-400 uppercase py-2">{d}</div>)}
            </div>
        );

        const dayCells = [];

        // Empty slots
        for (let i = 0; i < startingDayOfWeek; i++) {
            dayCells.push(<div key={`empty-${i}`} className="h-20 sm:h-24 bg-gray-50/30 dark:bg-white/5 border border-transparent rounded-lg"></div>);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const status = getDateStatus(dateStr);
            const dayDate = new Date(year, month, day);
            const isToday = new Date().toDateString() === dayDate.toDateString();
            const isPast = dayDate < new Date(new Date().setHours(0, 0, 0, 0));
            const isSelected = selectedDate?.toDateString() === dayDate.toDateString();

            let bgClass = "bg-white dark:bg-brand-800";
            let statusBadge = null;

            if (status?.type === 'Holiday') {
                bgClass = "bg-purple-50 dark:bg-purple-900/20 border-purple-200";
                statusBadge = <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded truncate w-full block text-center mt-1">{status.label}</span>;
            } else if (status?.type === 'Leave') {
                const isApproved = status.status === 'APPROVED' || status.status === 'Approved';
                bgClass = isApproved ? "bg-green-50 dark:bg-green-900/20 border-green-200" : "bg-orange-50 dark:bg-orange-900/20 border-orange-200";
                statusBadge = <span className={`text-[10px] px-1.5 rounded w-full block text-center mt-1 ${isApproved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{status.label}</span>;
            } else if (isPast) {
                bgClass = "bg-gray-50/50 dark:bg-white/5 opacity-60 grayscale-[0.5]";
            }

            dayCells.push(
                <div
                    key={day}
                    onClick={() => {
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
                    className={`h-20 sm:h-24 p-2 rounded-xl border transition-all relative group ${bgClass} ${isSelected ? 'ring-2 ring-brand-500 z-10' : 'border-gray-100 dark:border-white/10'} ${!isPast || status ? 'cursor-pointer hover:border-brand-300' : 'cursor-not-allowed'}`}
                >
                    <div className="flex justify-between items-start">
                        <span className={`text-sm font-semibold ${isToday ? 'bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center -ml-1 -mt-1 shadow-md' : 'text-gray-700 dark:text-gray-300'}`}>{day}</span>
                    </div>
                    {statusBadge}

                    {!status && !isPast && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 dark:bg-black/50 backdrop-blur-[1px] rounded-xl">
                            <Plus size={20} className="text-brand-600 font-bold" />
                        </div>
                    )}
                </div>
            );
        }

        days.push(<div key="days" className="grid grid-cols-7 gap-2">{dayCells}</div>);
        return days;
    };

    if (loading && leaveBalances.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 size={48} className="text-brand-500 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading Leave Data...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up pb-8 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {activeTab === 'APPROVALS' ? 'Leave Approvals' : 'My Leave'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        {activeTab === 'APPROVALS' ? 'Review and manage employee leave requests.' : 'View balances and plan your holidays.'}
                    </p>
                </div>
                {activeTab === 'MY_LEAVE' && (
                    <button
                        onClick={() => setShowApplyModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/20 hover:bg-brand-700 active:scale-95 transition-all"
                    >
                        <Plus size={20} /> Apply Leave
                    </button>
                )}
            </div>

            {/* Balances Cards - Only show in My Leave view */}
            {activeTab === 'MY_LEAVE' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {leaveBalances.map((bal) => {
                        const style = getLeaveTypeStyle(bal.code);
                        return (
                            <div key={bal.code} onClick={() => { setLeaveType(bal.code); setShowApplyModal(true); }} className="bg-white dark:bg-brand-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden group cursor-pointer">
                                <div className={`absolute top-0 right-0 w-24 h-24 ${style.bg} rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500`}></div>

                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <h3 className="text-gray-800 dark:text-white text-sm font-bold uppercase opacity-90">{bal.name}</h3>
                                        <div className="mt-2 flex items-baseline gap-1">
                                          <span className="text-4xl font-bold text-gray-400 dark:text-white">{bal.balance}</span>
                                            <span className="text-gray-500 dark:text-white/80 text-sm">/ {bal.total}</span>
                                        </div>
                                    </div>
                                    <div className={`p-3 rounded-xl ${style.bg} ${style.color}`}>
                                        <CalendarIcon size={24} />
                                    </div>
                                </div>

                                <div className="mt-4 h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden relative z-10">
                                    <div className={`h-full rounded-full ${style.color.replace('text', 'bg')}`} style={{ width: `${(bal.balance / bal.total) * 100}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {activeTab === 'MY_LEAVE' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Calendar Section */}
                    <div className="lg:col-span-2 bg-white dark:bg-brand-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <CalendarIcon size={20} className="text-brand-500" /> Leave Calendar
                            </h3>
                            <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-1 rounded-xl">
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors">
                                    <ChevronLeft size={20} />
                                </button>
                                <span className="font-bold w-32 text-center select-none text-gray-700 dark:text-white">
                                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </span>
                                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors">
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                        {generateCalendar()}
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white dark:bg-brand-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">My Leave History</h3>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {leaveHistory.length > 0 ? leaveHistory.map(leave => {
                                    const isApproved = leave.status === 'APPROVED' || leave.status === 'Approved';
                                    return (
                                        <div key={leave.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-white/5">
                                            <div className={`mt-1 w-2 h-2 rounded-full ${isApproved ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-gray-800 dark:text-white text-sm">{leave.leaveType?.code} - {leave.reason}</h4>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isApproved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {leave.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(leave.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - {new Date(leave.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <p className="text-sm text-gray-500 text-center py-4">No leave records found.</p>
                                )}
                            </div>
                        </div>
                        {/* Dynamic Upcoming Holiday */}
                        {(() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const nextHoliday = [...holidays]
                                .filter(h => new Date(h.date) >= today)
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

                            if (!nextHoliday) return null;

                            const hDate = new Date(nextHoliday.date);
                            return (
                                <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-6 border border-purple-100 dark:border-purple-500/20 animate-fade-in">
                                    <h4 className="font-bold text-purple-800 dark:text-purple-200 mb-3 flex items-center gap-2">
                                        <CalendarIcon size={16} /> Upcoming Holiday
                                    </h4>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white dark:bg-purple-900/40 p-3 rounded-xl text-center min-w-[70px] shadow-sm">
                                            <span className="block text-[10px] font-black text-purple-400 uppercase tracking-widest">
                                                {hDate.toLocaleDateString('en-US', { month: 'short' })}
                                            </span>
                                            <span className="block text-2xl font-black text-purple-600 dark:text-purple-400">
                                                {hDate.getDate()}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-black text-gray-800 dark:text-white text-base leading-tight">
                                                {nextHoliday.name}
                                            </p>
                                            <p className="text-xs font-bold text-purple-500 mt-0.5 uppercase tracking-wider">
                                                {hDate.toLocaleDateString('en-US', { weekday: 'long' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-brand-900 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-white/5 min-h-[400px]">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Leave Requests Overview</h3>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search employee..."
                                    value={filters.name}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFilters({ ...filters, name: val });
                                        setAppliedFilters({ ...appliedFilters, name: val });
                                    }}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-sm text-gray-800 dark:text-white"
                                />
                            </div>
                            <div className="relative group/dropdown hidden sm:block">
                                <select
                                    value={filters.status}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFilters({ ...filters, status: val });
                                        setAppliedFilters({ ...appliedFilters, status: val });
                                    }}
                                    className="appearance-none px-4 py-2 bg-brand-600 dark:bg-brand-600/20 border-2 border-brand-500/50 rounded-xl text-white text-sm font-bold cursor-pointer transition-all hover:bg-brand-700 hover:border-brand-400 shadow-lg shadow-brand-500/20 focus:ring-4 focus:ring-brand-500/20 outline-none w-32 pr-8"
                                >
                                    <option value="All" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white font-bold">All Status</option>
                                    <option value="PENDING" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white font-bold">Pending</option>
                                    <option value="APPROVED" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white font-bold">Approved</option>
                                    <option value="REJECTED" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white font-bold">Rejected</option>
                                </select>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white transition-transform group-hover/dropdown:scale-110">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowFilterDrawer(true)}
                                className="p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-brand-500 hover:text-white transition-all shadow-sm flex items-center justify-center"
                            >
                                <Filter size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-50 dark:border-white/5">
                                    <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase">Employee</th>
                                    <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase">Type</th>
                                    <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase">Dates</th>
                                    <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase">Reason</th>
                                    <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase">Status</th>
                                    <th className="py-4 px-4 text-xs font-bold text-gray-400 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-white/5 font-medium">
                                {filteredLeaves.length > 0 ? (
                                    filteredLeaves.map(l => (
                                        <tr key={l.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="py-5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-300 text-xs font-bold uppercase">
                                                        {l.user?.name[0]}
                                                    </div>
                                                    <span className="text-gray-800 dark:text-gray-200">{l.user?.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-4">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getLeaveTypeStyle(l.leaveType?.code).bg} ${getLeaveTypeStyle(l.leaveType?.code).color}`}>
                                                    {l.leaveType?.code}
                                                </span>
                                            </td>
                                            <td className="py-5 px-4 text-sm text-gray-600 dark:text-gray-400">
                                                {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                                            </td>
                                            <td className="py-5 px-4 text-sm text-gray-600 dark:text-gray-400 italic">
                                                "{l.reason}"
                                            </td>
                                            <td className="py-5 px-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${l.status === 'APPROVED'
                                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                                    : l.status === 'REJECTED'
                                                        ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                                                    {l.status}
                                                </span>
                                            </td>
                                            <td className="py-5 px-4 text-right">
                                                {l.status === 'PENDING' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleUpdateStatus(l.id, 'APPROVED')}
                                                            className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors" title="Approve"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(l.id, 'REJECTED')}
                                                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Reject"
                                                        >
                                                            <XIcon size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-gray-500 italic">No leave requests found matching your search.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {showApplyModal && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-brand-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative border border-gray-100 dark:border-white/10">
                        <div className="bg-brand-600 p-6 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative z-10 flex justify-between items-center">
                                <h3 className="text-xl font-bold">Apply for Leave</h3>
                                <button onClick={() => setShowApplyModal(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors" disabled={submitting}>
                                    <XCircle size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Leave Type</label>
                                    <select
                                        value={leaveType}
                                        onChange={(e) => setLeaveType(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-brand-800 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500/50 outline-none text-gray-800 dark:text-white transition-all cursor-pointer"
                                        required
                                    >
                                        <option value="CL" className="bg-white dark:bg-brand-800 text-gray-900 dark:text-white">Casual Leave (CL)</option>
                                        <option value="EL" className="bg-white dark:bg-brand-800 text-gray-900 dark:text-white">Earned Leave (EL)</option>
                                        <option value="SL" className="bg-white dark:bg-brand-800 text-gray-900 dark:text-white">Sick Leave (SL)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Reason</label>
                                    <input
                                        type="text"
                                        placeholder="Vacation, Personal..."
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-brand-800 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500/50 outline-none text-gray-800 dark:text-white transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase">From Date</label>
                                    <input
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-brand-800 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500/50 outline-none text-gray-700 dark:text-gray-300 transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase">To Date</label>
                                    <input
                                        type="date"
                                        min={fromDate || new Date().toISOString().split('T')[0]}
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-brand-800 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500/50 outline-none text-gray-700 dark:text-gray-300 transition-all"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowApplyModal(false)}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition-all flex items-center justify-center gap-2"
                                    disabled={submitting}
                                >
                                    {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Submit Request'}
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
                            className="absolute inset-0 bg-black/40 backdrop-blur-md"
                            onClick={() => setShowFilterDrawer(false)}
                        />

                        {/* Drawer */}
                        <div className="absolute right-0 top-0 w-full max-w-md h-full bg-white dark:bg-brand-900 shadow-2xl animate-slide-in-right">
                            <div className="flex flex-col justify-between h-full p-6">
                                {/* TOP */}
                                <div>
                                    <div className="flex justify-between items-center mb-8">
                                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                            Advanced Search
                                        </h2>
                                        <button
                                            onClick={() => setShowFilterDrawer(false)}
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-400"
                                        >
                                            <XCircle size={20} />
                                        </button>
                                    </div>

                                    <div className="space-y-5">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Employee Name</label>
                                            <input
                                                type="text"
                                                placeholder="Search name..."
                                                value={filters.name}
                                                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-gray-800 dark:text-white"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Leave Type</label>
                                            <select
                                                value={filters.leaveType}
                                                onChange={(e) => setFilters({ ...filters, leaveType: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-gray-800 dark:text-white cursor-pointer"
                                            >
                                                <option value="All" className="dark:bg-brand-900">All Types</option>
                                                <option value="CL" className="dark:bg-brand-900">Casual Leave (CL)</option>
                                                <option value="EL" className="dark:bg-brand-900">Earned Leave (EL)</option>
                                                <option value="SL" className="dark:bg-brand-900">Sick Leave (SL)</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status</label>
                                            <select
                                                value={filters.status}
                                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-gray-800 dark:text-white cursor-pointer"
                                            >
                                                <option value="All" className="dark:bg-brand-900">All Status</option>
                                                <option value="PENDING" className="dark:bg-brand-900">Pending</option>
                                                <option value="APPROVED" className="dark:bg-brand-900">Approved</option>
                                                <option value="REJECTED" className="dark:bg-brand-900">Rejected</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">From Date</label>
                                                <input
                                                    type="date"
                                                    value={filters.startDate}
                                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-gray-700 dark:text-gray-300"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">To Date</label>
                                                <input
                                                    type="date"
                                                    value={filters.endDate}
                                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-brand-500/50 outline-none transition-all text-gray-700 dark:text-gray-300"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* BUTTONS */}
                                <div className="flex gap-3 pt-6 border-t border-gray-100 dark:border-white/5">
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
                                        className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                                    >
                                        Clear
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAppliedFilters(filters);
                                            setShowFilterDrawer(false);
                                        }}
                                        className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-lg shadow-brand-500/20 transition-all active:scale-95"
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
        </div>
    );
}
