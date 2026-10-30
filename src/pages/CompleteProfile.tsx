import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
    Check,
    ChevronRight,
    ChevronDown,
    Upload,
    FileText,
    User,
    CreditCard,
    Loader2,
    Trash2,
    Eye,
    ExternalLink,
    Image as ImageIcon,
    X,
    Download,
    AlertCircle,
    CheckCircle2,
    Mail
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { downloadFile } from '../utils/fileDownloader';

const parseRadioOptions = (optionsString: string | null | undefined): string[] => {
    if (!optionsString) return ['Yes', 'No'];
    if (optionsString.includes(',')) {
        return optionsString.split(',').map(o => o.trim()).filter(Boolean);
    }
    if (optionsString.includes('/')) {
        return optionsString.split('/').map(o => o.trim()).filter(Boolean);
    }
    if (optionsString.includes(';')) {
        return optionsString.split(';').map(o => o.trim()).filter(Boolean);
    }
    if (optionsString.trim().includes(' ')) {
        return optionsString.split(/\s+/).map(o => o.trim()).filter(Boolean);
    }
    return [optionsString.trim()];
};

export default function CompleteProfile() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const [currentStep, setCurrentStep] = useState(1);
    const [loadingData, setLoadingData] = useState(true);
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [cancelled, setCancelled] = useState(false);

    const [salaryComponents, setSalaryComponents] = useState<any[]>([]);
    const [showComponentDropdown, setShowComponentDropdown] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<{
        title: string;
        url: string;
        fileName?: string;
        fileType?: string;
    } | null>(null);

    const salaryDropdownRef = useRef<HTMLDivElement | null>(null);

    const [masters, setMasters] = useState({
        departments: [] as any[],
        roles: [] as any[],
        designations: [] as any[]
    });

    const [customFieldMasters, setCustomFieldMasters] = useState<any[]>([]);
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
    const [customFieldFiles, setCustomFieldFiles] = useState<Record<string, File | null>>({});

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
        role: 'Employee',
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
        joiningDate: new Date().toISOString().split('T')[0],
        workingStartDate: new Date().toISOString().split('T')[0]
    });

    const [documents, setDocuments] = useState<Record<string, any>>({
        aadhaar: null,
        pan: null,
        degree: null,
    });
    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
    const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<string | null>(null);
    const [countryCode, setCountryCode] = useState('+91');
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && previewDoc) {
                setPreviewDoc(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [previewDoc]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (
                salaryDropdownRef.current &&
                !salaryDropdownRef.current.contains(event.target as Node)
            ) {
                setShowComponentDropdown(false);
            }
        };

        if (showComponentDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showComponentDropdown]);

    const [adminRemarks, setAdminRemarks] = useState<string>('');

    // Fetch onboarding masters and initial user data using the token
    useEffect(() => {
        if (!token) {
            setTokenError('Invitation token is missing. Please click the invitation link sent to your email.');
            setLoadingData(false);
            return;
        }

        const fetchOnboardingData = async () => {
            try {
                setLoadingData(true);
                const res = await api.get(`/employee/public-onboarding-data?token=${encodeURIComponent(token)}`);
                const data = res.data;

                const depts = data.departments || [];
                const desigs = data.designations || [];
                const employeeRole = (data.roles || []).filter((r: any) =>
                    r.name?.toLowerCase().includes('employee')
                );
                const finalRoles = employeeRole.length > 0 ? employeeRole : [{ id: 1, name: 'Employee' }];

                setMasters({
                    departments: depts,
                    roles: finalRoles,
                    designations: desigs
                });

                setSalaryComponents(data.salaryComponents || []);
                setCustomFieldMasters(data.customFieldMasters || []);
                if (data.adminRemarks) {
                    setAdminRemarks(data.adminRemarks);
                }

                const init = data.initialData || {};
                setFormData(prev => ({
                    ...prev,
                    email: data.email || '',
                    roleId: String(finalRoles[0]?.id || '1'),
                    role: finalRoles[0]?.name || 'Employee',
                    firstName: init.firstName || prev.firstName,
                    lastName: init.lastName || prev.lastName,
                    phone: init.phone || prev.phone,
                    dob: init.dob || prev.dob,
                    bloodGroup: init.bloodGroup || prev.bloodGroup,
                    address: init.address || prev.address,
                    departmentId: init.departmentId || (depts[0]?.id ? String(depts[0].id) : ''),
                    designationId: init.designationId || (desigs[0]?.id ? String(desigs[0].id) : ''),
                    joiningDate: init.joiningDate || prev.joiningDate,
                    workingStartDate: init.workingStartDate || init.joiningDate || prev.workingStartDate,
                    pan: init.pan || prev.pan,
                    aadhaar: init.aadhaar || prev.aadhaar,
                    uan: init.uan || prev.uan,
                    esic: init.esic || prev.esic,
                    bankName: init.bankName || prev.bankName,
                    ifsc: init.ifsc || prev.ifsc,
                    accountNumber: init.accountNumber || prev.accountNumber,
                    salary: {
                        basic: init.salary?.basic || prev.salary.basic
                    },
                    selectedSalaryComponents: (init.selectedSalaryComponents && init.selectedSalaryComponents.length > 0)
                        ? init.selectedSalaryComponents
                        : prev.selectedSalaryComponents
                }));
            } catch (err: any) {
                console.error('Failed to load onboarding data:', err);
                setTokenError(
                    err.response?.data?.message ||
                    'Invalid or expired invitation link. Please request a new invite from your administrator.'
                );
            } finally {
                setLoadingData(false);
            }
        };

        fetchOnboardingData();
    }, [token]);

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
        if (name === 'joiningDate') {
            setFormData(prev => ({
                ...prev,
                joiningDate: value,
                workingStartDate: (!prev.workingStartDate || prev.workingStartDate === prev.joiningDate) ? value : prev.workingStartDate
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
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

    const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Only JPG, JPEG and PNG images are allowed');
            e.target.value = '';
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Profile picture must be less than 2MB');
            e.target.value = '';
            return;
        }

        const duplicateInStandard = Object.values(documents).some(val => val && val.name === file.name && val.size === file.size);
        const duplicateInCustom = Object.values(customFieldFiles).some(val => val && val.name === file.name && val.size === file.size);
        if (duplicateInStandard || duplicateInCustom) {
            toast.error('This file has already been uploaded as a document. Please choose a unique photo.');
            e.target.value = '';
            return;
        }

        if (profilePicturePreview) {
            URL.revokeObjectURL(profilePicturePreview);
        }

        setProfilePicture(file);
        setProfilePicturePreview(URL.createObjectURL(file));

        setErrors((prev: any) => ({
            ...prev,
            profilePicture: '',
        }));

        e.target.value = '';
    };

    const removeProfilePicture = () => {
        if (profilePicturePreview) {
            URL.revokeObjectURL(profilePicturePreview);
        }
        setProfilePicture(null);
        setProfilePicturePreview(null);
    };

    const handleCancelOnboarding = async () => {
        if (window.confirm('Are you sure you want to cancel this onboarding process? This invitation link will become invalid.')) {
            try {
                await api.post('/employee/public-onboard-cancel', { token });
            } catch (e) {
                console.error('Cancel error', e);
            }
            setCancelled(true);
        }
    };

    const handleNext = async () => {
        if (submitting) return;

        // STEP 1 VALIDATION
        if (currentStep === 1) {
            const newErrors: any = {};

            if (!formData.firstName.trim()) {
                newErrors.firstName = 'First name is required';
            } else if (!/^[A-Za-z\s]+$/.test(formData.firstName.trim())) {
                newErrors.firstName = 'Only letters and spaces are allowed';
            }

            if (!formData.lastName.trim()) {
                newErrors.lastName = 'Last name is required';
            } else if (!/^[A-Za-z\s]+$/.test(formData.lastName.trim())) {
                newErrors.lastName = 'Only letters and spaces are allowed';
            }

            const cleanPhone = (formData.phone || '').replace(/\D/g, '');
            if (!cleanPhone) {
                newErrors.phone = 'Phone number is required';
            } else if (countryCode === '+91' && cleanPhone.length !== 10) {
                newErrors.phone = 'Enter valid 10-digit mobile number';
            } else if (cleanPhone.length < 7 || cleanPhone.length > 15) {
                newErrors.phone = 'Enter valid phone number (7-15 digits)';
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

            if (!formData.joiningDate) {
                newErrors.joiningDate = 'Date of joining is required';
            }

            if (!formData.departmentId) {
                newErrors.departmentId = 'Department is required';
            }

            if (!formData.roleId) {
                newErrors.roleId = 'System role is required';
            }

            if (!formData.designationId) {
                newErrors.designationId = 'Designation is required';
            }

            if (!formData.bloodGroup) {
                newErrors.bloodGroup = 'Blood group is required';
            }

            if (!formData.address?.trim()) {
                newErrors.address = 'Residential address is required';
            }

            // Validate required custom fields in Personal Details
            customFieldMasters.filter(cf => cf.category === 'PERSONAL_DETAILS').forEach(cf => {
                if (cf.isRequired && !customFieldValues[cf.id]?.trim()) {
                    newErrors[`customField-${cf.id}`] = `${cf.name} is required`;
                }
            });

            setErrors(newErrors);

            if (Object.keys(newErrors).length > 0) {
                toast.error('Please fill in all required personal details');
                return;
            }
        }

        // STEP 2 VALIDATION: Statutory & Bank details
        if (currentStep === 2) {
            const newErrors: any = {};
            if (formData.bankName.trim() && !/^[A-Za-z\s]+$/.test(formData.bankName.trim())) {
                newErrors.bankName = 'Bank name can only contain letters and spaces (no numbers)';
            }
            if (Object.keys(newErrors).length > 0) {
                setErrors((prev: any) => ({ ...prev, ...newErrors }));
                toast.error('Please correct errors in statutory & bank details');
                return;
            }
        }

        // STEP 3 VALIDATION: Salary details (optional for onboarding candidate)
        if (currentStep === 3) {
            // Salary is optional during onboarding
        }

        // Advance to next step
        if (currentStep < 4) {
            setCurrentStep(c => c + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            handleSubmitProfile();
        }
    };

    const handleSubmitProfile = async () => {
        if (submitting) return;

        // STEP 4: Documents are optional during onboarding
        // Verify no duplicate files uploaded across documents if uploaded
        const uploadedCheckList = [
            { name: 'Aadhaar Card', file: documents.aadhaar },
            { name: 'PAN Card', file: documents.pan },
            { name: 'Highest Qualification Degree', file: documents.degree }
        ].filter(d => d.file);

        for (let i = 0; i < uploadedCheckList.length; i++) {
            for (let j = i + 1; j < uploadedCheckList.length; j++) {
                if (
                    uploadedCheckList[i].file.name === uploadedCheckList[j].file.name &&
                    uploadedCheckList[i].file.size === uploadedCheckList[j].file.size
                ) {
                    toast.error(`Cannot upload the same file for "${uploadedCheckList[i].name}" and "${uploadedCheckList[j].name}". Please upload unique documents.`);
                    return;
                }
            }
        }

        // SUBMIT ALL DATA
        setSubmitting(true);
        try {
            const submissionData = {
                ...formData,
                token,
                phone: `${countryCode} ${formData.phone}`.trim(),
                name: `${formData.firstName} ${formData.lastName}`.trim(),
                customFieldValues
            };

            const form = new FormData();
            form.append("token", token);
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
            if (profilePicture) {
                form.append('profilePicture', profilePicture);
            }

            Object.entries(customFieldFiles).forEach(([fieldId, file]) => {
                if (file) {
                    form.append(`custom-file-${fieldId}`, file);
                }
            });

            await api.post('/employee/public-onboard', form, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            setSubmitted(true);
            toast.success('Employee Profile Submitted Successfully!');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error: any) {
            console.error('Onboarding submission error:', error);
            const msg = error.response?.data?.message || 'Failed to submit onboarding profile';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSkip = () => {
        if (submitting) return;
        setErrors({});
        if (currentStep < 4) {
            setCurrentStep(c => c + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            handleSubmitProfile();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(c => c - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            handleCancelOnboarding();
        }
    };

    if (loadingData) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0E1117] flex items-center justify-center p-4 font-sans">
                <div className="text-center space-y-3">
                    <Loader2 size={36} className="animate-spin text-[#2C4FD6] mx-auto" />
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
                <div className="max-w-md w-full bg-white dark:bg-[#161B26] p-8 rounded-xl border border-red-200 dark:border-red-900/40 text-center shadow-lg animate-fade-in">
                    <div className="w-14 h-14 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                        <AlertCircle size={28} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invitation Link Expired</h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{tokenError}</p>
                </div>
            </div>
        );
    }

    if (cancelled) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0E1117] flex items-center justify-center p-4 font-sans">
                <div className="max-w-md w-full bg-white dark:bg-[#161B26] p-8 rounded-xl border border-gray-200 dark:border-gray-800 text-center shadow-lg animate-fade-in">
                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-500">
                        <AlertCircle size={28} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Onboarding Cancelled</h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                        You have cancelled the onboarding process. Please contact your company administrator if you need a new invitation.
                    </p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0E1117] flex items-center justify-center p-4 font-sans">
                <div className="max-w-lg w-full bg-white dark:bg-[#161B26] p-8 rounded-2xl border border-indigo-200 dark:border-indigo-900/40 text-center shadow-xl animate-fade-in space-y-6">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center mx-auto text-[#2C4FD6] shadow-sm">
                        <CheckCircle2 size={36} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Submitted!</h2>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                            Your full employee details, statutory information, salary structure, and documents have been submitted successfully and are currently awaiting HR / Administrator approval.
                        </p>
                    </div>

                    <div className="bg-[#F8FAFC] dark:bg-[#1E232F] rounded-xl p-4 border border-[#E2E6ED] dark:border-gray-800 text-left flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Mail size={18} />
                        </div>
                        <div className="text-xs text-[#5B6472] dark:text-gray-300 leading-relaxed">
                            <span className="font-semibold text-gray-900 dark:text-white block mb-0.5">What happens next?</span>
                            Once an administrator reviews and approves your submission, your official login credentials and portal access link will be emailed to{' '}
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{formData.email}</span>.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0E1117] py-6 sm:py-10 px-4 sm:px-6 font-sans">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-[#161B26] rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden shadow-sm">
                    {/* Header with Title and Stepper matching AddEmployee */}
                    <div className="bg-[#F7F8FA] dark:bg-white/5 p-6 sm:p-8 border-b border-[#E2E6ED] dark:border-white/10 rounded-t-[11px]">
                        <h1 className="text-2xl font-bold text-[#12151C] dark:text-white mb-2">Onboard New Employee</h1>
                        <p className="text-[#5B6472] dark:text-gray-400 mb-8">Complete the following steps to add a new team member.</p>

                        <div className="flex items-center justify-between max-w-2xl mx-auto relative">
                            {steps.map((step) => (
                                <div key={step.id} className="flex flex-col items-center relative z-10">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${currentStep >= step.id
                                        ? 'bg-[#2C4FD6] text-white shadow-md'
                                        : 'bg-gray-200 dark:bg-white/10 text-gray-400'
                                        }`}>
                                        {currentStep > step.id ? <Check size={20} /> : <step.icon size={18} />}
                                    </div>
                                    <span className={`mt-2 text-xs font-semibold uppercase tracking-wider ${currentStep >= step.id ? 'text-[#2C4FD6] dark:text-blue-400' : 'text-gray-400'
                                        }`}>
                                        {step.title}
                                    </span>
                                </div>
                            ))}
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
                    <div className="p-6 sm:p-8 w-full">
                        {/* Admin Correction Remarks Banner */}
                        {adminRemarks && (
                            <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 flex items-start gap-3.5 shadow-sm animate-fade-in">
                                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                                    <AlertCircle size={20} />
                                </div>
                                <div className="flex-1 text-left">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                                            Action Required — HR Administrator Remarks
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-amber-950 dark:text-amber-100 leading-relaxed font-semibold whitespace-pre-wrap">
                                        {adminRemarks}
                                    </p>
                                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2 font-medium">
                                        Your previous details are pre-filled below. Please make the requested corrections, then submit to proceed.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* STEP 1: PERSONAL DETAILS */}
                        {currentStep === 1 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 animate-fade-in">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">First Name *</label>
                                    <input
                                        autoComplete="off"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        type="text"
                                        className={`w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border ${errors.firstName ? 'border-red-500' : 'border-[#E2E6ED] dark:border-white/10'} rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all placeholder:text-[#9AA3B1] placeholder:font-normal`}
                                        placeholder="First"
                                    />
                                    {errors.firstName && (
                                        <p className="text-red-500 text-xs ml-1 font-medium">{errors.firstName}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Last Name *</label>
                                    <input
                                        autoComplete="off"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        type="text"
                                        className={`w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border ${errors.lastName ? 'border-red-500' : 'border-[#E2E6ED] dark:border-white/10'} rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all placeholder:text-[#9AA3B1] placeholder:font-normal`}
                                        placeholder="Last"
                                    />
                                    {errors.lastName && (
                                        <p className="text-red-500 text-xs ml-1 font-medium">{errors.lastName}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Email Address *</label>
                                    <input
                                        autoComplete="off"
                                        name="email"
                                        value={formData.email}
                                        readOnly
                                        type="email"
                                        className="w-full px-4 py-3 bg-gray-100 dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-gray-500 dark:text-gray-400 text-sm font-medium cursor-not-allowed"
                                        placeholder="Enter your email"
                                    />
                                    <span className="text-[11px] text-[#9AA3B1] ml-1">Email verified from your invitation link</span>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Phone Number *</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            name="countryCode"
                                            value={countryCode}
                                            onChange={(e) => {
                                                let val = e.target.value.trim();
                                                if (!val) {
                                                    setCountryCode('+');
                                                    return;
                                                }
                                                if (!val.startsWith('+')) val = '+' + val;
                                                const clean = '+' + val.slice(1).replace(/\D/g, '').slice(0, 4);
                                                setCountryCode(clean);
                                            }}
                                            placeholder="+91"
                                            title="Country Code (e.g. +91, +1, +44)"
                                            className="w-20 px-2 py-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] text-[#12151C] dark:text-white text-sm font-medium text-center focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none"
                                        />
                                        <input
                                            autoComplete="off"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '').slice(0, 15);
                                                setFormData(prev => ({ ...prev, phone: value }));
                                                if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                                            }}
                                            type="tel"
                                            className={`flex-1 px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border ${errors.phone ? 'border-red-500' : 'border-[#E2E6ED] dark:border-white/10'} rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all placeholder:text-[#9AA3B1] placeholder:font-normal`}
                                            placeholder="Phone number"
                                        />
                                    </div>
                                    {errors.phone && <p className="text-red-500 text-xs ml-1 font-medium">{errors.phone}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Date of Birth *</label>
                                    <input
                                        autoComplete="off"
                                        name="dob"
                                        value={formData.dob}
                                        onChange={handleInputChange}
                                        type="date"
                                        max={new Date().toISOString().split('T')[0]}
                                        className={`w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border ${errors.dob ? 'border-red-500' : 'border-[#E2E6ED] dark:border-white/10'} rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all cursor-pointer`}
                                    />
                                    {errors.dob && <p className="text-red-500 text-xs ml-1 font-medium">{errors.dob}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Date of Joining *</label>
                                    <input
                                        autoComplete="off"
                                        name="joiningDate"
                                        value={formData.joiningDate}
                                        onChange={handleInputChange}
                                        type="date"
                                        className={`w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border ${errors.joiningDate ? 'border-red-500' : 'border-[#E2E6ED] dark:border-white/10'} rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all cursor-pointer`}
                                    />
                                    {errors.joiningDate && <p className="text-red-500 text-xs ml-1 font-medium">{errors.joiningDate}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">
                                        Working Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        name="workingStartDate"
                                        value={formData.workingStartDate || formData.joiningDate}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] outline-none text-[#12151C] dark:text-white text-sm font-medium"
                                    />
                                    <p className="text-[11px] text-[#9AA3B1] dark:text-gray-400 ml-1">
                                        Attendance tracking starts from this date (auto-synced with Date of Joining).
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Department *</label>
                                    <div className="relative group/select">
                                        <select
                                            name="departmentId"
                                            value={formData.departmentId}
                                            onChange={(e) => {
                                                const id = e.target.value;
                                                const name = masters.departments.find(d => String(d.id) === String(id))?.name || '';
                                                setFormData(prev => ({ ...prev, departmentId: id, department: name }));
                                                if (errors.departmentId) setErrors(prev => ({ ...prev, departmentId: '' }));
                                            }}
                                            className={`appearance-none w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border ${errors.departmentId ? 'border-red-500' : 'border-[#E2E6ED] dark:border-white/10'} rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all cursor-pointer`}
                                        >
                                            <option value="" className="dark:bg-[#161B26]">Select Department</option>
                                            {masters.departments.map(dept => (
                                                <option key={dept.id} value={dept.id} className="dark:bg-[#161B26]">{dept.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover/select:text-[#2C4FD6] transition-colors">
                                            <ChevronDown size={16} />
                                        </div>
                                    </div>
                                    {errors.departmentId && <p className="text-red-500 text-xs ml-1 font-medium">{errors.departmentId}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">System Role *</label>
                                    <div className="relative group/select">
                                        <select
                                            name="roleId"
                                            value={formData.roleId}
                                            onChange={(e) => {
                                                const id = e.target.value;
                                                const name = masters.roles.find(r => String(r.id) === String(id))?.name || '';
                                                setFormData(prev => ({ ...prev, roleId: id, role: name }));
                                                if (errors.roleId) setErrors(prev => ({ ...prev, roleId: '' }));
                                            }}
                                            className={`appearance-none w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border ${errors.roleId ? 'border-red-500' : 'border-[#E2E6ED] dark:border-white/10'} rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all cursor-pointer`}
                                        >
                                            {masters.roles.map(role => (
                                                <option key={role.id} value={role.id} className="dark:bg-[#161B26]">{role.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover/select:text-[#2C4FD6] transition-colors">
                                            <ChevronDown size={16} />
                                        </div>
                                    </div>
                                    {errors.roleId && <p className="text-red-500 text-xs ml-1 font-medium">{errors.roleId}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Designation / Title *</label>
                                    <div className="relative group/select">
                                        <select
                                            name="designationId"
                                            value={formData.designationId}
                                            onChange={(e) => {
                                                const id = e.target.value;
                                                const name = masters.designations.find(d => String(d.id) === String(id))?.title || '';
                                                setFormData(prev => ({ ...prev, designationId: id, title: name }));
                                                if (errors.designationId) setErrors(prev => ({ ...prev, designationId: '' }));
                                            }}
                                            className={`appearance-none w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border ${errors.designationId ? 'border-red-500' : 'border-[#E2E6ED] dark:border-white/10'} rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all cursor-pointer`}
                                        >
                                            <option value="" className="dark:bg-[#161B26]">Select Designation</option>
                                            {masters.designations.map(desig => (
                                                <option key={desig.id} value={desig.id} className="dark:bg-[#161B26]">{desig.title || desig.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover/select:text-[#2C4FD6] transition-colors">
                                            <ChevronDown size={16} />
                                        </div>
                                    </div>
                                    {errors.designationId && <p className="text-red-500 text-xs ml-1 font-medium">{errors.designationId}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Blood Group *</label>
                                    <div className="relative group/select">
                                        <select
                                            name="bloodGroup"
                                            value={formData.bloodGroup}
                                            onChange={handleInputChange}
                                            className={`appearance-none w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border ${errors.bloodGroup ? 'border-red-500' : 'border-[#E2E6ED] dark:border-white/10'} rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all cursor-pointer`}
                                        >
                                            <option value="" className="dark:bg-[#161B26]">Select Blood Group</option>
                                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                                <option key={bg} value={bg} className="dark:bg-[#161B26]">{bg}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-hover/select:text-[#2C4FD6] transition-colors">
                                            <ChevronDown size={16} />
                                        </div>
                                    </div>
                                    {errors.bloodGroup && <p className="text-red-500 text-xs ml-1 font-medium">{errors.bloodGroup}</p>}
                                </div>

                                <div className="sm:col-span-2 space-y-2">
                                    <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Residential Address *</label>
                                    <div className={`w-full bg-[#F7F8FA] dark:bg-white/5 border ${errors.address ? 'border-red-500' : 'border-[#E2E6ED] dark:border-white/10'} rounded-[8px] focus-within:ring-2 focus-within:ring-[#2C4FD6]/20 transition-all overflow-hidden h-[54px]`}>
                                        <textarea
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            rows={2}
                                            className="w-full px-4 py-3 bg-transparent border-0 outline-none text-[#12151C] dark:text-white text-sm font-medium placeholder:text-[#9AA3B1] placeholder:font-normal resize-none h-full overflow-y-auto block scrollbar-thin"
                                            placeholder="Enter full residential address"
                                        />
                                    </div>
                                    {errors.address && <p className="text-red-500 text-xs ml-1 font-medium">{errors.address}</p>}
                                </div>

                                {/* Custom fields in Personal Details */}
                                {customFieldMasters.filter(cf => cf.category === 'PERSONAL_DETAILS').length > 0 && (
                                    <div className="sm:col-span-2 border-t border-gray-100 dark:border-white/5 my-2 pt-4">
                                        <h4 className="text-xs font-semibold text-[#2C4FD6] uppercase tracking-wider">Additional Details</h4>
                                    </div>
                                )}
                                {customFieldMasters.filter(cf => cf.category === 'PERSONAL_DETAILS').map((cf) => {
                                    const fieldType = cf.type || 'TEXT';
                                    const hasError = !!errors[`customField-${cf.id}`];

                                    return (
                                        <div key={cf.id} className="space-y-2">
                                            <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">{cf.name}</label>
                                            {fieldType === 'RADIO' ? (
                                                <div className={`w-full flex gap-6 items-center px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border ${hasError ? 'border-red-500' : 'border-[#E2E6ED] dark:border-white/10'} rounded-[8px] h-[46px]`}>
                                                    {parseRadioOptions(cf.options).map((option: string) => (
                                                        <label key={option} className="flex items-center gap-1.5 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name={`radio-${cf.id}`}
                                                                value={option}
                                                                checked={customFieldValues[cf.id] === option}
                                                                onChange={() => {
                                                                    setCustomFieldValues(prev => ({ ...prev, [cf.id]: option }));
                                                                    if (errors[`customField-${cf.id}`]) {
                                                                        setErrors(prev => ({ ...prev, [`customField-${cf.id}`]: '' }));
                                                                    }
                                                                }}
                                                                className="w-4 h-4 text-[#2C4FD6] focus:ring-[#2C4FD6] accent-[#2C4FD6]"
                                                            />
                                                            <span className="text-sm font-medium text-[#12151C] dark:text-gray-300">{option}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={customFieldValues[cf.id] || ''}
                                                    onChange={(e) => {
                                                        setCustomFieldValues(prev => ({ ...prev, [cf.id]: e.target.value }));
                                                        if (errors[`customField-${cf.id}`]) {
                                                            setErrors(prev => ({ ...prev, [`customField-${cf.id}`]: '' }));
                                                        }
                                                    }}
                                                    className={`w-full px-4 py-3 bg-[#F7F8FA] dark:bg-white/5 border ${hasError ? 'border-red-500' : 'border-[#E2E6ED] dark:border-white/10'} rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all placeholder:text-[#9AA3B1] placeholder:font-normal`}
                                                    placeholder={`Enter ${cf.name.toLowerCase()}`}
                                                />
                                            )}
                                            {hasError && <p className="text-red-500 text-xs ml-1">{errors[`customField-${cf.id}`]}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* STEP 2: STATUTORY INFO */}
                        {currentStep === 2 && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-[#12151C] dark:text-white border-b border-[#E2E6ED] dark:border-white/10 pb-2">Statutory Details</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">PAN Number</label>
                                            <input
                                                autoComplete="off"
                                                name="pan"
                                                value={formData.pan}
                                                onChange={(e) => setFormData(prev => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                                                type="text"
                                                className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all uppercase placeholder:normal-case placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                placeholder="E.g. ABCDE1234F"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Aadhaar Number</label>
                                            <input
                                                autoComplete="off"
                                                name="aadhaar"
                                                value={formData.aadhaar}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                                                    setFormData(prev => ({ ...prev, aadhaar: value }));
                                                }}
                                                type="text"
                                                className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                placeholder="XXXX XXXX XXXX"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">UAN (PF)</label>
                                            <input
                                                autoComplete="off"
                                                name="uan"
                                                value={formData.uan}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                                                    setFormData(prev => ({ ...prev, uan: value }));
                                                }}
                                                type="text"
                                                className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                placeholder="Enter 12-digit UAN number"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">ESIC Number</label>
                                            <input
                                                autoComplete="off"
                                                name="esic"
                                                value={formData.esic}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                    setFormData(prev => ({ ...prev, esic: value }));
                                                }}
                                                type="text"
                                                className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                placeholder="Enter 10-digit ESIC number"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-semibold text-[#12151C] dark:text-white border-b border-[#E2E6ED] dark:border-white/10 pb-2">Bank Details</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Bank Name</label>
                                            <input
                                                autoComplete="off"
                                                name="bankName"
                                                value={formData.bankName}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/[^A-Za-z\s]/g, '');
                                                    setFormData(prev => ({ ...prev, bankName: val }));
                                                    if (errors.bankName) setErrors(prev => ({ ...prev, bankName: '' }));
                                                }}
                                                type="text"
                                                className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                placeholder="e.g. HDFC Bank (Letters only)"
                                            />
                                            {errors.bankName && <p className="text-red-500 text-xs ml-1 font-medium">{errors.bankName}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">IFSC Code</label>
                                            <input
                                                autoComplete="off"
                                                name="ifsc"
                                                value={formData.ifsc}
                                                onChange={handleInputChange}
                                                type="text"
                                                className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all uppercase placeholder:normal-case placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                placeholder="Enter IFSC code"
                                            />
                                        </div>

                                        <div className="space-y-2 sm:col-span-2">
                                            <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">Account Number</label>
                                            <input
                                                autoComplete="off"
                                                name="accountNumber"
                                                value={formData.accountNumber}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/\D/g, '').slice(0, 18);
                                                    setFormData(prev => ({ ...prev, accountNumber: value }));
                                                }}
                                                className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all placeholder:text-[#9AA3B1] placeholder:font-normal"
                                                placeholder="Enter 9-18 digit account number"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: SALARY INFO */}
                        {currentStep === 3 && (
                            <div className="space-y-6 animate-fade-in">
                                <h3 className="font-semibold text-[#12151C] dark:text-white border-b border-[#E2E6ED] dark:border-white/10 pb-2">
                                    Salary Info
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    {/* Basic Salary */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">
                                            Basic Salary *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.salary.basic}
                                            onChange={(e) => handleBasicSalaryChange(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all placeholder:text-[#9AA3B1] placeholder:font-normal"
                                            placeholder="Enter Basic Salary"
                                        />
                                        {errors.basic && (
                                            <p className="text-red-500 text-xs ml-1 font-medium">{errors.basic}</p>
                                        )}
                                    </div>

                                    {/* Component Dropdown */}
                                    <div ref={salaryDropdownRef} className="space-y-2 relative">
                                        <label className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider ml-1">
                                            Select Components
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowComponentDropdown(!showComponentDropdown)}
                                            className="w-full min-h-[42px] px-4 py-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-white/10 rounded-[8px] focus:ring-2 focus:ring-[#2C4FD6]/20 focus:border-[#2C4FD6] outline-none text-[#12151C] dark:text-white text-sm font-medium transition-all flex items-center justify-between gap-3 cursor-pointer"
                                        >
                                            <div className="flex flex-wrap gap-2 text-left">
                                                {formData.selectedSalaryComponents.length > 0 ? (
                                                    formData.selectedSalaryComponents.map((component: any) => (
                                                        <span
                                                            key={component.id}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#2C4FD6] text-white text-xs font-semibold"
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
                                                    <span className="text-[#9AA3B1] font-normal">Select components</span>
                                                )}
                                            </div>
                                            <ChevronDown
                                                size={18}
                                                className={`shrink-0 transition-transform ${showComponentDropdown ? 'rotate-180' : ''}`}
                                            />
                                        </button>

                                        {showComponentDropdown && (
                                            <div className="absolute z-[9999] mt-2 w-full max-h-64 overflow-y-auto rounded-[8px] border border-[#E2E6ED] dark:border-white/10 bg-white dark:bg-[#161B26] shadow-2xl p-3 space-y-2">
                                                {salaryComponents.length > 0 ? (
                                                    salaryComponents.map((component: any) => {
                                                        const checked = formData.selectedSalaryComponents.some(
                                                            (item: any) => item.id === component.id
                                                        );

                                                        return (
                                                            <label
                                                                key={component.id}
                                                                className="flex items-center gap-3 px-3 py-2 rounded-[6px] cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 text-[#12151C] dark:text-white text-sm font-medium"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={() => toggleSalaryComponent(component)}
                                                                    className="w-4 h-4 accent-[#2C4FD6]"
                                                                />
                                                                <span className="flex-1">{component.name}</span>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${component.type === 'EARNING'
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

                                {/* Selected Components Cards */}
                                <div className="space-y-4 pt-2">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2C4FD6]">
                                        Selected Components
                                    </h4>

                                    {formData.selectedSalaryComponents.length === 0 ? (
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
                                            {formData.selectedSalaryComponents.map((component: any) => (
                                                <div
                                                    key={component.id}
                                                    className="p-4 rounded-[8px] border border-[#E2E6ED] dark:border-white/10 bg-[#F7F8FA] dark:bg-white/5 flex items-center justify-between gap-4"
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold text-gray-800 dark:text-white">
                                                                {component.name}
                                                            </p>
                                                            <span
                                                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${component.type === 'EARNING'
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
                            </div>
                        )}

                        {/* STEP 4: DOCUMENTS */}
                        {currentStep === 4 && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="space-y-4">
                                    <p className="text-xs font-medium text-[#5B6472] dark:text-gray-300 uppercase tracking-wider mb-2 ml-1">Required Documents Checklist</p>
                                    {[
                                        { key: 'aadhaar', name: 'Aadhaar Card', required: true, isCustom: false, type: 'FILE' },
                                        { key: 'pan', name: 'PAN Card', required: true, isCustom: false, type: 'FILE' },
                                        { key: 'degree', name: 'Highest Qualification Degree', required: true, isCustom: false, type: 'FILE' },
                                        ...customFieldMasters.filter(cf => cf.category === 'DOCUMENT_VAULT').map(cf => ({
                                            key: cf.id,
                                            name: cf.name,
                                            required: true,
                                            isCustom: true,
                                            type: cf.type || 'FILE'
                                        }))
                                    ].map((doc, i) => {
                                        const hasFile = doc.isCustom ? !!customFieldFiles[doc.key] : !!documents[doc.key];
                                        const fileObj = doc.isCustom ? customFieldFiles[doc.key] : documents[doc.key];
                                        const acceptString = doc.isCustom
                                            ? (doc.type === 'PDF' ? '.pdf' : doc.type === 'IMAGE' ? 'image/png,image/jpeg,image/jpg,image/webp' : '.pdf,image/png,image/jpeg,image/jpg,image/webp')
                                            : '.pdf,image/png,image/jpeg,image/jpg,image/webp';

                                        return (
                                            <div key={i} className="space-y-1">
                                                <div
                                                    onClick={() => document.getElementById(`fileInput-${doc.key}`)?.click()}
                                                    className={`flex items-center justify-between p-4 cursor-pointer border rounded-[8px] transition-all ${hasFile
                                                        ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                                                        : 'border-[#E2E6ED] dark:border-white/10 hover:border-[#2C4FD6] dark:hover:border-[#2C4FD6] bg-[#F7F8FA] dark:bg-white/5 hover:scale-[1.005]'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-[6px] flex items-center justify-center transition-colors ${hasFile
                                                            ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                            : 'bg-[#E8ECFC] text-[#2C4FD6] dark:bg-white/10 dark:text-gray-300'
                                                            }`}>
                                                            <FileText size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-[#12151C] dark:text-white text-sm">
                                                                {doc.name}
                                                            </p>
                                                            <p className={`text-xs font-medium transition-colors ${hasFile ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#9AA3B1]'}`}>
                                                                {hasFile ? fileObj?.name : 'Click to upload document'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        {hasFile ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (fileObj) {
                                                                            const blobUrl = URL.createObjectURL(fileObj);
                                                                            setPreviewDoc({
                                                                                title: doc.name,
                                                                                url: blobUrl,
                                                                                fileName: fileObj.name,
                                                                                fileType: fileObj.type
                                                                            });
                                                                        }
                                                                    }}
                                                                    className="p-2 text-[#2C4FD6] hover:bg-[#2C4FD6]/10 rounded-lg transition-colors cursor-pointer"
                                                                >
                                                                    <Eye size={18} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setConfirmDeleteDoc(doc.key);
                                                                    }}
                                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="w-7 h-7 rounded-full bg-[#E8ECFC] text-[#2C4FD6] dark:bg-white/10 dark:text-white flex items-center justify-center hover:scale-110 transition-transform">
                                                                <Upload size={14} />
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
                                                                // 1. Only PDF and images allowed
                                                                const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
                                                                const isPdfOrImg = validTypes.includes(file.type.toLowerCase()) || /\.(pdf|jpg|jpeg|png|webp)$/i.test(file.name);
                                                                if (!isPdfOrImg) {
                                                                    toast.error('Only PDF and image (JPG, PNG) files are allowed');
                                                                    e.target.value = '';
                                                                    return;
                                                                }

                                                                // 2. Max size 5MB
                                                                if (file.size > 5 * 1024 * 1024) {
                                                                    toast.error('File size must be less than 5MB');
                                                                    e.target.value = '';
                                                                    return;
                                                                }

                                                                // 3. Prevent duplicate files across all documents
                                                                const duplicateInStandard = Object.entries(documents).some(([key, val]) => {
                                                                    return key !== doc.key && val && val.name === file.name && val.size === file.size;
                                                                });
                                                                const duplicateInCustom = Object.entries(customFieldFiles).some(([key, val]) => {
                                                                    return key !== doc.key && val && val.name === file.name && val.size === file.size;
                                                                });
                                                                const duplicateInProfile = profilePicture && profilePicture.name === file.name && profilePicture.size === file.size;

                                                                if (duplicateInStandard || duplicateInCustom || duplicateInProfile) {
                                                                    toast.error('This file has already been uploaded for another document. Please upload a unique file.');
                                                                    e.target.value = '';
                                                                    return;
                                                                }

                                                                if (doc.isCustom) {
                                                                    setCustomFieldFiles(prev => ({ ...prev, [doc.key]: file }));
                                                                } else {
                                                                    setDocuments(prev => ({ ...prev, [doc.key]: file }));
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Profile Picture */}
                                    <div
                                        onClick={() => document.getElementById('profile-picture-input')?.click()}
                                        className={`flex items-center justify-between p-4 cursor-pointer border rounded-[8px] transition-all ${profilePicture
                                            ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                                            : 'border-[#E2E6ED] dark:border-white/10 hover:border-[#2C4FD6] dark:hover:border-[#2C4FD6] bg-[#F7F8FA] dark:bg-white/5 hover:scale-[1.005]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`w-10 h-10 rounded-[6px] overflow-hidden flex items-center justify-center ${profilePicturePreview
                                                    ? 'border border-emerald-500'
                                                    : 'bg-[#E8ECFC] text-[#2C4FD6] dark:bg-white/10 dark:text-gray-300'
                                                    }`}
                                            >
                                                {profilePicturePreview ? (
                                                    <img
                                                        src={profilePicturePreview}
                                                        alt="Profile preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <User size={20} />
                                                )}
                                            </div>

                                            <div>
                                                <p className="font-semibold text-[#12151C] dark:text-white text-sm">
                                                    Profile Picture <span className="text-xs font-normal text-[#9AA3B1]">(use less than 2 MB)</span>
                                                </p>
                                                <p
                                                    className={`text-xs font-medium ${profilePicture
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-[#9AA3B1]'
                                                        }`}
                                                >
                                                    {profilePicture ? profilePicture.name : 'Upload JPG, JPEG or PNG image (Max 2MB)'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {profilePicture ? (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setConfirmDeleteDoc('profilePicture');
                                                    }}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-[#E8ECFC] text-[#2C4FD6] dark:bg-white/10 dark:text-white flex items-center justify-center hover:scale-110 transition-transform">
                                                    <Upload size={14} />
                                                </div>
                                            )}
                                        </div>

                                        <input
                                            id="profile-picture-input"
                                            type="file"
                                            className="hidden"
                                            accept="image/jpeg,image/png,image/jpg"
                                            onChange={handleProfilePictureUpload}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Navigation */}
                    <div className="p-6 border-t border-[#E2E6ED] dark:border-white/10 bg-[#F7F8FA] dark:bg-white/5 flex justify-between items-center rounded-b-[11px]">
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={submitting}
                            className="px-6 py-2.5 rounded-[8px] border border-[#E2E6ED] dark:border-gray-700 text-[#5B6472] dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer text-sm"
                        >
                            {currentStep === 1 ? 'Cancel Onboarding' : 'Back'}
                        </button>
                        <div className="flex items-center gap-3">
                            {currentStep > 1 && (
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    disabled={submitting}
                                    className="px-5 py-2.5 rounded-[8px] border border-gray-300 dark:border-gray-700 text-[#5B6472] dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer text-sm"
                                >
                                    {currentStep === 4 ? 'Skip & Complete' : 'Skip'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={submitting}
                                className="flex items-center gap-2 px-7 py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[8px] transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" /> Submitting Details...
                                    </>
                                ) : (
                                    <>
                                        {currentStep === 4 ? 'Complete Onboarding' : 'Next Step'} <ChevronRight size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Delete Dialog */}
            {confirmDeleteDoc && createPortal(
                <div className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#161B26] rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-gray-100 dark:border-white/10 animate-scale-in">
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
                                className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-white/10 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmDeleteDoc === 'profilePicture') {
                                        removeProfilePicture();
                                    } else {
                                        const isCustom = customFieldMasters.some(
                                            cf => String(cf.id) === String(confirmDeleteDoc)
                                        );
                                        if (isCustom) {
                                            setCustomFieldFiles(prev => ({ ...prev, [confirmDeleteDoc]: null }));
                                        } else {
                                            setDocuments(prev => ({ ...prev, [confirmDeleteDoc]: null }));
                                        }
                                    }
                                    setConfirmDeleteDoc(null);
                                }}
                                className="flex-1 py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all cursor-pointer"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Document Preview Modal */}
            {previewDoc && createPortal(
                <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#161B26] rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in border border-gray-100 dark:border-white/10">
                        <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                            <div className="flex items-center gap-2">
                                <FileText size={20} className="text-[#2C4FD6]" />
                                <h3 className="font-semibold text-gray-800 dark:text-white truncate max-w-sm">
                                    {previewDoc.title}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => downloadFile(previewDoc.url, previewDoc.fileName)}
                                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
                                    title="Download Document"
                                >
                                    <Download size={18} />
                                </button>
                                <button
                                    onClick={() => setPreviewDoc(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-black/20 flex items-center justify-center min-h-[400px]">
                            {previewDoc.fileType?.includes('pdf') || previewDoc.url.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={`${previewDoc.url}#toolbar=0`}
                                    className="w-full h-[600px] rounded-lg border-0 bg-white"
                                    title={previewDoc.title}
                                />
                            ) : (
                                <img
                                    src={previewDoc.url}
                                    alt={previewDoc.title}
                                    className="max-w-full max-h-[600px] object-contain rounded-lg shadow-sm"
                                />
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
