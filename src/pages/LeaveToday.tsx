import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Mail, Phone, Loader2, ArrowLeft, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function LeaveToday() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [employeesOnLeave, setEmployeesOnLeave] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchLeaves = async () => {
            try {

                const res = await api.get('/leave/history?all=true');
                const today = new Date().toISOString().split('T')[0];

                const onLeaveToday = res.data.filter((leave: any) => {
                    const start = new Date(leave.startDate).toISOString().split('T')[0];
                    const end = new Date(leave.endDate).toISOString().split('T')[0];
                    return today >= start && today <= end && leave.status === 'APPROVED';
                });


                setEmployeesOnLeave(onLeaveToday);
            } catch (error) {
                console.error('Error fetching leave data:', error);
                toast.error('Failed to load leave data');
            } finally {
                setLoading(false);
            }
        };
        fetchLeaves();
    }, []);

    const filteredLeaves = employeesOnLeave.filter(leave => {
        const name = leave.user?.name || '';
        const email = leave.user?.email || '';
        return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            email.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="animate-fade-in-up">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">On Leave Today</h2>
                        <p className="text-gray-500 dark:text-gray-400">List of employees currently away</p>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="px-4 py-2 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 rounded-xl text-orange-700 dark:text-orange-400 font-bold flex items-center gap-2">
                        <UserMinus size={18} />
                        {employeesOnLeave.length} Employees
                    </div>
                </div>
            </div>


            <div className="bg-white dark:bg-brand-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-gray-800 dark:text-white"
                    />
                </div>
            </div>


            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-brand-900 rounded-3xl border border-gray-100 dark:border-white/5">
                    <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">Fetching leave data...</p>
                </div>
            ) : filteredLeaves.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-brand-900 rounded-3xl border border-gray-100 dark:border-white/5">
                    <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">No One on Leave</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Everyone seems to be working today!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredLeaves.map((leave, index) => {
                        const emp = leave.user || {};
                        const profile = emp.employeeProfile || {};
                        const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
                        const avatarColor = colors[index % colors.length];

                        return (
                            <div key={leave.id} className="bg-white dark:bg-brand-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">

                                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>

                                <div className="flex flex-col justify-between h-full p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${avatarColor}`}>
                                                {emp.name ? emp.name.split(' ').map((n: string) => n[0]).join('') : '?'}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 dark:text-white text-lg">{emp.name}</h3>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm">{profile.title || 'Employee'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                            <Calendar size={16} className="text-orange-500" />
                                            <span className="font-bold">{leave.leaveType?.code || 'Leave'}</span>
                                            <span className="text-gray-400">•</span>
                                            <span>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                            <Mail size={16} className="text-gray-400" />
                                            {emp.email}
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 italic">
                                            "{leave.reason}"
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400 shadow-sm">
                                            On Leave
                                        </span>

                                        <button
                                            onClick={() => navigate(`/employee/${emp.id}`)}
                                            className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline flex items-center gap-1"
                                        >
                                            View Profile
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
