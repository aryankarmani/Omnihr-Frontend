import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BadgeIndianRupee, Scale, School, Save, Plus, Trash2, X, Loader2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
const INDIA_STATES = [
    { id: 1, name: 'Andhra Pradesh' },
    { id: 2, name: 'Arunachal Pradesh' },
    { id: 3, name: 'Assam' },
    { id: 4, name: 'Bihar' },
    { id: 5, name: 'Chhattisgarh' },
    { id: 6, name: 'Goa' },
    { id: 7, name: 'Gujarat' },
    { id: 8, name: 'Haryana' },
    { id: 9, name: 'Himachal Pradesh' },
    { id: 10, name: 'Jharkhand' },
    { id: 11, name: 'Karnataka' },
    { id: 12, name: 'Kerala' },
    { id: 13, name: 'Madhya Pradesh' },
    { id: 14, name: 'Maharashtra' },
    { id: 15, name: 'Manipur' },
    { id: 16, name: 'Meghalaya' },
    { id: 17, name: 'Mizoram' },
    { id: 18, name: 'Nagaland' },
    { id: 19, name: 'Odisha' },
    { id: 20, name: 'Punjab' },
    { id: 21, name: 'Rajasthan' },
    { id: 22, name: 'Sikkim' },
    { id: 23, name: 'Tamil Nadu' },
    { id: 24, name: 'Telangana' },
    { id: 25, name: 'Tripura' },
    { id: 26, name: 'Uttar Pradesh' },
    { id: 27, name: 'Uttarakhand' },
    { id: 28, name: 'West Bengal' },
];

