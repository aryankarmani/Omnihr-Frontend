import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, Upload, FileText, User, CreditCard, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function AddEmployee() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: '',
        title: '',
        pan: '',
        aadhaar: '',
        uan: '',
        esic: '',
        bankName: '',
        ifsc: '',
        accountNumber: '',
        joiningDate: new Date().toISOString().split('T')[0]
    });

    const steps = [
        { id: 1, title: 'Personal Details', icon: User },
        { id: 2, title: 'Statutory Info', icon: CreditCard },
        { id: 3, title: 'Documents', icon: FileText },
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNext = async () => {
        // STEP 1 VALIDATION
        if (currentStep === 1) {
            if (!formData.firstName || !formData.lastName || !formData.email || !formData.title || !formData.department) {
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

        // STEP 2 VALIDATION
        if (currentStep === 2) {
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (formData.pan && !panRegex.test(formData.pan.toUpperCase())) {
                toast.error('Invalid PAN Number format (e.g. ABCDE1234F)');
                return;
            }
            if (formData.aadhaar && !/^\d{12}$/.test(formData.aadhaar.replace(/\s/g, ''))) {
                toast.error('Aadhaar Number must be 12 digits');
                return;
            }
            const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
            if (formData.ifsc && !ifscRegex.test(formData.ifsc.toUpperCase())) {
                toast.error('Invalid IFSC Code format');
                return;
            }
            if (formData.accountNumber && !/^\d{9,18}$/.test(formData.accountNumber)) {
                toast.error('Invalid Account Number');
                return;
            }
        }

        if (currentStep < 3) {
            setCurrentStep(c => c + 1);
        } else {
            // Final Submit
            setLoading(true);
            try {
                const submissionData = {
                    ...formData,
                    name: `${formData.firstName} ${formData.lastName}`.trim(),
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
                {/* Header / Stepper */}
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
                                    width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
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
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    type="text"
                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                    placeholder="John"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Last Name *</label>
                                <input
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    type="text"
                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                    placeholder="Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address *</label>
                                <input
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    type="email"
                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                    placeholder="john.doe@encalm.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                                <input
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    type="tel"
                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Department *</label>
                                <div className="relative group/select">
                                    <select
                                        name="department"
                                        value={formData.department}
                                        onChange={handleInputChange}
                                        className="appearance-none w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all cursor-pointer"
                                    >
                                        <option value="" className="dark:bg-brand-900">Select Department</option>
                                        <option value="Engineering" className="dark:bg-brand-900">Engineering</option>
                                        <option value="Design" className="dark:bg-brand-900">Design</option>
                                        <option value="Product" className="dark:bg-brand-900">Product</option>
                                        <option value="Sales" className="dark:bg-brand-900">Sales</option>
                                        <option value="HR" className="dark:bg-brand-900">HR</option>
                                        <option value="Operations" className="dark:bg-brand-900">Operations</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover/select:text-brand-500 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Role / Designation *</label>
                                <input
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    type="text"
                                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                    placeholder="e.g. Senior Developer"
                                />
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
                                            name="pan"
                                            value={formData.pan}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all uppercase placeholder:normal-case placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                            placeholder="ABCDE1234F"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Aadhaar Number</label>
                                        <input
                                            name="aadhaar"
                                            value={formData.aadhaar}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                            placeholder="XXXX XXXX XXXX"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">UAN (PF)</label>
                                        <input
                                            name="uan"
                                            value={formData.uan}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">ESIC Number</label>
                                        <input
                                            name="esic"
                                            value={formData.esic}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
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
                                            name="bankName"
                                            value={formData.bankName}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                            placeholder="e.g. HDFC Bank"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">IFSC Code</label>
                                        <input
                                            name="ifsc"
                                            value={formData.ifsc}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all uppercase placeholder:normal-case placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                            placeholder="HDFC0001234"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Account Number</label>
                                        <input
                                            name="accountNumber"
                                            value={formData.accountNumber}
                                            onChange={handleInputChange}
                                            type="text"
                                            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all tracking-wider placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                            placeholder="Enter 9-18 digit account number"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-3xl p-12 text-center group hover:border-brand-500 transition-colors cursor-pointer bg-gray-50 dark:bg-white/5">
                                <div className="w-16 h-16 bg-brand-100 dark:bg-white/10 text-brand-600 dark:text-white rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <Upload size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Upload Onboarding Documents</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                                    Files are currently simulated for this MVP. Drag and drop functionality coming soon.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm font-bold text-gray-500 uppercase">Required Documents Checklist</p>
                                {[
                                    { name: 'Aadhaar Card', required: true },
                                    { name: 'PAN Card', required: true },
                                    { name: 'Highest Qualification Degree', required: true }
                                ].map((doc, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-brand-800 border border-gray-100 dark:border-white/5 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-lg flex items-center justify-center text-gray-500">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-800 dark:text-white">
                                                    {doc.name} {doc.required && <span className="text-red-500">*</span>}
                                                </p>
                                                <p className="text-xs text-brand-600 font-medium">Ready for capture</p>
                                            </div>
                                        </div>
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
                                {currentStep === 3 ? 'Complete Onboarding' : 'Next Step'} <ChevronRight size={18} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
