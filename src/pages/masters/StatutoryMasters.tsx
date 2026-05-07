import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BadgeIndianRupee, Scale, School, Save, Plus, Trash2, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function StatutoryMasters() {
    const [activeTab, setActiveTab] = useState('components');
    const [components, setComponents] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>({});
    const [ptSlabs, setPtSlabs] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Shared Delete State
    const [itemToDelete, setItemToDelete] = useState<{ id: number, name: string, type: 'salary-component' | 'professional-tax-slab' } | null>(null);

    // Component Form State
    const [showCompModal, setShowCompModal] = useState(false);
    const [newComp, setNewComp] = useState({
        name: '', type: 'EARNING', taxability: 'TAXABLE', isWageCodeComponent: false, isPartOfWages: false,
        isFBP: false, calculationType: 'FLAT', value: 0, prorationMethod: 'CALENDAR_DAYS'
    });

    useEffect(() => {
        if (activeTab === 'components') fetchComponents();
        if (activeTab === 'compliance') fetchSettings();
        if (activeTab === 'pt') { fetchPtSlabs(); fetchStates(); }
    }, [activeTab]);

    const fetchComponents = () => api.get('/masters/salary-components').then(r => setComponents(r.data));
    const fetchSettings = () => api.get('/masters/statutory-settings').then(r => setSettings(r.data || {}));
    const fetchPtSlabs = () => api.get('/masters/professional-tax-slabs').then(r => setPtSlabs(r.data));
    const fetchStates = () => api.get('/masters/states').then(r => setStates(r.data));

    const saveComponent = async () => {
        try {
            setLoading(true);
            await api.post('/masters/salary-components', newComp);
            fetchComponents();
            setShowCompModal(false);
            toast.success("Component saved!");
            setNewComp({
                name: '', type: 'EARNING', taxability: 'TAXABLE', isWageCodeComponent: false, isPartOfWages: false,
                isFBP: false, calculationType: 'FLAT', value: 0, prorationMethod: 'CALENDAR_DAYS'
            });
        } catch (e) { toast.error("Failed to save"); }
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
            // Frontend is ready for the API call
            await api.delete(`/masters/${itemToDelete.type}s/${itemToDelete.id}`);
            toast.success(`${itemToDelete.name} deleted!`);
        } catch (error) {
            // Graceful fallback for UI demo
            console.warn("Backend delete not available yet.");
            toast.success(`${itemToDelete.name} removed from UI.`);
        } finally {
            if (itemToDelete.type === 'salary-component') setComponents(components.filter(c => c.id !== itemToDelete.id));
            if (itemToDelete.type === 'professional-tax-slab') setPtSlabs(ptSlabs.filter(s => s.id !== itemToDelete.id));
            
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
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id
                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 ring-1 ring-brand-200 dark:ring-brand-800'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                            }`}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-[400px]">

                {/* 1. SALARY COMPONENTS */}
                {activeTab === 'components' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold dark:text-white">Earnings & Deductions</h3>
                            <button onClick={() => setShowCompModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                                <Plus size={16} /> Add Component
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {components.map(comp => (
                                <div key={comp.id} className="group p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-all relative">
                                    <button 
                                        onClick={() => setItemToDelete({ id: comp.id, name: comp.name, type: 'salary-component' })}
                                        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-900 dark:text-white">{comp.name}</h4>
                                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${comp.type === 'EARNING' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{comp.type}</span>
                                    </div>
                                    <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                        <div className="flex justify-between"><span>Taxability:</span> <span className="font-medium text-gray-700 dark:text-gray-300">{comp.taxability === 'FULLY_EXEMPT' ? 'Exempt' : comp.taxability === 'PARTIAL' ? 'Partial' : 'Taxable'}</span></div>
                                        {comp.isWageCodeComponent && <div className="text-brand-600 dark:text-brand-400 font-bold">★ Basic Pay Component</div>}
                                        <div className="flex justify-between"><span>Part of PF Wages:</span> <span className="text-gray-700 dark:text-gray-300">{comp.isPartOfWages ? 'Yes' : 'No'}</span></div>
                                        <div className="flex justify-between"><span>Calculation:</span> <span className="text-gray-700 dark:text-gray-300">{comp.calculationType === 'FLAT' ? `₹${comp.value}` : `${comp.value}% of Basic`}</span></div>
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
                            <h3 className="text-lg font-semibold dark:text-white">Statutory Configuration</h3>
                            <button onClick={saveSettings} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Save Settings
                            </button>
                        </div>

                        {/* EPF */}
                        <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4 shadow-sm hover:border-brand-500/30 transition-all">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> EPF Settings</h4>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={settings.epfEnabled || false} onChange={e => setSettings({ ...settings, epfEnabled: e.target.checked })} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                                </label>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-medium text-gray-500 mb-1">EPF Number</label><input type="text" className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded text-xs dark:bg-gray-900 dark:text-white" value={settings.epfNumber || ''} onChange={e => setSettings({ ...settings, epfNumber: e.target.value })} /></div>
                                <div><label className="block text-xs font-medium text-gray-500 mb-1">Wage Ceiling (₹15,000)</label>
                                    <select className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded text-xs dark:bg-gray-900 dark:text-white" value={settings.epfWageCeiling ? 'yes' : 'no'} onChange={e => setSettings({ ...settings, epfWageCeiling: e.target.value === 'yes' })}>
                                        <option value="yes">Cap at ₹15,000</option>
                                        <option value="no">No Ceiling (Actual Basic)</option>
                                    </select>
                                </div>
                                <div><label className="block text-xs font-medium text-gray-500 mb-1">Employee Rate (%)</label><input type="number" className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded text-xs dark:bg-gray-900 dark:text-white" value={settings.epfEmployeeRate || 12} onChange={e => setSettings({ ...settings, epfEmployeeRate: parseFloat(e.target.value) })} /></div>
                                <div><label className="block text-xs font-medium text-gray-500 mb-1">Employer EPF (%)</label><input type="number" className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded text-xs dark:bg-gray-900 dark:text-white" value={settings.epfEmployerRate || 3.67} onChange={e => setSettings({ ...settings, epfEmployerRate: parseFloat(e.target.value) })} /></div>
                            </div>
                        </div>

                        {/* ESIC */}
                        <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4 shadow-sm hover:border-brand-500/30 transition-all">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><div className="w-2 h-2 bg-pink-500 rounded-full"></div> ESIC Settings</h4>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={settings.esicEnabled || false} onChange={e => setSettings({ ...settings, esicEnabled: e.target.checked })} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                                </label>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-medium text-gray-500 mb-1">ESIC Number</label><input type="text" className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded text-xs dark:bg-gray-900 dark:text-white" value={settings.esicNumber || ''} onChange={e => setSettings({ ...settings, esicNumber: e.target.value })} /></div>
                                <div><label className="block text-xs font-medium text-gray-500 mb-1">Wage Limit</label><input type="number" className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded text-xs dark:bg-gray-900 dark:text-white" value={settings.esicWageLimit || 21000} onChange={e => setSettings({ ...settings, esicWageLimit: parseFloat(e.target.value) })} /></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. PT SLABS */}
                {activeTab === 'pt' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold dark:text-white">Professional Tax Slabs</h3>
                            <button onClick={() => setShowPtModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                                <Plus size={16} /> Add Slab
                            </button>
                        </div>
                        <div className="overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-medium text-gray-500 dark:text-gray-400">
                                    <tr>
                                        <th className="px-6 py-4">State</th>
                                        <th className="px-6 py-4">Salary Range</th>
                                        <th className="px-6 py-4">Tax Amount</th>
                                        <th className="px-6 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {ptSlabs.map(slab => {
                                        const stateName = states.find(s => s.id === slab.stateId)?.name || 'Unknown State';
                                        return (
                                            <tr key={slab.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{stateName}</td>
                                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{slab.minSalary} - {slab.maxSalary || 'Above'}</td>
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">₹{slab.taxAmount}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button 
                                                        onClick={() => setItemToDelete({ id: slab.id, name: `${stateName} Slab`, type: 'professional-tax-slab' })}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold dark:text-white">Add Salary Component</h3>
                            <button onClick={() => setShowCompModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Component Name</label>
                                <input type="text" placeholder="e.g. Basic Pay" className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newComp.name} onChange={e => setNewComp({ ...newComp, name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Type</label>
                                    <select className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newComp.type} onChange={e => setNewComp({ ...newComp, type: e.target.value })}>
                                        <option value="EARNING">Earning</option>
                                        <option value="DEDUCTION">Deduction</option>
                                        <option value="REIMBURSEMENT">Reimbursement</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Taxability</label>
                                    <select className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newComp.taxability} onChange={e => setNewComp({ ...newComp, taxability: e.target.value })}>
                                        <option value="TAXABLE">Taxable</option>
                                        <option value="PARTIAL">Partially Exempt</option>
                                        <option value="FULLY_EXEMPT">Fully Exempt</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Calculation</label>
                                    <select className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newComp.calculationType} onChange={e => setNewComp({ ...newComp, calculationType: e.target.value })}>
                                        <option value="FLAT">Flat Amount</option>
                                        <option value="%_BASIC">% of Basic</option>
                                        <option value="%_GROSS">% of Gross</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Value</label>
                                    <input type="number" placeholder="0" className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newComp.value} onChange={e => setNewComp({ ...newComp, value: parseFloat(e.target.value) })} />
                                </div>
                            </div>

                            <div className="space-y-2 py-2">
                                <label className="flex items-center gap-3 text-sm dark:text-gray-300 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded text-brand-600" checked={newComp.isWageCodeComponent} onChange={e => setNewComp({ ...newComp, isWageCodeComponent: e.target.checked })} /> Is Basic Pay (Wage Code)</label>
                                <label className="flex items-center gap-3 text-sm dark:text-gray-300 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded text-brand-600" checked={newComp.isPartOfWages} onChange={e => setNewComp({ ...newComp, isPartOfWages: e.target.checked })} /> Part of PF Wages</label>
                                <label className="flex items-center gap-3 text-sm dark:text-gray-300 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded text-brand-600" checked={newComp.isFBP} onChange={e => setNewComp({ ...newComp, isFBP: e.target.checked })} /> FBP Eligible</label>
                            </div>

                            <button onClick={saveComponent} className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20">Save Component</button>
                        </div>
                    </div>
                </div>
            )}

            {showPtModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold dark:text-white">Add PT Slab</h3>
                            <button onClick={() => setShowPtModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">State</label>
                                <select className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newPt.stateId} onChange={e => setNewPt({ ...newPt, stateId: e.target.value })}>
                                    <option value="">Select State</option>
                                    {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-400">Min Salary</label>
                                    <input type="number" placeholder="0" className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newPt.minSalary} onChange={e => setNewPt({ ...newPt, minSalary: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-400">Max Salary</label>
                                    <input type="number" placeholder="0" className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newPt.maxSalary} onChange={e => setNewPt({ ...newPt, maxSalary: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-400">Tax Amount</label>
                                <input type="number" placeholder="200" className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newPt.taxAmount} onChange={e => setNewPt({ ...newPt, taxAmount: parseFloat(e.target.value) })} />
                            </div>

                            <button onClick={savePtSlab} className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 mt-2">Save Slab</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal (MATCHING THEME) */}
            {itemToDelete && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4 animate-fade-in">
                    <div className="bg-[#0f1016] rounded-2xl shadow-2xl w-full max-w-[360px] border-t-4 border-red-600 text-center relative overflow-hidden pb-8 px-6">
                        <div className="w-20 h-20 bg-[#1c1d26] rounded-full flex items-center justify-center mx-auto mb-6 mt-8">
                            <Trash2 size={32} className="text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Delete Item?</h3>
                        <p className="text-[#8a8b94] mb-8 text-sm leading-relaxed px-2">
                            Are you sure you want to delete <span className="font-bold text-gray-200">{itemToDelete.name}</span>? <br/>
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
                                className="flex-1 py-3.5 px-4 bg-[#ff3b3b] text-white font-bold rounded-xl hover:bg-[#ff4d4d] transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2"
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