export default function StatutoryMasters() {
    const [activeTab, setActiveTab] = useState('components');
    const [components, setComponents] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>({});
    const [ptSlabs, setPtSlabs] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Shared Delete State
    const [itemToDelete, setItemToDelete] = useState<{ id: any, name: string, type: 'salary-component' | 'professional-tax-slab' } | null>(null);

    // Component Form State
    const [showCompModal, setShowCompModal] = useState(false);
    const [newComp, setNewComp] = useState({
        name: '', type: 'EARNING', taxability: 'TAXABLE', isWageCodeComponent: false, isPartOfWages: false,
        isFBP: false, calculationType: 'FLAT', value: 0, prorationMethod: 'CALENDAR_DAYS'
    });
    const [editingComponentId, setEditingComponentId] = useState<any>(null);

    useEffect(() => {
        if (activeTab === 'components') fetchComponents();
        if (activeTab === 'compliance') fetchSettings();
        if (activeTab === 'pt') { fetchPtSlabs(); fetchStates(); }
    }, [activeTab]);

    const fetchComponents = () => api.get('/masters/salary-components').then(r => setComponents(r.data));
    const fetchSettings = () => api.get('/masters/statutory-settings').then(r => setSettings(r.data || {}));
    const fetchPtSlabs = () => api.get('/masters/professional-tax-slabs').then(r => setPtSlabs(r.data));
    const fetchStates = async () => {
        try {
            const res = await api.get('/masters/states');

            if (Array.isArray(res.data) && res.data.length > 0) {
                setStates(res.data);
            } else {
                setStates(INDIA_STATES);
            }
        } catch (error) {
            console.error('Error fetching states:', error);
            setStates(INDIA_STATES);
        }
    };
    const saveComponent = async () => {
        try {
            setLoading(true);
            if (editingComponentId) {
                await api.put(`/masters/salary-components/${editingComponentId}`, newComp);
                toast.success("Component updated!");
            } else {
                await api.post('/masters/salary-components', newComp);
                toast.success("Component saved!");
            }
            fetchComponents();
            setShowCompModal(false);
            setNewComp({
                name: '', type: 'EARNING', taxability: 'TAXABLE', isWageCodeComponent: false, isPartOfWages: false,
                isFBP: false, calculationType: 'FLAT', value: 0, prorationMethod: 'CALENDAR_DAYS'
            });
            setEditingComponentId(null);
        } catch (e) { toast.error("Failed to save component"); }
        finally { setLoading(false); }
    };

    const saveSettings = async () => {
        try {
            setLoading(true);
            await api.post('/masters/statutory-settings', settings);
            toast.success("Settings updated!");
        } catch (e) { toast.error("Failed to update settings"); }
        finally { setLoading(false); }
    };

    // PT Form State
    const [showPtModal, setShowPtModal] = useState(false);
    const [newPt, setNewPt] = useState({ stateId: '', minSalary: 0, maxSalary: 0, taxAmount: 0 });

    const savePtSlab = async () => {
        try {
            setLoading(true);
            await api.post('/masters/professional-tax-slabs', {
                ...newPt, stateId: Number(newPt.stateId)
            });
            fetchPtSlabs();
            setShowPtModal(false);
            toast.success("PT Slab added!");
            setNewPt({ stateId: '', minSalary: 0, maxSalary: 0, taxAmount: 0 });
        } catch (e) { toast.error("Failed to add PT Slab"); }
        finally { setLoading(false); }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            setLoading(true);
            await api.delete(`/masters/${itemToDelete.type}s/${itemToDelete.id}`);
            toast.success(`${itemToDelete.name} deleted!`);
            if (itemToDelete.type === 'salary-component') {
                setComponents(prev => prev.filter(c => String(c.id) !== String(itemToDelete.id)));
            }
            if (itemToDelete.type === 'professional-tax-slab') {
                setPtSlabs(prev => prev.filter(s => String(s.id) !== String(itemToDelete.id)));
            }
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error(error?.response?.data?.error || `Failed to delete ${itemToDelete.name}`);
        } finally {
            setItemToDelete(null);
            setLoading(false);
        }
    };


    return (
        <div className="space-y-6 relative">
            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto">
                {[
                    { id: 'components', label: 'Salary Components', icon: BadgeIndianRupee },
                    { id: 'compliance', label: 'Compliance Settings', icon: Scale },
                    { id: 'pt', label: 'Professional Tax', icon: School },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3.5 py-1.5 rounded-[8px] text-[13px] transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${activeTab === tab.id
                                ? 'bg-[#F0F4FA] dark:bg-gray-800 text-[#12151C] dark:text-white font-semibold'
                                : 'text-[#5B6472] dark:text-gray-400 hover:text-[#12151C] dark:hover:text-white font-medium bg-transparent'
                            }`}
                    >
                        <tab.icon size={15} className={activeTab === tab.id ? 'text-[#2C4FD6]' : 'text-[#9AA3B1]'} /> {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-[#12151C] rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 p-6 sm:p-8 min-h-[400px]">

                {/* 1. SALARY COMPONENTS */}
                {activeTab === 'components' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[15.5px] font-semibold text-[#12151C] dark:text-white">Earnings & Deductions</h3>
                            <button
                                onClick={() => {
                                    setEditingComponentId(null);
                                    setNewComp({
                                        name: '', type: 'EARNING', taxability: 'TAXABLE', isWageCodeComponent: false, isPartOfWages: false,
                                        isFBP: false, calculationType: 'FLAT', value: 0, prorationMethod: 'CALENDAR_DAYS'
                                    });
                                    setShowCompModal(true);
                                }}
                                className="inline-flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-[13.5px] font-semibold rounded-[8px] px-[15px] py-[9px] transition-all cursor-pointer"
                            >
                                <Plus size={16} /> Add Component
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {components.map(comp => (
                                <div key={comp.id} className="group p-4 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-[11px] transition-all relative hover:border-[#2C4FD6]/40">
                                    <div className="flex justify-between items-start mb-2 gap-2">
                                        <h4 className="font-semibold text-[#12151C] dark:text-white flex-1 text-[13.5px]">{comp.name}</h4>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${comp.type === 'EARNING' ? 'bg-[#E4F5EC] text-[#1F8A5A] dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-[#FBE7E7] text-[#DE350B] dark:bg-rose-900/30 dark:text-rose-400'}`}>{comp.type}</span>
                                            <button
                                                type="button"
                                                title="Edit component"
                                                onClick={() => {
                                                    setEditingComponentId(comp.id);
                                                    setNewComp({
                                                        name: comp.name || '',
                                                        type: comp.type || 'EARNING',
                                                        taxability: comp.taxability || 'TAXABLE',
                                                        isWageCodeComponent: Boolean(comp.isWageCodeComponent),
                                                        isPartOfWages: Boolean(comp.isPartOfWages),
                                                        isFBP: Boolean(comp.isFBP),
                                                        calculationType: comp.calculationType || 'FLAT',
                                                        value: comp.value !== undefined && comp.value !== null ? comp.value : 0,
                                                        prorationMethod: comp.prorationMethod || 'CALENDAR_DAYS'
                                                    });
                                                    setShowCompModal(true);
                                                }}
                                                className="p-1 text-[#5B6472] dark:text-gray-400 hover:text-[#2C4FD6] dark:hover:text-blue-400 hover:bg-[#EEF2FD] dark:hover:bg-blue-950/40 rounded transition-colors cursor-pointer"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                title="Delete component"
                                                onClick={() => setItemToDelete({ id: comp.id, name: comp.name, type: 'salary-component' })}
                                                className="p-1 text-[#5B6472] dark:text-gray-400 hover:text-[#DE350B] dark:hover:text-rose-400 hover:bg-[#FBE7E7] dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-xs text-[#5B6472] dark:text-gray-400">
                                        <div className="flex justify-between"><span>Taxability:</span> <span className="font-medium text-[#12151C] dark:text-gray-300">{comp.taxability === 'FULLY_EXEMPT' ? 'Exempt' : comp.taxability === 'PARTIAL' ? 'Partial' : 'Taxable'}</span></div>
                                        {comp.isWageCodeComponent && <div className="text-[#2C4FD6] dark:text-blue-400 font-bold">★ Basic Pay Component</div>}
                                        <div className="flex justify-between"><span>Part of PF Wages:</span> <span className="text-[#12151C] dark:text-gray-300">{comp.isPartOfWages ? 'Yes' : 'No'}</span></div>
                                        <div className="flex justify-between"><span>Calculation:</span> <span className="text-[#12151C] dark:text-gray-300">{comp.calculationType === 'FLAT' ? `₹${comp.value}` : `${comp.value}% of Basic`}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. COMPLIANCE SETTINGS */}
                {activeTab === 'compliance' && (
                    <div className="space-y-6 animate-fade-in max-w-3xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[15.5px] font-semibold text-[#12151C] dark:text-white">Statutory Configuration</h3>
                            <button onClick={saveSettings} disabled={loading} className="inline-flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-[13.5px] font-semibold rounded-[8px] px-[15px] py-[9px] transition-all cursor-pointer">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Save Settings
                            </button>
                        </div>

                        {/* EPF */}
                        <div className="p-6 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-[11px] space-y-4 hover:border-[#2C4FD6]/30 transition-all">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-[#12151C] dark:text-white flex items-center gap-2 text-sm"><div className="w-2 h-2 bg-[#2C4FD6] rounded-full"></div> EPF Settings</h4>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={settings.epfEnabled || false} onChange={e => setSettings({ ...settings, epfEnabled: e.target.checked })} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#2C4FD6]"></div>
                                </label>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">EPF Number</label><input type="text" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] text-[13.5px] bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={settings.epfNumber || ''} onChange={e => setSettings({ ...settings, epfNumber: e.target.value })} /></div>
                                <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Wage Ceiling (₹15,000)</label>
                                    <select className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] text-[13.5px] bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={settings.epfWageCeiling ? 'yes' : 'no'} onChange={e => setSettings({ ...settings, epfWageCeiling: e.target.value === 'yes' })}>
                                        <option value="yes">Cap at ₹15,000</option>
                                        <option value="no">No Ceiling (Actual Basic)</option>
                                    </select>
                                </div>
                                <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Employee Rate (%)</label><input type="number" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] text-[13.5px] bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={settings.epfEmployeeRate || 12} onChange={e => setSettings({ ...settings, epfEmployeeRate: parseFloat(e.target.value) })} /></div>
                                <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Employer EPF (%)</label><input type="number" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] text-[13.5px] bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={settings.epfEmployerRate || 3.67} onChange={e => setSettings({ ...settings, epfEmployerRate: parseFloat(e.target.value) })} /></div>
                            </div>
                        </div>

                        {/* ESIC */}
                        <div className="p-6 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-[11px] space-y-4 hover:border-[#2C4FD6]/30 transition-all">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-[#12151C] dark:text-white flex items-center gap-2 text-sm"><div className="w-2 h-2 bg-pink-500 rounded-full"></div> ESIC Settings</h4>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={settings.esicEnabled || false} onChange={e => setSettings({ ...settings, esicEnabled: e.target.checked })} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#2C4FD6]"></div>
                                </label>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">ESIC Number</label><input type="text" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] text-[13.5px] bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={settings.esicNumber || ''} onChange={e => setSettings({ ...settings, esicNumber: e.target.value })} /></div>
                                <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Wage Limit</label><input type="number" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] text-[13.5px] bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={settings.esicWageLimit || 21000} onChange={e => setSettings({ ...settings, esicWageLimit: parseFloat(e.target.value) })} /></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. PT SLABS */}
                {activeTab === 'pt' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[15.5px] font-semibold text-[#12151C] dark:text-white">Professional Tax Slabs</h3>
                            <button onClick={() => setShowPtModal(true)} className="inline-flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-[13.5px] font-semibold rounded-[8px] px-[15px] py-[9px] transition-all cursor-pointer">
                                <Plus size={16} /> Add Slab
                            </button>
                        </div>
                        <div className="overflow-hidden bg-white dark:bg-[#12151C] rounded-[11px] border border-[#E2E6ED] dark:border-gray-800">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#EEF1F5] dark:bg-gray-800/60 border-b border-[#E2E6ED] dark:border-gray-800">
                                    <tr>
                                        <th className="py-[9px] px-[22px] text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[.05em]">State</th>
                                        <th className="py-[9px] px-[22px] text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[.05em]">Salary Range</th>
                                        <th className="py-[9px] px-[22px] text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[.05em]">Tax Amount</th>
                                        <th className="py-[9px] px-[22px] text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[.05em] text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60">
                                    {ptSlabs.map(slab => {
                                        const stateName = states.find(s => s.id === slab.stateId)?.name || 'Unknown State';
                                        return (
                                            <tr key={slab.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                <td className="py-[13px] px-[22px] text-[13.5px] font-semibold text-[#12151C] dark:text-white">{stateName}</td>
                                                <td className="py-[13px] px-[22px] text-[13.5px] font-normal text-[#717E95] dark:text-gray-400">{slab.minSalary} - {slab.maxSalary || 'Above'}</td>
                                                <td className="py-[13px] px-[22px] text-[13.5px] font-semibold text-[#12151C] dark:text-white">₹{slab.taxAmount}</td>
                                                <td className="py-[13px] px-[22px] text-center">
                                                    <button
                                                        onClick={() => setItemToDelete({ id: slab.id, name: `${stateName} Slab`, type: 'professional-tax-slab' })}
                                                        className="text-[#9AA3B1] hover:text-[#DE350B] transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* MODALS */}
            {showCompModal && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-[#12151C] rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-white/5">
                            <h3 className="text-base font-bold text-[#12151C] dark:text-white">
                                {editingComponentId ? 'Edit Salary Component' : 'Add Salary Component'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowCompModal(false);
                                    setEditingComponentId(null);
                                }}
                                className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Component Name</label>
                                <input type="text" placeholder="e.g. Basic Pay" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newComp.name} onChange={e => setNewComp({ ...newComp, name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Type</label>
                                    <select className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newComp.type} onChange={e => setNewComp({ ...newComp, type: e.target.value })}>
                                        <option value="EARNING">Earning</option>
                                        <option value="DEDUCTION">Deduction</option>
                                        <option value="REIMBURSEMENT">Reimbursement</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Taxability</label>
                                    <select className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newComp.taxability} onChange={e => setNewComp({ ...newComp, taxability: e.target.value })}>
                                        <option value="TAXABLE">Taxable</option>
                                        <option value="PARTIAL">Partially Exempt</option>
                                        <option value="FULLY_EXEMPT">Fully Exempt</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Calculation</label>
                                    <select className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newComp.calculationType} onChange={e => setNewComp({ ...newComp, calculationType: e.target.value })}>
                                        <option value="FLAT">Flat Amount</option>
                                        <option value="%_BASIC">% of Basic</option>
                                        <option value="%_GROSS">% of Gross</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Value</label>
                                    <input type="number" placeholder="0" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newComp.value} onChange={e => setNewComp({ ...newComp, value: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>

                            <div className="space-y-2 py-2">
                                <label className="flex items-center gap-3 text-xs text-[#5B6472] dark:text-gray-300 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded accent-[#2C4FD6]" checked={newComp.isWageCodeComponent} onChange={e => setNewComp({ ...newComp, isWageCodeComponent: e.target.checked })} /> Is Basic Pay (Wage Code)</label>
                                <label className="flex items-center gap-3 text-xs text-[#5B6472] dark:text-gray-300 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded accent-[#2C4FD6]" checked={newComp.isPartOfWages} onChange={e => setNewComp({ ...newComp, isPartOfWages: e.target.checked })} /> Part of PF Wages</label>
                                <label className="flex items-center gap-3 text-xs text-[#5B6472] dark:text-gray-300 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded accent-[#2C4FD6]" checked={newComp.isFBP} onChange={e => setNewComp({ ...newComp, isFBP: e.target.checked })} /> FBP Eligible</label>
                            </div>

                            <button
                                onClick={saveComponent}
                                disabled={loading}
                                className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-[13.5px] rounded-[6px] transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                {editingComponentId ? 'Update Component' : 'Save Component'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPtModal && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-white/5">
                            <h3 className="text-base font-bold text-[#12151C] dark:text-white">Add PT Slab</h3>
                            <button onClick={() => setShowPtModal(false)} className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer"><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">State</label>
                                <select className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newPt.stateId} onChange={e => setNewPt({ ...newPt, stateId: e.target.value })}>
                                    <option value="">Select State</option>
                                    {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Min Salary</label>
                                    <input type="number" placeholder="0" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newPt.minSalary} onChange={e => setNewPt({ ...newPt, minSalary: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Max Salary</label>
                                    <input type="number" placeholder="0" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newPt.maxSalary} onChange={e => setNewPt({ ...newPt, maxSalary: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Tax Amount</label>
                                <input type="number" placeholder="200" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newPt.taxAmount} onChange={e => setNewPt({ ...newPt, taxAmount: parseFloat(e.target.value) })} />
                            </div>

                            <button onClick={savePtSlab} className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-[13.5px] rounded-[6px] transition-all cursor-pointer mt-2">Save Slab</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal (MATCHING THEME) */}
            {itemToDelete && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4 animate-fade-in">
                    <div className="bg-[#0f1016] rounded-[6px] w-full max-w-[calc(100vw-2rem)] sm:max-w-[360px] border-t-4 border-red-600 text-center relative overflow-hidden pb-8 px-5 sm:px-6">
                        <div className="w-20 h-20 bg-[#1c1d26] rounded-full flex items-center justify-center mx-auto mb-6 mt-8">
                            <Trash2 size={32} className="text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Delete Item?</h3>
                        <p className="text-[#8a8b94] mb-8 text-sm leading-relaxed px-2">
                            Are you sure you want to delete <span className="font-bold text-gray-200">{itemToDelete.name}</span>? <br />
                            This action cannot be undone and will permanently remove all associated data.
                        </p>
                        <div className="flex gap-4 px-2">
                            <button
                                onClick={() => setItemToDelete(null)}
                                className="flex-1 py-3.5 px-4 bg-[#1c1d26] text-white font-bold rounded-[6px] hover:bg-[#252631] transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 py-3.5 px-4 bg-[#ff3b3b] text-white font-bold rounded-[6px] hover:bg-[#ff4d4d] transition-all active:scale-95 flex items-center justify-center gap-2"
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
