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

  const [attendanceHistory, setAttendanceHistory] = useState<DailyLog[]>([]);

  // ✅ Reset stale data immediately when employee changes
  useEffect(() => {
    setAttendanceHistory([]);
    setStats({ present: 0, absent: 0, late: 0, holiday: 0 });
    setEmployeeName('');
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

        // Fetch employee details to get the real name
        try {
          const empRes = await api.get(`/employee/${id}`);
          setEmployeeName(empRes.data.name);
        } catch (err) {
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
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const log = historyData.find((l) => l.date === dateStr);
          const isWeekend =
            new Date(year, month - 1, d).getDay() === 0 ||
            new Date(year, month - 1, d).getDay() === 6;

          if (log) {
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
          className="h-24 bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl"
        />
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const log = attendanceHistory.find((d) => d.date === dateStr);
      const isWeekend =
        new Date(year, month, day).getDay() === 0 ||
        new Date(year, month, day).getDay() === 6;
      const displayStatus: AttendanceStatus = log
        ? log.status
        : isWeekend
        ? 'Weekend'
        : 'Absent';
      const isToday =
        day === new Date().getDate() &&
        month === new Date().getMonth() &&
        year === new Date().getFullYear();

      days.push(
        <div
          key={day}
          className={`h-24 p-2 rounded-xl border transition-shadow hover:shadow-md ${
            isToday
              ? 'border-brand-500 ring-1 ring-brand-500'
              : 'border-gray-100 dark:border-white/10'
          } bg-white dark:bg-brand-800`}
        >
          {/* Day number + Status badge */}
          <div className="flex justify-between items-start">
            <span
              className={`text-sm font-semibold ${
                isToday
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {day}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusColor(displayStatus)}`}
            >
              {displayStatus}
            </span>
          </div>

          {/* Punch times */}
          {log && log.inTime && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <LogIn size={10} />
                {new Date(log.inTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </div>
              <div className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
                <LogOut size={10} />
                {log.outTime
                  ? new Date(log.outTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
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

  return (
    <div className="animate-fade-in-up pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white dark:bg-brand-900 border border-gray-100 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-sm"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-brand-900 p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4">
            <CheckCircle size={20} />
          </div>
          <h4 className="text-2xl font-bold text-gray-800 dark:text-white">
            {stats.present}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mt-1">
            Present Days
          </p>
        </div>

        <div className="bg-white dark:bg-brand-900 p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mb-4">
            <AlertCircle size={20} />
          </div>
          <h4 className="text-2xl font-bold text-gray-800 dark:text-white">
            {stats.absent}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mt-1">
            Absents
          </p>
        </div>

        <div className="bg-white dark:bg-brand-900 p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mb-4">
            <Clock size={20} />
          </div>
          <h4 className="text-2xl font-bold text-gray-800 dark:text-white">
            {stats.late}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mt-1">
            Late Marks
          </p>
        </div>

        <div className="bg-white dark:bg-brand-900 p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4">
            <Coffee size={20} />
          </div>
          <h4 className="text-2xl font-bold text-gray-800 dark:text-white">
            {stats.holiday}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase mt-1">
            Holidays
          </p>
        </div>
      </div>

      {/* Monthly Calendar */}
      <div className="bg-white dark:bg-brand-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Calendar size={20} className="text-brand-500" /> Monthly Log
          </h3>

          <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() =>
                setSelectedMonth(
                  new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
                )
              }
              className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors"
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
              className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
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
            <div className="absolute inset-0 bg-white/60 dark:bg-brand-900/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
              <Loader2 className="animate-spin text-brand-500" size={40} />
            </div>
          )}
          {generateCalendarDays()}
        </div>
      </div>
    </div>
  );
}