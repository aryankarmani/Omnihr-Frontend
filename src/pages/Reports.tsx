 
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, TrendingUp, Users, Calendar, ChevronDown, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Reports() {
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [payrollData, setPayrollData] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});
    const [period, setPeriod] = useState('monthly');
    const [isOpen, setIsOpen] = useState(false);

    const options = [
        { value: 'weekly', label: 'Weekly', icon: Clock, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
        { value: 'this month', label: 'This Month', icon: Calendar, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
        { value: 'quarter', label: 'Quarter', icon: FileText, color: 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' },
        { value: 'semi-annual', label: 'Semi-Annual', icon: TrendingUp, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' },
        { value: 'annual', label: 'Annual', icon: Users, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' }
    ];

    const selectedOption = options.find(o => o.value === period) || options[1];

    useEffect(() => {
        if (!isOpen) return;
        const closeDropdown = () => setIsOpen(false);
        document.addEventListener('click', closeDropdown);
        return () => document.removeEventListener('click', closeDropdown);
    }, [isOpen]);
  
    const downloadFile = async (
        endpoint: string,
        filename: string
    ) => {
        try {
            const tenantId =
                sessionStorage.getItem('tenantId');

            const response = await api.get(endpoint, {
                responseType: 'blob',
                params: {
                    tenantId,
                    period
                }
            });

            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed:', err);
            toast.error('Download failed');
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res1 = await api.get('/reports/dashboard', { params: { period } });
                const res2 = await api.get('/reports/attendance', { params: { period } });
                const res3 = await api.get('/reports/payroll', { params: { period } });

                setStats(res1.data || {});
                setAttendanceData(res2.data?.data || res2.data || []);
                setPayrollData(res3.data?.data || res3.data || []);
            } catch (err) {
                console.error('Reports API error:', err);
            }
        };

        fetchData();
    }, [period]);

    // Calculate dynamic department payroll percentages
    const totalPayrollAmount = payrollData.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    const colorPalette = ['bg-[#2563EB]', 'bg-[#5B86E5]', 'bg-[#059669]', 'bg-[#C05621]', 'bg-[#9CA3AF]', 'bg-[#7C3AED]'];
    const departmentBreakdown = payrollData.map((item, idx) => {
        const value = Number(item.value) || 0;
        const percent = totalPayrollAmount > 0 ? Math.round((value / totalPayrollAmount) * 100) : 0;
        return {
            name: item.name || 'Other',
            value,
            percent,
            color: colorPalette[idx % colorPalette.length]
        };
    });

    return (
        <div className="animate-fade-in-up pb-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-[#12151C] dark:text-white mb-1">Reports & Analytics</h2>
                    <p className="text-sm text-[#5B6472] dark:text-gray-400">
                        Comprehensive insights into workforce performance and payroll.
                    </p>
                </div>

                <div className="relative z-30">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                        className="select-chip flex items-center justify-between gap-2 px-[12px] py-[9px] bg-white dark:bg-[#12151C] hover:bg-[#F7F8FA] dark:hover:bg-gray-800 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] text-[13px] font-semibold text-[#5B6472] dark:text-gray-300 cursor-pointer outline-none transition-all min-w-[130px]"
                    >
                        <span>{selectedOption.label}</span>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} text-[#9AA3B1]`} />
                    </button>

                    {isOpen && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] py-1 z-50 animate-fade-in overflow-hidden">
                            {options.map((opt) => {
                                const isSelected = opt.value === period;
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => {
                                            setPeriod(opt.value);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-all text-left cursor-pointer ${
                                            isSelected
                                                ? 'bg-[#E8ECFC] text-[#2C4FD6] dark:bg-blue-950/30'
                                                : 'text-[#12151C] dark:text-gray-300 hover:bg-[#F7F8FA] dark:hover:bg-white/5'
                                        }`}
                                    >
                                        <span>{opt.label}</span>
                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#2C4FD6]" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Top Contiguous KPI Panel (Unified 3-column Card with Dividers matching Image 5) */}
            <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden mb-6 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E2E6ED] dark:divide-gray-800">
                {/* Card 1: TOTAL PAYROLL */}
                <div className="p-6 flex flex-col justify-between h-[130px]">
                    <div className="flex justify-between items-start">
                        <span className="kpi-label text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-[.06em]">TOTAL PAYROLL</span>
                        <div className="w-7 h-7 rounded-[6px] bg-[#EEF1F5] dark:bg-gray-800 text-[#5B6472] dark:text-gray-300 flex items-center justify-center font-bold text-xs">
                            ₹
                        </div>
                    </div>
                    <div>
                        <div className="kpi-num text-[28px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight mb-[6px] leading-none">
                            ₹{stats?.totalPayroll !== undefined ? Number(stats.totalPayroll).toLocaleString('en-IN') : '0'}
                        </div>
                        <div className="kpi-trend up text-[12px] text-[#1F8A5A] flex items-center gap-1">
                            {stats?.payrollGrowth || '+4% from last month'}
                        </div>
                    </div>
                </div>

                {/* Card 2: AVG ATTENDANCE */}
                <div className="p-6 flex flex-col justify-between h-[130px]">
                    <div className="flex justify-between items-start">
                        <span className="kpi-label text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-[.06em]">AVG ATTENDANCE</span>
                        <div className="w-7 h-7 rounded-[6px] bg-[#EEF1F5] dark:bg-gray-800 text-[#5B6472] dark:text-gray-300 flex items-center justify-center">
                            <Clock size={15} />
                        </div>
                    </div>
                    <div>
                        <div className="kpi-num text-[28px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight mb-[6px] leading-none">
                            {stats?.avgAttendance !== undefined ? stats.avgAttendance : 0}%
                        </div>
                        <div className="kpi-trend up text-[12px] text-[#1F8A5A] flex items-center gap-1 ">
                            {stats?.attendanceTrend || '+2pts vs last month'}
                        </div>
                    </div>
                </div>

                {/* Card 3: PENDING LEAVES */}
                <div className="p-6 flex flex-col justify-between h-[130px]">
                    <div className="flex justify-between items-start">
                        <span className="kpi-label text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-[.06em]">PENDING LEAVES</span>
                        <div className="w-7 h-7 rounded-[6px] bg-[#EEF1F5] dark:bg-gray-800 text-[#5B6472] dark:text-gray-300 flex items-center justify-center">
                            <Calendar size={15} />
                        </div>
                    </div>
                    <div>
                        <div className="kpi-num text-[28px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight mb-[6px] leading-none">
                            {stats?.pendingLeaves ?? 0}
                        </div>
                        <div className="kpi-trend text-[12px] text-[#9AA3B1]">
                            {stats?.leaveStatus || 'No pending leaves'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Monthly Attendance Chart Card */}
                <div className="lg:col-span-7 bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6">
                    <span className="panel-title text-[15px] font-semibold text-[#12151C] dark:text-white block">Monthly Attendance</span>
                    <p className="panel-sub text-[12.5px] text-[#9AA3B1] dark:text-gray-400 mt-[12.5px] mb-[18px]">Average check-ins per week</p>

                    <div className="h-[230px]">
                        <ResponsiveContainer width="100%" height="100%">
                            {(() => {
                                const chartData = attendanceData;
                                if (!chartData || chartData.length === 0) {
                                    return (
                                        <div className="flex items-center justify-center h-full text-xs text-[#9AA3B1]">
                                            No attendance records found for this period
                                        </div>
                                    );
                                }
                                return (
                                    <BarChart data={chartData} margin={{ top: 10, right: 5, left: 5, bottom: 0 }} barCategoryGap="4%">
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9AA3B1', fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace' }}
                                            dy={8}
                                        />
                                        <YAxis hide domain={[0, 100]} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{
                                                backgroundColor: '#12151C',
                                                border: '1px solid #E2E6ED',
                                                borderRadius: '6px',
                                                color: '#ffffff',
                                                fontSize: '11px',
                                                fontFamily: 'Instrument Sans, sans-serif'
                                            }}
                                        />
                                        <Bar dataKey="present" radius={[12, 12, 12, 12]} barSize={110}>
                                            {chartData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={(entry.present || 0) >= 1 ? '#2C4FD6' : '#EEF2F8'}
                                                    className="transition-all duration-200"
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                );
                            })()}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Department Payroll Breakdown Card */}
                <div className="lg:col-span-5 bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6 flex flex-col justify-between">
                    <div>
                        <span className="panel-title text-[15px] font-semibold text-[#12151C] dark:text-white block">Department Payroll</span>
                        <p className="panel-sub text-[12.5px] text-[#9AA3B1] dark:text-gray-400 mt-[12.5px] mb-[18px]">Share of total spend</p>

                        {/* Legend Rows */}
                        <div className="space-y-3.5">
                            {departmentBreakdown.length === 0 ? (
                                <p className="text-xs text-[#9AA3B1] py-4 text-center">No payroll breakdown data available</p>
                            ) : (
                                departmentBreakdown.map((dept) => (
                                    <div key={dept.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-3 h-3 rounded-[4px] ${dept.color}`}></span>
                                            <span className="dept-name text-[13px] font-medium text-[#12151C] dark:text-white">{dept.name}</span>
                                        </div>
                                        <span className="text-[13px] font-semibold text-[#12151C] dark:text-white font-mono-numbers">{dept.percent}%</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Bottom Multi-segment Stacked Bar */}
                    <div className="h-2 w-full rounded-full overflow-hidden flex bg-[#EEF1F5] dark:bg-gray-800 mt-6">
                        {departmentBreakdown.map((dept) => (
                            <div key={dept.name} className={`${dept.color} h-full`} style={{ width: `${dept.percent}%` }}></div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hidden Export Triggers */}
            <div className="hidden">
                <button onClick={() => downloadFile('/reports/export/attendance', 'attendance.csv')}>Export Attendance</button>
            </div>
        </div>
    );
}
