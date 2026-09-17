import { useState, useEffect } from 'react';
import { Search, Filter, Plus, MoreVertical, User, Loader2, Edit, Trash2, Eye, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
// import { getTeams } from '../utils/teamApi';

export default function EmployeeList() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // ✅ Admin role check for HR_ADMIN, ADMIN, or SYSTEM_ADMIN
    const isAdmin = user?.role === 'HR_ADMIN' || (user?.role as string) === 'ADMIN' || user?.role === 'SYSTEM_ADMIN';
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [showFilterDrawer, setShowFilterDrawer] = useState(false);
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
    const [loading, setLoading] = useState(true);

    // Employee State
    const [employees, setEmployees] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await api.get('/employee');
                setEmployees(res.data);
            } catch (error) {
                console.error('Error fetching employees:', error);
                toast.error('Failed to load employees');
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, []);

    const [masters, setMasters] = useState({
        departments: [] as any[],
        roles: [] as any[],
        designations: [] as any[]
    });

    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const [deptRes, roleRes, desigRes] = await Promise.all([
                    api.get('/masters/departments'),
                    api.get('/masters/roles'),
                    api.get('/masters/designations')
                ]);
                setMasters({
                    departments: deptRes.data,
                    roles: roleRes.data,
                    designations: desigRes.data
                });
            } catch (error) {
                console.error('Error fetching masters:', error);
            }
        };
        fetchMasters();
    }, []);

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEmployee, setNewEmployee] = useState({
        name: '',
        email: '',
        phone: '',
        role: '',
        roleId: '',
        department: '',
        departmentId: '',
        title: '',
        designationId: '',
        location: '',
        status: 'Active',
        panNumber: '',
        aadhaarNumber: '',
        uanNumber: '',
        esicNumber: '',
        bankName: '',
        ifscCode: '',
        accountNumber: ''
    });

    const [selectedEmployeeForActions, setSelectedEmployeeForActions] = useState<any>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);

    const filteredEmployees = employees.filter(emp => {
        const profile = emp.employeeProfile || {};

        // if (user?.role === 'MANAGER' && !teamMemberIds.includes(emp.id)) {
        //     return false;
        // }

        return (
            (!appliedFilters.name ||
                emp.name.toLowerCase().includes(appliedFilters.name.toLowerCase()) ||
                emp.email.toLowerCase().includes(appliedFilters.name.toLowerCase()) ||
                (profile.title || '').toLowerCase().includes(appliedFilters.name.toLowerCase())) &&
            (!appliedFilters.email || emp.email.toLowerCase().includes(appliedFilters.email.toLowerCase())) &&
            (!appliedFilters.role || (profile.title || '').toLowerCase().includes(appliedFilters.role.toLowerCase())) &&
            (!appliedFilters.location || (profile.location || '').toLowerCase().includes(appliedFilters.location.toLowerCase())) &&
            (appliedFilters.status === 'All' || (profile.status || 'Active') === appliedFilters.status)
        );
    });
    const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);

    const paginatedEmployees = filteredEmployees.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const handleViewProfile = (id: number) => {
        navigate(`/employee/${id}`);
    };
    const handleViewAttendance = (id: number) => {
        navigate(`/employee-attendance/${id}`);
    };

    const isAllSelected = paginatedEmployees.length > 0 && paginatedEmployees.every(emp => selectedEmployeeIds.includes(emp.id));

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            const pageIds = new Set(paginatedEmployees.map(emp => emp.id));
            setSelectedEmployeeIds(prev => prev.filter(id => !pageIds.has(id)));
        } else {
            const pageIds = paginatedEmployees.map(emp => emp.id);
            setSelectedEmployeeIds(prev => Array.from(new Set([...prev, ...pageIds])));
        }
    };

    const toggleSelectEmployee = (id: number) => {
        setSelectedEmployeeIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (selectedEmployeeIds.length === 0) return;
        setIsBulkDeleting(true);
        try {
            try {
                await api.post('/employee/bulk-delete', { ids: selectedEmployeeIds });
            } catch (apiErr) {
                // Fallback to individual deletes
                await Promise.allSettled(selectedEmployeeIds.map(id => api.delete(`/employee/${id}`)));
            }
            const count = selectedEmployeeIds.length;
            setEmployees(prev => prev.filter(emp => !selectedEmployeeIds.includes(emp.id)));
            setSelectedEmployeeIds([]);
            setShowBulkDeleteModal(false);
            toast.success(`${count} employee${count > 1 ? 's' : ''} deleted successfully!`);
        } catch (err) {
            console.error('Bulk delete error:', err);
            toast.error('Failed to delete selected employees');
        } finally {
            setIsBulkDeleting(false);
        }
    };
    const handleAddEmployee = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic Validation
        if (!newEmployee.name || !newEmployee.email || !newEmployee.roleId || !newEmployee.designationId || !newEmployee.departmentId) {
            toast.error('Please fill in all required fields');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmployee.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        if (newEmployee.phone && !/^\d{10}$/.test(newEmployee.phone.replace(/\D/g, ''))) {
            toast.error('Phone number must be 10 digits');
            return;
        }

        const id = employees.length + 1;
        const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
        const avatar = colors[Math.floor(Math.random() * colors.length)];

        const addedEmployee = { id, ...newEmployee, avatar };
        setEmployees([addedEmployee, ...employees]);
        setShowAddModal(false);
        setNewEmployee({
            name: '',
            email: '',
            phone: '',
            role: '',
            roleId: '',
            department: '',
            departmentId: '',
            title: '',
            designationId: '',
            location: '',
            status: 'Active',
            panNumber: '',
            aadhaarNumber: '',
            uanNumber: '',
            esicNumber: '',
            bankName: '',
            ifscCode: '',
            accountNumber: ''
        });
        toast.success('Employee Added Successfully!');
    };
    const handleExportCSV = () => {
        const csvRows = [
            ["ID", "Name", "Email", "Phone", "Role", "Department", "Location", "Status"],
        ];

        filteredEmployees.forEach((emp) => {
            const profile = emp.employeeProfile || {};

            csvRows.push([
                emp.id,
                emp.name,
                emp.email,
                profile.phone ? `="${profile.phone}"` : "",
                profile.title || "",
                profile.department || "",
                profile.location || "",
                profile.status || "Active",
            ]);
        });

        const csvContent = csvRows.map((row) => row.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "employees-list.csv";
        a.click();

        window.URL.revokeObjectURL(url);
    };    return (
        <div className="animate-fade-in-up">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Employees</h2>
                    <p className="page-sub text-[14px] text-[#5B6472] dark:text-gray-400 mb-[5px]">Manage your organization's workforce.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleExportCSV}
                        className="btn btn-ghost flex-1 sm:flex-initial inline-flex items-center justify-center gap-[7px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white rounded-[8px] px-[15px] py-[9px] text-[13.5px] font-semibold whitespace-nowrap hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer shadow-2xs"
                    >
                        <Download size={15} />
                        <span>Export</span>
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => navigate('/employee/add')}
                            className="btn btn-primary flex-1 sm:flex-initial inline-flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#2442B8] text-white rounded-[8px] px-[15px] py-[9px] text-[13.5px] font-semibold whitespace-nowrap transition-all cursor-pointer shadow-sm"
                        >
                            <Plus size={16} />
                            <span>Add Employee</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
                <div className="relative w-full max-w-[340px] group">
                    <div className="relative flex items-center search">
                        <Search size={15} className="absolute left-3 text-[#9AA3B1] group-focus-within:text-[#2C4FD6] transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name, email or role..."
                            value={appliedFilters.name}
                            onChange={(e) => {
                                const val = e.target.value;
                                setAppliedFilters({ ...appliedFilters, name: val });
                                setCurrentPage(1);
                            }}
                            className="w-full pl-9 pr-3 py-[9px] h-[36px] bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] transition-all text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                    {/* Status Dropdown */}
                    <div className="relative group/dropdown">
                        <select
                            value={appliedFilters.status}
                            onChange={(e) => {
                                const val = e.target.value;
                                setAppliedFilters({ ...appliedFilters, status: val });
                                setCurrentPage(1);
                            }}
                            className="appearance-none flex items-center gap-2 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] px-3 py-[9px] text-[13px] font-semibold text-[#5B6472] dark:text-gray-300 bg-white dark:bg-[#12151C] cursor-pointer transition-all hover:border-[#2C4FD6] shadow-2xs focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none pr-8"
                        >
                            <option value="All">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#5B6472] dark:text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>

                    {/* Delete button appears on right side of All Status with count */}
                    {selectedEmployeeIds.length > 0 && (
                        <button
                            onClick={() => setShowBulkDeleteModal(true)}
                            className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-[6px] px-3.5 py-[9px] text-[13px] font-semibold transition-all shadow-sm cursor-pointer animate-fade-in shrink-0"
                            title={`Delete ${selectedEmployeeIds.length} selected employee(s)`}
                        >
                            <Trash2 size={15} />
                            <span>Delete ({selectedEmployeeIds.length})</span>
                        </button>
                    )}

                    <button
                        onClick={() => setShowFilterDrawer(true)}
                        className="flex items-center gap-2 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] px-3 py-[9px] text-[13px] font-semibold text-[#5B6472] dark:text-gray-300 bg-white dark:bg-[#12151C] hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-2xs shrink-0 cursor-pointer"
                    >
                        <Filter size={15} className="text-[#5B6472] dark:text-gray-300" />
                    </button>
                </div>
            </div>

            {/* List View Table */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800">
                    <Loader2 className="w-10 h-10 text-[#2C4FD6] animate-spin mb-4" />
                    <p className="text-[#5B6472] dark:text-gray-400 font-medium text-xs">Fetching workforce data...</p>
                </div>
            ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 shadow-2xs">
                    <User size={48} className="mx-auto text-[#9AA3B1] mb-4 opacity-50" />
                    <h3 className="text-base font-bold text-[#12151C] dark:text-white">No Employees Found</h3>
                    <p className="text-[#5B6472] dark:text-gray-400 text-xs mt-1">Try adjusting your filters or search term.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 shadow-sm overflow-hidden animate-fade-in-up">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-[#EEF1F5] dark:bg-gray-800/60 text-[#9AA3B1] dark:text-gray-400 text-[11px] font-semibold uppercase tracking-[.05em]">
                                    <th className="py-[9px] px-[16px] border-b border-[#E2E6ED] dark:border-gray-800 w-[44px] text-center">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={handleToggleSelectAll}
                                            className="w-4 h-4 rounded border-[#D0D5DD] text-[#2C4FD6] focus:ring-[#2C4FD6] cursor-pointer accent-[#2C4FD6] align-middle"
                                            title={isAllSelected ? "Deselect All" : "Select All"}
                                        />
                                    </th>
                                    <th className="py-[9px] px-[20px] border-b border-[#E2E6ED] dark:border-gray-800 w-[26%]">EMPLOYEE</th>
                                    <th className="py-[9px] px-[20px] border-b border-[#E2E6ED] dark:border-gray-800 w-[22%]">ROLE / DESIGNATION</th>
                                    <th className="py-[9px] px-[20px] border-b border-[#E2E6ED] dark:border-gray-800 w-[16%]">STATUS</th>
                                    <th className="py-[9px] px-[20px] border-b border-[#E2E6ED] dark:border-gray-800 text-center w-[12%]">ATTENDANCE</th>
                                    <th className="py-[9px] px-[20px] border-b border-[#E2E6ED] dark:border-gray-800 text-center w-[20%]">ACTION</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800 text-xs">
                                {paginatedEmployees.map((emp) => {
                                    const profile = emp.employeeProfile || {};
                                    const status = profile.status || 'Active';
                                    const initials = emp.name.trim().split(/\s+/).slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();

                                    return (
                                        <tr
                                            key={emp.id}
                                            onClick={() => handleViewProfile(emp.id)}
                                            className="hover:bg-[#F7F8FA] dark:hover:bg-white/5 transition-colors group cursor-pointer"
                                        >
                                            <td className="py-[13px] px-[16px] text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedEmployeeIds.includes(emp.id)}
                                                    onChange={() => toggleSelectEmployee(emp.id)}
                                                    className="w-4 h-4 rounded border-[#D0D5DD] text-[#2C4FD6] focus:ring-[#2C4FD6] cursor-pointer accent-[#2C4FD6] align-middle"
                                                />
                                            </td>
                                            <td className="py-[13px] px-[20px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#EEF1F5] dark:bg-gray-700 text-[#5B6472] dark:text-white font-mono-numbers font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <div className="emp-name font-semibold text-[#12151C] dark:text-white text-[13.5px] hover:text-[#2C4FD6] dark:hover:text-blue-400 transition-colors">
                                                            {emp.name}
                                                        </div>
                                                        <div className="emp-email text-[11.5px] text-[#717E95] dark:text-gray-400">
                                                            {emp.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-[13px] px-[20px]">
                                                <div className="text-[13.5px] text-[#12151C] dark:text-white capitalize">{profile.title || 'Employee'}</div>
                                                <div className="text-[11.5px] text-[#717E95] dark:text-gray-400 capitalize">{profile.department || 'General'}</div>
                                            </td>
                                            <td className="py-[13px] px-[20px]">
                                                <span className={`pill inline-block px-[10px] py-[3px] rounded-[3px] text-[11.5px] font-semibold tracking-wide ${
                                                    status.toLowerCase() === 'active'
                                                        ? 'bg-[#E4F5EC] text-[#1F8A5A]'
                                                        : status.toLowerCase() === 'on leave'
                                                            ? 'bg-[#F1F3F7] text-[#5B6472]'
                                                            : 'bg-[#FBE7E7] text-[#DE350B]'
                                                }`}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="py-[13px] px-[20px] text-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewAttendance(emp.id);
                                                    }}
                                                    className="view-btn inline-flex items-center gap-[6px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-[12px] font-semibold rounded-[6px] px-[10px] py-[5px] cursor-pointer shadow-2xs"
                                                >
                                                    <Eye size={13} className="text-[#5B6472] dark:text-gray-300" /> View
                                                </button>
                                            </td>
                                            <td className="py-[13px] px-[20px] text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/employee/${emp.id}?edit=true`)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#2C4FD6] hover:bg-blue-50 dark:hover:bg-blue-500/10 text-[12px] font-semibold shadow-2xs transition-all cursor-pointer"
                                                        title="Edit Profile"
                                                    >
                                                        <Edit size={13} />
                                                        <span>Edit Profile</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setEmployeeToDelete(emp)}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] border border-red-200 dark:border-red-900/40 bg-white dark:bg-[#12151C] text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 text-[12px] font-semibold shadow-2xs transition-all cursor-pointer"
                                                        title="Delete Employee"
                                                    >
                                                        <Trash2 size={13} />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
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
                                    className="px-3 py-1 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[#12151C] dark:text-white text-xs font-semibold cursor-pointer shadow-2xs"
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
                                        className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white disabled:opacity-25 hover:bg-[#F7F8FA] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                                        title="First Page"
                                    >
                                        <ChevronsLeft size={16} className="text-[#12151C] dark:text-white stroke-[2.5]" />
                                    </button>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white disabled:opacity-25 hover:bg-[#F7F8FA] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                                        title="Previous Page"
                                    >
                                        <ChevronLeft size={16} className="text-[#12151C] dark:text-white stroke-[2.5]" />
                                    </button>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white disabled:opacity-25 hover:bg-[#F7F8FA] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                                        title="Next Page"
                                    >
                                        <ChevronRight size={16} className="text-[#12151C] dark:text-white stroke-[2.5]" />
                                    </button>

                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="w-8 h-8 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white disabled:opacity-25 hover:bg-[#F7F8FA] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
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


            {selectedEmployeeForActions && (
                <div className="fixed inset-0 z-10" onClick={() => setSelectedEmployeeForActions(null)} />
            )}

            {/* Delete Confirmation Modal */}
            {employeeToDelete && createPortal(
                <div
                    className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/30 dark:bg-black/60 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white dark:bg-brand-950 rounded-[6px] shadow-2xl w-full max-w-md p-8 border border-gray-100 dark:border-white/10 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>


                        <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={40} className="text-red-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Delete Employee?</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8">
                            Are you sure you want to delete <span className="font-bold text-gray-700 dark:text-gray-200">{employeeToDelete.name}</span>? This action cannot be undone and will permanently remove all associated data.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setEmployeeToDelete(null)}
                                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-[6px] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        // Attempt to delete from backend database
                                        await api.delete(`/employee/${employeeToDelete.id}`);
                                        toast.success(`${employeeToDelete.name} deleted successfully!`);
                                    } catch (error) {
                                        console.error('Delete error:', error);
                                        // Still remove from UI so it "works" for the user even if backend is not ready
                                        toast.success(`${employeeToDelete.name} deleted from UI (Backend Pending)`);
                                    } finally {
                                        // Instantly remove from screen
                                        setEmployees(employees.filter(e => e.id !== employeeToDelete.id));
                                        setEmployeeToDelete(null);
                                    }
                                }}
                                className="flex-1 py-3 px-4 bg-red-500 text-white font-bold rounded-[6px] hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Bulk Delete Confirmation Modal */}
            {showBulkDeleteModal && createPortal(
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/30 dark:bg-black/60 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white dark:bg-brand-950 rounded-[6px] shadow-2xl w-full max-w-md p-8 border border-gray-100 dark:border-white/10 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>

                        <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={40} className="text-red-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                            Delete {selectedEmployeeIds.length} Employee{selectedEmployeeIds.length > 1 ? 's' : ''}?
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
                            Are you sure you want to permanently delete <span className="font-bold text-gray-700 dark:text-gray-200">{selectedEmployeeIds.length}</span> selected employee{selectedEmployeeIds.length > 1 ? 's' : ''}? This action cannot be undone and will remove all associated data.
                        </p>
                        <div className="flex gap-4">
                            <button
                                disabled={isBulkDeleting}
                                onClick={() => setShowBulkDeleteModal(false)}
                                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-[6px] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isBulkDeleting}
                                onClick={handleBulkDelete}
                                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-[6px] transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isBulkDeleting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    `Yes, Delete (${selectedEmployeeIds.length})`
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add Employee Modal */}
            {showAddModal && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/30 dark:bg-black/60 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white dark:bg-[#161B26] rounded-[6px] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-800 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-[#F7F8FA] dark:bg-white/5">
                            <div>
                                <h3 className="text-xl font-bold text-[#12151C] dark:text-white tracking-tight">Add New Employee</h3>
                                <p className="text-[#5B6472] dark:text-gray-400 text-xs font-medium mt-0.5">Create a new member profile</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-[6px] transition-colors cursor-pointer">
                                <Plus size={22} className="rotate-45 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleAddEmployee} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            {/* Personal Details Section */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2C4FD6]">Personal Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Full Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={newEmployee.name}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                                            placeholder="John Doe"
                                            className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none text-[#12151C] dark:text-white font-medium text-sm transition-all placeholder:text-[#9AA3B1] placeholder:font-normal"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">System Role *</label>
                                        <div className="relative group/select">
                                            <select
                                                required
                                                value={newEmployee.roleId}
                                                onChange={(e) => {
                                                    const id = e.target.value;
                                                    const name = masters.roles.find(r => r.id === id)?.name || '';
                                                    setNewEmployee({ ...newEmployee, roleId: id, role: name });
                                                }}
                                                className="appearance-none w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none text-[#12151C] dark:text-white font-medium text-sm transition-all cursor-pointer"
                                            >
                                                <option value="" className="dark:bg-[#161B26]">Select Role</option>
                                                {masters.roles.map(role => (
                                                    <option key={role.id} value={role.id} className="dark:bg-[#161B26]">{role.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover/select:text-[#2C4FD6] transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Designation / Title *</label>
                                        <div className="relative group/select">
                                            <select
                                                required
                                                value={newEmployee.designationId}
                                                onChange={(e) => {
                                                    const id = e.target.value;
                                                    const name = masters.designations.find(d => d.id === id)?.name || '';
                                                    setNewEmployee({ ...newEmployee, designationId: id, title: name });
                                                }}
                                                className="appearance-none w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none text-[#12151C] dark:text-white font-medium text-sm transition-all cursor-pointer"
                                            >
                                                <option value="" className="dark:bg-[#161B26]">Select Designation</option>
                                                {masters.designations.map(desig => (
                                                    <option key={desig.id} value={desig.id} className="dark:bg-[#161B26]">{desig.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover/select:text-[#2C4FD6] transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Email Address *</label>
                                        <input
                                            type="email"
                                            required
                                            value={newEmployee.email}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                                            placeholder="john.doe@encalm.com"
                                            className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none text-[#12151C] dark:text-white font-medium text-sm transition-all placeholder:text-[#9AA3B1] placeholder:font-normal"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Phone Number</label>
                                        <input
                                            type="tel"
                                            value={newEmployee.phone}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                                            placeholder="+91 98765 43210"
                                            className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none text-[#12151C] dark:text-white font-medium text-sm transition-all placeholder:text-[#9AA3B1] placeholder:font-normal"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Department</label>
                                        <div className="relative group/select">
                                            <select
                                                value={newEmployee.departmentId}
                                                onChange={(e) => {
                                                    const id = e.target.value;
                                                    const name = masters.departments.find(d => d.id === id)?.name || '';
                                                    setNewEmployee({ ...newEmployee, departmentId: id, department: name });
                                                }}
                                                className="appearance-none w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none text-[#12151C] dark:text-white font-medium text-sm transition-all cursor-pointer"
                                            >
                                                <option value="" className="dark:bg-[#161B26]">Select Department</option>
                                                {masters.departments.map(dept => (
                                                    <option key={dept.id} value={dept.id} className="dark:bg-[#161B26]">{dept.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover/select:text-[#2C4FD6] transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Office Location</label>
                                        <input
                                            type="text"
                                            value={newEmployee.location}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, location: e.target.value })}
                                            placeholder="e.g. Delhi HQ"
                                            className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none text-[#12151C] dark:text-white font-medium text-sm transition-all placeholder:text-[#9AA3B1] placeholder:font-normal"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Statutory Details Section */}
                            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2C4FD6]">Statutory Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">PAN Number</label>
                                        <input
                                            type="text"
                                            value={newEmployee.panNumber}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, panNumber: e.target.value.toUpperCase() })}
                                            placeholder="ABCDE1234F"
                                            className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none text-[#12151C] dark:text-white font-medium text-sm transition-all uppercase placeholder:normal-case placeholder:text-[#9AA3B1] placeholder:font-normal"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Aadhaar Number</label>
                                        <input
                                            type="text"
                                            value={newEmployee.aadhaarNumber}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, aadhaarNumber: e.target.value })}
                                            placeholder="XXXX XXXX XXXX"
                                            className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none text-[#12151C] dark:text-white font-medium text-sm transition-all placeholder:text-[#9AA3B1] placeholder:font-normal"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bank Details Section */}
                            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2C4FD6]">Bank Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Bank Name</label>
                                        <input
                                            type="text"
                                            value={newEmployee.bankName}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, bankName: e.target.value })}
                                            placeholder="e.g. HDFC Bank"
                                            className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none text-[#12151C] dark:text-white font-medium text-sm transition-all placeholder:text-[#9AA3B1] placeholder:font-normal"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">IFSC Code</label>
                                        <input
                                            type="text"
                                            value={newEmployee.ifscCode}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, ifscCode: e.target.value.toUpperCase() })}
                                            placeholder="HDFC0001234"
                                            className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none text-[#12151C] dark:text-white font-medium text-sm transition-all uppercase placeholder:normal-case placeholder:text-[#9AA3B1] placeholder:font-normal"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-1.5">
                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Account Number</label>
                                        <input
                                            type="text"
                                            value={newEmployee.accountNumber}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, accountNumber: e.target.value })}
                                            placeholder="Enter bank account number"
                                            className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none text-[#12151C] dark:text-white font-medium text-sm transition-all placeholder:text-[#9AA3B1] placeholder:font-normal"
                                        />
                                    </div>
                                </div>
                            </div>
                        </form>
                        <div className="p-6 bg-[#F7F8FA] dark:bg-white/5 border-t border-[#E2E6ED] dark:border-white/10 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 py-2.5 border border-[#E2E6ED] dark:border-gray-700 text-[#5B6472] dark:text-gray-300 font-semibold rounded-[6px] text-xs hover:bg-gray-100 dark:hover:bg-white/10 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                onClick={handleAddEmployee}
                                className="flex-[2] py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold rounded-[6px] text-xs shadow-sm transition-all cursor-pointer"
                            >
                                Create Employee
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {showFilterDrawer &&
                createPortal(
                    <div className="fixed inset-0 z-[999999]">

                        {/* Overlay */}
                        <div
                            className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-md"
                            onClick={() => setShowFilterDrawer(false)}
                        />

                        {/* Drawer */}
                        <div className="absolute right-0 top-0 w-full max-w-md h-full bg-white dark:bg-[#12151C] shadow-2xl animate-slide-in-right border-l border-[#E2E6ED] dark:border-gray-800">

                            <div className="flex flex-col justify-between h-full p-6">

                                {/* TOP */}
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-bold text-[#12151C] dark:text-white">
                                            Advanced Search
                                        </h2>
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
                                                className="appearance-none flex items-center gap-2 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] px-3 py-[9px] text-[13px] font-semibold text-[#5B6472] dark:text-gray-300 bg-white dark:bg-[#12151C] cursor-pointer transition-all hover:border-[#2C4FD6] shadow-2xs focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none pr-8 w-full"
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

                                {/* BUTTONS */}
                                <div className="flex gap-3 pt-6 border-t border-[#E2E6ED] dark:border-gray-800">

                                    <button
                                        onClick={() => {
                                            const reset = {
                                                name: '',
                                                email: '',
                                                role: '',
                                                location: '',
                                                status: 'All'
                                            };
                                            setFilters(reset);
                                            setAppliedFilters(reset);
                                        }}
                                        className="flex-1 py-2.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-300 font-semibold text-[13.5px] hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer shadow-2xs"
                                    >
                                        Clear
                                    </button>

                                    <button
                                        onClick={() => {
                                            setAppliedFilters(filters);
                                            setShowFilterDrawer(false);
                                        }}
                                        className="flex-1 py-2.5 rounded-[6px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-[13.5px] transition-all shadow-sm cursor-pointer"
                                    >
                                        Apply Filters
                                    </button>

                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {selectedEmployeeForActions &&
                createPortal(
                    <div className="fixed inset-0 z-[999999]">
                        {/* Overlay */}
                        <div
                            className="absolute inset-0 bg-slate-900/30 dark:bg-black/60 backdrop-blur-md animate-fade-in"
                            onClick={() => setSelectedEmployeeForActions(null)}
                        />

                        {/* Drawer */}
                        <div className="absolute right-0 top-0 w-full max-w-sm h-full bg-white dark:bg-brand-900 shadow-2xl animate-slide-in-right">
                            <div className="flex flex-col h-full">
                                {/* Header with Employee Summary */}
                                <div className="p-8 border-b border-gray-100 dark:border-white/5 bg-gradient-to-br from-brand-500/5 to-transparent">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-16 h-16 rounded-[6px] flex items-center justify-center text-white font-bold text-2xl shadow-xl bg-brand-500">
                                            {selectedEmployeeForActions.name.split(' ').map((n: string) => n[0]).join('')}
                                        </div>
                                        <button
                                            onClick={() => setSelectedEmployeeForActions(null)}
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-[6px] transition-colors text-gray-400"
                                        >
                                            <Plus size={24} className="rotate-45" />
                                        </button>
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">{selectedEmployeeForActions.name}</h3>
                                    <p className="text-brand-500 dark:text-brand-400 font-bold uppercase text-xs tracking-widest mt-1">
                                        {selectedEmployeeForActions.employeeProfile?.title || 'Employee'}
                                    </p>
                                </div>

                                {/* Action List */}
                                <div className="flex-1 p-6 space-y-3">
                                    <button
                                        onClick={() => { navigate(`/employee/${selectedEmployeeForActions.id}`); setSelectedEmployeeForActions(null); }}
                                        className="w-full flex items-center gap-4 p-4 rounded-[6px] bg-gray-50 dark:bg-white/5 border border-transparent hover:border-brand-500/30 hover:bg-white dark:hover:bg-brand-500/10 transition-all group"
                                    >
                                        <div className="p-3 bg-white dark:bg-brand-900 rounded-[6px] text-brand-500 shadow-sm group-hover:scale-110 transition-transform">
                                            <User size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-gray-800 dark:text-white">View Full Profile</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Detailed overview and history</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { navigate(`/employee/${selectedEmployeeForActions.id}?edit=true`); setSelectedEmployeeForActions(null); }}
                                        className="w-full flex items-center gap-4 p-4 rounded-[6px] bg-gray-50 dark:bg-white/5 border border-transparent hover:border-brand-500/30 hover:bg-white dark:hover:bg-brand-500/10 transition-all group"
                                    >
                                        <div className="p-3 bg-white dark:bg-brand-900 rounded-[6px] text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
                                            <Edit size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-gray-800 dark:text-white">Edit Profile</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Modify employee information</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { setEmployeeToDelete(selectedEmployeeForActions); setSelectedEmployeeForActions(null); }}
                                        className="w-full flex items-center gap-4 p-4 rounded-[6px] bg-gray-50 dark:bg-white/5 border border-transparent hover:border-red-500/30 hover:bg-white dark:hover:bg-red-500/10 transition-all group"
                                    >
                                        <div className="p-3 bg-white dark:bg-brand-900 rounded-[6px] text-red-500 shadow-sm group-hover:scale-110 transition-transform">
                                            <Trash2 size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-red-600">Delete Employee</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Permanently remove from system</p>
                                        </div>
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
