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
    const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
    const [documents, setDocuments] = useState<Record<string, any>>({
        aadhaar: null,
        pan: null,
        degree: null,
    });
    const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<string | null>(null);
    const steps = [
        { id: 1, title: 'Personal Details', icon: User },
        { id: 2, title: 'Statutory Info', icon: CreditCard },
        { id: 3, title: 'Salary Info', icon: CreditCard },
        { id: 4, title: 'Documents', icon: FileText },
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };


    const handleSalaryChange = (field: string, value: string) => {
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
            if (!formData.firstName || !formData.lastName || !formData.email || !formData.roleId || !formData.designationId || !formData.departmentId) {
                toast.error('Please fill in all required fields');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                toast.error('Please enter a valid email address');
                return;
            }
            if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
                toast.error('Phone number must be 10 digits');
                return;
            }
        }


        if (currentStep === 2) {

            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (!formData.pan) {
                toast.error('PAN is required');
                return;
            }
            if (!panRegex.test(formData.pan.trim().toUpperCase())) {
                toast.error('Invalid PAN Number format (e.g. ABCDE1234F)');
                return;
            }

            if (!formData.aadhaar) {
                toast.error('Aadhaar is required');
                return;
            }
            if (!/^\d{12}$/.test(formData.aadhaar.replace(/\s/g, ''))) {
                toast.error('Aadhaar Number must be 12 digits');
                return;
            }

            const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            if (!formData.ifsc) {
                toast.error('IFSC is required');
                return;
            }
            if (!ifscRegex.test(formData.ifsc.trim().toUpperCase())) {
                toast.error('Invalid IFSC Code format (e.g. SBIN0001234)');
                return;
            }

            if (!formData.accountNumber) {
                toast.error('Account Number is required');
                return;
            }
            if (!/^\d{9,18}$/.test(formData.accountNumber.trim())) {
                toast.error('Account Number must be 9–18 digits');
                return;
            }

            const uan = formData.uan.replace(/\s/g, '');

            if (!formData.uan) {
                toast.error('UAN is required');
                return;
            }
            if (!/^\d{12}$/.test(uan)) {
                toast.error('UAN must be 12 digits');
                return;

            }
            const esic = formData.esic.replace(/\s/g, '');

            if (!formData.esic) {
                toast.error('ESIC is required');
                return;
            }
            if (!/^\d{17}$/.test(esic)) {
                toast.error('ESIC must be 17 digits');
                return;
            }
            const bankName = formData.bankName.trim();

            if (!bankName) {
                toast.error('Bank Name is required');
                return;
            }

            // allows only letters & spaces (2–50 chars)
            if (!/^[A-Za-z\s]{2,50}$/.test(bankName)) {
                toast.error('Bank Name must contain only letters (2-50 characters)');
                return;
            }

        }
        // STEP 3 VALIDATION
        if (currentStep === 3) {
            const salary = formData.salary;

            if (
                !salary.basic ||
                !salary.hra ||
                !salary.special ||
                !salary.medical ||
                !salary.pf ||
                !salary.pt ||
                !salary.tax
            ) {
                toast.error('Please fill all salary details');
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
                const submissionData = {
                    ...formData,
                    name: `${formData.firstName} ${formData.lastName}`.trim(),
                    salary: {
                        basic: formData.salary.basic,
                        hra: formData.salary.hra,
                        special: formData.salary.special,
                        medical: formData.salary.medical,
                        pf: formData.salary.pf,
                        pt: formData.salary.pt,
                        tax: formData.salary.tax,
                    },
                };
                await api.post('/employee', submissionData);
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
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Last Name *</label>
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
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                                <input
                                    autoComplete="off"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    type="tel"
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                    placeholder="+91 "
                                />
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
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Date of Birth</label>
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
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Residential Address</label>
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
                                            }}
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                            placeholder="E.g. ABCDE1234F"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Aadhaar Number</label>
                                        <input
                                            autoComplete="off"
                                            name="aadhaar"
                                            value={formData.aadhaar}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                            placeholder="XXXX XXXX XXXX"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">UAN (PF)</label>
                                        <input
                                            autoComplete="off"
                                            name="uan"
                                            value={formData.uan}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                            placeholder="Enter 12-digit UAN number"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">ESIC Number</label>
                                        <input
                                            autoComplete="off"
                                            name="esic"
                                            value={formData.esic}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
                                            placeholder="Enter 17-digit ESIC number "
                                        />
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
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Account Number</label>
                                        <input
                                            name="accountNumber"
                                            autoComplete="off"
                                            value={formData.accountNumber}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, ""); // remove non-numbers
                                                setFormData({ ...formData, accountNumber: value });
                                            }}
                                            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-700 dark:text-white text-sm font-medium transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"

                                            placeholder="Enter 9-18 digit account number"
                                        />
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
                                    { label: 'Basic', key: 'basic' },
                                    { label: 'HRA', key: 'hra' },
                                    { label: 'Special Allowance', key: 'special' },
                                    { label: 'Medical', key: 'medical' },
                                    { label: 'PF', key: 'pf' },
                                    { label: 'PT', key: 'pt' },
                                    { label: 'Tax / TDS', key: 'tax' },
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
                                            placeholder={`Enter ${field.label}`}
                                        />
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
