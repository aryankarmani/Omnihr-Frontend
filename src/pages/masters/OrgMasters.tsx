import { useState, useEffect } from 'react';
import { Building2, Plus, Save, MapPin, Trash2, Users, Briefcase, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function OrgMasters() {
    const [activeTab, setActiveTab] = useState('company');

    // --- COMPANY STATE ---
    const [company, setCompany] = useState({
        legalName: 'EnCalm HRX Solutions Pvt Ltd',
        cin: 'U72900DL2023PTC123456',
        pan: 'ABCDE1234F',
        tan: 'DELA12345B',
        gstin: '07ABCDE1234F1Z5',
        regAddress: 'Cyber City, Gurgaon, Haryana',
        website: 'encalmhrx.com',
        primaryColor: '#6366f1',
        secondaryColor: '#ec4899'
    });

    const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCompany({ ...company, [e.target.name]: e.target.value });
    };

    const saveCompany = async () => {
        try {
            await api.post('/masters/company', company);
            toast.success("Company details saved successfully!");
        } catch (error) {
            console.error("Failed to save company", error);
            toast.error("Failed to save company details");
        }
    };

    // --- LOCATIONS STATE (with Geo) ---
    const [locations, setLocations] = useState<any[]>([]);
    const [showLocModal, setShowLocModal] = useState(false);
    const [newLoc, setNewLoc] = useState({ name: '', address: '', city: '', state: '', license: '' });

    // Geo Masters State
    const [stateList, setStateList] = useState<any[]>([]);
    const [cityList, setCityList] = useState<any[]>([]);

    useEffect(() => {
        // Fetch locations and states on mount
        const init = async () => {
            try {
                const [locsRes, statesRes] = await Promise.all([
                    api.get('/masters/locations'),
                    api.get('/masters/states')
                ]);
                setLocations(locsRes.data);
                setStateList(statesRes.data);
            } catch (error) {
                console.error("Init Error", error);
            }
        };
        init();
    }, []);

    // Fetch cities when state changes
    useEffect(() => {
        if (newLoc.state) {
            const fetchCities = async () => {
                const selectedState = stateList.find(s => s.name === newLoc.state);
                if (selectedState) {
                    try {
                        const res = await api.get(`/masters/cities?stateId=${selectedState.id}`);
                        setCityList(res.data);
                    } catch (error) {
                        console.error("City fetch error", error);
                    }
                }
            };
            fetchCities();
        } else {
            setCityList([]);
        }
    }, [newLoc.state, stateList]);


    const saveLocation = async () => {
        if (!newLoc.name || !newLoc.city || !newLoc.state) return toast.error("Name, State and City are required");

        try {
            // Need company ID to save location. Assuming single company for now or fetching from first tab.
            // For a robust app, we'd select the company. Here we'll rely on backend or default logic?
            // Actually API requires companyId. We should cheat and get it from 'getCompany' or just pass if we have it.
            // For now, let's fetch company first to be safe, or assume backend handles "first company if none provided" ?? No.
            // Let's assume we have companyData loaded or we do a quick fetch.
            // Better: Mock it or just reload list.

            // To make this work properly without company context, let's fetch company ID first.
            const companyRes = await api.get('/masters/company');
            const companyId = companyRes.data?.id;

            if (!companyId) return toast.error("Company not found. Save company first.");

            const res = await api.post('/masters/locations', { ...newLoc, companyId });
            setLocations([...locations, res.data]);
            setShowLocModal(false);
            setNewLoc({ name: '', address: '', city: '', state: '', license: '' });
            toast.success("Location added successfully!");
        } catch (error) {
            toast.error("Failed to add location");
        }
    };

    // --- DEPARTMENTS STATE ---
    const [departments, setDepartments] = useState<any[]>([]);
    const [showDeptModal, setShowDeptModal] = useState(false);
    const [newDept, setNewDept] = useState({ name: '', head: '' });

    useEffect(() => {
        api.get('/masters/departments').then(res => setDepartments(res.data)).catch(console.error);
    }, []);

    const saveDepartment = async () => {
        if (!newDept.name) return toast.error("Department Name is required");

        // Similar company ID logic
        const companyRes = await api.get('/masters/company');
        const companyId = companyRes.data?.id;
        if (!companyId) return toast.error("Company not found.");

        const res = await api.post('/masters/departments', { ...newDept, companyId: companyId });
        setDepartments([...departments, res.data]);
        setShowDeptModal(false);
        setNewDept({ name: '', head: '' });
        toast.success("Department added successfully!");
    };

    // --- DESIGNATIONS STATE ---
    const [designations, setDesignations] = useState<any[]>([]);
    const [showDesigModal, setShowDesigModal] = useState(false);
    const [newDesig, setNewDesig] = useState({ name: '', grade: '', reportTo: '' }); // 'name' matches schema/API

    useEffect(() => {
        api.get('/masters/designations').then(res => setDesignations(res.data)).catch(console.error);
    }, []);

    const saveDesignation = async () => {
        if (!newDesig.name) return toast.error("Job Title is required");
        // Company ID required? Schema says "companyId" for Designation too... Yes.
        const companyRes = await api.get('/masters/company');
        const companyId = companyRes.data?.id;
        if (!companyId) return toast.error("Company not found.");

        const res = await api.post('/masters/designations', { ...newDesig, companyId: companyId });
        setDesignations([...designations, res.data]);
        setShowDesigModal(false);
        setNewDesig({ name: '', grade: '', reportTo: '' });
        toast.success("Designation added successfully!");
    };


    return (
        <div className="space-y-6 relative">
            {/* Sub-tabs for Org */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto">
                {['Company', 'Locations', 'Departments', 'Designations'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab.toLowerCase())}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.toLowerCase()
                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 ring-1 ring-brand-200 dark:ring-brand-800'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="min-h-[400px]">
                {/* 1. COMPANY TAB */}
                {activeTab === 'company' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                                <Building2 size={20} className="text-brand-500" />
                                Legal Entity Details
                            </h3>
                            <button
                                onClick={saveCompany}
                                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors">
                                <Save size={16} />
                                Save Changes
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Basic Info */}
                            <div className="space-y-4 p-5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">Corporate Identity</h4>
                                <div><label className="block text-xs font-medium text-gray-500 mb-1">Legal Name</label><input type="text" name="legalName" value={company.legalName} onChange={handleCompanyChange} className="w-full p-2.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none transition-all" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-medium text-gray-500 mb-1">CIN</label><input type="text" name="cin" value={company.cin} onChange={handleCompanyChange} className="w-full p-2.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg text-sm uppercase" /></div>
                                    <div><label className="block text-xs font-medium text-gray-500 mb-1">GSTIN</label><input type="text" name="gstin" value={company.gstin} onChange={handleCompanyChange} className="w-full p-2.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg text-sm uppercase" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-medium text-gray-500 mb-1">PAN</label><input type="text" name="pan" value={company.pan} onChange={handleCompanyChange} className="w-full p-2.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg text-sm uppercase" /></div>
                                    <div><label className="block text-xs font-medium text-gray-500 mb-1">TAN</label><input type="text" name="tan" value={company.tan} onChange={handleCompanyChange} className="w-full p-2.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg text-sm uppercase" /></div>
                                </div>
                            </div>

                            {/* Contact & Branding */}
                            <div className="space-y-4 p-5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">Location & Branding</h4>
                                <div><label className="block text-xs font-medium text-gray-500 mb-1">Registered Address</label><input type="text" name="regAddress" value={company.regAddress} onChange={handleCompanyChange} className="w-full p-2.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg text-sm" /></div>
                                <div><label className="block text-xs font-medium text-gray-500 mb-1">Website</label><input type="text" name="website" value={company.website} onChange={handleCompanyChange} className="w-full p-2.5 bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg text-sm" /></div>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div><label className="block text-xs font-medium text-gray-500 mb-1">Primary Color</label><div className="flex gap-2"><input type="color" name="primaryColor" value={company.primaryColor} onChange={handleCompanyChange} className="h-9 w-9 border-0 rounded cursor-pointer" /><input type="text" name="primaryColor" value={company.primaryColor} onChange={handleCompanyChange} className="w-full p-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg text-xs uppercase" /></div></div>
                                    <div><label className="block text-xs font-medium text-gray-500 mb-1">Secondary Color</label><div className="flex gap-2"><input type="color" name="secondaryColor" value={company.secondaryColor} onChange={handleCompanyChange} className="h-9 w-9 border-0 rounded cursor-pointer" /><input type="text" name="secondaryColor" value={company.secondaryColor} onChange={handleCompanyChange} className="w-full p-2 bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-700 rounded-lg text-xs uppercase" /></div></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. LOCATIONS TAB */}
                {activeTab === 'locations' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                                <MapPin size={20} className="text-brand-500" />
                                Branch Offices & Sites ({locations.length})
                            </h3>
                            <button onClick={() => setShowLocModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors">
                                <Plus size={16} /> Add Location
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {locations.map(loc => (
                                <div key={loc.id} className="group p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all relative">
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold">
                                            {loc.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div><h4 className="font-semibold text-gray-900 dark:text-white">{loc.name}</h4><p className="text-xs text-brand-500 font-medium">{loc.city}, {loc.state}</p></div>
                                    </div>
                                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        <p className="line-clamp-2 min-h-[40px]">{loc.address}</p>
                                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700"><p className="text-[10px] text-gray-400 uppercase">Shop & Est. License</p><p className="font-mono text-xs">{loc.license || 'N/A'}</p></div>
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
                            <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                                <Users size={20} className="text-brand-500" />
                                Departments & Units ({departments.length})
                            </h3>
                            <button onClick={() => setShowDeptModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors">
                                <Plus size={16} /> Add Department
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {departments.map(dept => (
                                <div key={dept.id} className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{dept.name}</h4>
                                        <p className="text-sm text-gray-500">Head: {dept.head}</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                        <span className="text-xs font-medium bg-brand-50 text-brand-700 px-2 py-1 rounded-full">{dept.designations?.length || 0} Designations</span>
                                        <button className="text-gray-400 hover:text-brand-500 text-sm">Edit</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. DESIGNATIONS TAB */}
                {activeTab === 'designations' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                                <Briefcase size={20} className="text-brand-500" />
                                Job Titles & Grades ({designations.length})
                            </h3>
                            <button onClick={() => setShowDesigModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors">
                                <Plus size={16} /> Add Designation
                            </button>
                        </div>
                        <div className="overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-medium text-gray-500 dark:text-gray-400">
                                    <tr>
                                        <th className="px-6 py-3">Title</th>
                                        <th className="px-6 py-3">Grade</th>
                                        <th className="px-6 py-3">Reports To</th>
                                        <th className="px-6 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {designations.map(des => (
                                        <tr key={des.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{des.name}</td>
                                            <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono">{des.grade || 'N/A'}</span></td>
                                            <td className="px-6 py-4">{des.reportTo || '-'}</td>
                                            <td className="px-6 py-4">
                                                <button className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            {/* --- MODALS --- */}

            {/* Location Modal */}
            {showLocModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold dark:text-white">Add New Location</h3>
                            <button onClick={() => setShowLocModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Branch Name</label><input type="text" className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="e.g. Pune Hub" value={newLoc.name} onChange={e => setNewLoc({ ...newLoc, name: e.target.value })} /></div>

                            {/* CASCADING DROPDOWNS */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">State</label>
                                    <select
                                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        value={newLoc.state}
                                        onChange={e => setNewLoc({ ...newLoc, state: e.target.value, city: '' })}
                                    >
                                        <option value="">Select State</option>
                                        {stateList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">City</label>
                                    <select
                                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                                        value={newLoc.city}
                                        onChange={e => setNewLoc({ ...newLoc, city: e.target.value })}
                                        disabled={!newLoc.state}
                                    >
                                        <option value="">Select City</option>
                                        {cityList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Address</label><textarea className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" rows={2} value={newLoc.address} onChange={e => setNewLoc({ ...newLoc, address: e.target.value })}></textarea></div>
                            <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Shop License No.</label><input type="text" className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" value={newLoc.license} onChange={e => setNewLoc({ ...newLoc, license: e.target.value })} /></div>

                            <button onClick={saveLocation} className="w-full py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium mt-2">Save Location</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Department Modal */}
            {showDeptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold dark:text-white">Add Department</h3>
                            <button onClick={() => setShowDeptModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Department Name</label><input type="text" className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="e.g. Marketing" value={newDept.name} onChange={e => setNewDept({ ...newDept, name: e.target.value })} /></div>
                            <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Department Head</label><input type="text" className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="e.g. Raman Thakur" value={newDept.head} onChange={e => setNewDept({ ...newDept, head: e.target.value })} /></div>
                            <button onClick={saveDepartment} className="w-full py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium mt-2">Save Department</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Designation Modal */}
            {showDesigModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold dark:text-white">Add Designation</h3>
                            <button onClick={() => setShowDesigModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Job Title</label><input type="text" className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="e.g. Senior Analyst" value={newDesig.name} onChange={e => setNewDesig({ ...newDesig, name: e.target.value })} /></div>
                            <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Grade / Level</label><input type="text" className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="e.g. L3" value={newDesig.grade} onChange={e => setNewDesig({ ...newDesig, grade: e.target.value })} /></div>
                            <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Reports To</label><input type="text" className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="e.g. Manager" value={newDesig.reportTo} onChange={e => setNewDesig({ ...newDesig, reportTo: e.target.value })} /></div>
                            <button onClick={saveDesignation} className="w-full py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium mt-2">Save Designation</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
