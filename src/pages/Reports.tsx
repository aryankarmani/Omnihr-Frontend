import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../utils/api';

const COLORS = ['#8b5cf6', '#3b82f6', '#ec4899', '#f97316'];

export default function Reports() {
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [payrollData, setPayrollData] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({});
    const [period, setPeriod] = useState('monthly');
  
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
                    tenantId
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

            alert('Download failed');
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res1 = await api.get('/reports/dashboard');
                const res2 = await api.get('/reports/attendance');
                const res3 = await api.get('/reports/payroll');

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

    <div className="relative group/dropdown">
        <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="appearance-none px-5 py-3 bg-white dark:bg-brand-800 hover:bg-gray-50 dark:hover:bg-brand-900 border border-gray-200 dark:border-brand-700 rounded-2xl text-gray-600 dark:text-white font-bold cursor-pointer shadow-sm dark:shadow-lg dark:shadow-brand-500/20 outline-none pr-12 transition-all"        >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarter">Quarter</option>
            <option value="semi-annual">Semi-Annual</option>
            <option value="annual">Annual</option>
        </select>

<div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
            </svg>
        </div>
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
                        <TrendingUp size={14} /> {stats?.payrollGrowth || '0%'} from last month
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
                    <h3 className="font-bold text-gray-800 dark:text-white mb-6">Weekly Attendance</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="present" stackId="a" fill="#8b5cf6" radius={[0, 0, 4, 4]} barSize={40} />
                                <Bar dataKey="absent" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} barSize={40} />
                                <Bar dataKey="late" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} barSize={40} />
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
                                <Tooltip />
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
                    <h3 className="text-xl font-bold mb-4">Generate Reports</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div
                            onClick={() => downloadFile('/reports/export/attendance', 'attendance.csv')}
                            className="bg-white/10 hover:bg-white/20 transition-colors p-4 rounded-xl cursor-pointer backdrop-blur-sm border border-white/10"
                        >
                            <FileText size={24} className="mb-3 opacity-80" />
                            <h4 className="font-bold text-sm">Monthly Attendance</h4>
                            <p className="text-xs opacity-70 mt-1">Download CSV</p>
                        </div>
                        <div
                            onClick={() => downloadFile('/reports/export/salary', 'salary.csv')}

                            className="bg-white/10 hover:bg-white/20 transition-colors p-4 rounded-xl cursor-pointer backdrop-blur-sm border border-white/10"
                        >
                            <DollarSign size={24} className="mb-3 opacity-80" />
                            <h4 className="font-bold text-sm">Salary Register</h4>
                            <p className="text-xs opacity-70 mt-1">Download CSV</p>
                        </div>
                        <div
                            onClick={() => downloadFile('/reports/export/leave', 'leave.xlsx')}
                            className="bg-white/10 hover:bg-white/20 transition-colors p-4 rounded-xl cursor-pointer backdrop-blur-sm border border-white/10"
                        >
                            <Calendar size={24} className="mb-3 opacity-80" />
                            <h4 className="font-bold text-sm">Leave Balance</h4>
                            <p className="text-xs opacity-70 mt-1">Download CSV</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
