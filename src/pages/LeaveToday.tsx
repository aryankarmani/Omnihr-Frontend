import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Mail, Loader2, ArrowLeft, UserMinus, LayoutGrid, List, Eye, XCircle, Clock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { formatTime12h } from './Leave';

export default function LeaveToday() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [employeesOnLeave, setEmployeesOnLeave] = useState<any[]>([]);
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

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
        const fetchData = async () => {
            try {
                // 1. Fetch Leave History
                const leaveRes = await api.get('/leave/history?all=true');
                // 2. Fetch All Employees to get full details (Email, ID, Profile)
                const empRes = await api.get('/employee');

                const today = new Date().toISOString().split('T')[0];
                const employeesList = empRes.data;

                // 3. Filter and Merge data
                const onLeaveToday = leaveRes.data.filter((leave: any) => {
                    const start = new Date(leave.startDate).toISOString().split('T')[0];
                    const end = new Date(leave.endDate).toISOString().split('T')[0];
                    return today >= start && today <= end && leave.status === 'APPROVED';
                }).map((leave: any) => {
                    // Find the matching employee in the full list using userId
                    const fullEmp = employeesList.find((e: any) => e.id === leave.userId);
                    return {
                        ...leave,
                        fullEmployee: fullEmp // This contains email, id, profile
                    };
                });

                setEmployeesOnLeave(onLeaveToday);
            } catch (error) {
                console.error('Error fetching leave data:', error);
                toast.error('Failed to load leave data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const applyFilters = () => {
        setAppliedFilters(filters);
        setCurrentPage(1);
        setShowFilterDrawer(false);
    };

    const clearFilters = () => {
        const empty = { name: '', email: '', role: '', location: '', status: 'All' };
        setFilters(empty);
        setAppliedFilters(empty);
        setCurrentPage(1);
        setShowFilterDrawer(false);
    };

    const filteredLeaves = employeesOnLeave.filter(leave => {
        const emp = leave.fullEmployee || {};
        const profile = emp.employeeProfile || {};
        const name = emp.name || leave.user?.name || '';
        const email = emp.email || '';
        const title = profile.title || '';
        const location = profile.location || '';
        const role = emp.role?.name || emp.role || '';
        const status = leave.status || 'APPROVED';

        const matchesName = !appliedFilters.name ||
            name.toLowerCase().includes(appliedFilters.name.toLowerCase()) ||
            email.toLowerCase().includes(appliedFilters.name.toLowerCase()) ||
            title.toLowerCase().includes(appliedFilters.name.toLowerCase()) ||
            role.toLowerCase().includes(appliedFilters.name.toLowerCase());
        const matchesEmail = !appliedFilters.email || email.toLowerCase().includes(appliedFilters.email.toLowerCase());
        const matchesRole = !appliedFilters.role || role.toLowerCase().includes(appliedFilters.role.toLowerCase());
        const matchesLocation = !appliedFilters.location || location.toLowerCase().includes(appliedFilters.location.toLowerCase());
        const matchesStatus = appliedFilters.status === 'All' || status === appliedFilters.status;

        return matchesName && matchesEmail && matchesRole && matchesLocation && matchesStatus;
    });

    const totalPages = Math.ceil(filteredLeaves.length / rowsPerPage) || 1;
    const paginatedLeaves = filteredLeaves.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    return (
        <div className="animate-fade-in-up pb-8">
            {/* Header Actions */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-[4px] text-[#5B6472] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-[#12151C] dark:text-white mb-1">On Leave Today</h2>
                        <p className="page-sub text-[14px] text-[#5B6472] dark:text-gray-400 mb-[5px]">List of employees currently away from work.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 justify-start lg:justify-end w-full lg:w-auto">
                    <div className="px-3.5 py-1.5 h-[36px] bg-[#FBF0E1] dark:bg-amber-950/40 border border-[#F5D8B3] dark:border-amber-800/40 rounded-[6px] text-[#D97706] dark:text-amber-400 font-semibold text-xs flex items-center gap-2 shrink-0">
                        <UserMinus size={15} />
                        <span>{employeesOnLeave.length} Employees</span>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-[240px] md:w-[280px] group">
                        <div className="relative flex items-center search">
                            <Search size={15} className="absolute left-3 text-[#9AA3B1] group-focus-within:text-[#2C4FD6] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by name, email or role..."
                                value={filters.name}
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

                    {/* Status Dropdown */}
                    <div className="relative group/dropdown">
                        <select
                            value={filters.status}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFilters({ ...filters, status: val });
                                setAppliedFilters({ ...appliedFilters, status: val });
                                setCurrentPage(1);
                            }}
                            className="appearance-none flex items-center gap-2 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] px-3 py-[9px] h-[36px] text-[13px] font-semibold text-[#5B6472] dark:text-gray-300 bg-white dark:bg-[#12151C] cursor-pointer transition-all hover:border-[#2C4FD6] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none pr-8"
                        >
                            <option value="All">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#5B6472] dark:text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>

                    {/* Filter Icon Button */}
                    <button
                        onClick={() => setShowFilterDrawer(true)}
                        className="flex items-center justify-center border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] px-3 py-[9px] h-[36px] text-[13px] font-semibold text-[#5B6472] dark:text-gray-300 bg-white dark:bg-[#12151C] hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer shrink-0"
                    >
                        <Filter size={15} className="text-[#5B6472] dark:text-gray-300" />
                    </button>
                </div>
            </div>

            {/* Content Section - Table View Matching EmployeeList EXACTLY */}
            {loading ? (
                <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden animate-fade-in">
                    <div className="divide-y divide-[#E2E6ED] dark:divide-gray-800">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-[6px] skeleton-shimmer shrink-0" />
                                    <div className="space-y-1.5 min-w-0">
                                        <div className="h-3.5 w-32 skeleton-shimmer rounded-[4px]" />
                                        <div className="h-2.5 w-24 skeleton-shimmer rounded-[4px]" />
                                    </div>
                                </div>
                                <div className="h-3.5 w-24 skeleton-shimmer rounded-[4px] hidden sm:block" />
                                <div className="h-3.5 w-24 skeleton-shimmer rounded-[4px] hidden md:block" />
                                <div className="h-5 w-16 skeleton-shimmer rounded-full" />
                                <div className="h-7 w-16 skeleton-shimmer rounded-[6px]" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : filteredLeaves.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800">
                    <Calendar size={48} className="mx-auto text-[#9AA3B1] mb-4 opacity-50" />
                    <h3 className="text-base font-bold text-[#12151C] dark:text-white">No Employees Found</h3>
                    <p className="text-[#5B6472] dark:text-gray-400 text-xs mt-1">Try adjusting your filters or search term.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden animate-fade-in-up">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[850px]">
                            <thead>
                                <tr className="bg-[#EEF1F5] dark:bg-gray-800/60 text-[#9AA3B1] dark:text-gray-400 text-[11px] font-semibold uppercase tracking-[.05em]">
                                    <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800 w-[30%]">EMPLOYEE</th>
                                    <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800 w-[25%]">ROLE / DESIGNATION</th>
                                    <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800 w-[20%]">STATUS</th>
                                    <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800 text-center w-[15%]">LEAVE DATES</th>
                                    <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800 text-center w-[10%]">ACTION</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800 text-xs">
                                {paginatedLeaves.map((leave) => {
                                    const emp = leave.fullEmployee || leave.user || {};
                                    const profile = emp.employeeProfile || {};
                                    const name = emp.name || 'Employee';
                                    const initials = name.trim().split(/\s+/).slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();

                                    return (
                                        <tr
                                            key={leave.id}
                                            onClick={() => emp.id && navigate(`/employee/${emp.id}`)}
                                            className="hover:bg-[#F7F8FA] dark:hover:bg-white/5 transition-colors group cursor-pointer"
                                        >
                                            <td className="py-[13px] px-[22px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#EEF1F5] dark:bg-gray-700 text-[#5B6472] dark:text-white font-mono-numbers font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <div className="emp-name font-semibold text-[#12151C] dark:text-white text-[13.5px] hover:text-[#2C4FD6] dark:hover:text-blue-400 transition-colors">
                                                            {name}
                                                        </div>
                                                        <div className="emp-email text-[11.5px] text-[#717E95] dark:text-gray-400">
                                                            {emp.email || '—'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-[13px] px-[22px]">
                                                <div className="text-[13.5px] text-[#12151C] dark:text-white capitalize">{profile.title || 'Employee'}</div>
                                                <div className="text-[11.5px] text-[#717E95] dark:text-gray-400 capitalize">{profile.department || 'General'}</div>
                                            </td>

                                            <td className="py-[13px] px-[22px]">
                                                <span className="pill inline-block px-[10px] py-[3px] rounded-[3px] text-[11.5px] font-semibold tracking-wide bg-[#FBF0E1] text-[#D97706]">
                                                    On Leave
                                                </span>
                                            </td>

                                            <td className="py-[13px] px-[22px] text-center text-xs text-[#5B6472] dark:text-gray-300">
                                                <div className="font-mono-numbers">
                                                    {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    {new Date(leave.startDate).toDateString() !== new Date(leave.endDate).toDateString() && (
                                                        ` – ${new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                                    )}
                                                </div>
                                                {leave.fromTime && leave.toTime && (
                                                    <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-[#2C4FD6] dark:text-blue-400">
                                                        <Clock size={11} />
                                                        <span>{formatTime12h(leave.fromTime)} - {formatTime12h(leave.toTime)}</span>
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-[13px] text-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (emp.id) navigate(`/employee/${emp.id}`);
                                                    }}
                                                    className="view-btn inline-flex items-center gap-[6px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-[12px] font-semibold rounded-[3px] px-[10px] py-[5px] cursor-pointer"
                                                >
                                                    <Eye size={13} className="text-[#5B6472] dark:text-gray-300" /> View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination - Matching EmployeeList */}
                    {filteredLeaves.length > 0 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-[#E2E6ED] dark:border-gray-800 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-[#9AA3B1] font-semibold text-xs uppercase">
                                    Rows per page
                                </span>

                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="px-3 py-1 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[#12151C] dark:text-white text-xs font-semibold cursor-pointer outline-none focus:border-[#2C4FD6]"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-[#5B6472] dark:text-gray-300 font-mono-numbers">
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
            )}

            {/* Advanced Search Drawer */}
            {showFilterDrawer && createPortal(
                <div className="fixed inset-0 z-[999999]">
                    <div
                        className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-md"
                        onClick={() => setShowFilterDrawer(false)}
                    />
                    <div className="absolute right-0 top-0 w-full max-w-md h-full bg-white dark:bg-[#12151C] animate-slide-in-right border-l border-[#E2E6ED] dark:border-gray-800">
                        <div className="flex flex-col justify-between h-full p-6">
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-[#12151C] dark:text-white">Advanced Search</h2>
                                    <button
                                        onClick={() => setShowFilterDrawer(false)}
                                        className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer"
                                        title="Close"
                                    >
                                        <XCircle size={18} />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Search name..."
                                        value={filters.name}
                                        onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search email..."
                                        value={filters.email}
                                        onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Filter by role..."
                                        value={filters.role}
                                        onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Filter by location..."
                                        value={filters.location}
                                        onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                                    />
                                    <div className="relative group/dropdown">
                                        <select
                                            value={filters.status}
                                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                            className="appearance-none flex items-center gap-2 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] px-3 py-[9px] text-[13px] font-semibold text-[#5B6472] dark:text-gray-300 bg-white dark:bg-[#12151C] cursor-pointer transition-all hover:border-[#2C4FD6] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none pr-8 w-full"
                                        >
                                            <option value="All">All Status</option>
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#5B6472] dark:text-gray-400">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-6 border-t border-[#E2E6ED] dark:border-gray-800">
                                <button
                                    onClick={clearFilters}
                                    className="flex-1 py-2.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-300 font-semibold text-[13.5px] hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={applyFilters}
                                    className="flex-1 py-2.5 rounded-[6px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-[13.5px] transition-all cursor-pointer"
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
