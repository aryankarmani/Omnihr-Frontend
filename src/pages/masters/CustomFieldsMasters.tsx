import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sliders, Plus, Trash2, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function CustomFieldsMasters() {
    const [activeCategory, setActiveCategory] = useState<'PERSONAL_DETAILS' | 'DOCUMENT_VAULT'>('PERSONAL_DETAILS');
    const [fields, setFields] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Add Field Modal State
    const [showModal, setShowModal] = useState(false);
    const [fieldName, setFieldName] = useState('');
    const [fieldType, setFieldType] = useState('TEXT');
    const [fieldOptions, setFieldOptions] = useState('');

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

    useEffect(() => {
        fetchFields();
    }, [activeCategory]);

    const handleOpenModal = () => {
        setFieldName('');
        setFieldType(activeCategory === 'DOCUMENT_VAULT' ? 'PDF' : 'TEXT');
        setFieldOptions('');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!fieldName.trim()) {
            return toast.error("Field name is required");
        }
        if (fieldType === 'RADIO' && !fieldOptions.trim()) {
            return toast.error("Radio options are required (comma-separated)");
        }
        try {
            setLoading(true);
            const payload = {
                name: fieldName.trim(),
                category: activeCategory,
                type: fieldType,
                options: fieldType === 'RADIO' ? fieldOptions.trim() : null
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


    return (
        <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6 sm:p-8 space-y-6 animate-fade-in relative">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Sliders className="text-[#2C4FD6]" size={24} />
                    <h2 className="text-[15.5px] font-bold text-[#12151C] dark:text-white">Custom Fields Config</h2>
                </div>
                <button
                    onClick={handleOpenModal}
                    className="inline-flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13.5px] font-semibold px-[15px] py-[9px] transition-all cursor-pointer"
                >
                    <Plus size={16} /> Add Field
                </button>
            </div>

            {/* Sub-tabs / Categories */}
            <div className="flex gap-2 border-b border-[#E2E6ED] dark:border-gray-800 pb-2.5">
                {[
                    { key: 'PERSONAL_DETAILS', label: 'Personal Details' },
                    { key: 'DOCUMENT_VAULT', label: 'Document Vault' }
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveCategory(tab.key as any)}
                        className={`px-3.5 py-1.5 rounded-[6px] text-[13px] transition-all whitespace-nowrap cursor-pointer ${activeCategory === tab.key
                                ? 'bg-[#F0F4FA] dark:bg-gray-800 text-[#12151C] dark:text-white font-semibold'
                                : 'text-[#5B6472] dark:text-gray-400 hover:text-[#12151C] dark:hover:text-white font-medium bg-transparent'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Fields List */}
            {loading && fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800">
                    <Loader2 className="w-12 h-12 text-[#2C4FD6] animate-spin mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Fetching custom fields...</p>
                </div>
            ) : fields.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800">
                    <Sliders size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">No Custom Fields</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Configure dynamic fields to show in employee profiles.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#EEF1F5] dark:bg-gray-800/60 border-b border-[#E2E6ED] dark:border-gray-800">
                                <tr>
                                    <th style={{ width: '22.5%' }} className="py-[9px] px-[22px] text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[.05em]">Field Name</th>
                                    <th style={{ width: '28.5%' }} className="py-[9px] px-[22px] text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[.05em]">Category</th>
                                    <th style={{ width: '22.5%' }} className="py-[9px] px-[22px] text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[.05em]">Field Type</th>
                                    <th style={{ width: '22.5%' }} className="py-[9px] px-[22px] text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[.05em]">Created Date</th>
                                    <th style={{ width: '10%' }} className="py-[9px] px-[22px] text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[.05em] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60">
                                {fields.map(field => (
                                    <tr key={field.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="py-[13px] px-[22px] text-[13.5px] font-semibold text-[#12151C] dark:text-white">{field.name}</td>
                                        <td className="py-[13px] px-[22px] text-[13.5px] font-normal text-[#717E95] dark:text-gray-400 capitalize">
                                            {field.category.toLowerCase().replace('_', ' ')}
                                        </td>
                                        <td className="py-[13px] px-[22px] text-[13.5px] font-normal text-[#717E95] dark:text-gray-400 capitalize">
                                            {field.type ? field.type.toLowerCase() : 'text'}
                                        </td>
                                        <td className="py-[13px] px-[22px] text-[13.5px] font-normal text-[#717E95] dark:text-gray-400">
                                            {new Date(field.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-[13px] px-[22px] text-right">
                                            <button
                                                onClick={() => setFieldToDelete(field)}
                                                className="p-1.5 text-[#9AA3B1] hover:text-[#DE350B] transition-colors rounded-[6px] hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
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
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/20 dark:bg-black/60 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">

                        {/* Modal Header */}
                        <div className="p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-white/5">
                            <div>
                                <h3 className="text-base font-bold text-[#12151C] dark:text-white">
                                    Add New Custom Field
                                </h3>
                                <p className="text-[#717E95] dark:text-gray-400 text-xs font-medium mt-0.5">
                                    Add a dynamic field to {activeCategory === 'PERSONAL_DETAILS' ? 'Personal Details' : 'Document Vault'}
                                </p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">Field Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={fieldName}
                                        onChange={(e) => setFieldName(e.target.value)}
                                        placeholder="Enter field name (e.g. Alternate Phone, Emergency Contact)"
                                        className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">Field Type *</label>
                                    <select
                                        value={fieldType}
                                        onChange={(e) => setFieldType(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white cursor-pointer"
                                    >
                                        {activeCategory === 'PERSONAL_DETAILS' ? (
                                            <>
                                                <option value="TEXT">Text</option>
                                                <option value="NUMBER">Number</option>
                                                <option value="EMAIL">Email</option>
                                                <option value="PASSWORD">Password</option>
                                                <option value="RADIO">Radio Button</option>
                                                <option value="FILE">File Upload</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="PDF">PDF Document</option>
                                                <option value="IMAGE">Image</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                {fieldType === 'RADIO' && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">Radio Options * (comma-separated)</label>
                                        <input
                                            type="text"
                                            required
                                            value={fieldOptions}
                                            onChange={(e) => setFieldOptions(e.target.value)}
                                            placeholder="e.g. Male, Female, Other"
                                            className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 border-t border-[#E2E6ED] dark:border-gray-800 flex justify-end gap-3 bg-white dark:bg-[#12151C] rounded-b-[6px]">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 text-[#5B6472] hover:text-[#12151C] dark:text-gray-400 dark:hover:text-white font-semibold transition-colors text-[13.5px] cursor-pointer"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="inline-flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-[13.5px] font-semibold rounded-[6px] px-[18px] py-[9px] transition-all cursor-pointer"
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                Done
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* Delete Confirmation Modal */}
            {fieldToDelete && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4 animate-fade-in">
                    <div className="bg-white dark:bg-brand-950 rounded-[6px] w-full max-w-[calc(100vw-2rem)] sm:max-w-md p-5 sm:p-8 border border-gray-100 dark:border-white/10 text-center relative overflow-hidden">
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
                                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-[6px] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 py-3 px-4 bg-red-500 text-white font-bold rounded-[6px] hover:bg-red-600 transition-colors text-sm flex items-center justify-center gap-2"
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
