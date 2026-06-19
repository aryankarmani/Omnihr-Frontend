/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useRBAC } from '../hooks/useRBAC';
import { ArrowLeft, User, FileText, CreditCard, Download, Briefcase, Save, X, Edit, Printer, Loader2, Eye, Trash2, Upload } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function EmployeeProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { hasPermission } = useRBAC();

    const queryParams = new URLSearchParams(location.search);
    const initialEditMode = queryParams.get('edit') === 'true';

    const [activeTab, setActiveTab] = useState<'personal' | 'statutory' | 'documents' | 'shiftRoster' | 'salary' | 'team'>('statutory');
    const [isEditing, setIsEditing] = useState(initialEditMode);
    const [showPayslip, setShowPayslip] = useState(false);
    const [showIDCard, setShowIDCard] = useState(false);
    const [loading, setLoading] = useState(true);
    const [docToDelete, setDocToDelete] = useState<number | null>(null);
    const [companySignature, setCompanySignature] = useState<string | null>(null);

    // Employee State
    const [employee, setEmployee] = useState<any>(null);
    const [shifts, setShifts] = useState<any[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [designations, setDesignations] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const fetchEmployee = async () => {
        try {
            const endpoint = id ? `/employee/${id}` : '/employee/me';
            const res = await api.get(endpoint);
            console.log("EMPLOYEE DATA:", res.data);
            console.log("SALARY DATA:", res.data.employeeProfile?.salary);
            setEmployee(res.data);
            setErrors({});
        } catch (error) {
            console.error('Error fetching employee:', error);
            toast.error('Failed to load employee profile');
        } finally {
            setLoading(false);
        }
    };
    const fetchCompanySignature = async () => {

        try {

            const res = await api.get('/company-setting');

            setCompanySignature(res.data?.authorizedSignature || null);

        } catch (error) {

            console.error(error);

        }

    };
    const fetchShifts = async () => {
        try {
            const res = await api.get('/masters/shifts');
            setShifts(res.data);
        } catch (error) {
            console.error('Error fetching shifts:', error);
            toast.error('Failed to load shifts');
        }
    };
    const fetchRoles = async () => {
        try {
            const res = await api.get('/masters/roles');
            console.log("ROLES DATA:", res.data);
            setRoles(res.data);
        } catch (error) {
            console.error('Error fetching roles:', error);
            toast.error('Failed to load roles');
        }
    };

    const fetchDesignations = async () => {
        try {
            const res = await api.get('/masters/designations');
            setDesignations(res.data);
        } catch (error) {
            console.error('Error fetching designations:', error);
            toast.error('Failed to load designations');
        }
    };
    const fetchDepartments = async () => {
        try {
            const res = await api.get('/masters/departments');
            console.log("DEPARTMENTS DATA:", res.data);

            setDepartments(Array.isArray(res.data) ? res.data : res.data.departments || []);
        } catch (error) {
            console.error('Error fetching departments:', error);
            toast.error('Failed to load departments');
        }
    };

    // Payslip month state
    const [leaves, setLeaves] = useState<any[]>([]);
    const [selectedPayslipYear, setSelectedPayslipYear] = useState<number>(() => {
        return new Date().getFullYear();
    });
    const [selectedPayslipMonth, setSelectedPayslipMonth] = useState<number>(() => {
        return new Date().getMonth(); // 0-indexed
    });

    // Draft inputs for month/year selector (prefilled with current month/year)
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const [inputMonth, setInputMonth] = useState(() => MONTH_NAMES[new Date().getMonth()]);
    const [inputYear, setInputYear] = useState(() => String(new Date().getFullYear()));
    const [payslipError, setPayslipError] = useState('');

    const applyPayslipMonth = () => {
        const trimmedMonth = inputMonth.trim();
        const trimmedYear = inputYear.trim();
        if (!trimmedMonth || !trimmedYear) {
            setPayslipError('Please enter both Month and Year');
            return;
        }
        const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase().startsWith(trimmedMonth.toLowerCase()));
        const year = Number(trimmedYear);
        if (monthIdx === -1) { setPayslipError('Invalid month — enter e.g. June'); return; }
        if (isNaN(year) || year < 2000 || year > 2100) { setPayslipError('Invalid year — enter e.g. 2026'); return; }
        setPayslipError('');
        setSelectedPayslipMonth(monthIdx);
        setSelectedPayslipYear(year);
    };

    const fetchEmployeeLeaves = async () => {
        try {
            const empId = id || '';
            const endpoint = empId ? `/leave/history?employeeId=${empId}` : '/leave/history';
            const res = await api.get(endpoint);
            setLeaves(res.data);
        } catch (error) {
            console.error('Error fetching employee leaves:', error);
        }
    };

    useEffect(() => {
        fetchEmployee();
        fetchShifts();
        fetchRoles();
        fetchDesignations();
        fetchDepartments();
        fetchEmployeeLeaves();
        fetchCompanySignature();
    }, [id]);

    const handleCancel = () => {
        fetchEmployee();
        setIsEditing(false);
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        const p = employee?.employeeProfile?.statutory || {};
        const b = employee?.employeeProfile?.bank || {};
        const pd = employee?.employeeProfile || {};
        const s = employee?.employeeProfile?.salary || {};

        if (!employee.email) newErrors.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email)) {
            newErrors.email = "Please enter valid email";
        }

        if (!pd.phone) newErrors.phone = "Phone number is required";
        else if (!/^\d{10}$/.test(pd.phone)) {
            newErrors.phone = "Enter valid 10 digit phone number";
        }
        if (!pd.dob) {
            newErrors.dob = "Date of birth is required";
        } else if (new Date(pd.dob) > new Date()) {
            newErrors.dob = "Future date is not allowed";
        }
        if (!pd.joiningDate) {
            newErrors.joiningDate = "Date of joining is required";
        } else if (new Date(pd.joiningDate) > new Date()) {
            newErrors.joiningDate = "Future date is not allowed";
        }

        if (!pd.bloodGroup) {
            newErrors.bloodGroup = "Blood group is required";
        }

        if (!pd.address?.trim()) {
            newErrors.address = "Address is required";
        }

        if (!employee.roleId && !employee.role?.id) newErrors.role = "Role is required";
        if (!pd.designationId) newErrors.designationId = "Designation is required";
        if (!pd.departmentId) newErrors.departmentId = "Department is required";
        if (!pd.shiftId) newErrors.shiftId = "Select a shift";

        if (!p.pan) newErrors.pan = "PAN is required";
        else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p.pan.trim().toUpperCase())) {
            newErrors.pan = "Invalid PAN format";
        }

        if (!p.aadhaar) newErrors.aadhaar = "Aadhaar is required";
        else if (!/^\d{12}$/.test(p.aadhaar)) newErrors.aadhaar = "Aadhaar must be 12 digits";

        if (!p.uan) newErrors.uan = "UAN is required";
        else if (!/^\d{12}$/.test(p.uan)) newErrors.uan = "UAN must be 12 digits";

        if (!p.esic) newErrors.esic = "ESIC is required";
        else if (!/^\d{10}$/.test(p.esic)) newErrors.esic = "ESIC must be 10 digits";

        if (!b.bankName?.trim()) newErrors.bankName = "Bank Name is required";
        else if (!/^[A-Za-z\s]{2,50}$/.test(b.bankName.trim())) {
            newErrors.bankName = "Bank Name must contain only letters";
        }

        if (!b.ifsc) newErrors.ifsc = "IFSC is required";
        else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(b.ifsc.trim().toUpperCase())) {
            newErrors.ifsc = "Invalid IFSC format";
        }

        if (!b.accountNumber) newErrors.accountNumber = "Account Number is required";
        else if (!/^\d{9,18}$/.test(b.accountNumber)) {
            newErrors.accountNumber = "Account Number must be 9–18 digits";
        }

        ["basic", "hra", "special", "medical", "pf", "pt", "tax"].forEach((field) => {
            if (s[field] === "" || s[field] == null) {
                newErrors[field] = `${field.toUpperCase()} is required`;
            }
        });

        setErrors(newErrors);

        const salaryFields = ["basic", "hra", "special", "medical", "pf", "pt", "tax"];

        const statutoryFields = [
            "uan", "esic", "pan", "aadhaar",
            "bankName", "accountNumber", "ifsc"
        ];

        const personalFields = [
            "email", "phone", "dob", "joiningDate",
            "role", "designationId", "departmentId",
            "bloodGroup", "address"
        ];

        if (Object.keys(newErrors).length > 0) {
            const hasSalaryError = salaryFields.some(field => newErrors[field]);
            const hasStatutoryError = statutoryFields.some(field => newErrors[field]);
            const hasPersonalError = personalFields.some(field => newErrors[field]);

            if (hasSalaryError) {
                toast.error("Please fix validations in Salary Info");
                setActiveTab("salary");
            } else if (hasStatutoryError) {
                toast.error("Please fix validations in Statutory & Bank Info");
                setActiveTab("statutory");
            }
            else if (newErrors.shiftId) {
                toast.error("Shift not assigned");
                setActiveTab("shiftRoster");
            }
            else if (hasPersonalError) {
                toast.error("Please fix validations in Personal Details");
                setActiveTab("personal");
            }

            return false;
        }

        return true;
    };

    const handleSave = async () => {
        if (!validate()) {
            return;
        }
        try {
            const profileData = {
                phone: employee.employeeProfile?.phone,
                dob: employee.employeeProfile?.dob,
                joiningDate: employee.employeeProfile?.joiningDate,
                bloodGroup: employee.employeeProfile?.bloodGroup,
                address: employee.employeeProfile?.address,
                location: employee.employeeProfile?.location,
                department: employee.employeeProfile?.department,
                departmentId: employee.employeeProfile?.departmentId,
                title: employee.employeeProfile?.title,
                designationId: employee.employeeProfile?.designationId,
                status: employee.employeeProfile?.status || 'Active',
                shiftId: employee.employeeProfile?.shiftId,
                salary: employee.employeeProfile?.salary,
                // Statutory
                uan: employee.employeeProfile?.statutory?.uan,
                pfNumber: employee.employeeProfile?.statutory?.pfNumber,
                esic: employee.employeeProfile?.statutory?.esic,
                pan: employee.employeeProfile?.statutory?.pan,
                aadhaar: employee.employeeProfile?.statutory?.aadhaar,
                // Bank
                bankName: employee.employeeProfile?.bank?.bankName,
                accountNumber: employee.employeeProfile?.bank?.accountNumber,
                ifsc: employee.employeeProfile?.bank?.ifsc,
                // User
                name: employee.name,
                email: employee.email,
                roleId: employee.roleId || employee.role?.id,
                role: employee.role?.name || employee.role?.title || employee.role
            };

            const endpoint = id ? `/employee/${id}` : '/employee/me';
            await api.put(endpoint, profileData);
            setIsEditing(false);
            toast.success('Profile Updated Successfully!');
        } catch (error) {
            console.error('Update error:', error);
            toast.error('Failed to update profile');
        }
    };

    const handleInputChange = (field: string, value: string) => {
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
        if (field === 'name' || field === 'email' || field === 'role') {
            setEmployee((prev: any) => ({
                ...prev,
                [field]: value
            }));
            return;
        }
        setEmployee((prev: any) => ({
            ...prev,
            employeeProfile: {
                ...(prev?.employeeProfile || {}),
                [field]: value
            }
        }));
    };

    const handleStatutoryChange = (field: string, value: string) => {
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
        setEmployee((prev: any) => ({
            ...prev,
            employeeProfile: {
                ...(prev?.employeeProfile || {}),
                statutory: {
                    ...(prev?.employeeProfile?.statutory || {}),
                    [field]: value
                }
            }
        }));
    };

    const handleBankChange = (field: string, value: string) => {
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));

        setEmployee((prev: any) => ({
            ...prev,
            employeeProfile: {
                ...(prev?.employeeProfile || {}),
                bank: {
                    ...(prev?.employeeProfile?.bank || {}),
                    [field]: value
                }
            }
        }));
    };
    const handleSalaryChange = (field: string, value: string) => {
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));

        setEmployee((prev: any) => ({
            ...prev,
            employeeProfile: {
                ...(prev?.employeeProfile || {}),
                salary: {
                    ...(prev?.employeeProfile?.salary || {}),
                    [field]: value
                }
            }
        }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docName: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
            toast.error("Only PDF and image files are allowed");
            return;
        }

        // Check if this file is a duplicate of other uploaded files using lightweight HEAD requests
        const otherDocs = employee?.employeeProfile?.documents?.filter((d: any) => d.name !== docName) || [];
        try {
            for (const doc of otherDocs) {
                const baseUrl = 'http://localhost:3001';
                const fullUrl = doc.url.startsWith('http') ? doc.url : (doc.url.startsWith('/uploads/') ? `${baseUrl}${doc.url}` : `${baseUrl}/uploads/${doc.url}`);
                const res = await api.head(fullUrl);
                const existingSize = parseInt((res.headers as any)['content-length'] || '0', 10);
                if (existingSize === file.size) {
                    toast.error(`This file has already been uploaded/selected for another document slot! Please select a unique document.`);
                    e.target.value = '';
                    return;
                }
            }
        } catch (err) {
            console.error("Duplicate file size check failed", err);
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', docName);
        formData.append('type', file.type);

        toast.loading(`Uploading ${docName}...`, { id: 'uploading-toast' });
        try {
            const employeeId = employee.id;
            await api.post(`/employee/${employeeId}/documents`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success(`${docName} uploaded successfully!`, { id: 'uploading-toast' });
            fetchEmployee();
        } catch (error) {
            console.error("Upload failed", error);
            toast.error(`Failed to upload ${docName}`, { id: 'uploading-toast' });
        }
    };


    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 size={48} className="text-brand-500 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading Profile Details...</p>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Employee Not Found</h2>
                <button onClick={() => navigate('/employee')} className="mt-4 text-brand-600 hover:underline">Return to List</button>
            </div>
        );
    }

    const profile = employee.employeeProfile || {};
    const statutory = profile.statutory || {};
    const bank = profile.bank || {};

    const adminSignatureUrl = companySignature
        ? companySignature.startsWith('http')
            ? companySignature
            : `http://localhost:3001${companySignature}`
        : null;
    // Dynamic salary calculations for payslip preview
    const basic = Number(profile.salary?.basic || 0);
    const hra = Number(profile.salary?.hra || 0);
    const special = Number(profile.salary?.special || 0);
    const medical = Number(profile.salary?.medical || 0);
    const pf = Number(profile.salary?.pf || 0);
    const pt = Number(profile.salary?.pt || 0);
    const tax = Number(profile.salary?.tax || 0);
    const calendarDays = new Date(selectedPayslipYear, selectedPayslipMonth + 1, 0).getDate();


    const fullMonthEarnings = basic + hra + special + medical;

    const joiningDateForSalary = profile.joiningDate ? new Date(profile.joiningDate) : null;

    let payableDays = calendarDays;

    if (
        joiningDateForSalary &&
        joiningDateForSalary.getFullYear() === selectedPayslipYear &&
        joiningDateForSalary.getMonth() === selectedPayslipMonth
    ) {
        payableDays = calendarDays - joiningDateForSalary.getDate() + 1;
    }

    const totalEarnings = Number(((fullMonthEarnings / calendarDays) * payableDays).toFixed(2));
    // Month info for payslip
    const selectedMonthLabel = new Date(selectedPayslipYear, selectedPayslipMonth, 1)
        .toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const selectedMonthShort = new Date(selectedPayslipYear, selectedPayslipMonth, 1)
        .toLocaleString('en-US', { month: 'short', year: 'numeric' }).replace(' ', '_');

    // Calculate LWP days for selected month from approved leaves
    let lwpDays = 0;
    if (Array.isArray(leaves)) {
        leaves.forEach((leave: any) => {
            const isApproved = leave.status === 'APPROVED' || leave.status === 'Approved';
            const isLWP = leave.leaveType?.code === 'LWP';
            if (!isApproved || !isLWP) return;
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            const current = new Date(start);
            while (current <= end) {
                if (current.getFullYear() === selectedPayslipYear && current.getMonth() === selectedPayslipMonth) {
                    lwpDays++;
                }
                current.setDate(current.getDate() + 1);
            }
        });
    }

    const lwpDeduction = lwpDays > 0 ? Number(((totalEarnings / calendarDays) * lwpDays).toFixed(2)) : 0;
    const totalDeductions = pf + pt + tax + lwpDeduction;
    const totalSalary = Math.max(0, totalEarnings - totalDeductions);
    const paidDays = payableDays - lwpDays;
    const today = new Date();

    const currentMonthStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );

    const selectedMonthStart = new Date(
        selectedPayslipYear,
        selectedPayslipMonth,
        1
    );

    const joiningDateRaw = profile.joiningDate
        ? new Date(profile.joiningDate)
        : null;

    const hasCompletedOneMonth = joiningDateRaw
        ? new Date(
            joiningDateRaw.getFullYear(),
            joiningDateRaw.getMonth() + 1,
            joiningDateRaw.getDate()
        ) <= today
        : true;

    const joiningMonthStart = joiningDateRaw
        ? new Date(
            joiningDateRaw.getFullYear(),
            joiningDateRaw.getMonth(),
            1
        )
        : null;
    const isCurrentMonth =
        selectedMonthStart.getMonth() === currentMonthStart.getMonth() &&
        selectedMonthStart.getFullYear() === currentMonthStart.getFullYear();

    const isFutureMonth =
        selectedMonthStart > currentMonthStart;

    const isBeforeJoiningMonth =
        joiningMonthStart &&
        selectedMonthStart < joiningMonthStart;

    let payslipBlockMessage = '';

    if (isBeforeJoiningMonth) {
        payslipBlockMessage =
            'No salary slip is available because you were not employed during the selected month.';
    }
    else if (!hasCompletedOneMonth) {
        payslipBlockMessage =
            'Salary slip will be available after you complete one full month of service.';
    }
    else if (isCurrentMonth) {
        payslipBlockMessage =
            'Salary slip for the current month is not available yet. Please select a completed past month.';
    }
    else if (isFutureMonth) {
        payslipBlockMessage =
            'Salary slip cannot be generated for a future month. Please select a completed past month.';
    }


    // Date of joining
    const joiningDate = profile.joiningDate
        ? new Date(profile.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'N/A';
    const currentDate = new Date();

    const availableMonths =
        Number(inputYear) === currentDate.getFullYear()
            ? MONTH_NAMES.slice(0, currentDate.getMonth())
            : MONTH_NAMES;

    const availableYears = Array.from(
        { length: currentDate.getFullYear() - 2024 + 1 },
        (_, i) => 2024 + i
    );

    return (
        <div className="animate-fade-in-up pb-8 relative">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors"
                disabled={isEditing}
            >
                <ArrowLeft size={20} /> Back to List
            </button>

            {/* Profile Header */}
            <div className="bg-white dark:bg-brand-900 rounded-3xl p-8 mb-8 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
                    <div className={`w-28 h-28 rounded-2xl flex items-center justify-center text-white font-bold text-4xl shadow-2xl bg-brand-600`}>
                        {employee.name.split(' ').map((n: any) => n[0]).join('')}
                    </div>
                    <div className="text-center md:text-left flex-1">
                        {isEditing ? (
                            <div className="space-y-2 mb-4">
                                <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Full Name</label>
                                <input
                                    type="text"
                                    value={employee.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    className="w-full text-2xl font-bold bg-brand-50 dark:bg-white/5 border border-brand-200 dark:border-white/10 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-500/50"
                                />
                            </div>
                        ) : (
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{employee.name}</h1>
                        )}
                        <p className="text-lg text-brand-600 dark:text-brand-400 font-medium mb-4">
                            {employee.role?.name || employee.role?.title || employee.role || 'Employee'} • {profile.title || 'No Designation'}
                        </p>                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <span className="px-3 py-1 bg-gray-100 dark:bg-white/10 rounded-lg text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                <Briefcase size={16} /> ID: {employee.id}
                            </span>
                            <span className="px-3 py-1 bg-gray-100 dark:bg-white/10 rounded-lg text-sm text-gray-600 dark:text-gray-300">
                                {profile.location || 'N/A'}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {isEditing ? (
                            <>
                                <button onClick={handleCancel} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-bold">
                                    Cancel
                                </button>
                                <button onClick={handleSave} className="px-4 py-2 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all font-bold flex items-center gap-2">
                                    <Save size={18} /> Save Changes
                                </button>
                            </>
                        ) : (
                            hasPermission(['HR_ADMIN']) && (
                                <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all font-bold flex items-center gap-2">
                                    <Edit size={18} /> Edit Profile
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-white/10 overflow-x-auto pb-1">
                {['statutory', 'documents', 'personal', 'shiftRoster', 'salary', 'team'].map((tab) => (<button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`pb-3 px-2 font-medium transition-all whitespace-nowrap capitalize ${activeTab === tab ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    {tab === 'statutory'
                        ? 'Statutory & Bank Info'
                        : tab === 'personal'
                            ? 'Personal Details'
                            : tab === 'shiftRoster'
                                ? 'Shift & Roster'
                                : tab === 'salary'
                                    ? 'Salary Info'
                                    : tab === 'team'
                                        ? 'Team Info'
                                        : 'Document Vault'}
                </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Detail Card */}
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'statutory' && (
                        <div className="bg-white dark:bg-brand-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5 animate-fade-in-up">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <CreditCard className="text-brand-500" /> Statutory Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    { label: 'UAN (Provident Fund)', key: 'uan', placeholder: '12-digit UAN' },
                                    { label: 'ESIC Number', key: 'esic', placeholder: '10-digit ESIC Number' },
                                    { label: 'PAN Number', key: 'pan', placeholder: 'e.g. ABCDE1234F' },
                                    { label: 'Aadhaar Number', key: 'aadhaar', placeholder: '12-digit Aadhaar Number' },
                                ].map((field) => (
                                    <div key={field.key} className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase">{field.label}</label>
                                        {isEditing ? (
                                            <>
                                                <input
                                                    type="text"
                                                    placeholder={field.placeholder}
                                                    value={(statutory as any)[field.key] || ''}
                                                    onChange={(e) => {
                                                        let value =
                                                            field.key === 'pan'
                                                                ? e.target.value.toUpperCase()
                                                                : e.target.value.replace(/\D/g, '');

                                                        if (field.key === 'uan') value = value.slice(0, 12);
                                                        if (field.key === 'esic') value = value.slice(0, 10);
                                                        if (field.key === 'aadhaar') value = value.slice(0, 12);

                                                        handleStatutoryChange(field.key, value);
                                                    }}
                                                    className={`appearance-none w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border ${errors[field.key]
                                                        ? 'border-red-500'
                                                        : 'border-gray-200 dark:border-white/10'
                                                        } rounded-lg outline-none text-gray-800 dark:text-white font-medium cursor-pointer`} />
                                                {errors[field.key] && <p className="text-red-500 text-xs mt-1">{errors[field.key]}</p>}
                                            </>
                                        ) : (
                                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-lg">{(statutory as any)[field.key] || 'N/A'}</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <hr className="my-8 border-gray-100 dark:border-white/10" />

                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <FileText className="text-green-500" /> Bank Account
                            </h3>

                            {isEditing ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Bank Name</label>
                                        <input
                                            type="text"
                                            placeholder='e.g. HDFC Bank'
                                            value={bank.bankName || ''}
                                            onChange={(e) => handleBankChange('bankName', e.target.value)}
                                            className={`w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border ${errors.bankName ? 'border-red-500' : 'border-gray-200 dark:border-white/10'
                                                } rounded-lg focus:ring-2 focus:ring-brand-500/50 outline-none`}
                                        />
                                        {errors.bankName && (
                                            <p className="text-red-500 text-xs mt-1">
                                                {errors.bankName}
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Account Number</label>
                                        <input
                                            type="text"
                                            placeholder="9 to 18 digits"
                                            value={bank.accountNumber || ''}
                                            onChange={(e) =>
                                                handleBankChange('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 18))}
                                            className={`w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border ${errors.accountNumber ? 'border-red-500' : 'border-gray-200 dark:border-white/10'} rounded-lg focus:ring-2 focus:ring-brand-500/50 outline-none`}
                                        />
                                        {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase">IFSC Code</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. SBIN0123456"
                                            value={bank.ifsc || ''}
                                            onChange={(e) => handleBankChange('ifsc', e.target.value.toUpperCase())}
                                            className={`w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border ${errors.ifsc ? 'border-red-500' : 'border-gray-200 dark:border-white/10'} rounded-lg focus:ring-2 focus:ring-brand-500/50 outline-none uppercase`}
                                        />
                                        {errors.ifsc && <p className="text-red-500 text-xs mt-1">{errors.ifsc}</p>}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white p-6 rounded-2xl shadow-xl max-w-md relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                    <p className="text-gray-400 text-sm mb-1">Bank Name</p>
                                    <p className="text-xl font-bold mb-6">{bank.bankName || 'N/A'}</p>
                                    <p className="text-gray-400 text-sm mb-1">Account Number</p>
                                    <p className="text-2xl font-mono tracking-wider mb-6">{bank.accountNumber || 'N/A'}</p>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-gray-400 text-xs uppercase">IFSC Code</p>
                                            <p className="font-mono">{bank.ifsc || 'N/A'}</p>
                                        </div>
                                        <div className="w-10 h-6 bg-yellow-500/80 rounded"></div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="bg-white dark:bg-brand-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5 animate-fade-in-up">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <FileText className="text-orange-500" /> Document Vault
                                </h3>

                            </div>                           <div className="space-y-4">
                                {[
                                    { key: 'aadhaar', name: 'Aadhaar Card' },
                                    { key: 'pan', name: 'PAN Card' },
                                    { key: 'degree', name: 'Highest Qualification Degree' },


                                ].map((doc) => {
                                    const savedDoc = profile.documents?.find((d: any) => d.name === doc.name);
                                    return (
                                        <div
                                            key={doc.name}
                                            className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${savedDoc
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-gray-100 dark:bg-white/10 text-gray-400'
                                                    }`}>
                                                    <FileText size={20} />
                                                </div>

                                                <div>
                                                    <p className="font-bold text-base text-gray-800 dark:text-white">
                                                        {doc.name} <span className="text-red-500">*</span>
                                                    </p>

                                                    <p className={`text-sm ${savedDoc ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        {savedDoc ? (savedDoc.originalName || 'Document uploaded') : 'No document uploaded'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {/* Explicit Upload Button shown only during Edit Profile mode if no document exists */}
                                                {isEditing && !savedDoc && (
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById(`file-input-${doc.key}`)?.click()}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer mr-2"
                                                    >
                                                        <Upload size={14} /> Upload
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    disabled={!savedDoc}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (savedDoc?.url) {
                                                            const baseUrl = 'http://localhost:3001';
                                                            const fullUrl = savedDoc.url.startsWith('http') ? savedDoc.url : (savedDoc.url.startsWith('/uploads/') ? `${baseUrl}${savedDoc.url}` : `${baseUrl}/uploads/${savedDoc.url}`);
                                                            window.open(fullUrl, '_blank');
                                                        }
                                                    }}
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${savedDoc
                                                        ? 'bg-brand-500/10 text-brand-500 hover:bg-brand-500 hover:text-white cursor-pointer'
                                                        : 'bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                        }`}
                                                >
                                                    <Eye size={18} />
                                                </button>

                                                {/* Explicit Delete Button shown only during Edit Profile mode if document exists */}
                                                {isEditing && savedDoc && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const docIndex = profile.documents?.findIndex((d: any) => d.id === savedDoc.id);
                                                            if (docIndex !== -1 && docIndex !== undefined) {
                                                                setDocToDelete(docIndex);
                                                            }
                                                        }}
                                                        className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white cursor-pointer ml-1"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>

                                            <input
                                                id={`file-input-${doc.key}`}
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,image/*"
                                                onChange={(e) => handleFileUpload(e, doc.name)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'personal' && (
                        <div className="bg-white dark:bg-brand-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5 animate-fade-in-up">
                            <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white flex justify-between items-center">
                                Personal Information
                                {isEditing && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Employment Status:</span>
                                        <select
                                            value={profile.status || 'Active'}
                                            onChange={(e) => handleInputChange('status', e.target.value)}
                                            className=" bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1 text-xs font-bold text-gray-800 dark:text-white outline-none cursor-pointer"                                        >
                                            <option value="Active" className="dark:bg-brand-900">
                                                Active
                                            </option>

                                            <option value="Inactive" className="dark:bg-brand-900">
                                                Inactive
                                            </option>
                                        </select>
                                    </div>
                                )}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Phone</label>
                                    {isEditing ? (
                                        <>
                                            <input type="text" value={profile.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                className={`w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border ${errors.phone ? 'border-red-500' : 'border-gray-200 dark:border-white/10'} rounded-lg outline-none`} />
                                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                                        </>
                                    ) : <p className="font-semibold">{profile.phone || 'N/A'}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Email</label>
                                    {isEditing ? (
                                        <>
                                            <input
                                                type="email"
                                                value={employee.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                className={`w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border ${errors.email ? 'border-red-500' : 'border-gray-200 dark:border-white/10'
                                                    } rounded-lg outline-none`}
                                            />

                                            {errors.email && (
                                                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">{employee.email}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Date of Birth</label>
                                    {isEditing ? (
                                        <>
                                            <input type="date"
                                                value={profile.dob ? profile.dob.split('T')[0] : ''}
                                                max={new Date().toISOString().split('T')[0]}
                                                onChange={(e) => handleInputChange('dob', e.target.value)}
                                                className={`w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border ${errors.dob ? 'border-red-500' : 'border-gray-200 dark:border-white/10'} rounded-lg outline-none`} />

                                            {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob}</p>}
                                        </>
                                    ) : <p className="font-semibold">{profile.dob ? new Date(profile.dob).toLocaleDateString() : 'N/A'}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">
                                        Date of Joining
                                    </label>

                                    {isEditing && hasPermission(['HR_ADMIN']) ? (
                                        <>
                                            <input
                                                type="date"
                                                value={profile.joiningDate ? profile.joiningDate.split('T')[0] : ''}
                                                max={new Date().toISOString().split('T')[0]}
                                                onChange={(e) => handleInputChange('joiningDate', e.target.value)}
                                                className={`w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border ${errors.joiningDate ? 'border-red-500' : 'border-gray-200 dark:border-white/10'
                                                    } rounded-lg outline-none`}
                                            />

                                            {errors.joiningDate && (
                                                <p className="text-red-500 text-xs mt-1">{errors.joiningDate}</p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="font-semibold">
                                            {profile.joiningDate
                                                ? new Date(profile.joiningDate).toLocaleDateString('en-IN')
                                                : 'N/A'}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">SYSTEM ROLE</label>
                                    {isEditing && hasPermission(['HR_ADMIN']) ? (
                                        <div className="relative">
                                            <select
                                                value={employee.role?.id || employee.roleId || ''}
                                                onChange={(e) => {
                                                    const selectedRole = roles.find((r: any) => String(r.id) === String(e.target.value));
                                                    if (errors.role) {
                                                        setErrors(prev => ({
                                                            ...prev,
                                                            role: ''
                                                        }));
                                                    }
                                                    setEmployee((prev: any) => ({
                                                        ...prev,
                                                        roleId: e.target.value,
                                                        role: selectedRole
                                                    }));
                                                }}
                                                className="appearance-none w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all cursor-pointer"
                                            >
                                                <option value="" className="dark:bg-brand-900">
                                                    Select Role
                                                </option>

                                                {roles.map((role: any) => (
                                                    <option
                                                        key={role.id}
                                                        value={role.id}
                                                        className="dark:bg-brand-900"
                                                    >
                                                        {role.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="3"
                                                        d="M19 9l-7 7-7-7"
                                                    />
                                                </svg>
                                            </div>
                                            {errors.role && (
                                                <p className="text-red-500 text-xs mt-1">
                                                    {errors.role}
                                                </p>
                                            )}
                                        </div>

                                    ) : (
                                        <p className="font-semibold">
                                            {employee.role?.name || employee.role?.title || employee.role || 'N/A'}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">DESIGNATION</label>

                                    {isEditing && hasPermission(['HR_ADMIN']) ? (
                                        <div className="relative">
                                            <select
                                                value={profile.designationId || ''}
                                                onChange={(e) => {
                                                    const selectedDesignation = designations.find(
                                                        (d: any) => String(d.id) === String(e.target.value)
                                                    );
                                                    if (errors.designationId) {
                                                        setErrors(prev => ({
                                                            ...prev,
                                                            designationId: ''
                                                        }));
                                                    }

                                                    setEmployee((prev: any) => ({
                                                        ...prev,
                                                        employeeProfile: {
                                                            ...(prev?.employeeProfile || {}),
                                                            designationId: e.target.value,
                                                            title: selectedDesignation?.name || ''
                                                        }
                                                    }));
                                                }}
                                                className="appearance-none w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all cursor-pointer"
                                            >
                                                <option value="" className="dark:bg-brand-900">
                                                    Select Designation
                                                </option>

                                                {designations.map((desig: any) => (
                                                    <option
                                                        key={desig.id}
                                                        value={desig.id}
                                                        className="dark:bg-brand-900"
                                                    >
                                                        {desig.name}
                                                    </option>
                                                ))}
                                            </select>

                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="font-semibold">{profile.title || 'N/A'}</p>
                                    )}

                                    {errors.designationId && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.designationId}
                                        </p>
                                    )}

                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">
                                        DEPARTMENT
                                    </label>

                                    {isEditing && hasPermission(['HR_ADMIN']) ? (
                                        <div className="relative">
                                            <select
                                                value={profile.departmentId || ''}
                                                onChange={(e) => {
                                                    const selectedDepartment = departments.find(
                                                        (d: any) => String(d.id) === String(e.target.value)
                                                    );
                                                    if (errors.departmentId) {
                                                        setErrors(prev => ({
                                                            ...prev,
                                                            departmentId: ''
                                                        }));
                                                    }

                                                    setEmployee((prev: any) => ({
                                                        ...prev,
                                                        employeeProfile: {
                                                            ...(prev?.employeeProfile || {}),
                                                            departmentId: e.target.value,
                                                            department: selectedDepartment?.name || ''
                                                        }
                                                    }));
                                                }}
                                                className="appearance-none w-full px-5 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-brand-500/20 outline-none text-gray-800 dark:text-white font-bold transition-all cursor-pointer"
                                            >
                                                <option value="" className="dark:bg-brand-900">
                                                    Select Department
                                                </option>

                                                {departments.map((dept: any) => (
                                                    <option
                                                        key={dept.id}
                                                        value={dept.id}
                                                        className="dark:bg-brand-900"
                                                    >
                                                        {dept.name}
                                                    </option>
                                                ))}
                                            </select>

                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="3"
                                                        d="M19 9l-7 7-7-7"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="font-semibold">
                                            {profile.department || 'N/A'}
                                        </p>
                                    )}

                                    {errors.departmentId && (
                                        <p className="text-red-500 text-xs mt-1">
                                            Department is required
                                        </p>
                                    )}
                                </div>


                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Blood Group</label>
                                    {isEditing ? (
                                        <>
                                            <select
                                                value={profile.bloodGroup || ''}
                                                onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                                                className={`w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border ${errors.bloodGroup
                                                    ? 'border-red-500'
                                                    : 'border-gray-200 dark:border-white/10'
                                                    } rounded-lg outline-none`}
                                            >
                                                <option value="" className="dark:bg-brand-900">Select Blood Group</option>
                                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                                    <option key={bg} value={bg} className="dark:bg-brand-900">
                                                        {bg}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.bloodGroup && <p className="text-red-500 text-xs mt-1">{errors.bloodGroup}</p>}
                                        </>
                                    ) : <p className="font-semibold">{profile.bloodGroup || 'N/A'}</p>}
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Address</label>
                                    {isEditing ? (
                                        <>
                                            <div className={`w-full bg-gray-50 dark:bg-white/5 border ${errors.address ? 'border-red-500' : 'border-gray-200 dark:border-white/10'} rounded-lg focus-within:ring-2 focus-within:ring-brand-500/20 transition-all overflow-hidden h-[38px]`}>
                                                <textarea
                                                    rows={1}
                                                    value={profile.address || ''}
                                                    onChange={(e) => handleInputChange('address', e.target.value)}
                                                    className="w-full px-3 py-2 bg-transparent border-0 outline-none text-gray-700 dark:text-white text-sm font-medium placeholder:text-gray-400 dark:placeholder:text-gray-400 resize-none h-full overflow-y-auto block scrollbar-thin"
                                                />
                                            </div>
                                            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                                        </>
                                    ) : <p className="font-semibold break-all">{profile.address || 'N/A'}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                                    {isEditing && hasPermission(['HR_ADMIN']) ? (
                                        <div className="flex gap-4 mt-2">
                                            {['Active', 'Inactive', 'OnNotice'].map((s) => (
                                                <label key={s} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="status"
                                                        value={s}
                                                        checked={profile.status === s}
                                                        onChange={(e) => handleInputChange('status', e.target.value)}
                                                        className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-gray-300"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s}</span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className={`inline-block ml-2 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all hover:scale-105 ${profile.status === 'Active'
                                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400'
                                            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20 dark:text-rose-400'
                                            }`}>
                                            {profile.status || 'Active'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'shiftRoster' && (
                        <div className="bg-white dark:bg-brand-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5 animate-fade-in-up">
                            <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">
                                Shift & Roster
                            </h3>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase">
                                    Assigned Shift
                                </label>

                                {isEditing && hasPermission(['HR_ADMIN']) ? (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {shifts.map((shift: any) => (
                                                <div
                                                    key={shift.id}
                                                    onClick={() => {
                                                        if (isEditing && hasPermission(['HR_ADMIN'])) {

                                                            if (errors.shiftId) {
                                                                setErrors(prev => ({
                                                                    ...prev,
                                                                    shiftId: ''
                                                                }));
                                                            }

                                                            handleInputChange('shiftId', String(shift.id));
                                                        }
                                                    }}
                                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${String(profile.shiftId) === String(shift.id)
                                                        ? 'border-brand-400 ring-2 ring-brand-500/50 bg-brand-500/10'
                                                        : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5'
                                                        }`}
                                                >


                                                    <div className="space-y-1 text-xs text-gray-500 dark:text-gray-300">
                                                        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">

                                                            <h4 className="font-bold text-lg text-gray-800 dark:text-white">
                                                                {shift.name}
                                                            </h4>
                                                            <p className="flex justify-between">
                                                                <span className="font-semibold">Timing:</span>
                                                                <span>
                                                                    {shift.startTime} - {shift.endTime}
                                                                </span>
                                                            </p>
                                                            <p className="flex justify-between">
                                                                <span className="font-semibold">Break:</span>
                                                                <span>{shift.breakDuration} mins</span>
                                                            </p>

                                                            <p className="flex justify-between">
                                                                <span className="font-semibold">Grace Time:</span>
                                                                <span>{shift.graceTime} mins</span>
                                                            </p>

                                                            <p className="flex justify-between">
                                                                <span className="font-semibold">Night Shift:</span>
                                                                <span>{shift.isNightShift ? "Yes" : "No"}</span>
                                                            </p>

                                                        </div>

                                                    </div>
                                                </div>

                                            ))}
                                        </div>
                                        {errors.shiftId && (
                                            <p className="text-red-500 text-sm mt-3 font-medium">
                                                Select a shift
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <div>
                                        {(() => {
                                            const assignedShift = shifts.find(
                                                (s: any) => String(s.id) === String(profile.shiftId)
                                            );

                                            return assignedShift ? (
                                                <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 max-w-md">

                                                    <h4 className="font-bold text-lg text-gray-800 dark:text-white mb-3">
                                                        {assignedShift.name}
                                                    </h4>

                                                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">



                                                        <div className="flex justify-between">
                                                            <span>Timing:</span>
                                                            <span>
                                                                {assignedShift.startTime} - {assignedShift.endTime}
                                                            </span>
                                                        </div>

                                                        <div className="flex justify-between">
                                                            <span>Break:</span>
                                                            <span>{assignedShift.breakDuration} mins</span>
                                                        </div>

                                                        <div className="flex justify-between">
                                                            <span>Grace Time:</span>
                                                            <span>{assignedShift.graceTime} mins</span>
                                                        </div>

                                                        <div className="flex justify-between">
                                                            <span>Night Shift:</span>
                                                            <span>
                                                                {assignedShift.isNightShift ? 'Yes' : 'No'}
                                                            </span>
                                                        </div>

                                                    </div>
                                                </div>
                                            ) : (
                                                <p>No Shift Assigned</p>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'salary' && (
                        <div className="bg-white dark:bg-brand-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5 animate-fade-in-up">
                            <h3 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">
                                Salary Info
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    { label: 'Basic', key: 'basic', placeholder: 'Enter basic salary' },
                                    { label: 'HRA', key: 'hra', placeholder: 'Enter HRA' },
                                    { label: 'Special Allowance', key: 'special', placeholder: 'Enter special allowance' },
                                    { label: 'Medical', key: 'medical', placeholder: 'Enter medical amount' },
                                    { label: 'PF', key: 'pf', placeholder: 'Enter PF amount' },
                                    { label: 'PT', key: 'pt', placeholder: 'Enter PT amount' },
                                    { label: 'Tax / TDS', key: 'tax', placeholder: 'Enter tax / TDS amount' },
                                ].map((field) => (
                                    <div key={field.key} className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase">
                                            {field.label}
                                        </label>

                                        {isEditing && hasPermission(['HR_ADMIN']) ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={profile.salary?.[field.key] || ''}
                                                    onChange={(e) =>
                                                        handleSalaryChange(field.key, e.target.value.replace(/\D/g, ''))
                                                    }
                                                    placeholder={field.placeholder}
                                                    className={`w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border ${errors[field.key]
                                                        ? 'border-red-500'
                                                        : 'border-gray-200 dark:border-white/10'
                                                        } rounded-lg outline-none`}
                                                />

                                                {errors[field.key] && (
                                                    <p className="text-red-500 text-xs mt-1">
                                                        {errors[field.key]}
                                                    </p>
                                                )}
                                            </>


                                        ) : (
                                            <p className="font-semibold">
                                                ₹ {profile.salary?.[field.key] || '0'}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === 'team' && (
                        <div className="bg-white dark:bg-brand-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5 animate-fade-in-up space-y-6">
                            {/* Team & Manager Details */}
                            <div>
                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
                                    <Briefcase className="text-green-500" size={20} /> Team & Manager Details
                                </h3>
                                {employee.teamMembers && employee.teamMembers.length > 0 ? (
                                    <div className="space-y-4">
                                        {employee.teamMembers.map((membership: any) => {
                                            const team = membership.team;
                                            const teamManager = team?.manager;
                                            return (
                                                <div key={membership.id} className="bg-gray-55/50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10 space-y-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Name</label>
                                                        <p className="font-bold text-brand-600 dark:text-brand-400 text-lg">{team?.name || 'N/A'}</p>
                                                        {team?.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{team.description}</p>}
                                                    </div>

                                                    {teamManager ? (
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-200/50 dark:border-white/10 pt-3">
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Manager Name</label>
                                                                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{teamManager.name}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Manager Email</label>
                                                                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm break-all">{teamManager.email}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Manager Phone</label>
                                                                <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{teamManager.employeeProfile?.phone || 'N/A'}</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-gray-550 dark:text-gray-400 italic border-t border-gray-200/50 dark:border-white/10 pt-3 text-xs">No Team Manager Assigned for this Team</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">No Team Assigned</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar / Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-brand-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5">
                        <h4 className="font-bold text-gray-800 dark:text-white mb-4">Quick Actions</h4>
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    const lastMonth = new Date();
                                    lastMonth.setMonth(lastMonth.getMonth() - 1);

                                    setSelectedPayslipMonth(lastMonth.getMonth());
                                    setSelectedPayslipYear(lastMonth.getFullYear());
                                    setInputMonth(MONTH_NAMES[lastMonth.getMonth()]);
                                    setInputYear(String(lastMonth.getFullYear()));

                                    setShowPayslip(true);
                                }}
                                className="w-full py-2.5 px-4 bg-brand-50 dark:bg-white/5 text-brand-700 dark:text-brand-300 rounded-xl text-sm font-medium hover:bg-brand-700 hover:text-white transition-colors text-left flex items-center gap-3"
                            >
                                <FileText size={16} /> Generate Payslip
                            </button>
                            <button
                                onClick={() => setShowIDCard(true)}
                                className="w-full py-2.5 px-4 bg-brand-50 dark:bg-white/5 text-brand-700 dark:text-brand-300 rounded-xl text-sm font-medium hover:bg-brand-700 hover:text-white transition-colors text-left flex items-center gap-3"
                            >
                                <User size={16} /> ID Card Preview
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Payslip Modal (Keep original UI logic, but ensure it uses the dynamic data) */}
            {showPayslip && createPortal(
                <div className="fixed inset-0 z-[999999] flex items-center justify-center  bg-black/70 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto custom-scrollbar scrollbar-thin scrollbar-thumb-brand-500/60">
                    <div className="bg-white dark:bg-brand-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">

                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 shrink-0">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                {/* Left title */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Payslip Preview</h3>
                                    {selectedMonthLabel && (
                                        <p className="text-xs text-brand-600 font-semibold mt-0.5">Payslip for {selectedMonthLabel}</p>
                                    )}
                                </div>

                                {/* Right: month + year fields */}
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-brand-800 shadow-sm">
                                        <div className="relative">
                                            <select
                                                value={inputMonth}
                                                onChange={(e) => {
                                                    setInputMonth(e.target.value);
                                                    setPayslipError('');
                                                }}
                                                className="appearance-none px-4 pr-8 py-2 text-sm font-bold bg-brand-700 outline-none text-white cursor-pointer w-32 border-r border-brand-600">
                                                {availableMonths.map((month) => (
                                                    <option key={month} value={month} className="dark:bg-brand-900">
                                                        {month}
                                                    </option>
                                                ))}
                                            </select>

                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none text-xs">
                                                ▼
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={inputYear}
                                                onChange={(e) => {
                                                    setInputYear(e.target.value);
                                                    setPayslipError('');
                                                }}
                                                className="appearance-none px-4 pr-8 py-2 text-sm font-bold bg-brand-700 outline-none text-white cursor-pointer w-24">
                                                {availableYears.map((year) => (
                                                    <option key={year} value={String(year)} className="dark:bg-brand-900">
                                                        {year}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white pointer-events-none text-xs">
                                                ▼
                                            </span>
                                        </div>

                                    </div>
                                    <button
                                        onClick={applyPayslipMonth}
                                        className="px-5 py-2 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 active:scale-95 transition-all shadow-sm"
                                    >
                                        Apply
                                    </button>
                                    {payslipError && (
                                        <span className="text-xs text-rose-500 font-semibold">{payslipError}</span>
                                    )}
                                    <button
                                        onClick={() => setShowPayslip(false)}
                                        className="p-2 bg-gray-200 dark:bg-white/10 rounded-full hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                                    >
                                        <X size={18} className="text-gray-600 dark:text-gray-300" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content (Scrollable if absolutely necessary, but designed to fit) */}
                        <div className="p-4 md:p-6 bg-gray-100 dark:bg-brand-950 overflow-y-auto custom-scrollbar flex-1 flex justify-center items-start">

                            {payslipBlockMessage ? (
                                <div className="min-h-[520px] flex items-center justify-center">
                                    <div className="max-w-sm w-full bg-white rounded-2xl p-7 text-center shadow-[0_18px_45px_rgba(0,0,0,0.22)] border-2 border-gray-300 dark:bg-[#0b0b24] dark:border-white/10">
                                        <div className="flex justify-center mb-5">
                                            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                                                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                                                    <span className="text-white text-2xl font-bold">!</span>
                                                </div>
                                            </div>
                                        </div>

                                        <h4 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-3">
                                            No Salary Slip
                                        </h4>

                                        <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                                            {payslipBlockMessage}
                                        </p>
                                    </div>
                                </div>
                            ) : (

                                <div id="payslip-content" className="w-full max-w-3xl bg-white border border-gray-200 p-6 md:p-8 shadow-sm rounded-xl relative text-gray-900 text-sm">
                                    <div className="flex justify-between items-start border-b-2 border-brand-900 pb-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 md:w-14 md:h-14 bg-brand-900 text-white flex items-center justify-center font-bold text-xl rounded-lg">EH</div>
                                            <div className="text-left">
                                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">EnCalm <span className="text-brand-600">HRX</span></h1>
                                            </div>
                                        </div>
                                        <div className="text-right text-xs text-gray-600">
                                            <p className="font-bold text-gray-800">EncalmIT Consultancy Pvt. Ltd.</p>
                                            <p>Gurgaon, Haryana, India</p>
                                            <p>CIN: U12345HR2023PTC123456</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 mb-4">
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-brand-600 text-[10px] uppercase tracking-wider mb-1 border-b border-gray-100 pb-1">Employee Details</h4>
                                            <div className="grid grid-cols-3 gap-1 text-xs">
                                                <span className="text-gray-500 font-medium">Name:</span>
                                                <span className="col-span-2 font-bold">{employee.name}</span>
                                                <span className="text-gray-500 font-medium">Employee ID:</span>
                                                <span className="col-span-2 font-bold">{employee.id}</span>
                                                <span className="text-gray-500 font-medium">Role:</span>
                                                <span className="col-span-2 font-bold break-words whitespace-normal">{profile.title || 'N/A'}</span>
                                                <span className="text-gray-500 font-medium">Department:</span>
                                                <span className="col-span-2 font-bold break-words whitespace-normal">{profile.department || 'N/A'}</span>
                                                <span className="text-gray-500 font-medium">DOB:</span>
                                                <span className="col-span-2 font-bold">
                                                    {profile.dob ? new Date(profile.dob).toLocaleDateString('en-IN') : 'N/A'}
                                                </span>
                                                <span className="text-gray-500 font-medium">Date of Joining:</span>
                                                <span className="col-span-2 font-bold">{joiningDate}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="font-bold text-brand-600 text-[10px] uppercase tracking-wider mb-1 border-b border-gray-100 pb-1">Bank & Pan Details</h4>
                                            <div className="grid grid-cols-3 gap-1 text-xs">
                                                <span className="text-gray-500 font-medium">Bank Name:</span>
                                                <span className="col-span-2 font-bold break-words whitespace-normal">{bank.bankName || 'N/A'}</span>
                                                <span className="text-gray-500 font-medium">Account No:</span>
                                                <span className="col-span-2 font-bold">XXXX{(bank.accountNumber || '').slice(-4)}</span>
                                                <span className="text-gray-500 font-medium">PAN Number:</span>
                                                <span className="col-span-2 font-bold">{statutory.pan || 'N/A'}</span>
                                                <span className="text-gray-500 font-medium">UAN:</span>
                                                <span className="col-span-2 font-bold">{statutory.uan || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payroll Summary Bar */}
                                    <div className="flex items-center gap-0 mb-4 border border-gray-200 rounded-lg overflow-hidden text-xs">
                                        <div className="flex-1 bg-gray-50 px-3 py-2 text-center border-r border-gray-200">
                                            <p className="text-gray-400 font-medium uppercase tracking-wider text-[9px]">Total Working Days</p>
                                            <p className="font-bold text-gray-800 text-sm mt-0.5">{calendarDays}</p>
                                        </div>
                                        <div className="flex-1 bg-gray-50 px-3 py-2 text-center border-r border-gray-200">
                                            <p className="text-gray-400 font-medium uppercase tracking-wider text-[9px]">Paid Days</p>
                                            <p className="font-bold text-green-700 text-sm mt-0.5">{paidDays}</p>
                                        </div>
                                        <div className="flex-1 bg-gray-50 px-3 py-2 text-center">
                                            <p className="text-gray-400 font-medium uppercase tracking-wider text-[9px]">Leave Taken (LWP)</p>
                                            <p className="font-bold text-sm mt-0.5" style={{ color: lwpDays > 0 ? '#e11d48' : '#1f2937' }}>{lwpDays}</p>
                                        </div>
                                    </div>

                                    <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                                        <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-200">
                                            <div className="p-2 font-bold text-gray-700 text-xs uppercase text-center border-r border-gray-200">Earnings</div>
                                            <div className="p-2 font-bold text-gray-700 text-xs uppercase text-center">Deductions</div>
                                        </div>
                                        <div className="grid grid-cols-2 text-xs min-h-[120px]">
                                            <div className="border-r border-gray-200 p-0 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between p-2 border-b border-gray-50">
                                                        <span className="text-gray-600 font-semibold">Basic Salary</span>
                                                        <span className="font-semibold">₹ {basic.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                    {hra > 0 && (
                                                        <div className="flex justify-between p-2 border-b border-gray-50">
                                                            <span className="text-gray-600">HRA</span>
                                                            <span className="font-semibold">₹ {hra.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}
                                                    {special > 0 && (
                                                        <div className="flex justify-between p-2 border-b border-gray-50">
                                                            <span className="text-gray-600">Special Allowance</span>
                                                            <span className="font-semibold">₹ {special.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}
                                                    {medical > 0 && (
                                                        <div className="flex justify-between p-2 border-b border-gray-50">
                                                            <span className="text-gray-600">Medical Allowance</span>
                                                            <span className="font-semibold">₹ {medical.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}
                                                    {totalEarnings === 0 && (
                                                        <div className="flex justify-between p-2 md:p-3 italic text-gray-400">
                                                            <span>Salary structure pending setup...</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {totalEarnings > 0 && (
                                                    <div className="flex justify-between p-2 bg-gray-50 border-t border-gray-100 font-bold text-gray-800">
                                                        <span>Total Earnings</span>
                                                        <span>₹ {totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-0 flex flex-col justify-between">
                                                <div>
                                                    {pf > 0 && (
                                                        <div className="flex justify-between p-2 border-b border-gray-50">
                                                            <span className="text-gray-600">Provident Fund (PF)</span>
                                                            <span className="font-semibold">₹ {pf.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}
                                                    {pt > 0 && (
                                                        <div className="flex justify-between p-2 border-b border-gray-50">
                                                            <span className="text-gray-600">Professional Tax (PT)</span>
                                                            <span className="font-semibold">₹ {pt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}
                                                    {tax > 0 && (
                                                        <div className="flex justify-between p-2 border-b border-gray-50">
                                                            <span className="text-gray-600">Income Tax / TDS</span>
                                                            <span className="font-semibold">₹ {tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}
                                                    {lwpDeduction > 0 && (
                                                        <div className="flex justify-between p-2 border-b border-gray-50" style={{ color: '#e11d48', backgroundColor: 'rgba(255, 241, 242, 0.5)' }}>
                                                            <span className="font-semibold">LWP Deduction ({lwpDays} days)</span>
                                                            <span className="font-semibold">₹ {lwpDeduction.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}
                                                    {totalDeductions === 0 && (
                                                        <div className="flex justify-between p-2 md:p-3 italic text-gray-400">
                                                            <span>No deductions applicable</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-between p-2 border-b border-gray-50 ">
                                                    <span className="text-gray-600">Total Deductions</span>
                                                    <span className="font-semibold">
                                                        ₹ {totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between p-2 bg-gray-50 border-t border-gray-100 font-bold">
                                                    <span className="text-gray-700">Total Salary</span>
                                                    <span className="text-green-700 font-bold">
                                                        ₹ {totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-center text-[10px] text-gray-400 mt-4 pt-4 border-t border-gray-100">
                                        <p>This is a computer-generated document and does not require a signature.</p>
                                        <p className="mt-1">Generated on {new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setShowPayslip(false)}
                                className="px-6 py-2.5 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                            >
                                Back
                            </button>
                            {!payslipBlockMessage && (

                                <button

                                    onClick={async () => {

                                        const input = document.getElementById('payslip-content');
                                        if (!input) {
                                            toast.error("Could not find payslip content");
                                            return;
                                        }

                                        try {
                                            const toastId = toast.loading("Generating PDF...");
                                            const canvas = await html2canvas(input, {
                                                scale: 2,
                                                useCORS: true,
                                                allowTaint: true,
                                                backgroundColor: '#ffffff',
                                                onclone: (clonedDoc) => {
                                                    const elements = clonedDoc.querySelectorAll('*');
                                                    elements.forEach((el) => {
                                                        const HTMLElement = el as HTMLElement;
                                                        const style = window.getComputedStyle(HTMLElement);
                                                        if (style.color.includes('oklch')) HTMLElement.style.color = '#000000';
                                                        if (style.backgroundColor.includes('oklch')) HTMLElement.style.backgroundColor = '#ffffff';
                                                        if (style.borderColor.includes('oklch')) HTMLElement.style.borderColor = '#e5e7eb';
                                                    });
                                                }
                                            });

                                            const imgData = canvas.toDataURL('image/png');
                                            const pdf = new jsPDF('p', 'mm', 'a4');
                                            const pdfWidth = pdf.internal.pageSize.getWidth();
                                            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

                                            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                                            pdf.save(`Payslip_${employee.name}_${selectedMonthShort}.pdf`);

                                            toast.success("PDF Downloaded", { id: toastId });
                                        } catch (err) {
                                            console.error("PDF Export Error:", err);
                                            toast.error("Failed to generate PDF");
                                        }
                                    }}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
                                >
                                    <Download size={18} /> Download PDF
                                </button>
                            )}

                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ID Card Modal (Keep original UI logic, with dynamic data) */}
            {showIDCard && createPortal(
                <div className="fixed inset-0 z-[999999] flex items-start justify-center pt-20 bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                    <div className="relative">
                        <button onClick={() => setShowIDCard(false)} className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors">
                            <X size={24} />
                        </button>

                        <div id="id-card-container" className="w-[320px] h-[540px] bg-white rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col animate-scale-in">
                            <div
                                className="absolute top-0 inset-x-0 h-48 rounded-b-[50px] z-0"
                                style={{ background: 'linear-gradient(to bottom right, #5b21b6, #7c3aed)' }}
                            ></div>
                            <div className="mx-auto w-16 h-3 bg-white/20 rounded-full mt-4 relative z-10 backdrop-blur-sm"></div>
                            <div className="flex justify-between items-start mb-6 px-6 pt-4 relative z-10">
                                <h2 className="text-white font-bold tracking-widest text-lg opacity-90">EnCalm <span className="text-brand-300">HRX</span></h2>
                                <div className="w-10 h-8 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-md opacity-80 shadow-inner border border-yellow-300/50"></div>
                            </div>
                            <div className="relative z-10 mx-auto mt-6">
                                <div
                                    className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-white font-bold text-4xl"
                                    style={{ background: '#7c3aed' }}
                                >
                                    {employee.name.split(' ').map((n: any) => n[0]).join('')}
                                </div>
                            </div>
                            <div className="text-center mt-4 flex-1 flex flex-col items-center">
                                <h1 className="text-2xl font-bold text-gray-800 px-4">{employee.name}</h1>
                                <p className="text-brand-600 font-medium text-sm mt-1">{profile.title || 'Employee'}</p>
                                <div className="w-12 h-1 bg-brand-200 rounded-full my-4"></div>
                                <div className="grid grid-cols-[1.3fr_0.7fr] gap-x-5 gap-y-2 text-left w-full px-8">    {/* First row */}
                                    <div className="min-w-0">
                                        <p className="text-[9px] text-gray-400 uppercase font-bold">
                                            Employee ID
                                        </p>
                                        <p className="text-sm font-semibold text-gray-700">
                                            {employee.id}
                                        </p>
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">
                                            Blood Group
                                        </p>
                                        <p className="text-sm font-semibold text-gray-700">
                                            {profile.bloodGroup || 'N/A'}
                                        </p>
                                    </div>

                                    {/* Second row */}
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">
                                            Department
                                        </p>
                                        <p className="text-sm font-semibold text-gray-700 truncate">
                                            {profile.department || 'N/A'}
                                        </p>
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-[9px] text-gray-400 uppercase font-bold whitespace-nowrap">
                                            Mobile Number
                                        </p>
                                        <p className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                                            {profile.phone || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                            </div>
                            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between items-center mt-auto">
                                <div className="w-16 h-16 bg-white p-1 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`Employee ID: ${employee.id}\nName: ${employee.name}\nRole: ${profile.title || 'Employee'}\nDept: ${profile.department || 'N/A'}`)}`}
                                        alt="QR Code"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="text-right flex flex-col items-end justify-end">
                                   <div className=" w-30 h-full object-contain object-bottom "> {adminSignatureUrl && (
                                        <img
                                            src={adminSignatureUrl}
                                            alt="Admin Signature"
                                            
                                        />
                                    )}
                                    </div>
                                    <div className="italic text-gray-300 text-s leading-none">
                                        Authorized Sig.
                                    </div>
                                </div>

                            </div>
                        </div>
                        <div className="flex justify-center mt-6">
                            <button
                                onClick={() => {
                                    const printContent = document.getElementById('id-card-container');
                                    const WindowPrt = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');

                                    if (WindowPrt && printContent) {
                                        WindowPrt.document.write(`
                                        <html>
                                            <head>
                                                <title>Print ID Card</title>
                                                <script src="https://cdn.tailwindcss.com"></script>
                                                <style>
                                                    @page {
                                                        size: 320px 540px;
                                                        margin: 0;
                                                    }

                                                    html, body {
                                                        margin: 0;
                                                        padding: 0;
                                                        width: 320px;
                                                        height: 540px;
                                                        overflow: hidden;
                                                        -webkit-print-color-adjust: exact;
                                                        print-color-adjust: exact;
                                                    }

                                                    #id-card-container {
                                                        width: 320px !important;
                                                        height: 540px !important;
                                                        border-radius: 24px !important;
                                                        overflow: hidden !important;
                                                        box-shadow: none !important;
                                                    }
                                                </style>
                                            </head>
                                            <body>
                                                ${printContent.outerHTML}
                                            </body>
                                        </html>
                                    `);

                                        WindowPrt.document.close();

                                        setTimeout(() => {
                                            WindowPrt.focus();
                                            WindowPrt.print();
                                            WindowPrt.close();
                                        }, 800);
                                    }
                                }}
                                className="flex items-center gap-2 px-6 py-2 bg-white text-gray-800 font-bold rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                            >
                                <Printer size={18} /> Print
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Document Deletion Confirmation */}
            {docToDelete !== null && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setDocToDelete(null)} />
                    <div className="relative bg-white dark:bg-brand-950 w-full max-w-sm rounded-[2rem] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden animate-scale-in">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <X size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Delete Document?</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
                                Are you sure you want to delete <strong>{profile?.documents?.[docToDelete]?.name || 'this document'}</strong>? This action cannot be undone.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={async () => {
                                        try {
                                            const docId = profile.documents[docToDelete]?.id;
                                            const empId = id || employee.id;

                                            if (docId) {
                                                await api.delete(`/employee/${empId}/documents/${docId}`);
                                            }

                                            setEmployee((prev: any) => ({
                                                ...prev,
                                                employeeProfile: {
                                                    ...(prev.employeeProfile || {}),
                                                    documents: prev.employeeProfile.documents.filter((_: any, idx: number) => idx !== docToDelete)
                                                }
                                            }));
                                            setDocToDelete(null);
                                            toast.success('Document deleted from server');
                                            fetchEmployee();
                                        } catch (error) {
                                            console.error('Delete error:', error);
                                            toast.error('Failed to delete document from server');
                                        }
                                    }}
                                    className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-600/20"
                                >
                                    Yes, Delete
                                </button>
                                <button
                                    onClick={() => setDocToDelete(null)}
                                    className="w-full py-3.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}