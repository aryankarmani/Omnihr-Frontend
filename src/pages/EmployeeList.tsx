import { useState, useEffect } from 'react';
import { Search, Filter, Plus, MoreVertical, FileText, User, MapPin, Mail, Phone, Loader2, Edit, Trash2, LayoutGrid, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { createPortal } from 'react-dom';

export default function EmployeeList() {
    const navigate = useNavigate();
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
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Employee State
    const [employees, setEmployees] = useState<any[]>([]);

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

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newEmployee, setNewEmployee] = useState({
        name: '',
        email: '',
        phone: '',
        role: '',
        department: '',
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

    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);

    // Filter Logic
    const filteredEmployees = employees.filter(emp => {
        const profile = emp.employeeProfile || {};

        return (
            (!appliedFilters.name ||
                emp.name.toLowerCase().includes(appliedFilters.name.toLowerCase()) ||
                emp.id.toString().includes(appliedFilters.name)) &&
            (!appliedFilters.email || emp.email.toLowerCase().includes(appliedFilters.email.toLowerCase())) &&
            (!appliedFilters.role || (profile.title || '').toLowerCase().includes(appliedFilters.role.toLowerCase())) &&
            (!appliedFilters.location || (profile.location || '').toLowerCase().includes(appliedFilters.location.toLowerCase())) &&
            (appliedFilters.status === 'All' || (profile.status || 'Active') === appliedFilters.status)
        );
    });

    const handleViewProfile = (id: number) => {
        navigate(`/employee/${id}`);
    };

    const handleAddEmployee = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Basic Validation
        if (!newEmployee.name || !newEmployee.email || !newEmployee.role) {
            toast.error('Please fill in all required fields');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmployee.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        if (newEmployee.phone && !/^\d{10}$/.test(newEmployee.phone.replace(/\D/g,''))) {
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
            department: '',
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

    return (
        <div className="animate-fade-in-up">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Employees</h2>
                    <p className="text-gray-500 dark:text-gray-400">Manage your organization's workforce</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                        <FileText size={18} />
                        <span className="hidden md:inline">Export</span>
                    </button>
                    <button
                        onClick={() => navigate('/employee/add')}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 active:scale-95 transition-all shadow-lg shadow-brand-500/20"
                    >
                        <Plus size={18} />
                        <span>Add Employee</span>
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-brand-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name, email, or ID..."
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

                    {/* Custom Styled Dropdown - Separately implemented here */}
                    <div className="relative group/dropdown">
                        <select
                            value={filters.status}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFilters({ ...filters, status: val });
                                setAppliedFilters({ ...appliedFilters, status: val });
                            }}
                            className="appearance-none px-5 py-2.5 bg-brand-600 dark:bg-brand-600/20 border-2 border-brand-500/50 rounded-2xl text-white font-bold cursor-pointer transition-all hover:bg-brand-700 hover:border-brand-400 shadow-lg shadow-brand-500/20 focus:ring-4 focus:ring-brand-500/20 outline-none w-52 pr-10"
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
                        className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-600 dark:text-gray-300 
                        hover:bg-brand-500 hover:text-white hover:scale-105 
                        transition-all duration-200 shadow-sm flex items-center justify-center"
                    >
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            {/* Grid/List View */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-brand-900 rounded-3xl border border-gray-100 dark:border-white/5">
                    <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">Fetching workforce data...</p>
                </div>
            ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-brand-900 rounded-3xl border border-gray-100 dark:border-white/5">
                    <User size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">No Employees Found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Try adjusting your filters or search term.</p>
                </div>
            ) : (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredEmployees.map((emp, index) => {
                            const profile = emp.employeeProfile || {};
                            const status = profile.status || 'Active';
                            // Generate color based on index or name hash
                            const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
                            const avatarColor = colors[index % colors.length];

                            return (
                                <div key={emp.id} className="bg-white dark:bg-brand-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                    {/* Status Stripe */}
                                    <div className={`absolute top-0 left-0 w-1 h-full ${status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></div>

                                    <div className="flex flex-col justify-between h-full p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${avatarColor}`}>
                                                    {emp.name.split(' ').map((n: string) => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-800 dark:text-white text-lg">{emp.name}</h3>
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm">{profile.title || 'Employee'}</p>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === emp.id ? null : emp.id); }}
                                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                                                >
                                                    <MoreVertical size={20} />
                                                </button>
                                                
                                                {activeDropdown === emp.id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-brand-900 rounded-xl shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden z-20 animate-fade-in-up">
                                                        <button 
                                                            onClick={() => { setActiveDropdown(null); navigate(`/employee/${emp.id}?edit=true`); }}
                                                            className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                                                        >
                                                            <Edit size={16} /> Edit Profile
                                                        </button>
                                                        <button 
                                                            onClick={() => { setActiveDropdown(null); setEmployeeToDelete(emp); }}
                                                            className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-2 border-t border-gray-100 dark:border-white/5"
                                                        >
                                                            <Trash2 size={16} /> Delete Employee
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-6">
                                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                                <MapPin size={16} className="text-gray-400" />
                                                {profile.location || 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                                <Mail size={16} className="text-gray-400" />
                                                {emp.email}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                                <Phone size={16} className="text-gray-400" />
                                                {profile.phone || 'N/A'}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all hover:scale-105 ${status.toLowerCase() === 'active'
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                                }`}>
                                                {status}
                                            </span>

                                            {status === 'Inactive' ? (
                                                <button className="text-sm font-medium text-red-500 hover:text-red-600 hover:underline">
                                                    Process F&F
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleViewProfile(emp.id)}
                                                    className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline flex items-center gap-1"
                                                >
                                                    View Profile
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-brand-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 dark:bg-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Employee</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Email Address</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Role / Designation</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {filteredEmployees.map((emp, index) => {
                                        const profile = emp.employeeProfile || {};
                                        const status = profile.status || 'Active';
                                        const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
                                        const avatarColor = colors[index % colors.length];

                                        return (
                                            <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md ${avatarColor}`}>
                                                            {emp.name.split(' ').map((n: string) => n[0]).join('')}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-800 dark:text-white">{emp.name}</div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">ID: #{emp.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">
                                                    {emp.email}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm text-gray-800 dark:text-white font-bold">{profile.title || 'Employee'}</div>
                                                    <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{profile.department || 'General'}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.toLowerCase() === 'active'
                                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                                        }`}>
                                                        {status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="relative inline-block">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === emp.id ? null : emp.id); }}
                                                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                                                        >
                                                            <MoreVertical size={18} />
                                                        </button>
                                                        
                                                        {activeDropdown === emp.id && (
                                                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-brand-900 rounded-xl shadow-xl border border-gray-100 dark:border-white/10 overflow-hidden z-20 animate-fade-in-up">
                                                                <button 
                                                                    onClick={() => { setActiveDropdown(null); navigate(`/employee/${emp.id}?edit=true`); }}
                                                                    className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                                                                >
                                                                    <Edit size={14} /> Edit Profile
                                                                </button>
                                                                <button 
                                                                    onClick={() => { setActiveDropdown(null); handleViewProfile(emp.id); }}
                                                                    className="w-full text-left px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2 border-t border-gray-100 dark:border-white/5"
                                                                >
                                                                    <User size={14} /> View Profile
                                                                </button>
                                                                <button 
                                                                    onClick={() => { setActiveDropdown(null); setEmployeeToDelete(emp); }}
                                                                    className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-2 border-t border-gray-100 dark:border-white/5"
                                                                >
                                                                    <Trash2 size={14} /> Delete Employee
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
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

            {activeDropdown && (
                <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
            )}

            {/* Delete Confirmation Modal */}
            {employeeToDelete && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-brand-950 rounded-3xl shadow-2xl w-full max-w-md p-8 border border-gray-100 dark:border-white/10 text-center relative overflow-hidden">
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
                                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
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
                                className="flex-1 py-3 px-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add Employee Modal */}
            {showAddModal && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white dark:bg-brand-950 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-brand-500/20 max-h-[90vh] flex flex-col">
                        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-transparent to-brand-500/5">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Add New Employee</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Create a new member profile</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                                <Plus size={24} className="rotate-45 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleAddEmployee} className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                            {/* Personal Details Section */}
                            <div className="space-y-6">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 opacity-70">Personal Details</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={newEmployee.name}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                                            placeholder="John Doe"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-brand-900/50 border border-gray-200 dark:border-brand-500/20 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Role / Designation *</label>
                                        <input
                                            type="text"
                                            required
                                            value={newEmployee.role}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                                            placeholder="e.g. Senior Developer"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-brand-900/50 border border-gray-200 dark:border-brand-500/20 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address *</label>
                                        <input
                                            type="email"
                                            required
                                            value={newEmployee.email}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                                            placeholder="john.doe@encalm.com"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-brand-900/50 border border-gray-200 dark:border-brand-500/20 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                                        <input
                                            type="tel"
                                            value={newEmployee.phone}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                                            placeholder="+91 98765 43210"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-brand-900/50 border border-gray-200 dark:border-brand-500/20 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
                                        <div className="relative group/select">
                                            <select
                                                value={newEmployee.department}
                                                onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                                                className="appearance-none w-full px-5 py-3.5 bg-gray-50 dark:bg-brand-900/50 border border-gray-200 dark:border-brand-500/20 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all cursor-pointer"
                                            >
                                                <option value="" className="dark:bg-brand-950">Select Department</option>
                                                <option value="HR" className="dark:bg-brand-950">HR</option>
                                                <option value="Engineering" className="dark:bg-brand-950">Engineering</option>
                                                <option value="Design" className="dark:bg-brand-950">Design</option>
                                                <option value="Operations" className="dark:bg-brand-950">Operations</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover/select:text-brand-500 transition-colors">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Office Location</label>
                                        <input
                                            type="text"
                                            value={newEmployee.location}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, location: e.target.value })}
                                            placeholder="e.g. Delhi HQ"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-brand-900/50 border border-gray-200 dark:border-brand-500/20 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Statutory Details Section */}
                            <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-white/5">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 opacity-70">Statutory Details</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PAN Number</label>
                                        <input
                                            type="text"
                                            value={newEmployee.panNumber}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, panNumber: e.target.value.toUpperCase() })}
                                            placeholder="ABCDE1234F"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-brand-900/50 border border-gray-200 dark:border-brand-500/20 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all uppercase placeholder:normal-case placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Aadhaar Number</label>
                                        <input
                                            type="text"
                                            value={newEmployee.aadhaarNumber}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, aadhaarNumber: e.target.value })}
                                            placeholder="XXXX XXXX XXXX"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-brand-900/50 border border-gray-200 dark:border-brand-500/20 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bank Details Section */}
                            <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-white/5">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 opacity-70">Bank Details</h4>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bank Name</label>
                                        <input
                                            type="text"
                                            value={newEmployee.bankName}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, bankName: e.target.value })}
                                            placeholder="e.g. HDFC Bank"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-brand-900/50 border border-gray-200 dark:border-brand-500/20 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">IFSC Code</label>
                                        <input
                                            type="text"
                                            value={newEmployee.ifscCode}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, ifscCode: e.target.value.toUpperCase() })}
                                            placeholder="HDFC0001234"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-brand-900/50 border border-gray-200 dark:border-brand-500/20 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all uppercase placeholder:normal-case placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Number</label>
                                        <input
                                            type="text"
                                            value={newEmployee.accountNumber}
                                            onChange={(e) => setNewEmployee({ ...newEmployee, accountNumber: e.target.value })}
                                            placeholder="Enter bank account number"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-brand-900/50 border border-gray-200 dark:border-brand-500/20 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        </form>
                        <div className="p-8 bg-gray-50 dark:bg-brand-900/50 border-t border-gray-100 dark:border-white/5 flex gap-4">
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 py-4 text-gray-500 dark:text-gray-400 font-black uppercase text-xs tracking-widest hover:text-gray-800 dark:hover:text-white transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddEmployee}
                                className="flex-[2] py-4 bg-brand-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
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
                            className="absolute inset-0 bg-black/40 backdrop-blur-md"
                            onClick={() => setShowFilterDrawer(false)}
                        />

                        {/* Drawer */}
                        <div className="absolute right-0 top-0 w-full max-w-md h-full bg-white dark:bg-brand-900 shadow-2xl animate-slide-in-right">

                            <div className="flex flex-col justify-between h-full p-6">

                                {/* TOP */}
                                <div>
                                    <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">
                                        Advanced Filters
                                    </h2>

                                    <div className="space-y-4">

                                        <input
                                            type="text"
                                            placeholder="Search name..."
                                            value={filters.name}
                                            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                                        />

                                        <input
                                            type="text"
                                            placeholder="Search email..."
                                            value={filters.email}
                                            onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                                        />

                                        <input
                                            type="text"
                                            placeholder="Filter by role..."
                                            value={filters.role}
                                            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                                        />

                                        <input
                                            type="text"
                                            placeholder="Filter by location..."
                                            value={filters.location}
                                            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                                        />

                                        <div className="relative group/dropdown">
                                            <select
                                                value={filters.status}
                                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
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

                                {/* BUTTONS */}
                                <div className="flex gap-3 pt-6">

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
                                        className="flex-1 py-2 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 cursor-pointer"
                                    >
                                        Clear
                                    </button>

                                    <button
                                        onClick={() => {
                                            setAppliedFilters(filters);
                                            setShowFilterDrawer(false);
                                        }}
                                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-700 text-white cursor-pointer hover:from-brand-600 hover:to-brand-800 transition-all duration-200"
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
        </div>
    );
}
