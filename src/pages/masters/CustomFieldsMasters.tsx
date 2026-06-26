import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sliders, Plus, Trash2, X, Search, Check, Loader2, ChevronRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function CustomFieldsMasters() {
    const [activeCategory, setActiveCategory] = useState<'PERSONAL_DETAILS' | 'DOCUMENT_VAULT'>('PERSONAL_DETAILS');
    const [fields, setFields] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Add Field Modal State
    const [showModal, setShowModal] = useState(false);
    const [step, setStep] = useState(1);
    const [fieldName, setFieldName] = useState('');
    const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
    const [employeeSearch, setEmployeeSearch] = useState('');

    // Delete Confirmation State
    const [fieldToDelete, setFieldToDelete] = useState<any>(null);

    const fetchFields = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/custom-fields/masters?category=${activeCategory}`);
            setFields(res.data || []);
        } catch (error) {
            console.error("Failed to load custom fields", error);
            toast.error("Failed to load custom fields");
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/employee');
            setEmployees(res.data || []);
        } catch (error) {
            console.error("Failed to load employees", error);
        }
    };

    useEffect(() => {
        fetchFields();
    }, [activeCategory]);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleOpenModal = () => {
        setStep(1);
        setFieldName('');
        setSelectedEmployees([]);
        setEmployeeSearch('');
        setShowModal(true);
    };

    const handleNextStep = () => {
        if (!fieldName.trim()) {
            return toast.error("Field name is required");
        }
        setStep(2);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const payload = {
                name: fieldName.trim(),
                category: activeCategory,
                employeeIds: selectedEmployees
            };
            await api.post('/custom-fields/masters', payload);
            toast.success("Custom field created successfully!");
            setShowModal(false);
            fetchFields();
        } catch (error: any) {
            console.error("Failed to create custom field", error);
            toast.error(error.response?.data?.error || "Failed to create custom field");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!fieldToDelete) return;
        try {
            setLoading(true);
            await api.delete(`/custom-fields/masters/${fieldToDelete.id}`);
            toast.success("Custom field deleted successfully!");
            setFieldToDelete(null);
            fetchFields();
        } catch (error: any) {
            console.error("Failed to delete custom field", error);
            toast.error("Failed to delete custom field");
        } finally {
            setLoading(false);
        }
    };

    // Filter employees based on search
    const filteredEmployees = employees.filter(emp => {
        const query = employeeSearch.toLowerCase().trim();
        const profile = emp.employeeProfile || {};
        return (
            emp.name.toLowerCase().includes(query) ||
            emp.email.toLowerCase().includes(query) ||
            (profile.department || '').toLowerCase().includes(query) ||
            (profile.title || '').toLowerCase().includes(query)
        );
    });

    const handleToggleEmployee = (id: number) => {
        if (selectedEmployees.includes(id)) {
            setSelectedEmployees(selectedEmployees.filter(empId => empId !== id));
        } else {
            setSelectedEmployees([...selectedEmployees, id]);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = filteredEmployees.map(emp => emp.id);
            setSelectedEmployees(allIds);
        } else {
            setSelectedEmployees([]);
        }
    };

    const isAllSelected = filteredEmployees.length > 0 && filteredEmployees.every(emp => selectedEmployees.includes(emp.id));

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Sliders className="text-brand-600" size={24} />
                    <h2 className="text-xl font-bold dark:text-white">Custom Fields Config</h2>
                </div>
                <button
                    onClick={handleOpenModal}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm active:scale-95"
                >
                    <Plus size={16} /> Add Field
                </button>
            </div>

            {/* Sub-tabs / Categories */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                {[
                    { key: 'PERSONAL_DETAILS', label: 'Personal Details' },
                    { key: 'DOCUMENT_VAULT', label: 'Document Vault' }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveCategory(tab.key as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                            activeCategory === tab.key
                                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 ring-1 ring-brand-200 dark:ring-brand-800'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Fields List */}
            {loading && fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-brand-900 rounded-3xl border border-gray-100 dark:border-white/5">
                    <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Fetching custom fields...</p>
                </div>
            ) : fields.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-brand-900 rounded-3xl border border-gray-100 dark:border-white/5">
                    <Sliders size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">No Custom Fields</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Configure dynamic fields to show in employee profiles.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-brand-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-white/5">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Field Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Category</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Created Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {fields.map(field => (
                                    <tr key={field.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">{field.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 capitalize">
                                            {field.category.toLowerCase().replace('_', ' ')}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(field.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setFieldToDelete(field)}
                                                className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
                                                title="Delete Custom Field"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Field Wizard Modal */}
            {showModal && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white dark:bg-brand-950 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-brand-500/20 max-h-[90vh] flex flex-col">
                        
                        {/* Modal Header */}
                        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-transparent to-brand-500/5">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">
                                    {step === 1 ? 'Add New Custom Field' : 'Select Employees'}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                                    {step === 1 ? `Add a dynamic field to ${activeCategory === 'PERSONAL_DETAILS' ? 'Personal Details' : 'Document Vault'}` : `Choose who will have the "${fieldName}" field in their profile`}
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">
                                <Plus size={24} className="rotate-45 text-gray-400" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                            {step === 1 ? (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Field Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={fieldName}
                                        onChange={(e) => setFieldName(e.target.value)}
                                        placeholder="e.g. phone 2"
                                        className="w-full px-5 py-3.5 bg-gray-50 dark:bg-brand-900/50 border border-gray-200 dark:border-brand-500/20 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Search Bar */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search by name, email or designation..."
                                            value={employeeSearch}
                                            onChange={(e) => setEmployeeSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-brand-900/50 border border-gray-200 dark:border-brand-500/20 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-medium placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                        />
                                    </div>

                                    {/* Checklist Table (EnCalm List Tab Style) */}
                                    <div className="border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden max-h-[40vh] overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 dark:bg-white/5 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-6 py-4 w-12">
                                                        <input
                                                            type="checkbox"
                                                            checked={isAllSelected}
                                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                                            className="w-4 h-4 rounded text-brand-600 cursor-pointer accent-brand-600"
                                                        />
                                                    </th>
                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Employee</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Role/Designation</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                {filteredEmployees.map((emp, index) => {
                                                    const profile = emp.employeeProfile || {};
                                                    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
                                                    const avatarColor = colors[index % colors.length];

                                                    return (
                                                        <tr
                                                            key={emp.id}
                                                            onClick={() => handleToggleEmployee(emp.id)}
                                                            className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                                        >
                                                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedEmployees.includes(emp.id)}
                                                                    onChange={() => handleToggleEmployee(emp.id)}
                                                                    className="w-4 h-4 rounded text-brand-600 cursor-pointer accent-brand-600"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md ${avatarColor}`}>
                                                                        {emp.name.split(' ').map((n: string) => n[0]).join('')}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-gray-800 dark:text-white text-sm">{emp.name}</div>
                                                                        <div className="text-[10px] text-gray-500 dark:text-gray-400">{emp.email}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="text-xs text-gray-800 dark:text-white font-bold">{profile.title || 'Employee'}</div>
                                                                <div className="text-[9px] text-gray-400 uppercase font-black tracking-widest">{profile.department || 'General'}</div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {filteredEmployees.length === 0 && (
                                                    <tr>
                                                        <td colSpan={3} className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                                                            No employees found
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="text-xs font-bold text-brand-600 pl-1">
                                        {selectedEmployees.length} employees selected
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-white/5">
                            {step === 2 ? (
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex items-center gap-1 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-all"
                                >
                                    <ArrowLeft size={16} /> Back
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white font-bold transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                            )}
                            
                            {step === 1 ? (
                                <button
                                    onClick={handleNextStep}
                                    className="flex items-center gap-1.5 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/20 transition-all active:scale-95"
                                >
                                    Next <ChevronRight size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="px-8 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/20 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    {loading && <Loader2 size={16} className="animate-spin" />}
                                    Done
                                </button>
                            )}
                        </div>

                    </div>
                </div>, document.body
            )}

            {/* Delete Confirmation Modal */}
            {fieldToDelete && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4 animate-fade-in">
                    <div className="bg-white dark:bg-brand-950 rounded-3xl shadow-2xl w-full max-w-md p-8 border border-gray-100 dark:border-white/10 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={40} className="text-red-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Delete Custom Field?</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8">
                            Are you sure you want to delete <span className="font-bold text-gray-700 dark:text-gray-200">{fieldToDelete.name}</span>? <br />
                            This action will permanently delete the custom field and all values filled by employees.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setFieldToDelete(null)}
                                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 py-3 px-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 text-sm flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
}
