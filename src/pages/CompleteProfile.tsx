import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function CompleteProfile() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const [loadingData, setLoadingData] = useState(true);
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Master options loaded via token
    const [departments, setDepartments] = useState<any[]>([]);
    const [designations, setDesignations] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([{ id: 1, name: 'Employee' }]);

    // Form fields matching user image
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dob: '',
        joiningDate: new Date().toISOString().split('T')[0],
        departmentId: '',
        roleId: '',
        designationId: '',
        bloodGroup: '',
        address: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!token) {
            setTokenError('Invitation token is missing. Please click the invitation link sent to your email.');
            setLoadingData(false);
            return;
        }

        const fetchMetadata = async () => {
            try {
                setLoadingData(true);
                const res = await api.get(`/employee/public-onboarding-data?token=${encodeURIComponent(token)}`);
                const data = res.data;

                setDepartments(data.departments || []);
                setDesignations(data.designations || []);
                
                // Strictly only show "Employee" in the role dropdown
                const employeeRole = (data.roles || []).filter((r: any) =>
                    r.name?.toLowerCase().includes('employee')
                );
                const finalRoles = employeeRole.length > 0 ? employeeRole : [{ id: 1, name: 'Employee' }];
                setRoles(finalRoles);

                setFormData(prev => ({
                    ...prev,
                    email: data.email || '',
                    roleId: String(finalRoles[0]?.id || '')
                }));
            } catch (err: any) {
                console.error('Failed to load onboarding data:', err);
                setTokenError(err.response?.data?.message || 'Invalid or expired invitation link. Please request a new invite from your administrator.');
            } finally {
                setLoadingData(false);
            }
        };

        fetchMetadata();
    }, [token]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }
    };

    const [cancelled, setCancelled] = useState(false);

    const handleCancel = async () => {
        try {
            await api.post('/employee/public-onboard-cancel', { token });
        } catch (e) {
            console.error('Cancel error', e);
        }
        setCancelled(true);
    };

    const validatePersonal = () => {
        const errs: Record<string, string> = {};
        if (!formData.firstName.trim()) errs.firstName = 'First Name is required';
        if (!formData.phone.trim()) errs.phone = 'Phone Number is required';
        if (!formData.dob) errs.dob = 'Date of Birth is required';
        if (!formData.joiningDate) errs.joiningDate = 'Date of Joining is required';
        if (!formData.departmentId) errs.departmentId = 'Department is required';
        if (!formData.designationId) errs.designationId = 'Designation is required';
        if (!formData.address.trim()) errs.address = 'Residential Address is required';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validatePersonal()) {
            toast.error('Please fill in all required fields marked with *');
            return;
        }

        try {
            setSubmitting(true);
            await api.post('/employee/public-onboard', {
                token,
                data: formData
            });

            setSubmitted(true);
            toast.success('Profile details submitted successfully!');
        } catch (error: any) {
            console.error('Submission error:', error);
            toast.error(error.response?.data?.message || 'Failed to submit profile details');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingData) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0E1117] flex items-center justify-center p-4 font-sans">
                <div className="text-center space-y-3">
                    <Loader2 size={32} className="animate-spin text-[#2C4FD6] mx-auto" />
                    <p className="text-sm font-semibold text-[#5B6472] dark:text-gray-300">
                        Loading your onboarding details...
                    </p>
                </div>
            </div>
        );
    }

    if (tokenError) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0E1117] flex items-center justify-center p-4 font-sans">
                <div className="max-w-md w-full bg-white dark:bg-[#161B26] p-8 rounded-xl border border-red-200 dark:border-red-900/40 text-center shadow-lg">
                    <div className="w-14 h-14 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                        <AlertCircle size={28} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invitation Link Invalid</h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2">{tokenError}</p>
                </div>
            </div>
        );
    }

    if (cancelled) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0E1117] flex items-center justify-center p-4 font-sans">
                <div className="max-w-md w-full bg-white dark:bg-[#161B26] p-8 rounded-xl border border-gray-200 dark:border-gray-800 text-center shadow-lg">
                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
                        <AlertCircle size={28} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Onboarding Cancelled</h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2">
                        You have cancelled the onboarding process. Please contact your company administrator if you need a new link.
                    </p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0E1117] flex items-center justify-center p-4 font-sans">
                <div className="max-w-md w-full bg-white dark:bg-[#161B26] p-8 rounded-xl border border-emerald-200 dark:border-emerald-900/40 text-center shadow-lg animate-fade-in">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                        <CheckCircle2 size={36} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Completed!</h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                        Thank you for completing your profile details. Your information has been saved successfully in the company database.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0E1117] py-8 sm:py-12 px-4 sm:px-6 font-sans">
            <div className="max-w-4xl mx-auto">
                <form
                    onSubmit={handleSubmit}
                    className="bg-white dark:bg-[#12151C] rounded-lg border border-[#E2E6ED] dark:border-gray-800 shadow-sm overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-[#E2E6ED] dark:border-gray-800 bg-[#FAFAFC] dark:bg-[#161B26]">
                        <h2 className="text-lg font-bold text-[#12151C] dark:text-white tracking-tight">
                            Personal Details
                        </h2>
                        <p className="text-xs text-[#5B6472] dark:text-gray-400 mt-1">
                            Please complete your employee profile details.
                        </p>
                    </div>

                    {/* Form Fields: EXACT match to User Image 4 */}
                    <div className="p-6 sm:p-8 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {/* FIRST NAME * */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">
                                    FIRST NAME *
                                </label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    placeholder="First"
                                    className={`w-full px-3.5 py-2.5 rounded-[6px] border bg-white dark:bg-[#161B26] text-xs sm:text-[13px] text-[#12151C] dark:text-white outline-none transition-all placeholder:text-gray-400 ${
                                        errors.firstName
                                            ? 'border-red-500 focus:border-red-500'
                                            : 'border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]'
                                    }`}
                                />
                                {errors.firstName && <p className="text-[11px] text-red-500 font-medium">{errors.firstName}</p>}
                            </div>

                            {/* LAST NAME */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">
                                    LAST NAME
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    placeholder="Last"
                                    className="w-full px-3.5 py-2.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#161B26] text-xs sm:text-[13px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6] transition-all placeholder:text-gray-400"
                                />
                            </div>

                            {/* EMAIL ADDRESS * */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">
                                    EMAIL ADDRESS *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    readOnly
                                    placeholder="Enter your email"
                                    className="w-full px-3.5 py-2.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 outline-none cursor-not-allowed font-medium"
                                />
                            </div>

                            {/* PHONE NUMBER * */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">
                                    PHONE NUMBER *
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="+91"
                                    className={`w-full px-3.5 py-2.5 rounded-[6px] border bg-white dark:bg-[#161B26] text-xs sm:text-[13px] text-[#12151C] dark:text-white outline-none transition-all placeholder:text-gray-400 ${
                                        errors.phone
                                            ? 'border-red-500 focus:border-red-500'
                                            : 'border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]'
                                    }`}
                                />
                                {errors.phone && <p className="text-[11px] text-red-500 font-medium">{errors.phone}</p>}
                            </div>

                            {/* DATE OF BIRTH * */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">
                                    DATE OF BIRTH *
                                </label>
                                <input
                                    type="date"
                                    name="dob"
                                    value={formData.dob}
                                    onChange={handleInputChange}
                                    placeholder="dd-mm-yyyy"
                                    className={`w-full px-3.5 py-2.5 rounded-[6px] border bg-white dark:bg-[#161B26] text-xs sm:text-[13px] text-[#12151C] dark:text-white outline-none transition-all ${
                                        errors.dob
                                            ? 'border-red-500 focus:border-red-500'
                                            : 'border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]'
                                    }`}
                                />
                                {errors.dob && <p className="text-[11px] text-red-500 font-medium">{errors.dob}</p>}
                            </div>

                            {/* DATE OF JOINING * */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">
                                    DATE OF JOINING *
                                </label>
                                <input
                                    type="date"
                                    name="joiningDate"
                                    value={formData.joiningDate}
                                    onChange={handleInputChange}
                                    placeholder="dd-mm-yyyy"
                                    className="w-full px-3.5 py-2.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#161B26] text-xs sm:text-[13px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6] transition-all"
                                />
                            </div>

                            {/* DEPARTMENT * */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">
                                    DEPARTMENT *
                                </label>
                                <select
                                    name="departmentId"
                                    value={formData.departmentId}
                                    onChange={handleInputChange}
                                    className={`w-full px-3.5 py-2.5 rounded-[6px] border bg-white dark:bg-[#161B26] text-xs sm:text-[13px] text-[#12151C] dark:text-white outline-none transition-all ${
                                        errors.departmentId
                                            ? 'border-red-500 focus:border-red-500'
                                            : 'border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]'
                                    }`}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map((d: any) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                                {errors.departmentId && <p className="text-[11px] text-red-500 font-medium">{errors.departmentId}</p>}
                            </div>

                            {/* SYSTEM ROLE * */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">
                                    SYSTEM ROLE *
                                </label>
                                <select
                                    name="roleId"
                                    value={formData.roleId}
                                    onChange={handleInputChange}
                                    className="w-full px-3.5 py-2.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#161B26] text-xs sm:text-[13px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6] transition-all font-medium"
                                >
                                    {roles.map((r: any) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* DESIGNATION / TITLE * */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">
                                    DESIGNATION / TITLE *
                                </label>
                                <select
                                    name="designationId"
                                    value={formData.designationId}
                                    onChange={handleInputChange}
                                    className={`w-full px-3.5 py-2.5 rounded-[6px] border bg-white dark:bg-[#161B26] text-xs sm:text-[13px] text-[#12151C] dark:text-white outline-none transition-all ${
                                        errors.designationId
                                            ? 'border-red-500 focus:border-red-500'
                                            : 'border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]'
                                    }`}
                                >
                                    <option value="">Select Designation</option>
                                    {designations.map((d: any) => (
                                        <option key={d.id} value={d.id}>{d.title}</option>
                                    ))}
                                </select>
                                {errors.designationId && <p className="text-[11px] text-red-500 font-medium">{errors.designationId}</p>}
                            </div>

                            {/* BLOOD GROUP */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">
                                    BLOOD GROUP
                                </label>
                                <select
                                    name="bloodGroup"
                                    value={formData.bloodGroup}
                                    onChange={handleInputChange}
                                    className="w-full px-3.5 py-2.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#161B26] text-xs sm:text-[13px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6] transition-all"
                                >
                                    <option value="">Select Blood Group</option>
                                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                        <option key={bg} value={bg}>{bg}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* RESIDENTIAL ADDRESS * */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">
                                RESIDENTIAL ADDRESS *
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                placeholder="Enter full residential address"
                                className={`w-full px-3.5 py-2.5 rounded-[6px] border bg-white dark:bg-[#161B26] text-xs sm:text-[13px] text-[#12151C] dark:text-white outline-none transition-all placeholder:text-gray-400 ${
                                    errors.address
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]'
                                }`}
                            />
                            {errors.address && <p className="text-[11px] text-red-500 font-medium">{errors.address}</p>}
                        </div>
                    </div>

                    {/* Bottom Action Bar: Cancel on left, Done on right (Matching Image 4) */}
                    <div className="p-4 sm:p-5 border-t border-[#E2E6ED] dark:border-gray-800 bg-[#FAFAFC] dark:bg-[#161B26] flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-5 py-2 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] hover:bg-gray-50 dark:hover:bg-white/5 text-[#5B6472] dark:text-gray-300 text-xs sm:text-[13px] font-semibold transition-all cursor-pointer"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center justify-center gap-2 px-7 py-2.5 rounded-[6px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-xs sm:text-[13px] font-semibold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <span>Done</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
