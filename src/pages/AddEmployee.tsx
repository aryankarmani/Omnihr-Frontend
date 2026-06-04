/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, Upload, FileText, User, CreditCard, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function AddEmployee() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
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
            hra: '',
            special: '',
            medical: '',
            pf: '',
            pt: '',
            tax: '',
        },
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


    const handleSalaryChange = (field: string, value: string) => {

        setErrors((prev: any) => ({
            ...prev,
            [field]: ''
        }));

        setFormData((prev: any) => ({
            ...prev,
            salary: {
                ...prev.salary,
                [field]: value.replace(/\D/g, ''),
            },
        }));
    };

    const handleNext = async () => {
        // STEP 1 VALIDATION
        if (currentStep === 1) {

            const newErrors: any = {};

            if (!formData.firstName) {
                newErrors.firstName = 'First name is required';
            }

            if (!formData.lastName) {
                newErrors.lastName = 'Last name is required';
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
        if (currentStep === 3) {

            const newErrors: any = {};

            const salary = formData.salary;

            if (salary.basic === '') {
                newErrors.basic = 'Basic salary is required';
            }

            if (salary.hra === '') {
                newErrors.hra = 'HRA is required';
            }

            if (salary.special === '') {
                newErrors.special = 'Special Allowance is required';
            }

            if (salary.medical === '') {
                newErrors.medical = 'Medical amount is required';
            }

            if (salary.pf === '') {
                newErrors.pf = 'PF amount is required';
            }

            if (salary.pt === '') {
                newErrors.pt = 'PT amount is required';
            }

            if (salary.tax === '') {
                newErrors.tax = 'Tax / TDS amount is required';
            }

            setErrors(newErrors);

            if (Object.keys(newErrors).length > 0) {
                return;
            }
        }

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

            <div className="bg-white dark:bg-brand-900 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5 overflow-hidden">

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
                                  {errors.lastName && (
                               <p className="text-red-500 text-xs ml-1">
                            {errors.lastName}
                             </p>)}
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
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Blood Group</label>
                                <div className="relative group/select">
                                    <select
                                        name="bloodGroup"
                                        value={formData.bloodGroup}
                                        onChange={handleInputChange}
                                        className="appearance-none w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all cursor-pointer"
                                    >
                                        <option value="" className="dark:bg-brand-900">Select Blood Group</option>
                                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                            <option key={bg} value={bg} className="dark:bg-brand-900">{bg}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover/select:text-brand-500 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                                {errors.bloodGroup && (
                                    <p className="text-red-500 text-xs ml-1">
                                        {errors.bloodGroup}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Date of Birth *</label>
                                <input
                                    autoComplete="off"
                                    name="dob"
                                    value={formData.dob}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val) {
                                            const parts = val.split('-');
                                            if (parts[0] && parts[0].length > 4) {
                                                parts[0] = parts[0].substring(0, 4);
                                                setFormData(prev => ({ ...prev, dob: parts.join('-') }));
                                                return;
                                            }
                                        }
                                        handleInputChange(e);
                                    }}
                                    type="date"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                />
                                {errors.dob && (
                                <p className="text-red-500 text-xs ml-1">
                                  {errors.dob}
                                   </p>
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
                                                const value = e.target.value.replace(/\D/g, "");

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
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="font-bold text-gray-800 dark:text-white border-b border-gray-100 dark:border-white/10 pb-2">
                                Salary Info
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    { label: 'Basic *', key: 'basic' },
                                    { label: 'HRA *', key: 'hra' },
                                    { label: 'Special Allowance *', key: 'special' },
                                    { label: 'Medical *', key: 'medical' },
                                    { label: 'PF *', key: 'pf' },
                                    { label: 'PT *', key: 'pt' },
                                    { label: 'Tax / TDS *', key: 'tax' },
                                ].map((field) => (
                                    <div key={field.key} className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">
                                            {field.label}
                                        </label>

                                        <input
                                            type="text"
                                            value={(formData.salary as any)[field.key] || ''}
                                            onChange={(e) => handleSalaryChange(field.key, e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                            placeholder={
                                                field.key === 'basic'
                                                    ? 'Enter Basic Salary'
                                                    : `Enter ${field.label} Amount (Enter 0 if none)`
                                            }
                                        />
                                        {errors[field.key] && (
                                            <p className="text-red-500 text-xs ml-1">
                                                {errors[field.key]}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="space-y-4">
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Required Documents Checklist</p>
                                {[
                                    { key: 'aadhaar', name: 'Aadhaar Card', required: true },
                                    { key: 'pan', name: 'PAN Card', required: true },
                                    { key: 'degree', name: 'Highest Qualification Degree', required: true }
                                ].map((doc, i) => (
                                    <div
                                        key={i}
                                        onClick={() => document.getElementById(`fileInput-${doc.key}`)?.click()}
                                        className={`flex items-center justify-between p-4 cursor-pointer border rounded-2xl transition-all ${documents[doc.key]
                                            ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                                            : 'border-gray-200 dark:border-white/10 hover:border-brand-500 dark:hover:border-brand-500 bg-gray-50 dark:bg-white/5 hover:scale-[1.01] shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${documents[doc.key]
                                                ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-gray-100 dark:bg-white/10 text-gray-400'
                                                }`}>
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800 dark:text-white text-base">
                                                    {doc.name} {doc.required && <span className="text-red-500">*</span>}
                                                </p>
                                                <p className={`text-xs font-medium transition-colors ${documents[doc.key] ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                    {documents[doc.key] ? (documents[doc.key] as File).name : 'Click to upload document'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {documents[doc.key] ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmDeleteDoc(doc.key);
                                                    }}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
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
                                            accept="application/pdf,image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    // Check if this file is already selected for another slot
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
                                            }}
                                        />
                                    </div>
                                ))}
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
                                    setDocuments(prev => ({
                                        ...prev,
                                        [confirmDeleteDoc]: null
                                    }));
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
