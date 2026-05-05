import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useRBAC } from '../hooks/useRBAC';
import { ArrowLeft, User, FileText, CreditCard, Download, Upload, Briefcase, Save, X, Edit, Printer, Loader2 } from 'lucide-react';
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

    const [activeTab, setActiveTab] = useState<'personal' | 'statutory' | 'documents'>('statutory');
    const [isEditing, setIsEditing] = useState(initialEditMode);
    const [showPayslip, setShowPayslip] = useState(false);
    const [showIDCard, setShowIDCard] = useState(false);
    const [loading, setLoading] = useState(true);

    // Employee State
    const [employee, setEmployee] = useState<any>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const fetchEmployee = async () => {
        try {
            const endpoint = id ? `/employee/${id}` : '/employee/me';
            const res = await api.get(endpoint);
            setEmployee(res.data);
            setErrors({});
        } catch (error) {
            console.error('Error fetching employee:', error);
            toast.error('Failed to load employee profile');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployee();
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

        if (pd.phone && !/^\d{10}$/.test(pd.phone)) newErrors.phone = "Phone must be 10 digits";
        if (pd.bloodGroup && !/^(A|B|AB|O)[+-]$/i.test(pd.bloodGroup)) newErrors.bloodGroup = "Invalid Blood Group (e.g. A+, O-)";
        if (isEditing && !pd.address) newErrors.address = "Address is required";
        if (isEditing && !pd.dob) newErrors.dob = "Date of Birth is required";

        if (p.uan && !/^\d{12}$/.test(p.uan)) newErrors.uan = "UAN must be 12 digits";
        if (p.esic && !/^\d{17}$/.test(p.esic)) newErrors.esic = "ESIC must be 17 digits";
        if (p.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(p.pan)) newErrors.pan = "Invalid PAN (e.g. ABCDE1234F)";
        if (p.aadhaar && !/^\d{12}$/.test(p.aadhaar)) newErrors.aadhaar = "Aadhaar must be 12 digits";

        if (b.accountNumber && !/^\d{9,18}$/.test(b.accountNumber)) newErrors.accountNumber = "Invalid Account Number";
        if (b.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(b.ifsc)) newErrors.ifsc = "Invalid IFSC Code";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            toast.error('Please fix validation errors');
            return;
        }
        try {
            const profileData = {
                phone: employee.employeeProfile?.phone,
                dob: employee.employeeProfile?.dob,
                bloodGroup: employee.employeeProfile?.bloodGroup,
                address: employee.employeeProfile?.address,
                location: employee.employeeProfile?.location,
                department: employee.employeeProfile?.department,
                title: employee.employeeProfile?.title,
                status: employee.employeeProfile?.status || 'Active',
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
                email: employee.email
            };

            await api.put(`/employee/${id}`, profileData);
            setIsEditing(false);
            toast.success('Profile Updated Successfully!');
        } catch (error) {
            console.error('Update error:', error);
            toast.error('Failed to update profile');
        }
    };

    const handleInputChange = (field: string, value: string) => {
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
        if (field === 'name' || field === 'email') {
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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const newDoc = {
                name: file.name,
                uploadedAt: new Date().toISOString(),
                // url: '' // Backend will provide this later
            };
            setEmployee((prev: any) => ({
                ...prev,
                employeeProfile: {
                    ...(prev?.employeeProfile || {}),
                    documents: [...(prev?.employeeProfile?.documents || []), newDoc]
                }
            }));
            toast.success(`${file.name} uploaded successfully! Save changes to persist.`);
            setIsEditing(true);
        }
    };

    const handleDownload = (doc: any) => {
        if (doc.url) {
            // If backend provides a real URL, open it to trigger download
            window.open(doc.url, '_blank');
        } else {
            // Fallback for documents that don't have a URL yet
            toast(`Download link for ${doc.name} will be provided by backend`);
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
                        <p className="text-lg text-brand-600 dark:text-brand-400 font-medium mb-4">{profile.title || 'Employee'} • {profile.department || 'N/A'}</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
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
                            <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all font-bold flex items-center gap-2">
                                <Edit size={18} /> Edit Profile
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-white/10 overflow-x-auto pb-1">
                {['statutory', 'documents', 'personal'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`pb-3 px-2 font-medium transition-all whitespace-nowrap capitalize ${activeTab === tab ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab === 'statutory' ? 'Statutory & Bank Info' : tab === 'personal' ? 'Personal Details' : 'Document Vault'}
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
                                    { label: 'ESIC Number', key: 'esic', placeholder: '17-digit ESIC Number' },
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
                                                    onChange={(e) => handleStatutoryChange(field.key, e.target.value)}
                                                    className={`w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border ${errors[field.key] ? 'border-red-500' : 'border-gray-200 dark:border-white/10'} rounded-lg focus:ring-2 focus:ring-brand-500/50 outline-none`}
                                                />
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
                                            value={bank.bankName || ''}
                                            onChange={(e) => handleBankChange('bankName', e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-brand-500/50 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase">Account Number</label>
                                        <input
                                            type="text"
                                            placeholder="9 to 18 digits"
                                            value={bank.accountNumber || ''}
                                            onChange={(e) => handleBankChange('accountNumber', e.target.value)}
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
                                {hasPermission(['HR_ADMIN']) && (
                                    <>
                                        <input type="file" id="document-upload" className="hidden" onChange={handleFileUpload} />
                                        <label htmlFor="document-upload" className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                                            <Upload size={16} /> Upload New
                                        </label>
                                    </>
                                )}
                            </div>

                            {profile.documents?.length > 0 ? (
                                <div className="space-y-4">
                                    {profile.documents.map((doc: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-red-100 text-red-500 rounded-lg flex items-center justify-center">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{doc.name}</p>
                                                    <p className="text-xs text-gray-500">Added on {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {isEditing && (
                                                    <button onClick={() => {
                                                        setEmployee((prev: any) => ({
                                                            ...prev,
                                                            employeeProfile: {
                                                                ...(prev.employeeProfile || {}),
                                                                documents: prev.employeeProfile.documents.filter((_: any, idx: number) => idx !== i)
                                                            }
                                                        }));
                                                    }} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                                        <X size={20} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDownload(doc)} className="p-2 text-gray-400 hover:text-brand-600 transition-colors">
                                                    <Download size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                                    <FileText className="mx-auto text-gray-300 mb-2" size={32} />
                                    <p className="text-gray-500">No documents uploaded yet.</p>
                                </div>
                            )}
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
                                            className="bg-brand-50 dark:bg-white/5 border border-brand-200 dark:border-white/10 rounded-lg px-3 py-1 text-xs font-bold text-brand-600 outline-none"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                )}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Phone</label>
                                    {isEditing ? (
                                        <>
                                            <input type="text" value={profile.phone || ''} onChange={(e) => handleInputChange('phone', e.target.value)} className={`w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border ${errors.phone ? 'border-red-500' : 'border-gray-200 dark:border-white/10'} rounded-lg outline-none`} />
                                            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                                        </>
                                    ) : <p className="font-semibold">{profile.phone || 'N/A'}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Email</label>
                                    {isEditing ? (
                                        <input 
                                            type="email" 
                                            value={employee.email} 
                                            onChange={(e) => handleInputChange('email', e.target.value)} 
                                            className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg outline-none" 
                                        />
                                    ) : (
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">{employee.email}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Date of Birth</label>
                                    {isEditing ? (
                                        <>
                                            <input type="date" value={profile.dob ? profile.dob.split('T')[0] : ''} onChange={(e) => handleInputChange('dob', e.target.value)} className={`w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border ${errors.dob ? 'border-red-500' : 'border-gray-200 dark:border-white/10'} rounded-lg outline-none`} />
                                            {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob}</p>}
                                        </>
                                    ) : <p className="font-semibold">{profile.dob ? new Date(profile.dob).toLocaleDateString() : 'N/A'}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Blood Group</label>
                                    {isEditing ? (
                                        <>
                                            <input type="text" value={profile.bloodGroup || ''} onChange={(e) => handleInputChange('bloodGroup', e.target.value.toUpperCase())} className={`w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border ${errors.bloodGroup ? 'border-red-500' : 'border-gray-200 dark:border-white/10'} rounded-lg outline-none uppercase`} />
                                            {errors.bloodGroup && <p className="text-red-500 text-xs mt-1">{errors.bloodGroup}</p>}
                                        </>
                                    ) : <p className="font-semibold">{profile.bloodGroup || 'N/A'}</p>}
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase">Address</label>
                                    {isEditing ? (
                                        <>
                                            <input type="text" value={profile.address || ''} onChange={(e) => handleInputChange('address', e.target.value)} className={`w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border ${errors.address ? 'border-red-500' : 'border-gray-200 dark:border-white/10'} rounded-lg outline-none`} />
                                            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                                        </>
                                    ) : <p className="font-semibold">{profile.address || 'N/A'}</p>}
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
                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all hover:scale-105 ${profile.status === 'Active'
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
                </div>

                {/* Sidebar / Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-brand-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-white/5">
                        <h4 className="font-bold text-gray-800 dark:text-white mb-4">Quick Actions</h4>
                        <div className="space-y-3">
                            <button
                                onClick={() => setShowPayslip(true)}
                                className="w-full py-2.5 px-4 bg-brand-50 dark:bg-white/5 text-brand-700 dark:text-brand-300 rounded-xl text-sm font-medium hover:bg-brand-100 transition-colors text-left flex items-center gap-3"
                            >
                                <FileText size={16} /> Generate Payslip
                            </button>
                            <button
                                onClick={() => setShowIDCard(true)}
                                className="w-full py-2.5 px-4 bg-brand-50 dark:bg-white/5 text-brand-700 dark:text-brand-300 rounded-xl text-sm font-medium hover:bg-brand-100 transition-colors text-left flex items-center gap-3"
                            >
                                <User size={16} /> ID Card Preview
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Payslip Modal (Keep original UI logic, but ensure it uses the dynamic data) */}
            {showPayslip && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-brand-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
                        
                        {/* Header */}
                        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5 shrink-0">
                            <h3 className="text-xl font-bold font-mono text-gray-800 dark:text-white">Payslip Preview</h3>
                            <button onClick={() => setShowPayslip(false)} className="bg-gray-200 dark:bg-white/10 p-2 rounded-full hover:bg-gray-300 dark:hover:bg-white/20 transition-colors">
                                <X size={20} className="text-gray-600 dark:text-gray-300" />
                            </button>
                        </div>

                        {/* Content (Scrollable if absolutely necessary, but designed to fit) */}
                        <div className="p-4 md:p-6 bg-gray-100 dark:bg-brand-950 overflow-y-auto custom-scrollbar flex-1 flex justify-center items-start">
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

                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-brand-600 text-[10px] uppercase tracking-wider mb-1 border-b border-gray-100 pb-1">Employee Details</h4>
                                        <div className="grid grid-cols-3 gap-1 text-xs">
                                            <span className="text-gray-500 font-medium">Name:</span>
                                            <span className="col-span-2 font-bold">{employee.name}</span>
                                            <span className="text-gray-500 font-medium">Employee ID:</span>
                                            <span className="col-span-2 font-bold">{employee.id}</span>
                                            <span className="text-gray-500 font-medium">Designation:</span>
                                            <span className="col-span-2 font-bold truncate">{profile.title || 'N/A'}</span>
                                            <span className="text-gray-500 font-medium">Department:</span>
                                            <span className="col-span-2 font-bold truncate">{profile.department || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-brand-600 text-[10px] uppercase tracking-wider mb-1 border-b border-gray-100 pb-1">Bank & Pan Details</h4>
                                        <div className="grid grid-cols-3 gap-1 text-xs">
                                            <span className="text-gray-500 font-medium">Bank Name:</span>
                                            <span className="col-span-2 font-bold truncate">{bank.bankName || 'N/A'}</span>
                                            <span className="text-gray-500 font-medium">Account No:</span>
                                            <span className="col-span-2 font-bold">XXXX{(bank.accountNumber || '').slice(-4)}</span>
                                            <span className="text-gray-500 font-medium">PAN Number:</span>
                                            <span className="col-span-2 font-bold">{statutory.pan || 'N/A'}</span>
                                            <span className="text-gray-500 font-medium">UAN:</span>
                                            <span className="col-span-2 font-bold">{statutory.uan || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                                    <div className="grid grid-cols-2 bg-gray-50 border-b border-gray-200">
                                        <div className="p-2 font-bold text-gray-700 text-xs uppercase text-center border-r border-gray-200">Earnings</div>
                                        <div className="p-2 font-bold text-gray-700 text-xs uppercase text-center">Deductions</div>
                                    </div>
                                    <div className="grid grid-cols-2 text-xs min-h-[120px]">
                                        <div className="border-r border-gray-200 p-0">
                                            <div className="flex justify-between p-2 md:p-3 border-b border-gray-50">
                                                <span className="text-gray-600">Basic Salary</span>
                                                <span className="font-semibold">₹ 0.00</span>
                                            </div>
                                            <div className="flex justify-between p-2 md:p-3 italic text-gray-400">
                                                <span>Salary structure pending setup...</span>
                                            </div>
                                        </div>
                                        <div className="p-0">
                                            <div className="flex justify-between p-2 md:p-3 border-b border-gray-50">
                                                <span className="text-gray-600">Total Deductions</span>
                                                <span className="font-bold text-red-700">₹ 0.00</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center text-[10px] text-gray-400 mt-4 pt-4 border-t border-gray-100">
                                    <p>This is a computer-generated document and does not require a signature.</p>
                                    <p className="mt-1">Generated on {new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div className="p-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setShowPayslip(false)}
                                className="px-6 py-2.5 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                            >
                                Back
                            </button>
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
                                        pdf.save(`Payslip_${employee.name}_${new Date().toLocaleDateString()}.pdf`);
                                        
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
                        </div>
                    </div>
                </div>
            )}

            {/* ID Card Modal (Keep original UI logic, with dynamic data) */}
            {showIDCard && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                    <div className="relative">
                        <button onClick={() => setShowIDCard(false)} className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors">
                            <X size={24} />
                        </button>

                        <div id="id-card-container" className="w-[320px] h-[500px] bg-white rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col">
                            <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-br from-brand-800 to-brand-600 rounded-b-[50px] z-0"></div>
                            <div className="mx-auto w-16 h-3 bg-white/20 rounded-full mt-4 relative z-10 backdrop-blur-sm"></div>
                            <div className="flex justify-between items-start mb-6 px-6 pt-4 relative z-10">
                                <h2 className="text-white font-bold tracking-widest text-lg opacity-90">EnCalm <span className="text-brand-300">HRX</span></h2>
                                <div className="w-10 h-8 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-md opacity-80 shadow-inner border border-yellow-300/50"></div>
                            </div>
                            <div className="relative z-10 mx-auto mt-6">
                                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-brand-600 flex items-center justify-center text-white font-bold text-4xl">
                                    {employee.name.split(' ').map((n: any) => n[0]).join('')}
                                </div>
                            </div>
                            <div className="text-center mt-4 flex-1 flex flex-col items-center">
                                <h1 className="text-2xl font-bold text-gray-800 px-4">{employee.name}</h1>
                                <p className="text-brand-600 font-medium text-sm mt-1">{profile.title || 'Employee'}</p>
                                <div className="w-12 h-1 bg-brand-200 rounded-full my-4"></div>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-left text-sm w-full px-10">
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Emp ID</p>
                                        <p className="font-semibold text-gray-700">{employee.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Blood Group</p>
                                        <p className="font-semibold text-gray-700">{profile.bloodGroup || 'N/A'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs text-gray-400 uppercase font-bold">Department</p>
                                        <p className="font-semibold text-gray-700">{profile.department || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between items-center mt-auto">
                                <div className="w-16 h-16 bg-white p-1 rounded-lg border border-gray-200 flex items-center justify-center text-[8px] text-gray-400 uppercase">QR Code</div>
                                <div className="text-right italic text-gray-400 text-xs">Authorized Sig.</div>
                            </div>
                        </div>
                        <div className="flex justify-center mt-6">
                            <button 
                                onClick={() => {
                                    const printContent = document.getElementById('id-card-container');
                                    const WindowPrt = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
                                    if (WindowPrt && printContent) {
                                        WindowPrt.document.write('<html><head><title>Print ID Card</title>');
                                        WindowPrt.document.write('<script src="https://cdn.tailwindcss.com"></script>');
                                        WindowPrt.document.write('</head><body>');
                                        WindowPrt.document.write(printContent.innerHTML);
                                        WindowPrt.document.write('</body></html>');
                                        WindowPrt.document.close();
                                        WindowPrt.focus();
                                        setTimeout(() => {
                                            WindowPrt.print();
                                            WindowPrt.close();
                                        }, 500);
                                    }
                                }}
                                className="flex items-center gap-2 px-6 py-2 bg-white text-gray-800 font-bold rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                            >
                                <Printer size={18} /> Print
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
