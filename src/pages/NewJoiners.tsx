import { useState, useEffect } from 'react';
import { Search, Calendar, Mail, Loader2, ArrowLeft, UserCheck, Filter, X, LayoutGrid, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function NewJoiners() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [newJoiners, setNewJoiners] = useState<any[]>([]);
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Filter states
    const [filters, setFilters] = useState({
        name: '',
        email: '',
        role: '',
        location: '',
        status: 'All'
    });

    const [appliedFilters, setAppliedFilters] = useState({
        name: '',
        email: '',
        role: '',
        location: '',
        status: 'All'
    });

    useEffect(() => {
        const fetchJoiners = async () => {
            try {
                const res = await api.get('/employee');
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const joinersThisMonth = res.data.filter((emp: any) => {
                    if (!emp.employeeProfile?.joiningDate) return false;
                    const joinDate = new Date(emp.employeeProfile.joiningDate);
                    return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
                });

                setNewJoiners(joinersThisMonth);
            } catch (error) {
                console.error('Error fetching joiners data:', error);
                toast.error('Failed to load new joiners data');
            } finally {
                setLoading(false);
            }
        };
        fetchJoiners();
    }, []);

    const filteredJoiners = newJoiners.filter(emp => {
        const profile = emp.employeeProfile || {};
        const name = emp.name || '';
        const email = emp.email || '';
        const title = profile.title || '';
        const location = profile.location || '';
        const status = profile.status || 'Active';
        
        const matchesName = !appliedFilters.name || 
            name.toLowerCase().includes(appliedFilters.name.toLowerCase()) ||
            email.toLowerCase().includes(appliedFilters.name.toLowerCase()) ||
            title.toLowerCase().includes(appliedFilters.name.toLowerCase());
        const matchesEmail = !appliedFilters.email || email.toLowerCase().includes(appliedFilters.email.toLowerCase());
        const matchesRole = !appliedFilters.role || title.toLowerCase().includes(appliedFilters.role.toLowerCase());
        const matchesLocation = !appliedFilters.location || location.toLowerCase().includes(appliedFilters.location.toLowerCase());
        const matchesStatus = appliedFilters.status === 'All' || status === appliedFilters.status;

        return matchesName && matchesEmail && matchesRole && matchesLocation && matchesStatus;
    });

    const clearFilters = () => {
        const reset = { name: '', email: '', role: '', location: '', status: 'All' };
        setFilters(reset);
        setAppliedFilters(reset);
    };

    const applyFilters = () => {
        setAppliedFilters(filters);
        setShowFilterDrawer(false);
    };

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
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">New Joiners</h2>
                        <p className="text-gray-500 dark:text-gray-400">Employees who joined this month</p>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-2">
                        <UserCheck size={18} />
                        {newJoiners.length} New Joiners
                    </div>
                </div>
            </div>

            {/* Filters & Search - Matching EmployeeList EXACTLY */}
            <div className="bg-white dark:bg-brand-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, email or role..."
                        value={filters.name}
                        onChange={(e) => {
                            const val = e.target.value;
                            setFilters({ ...filters, name: val });
                            setAppliedFilters({ ...appliedFilters, name: val });
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-gray-800 dark:text-white"
                    />
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    {/* View Toggle */}
                    <div className="flex bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid' 
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' 
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'list' 
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' 
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                        >
                            <List size={20} />
                        </button>
                    </div>

                    {/* Status Dropdown */}
                    <div className="relative group/dropdown">
                        <select
                            value={filters.status}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFilters({ ...filters, status: val });
                                setAppliedFilters({ ...appliedFilters, status: val });
                            }}
                            className="appearance-none px-5 py-2.5 bg-brand-600 dark:bg-brand-600/20 border-2 border-brand-500/50 rounded-2xl text-white font-bold cursor-pointer transition-all hover:bg-brand-700 hover:border-brand-400 shadow-lg shadow-brand-500/20 focus:ring-4 focus:ring-brand-500/20 outline-none w-52 pr-10 font-bold"
                        >
                            <option value="All" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white font-bold">All Status</option>
                            <option value="Active" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white font-bold">Active</option>
                            <option value="Inactive" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white font-bold">Inactive</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white transition-transform group-hover/dropdown:scale-110">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowFilterDrawer(true)}
                        className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-600 dark:text-gray-300 hover:bg-brand-500 hover:text-white hover:scale-105 transition-all duration-200 shadow-sm flex items-center justify-center"
                    >
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            {/* Content Section */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-brand-900 rounded-3xl border border-gray-100 dark:border-white/5">
                    <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">Fetching data...</p>
                </div>
            ) : filteredJoiners.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-brand-900 rounded-3xl border border-gray-100 dark:border-white/5 shadow-inner">
                    <Calendar size={48} className="mx-auto text-gray-300 mb-4 opacity-50" />
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">No Employees Found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Try adjusting your filters or search term.</p>
                </div>
            ) : (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredJoiners.map((emp, index) => {
                            const profile = emp.employeeProfile || {};
                            const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
                            const avatarColor = colors[index % colors.length];

                            return (
                                <div 
                                    key={emp.id} 
                                    onClick={() => navigate(`/employee/${emp.id}`)}
                                    className="bg-white dark:bg-brand-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300 group relative overflow-hidden cursor-pointer hover:-translate-y-1.5 hover:border-brand-500/30"
                                >
                                    <div className={`absolute top-0 left-0 w-1 h-full ${(profile.status || 'Active') === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
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
                                                <Calendar size={16} className="text-gray-400" />
                                                Joined: {profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                                <Mail size={16} className="text-gray-400" />
                                                {emp.email}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all hover:scale-105 ${(profile.status || 'Active').toLowerCase() === 'active'
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                                }`}>
                                                {profile.status || 'Active'}
                                            </span>
                                            <button className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
                                                View Profile
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-brand-900 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden animate-fade-in">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Employee</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Email Address</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Joining Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {filteredJoiners.map((emp, index) => {
                                        const profile = emp.employeeProfile || {};
                                        const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
                                        const avatarColor = colors[index % colors.length];

                                        return (
                                            <tr 
                                                key={emp.id} 
                                                onClick={() => navigate(`/employee/${emp.id}`)}
                                                className="hover:bg-gray-50/80 dark:hover:bg-brand-500/5 transition-all group cursor-pointer"
                                            >
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md ${avatarColor}`}>
                                                            {emp.name ? emp.name.split(' ').map((n: string) => n[0]).join('') : '?'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-800 dark:text-white">{emp.name}</div>
                                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{profile.title || 'Employee'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-sm text-gray-600 dark:text-gray-300 font-medium">
                                                    {emp.email}
                                                </td>
                                                <td className="px-6 py-5 text-sm text-gray-600 dark:text-gray-300">
                                                    {profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${(profile.status || 'Active').toLowerCase() === 'active'
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                                        }`}>
                                                        {profile.status || 'Active'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button className="text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline">
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            {/* Advanced Search Drawer - Matching EmployeeList EXACTLY */}
            {showFilterDrawer && createPortal(
                <div className="fixed inset-0 z-[999999]">
                    <div 
                        className="absolute inset-0 bg-black/40 backdrop-blur-md"
                        onClick={() => setShowFilterDrawer(false)}
                    />
                    <div className="absolute right-0 top-0 w-full max-w-md h-full bg-white dark:bg-brand-900 shadow-2xl animate-slide-in-right">
                        <div className="flex flex-col justify-between h-full p-6">
                            <div>
                                <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">Advanced Search</h2>
                                <div className="space-y-4">
                                    <input 
                                        type="text"
                                        placeholder="Search name..."
                                        value={filters.name}
                                        onChange={(e) => setFilters({...filters, name: e.target.value})}
                                        className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                                    />
                                    <input 
                                        type="text"
                                        placeholder="Search email..."
                                        value={filters.email}
                                        onChange={(e) => setFilters({...filters, email: e.target.value})}
                                        className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                                    />
                                    <input 
                                        type="text"
                                        placeholder="Filter by role..."
                                        value={filters.role}
                                        onChange={(e) => setFilters({...filters, role: e.target.value})}
                                        className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                                    />
                                    <input 
                                        type="text"
                                        placeholder="Filter by location..."
                                        value={filters.location}
                                        onChange={(e) => setFilters({...filters, location: e.target.value})}
                                        className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                                    />
                                    <div className="relative group/dropdown">
                                        <select
                                            value={filters.status}
                                            onChange={(e) => setFilters({...filters, status: e.target.value})}
                                            className="appearance-none w-full px-4 py-2.5 bg-brand-600 dark:bg-brand-600/20 border-2 border-brand-500/50 rounded-xl text-white font-bold cursor-pointer focus:ring-4 focus:ring-brand-500/20 outline-none pr-10 transition-all"
                                        >
                                            <option value="All" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white">All Status</option>
                                            <option value="Active" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white">Active</option>
                                            <option value="Inactive" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white">Inactive</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button 
                                    onClick={clearFilters}
                                    className="flex-1 py-2 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 cursor-pointer"
                                >
                                    Clear
                                </button>
                                <button 
                                    onClick={applyFilters}
                                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-700 text-white cursor-pointer hover:from-brand-600 hover:to-brand-800 transition-all duration-200"
                                >
                                    Apply Filters
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
