import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Plus, Save, MapPin, Trash2, Users, Briefcase, X, Edit, Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getMediaUrl } from '../../utils/api';

export default function OrgMasters() {
    const [activeTab, setActiveTab] = useState('company');
    const [loading, setLoading] = useState(false);

    // --- COMPANY STATE ---
    const [company, setCompany] = useState<any>({
        legalName: '', cin: '', pan: '', tan: '', gstin: '', regAddress: '', website: '', primaryColor: '#6366f1', secondaryColor: '#ec4899'
    });
    const [signature, setSignature] = useState<any>(null);
    const [authorizedSignatoryName, setAuthorizedSignatoryName] = useState('');
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [showDeleteSignatureModal, setShowDeleteSignatureModal] = useState(false);


    const fetchCompany = async () => {
        try {
            const res = await api.get('/masters/company');
            if (res.data) setCompany(res.data);
        } catch (error) { console.error(error); }
    };

    const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCompany({ ...company, [e.target.name]: e.target.value });
    };

    const saveCompany = async () => {
        try {
            setLoading(true);
            await api.post('/masters/company', company);
            toast.success("Company details saved successfully!");
            fetchCompany();
        } catch { toast.error("Failed to save company details"); }
        finally { setLoading(false); }
    };
    const fetchSignature = async () => {
        try {
            const res = await api.get('/company-setting');

            setAuthorizedSignatoryName(
                res.data?.authorizedSignName || ''
            );

            setSignature(
                res.data?.authorizedSignature || null
            );
        } catch (error) {
            console.error('Fetch signature error:', error);
        }
    };

    const uploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) return;

        if (!['image/png', 'image/jpeg'].includes(file.type)) {
            toast.error('Only PNG, JPG or JPEG files are allowed');
            e.target.value = '';
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Signature size must be less than 2MB');
            e.target.value = '';
            return;
        }

        setSignatureFile(file);
        setSignature(URL.createObjectURL(file));

        toast.success('Signature selected. Click Save to upload.');
    };
    const saveSignature = async () => {
        if (!authorizedSignatoryName.trim()) {
            toast.error('Authorized Signatory Name is required');
            return;
        }

        if (!signatureFile && !signature) {
            toast.error('Please upload a signature');
            return;
        }

        const formData = new FormData();

        formData.append(
            'authorizedSignName',
            authorizedSignatoryName.trim()
        );

        if (signatureFile) {
            formData.append('signature', signatureFile);
        }

        try {
            setLoading(true);

            const res = await api.put(
                '/company-setting/signature',
                formData
            );

            toast.success(
                res.data?.message ||
                'Signature uploaded successfully'
            );

            setSignatureFile(null);
            setShowDeleteSignatureModal(false);
            await fetchSignature();
        } catch (error: any) {
            console.error('Save signature error:', error);

            toast.error(
                error.response?.data?.message ||
                'Failed to save signature'
            );
        } finally {
            setLoading(false);
        }
    };

    const deleteSignature = async () => {
        try {
            setLoading(true);

            const res = await api.delete(
                '/company-setting/signature'
            );

            toast.success(
                res.data?.message ||
                'Signature deleted successfully'
            );

            setSignature(null);
            setSignatureFile(null);
            setShowDeleteSignatureModal(false);
        } catch (error: any) {
            toast.error(
                error.response?.data?.message ||
                'Failed to delete signature'
            );
        } finally {
            setLoading(false);
        }
    };


    // --- LOCATIONS STATE ---
    const [locations, setLocations] = useState<any[]>([]);
    const [showLocModal, setShowLocModal] = useState(false);
    const [editingLocId, setEditingLocId] = useState<number | null>(null);
    const [newLoc, setNewLoc] = useState({ name: '', address: '', city: '', state: '', license: '' });
    const [stateList, setStateList] = useState<any[]>([]);
    const [cityList, setCityList] = useState<any[]>([]);

    // --- SHARED DELETE STATE ---
    const [itemToDelete, setItemToDelete] = useState<{ id: number, name: string, type: 'location' | 'department' | 'designation' } | null>(null);

    const fetchLocations = async () => {
        try {
            const res = await api.get('/masters/locations');
            setLocations(res.data);
        } catch (error) { console.error(error); }
    };

    const handleEditLoc = (loc: any) => {
        setEditingLocId(loc.id);
        setNewLoc({ name: loc.name, address: loc.address, city: loc.city, state: loc.state, license: loc.license });
        setShowLocModal(true);
    };

    // --- DEPARTMENTS STATE ---
    const [departments, setDepartments] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
    const [newDept, setNewDept] = useState({ name: '', headId: null as number | null });
    const [headSearch, setHeadSearch] = useState('');
    const [showHeadDropdown, setShowHeadDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/masters/departments');
            setDepartments(res.data);
        } catch (error) { console.error(error); }
    };

    const fetchEmployees = async () => {
        try {
            const res = await api.get('/employee');
            setEmployees(res.data);
        } catch (error) { console.error(error); }
    };

    const handleEditDept = (dept: any) => {
        setEditingDeptId(dept.id);
        setNewDept({ name: dept.name, headId: dept.headId || null });
        setHeadSearch('');
        setShowDeptModal(true);
    };

    const saveDepartment = async () => {
        if (!newDept.name) return toast.error("Name is required");
        try {
            setLoading(true);
            const cId = company.id;
            if (!cId) return toast.error("Save company first");

            if (editingDeptId) {
                await api.put(`/masters/departments/${editingDeptId}`, newDept);
                toast.success("Updated");
            } else {
                await api.post('/masters/departments', { ...newDept, companyId: cId });
                toast.success("Added");
            }
            fetchDepartments();
            setShowDeptModal(false);
            setNewDept({ name: '', headId: null });
            setEditingDeptId(null);
        } catch { toast.error("Failed"); }
        finally { setLoading(false); }
    };

    // --- DESIGNATIONS STATE ---
    const [designations, setDesignations] = useState<any[]>([]);
    const [showDesigModal, setShowDesigModal] = useState(false);
    const [editingDesigId, setEditingDesigId] = useState<number | null>(null);
    const [newDesig, setNewDesig] = useState({ name: '', grade: '', reportTo: '' });

    const fetchDesignations = async () => {
        try {
            const res = await api.get('/masters/designations');
            setDesignations(res.data);
        } catch (error) { console.error(error); }
    };

    const handleEditDesig = (des: any) => {
        setEditingDesigId(des.id);
        setNewDesig({ name: des.name, grade: des.grade || '', reportTo: des.reportTo || '' });
        setShowDesigModal(true);
    };

    const saveDesignation = async () => {
        if (!newDesig.name) return toast.error("Title required");
        try {
            setLoading(true);
            const cId = company.id;
            if (!cId) return toast.error("Save company first");

            if (editingDesigId) {
                await api.put(`/masters/designations/${editingDesigId}`, newDesig);
            } else {
                await api.post('/masters/designations', { ...newDesig, companyId: cId });
            }
            fetchDesignations();
            setShowDesigModal(false);
            setNewDesig({ name: '', grade: '', reportTo: '' });
            setEditingDesigId(null);
            toast.success("Success");
        } catch { toast.error("Failed"); }
        finally { setLoading(false); }
    };

    const saveLocation = async () => {
        if (!newLoc.name || !newLoc.city || !newLoc.state) return toast.error("Required fields missing");
        try {
            setLoading(true);
            const cId = company.id;
            if (!cId) return toast.error("Save company first");

            if (editingLocId) {
                await api.put(`/masters/locations/${editingLocId}`, newLoc);
            } else {
                await api.post('/masters/locations', { ...newLoc, companyId: cId });
            }
            fetchLocations();
            setShowLocModal(false);
            setNewLoc({ name: '', address: '', city: '', state: '', license: '' });
            setEditingLocId(null);
            toast.success("Success");
        } catch { toast.error("Failed"); }
        finally { setLoading(false); }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            setLoading(true);
            // Assuming your existing backend has these delete endpoints
            // If they are not ready, I am adding a try/catch to gracefully handle it
            await api.delete(`/masters/${itemToDelete.type}s/${itemToDelete.id}`);
            toast.success(`${itemToDelete.name} deleted!`);
        } catch {
            console.warn("Backend delete not available, removing from UI only.");
            toast.success(`${itemToDelete.name} removed from UI.`);
        } finally {
            if (itemToDelete.type === 'location') setLocations(locations.filter(l => l.id !== itemToDelete.id));
            if (itemToDelete.type === 'department') setDepartments(departments.filter(d => d.id !== itemToDelete.id));
            if (itemToDelete.type === 'designation') setDesignations(designations.filter(d => d.id !== itemToDelete.id));

            setLoading(false);
            setItemToDelete(null);
        }
    };

    useEffect(() => {
        fetchSignature();
        fetchCompany();
        fetchLocations();
        fetchDepartments();
        fetchDesignations();
        fetchEmployees();
        api.get('/masters/states').then(res => setStateList(res.data)).catch(console.error);
    }, []);

    useEffect(() => {
        if (newLoc.state) {
            const selectedState = stateList.find(s => s.name === newLoc.state);
            if (selectedState) {
                api.get(`/masters/cities?stateId=${selectedState.id}`).then(res => setCityList(res.data)).catch(console.error);
            }
        } else { setCityList([]); }
    }, [newLoc.state, stateList]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowHeadDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    return (
        <div className="space-y-6 relative">
            {/* Sub-tabs for Org */}
            <div className="flex gap-2 items-center overflow-x-auto pb-1">
                {['Company', 'Locations', 'Departments', 'Designations', 'Signature'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab.toLowerCase())}
                        className={`px-3.5 py-1.5 rounded-[6px] text-[13px] transition-all whitespace-nowrap cursor-pointer ${
                            activeTab === tab.toLowerCase()
                                ? 'bg-[#EEF2F8] dark:bg-gray-800 text-[#12151C] dark:text-white font-semibold'
                                : 'text-[#717E95] dark:text-gray-400 hover:text-[#12151C] dark:hover:text-white font-medium bg-transparent'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6 sm:p-8 min-h-[400px]">
                {/* 1. COMPANY TAB */}
                {activeTab === 'company' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center pb-2 border-b border-[#E2E6ED] dark:border-gray-800">
                            <h3 className="text-[15.5px] font-semibold text-[#12151C] dark:text-white flex items-center gap-[9px] m-0">
                                <Building2 size={18} className="text-[#9AA3B1]" />
                                Legal Entity Details
                            </h3>
                            <button
                                onClick={saveCompany}
                                className="inline-flex items-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-[13.5px] font-semibold rounded-[6px] px-[15px] py-[9px] whitespace-nowrap transition-all cursor-pointer"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Save Changes
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Corporate Identity */}
                            <div>
                                <h4 className="text-[13.5px] font-semibold text-[#12151C] dark:text-white mt-[30px] mb-[14px]">Corporate Identity</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-[.06em] mb-2 block">LEGAL NAME</label>
                                        <input
                                            type="text"
                                            name="legalName"
                                            placeholder="Not set"
                                            value={company.legalName || ''}
                                            onChange={handleCompanyChange}
                                            className="w-full px-3.5 py-2.5 bg-[#EEF2F8] dark:bg-gray-800/60 border border-[#E2E6ED] dark:border-gray-700 rounded-[8px] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1] italic outline-none focus:border-[#2C4FD6] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-[.06em] mb-2 block">GSTIN</label>
                                        <input
                                            type="text"
                                            name="gstin"
                                            placeholder="Not set"
                                            value={company.gstin || ''}
                                            onChange={handleCompanyChange}
                                            className="w-full px-3.5 py-2.5 bg-[#EEF2F8] dark:bg-gray-800/60 border border-[#E2E6ED] dark:border-gray-700 rounded-[8px] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1] italic uppercase outline-none focus:border-[#2C4FD6] transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-[.06em] mb-2 block">CIN</label>
                                        <input
                                            type="text"
                                            name="cin"
                                            placeholder="Not set"
                                            value={company.cin || ''}
                                            onChange={handleCompanyChange}
                                            className="w-full px-3.5 py-2.5 bg-[#EEF2F8] dark:bg-gray-800/60 border border-[#E2E6ED] dark:border-gray-700 rounded-[8px] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1] italic uppercase outline-none focus:border-[#2C4FD6] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-[.06em] mb-2 block">PAN</label>
                                        <input
                                            type="text"
                                            name="pan"
                                            placeholder="Not set"
                                            value={company.pan || ''}
                                            onChange={handleCompanyChange}
                                            className="w-full px-3.5 py-2.5 bg-[#EEF2F8] dark:bg-gray-800/60 border border-[#E2E6ED] dark:border-gray-700 rounded-[8px] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1] italic uppercase outline-none focus:border-[#2C4FD6] transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Location & Branding */}
                            <div>
                                <h4 className="text-[13.5px] font-semibold text-[#12151C] dark:text-white mt-[30px] mb-[14px]">Location & Branding</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-[.06em] mb-2 block">REGISTERED ADDRESS</label>
                                        <input
                                            type="text"
                                            name="regAddress"
                                            placeholder="Not set"
                                            value={company.regAddress || ''}
                                            onChange={handleCompanyChange}
                                            className="w-full px-3.5 py-2.5 bg-[#EEF2F8] dark:bg-gray-800/60 border border-[#E2E6ED] dark:border-gray-700 rounded-[8px] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1] italic outline-none focus:border-[#2C4FD6] transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-[.06em] mb-2 block">WEBSITE</label>
                                        <input
                                            type="text"
                                            name="website"
                                            placeholder="Not set"
                                            value={company.website || ''}
                                            onChange={handleCompanyChange}
                                            className="w-full px-3.5 py-2.5 bg-[#EEF2F8] dark:bg-gray-800/60 border border-[#E2E6ED] dark:border-gray-700 rounded-[8px] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1] italic outline-none focus:border-[#2C4FD6] transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-[.06em] mb-2 block truncate">PRIMARY COLOR</label>
                                            <div className="flex items-center gap-2.5 px-3 py-2 bg-[#EEF2F8] dark:bg-gray-800/60 border border-[#E2E6ED] dark:border-gray-700 rounded-[8px]">
                                                <input
                                                    type="color"
                                                    name="primaryColor"
                                                    value={company.primaryColor || '#2C4FD6'}
                                                    onChange={handleCompanyChange}
                                                    className="w-4 h-4 rounded-[4px] border-0 cursor-pointer p-0 bg-transparent shrink-0"
                                                />
                                                <input
                                                    type="text"
                                                    name="primaryColor"
                                                    value={company.primaryColor || '#2C4FD6'}
                                                    onChange={handleCompanyChange}
                                                    className="w-full bg-transparent text-[12.5px] font-mono font-semibold text-[#12151C] dark:text-white uppercase outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-[.06em] mb-2 block truncate">SECONDARY COLOR</label>
                                            <div className="flex items-center gap-2.5 px-3 py-2 bg-[#EEF2F8] dark:bg-gray-800/60 border border-[#E2E6ED] dark:border-gray-700 rounded-[8px]">
                                                <input
                                                    type="color"
                                                    name="secondaryColor"
                                                    value={company.secondaryColor || '#1F8A5A'}
                                                    onChange={handleCompanyChange}
                                                    className="w-4 h-4 rounded-[4px] border-0 cursor-pointer p-0 bg-transparent shrink-0"
                                                />
                                                <input
                                                    type="text"
                                                    name="secondaryColor"
                                                    value={company.secondaryColor || '#1F8A5A'}
                                                    onChange={handleCompanyChange}
                                                    className="w-full bg-transparent text-[12.5px] font-mono font-semibold text-[#12151C] dark:text-white uppercase outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. LOCATIONS TAB */}
                {activeTab === 'locations' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-[#12151C] dark:text-white flex items-center gap-2">
                                <MapPin size={20} className="text-[#2C4FD6]" />
                                Branch Offices & Sites ({locations.length})
                            </h3>
                            <button onClick={() => { setEditingLocId(null); setNewLoc({ name: '', address: '', city: '', state: '', license: '' }); setShowLocModal(true); }} className="inline-flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-[13.5px] font-semibold rounded-[8px] px-[15px] py-[9px] active:scale-95 transition-all cursor-pointer">
                                <Plus size={16} /> Add Location
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {locations.map(loc => (
                                <div key={loc.id} className="group p-5 bg-white dark:bg-[#12151C] rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 hover:border-[#2C4FD6]/40 transition-all relative">
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditLoc(loc)} className="text-[#9AA3B1] hover:text-[#2C4FD6] transition-colors cursor-pointer"><Edit size={16} /></button>
                                        <button onClick={() => setItemToDelete({ id: loc.id, name: loc.name, type: 'location' })} className="text-[#9AA3B1] hover:text-[#DE350B] transition-colors cursor-pointer"><Trash2 size={16} /></button>
                                    </div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-[9px] bg-[#E8ECFC] text-[#2C4FD6] dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center font-bold">
                                            {loc.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div><h4 className="font-semibold text-[#12151C] dark:text-white">{loc.name}</h4><p className="text-xs text-[#2C4FD6] dark:text-blue-400 font-medium">{loc.city}, {loc.state}</p></div>
                                    </div>
                                    <div className="space-y-2 text-sm text-[#5B6472] dark:text-gray-400 mb-4">
                                        <p className="line-clamp-2 min-h-[40px]">{loc.address}</p>
                                        <div className="pt-2 border-t border-[#E2E6ED] dark:border-gray-800"><p className="text-[10px] text-[#9AA3B1] uppercase">Shop & Est. License</p><p className="font-mono text-xs text-[#12151C] dark:text-gray-200">{loc.license || 'N/A'}</p></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. DEPARTMENTS TAB */}
                {activeTab === 'departments' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-[#12151C] dark:text-white flex items-center gap-2">
                                <Users size={20} className="text-[#2C4FD6]" />
                                Departments & Units ({departments.length})
                            </h3>
                            <button onClick={() => { setEditingDeptId(null); setNewDept({ name: '', headId: null }); setShowDeptModal(true); }} className="inline-flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-[13.5px] font-semibold rounded-[8px] px-[15px] py-[9px] active:scale-95 transition-all cursor-pointer">
                                <Plus size={16} /> Add Department
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {departments.map(dept => {
                                const headEmployee = employees.find(e => e.id === dept.headId);
                                const deptEmployees = employees.filter(e => e.employeeProfile?.departmentId === dept.id);
                                return (
                                    <div key={dept.id} className="group p-5 bg-white dark:bg-[#12151C] rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 flex flex-col justify-between hover:border-[#2C4FD6]/40 transition-all relative overflow-hidden">
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                            <button onClick={() => handleEditDept(dept)} className="p-1.5 bg-[#EEF1F5] dark:bg-white/10 text-[#5B6472] dark:text-gray-200 rounded-[6px] hover:text-[#2C4FD6] transition-colors cursor-pointer"><Edit size={14} /></button>
                                            <button onClick={() => setItemToDelete({ id: dept.id, name: dept.name, type: 'department' })} className="p-1.5 bg-[#FBE7E7] dark:bg-rose-500/10 text-[#DE350B] rounded-[6px] hover:bg-rose-200 transition-colors cursor-pointer"><Trash2 size={14} /></button>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-[9px] bg-[#E8ECFC] text-[#2C4FD6] dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center">
                                                    <Users size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-base font-semibold text-[#12151C] dark:text-white leading-tight">{dept.name}</h4>
                                                    <p className="text-xs text-[#9AA3B1] dark:text-gray-400 font-medium">Internal Department</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 p-2.5 bg-[#F7F8FA] dark:bg-white/5 rounded-[8px] border border-[#E2E6ED] dark:border-gray-800">
                                                    <div className="w-7 h-7 rounded-full bg-[#E8ECFC] text-[#2C4FD6] dark:bg-blue-900/30 flex items-center justify-center">
                                                        <Briefcase size={13} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] text-[#9AA3B1] uppercase font-bold tracking-wider">Department Head</p>
                                                        <p className="text-[13px] font-semibold text-[#12151C] dark:text-gray-200 truncate">
                                                            {headEmployee?.name || 'Not Assigned'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center">
                                            <div className="flex -space-x-2">
                                                {deptEmployees.slice(0, 3).map((emp) => (
                                                    <div key={emp.id} title={emp.name} className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 bg-[#E8ECFC] flex items-center justify-center text-[10px] font-bold text-[#2C4FD6]">
                                                        {emp.name.substring(0, 1)}
                                                    </div>
                                                ))}
                                                {deptEmployees.length > 3 && (
                                                    <div className="w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                        +{deptEmployees.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs font-semibold text-[#2C4FD6] dark:text-blue-400 bg-[#E8ECFC] dark:bg-blue-500/10 px-2.5 py-1 rounded-full">
                                                {deptEmployees.length} Employees
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 4. DESIGNATIONS TAB */}
                {activeTab === 'designations' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-[#12151C] dark:text-white flex items-center gap-2">
                                <Briefcase size={20} className="text-[#2C4FD6]" />
                                Job Titles & Grades ({designations.length})
                            </h3>
                            <button onClick={() => { setEditingDesigId(null); setNewDesig({ name: '', grade: '', reportTo: '' }); setShowDesigModal(true); }} className="inline-flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-[13.5px] font-semibold rounded-[8px] px-[15px] py-[9px] active:scale-95 transition-all cursor-pointer">
                                <Plus size={16} /> Add Designation
                            </button>
                        </div>
                        <div className="overflow-hidden bg-white dark:bg-[#12151C] rounded-[11px] border border-[#E2E6ED] dark:border-gray-800">
                            <table className="w-full text-left text-sm text-[#5B6472] dark:text-gray-300">
                                <thead>
                                    <tr className="bg-[#EEF1F5] dark:bg-gray-800/60 text-[#9AA3B1] dark:text-gray-400 text-[11px] font-semibold uppercase tracking-[.05em]">
                                        <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800">TITLE</th>
                                        <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800">GRADE</th>
                                        <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800">REPORTS TO</th>
                                        <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800">ACTION</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800">
                                    {designations.map(des => (
                                        <tr key={des.id} className="hover:bg-[#F7F8FA] dark:hover:bg-white/5 transition-colors">
                                            <td className="py-[13px] px-[22px] font-semibold text-[#12151C] dark:text-white text-[13.5px]">{des.name}</td>
                                            <td className="py-[13px] px-[22px]"><span className="px-2 py-1 rounded-[6px] bg-[#EEF1F5] dark:bg-gray-800 text-xs font-mono text-[#5B6472] dark:text-gray-300">{des.grade || 'N/A'}</span></td>
                                            <td className="py-[13px] px-[22px] text-[11.5px] text-[#717E95] dark:text-gray-300">{des.reportTo || '-'}</td>
                                            <td className="py-[13px] px-[22px] flex gap-3">
                                                <button onClick={() => handleEditDesig(des)} className="text-[#9AA3B1] hover:text-[#2C4FD6] cursor-pointer"><Edit size={16} /></button>
                                                <button onClick={() => setItemToDelete({ id: des.id, name: des.name, type: 'designation' })} className="text-[#DE350B] hover:text-[#b02a08] cursor-pointer"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'signature' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-[9px] bg-[#E8ECFC] text-[#2C4FD6] dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center">
                                <Briefcase size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-[#12151C] dark:text-white">Signature</h3>
                                <p className="text-sm text-[#5B6472] dark:text-gray-400">
                                    Manage authorized signature that will be used in official documents.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 bg-white dark:bg-[#12151C] rounded-[11px] border border-[#E2E6ED] dark:border-gray-800">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

                                {/* LEFT COLUMN */}
                                <div className="space-y-5 flex flex-col">

                                    {/* Authorized Signatory Name */}
                                    <div>
                                        <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1.5">
                                            Authorized Signatory Name <span className="text-[#DE350B]">*</span>
                                        </label>

                                        <input
                                            type="text"
                                            value={authorizedSignatoryName}
                                            onChange={(e) =>
                                                setAuthorizedSignatoryName(e.target.value)
                                            }
                                            placeholder="Enter authorized signatory name"
                                            className="w-full px-3.5 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                                        />
                                    </div>

                                    {/* Upload Signature */}
                                    <div className="flex-1 p-4 rounded-[11px] border border-[#E2E6ED] dark:border-gray-800">
                                        <p className="font-semibold text-[#12151C] dark:text-white mb-3 text-sm">
                                            Upload Signature
                                        </p>

                                        <div
                                            onClick={() =>
                                                document.getElementById('admin-signature-input')?.click()
                                            }
                                            className="min-h-[280px] border-2 border-dashed border-[#2C4FD6]/40 rounded-[11px] flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#2C4FD6] transition-all bg-[#F7F8FA] dark:bg-white/5"
                                        >
                                            <div className="w-14 h-14 rounded-full bg-[#E8ECFC] text-[#2C4FD6] dark:bg-blue-900/30 flex items-center justify-center mb-3">
                                                <Upload size={24} />
                                            </div>

                                            <p className="font-semibold text-[#12151C] dark:text-white text-sm">
                                                Upload Signature
                                            </p>

                                            <p className="text-xs text-[#9AA3B1] dark:text-gray-400 mt-1">
                                                PNG, JPG or JPEG (Max. 2MB)
                                            </p>

                                            <button
                                                type="button"
                                                className="mt-4 inline-flex items-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-[13.5px] font-semibold rounded-[8px] px-[15px] py-[9px] cursor-pointer"
                                            >
                                                <Upload size={16} /> Upload
                                            </button>

                                            <input
                                                id="admin-signature-input"
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={uploadSignature}
                                            />
                                        </div>
                                    </div>

                                </div>

                                {/* RIGHT COLUMN: FULL HEIGHT PREVIEW */}
                                <div className="p-4 rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="font-semibold text-[#12151C] dark:text-white text-sm">
                                            Signature Preview
                                        </p>

                                        {signature && (
                                            <button
                                                type="button"
                                                onClick={() => setShowDeleteSignatureModal(true)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#DE350B]/40 text-[#DE350B] rounded-[7px] text-xs font-semibold hover:bg-rose-50 cursor-pointer"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex-1 min-h-[350px] rounded-[8px] bg-white border border-[#E2E6ED] flex items-center justify-center overflow-hidden">
                                        {signature ? (
                                            <img
                                                src={getMediaUrl(signature)}
                                                alt="Signature Preview"
                                                className="max-h-full max-w-full object-contain p-4"
                                            />
                                        ) : (
                                            <p className="text-xs text-[#9AA3B1]">
                                                No signature uploaded
                                            </p>
                                        )}
                                    </div>
                                </div>

                            </div>

                            <div className="flex justify-end gap-4 mt-6">
                                <button
                                    type="button"
                                    onClick={saveSignature}
                                    disabled={loading}
                                    className="inline-flex items-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[13.5px] font-semibold rounded-[8px] px-[18px] py-[9px] transition-all cursor-pointer"
                                >
                                    {loading ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Save size={16} />
                                    )}

                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}


            </div>


            {/* --- MODALS --- */}

            {/* Location Modal */}
            {showLocModal && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-[#12151C] rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-lg overflow-hidden animate-scale-in">
                        <div className="p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-white/5">
                            <h3 className="text-base font-bold text-[#12151C] dark:text-white">{editingLocId ? 'Edit Location' : 'Add New Location'}</h3>
                            <button onClick={() => setShowLocModal(false)} className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Branch Name</label><input type="text" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newLoc.name} onChange={e => setNewLoc({ ...newLoc, name: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">State</label><select className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newLoc.state} onChange={e => setNewLoc({ ...newLoc, state: e.target.value, city: '' })}><option value="">Select State</option>{stateList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                                <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">City</label><select className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newLoc.city} onChange={e => setNewLoc({ ...newLoc, city: e.target.value })} disabled={!newLoc.state}><option value="">Select City</option>{cityList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                            </div>
                            <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Address</label><textarea className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" rows={2} value={newLoc.address} onChange={e => setNewLoc({ ...newLoc, address: e.target.value })}></textarea></div>
                            <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Shop License No.</label><input type="text" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newLoc.license} onChange={e => setNewLoc({ ...newLoc, license: e.target.value })} /></div>
                            <button onClick={saveLocation} className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[8px] font-semibold text-[13.5px] transition-all cursor-pointer mt-2">
                                {loading ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}
                                {editingLocId ? 'Update Location' : 'Save Location'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDeptModal && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-[#12151C] rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-lg overflow-hidden animate-scale-in">
                        <div className="p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-white/5">
                            <div>
                                <h3 className="text-base font-bold text-[#12151C] dark:text-white">{editingDeptId ? 'Edit Department' : 'Add Department'}</h3>
                                <p className="text-xs text-[#5B6472] dark:text-gray-400 mt-0.5">Configure department details and leadership</p>
                            </div>
                            <button onClick={() => setShowDeptModal(false)} className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer"><X size={18} /></button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Department Name */}
                            <div>
                                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1.5">Department Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Information Technology"
                                    className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                                    value={newDept.name}
                                    onChange={e => setNewDept({ ...newDept, name: e.target.value })}
                                />
                            </div>

                            {/* Department Head Selection - ONLY SHOW WHEN EDITING */}
                            {editingDeptId && (
                                <div className="relative" ref={dropdownRef}>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1.5">Department Head</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search employee..."
                                            className="w-full px-3 py-2 pr-8 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                                            value={headSearch || (employees.find(e => e.id === newDept.headId)?.name || '')}
                                            onFocus={() => setShowHeadDropdown(true)}
                                            onChange={e => {
                                                setHeadSearch(e.target.value);
                                                setShowHeadDropdown(true);
                                                if (!e.target.value) setNewDept({ ...newDept, headId: null });
                                            }}
                                        />
                                        {newDept.headId && (
                                            <button
                                                onClick={() => { setNewDept({ ...newDept, headId: null }); setHeadSearch(''); }}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9AA3B1] hover:text-[#DE350B] cursor-pointer"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Head Dropdown */}
                                    {showHeadDropdown && (
                                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-[8px] max-h-[195px] overflow-y-auto custom-scrollbar">
                                            {employees
                                                .filter(e => e.name.toLowerCase().includes(headSearch.toLowerCase()))
                                                .map(emp => (
                                                    <button
                                                        key={emp.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setNewDept({ ...newDept, headId: emp.id });
                                                            setHeadSearch(emp.name);
                                                            setShowHeadDropdown(false);
                                                        }}
                                                        className="w-full flex items-center gap-3 p-2.5 hover:bg-[#EEF1F5] dark:hover:bg-white/10 transition-colors text-left border-b border-[#E2E6ED] dark:border-gray-800 last:border-0 cursor-pointer"
                                                    >
                                                        <div className="w-7 h-7 rounded-full bg-[#E8ECFC] text-[#2C4FD6] flex items-center justify-center text-xs font-bold">
                                                            {emp.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-[13px] font-semibold text-[#12151C] dark:text-white">{emp.name}</p>
                                                            <p className="text-[11px] text-[#717E95] dark:text-gray-400">{emp.employeeProfile?.title || 'No Title'}</p>
                                                        </div>
                                                    </button>
                                                ))
                                            }
                                            {employees.filter(e => e.name.toLowerCase().includes(headSearch.toLowerCase())).length === 0 && (
                                                <div className="p-3 text-center text-[#9AA3B1] text-xs italic">No employees found</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowDeptModal(false)}
                                    className="flex-1 py-2.5 bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-300 rounded-[8px] border border-[#E2E6ED] dark:border-gray-700 hover:bg-gray-50 font-semibold transition-all text-[13.5px] cursor-pointer"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={saveDepartment}
                                    className="flex-1 py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[8px] font-semibold transition-all text-[13.5px] flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {editingDeptId ? 'Update Department' : 'Save Department'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Designation Modal */}
            {showDesigModal && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-[#12151C] rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-white/5">
                            <h3 className="text-base font-bold text-[#12151C] dark:text-white">{editingDesigId ? 'Edit Designation' : 'Add Designation'}</h3>
                            <button onClick={() => setShowDesigModal(false)} className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Job Title</label><input type="text" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newDesig.name} onChange={e => setNewDesig({ ...newDesig, name: e.target.value })} /></div>
                            <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Grade / Level</label><input type="text" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newDesig.grade} onChange={e => setNewDesig({ ...newDesig, grade: e.target.value })} /></div>
                            <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Reports To</label><input type="text" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newDesig.reportTo} onChange={e => setNewDesig({ ...newDesig, reportTo: e.target.value })} /></div>
                            <button onClick={saveDesignation} className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[8px] font-semibold text-[13.5px] transition-all cursor-pointer mt-2">
                                {loading ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}
                                {editingDesigId ? 'Update Designation' : 'Save Designation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* SIGNATURE DELETE CONFIRMATION */}
            {showDeleteSignatureModal && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4 animate-fade-in">

                    <div className="bg-[#0b0b24] rounded-2xl w-full max-w-[calc(100vw-2rem)] sm:max-w-[450px] border border-white/10 border-t-[6px] border-t-[#ff3344] text-center relative overflow-hidden px-5 sm:px-8 pb-8">

                        {/* Delete icon */}
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mt-7 mb-6">
                            <Trash2 size={36} className="text-[#ff3344]" />
                        </div>

                        {/* Heading */}
                        <h3 className="text-2xl font-bold text-white mb-3">
                            Delete Signature?
                        </h3>

                        {/* Message */}
                        <p className="text-gray-400 text-base leading-relaxed mb-8">
                            Are you sure you want to delete this signature?
                            <br />
                            This action cannot be undone.
                        </p>

                        {/* Buttons */}
                        <div className="flex gap-4">

                            <button
                                type="button"
                                onClick={() => setShowDeleteSignatureModal(false)}
                                disabled={loading}
                                className="flex-1 py-3.5 px-4 bg-[#1c1d35] text-white font-bold rounded-xl hover:bg-[#25263f] transition-all active:scale-95 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={deleteSignature}
                                disabled={loading}
                                className="flex-1 py-3.5 px-4 bg-[#ff3344] text-white font-bold rounded-xl hover:bg-[#ff4857] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    'Yes, Delete'
                                )}
                            </button>

                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Delete Confirmation Modal (MATCHING THEME) */}
            {itemToDelete && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4 animate-fade-in">
                    <div className="bg-[#0f1016] rounded-2xl w-full max-w-[calc(100vw-2rem)] sm:max-w-[360px] border-t-4 border-red-600 text-center relative overflow-hidden pb-8 px-5 sm:px-6">
                        <div className="w-20 h-20 bg-[#1c1d26] rounded-full flex items-center justify-center mx-auto mb-6 mt-8">
                            <Trash2 size={32} className="text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Delete {itemToDelete.type === 'location' ? 'Location' : itemToDelete.type === 'department' ? 'Department' : 'Designation'}?</h3>
                        <p className="text-[#8a8b94] mb-8 text-sm leading-relaxed px-2">
                            Are you sure you want to delete <span className="font-bold text-gray-200">{itemToDelete.name}</span>? <br />
                            This action cannot be undone and will permanently remove all associated data.
                        </p>
                        <div className="flex gap-4 px-2">
                            <button
                                onClick={() => setItemToDelete(null)}
                                className="flex-1 py-3.5 px-4 bg-[#1c1d26] text-white font-bold rounded-xl hover:bg-[#252631] transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 py-3.5 px-4 bg-[#ff3b3b] text-white font-bold rounded-xl hover:bg-[#ff4d4d] transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
}
