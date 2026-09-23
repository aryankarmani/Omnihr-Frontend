import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowLeft,
  User
} from 'lucide-react';

import api from '../utils/api';
import { AttendanceSkeleton } from '../components/common/SkeletonLoaders';

type AttendanceStatus =
  | 'Present'
  | 'Absent'
  | 'Late'
  | 'Half Day'
  | 'Holiday'
  | 'Weekend';

interface DailyLog {
  date: string;
  inTime?: string;
  outTime?: string;
  status: AttendanceStatus;
}

export default function EmployeeAttendanceView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState<string>('');

  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    holiday: 0
  });
  const [joiningDate, setJoiningDate] = useState<Date | null>(null);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<DailyLog[]>([]);

  const formatTime12h = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '--:--';
    }
  };

  // Reset stale data immediately when employee changes
  useEffect(() => {
    setAttendanceHistory([]);
    setLeaves([]);
    setStats({ present: 0, absent: 0, late: 0, holiday: 0 });
    setEmployeeName('');
    setJoiningDate(null);
  }, [id]);

  // Fetch attendance data
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth() + 1;

        // Fetch attendance history
        const res = await api.get(
          `/attendance/history?employeeId=${id}&year=${year}&month=${month}`
        );
        const historyData: DailyLog[] = res.data;
        setAttendanceHistory(historyData);

        // Fetch leaves
        let leavesData: any[] = [];
        try {
          const leavesRes = await api.get(`/leave/history?employeeId=${id}`);
          leavesData = Array.isArray(leavesRes.data) ? leavesRes.data : [];
          setLeaves(leavesData);
        } catch {
          setLeaves([]);
        }

        // Fetch holidays
        const holidayRes = await api.get('/masters/holidays');
        setHolidays(holidayRes.data);
        const holidayData = holidayRes.data;

        let effectiveJoiningDate = joiningDate;
        try {
          const empRes = await api.get(`/employee/${id}`);
          setEmployeeName(empRes.data.name);
          const jd = empRes.data.employeeProfile?.joiningDate || empRes.data.createdAt;
          if (jd) {
            effectiveJoiningDate = new Date(jd);
            setJoiningDate(effectiveJoiningDate);
          }
        } catch {
          setEmployeeName(`Employee #${id}`);
        }

        // Stats calculation
        const newStats = { present: 0, absent: 0, late: 0, holiday: 0 };
        const daysInMonth = new Date(year, month, 0).getDate();
        const today = new Date();
        const isCurrentMonth =
          today.getFullYear() === year && today.getMonth() + 1 === month;
        const endDay = isCurrentMonth ? Math.min(today.getDate() - 1, daysInMonth) : daysInMonth;

        for (let d = 1; d <= endDay; d++) {
          const currentLoopDate = new Date(year, month - 1, d);
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

          if (effectiveJoiningDate) {
            const jdCopy = new Date(effectiveJoiningDate);
            jdCopy.setHours(0, 0, 0, 0);
            if (currentLoopDate < jdCopy) continue;
          }

          const log = historyData.find((l) => l.date === dateStr);
          const isHoliday = holidayData.some((h: any) => h.date.split('T')[0] === dateStr);
          const isWeekend =
            currentLoopDate.getDay() === 0 ||
            currentLoopDate.getDay() === 6;
          const isApprovedLeave = leavesData.some((l: any) => {
            if (l.status !== 'APPROVED') return false;
            const s = l.startDate ? l.startDate.split('T')[0] : '';
            const e = l.endDate ? l.endDate.split('T')[0] : '';
            return dateStr >= s && dateStr <= e;
          });

          if (isHoliday) {
            newStats.holiday++;
          } else if (log) {
            if (log.status === 'Present') {
              newStats.present++;
            } else if (log.status === 'Late') {
              newStats.present++;
              newStats.late++;
            } else if (log.status === 'Absent') {
              newStats.absent++;
            } else if (log.status === 'Holiday') {
              newStats.holiday++;
            }
          } else if (!isWeekend && !isApprovedLeave) {
            newStats.absent++;
          }
        }

        setStats(newStats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [id, selectedMonth]);

  const generateCalendarDays = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Empty slots for days before the 1st
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="cal-day aspect-square rounded-[6px] bg-transparent"
        />
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const log = attendanceHistory.find((d) => d.date === dateStr);
      const holiday = holidays.find(h => h.date.split('T')[0] === dateStr);
      const leave = leaves.find(l => {
        const s = l.startDate ? l.startDate.split('T')[0] : '';
        const e = l.endDate ? l.endDate.split('T')[0] : '';
        return dateStr >= s && dateStr <= e;
      });

      const currentLoopDate = new Date(year, month, day);
      currentLoopDate.setHours(0, 0, 0, 0);
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const isPastDay = currentLoopDate < todayMidnight;
      const isWeekend = currentLoopDate.getDay() === 0 || currentLoopDate.getDay() === 6;
      const isBeforeJoining = joiningDate && currentLoopDate < new Date(new Date(joiningDate).setHours(0, 0, 0, 0));
      const isApprovedLeave = !isBeforeJoining && leave && leave.status === 'APPROVED';
      const isAbsent = !isBeforeJoining && isPastDay && !isWeekend && !holiday && !isApprovedLeave && (!log || log.status === 'Absent');

      // Check if day has any activity
      const hasActivity = log || holiday || isApprovedLeave || isAbsent;

      // Empty day with no data - keep original clean minimal look with no border or box
      if (!hasActivity) {
        days.push(
          <div
            key={day}
            className="cal-day aspect-square rounded-[6px] bg-transparent flex items-center justify-center text-center transition-all"
          >
            <span className="font-mono font-bold text-[12.5px] text-[#9AA3B1]">{day}</span>
          </div>
        );
        continue;
      }

      // Color rules matching Attendance page design
      let containerBg = 'bg-transparent';
      let textColor = 'text-[#9AA3B1]';

      if (holiday) {
        containerBg = 'bg-purple-50 dark:bg-purple-900/20';
        textColor = 'text-purple-700 dark:text-purple-300';
      } else if (log && (log.status === 'Present' || log.status === 'Late' || log.status === 'Half Day')) {
        containerBg = 'bg-[#E4F5EC] dark:bg-green-950/30';
        textColor = 'text-[#1F8A5A] dark:text-green-400';
      } else if (isApprovedLeave) {
        containerBg = 'bg-[#E8ECFC] dark:bg-blue-950/30';
        textColor = 'text-[#2C4FD6] dark:text-blue-400';
      } else if (isAbsent) {
        containerBg = 'bg-[#FBE7E7] dark:bg-red-950/30';
        textColor = 'text-[#C13A3A] dark:text-red-400';
      }

      days.push(
        <div
          key={day}
          className={`cal-day aspect-square rounded-[6px] ${containerBg} p-1.5 sm:p-2 flex flex-col justify-between transition-all relative`}
        >
          {/* Top row: Day number and status badge */}
          <div className="flex items-start justify-between h-5 sm:h-6 shrink-0">
            <span className={`font-mono font-bold text-[12.5px] sm:text-[13.5px] leading-none pt-0.5 ${textColor}`}>
              {day}
            </span>
            <div className="flex items-start">
              {holiday ? (
                <span className="px-1.5 py-0.5 rounded-[3px] text-[8.5px] sm:text-[9.5px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 leading-none inline-block">
                  Holiday
                </span>
              ) : isApprovedLeave ? (
                <span className="px-1.5 py-0.5 rounded-[3px] text-[8.5px] sm:text-[9.5px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 leading-none inline-block">
                  Leave
                </span>
              ) : isAbsent ? (
                <span className="px-1.5 py-0.5 rounded-[3px] text-[8.5px] sm:text-[9.5px] font-medium bg-[#FBE7E7] text-[#C13A3A] dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800 leading-none inline-block">
                  Absent
                </span>
              ) : null}
            </div>
          </div>

          {/* Middle row: Punch In & Out times centered consistently across all cards */}
          <div className="space-y-0.5 text-left flex-1 flex flex-col justify-center my-auto">
            {holiday && !log?.inTime ? (
              <div className="text-[10px] sm:text-[11.5px] font-semibold text-purple-700 dark:text-purple-300 leading-snug line-clamp-2" title={holiday.name}>
                {holiday.name}
              </div>
            ) : null}

            {log?.inTime ? (
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-[#16A34A] dark:text-green-400 font-mono-numbers leading-tight truncate">
                <Clock size={10} className="text-[#16A34A] shrink-0" />
                <span>{formatTime12h(log.inTime).toLowerCase()}</span>
              </div>
            ) : null}
            {log?.outTime ? (
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-[#DC2626] dark:text-red-400 font-mono-numbers leading-tight truncate">
                <Clock size={10} className="text-[#DC2626] shrink-0" />
                <span>{formatTime12h(log.outTime).toLowerCase()}</span>
              </div>
            ) : log?.inTime ? (
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-[#DC2626] dark:text-red-400 font-mono-numbers leading-tight truncate">
                <Clock size={10} className="text-[#DC2626] shrink-0" />
                <span>--:--</span>
              </div>
            ) : null}
          </div>

          {/* Bottom row: Holiday label if any, or placeholder */}
          <div className="flex justify-end items-center h-5 shrink-0">
            {holiday && (
              <span className="text-[8.5px] sm:text-[9.5px] text-purple-700 dark:text-purple-300 font-medium truncate max-w-full">
                {holiday.name}
              </span>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  if (loading && attendanceHistory.length === 0) {
    return <AttendanceSkeleton />;
  }

  return (
    <div className="animate-fade-in-up pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#12151C] flex items-center justify-center text-[#5B6472] hover:text-[#12151C] dark:text-gray-400 dark:hover:text-white hover:bg-[#F7F8FA] dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-lg font-bold text-[#12151C] dark:text-white flex items-center gap-2 leading-tight">
            <User size={18} className="text-[#2C4FD6]" />
            {employeeName || `Employee #${id}`}
          </h2>
          <p className="text-xs text-[#5B6472] dark:text-gray-400 mt-0.5">
            Employee Attendance Overview
          </p>
        </div>
      </div>

      {/* Stats Cards - Connected continuous strip matching Attendance page (no middle gap) */}
      <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden mb-6 grid grid-cols-2 lg:grid-cols-4 divide-[#E2E6ED] dark:divide-gray-800">
        {/* Card 1: Present Days */}
        <div className="px-[18px] py-[16px] flex flex-col justify-start h-[130px] border-b sm:border-b-0 border-r border-[#E2E6ED] dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all">
          <div className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-[#F7F8FA] dark:bg-gray-800 flex items-center justify-center text-[#5B6472] dark:text-gray-300 mb-4">
            <CheckCircle size={16} />
          </div>
          <div>
            <div className="num text-[26px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight leading-none">
              {stats.present}
            </div>
            <p className="text-[12px] text-[#9AA3B1] mt-[2px]">Total Days Present</p>
          </div>
        </div>

        {/* Card 2: Absents */}
        <div className="px-[18px] py-[16px] flex flex-col justify-start h-[130px] border-b sm:border-b-0 lg:border-r border-[#E2E6ED] dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all">
          <div className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-[#F7F8FA] dark:bg-gray-800 flex items-center justify-center text-[#5B6472] dark:text-gray-300 mb-4">
            <AlertCircle size={16} />
          </div>
          <div>
            <div className="num text-[26px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight leading-none">
              {stats.absent}
            </div>
            <p className="text-[12px] text-[#9AA3B1] mt-[2px]">Total Days Absent</p>
          </div>
        </div>

        {/* Card 3: Late Marks */}
        <div className="px-[18px] py-[16px] flex flex-col justify-start h-[130px] border-r border-[#E2E6ED] dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all">
          <div className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-[#F7F8FA] dark:bg-gray-800 flex items-center justify-center text-[#5B6472] dark:text-gray-300 mb-4">
            <Clock size={16} />
          </div>
          <div>
            <div className="num text-[26px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight leading-none">
              {stats.late}
            </div>
            <p className="text-[12px] text-[#9AA3B1] mt-[2px]">Total Late Marks</p>
          </div>
        </div>

        {/* Card 4: Holidays */}
        <div className="px-[18px] py-[16px] flex flex-col justify-start h-[130px] hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all">
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
            <p className="text-[12px] text-[#9AA3B1] mt-[2px]">Total Holidays</p>
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
            <button
              onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}
              className="p-1 text-[#5B6472] hover:bg-[#EEF1F5] dark:hover:bg-gray-800 rounded-[6px] transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-[13.5px] text-[#12151C] dark:text-white font-mono-numbers select-none">
              {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}
              className="p-1 text-[#5B6472] hover:bg-[#EEF1F5] dark:hover:bg-gray-800 rounded-[6px] transition-colors cursor-pointer"
            >
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
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 mt-6 pt-4 border-t border-[#E2E6ED] dark:border-gray-800 text-xs text-[#5B6472] dark:text-gray-300">
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
    </div>
  );
}