/* eslint-disable @typescript-eslint/no-explicit-any */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, TrendingUp, Users, DollarSign, Calendar, ChevronDown, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const COLORS = ['#8b5cf6', '#3b82f6', '#ec4899', '#f97316'];

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
    return (
        <div className="animate-fade-in-up pb-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Reports & Analytics</h2>
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
    <p className="text-gray-500 dark:text-gray-400">
        Comprehensive insights into workforce performance and payroll.
    </p>

    <div className="relative z-30">
        <button
            onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
            }}
            className="flex items-center justify-between gap-3 px-5 py-3 bg-white dark:bg-brand-800 hover:bg-gray-50 dark:hover:bg-brand-900 border border-gray-200 dark:border-brand-700 rounded-2xl text-gray-700 dark:text-white font-bold cursor-pointer shadow-md dark:shadow-lg dark:shadow-brand-500/10 outline-none transition-all duration-300 min-w-[180px] hover:border-brand-500 dark:hover:border-brand-500"
        >
            <div className="flex items-center gap-2">
                <selectedOption.icon size={18} className="text-brand-500" />
                <span>{selectedOption.label}</span>
            </div>
            <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} text-gray-400`} />
        </button>

        {isOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-brand-900 border border-gray-100 dark:border-brand-700/50 rounded-2xl shadow-xl dark:shadow-brand-500/5 py-2 z-50 animate-fade-in focus:outline-none overflow-hidden">
                {options.map((opt) => {
                    const isSelected = opt.value === period;
                    return (
                        <button
                            key={opt.value}
                            onClick={() => {
                                setPeriod(opt.value);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all text-left border-0 outline-none cursor-pointer ${
                                isSelected
                                    ? 'bg-brand-50 dark:bg-white/5 text-brand-600 dark:text-brand-400'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 bg-transparent'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${opt.color}`}>
                                <opt.icon size={16} />
                            </div>
                            <span className="flex-1">{opt.label}</span>
                            {isSelected && (
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            )}
                        </button>
                    );
                })}
            </div>
        )}
    </div>
</div>
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-brand-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">Total Payroll</p>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">₹ {stats?.totalPayroll || 0}</h3>
                        </div>
                        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-medium text-green-600">
                        <TrendingUp size={14} /> {stats?.payrollGrowth || '0%'} {
                            period === 'weekly' ? 'from last week' :
                            period === 'this month' || period === 'monthly' ? 'from last month' :
                            period === 'quarter' ? 'from last quarter' :
                            period === 'semi-annual' ? 'from last 6 months' :
                            period === 'annual' ? 'from last year' : 'from last month'
                        }
                    </div>
                </div>

                <div className="bg-white dark:bg-brand-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">Avg. Attendance</p>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{stats?.avgAttendance || 0}%</h3>
                        </div>
                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-medium text-blue-600">
                        <TrendingUp size={14} /> {stats?.attendanceTrend || 'No data'}
                    </div>
                </div>

                <div className="bg-white dark:bg-brand-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">Pending Leaves</p>
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{stats?.pendingLeaves || 0}</h3>
                        </div>
                        <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                            <Calendar size={20} />
                        </div>
                    </div>
                    <div className="mt-4 text-xs font-medium text-orange-600">
                        {stats?.leaveStatus || 'No data'}
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Attendance Chart */}
                <div className="bg-white dark:bg-brand-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-6 capitalize">{period} Attendance</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: 'none',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                    labelStyle={{ color: '#9CA3AF', fontWeight: 'bold' }}
                                    itemStyle={{ color: '#ffffff' }}
                                />
                                <Bar dataKey="present" stackId="a" fill="#8b5cf6" radius={[0, 0, 4, 4]} barSize={40} />
                                <Bar dataKey="absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payroll Distribution */}
                <div className="bg-white dark:bg-brand-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <h3 className="font-bold text-gray-800 dark:text-white mb-6">Department Payroll</h3>
                    <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={payrollData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {Array.isArray(payrollData) && payrollData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: 'none',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                    itemStyle={{ color: '#ffffff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2 ml-4">
                            {Array.isArray(payrollData) && payrollData.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Exports */}
            <div className="bg-brand-600 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-4">Generate Reports</h3>                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div
                            onClick={() => downloadFile('/reports/export/attendance', `${period.replace(/\s+/g, '_')}_attendance.csv`)}
                            className="bg-white/10 hover:bg-white/20 transition-colors p-4 rounded-xl cursor-pointer backdrop-blur-sm border border-white/10"
                        >
                            <FileText size={24} className="mb-3 opacity-80" />
                            <h4 className="font-bold text-sm capitalize">{period} Attendance</h4>
                            <p className="text-xs opacity-70 mt-1">Download CSV</p>
                        </div>
                        <div
                            onClick={() => downloadFile('/reports/export/salary', `${period.replace(/\s+/g, '_')}_salary.csv`)}
                            className="bg-white/10 hover:bg-white/20 transition-colors p-4 rounded-xl cursor-pointer backdrop-blur-sm border border-white/10"
                        >
                            <DollarSign size={24} className="mb-3 opacity-80" />
                            <h4 className="font-bold text-sm capitalize">{period} Salary Register</h4>
                            <p className="text-xs opacity-70 mt-1">Download CSV</p>
                        </div>
                        <div
                            onClick={() => downloadFile('/reports/export/leave', `${period.replace(/\s+/g, '_')}_leave.xlsx`)}
                            className="bg-white/10 hover:bg-white/20 transition-colors p-4 rounded-xl cursor-pointer backdrop-blur-sm border border-white/10"
                        >
                            <Calendar size={24} className="mb-3 opacity-80" />
                            <h4 className="font-bold text-sm capitalize">{period} Leave Balance</h4>
                            <p className="text-xs opacity-70 mt-1">Download Excel</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
