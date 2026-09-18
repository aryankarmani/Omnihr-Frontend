 
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Coffee,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowLeft,
  LogIn,
  LogOut,
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
  const [setBackendStats] = useState<any>(null);

  const [attendanceHistory, setAttendanceHistory] = useState<DailyLog[]>([]);

  // ✅ Reset stale data immediately when employee changes
  useEffect(() => {
    setAttendanceHistory([]);
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

        // Fetch backend stats (for missedCheckinCount)
        try {
          const statsRes = await api.get(`/attendance/stats?employeeId=${id}&year=${year}&month=${month}`);
          setBackendStats(statsRes.data);
        } catch { console.log("Stats API not fully ready"); }

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
        const endDay = isCurrentMonth ? today.getDate() : daysInMonth;

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
          } else if (
            !isWeekend &&
            !(isCurrentMonth && d === today.getDate())
          ) {
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



  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'Present':
        return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300';
      case 'Absent':
        return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300';
      case 'Late':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300';
      case 'Holiday':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300';
      case 'Weekend':
        return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

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
          className="h-24 bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-[6px]"
        />
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const log = attendanceHistory.find((d) => d.date === dateStr);
      const holiday = holidays.find(h => h.date.split('T')[0] === dateStr);
      const currentLoopDate = new Date(year, month, day);
      const isWeekend = currentLoopDate.getDay() === 0 || currentLoopDate.getDay() === 6;
      const isBeforeJoining = joiningDate && currentLoopDate < new Date(new Date(joiningDate).setHours(0, 0, 0, 0));

      const displayStatus: AttendanceStatus = log
        ? log.status
        : holiday
          ? 'Holiday'
          : isWeekend
            ? 'Weekend'
            : isBeforeJoining
              ? 'Weekend'
              : 'Absent';

      const statusLabel = isBeforeJoining ? '-' : (holiday ? 'Holiday' : displayStatus);
      const isToday =
        day === new Date().getDate() &&
        month === new Date().getMonth() &&
        year === new Date().getFullYear();

      days.push(
        <div
          key={day}
          className={`h-24 p-2 rounded-[6px] border transition-shadow hover:shadow-md cursor-pointer ${isToday
            ? 'border-brand-500 ring-2 ring-brand-500 shadow-[0_0_15px_rgba(124,58,237,0.2)] z-10'
            : 'border-gray-100 dark:border-white/10'
            } ${holiday ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200' : 'bg-white dark:bg-brand-800'}`}
        >
          {/* Day number + Status badge */}
          <div className="flex justify-between items-start">
            <span
              className={`text-sm font-semibold ${isToday
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-gray-700 dark:text-gray-300'
                }`}
            >
              {day}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${holiday ? 'bg-purple-100 text-purple-700' : getStatusColor(displayStatus)}`}
            >
              {statusLabel}
            </span>
          </div>

          {holiday && (
            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-1 rounded-[6px] truncate w-full block text-center mt-1 font-bold">
              {holiday.name}
            </span>
          )}

          {/* Punch times */}
          {log && log.inTime && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <LogIn size={10} />
                {new Date(log.inTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </div>
              <div className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
                <LogOut size={10} />
                {log.outTime
                  ? new Date(log.outTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })
                  : '--:--'}
              </div>
            </div>
          )}
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white dark:bg-brand-900 border border-gray-100 dark:border-white/10 rounded-[6px] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <User size={22} className="text-brand-500" />
              {employeeName || `Employee #${id}`}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Employee Attendance Overview
            </p>
          </div>
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
            <p className="text-[12px] text-[#9AA3B1] mt-[2px]">Present Days</p>
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
            <p className="text-[12px] text-[#9AA3B1] mt-[2px]">Absents</p>
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
            <p className="text-[12px] text-[#9AA3B1] mt-[2px]">Late Marks</p>
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
            <p className="text-[12px] text-[#9AA3B1] mt-[2px]">Holidays</p>
          </div>
        </div>
      </div>

      {/* Monthly Calendar */}
      <div className="bg-white dark:bg-[#12151C] rounded-[6px] p-6 border border-[#E2E6ED] dark:border-gray-800 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Calendar size={20} className="text-brand-500" /> Monthly Log
          </h3>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-1 rounded-[6px]">
              <button
                onClick={() =>
                  setSelectedMonth(
                    new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
                  )
                }
                className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-[6px] transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="font-bold w-36 text-center select-none text-gray-700 dark:text-white">
                {selectedMonth.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
              <button
                onClick={() =>
                  setSelectedMonth(
                    new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)
                  )
                }
                className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-[6px] transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-px mb-2 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-xs font-bold text-gray-400 uppercase py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2 relative min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 bg-white/60 dark:bg-brand-900/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-[6px]">
              <Loader2 className="animate-spin text-brand-500" size={40} />
            </div>
          )}
          {generateCalendarDays()}
        </div>
      </div>

    </div>
  );
}