import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    User,
    CreditCard,
    FileText,
    CheckCircle2,
    AlertCircle,
    X,
    Eye,
    Download,
    Mail,
    Send,
    Loader2,
    ExternalLink,
    Check,
    Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getMediaUrl } from '../utils/api';
import { downloadFile } from '../utils/fileDownloader';

interface ReviewOnboardingModalProps {
    isOpen: boolean;
    employeeId: string | number | null;
    employeeEmail: string;
    onClose: () => void;
    onApproved: (id: string | number) => void;
    onChangesRequested: (id: string | number, remarks: string) => void;
}

export default function ReviewOnboardingModal({
    isOpen,
    employeeId,
    employeeEmail,
    onClose,
    onApproved,
    onChangesRequested
}: ReviewOnboardingModalProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState<any>(null);
    const [remarks, setRemarks] = useState('');
    const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
    const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<{
        title: string;
        url: string;
        fileName?: string;
        fileType?: string;
    } | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (previewDoc) {
                    setPreviewDoc(null);
                } else if (isOpen) {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, previewDoc, onClose]);

    useEffect(() => {
        if (!isOpen || !employeeId) return;

        const fetchDetails = async () => {
            try {
                setLoading(true);
                setCurrentStep(1);
                const res = await api.get(`/employee/onboarding-details/${employeeId}`);
                setDetails(res.data);
                if (res.data?.adminRemarks) {
                    setRemarks(res.data.adminRemarks);
                } else {
                    setRemarks('');
                }
            } catch (err: any) {
                console.error('Failed to load employee onboarding details:', err);
                toast.error(err.response?.data?.message || 'Failed to fetch submitted details');
                onClose();
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [isOpen, employeeId]);

    if (!isOpen) return null;

    // Steps matching screenshot 100%
    const steps = [
        { id: 1, title: 'PERSONAL DETAILS', icon: User },
        { id: 2, title: 'STATUTORY INFO', icon: CreditCard },
        { id: 3, title: 'SALARY INFO', icon: CreditCard },
        { id: 4, title: 'DOCUMENTS', icon: FileText },
    ];

    // Helper: Add field to remarks
    const addFieldRemark = (fieldName: string, isMissing: boolean, currentValue?: any) => {
        const strVal = currentValue !== null && currentValue !== undefined ? String(currentValue).trim() : '';
        const textToAdd = isMissing || !strVal
            ? `• ${fieldName} is missing / required`
            : `• ${fieldName} needs correction: "${strVal}"`;

        setRemarks(prev => {
            if (prev.includes(textToAdd)) {
                toast('Remark already added for this field', { icon: 'ℹ️' });
                return prev;
            }
            const clean = prev.trim();
            return clean ? `${clean}\n${textToAdd}` : textToAdd;
        });

        toast.success(`Added "${fieldName}" to remarks!`);
    };

    // Send Back for Correction
    const handleSendCorrection = async () => {
        if (!employeeId) return;
        const cleanRemarks = remarks.trim();
        if (!cleanRemarks) {
            toast.error('Please enter remarks explaining what the candidate needs to correct');
            return;
        }

        try {
            setIsSubmittingCorrection(true);
            const res = await api.post(`/employee/request-onboarding-changes/${employeeId}`, {
                remarks: cleanRemarks
            });
            toast.success(res.data?.message || `Correction request sent to ${employeeEmail}`);
            onChangesRequested(employeeId, cleanRemarks);
            onClose();
        } catch (error: any) {
            console.error('Failed to send correction request:', error);
            toast.error(error.response?.data?.message || 'Failed to send correction remarks');
        } finally {
            setIsSubmittingCorrection(false);
        }
    };

    // Final Approve & Send Credentials
    const handleFinalApprove = async () => {
        if (!employeeId) return;

        try {
            setIsSubmittingApproval(true);
            const res = await api.post(`/employee/approve-onboarding/${employeeId}`);
            toast.success(res.data?.message || `Approved! Credentials sent to ${employeeEmail}`);
            onApproved(employeeId);
            onClose();
        } catch (error: any) {
            console.error('Failed to approve onboarding:', error);
            toast.error(error.response?.data?.message || 'Failed to approve employee profile');
        } finally {
            setIsSubmittingApproval(false);
        }
    };

    const user = details?.user || {};
    const profile = details?.profile || {};
    const statutory = details?.statutory || {};
    const bank = details?.bank || {};
    const salary = details?.salary || {};
    const salaryComponents = details?.salaryComponents || [];
    const documents = details?.documents || [];
    const customFieldsMeta = details?.customFieldsMeta || {};
    const customFieldMasters = details?.customFieldMasters || [];

    // Separate First and Last name
    const nameParts = (user.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Document mapping
    const docMap: Record<string, any> = {};
    documents.forEach((d: any) => {
        const name = (d.name || '').toLowerCase();
        if (name.includes('aadhaar')) docMap['aadhaar'] = d;
        else if (name.includes('pan')) docMap['pan'] = d;
        else if (name.includes('degree') || name.includes('qualification')) docMap['degree'] = d;
        else docMap[d.name] = d;
    });

    const formatDateForInput = (d: any) => {
        if (!d) return '';
        try {
            const dt = new Date(d);
            if (isNaN(dt.getTime())) return '';
            return dt.toISOString().split('T')[0];
        } catch {
            return '';
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
            <div className="relative w-full max-w-5xl max-h-[94vh] flex flex-col bg-white dark:bg-[#161B26] rounded-[11px] shadow-2xl border border-[#E2E6ED] dark:border-gray-800 overflow-hidden">

                {/* Top Quick-Bar: Employee Context & Dismiss */}
                <div className="flex items-center justify-between px-6 py-2.5 bg-[#EEF2F6] dark:bg-white/5 border-b border-[#E2E6ED] dark:border-white/10 text-xs">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-[#12151C] dark:text-white">
                            Reviewing Submission: <span className="text-[#2C4FD6] font-semibold">{user.name || employeeEmail}</span>
                        </span>
                        <span className="text-gray-400">&bull;</span>
                        <span className="text-gray-600 dark:text-gray-300">{employeeEmail}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8ECFC] text-[#2C4FD6]">
                            {profile.status === 'Submitted' ? 'Submitted for Approval' : (profile.status || 'Under Review')}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 dark:hover:text-white p-1 rounded-md hover:bg-gray-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        title="Close Modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Scroll Container */}
                <div className="flex-1 overflow-y-auto">
                    {/* Header with Title and Stepper matching screenshots 100% */}
                    <div className="bg-[#F7F8FA] dark:bg-white/5 p-8 border-b border-[#E2E6ED] dark:border-white/10">
                        <h1 className="text-2xl font-bold text-[#12151C] dark:text-white mb-2">Onboard New Employee</h1>
                        <p className="text-[#5B6472] dark:text-gray-400 mb-8">Complete the following steps to add a new team member.</p>

                        <div className="flex items-center justify-between max-w-2xl mx-auto relative">
                            {steps.map((step) => {
                                const isCurrent = currentStep === step.id;
                                const isPast = currentStep > step.id;
                                const StepIcon = step.icon;

                                return (
                                    <div
                                        key={step.id}
                                        onClick={() => setCurrentStep(step.id)}
                                        className="flex flex-col items-center relative z-10 cursor-pointer group"
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                                            currentStep >= step.id
                                                ? 'bg-[#2C4FD6] text-white shadow-md'
                                                : 'bg-gray-200 dark:bg-white/10 text-gray-400 group-hover:bg-gray-300'
                                        }`}>
                                            {isPast ? <Check size={20} /> : <StepIcon size={18} />}
                                        </div>
                                        <span className={`mt-2 text-xs font-semibold uppercase tracking-wider ${
                                            currentStep >= step.id ? 'text-[#2C4FD6] dark:text-blue-400' : 'text-gray-400'
                                        }`}>
                                            {step.title}
                                        </span>
                                    </div>
                                );
                            })}

                            {/* Progress Line */}
                            <div className="absolute top-5 left-[45px] right-[29px] h-0.5 bg-gray-200 dark:bg-white/10 -z-0 hidden md:block">
                                <div
                                    className="h-full bg-[#2C4FD6] transition-all duration-500"
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

                    {/* Step Form Content */}
                    <div className="p-8 w-full">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center space-y-3">
                                <Loader2 size={36} className="animate-spin text-[#2C4FD6]" />
                                <p className="text-xs font-semibold text-[#5B6472] dark:text-gray-400">Loading submitted employee details...</p>
                            </div>
                        ) : (
                            <>
                                {/* STEP 1: PERSONAL DETAILS (100% Matching Screenshot 1) */}
                                {currentStep === 1 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-fade-in">
                                        {/* FIRST NAME * */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">FIRST NAME *</label>
                                                <div className="flex items-center gap-2">
                                                    {firstName ? (
                                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">Filled</span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/40">Not Provided</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => addFieldRemark('First Name', !firstName, firstName)}
                                                        className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                    >
                                                        + Add to Remarks
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                readOnly
                                                value={firstName}
                                                type="text"
                                                className="w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                placeholder="First"
                                            />
                                        </div>

                                        {/* LAST NAME */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">LAST NAME</label>
                                                <div className="flex items-center gap-2">
                                                    {lastName ? (
                                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">Filled</span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/40">Not Provided</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => addFieldRemark('Last Name', !lastName, lastName)}
                                                        className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                    >
                                                        + Add to Remarks
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                readOnly
                                                value={lastName}
                                                type="text"
                                                className="w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                placeholder="Last"
                                            />
                                        </div>

                                        {/* EMAIL ADDRESS * */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">EMAIL ADDRESS *</label>
                                                <div className="flex items-center gap-2">
                                                    {user.email ? (
                                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">Filled</span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/40">Not Provided</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => addFieldRemark('Email Address', !user.email, user.email)}
                                                        className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                    >
                                                        + Add to Remarks
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                readOnly
                                                value={user.email || ''}
                                                type="email"
                                                className="w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                placeholder="Enter your email"
                                            />
                                        </div>

                                        {/* PHONE NUMBER * */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">PHONE NUMBER *</label>
                                                <div className="flex items-center gap-2">
                                                    {profile.phone ? (
                                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">Filled</span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/40">Not Provided</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => addFieldRemark('Phone Number', !profile.phone, profile.phone)}
                                                        className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                    >
                                                        + Add to Remarks
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                readOnly
                                                value={profile.phone || ''}
                                                type="tel"
                                                className="w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                placeholder="+91"
                                            />
                                        </div>

                                        {/* DATE OF BIRTH * */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">DATE OF BIRTH *</label>
                                                <div className="flex items-center gap-2">
                                                    {profile.dob ? (
                                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">Filled</span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/40">Not Provided</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => addFieldRemark('Date of Birth', !profile.dob, profile.dob)}
                                                        className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                    >
                                                        + Add to Remarks
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                type="date"
                                                readOnly
                                                value={formatDateForInput(profile.dob)}
                                                className="w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium"
                                            />
                                        </div>

                                        {/* DATE OF JOINING * */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">DATE OF JOINING *</label>
                                                <div className="flex items-center gap-2">
                                                    {profile.joiningDate ? (
                                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">Filled</span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/40">Not Provided</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => addFieldRemark('Date of Joining', !profile.joiningDate, profile.joiningDate)}
                                                        className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                    >
                                                        + Add to Remarks
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                type="date"
                                                readOnly
                                                value={formatDateForInput(profile.joiningDate)}
                                                className="w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium"
                                            />
                                        </div>

                                        {/* DEPARTMENT * */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">DEPARTMENT *</label>
                                                <div className="flex items-center gap-2">
                                                    {profile.department ? (
                                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">Filled</span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/40">Not Provided</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => addFieldRemark('Department', !profile.department, profile.department)}
                                                        className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                    >
                                                        + Add to Remarks
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="relative group/select">
                                                <select
                                                    disabled
                                                    className="appearance-none w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium cursor-not-allowed"
                                                >
                                                    <option>{profile.department || 'Select Department'}</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SYSTEM ROLE * */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">SYSTEM ROLE *</label>
                                                <div className="flex items-center gap-2">
                                                    {user.role ? (
                                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">Filled</span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/40">Not Provided</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => addFieldRemark('System Role', !user.role, user.role)}
                                                        className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                    >
                                                        + Add to Remarks
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="relative group/select">
                                                <select
                                                    disabled
                                                    className="appearance-none w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium cursor-not-allowed"
                                                >
                                                    <option>{user.role || 'Select Role'}</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* DESIGNATION / TITLE * */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">DESIGNATION / TITLE *</label>
                                                <div className="flex items-center gap-2">
                                                    {profile.title ? (
                                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">Filled</span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/40">Not Provided</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => addFieldRemark('Designation / Title', !profile.title, profile.title)}
                                                        className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                    >
                                                        + Add to Remarks
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="relative group/select">
                                                <select
                                                    disabled
                                                    className="appearance-none w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium cursor-not-allowed"
                                                >
                                                    <option>{profile.title || 'Select Designation'}</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* BLOOD GROUP */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">BLOOD GROUP</label>
                                                <div className="flex items-center gap-2">
                                                    {profile.bloodGroup ? (
                                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">Filled</span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/40">Not Provided</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => addFieldRemark('Blood Group', !profile.bloodGroup, profile.bloodGroup)}
                                                        className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                    >
                                                        + Add to Remarks
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="relative group/select">
                                                <select
                                                    disabled
                                                    className="appearance-none w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium cursor-not-allowed"
                                                >
                                                    <option>{profile.bloodGroup || 'Select Blood Group'}</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RESIDENTIAL ADDRESS * */}
                                        <div className="sm:col-span-2 space-y-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">RESIDENTIAL ADDRESS *</label>
                                                <div className="flex items-center gap-2">
                                                    {profile.address ? (
                                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/40">Filled</span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800/40">Not Provided</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => addFieldRemark('Residential Address', !profile.address, profile.address)}
                                                        className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                    >
                                                        + Add to Remarks
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea
                                                readOnly
                                                rows={2}
                                                value={profile.address || ''}
                                                placeholder="Enter full residential address"
                                                className="w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium placeholder:text-[#9AA3B1] placeholder:font-normal resize-none"
                                            />
                                        </div>

                                        {/* Additional Custom Fields if any */}
                                        {customFieldMasters.filter((cf: any) => cf.category === 'PERSONAL_DETAILS').map((cf: any) => {
                                            const valObj = customFieldsMeta[cf.id];
                                            const val = typeof valObj === 'object' && valObj !== null ? valObj.value : valObj;
                                            return (
                                                <div key={cf.id} className="space-y-2">
                                                    <div className="flex items-center justify-between ml-1">
                                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">{cf.name}</label>
                                                        <div className="flex items-center gap-2">
                                                            {val ? (
                                                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Filled</span>
                                                            ) : (
                                                                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">Not Provided</span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => addFieldRemark(cf.name, !val, val)}
                                                                className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                            >
                                                                + Add to Remarks
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        readOnly
                                                        value={val || ''}
                                                        type="text"
                                                        className="w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium"
                                                        placeholder={`Enter ${cf.name.toLowerCase()}`}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* STEP 2: STATUTORY INFO (100% Matching Screenshot 2) */}
                                {currentStep === 2 && (
                                    <div className="space-y-8 animate-fade-in">
                                        {/* Statutory Details */}
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-[#12151C] dark:text-white border-b border-[#E2E6ED] dark:border-white/10 pb-2">
                                                Statutory Details
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                                {/* PAN NUMBER */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between ml-1">
                                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">PAN NUMBER</label>
                                                        <div className="flex items-center gap-2">
                                                            {statutory.pan ? (
                                                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200">Filled</span>
                                                            ) : (
                                                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200">Not Provided</span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => addFieldRemark('PAN Number', !statutory.pan, statutory.pan)}
                                                                className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                            >
                                                                + Add to Remarks
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        readOnly
                                                        value={statutory.pan || ''}
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium placeholder:text-[#9AA3B1] placeholder:font-normal uppercase"
                                                        placeholder="E.g. ABCDE1234F"
                                                    />
                                                </div>

                                                {/* AADHAAR NUMBER */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between ml-1">
                                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">AADHAAR NUMBER</label>
                                                        <div className="flex items-center gap-2">
                                                            {statutory.aadhaar ? (
                                                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200">Filled</span>
                                                            ) : (
                                                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200">Not Provided</span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => addFieldRemark('Aadhaar Number', !statutory.aadhaar, statutory.aadhaar)}
                                                                className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                            >
                                                                + Add to Remarks
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        readOnly
                                                        value={statutory.aadhaar || ''}
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                        placeholder="XXXX XXXX XXXX"
                                                    />
                                                </div>

                                                {/* UAN (PF) */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between ml-1">
                                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">UAN (PF)</label>
                                                        <div className="flex items-center gap-2">
                                                            {statutory.uan ? (
                                                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200">Filled</span>
                                                            ) : (
                                                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200">Not Provided</span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => addFieldRemark('UAN (PF)', !statutory.uan, statutory.uan)}
                                                                className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                            >
                                                                + Add to Remarks
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        readOnly
                                                        value={statutory.uan || ''}
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                        placeholder="Enter 12-digit UAN number"
                                                    />
                                                </div>

                                                {/* ESIC NUMBER */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between ml-1">
                                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">ESIC NUMBER</label>
                                                        <div className="flex items-center gap-2">
                                                            {statutory.esic ? (
                                                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200">Filled</span>
                                                            ) : (
                                                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200">Not Provided</span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => addFieldRemark('ESIC Number', !statutory.esic, statutory.esic)}
                                                                className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                            >
                                                                + Add to Remarks
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        readOnly
                                                        value={statutory.esic || ''}
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                        placeholder="Enter 10-digit ESIC number"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bank Details */}
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-[#12151C] dark:text-white border-b border-[#E2E6ED] dark:border-white/10 pb-2">
                                                Bank Details
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                                {/* BANK NAME */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between ml-1">
                                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">BANK NAME</label>
                                                        <div className="flex items-center gap-2">
                                                            {bank.bankName ? (
                                                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200">Filled</span>
                                                            ) : (
                                                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200">Not Provided</span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => addFieldRemark('Bank Name', !bank.bankName, bank.bankName)}
                                                                className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                            >
                                                                + Add to Remarks
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        readOnly
                                                        value={bank.bankName || ''}
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                        placeholder="e.g. HDFC Bank"
                                                    />
                                                </div>

                                                {/* IFSC CODE */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between ml-1">
                                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">IFSC CODE</label>
                                                        <div className="flex items-center gap-2">
                                                            {bank.ifsc ? (
                                                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200">Filled</span>
                                                            ) : (
                                                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200">Not Provided</span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => addFieldRemark('IFSC Code', !bank.ifsc, bank.ifsc)}
                                                                className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                            >
                                                                + Add to Remarks
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        readOnly
                                                        value={bank.ifsc || ''}
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium placeholder:text-[#9AA3B1] placeholder:font-normal uppercase"
                                                        placeholder="Enter IFSC code"
                                                    />
                                                </div>

                                                {/* ACCOUNT NUMBER */}
                                                <div className="space-y-2 sm:col-span-2">
                                                    <div className="flex items-center justify-between ml-1">
                                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">ACCOUNT NUMBER</label>
                                                        <div className="flex items-center gap-2">
                                                            {bank.accountNumber ? (
                                                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200">Filled</span>
                                                            ) : (
                                                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200">Not Provided</span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => addFieldRemark('Account Number', !bank.accountNumber, bank.accountNumber)}
                                                                className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                            >
                                                                + Add to Remarks
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        readOnly
                                                        value={bank.accountNumber || ''}
                                                        type="text"
                                                        className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                        placeholder="Enter 9-18 digit account number"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: SALARY INFO (100% Matching Screenshot 3) */}
                                {currentStep === 3 && (
                                    <div className="space-y-6 animate-fade-in">
                                        <h3 className="font-semibold text-[#12151C] dark:text-white border-b border-[#E2E6ED] dark:border-white/10 pb-2">
                                            Salary Info
                                        </h3>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                            {/* BASIC SALARY * */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between ml-1">
                                                    <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">BASIC SALARY *</label>
                                                    <div className="flex items-center gap-2">
                                                        {salary.basic ? (
                                                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200">Filled</span>
                                                        ) : (
                                                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-200">Not Provided</span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => addFieldRemark('Basic Salary', !salary.basic, salary.basic)}
                                                            className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                        >
                                                            + Add to Remarks
                                                        </button>
                                                    </div>
                                                </div>
                                                <input
                                                    readOnly
                                                    value={salary.basic || ''}
                                                    type="text"
                                                    className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                    placeholder="Enter Basic Salary"
                                                />
                                            </div>

                                            {/* SELECT COMPONENTS */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between ml-1">
                                                    <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider">SELECT COMPONENTS</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => addFieldRemark('Salary Components', salaryComponents.length === 0, `${salaryComponents.length} components assigned`)}
                                                        className="text-[11px] font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                    >
                                                        + Add to Remarks
                                                    </button>
                                                </div>
                                                <div className="w-full min-h-[42px] px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] flex items-center justify-between gap-3 text-sm font-medium">
                                                    <span className={salaryComponents.length > 0 ? "text-[#12151C] dark:text-white font-medium" : "text-[#9AA3B1] font-normal"}>
                                                        {salaryComponents.length > 0 ? `${salaryComponents.length} component(s) selected` : 'Select components'}
                                                    </span>
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* SELECTED COMPONENTS */}
                                        <div className="space-y-4 pt-2">
                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2C4FD6]">
                                                SELECTED COMPONENTS
                                            </h4>

                                            {salaryComponents.length === 0 ? (
                                                <div className="min-h-[170px] rounded-[8px] border border-[#E2E6ED] dark:border-white/10 bg-[#F7F8FA] dark:bg-white/5 flex flex-col items-center justify-center text-center">
                                                    <FileText size={36} className="text-gray-400 mb-3" />
                                                    <p className="font-semibold text-gray-700 dark:text-white">
                                                        No components selected
                                                    </p>
                                                    <p className="text-sm text-gray-400 mt-1">
                                                        Select components from dropdown above
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                                    {salaryComponents.map((component: any, idx: number) => (
                                                        <div
                                                            key={component.id || idx}
                                                            className="p-4 rounded-[8px] border border-[#E2E6ED] dark:border-white/10 bg-[#F7F8FA] dark:bg-white/5 flex items-center justify-between gap-4"
                                                        >
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-semibold text-gray-800 dark:text-white text-sm">
                                                                        {component.name}
                                                                    </p>
                                                                    <span
                                                                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                                                            component.type === 'EARNING'
                                                                                ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'
                                                                                : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                                                                        }`}
                                                                    >
                                                                        {component.type}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                    {component.amount ? `₹${component.amount}` : 'Calculated automatically'}
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => addFieldRemark(component.name, false, component.amount ? `₹${component.amount}` : 'Assigned')}
                                                                className="text-xs font-bold text-[#2C4FD6] hover:underline cursor-pointer"
                                                            >
                                                                + Add to Remarks
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* STEP 4: DOCUMENTS (100% Matching Screenshot 4) */}
                                {currentStep === 4 && (
                                    <div className="space-y-6 animate-fade-in">
                                        <div className="space-y-4">
                                            <p className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider mb-2 ml-1">
                                                REQUIRED DOCUMENTS CHECKLIST
                                            </p>

                                            {[
                                                { key: 'aadhaar', name: 'Aadhaar Card', subtext: 'Click to upload document', isAvatar: false },
                                                { key: 'pan', name: 'PAN Card', subtext: 'Click to upload document', isAvatar: false },
                                                { key: 'degree', name: 'Highest Qualification Degree', subtext: 'Click to upload document', isAvatar: false },
                                                { key: 'profilePicture', name: 'Profile Picture', subtext: 'Upload JPG, JPEG or PNG image (Maximum 2MB)', isAvatar: true },
                                            ].map((doc) => {
                                                const fileObj = doc.isAvatar
                                                    ? (profile.avatar ? { url: profile.avatar, name: profile.avatar.split('/').pop(), type: 'image/jpeg' } : null)
                                                    : docMap[doc.key];
                                                const hasFile = !!fileObj;

                                                return (
                                                    <div
                                                        key={doc.key}
                                                        className={`flex items-center justify-between p-4 border rounded-[8px] transition-all ${
                                                            hasFile
                                                                ? 'border-emerald-500/60 bg-emerald-500/5 dark:bg-emerald-500/10'
                                                                : 'border-[#E2E6ED] dark:border-white/10 bg-[#F7F8FA] dark:bg-white/5'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-[6px] flex items-center justify-center transition-colors ${
                                                                hasFile
                                                                    ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                                    : 'bg-[#E8ECFC] text-[#2C4FD6] dark:bg-white/10 dark:text-gray-300'
                                                            }`}>
                                                                {doc.isAvatar ? <User size={20} /> : <FileText size={20} />}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-[#12151C] dark:text-white text-sm">
                                                                    {doc.name}
                                                                </p>
                                                                <p className={`text-xs font-medium transition-colors ${
                                                                    hasFile ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#9AA3B1]'
                                                                }`}>
                                                                    {hasFile ? (fileObj.originalName || fileObj.name || 'Document uploaded') : doc.subtext}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            {hasFile ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setPreviewDoc({
                                                                                title: doc.name,
                                                                                url: getMediaUrl(fileObj.url),
                                                                                fileName: fileObj.originalName || fileObj.name || doc.name,
                                                                                fileType: fileObj.type
                                                                            });
                                                                        }}
                                                                        className="p-2 text-[#2C4FD6] hover:bg-[#2C4FD6]/10 rounded-lg transition-colors cursor-pointer"
                                                                        title="Preview Document"
                                                                    >
                                                                        <Eye size={18} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => downloadFile(getMediaUrl(fileObj.url), fileObj.originalName || fileObj.name || doc.name)}
                                                                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                                                                        title="Download Document"
                                                                    >
                                                                        <Download size={18} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => addFieldRemark(doc.name, false, fileObj.originalName || fileObj.name)}
                                                                        className="text-xs font-bold text-[#2C4FD6] hover:underline cursor-pointer ml-1"
                                                                    >
                                                                        + Add to Remarks
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200">
                                                                        Not Uploaded
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => addFieldRemark(doc.name, true)}
                                                                        className="text-xs font-bold text-amber-700 hover:text-amber-900 dark:text-amber-400 hover:underline cursor-pointer"
                                                                    >
                                                                        + Add to Remarks
                                                                    </button>
                                                                    <div className="w-7 h-7 rounded-full bg-[#E8ECFC] text-[#2C4FD6] dark:bg-white/10 dark:text-white flex items-center justify-center opacity-60">
                                                                        <Upload size={14} />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Footer Bar: Matching Cancel/Back & Next Step Buttons + Admin Decision Bar */}
                <div className="border-t border-[#E2E6ED] dark:border-white/10 bg-[#F7F8FA] dark:bg-white/5 p-5 space-y-4 shrink-0">
                    {/* Stepper Navigation Buttons (Exact look as screenshots) */}
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => {
                                if (currentStep > 1) {
                                    setCurrentStep(prev => prev - 1);
                                } else {
                                    onClose();
                                }
                            }}
                            className="px-6 py-2.5 rounded-[8px] border border-[#E2E6ED] dark:border-white/10 bg-white dark:bg-[#161B26] text-sm font-semibold text-[#12151C] dark:text-white hover:bg-gray-50 transition-all cursor-pointer"
                        >
                            {currentStep === 1 ? 'Cancel' : 'Back'}
                        </button>

                        <div className="flex items-center gap-2">
                            {currentStep < 4 ? (
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(prev => Math.min(4, prev + 1))}
                                    className="px-6 py-2.5 rounded-[8px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    Next Step &rsaquo;
                                </button>
                            ) : (
                                <span className="text-xs font-semibold text-gray-500">
                                    Step 4 of 4 &bull; All steps reviewed
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Admin Remarks Section & Approval Controls */}
                    <div className="pt-3 border-t border-[#E2E6ED] dark:border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-[#12151C] dark:text-white flex items-center gap-1.5">
                                <Mail size={13} className="text-[#2C4FD6]" />
                                Admin Remarks for Candidate (Click "+ Add to Remarks" on any field above to request correction)
                            </label>
                            {remarks && (
                                <button
                                    type="button"
                                    onClick={() => setRemarks('')}
                                    className="text-[11px] text-red-500 hover:underline cursor-pointer"
                                >
                                    Clear all remarks
                                </button>
                            )}
                        </div>

                        <textarea
                            rows={3}
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Click '+ Add to Remarks' beside any field above or type your remarks here. When you click 'Send Back for Correction', an email with these remarks and an edit link will be sent to the employee..."
                            className="w-full px-4 py-2.5 bg-white dark:bg-[#161B26] border border-[#E2E6ED] dark:border-white/10 rounded-[8px] text-xs sm:text-sm text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6] transition-all resize-none font-medium placeholder:text-gray-400"
                        />

                        {/* Action Buttons: Correction (Amber) vs Final Approve (Green/Blue) */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                            <div className="text-[11px] text-[#5B6472] dark:text-gray-400">
                                {remarks.trim() ? (
                                    <span className="text-amber-700 dark:text-amber-400 font-medium">
                                        Remarks added: Ready to send back to candidate for corrections.
                                    </span>
                                ) : (
                                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                        All fields reviewed: Ready for final approval and ID/pass generation.
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={handleSendCorrection}
                                    disabled={isSubmittingCorrection || isSubmittingApproval || !remarks.trim()}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[8px] bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                                    title="Send an email to candidate with remarks to fix their details"
                                >
                                    {isSubmittingCorrection ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Sending Remarks...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={14} />
                                            <span>Send Back for Correction</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleFinalApprove}
                                    disabled={isSubmittingCorrection || isSubmittingApproval}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-[8px] bg-[#107C41] hover:bg-[#0c6333] text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                                    title="Approve onboarding, create employee credentials, and email them to candidate"
                                >
                                    {isSubmittingApproval ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>Approving & Sending Pass...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={14} />
                                            <span>Final Approve & Send ID Pass</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Document Preview Sub-Modal */}
            {previewDoc && createPortal(
                <div
                    className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-sans"
                    onClick={() => setPreviewDoc(null)}
                >
                    <div
                        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#161B26] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-[#F7F8FA] dark:bg-white/5">
                            <div className="flex items-center gap-2.5">
                                <FileText size={18} className="text-[#2C4FD6]" />
                                <div>
                                    <h4 className="text-sm font-bold text-[#12151C] dark:text-white leading-tight">
                                        {previewDoc.title}
                                    </h4>
                                    {previewDoc.fileName && (
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-md">
                                            {previewDoc.fileName}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => downloadFile(previewDoc.url, previewDoc.fileName)}
                                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 hover:bg-gray-100 text-[#5B6472] dark:text-gray-300 transition-all cursor-pointer"
                                    title="Download document"
                                >
                                    <Download size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDoc(null)}
                                    className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50 dark:bg-[#0E1117] min-h-[400px]">
                            {(() => {
                                const isImg = previewDoc.fileType?.startsWith('image/') ||
                                    /\.(jpg|jpeg|png|webp|gif|svg|jfif)(\?.*)?$/i.test(previewDoc.url);
                                const isPdf = previewDoc.fileType === 'application/pdf' ||
                                    /\.pdf(\?.*)?$/i.test(previewDoc.url);

                                if (isImg) {
                                    return (
                                        <img
                                            src={previewDoc.url}
                                            alt={previewDoc.title}
                                            className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-md"
                                        />
                                    );
                                }

                                if (isPdf) {
                                    return (
                                        <iframe
                                            src={`${previewDoc.url}#toolbar=1&navpanes=0`}
                                            className="w-full h-full min-h-[60vh] rounded-lg border border-gray-200 dark:border-gray-800 bg-white"
                                            title={previewDoc.title}
                                        />
                                    );
                                }

                                return (
                                    <div className="text-center p-8 space-y-3">
                                        <FileText size={48} className="text-[#2C4FD6] mx-auto" />
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            Preview not supported directly in modal for this file type.
                                        </p>
                                        <div className="flex items-center justify-center gap-3 pt-2">
                                            <a
                                                href={previewDoc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2C4FD6] text-white text-xs font-semibold rounded-lg hover:bg-[#203FB4]"
                                            >
                                                <ExternalLink size={14} /> Open in New Tab
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => downloadFile(previewDoc.url, previewDoc.fileName)}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-lg hover:bg-gray-200"
                                            >
                                                <Download size={14} /> Download
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>,
        document.body
    );
}
