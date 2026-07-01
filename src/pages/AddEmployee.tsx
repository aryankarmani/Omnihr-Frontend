/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, ChevronDown, Upload, FileText, User, CreditCard, Loader2, Trash2 } from 'lucide-react'; import toast from 'react-hot-toast';
import api from '../utils/api';

export default function AddEmployee() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [salaryComponents, setSalaryComponents] = useState<any[]>([]);
    const [showComponentDropdown, setShowComponentDropdown] = useState(false);
    const [masters, setMasters] = useState({
        departments: [] as any[],
        roles: [] as any[],
        designations: [] as any[]
    });

    const [customFieldMasters, setCustomFieldMasters] = useState<any[]>([]);
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
    const [customFieldFiles, setCustomFieldFiles] = useState<Record<string, File | null>>({});

    useEffect(() => {
        const fetchMasters = async () => {
            try {
                const [deptRes, roleRes, desigRes, salaryCompRes, customFieldsRes] = await Promise.all([
                    api.get('/masters/departments'),
                    api.get('/masters/roles'),
                    api.get('/masters/designations'),
                    api.get('/masters/salary-components'),
                    api.get('/custom-fields/masters')
                ]);

                setMasters({
                    departments: deptRes.data,
                    roles: roleRes.data,
                    designations: desigRes.data
                });

                setSalaryComponents(salaryCompRes.data || []);
                setCustomFieldMasters(customFieldsRes.data || []);
            } catch (error) {
                console.error('Error fetching masters:', error);
            }
        };

        fetchMasters();
    }, []);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        bloodGroup: '',
        address: '',
        dob: '',
        department: '',
        departmentId: '',
        role: '',
        roleId: '',
        title: '',
        designationId: '',
        pan: '',
        aadhaar: '',
        uan: '',
        esic: '',
        bankName: '',
        ifsc: '',
        accountNumber: '',
        salary: {
            basic: '',
        },
        selectedSalaryComponents: [] as any[],
        joiningDate: new Date().toISOString().split('T')[0]
    });

    const [documents, setDocuments] = useState<Record<string, any>>({
        aadhaar: null,
        pan: null,
        degree: null,
    });
    const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<string | null>(null);

    const [errors, setErrors] = useState<any>({});
    const steps = [
        { id: 1, title: 'Personal Details', icon: User },
        { id: 2, title: 'Statutory Info', icon: CreditCard },
        { id: 3, title: 'Salary Info', icon: CreditCard },
        { id: 4, title: 'Documents', icon: FileText },
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (errors[name]) {
            setErrors((prev: any) => ({
                ...prev,
                [name]: ''
            }));
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };


    const handleBasicSalaryChange = (value: string) => {
        setErrors((prev: any) => ({
            ...prev,
            basic: ''
        }));

        setFormData((prev: any) => ({
            ...prev,
            salary: {
                ...prev.salary,
                basic: value.replace(/\D/g, ''),
            },
        }));
    };

    const toggleSalaryComponent = (component: any) => {
        setFormData((prev: any) => {
            const alreadySelected = prev.selectedSalaryComponents.some(
                (item: any) => item.id === component.id
            );

            if (alreadySelected) {
                return {
                    ...prev,
                    selectedSalaryComponents: prev.selectedSalaryComponents.filter(
                        (item: any) => item.id !== component.id
                    ),
                };
            }

            return {
                ...prev,
                selectedSalaryComponents: [
                    ...prev.selectedSalaryComponents,
                    {
                        id: component.id,
                        name: component.name,
                        type: component.type,




                        calculationType: component.calculationType,
                        value: component.value,
                    },
                ],
            };
        });
    };

    const removeSelectedComponent = (componentId: number) => {
        setFormData((prev: any) => ({
            ...prev,
            selectedSalaryComponents: prev.selectedSalaryComponents.filter(
                (item: any) => item.id !== componentId
            ),
        }));
    };

    const handleNext = async () => {
        // STEP 1 VALIDATION
        if (currentStep === 1) {

            const newErrors: any = {};

            if (!formData.firstName) {
                newErrors.firstName = 'First name is required';
            }



            if (!formData.email) {
                newErrors.email = 'Email is required';
            } else {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                if (!emailRegex.test(formData.email)) {
                    newErrors.email = 'Please enter a valid email address';
                }
            }

            if (!formData.phone) {
                newErrors.phone = 'Phone number is required';
            } else if (!/^\d{10}$/.test(formData.phone)) {
                newErrors.phone = 'Enter valid 10 digit phone number';
            }

            if (!formData.departmentId) {
                newErrors.departmentId = 'Select department';
            }

            if (!formData.roleId) {
                newErrors.roleId = 'Select role';
            }

            if (!formData.designationId) {
                newErrors.designationId = 'Select designation';
            }

            if (!formData.bloodGroup) {
                newErrors.bloodGroup = 'Select blood group';
            }
            if (!formData.dob) {
                newErrors.dob = 'Date of birth is required';
            } else {
                const selectedDate = new Date(formData.dob);
                const today = new Date();

                today.setHours(0, 0, 0, 0);

                if (selectedDate > today) {
                    newErrors.dob = 'Future date is not allowed';
                }
            }
            if (!formData.dob) {
                newErrors.dob = 'Date of birth is required';
            }

            // ADD HERE

            if (!formData.joiningDate) {
                newErrors.joiningDate = 'Date of joining is required';
            } else {
                const selectedJoiningDate = new Date(formData.joiningDate);
                const today = new Date();

                today.setHours(0, 0, 0, 0);

                if (selectedJoiningDate > today) {
                    newErrors.joiningDate = 'Future date is not allowed';
                }
            }

            if (!formData.address.trim()) {
                newErrors.address = 'Enter address';
            }

            setErrors(newErrors);

            if (Object.keys(newErrors).length > 0) {
                return;
            }
        }


        if (currentStep === 2) {
            const newErrors: any = {};

            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

            if (!formData.pan) {
                newErrors.pan = 'PAN is required';
            }
            else if (!panRegex.test(formData.pan.trim().toUpperCase())) {
                newErrors.pan = 'Invalid PAN format';
            }

            if (!formData.aadhaar) {
                newErrors.aadhaar = 'Aadhaar is required';
            }
            else if (!/^\d{12}$/.test(formData.aadhaar)) {
                newErrors.aadhaar = 'Aadhaar must be 12 digits';
            }

            const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            if (!formData.ifsc) {
                newErrors.ifsc = 'IFSC is required';

            }
            if (!ifscRegex.test(formData.ifsc.trim().toUpperCase())) {
                newErrors.ifsc = 'Invalid IFSC format';

            }

            if (!formData.accountNumber) {
                newErrors.accountNumber = 'Account Number is required';
            } else if (!/^\d{9,18}$/.test(formData.accountNumber)) {
                newErrors.accountNumber = 'Account Number must be 9–18 digits';
            }



            if (!formData.uan) {
                newErrors.uan = 'UAN is required';
            }
            else if (!/^\d{12}$/.test(formData.uan)) {
                newErrors.uan = 'UAN must be 12 digits';
            }

            if (!formData.esic) {
                newErrors.esic = 'ESIC is required';
            }
            else if (!/^\d{10}$/.test(formData.esic)) {
                newErrors.esic = 'ESIC must be 10 digits';
            }
            const bankName = formData.bankName.trim();

            if (!bankName) {
                newErrors.bankName = 'Bank Name is required';
            } else if (!/^[A-Za-z\s]{2,50}$/.test(bankName)) {
                newErrors.bankName = 'Bank Name must contain only letters';
            }
            setErrors(newErrors);

            if (Object.keys(newErrors).length > 0) {
                return;
            }
        }
        // STEP 3 VALIDATION

        // STEP 4 VALIDATION
        if (currentStep === 4) {
            if (!documents.aadhaar || !documents.pan || !documents.degree) {
                toast.error('Please upload all required documents');
                return;
            }
        }
        if (currentStep < 4) {
            setCurrentStep(c => c + 1);
        } else {
            setLoading(true);
            try {
                // Keep original submissionData exactly untouched
                const submissionData = {
                    ...formData,
                    name: `${formData.firstName} ${formData.lastName}`.trim(),
                    customFieldValues
                };

                const form = new FormData();

                form.append("data", JSON.stringify(submissionData));

                if (documents.aadhaar) {
                    form.append("aadhaar", documents.aadhaar);
                }

                if (documents.pan) {
                    form.append("pan", documents.pan);
                }

                if (documents.degree) {
                    form.append("degree", documents.degree);
                }

                // Append custom field files (both PERSONAL_DETAILS and DOCUMENT_VAULT)
                Object.entries(customFieldFiles).forEach(([fieldId, file]) => {
                    if (file) {
                        form.append(`custom-file-${fieldId}`, file);
                    }
                });

                await api.post('/employee', form, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                });
                toast.success('Employee Onboarded Successfully!');
                navigate('/employee');
            } catch (error: any) {
                console.error('Onboarding error:', error);
                toast.error(error.response?.data?.message || 'Failed to onboard employee');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
        else navigate('/employee');
    };

    return (
        <div className="animate-fade-in-up pb-8">
            <button
                onClick={() => navigate('/employee')}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors"
                disabled={loading}
            >
                <ArrowLeft size={20} /> Back to List
            </button>

            <div className="bg-white dark:bg-brand-900 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 overflow-visible">
                <div className="bg-brand-50/50 dark:bg-white/5 p-8 border-b border-gray-100 dark:border-white/10">
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Onboard New Employee</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">Complete the following steps to add a new team member.</p>

                    <div className="flex items-center justify-between max-w-2xl mx-auto relative">
                        {steps.map((step) => (
                            <div key={step.id} className="flex flex-col items-center relative z-10">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${currentStep >= step.id
                                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30'
                                    : 'bg-gray-200 dark:bg-white/10 text-gray-400'
                                    }`}>
                                    {currentStep > step.id ? <Check size={20} /> : <step.icon size={18} />}
                                </div>
                                <span className={`mt-2 text-xs font-bold uppercase tracking-wider ${currentStep >= step.id ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'
                                    }`}>
                                    {step.title}
                                </span>
                            </div>
                        ))}
                        {/* Progress Line */}
                        <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 dark:bg-white/10 -z-0 hidden md:block">
                            <div
                                className="h-full bg-brand-500 transition-all duration-500"
                                style={{
                                    width:
                                        currentStep === 1 ? '0%' :
                                            currentStep === 2 ? '33%' :
                                                currentStep === 3 ? '66%' :
                                                    '100%',
                                }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="p-8 max-w-4xl mx-auto">
                    {currentStep === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">First Name *</label>
                                <input
                                    autoComplete="new-password"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                    placeholder="First"
                                />{errors.firstName && (
                                    <p className="text-red-500 text-xs ml-1">
                                        {errors.firstName}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Last Name </label>
                                <input
                                    autoComplete="new-password"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                    placeholder="Last"
                                />

                            </div>


                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address *</label>
                                <input
                                    autoComplete="new-password"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    type="email"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                    placeholder="Enter your email"

                                />
                                {errors.email && (
                                    <p className="text-red-500 text-xs ml-1">
                                        {errors.email}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Phone Number *</label>
                                <input
                                    autoComplete="off"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);

                                        setFormData(prev => ({
                                            ...prev,
                                            phone: value
                                        }));

                                        setErrors((prev: any) => ({
                                            ...prev,
                                            phone: ''
                                        }));
                                    }}
                                    type="tel"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                    placeholder="+91 "
                                />
                                {errors.phone && <p className="text-red-500 text-xs ml-1">{errors.phone}</p>}
                            </div>


                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">
                                    Date of Birth *
                                </label>

                                <input
                                    type="date"
                                    name="dob"
                                    value={formData.dob}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={handleInputChange}
                                    className={`w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border ${errors.dob ? 'border-red-500' : 'border-gray-200 dark:border-white/10'
                                        } rounded-2xl outline-none text-gray-800 dark:text-white`}
                                />

                                {errors.dob && (
                                    <p className="text-red-500 text-xs mt-1">{errors.dob}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase">
                                    Date of Joining *
                                </label>

                                <input
                                    type="date"
                                    name="joiningDate"
                                    value={formData.joiningDate}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={handleInputChange}
                                    className={`w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border ${errors.joiningDate ? 'border-red-500' : 'border-gray-200 dark:border-white/10'
                                        } rounded-2xl outline-none text-gray-800 dark:text-white`}
                                />

                                {errors.joiningDate && (
                                    <p className="text-red-500 text-xs mt-1">{errors.joiningDate}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Department *</label>
                                <div className="relative group/select">
                                    <select
                                        name="departmentId"
                                        value={formData.departmentId}
                                        onChange={(e) => {
                                            const id = e.target.value;
                                            const name = masters.departments.find(d => d.id === id)?.name || '';

                                            setFormData({ ...formData, departmentId: id, department: name });

                                            setErrors((prev: any) => ({
                                                ...prev,
                                                departmentId: ''
                                            }));
                                        }}
                                        className="appearance-none w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all cursor-pointer"
                                    >
                                        <option value="" className="dark:bg-brand-900">Select Department</option>
                                        {masters.departments.map(dept => (
                                            <option key={dept.id} value={dept.id} className="dark:bg-brand-900">{dept.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover/select:text-brand-500 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                                {errors.departmentId && (
                                    <p className="text-red-500 text-xs ml-1">
                                        {errors.departmentId}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">System Role *</label>
                                <div className="relative group/select">
                                    <select
                                        name="roleId"
                                        value={formData.roleId}
                                        onChange={(e) => {
                                            const id = e.target.value;
                                            const name = masters.roles.find(r => r.id === id)?.name || '';

                                            setFormData({ ...formData, roleId: id, role: name });

                                            setErrors((prev: any) => ({
                                                ...prev,
                                                roleId: ''
                                            }));
                                        }}
                                        className="appearance-none w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all cursor-pointer"
                                    >
                                        <option value="" className="dark:bg-brand-900">Select Role</option>
                                        {masters.roles.map(role => (
                                            <option key={role.id} value={role.id} className="dark:bg-brand-900">{role.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover/select:text-brand-500 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                                {errors.roleId && (
                                    <p className="text-red-500 text-xs ml-1">
                                        {errors.roleId}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Designation / Title *</label>
                                <div className="relative group/select">
                                    <select
                                        name="designationId"
                                        value={formData.designationId}
                                        onChange={(e) => {
                                            const id = e.target.value;
                                            const name = masters.designations.find(d => d.id === id)?.name || '';

                                            setFormData({ ...formData, designationId: id, title: name });

                                            setErrors((prev: any) => ({
                                                ...prev,
                                                designationId: ''
                                            }));
                                        }}
                                        className="appearance-none w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all cursor-pointer"
                                    >
                                        <option value="" className="dark:bg-brand-900">Select Designation</option>
                                        {masters.designations.map(desig => (
                                            <option key={desig.id} value={desig.id} className="dark:bg-brand-900">{desig.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover/select:text-brand-500 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                                {errors.designationId && (
                                    <p className="text-red-500 text-xs ml-1">
                                        {errors.designationId}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                                    Blood Group
                                </label>

                                <div className="relative group/select">
                                    <select
                                        name="bloodGroup"
                                        value={formData.bloodGroup}
                                        onChange={handleInputChange}
                                        className="appearance-none w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all cursor-pointer"
                                    >
                                        <option value="" className="dark:bg-brand-900">Select Blood Group</option>
                                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                            <option key={bg} value={bg} className="dark:bg-brand-900">
                                                {bg}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover/select:text-brand-500 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </div>
                                </div>

                                {errors.bloodGroup && (
                                    <p className="text-red-500 text-xs ml-1">
                                        {errors.bloodGroup}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Residential Address *</label>
                                <div className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus-within:ring-4 focus-within:ring-brand-500/20 transition-all overflow-hidden h-[46px]">
                                    <textarea
                                        autoComplete="off"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        rows={1}
                                        className="w-full px-4 py-3 bg-transparent border-0 outline-none text-gray-700 dark:text-white text-sm font-medium placeholder:text-gray-400 dark:placeholder:text-gray-400 resize-none h-full overflow-y-auto block scrollbar-thin"
                                        placeholder="Enter full residential address"
                                    />
                                </div>
                                {errors.address && (
                                    <p className="text-red-500 text-xs ml-1">
                                        {errors.address}
                                    </p>
                                )}
                            </div>

                            {customFieldMasters.filter(cf => cf.category === 'PERSONAL_DETAILS').length > 0 && (
                                <div className="md:col-span-2 border-t border-gray-100 dark:border-white/5 my-2 pt-4">
                                    <h4 className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest">Additional Details</h4>
                                </div>
                            )}

                            {customFieldMasters.filter(cf => cf.category === 'PERSONAL_DETAILS').map((cf) => {
                                const fieldType = cf.type || 'TEXT';
                                
                                return (
                                    <div key={cf.id} className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{cf.name}</label>
                                        {fieldType === 'RADIO' ? (
                                            <div className="w-full flex gap-6 items-center px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl h-[46px]">
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`radio-${cf.id}`}
                                                        value="Yes"
                                                        checked={customFieldValues[cf.id] === 'Yes'}
                                                        onChange={() => setCustomFieldValues(prev => ({ ...prev, [cf.id]: 'Yes' }))}
                                                        className="w-4 h-4 text-brand-600 focus:ring-brand-500 accent-brand-600"
                                                    />
                                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Yes</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`radio-${cf.id}`}
                                                        value="No"
                                                        checked={customFieldValues[cf.id] === 'No'}
                                                        onChange={() => setCustomFieldValues(prev => ({ ...prev, [cf.id]: 'No' }))}
                                                        className="w-4 h-4 text-brand-600 focus:ring-brand-500 accent-brand-600"
                                                    />
                                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">No</span>
                                                </label>
                                            </div>
                                        ) : fieldType === 'FILE' ? (
                                            <div className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl h-[46px]">
                                                <span className="text-xs text-gray-500 truncate max-w-[180px]">
                                                    {customFieldFiles[cf.id] ? customFieldFiles[cf.id]?.name : 'No file chosen'}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById(`cf-file-input-${cf.id}`)?.click()}
                                                        className="px-3 py-1 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition-colors cursor-pointer"
                                                    >
                                                        Choose File
                                                    </button>
                                                    {customFieldFiles[cf.id] && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCustomFieldFiles(prev => ({ ...prev, [cf.id]: null }))}
                                                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                                <input
                                                    id={`cf-file-input-${cf.id}`}
                                                    type="file"
                                                    className="hidden"
                                                    accept=".pdf,image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            setCustomFieldFiles(prev => ({ ...prev, [cf.id]: file }));
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <input
                                                type={fieldType === 'PASSWORD' ? 'password' : fieldType === 'NUMBER' ? 'number' : fieldType === 'EMAIL' ? 'email' : 'text'}
                                                value={customFieldValues[cf.id] || ''}
                                                onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [cf.id]: e.target.value }))}
                                                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all"
                                                placeholder={`Enter ${cf.name.toLowerCase()}`}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-800 dark:text-white border-b border-gray-100 dark:border-white/10 pb-2">Statutory Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">PAN Number</label>
                                        <input
                                            autoComplete="off"
                                            name="pan"
                                            value={formData.pan}
                                            onChange={(e) => {
                                                setFormData({
                                                    ...formData,
                                                    pan: e.target.value.toUpperCase()
                                                });

                                                setErrors((prev: any) => ({
                                                    ...prev,
                                                    pan: ''
                                                }));
                                            }}
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                            placeholder="E.g. ABCDE1234F"
                                        />
                                        {errors.pan && <p className="text-red-500 text-xs ml-1">{errors.pan}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Aadhaar Number</label>
                                        <input
                                            autoComplete="off"
                                            name="aadhaar"
                                            value={formData.aadhaar}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '').slice(0, 12);

                                                setFormData({
                                                    ...formData,
                                                    aadhaar: value
                                                });
                                                setErrors((prev: any) => ({
                                                    ...prev,
                                                    aadhaar: ''
                                                }));
                                            }}
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                            placeholder="XXXX XXXX XXXX"
                                        />
                                        {errors.aadhaar && <p className="text-red-500 text-xs ml-1">{errors.aadhaar}</p>}

                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">UAN (PF)</label>
                                        <input
                                            autoComplete="off"
                                            name="uan"
                                            value={formData.uan}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '').slice(0, 12);

                                                setFormData({
                                                    ...formData,
                                                    uan: value
                                                });
                                                setErrors((prev: any) => ({
                                                    ...prev,
                                                    uan: ''
                                                }));
                                            }}
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                            placeholder="Enter 12-digit UAN number"
                                        />
                                        {errors.uan && <p className="text-red-500 text-xs ml-1">{errors.uan}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">ESIC Number</label>
                                        <input
                                            autoComplete="off"
                                            name="esic"
                                            value={formData.esic}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '').slice(0, 10);

                                                setFormData({
                                                    ...formData,
                                                    esic: value
                                                });
                                                setErrors((prev: any) => ({
                                                    ...prev,
                                                    esic: ''
                                                }));
                                            }}
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                            placeholder="Enter 10-digit ESIC number "
                                        />
                                        {errors.esic && <p className="text-red-500 text-xs ml-1">{errors.esic}</p>}

                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-gray-800 dark:text-white border-b border-gray-100 dark:border-white/10 pb-2">Bank Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Bank Name</label>
                                        <input
                                            autoComplete="off"
                                            name="bankName"
                                            value={formData.bankName}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                            placeholder="e.g. HDFC Bank"
                                        />
                                        {errors.bankName && <p className="text-red-500 text-xs ml-1">{errors.bankName}</p>}

                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">IFSC Code</label>
                                        <input
                                            autoComplete="off"
                                            name="ifsc"
                                            value={formData.ifsc}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all uppercase placeholder:normal-case placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                            placeholder="Enter IFSC code"
                                        />
                                        {errors.ifsc && <p className="text-red-500 text-xs ml-1">{errors.ifsc}</p>}

                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Account Number</label>
                                        <input
                                            name="accountNumber"
                                            autoComplete="off"
                                            value={formData.accountNumber}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, "").slice(0, 18);

                                                setFormData({
                                                    ...formData,
                                                    accountNumber: value
                                                });

                                                setErrors((prev: any) => ({
                                                    ...prev,
                                                    accountNumber: ''
                                                }));
                                            }}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"

                                            placeholder="Enter 9-18 digit account number"
                                        />
                                        {errors.accountNumber && <p className="text-red-500 text-xs ml-1">{errors.accountNumber}</p>}
                                    </div>
                                </div>
                            </div>


                        </div>
                    )}
                    {currentStep === 3 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="font-bold text-gray-800 dark:text-white border-b border-gray-100 dark:border-white/10 pb-2">
                                Salary Info
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Basic Salary */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                                        Basic Salary *
                                    </label>

                                    <input
                                        type="text"
                                        value={formData.salary.basic}
                                        onChange={(e) => handleBasicSalaryChange(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                        placeholder="Enter Basic Salary"
                                    />

                                    {errors.basic && (
                                        <p className="text-red-500 text-xs ml-1">
                                            {errors.basic}
                                        </p>
                                    )}
                                </div>

                                {/* Component Dropdown */}
                                <div className="space-y-2 relative">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                                        Select Components
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => setShowComponentDropdown(!showComponentDropdown)}
                                        className="w-full min-h-[42px] px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all flex items-center justify-between gap-3"
                                    >
                                        <div className="flex flex-wrap gap-2 text-left">
                                            {formData.selectedSalaryComponents.length > 0 ? (
                                                formData.selectedSalaryComponents.map((component: any) => (
                                                    <span
                                                        key={component.id}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-600 text-white text-xs font-bold"
                                                    >
                                                        {component.name}
                                                        <span
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeSelectedComponent(component.id);
                                                            }}
                                                            className="cursor-pointer text-white/80 hover:text-white"
                                                        >
                                                            ×
                                                        </span>
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-400">Select components</span>
                                            )}
                                        </div>

                                        <ChevronDown
                                            size={18}
                                            className={`shrink-0 transition-transform ${showComponentDropdown ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {showComponentDropdown && (
                                        <div className="absolute z-[9999] mt-2 w-full max-h-64 overflow-y-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-brand-950 shadow-2xl p-3 space-y-2">                                            {salaryComponents.length > 0 ? (
                                            salaryComponents.map((component: any) => {
                                                const checked = formData.selectedSalaryComponents.some(
                                                    (item: any) => item.id === component.id
                                                );

                                                return (
                                                    <label
                                                        key={component.id}
                                                        className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-white text-sm font-medium"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => toggleSalaryComponent(component)}
                                                            className="w-4 h-4 accent-brand-600"
                                                        />

                                                        <span className="flex-1">{component.name}</span>

                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${component.type === 'EARNING'
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                                                            : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                                                            }`}>
                                                            {component.type}
                                                        </span>
                                                    </label>
                                                );
                                            })
                                        ) : (
                                            <p className="text-sm text-gray-400 px-3 py-4 text-center">
                                                No salary components found
                                            </p>
                                        )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Selected Component Inputs */}
                            {(<div className="space-y-4 pt-2">
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400">
                                    Selected Components
                                </h4>

                                {formData.selectedSalaryComponents.length === 0 ? (
                                    <div className="min-h-[170px] rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex flex-col items-center justify-center text-center">
                                        <FileText size={36} className="text-gray-400 mb-3" />
                                        <p className="font-bold text-gray-700 dark:text-white">
                                            No components selected
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Select components from dropdown above
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {formData.selectedSalaryComponents.map((component: any) => (
                                            <div
                                                key={component.id}
                                                className="p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-between gap-4"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-gray-800 dark:text-white">
                                                            {component.name}
                                                        </p>

                                                        <span
                                                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${component.type === 'EARNING'
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                                                                : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                                                                }`}
                                                        >
                                                            {component.type}
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        Calculation:{" "}
                                                        {component.calculationType === "FLAT"
                                                            ? `₹${component.value}`
                                                            : component.calculationType === "%_BASIC"
                                                                ? `${component.value}% of Basic`
                                                                : component.calculationType === "%_GROSS"
                                                                    ? `${component.value}% of Gross`
                                                                    : `${component.value}`}
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => removeSelectedComponent(component.id)}
                                                    className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            )}
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="space-y-4">
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Required Documents Checklist</p>
                                {[
                                    { key: 'aadhaar', name: 'Aadhaar Card', required: true, isCustom: false, type: 'FILE' },
                                    { key: 'pan', name: 'PAN Card', required: true, isCustom: false, type: 'FILE' },
                                    { key: 'degree', name: 'Highest Qualification Degree', required: true, isCustom: false, type: 'FILE' },
                                    ...customFieldMasters.filter(cf => cf.category === 'DOCUMENT_VAULT').map(cf => ({
                                        key: cf.id,
                                        name: cf.name,
                                        required: false,
                                        isCustom: true,
                                        type: cf.type || 'FILE'
                                    }))
                                ].map((doc, i) => {
                                    const hasFile = doc.isCustom ? !!customFieldFiles[doc.key] : !!documents[doc.key];
                                    const fileObj = doc.isCustom ? customFieldFiles[doc.key] : documents[doc.key];
                                    const acceptString = doc.isCustom 
                                        ? (doc.type === 'PDF' ? '.pdf' : doc.type === 'IMAGE' ? 'image/*' : '.pdf,image/*') 
                                        : 'application/pdf,image/*';

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => document.getElementById(`fileInput-${doc.key}`)?.click()}
                                            className={`flex items-center justify-between p-4 cursor-pointer border rounded-2xl transition-all ${hasFile
                                                ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                                                : 'border-gray-200 dark:border-white/10 hover:border-brand-500 dark:hover:border-brand-500 bg-gray-50 dark:bg-white/5 hover:scale-[1.01] shadow-sm'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${hasFile
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-gray-100 dark:bg-white/10 text-gray-400'
                                                    }`}>
                                                    <FileText size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800 dark:text-white text-base">
                                                        {doc.name} {doc.required && <span className="text-red-500">*</span>}
                                                    </p>
                                                    <p className={`text-xs font-medium transition-colors ${hasFile ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                        {hasFile ? fileObj?.name : 'Click to upload document'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {hasFile ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmDeleteDoc(doc.key);
                                                        }}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-white/10 text-brand-600 dark:text-brand-400 flex items-center justify-center hover:scale-110 transition-transform">
                                                        <Upload size={16} />
                                                    </div>
                                                )}
                                            </div>

                                            <input
                                                id={`fileInput-${doc.key}`}
                                                type="file"
                                                className="hidden"
                                                accept={acceptString}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        if (doc.isCustom) {
                                                            if (doc.type === 'PDF' && file.type !== "application/pdf") {
                                                                toast.error("Only PDF files are allowed for this field");
                                                                e.target.value = '';
                                                                return;
                                                            }
                                                            if (doc.type === 'IMAGE' && !file.type.startsWith("image/")) {
                                                                toast.error("Only image files are allowed for this field");
                                                                e.target.value = '';
                                                                return;
                                                            }
                                                            setCustomFieldFiles(prev => ({ ...prev, [doc.key]: file }));
                                                        } else {
                                                            const isDuplicate = Object.entries(documents).some(([key, val]) => {
                                                                if (key !== doc.key && val) {
                                                                    return val.name === file.name && val.size === file.size;
                                                                }
                                                                return false;
                                                            });

                                                            if (isDuplicate) {
                                                                toast.error(`This file has already been uploaded Please select a unique document.`);
                                                                e.target.value = '';
                                                                return;
                                                            }

                                                            setDocuments(prev => ({
                                                                ...prev,
                                                                [doc.key]: file
                                                            }));
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Navigation */}
                <div className="p-8 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-between items-center">
                    <button
                        onClick={handleBack}
                        disabled={loading}
                        className="px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        {currentStep === 1 ? 'Cancel' : 'Back'}
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition-all font-bold disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Processing...
                            </>
                        ) : (
                            <>
                                {currentStep === 4 ? 'Complete Onboarding' : 'Next Step'} <ChevronRight size={18} />
                            </>
                        )}
                    </button>
                </div>
            </div>
            {confirmDeleteDoc && createPortal(
                <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-brand-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-gray-100 dark:border-white/10 animate-scale-in">
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Remove Document?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
                            Are you sure you want to remove this document? You will need to upload it again if needed.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDeleteDoc(null)}
                                className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const isCustom = customFieldMasters.some(cf => cf.id === confirmDeleteDoc);
                                    if (isCustom) {
                                        setCustomFieldFiles(prev => ({
                                            ...prev,
                                            [confirmDeleteDoc]: null
                                        }));
                                    } else {
                                        setDocuments(prev => ({
                                            ...prev,
                                            [confirmDeleteDoc]: null
                                        }));
                                    }
                                    setConfirmDeleteDoc(null);
                                }}
                                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold shadow-lg shadow-red-500/30 transition-all active:scale-95"
                            >
                                Yes, Remove
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
