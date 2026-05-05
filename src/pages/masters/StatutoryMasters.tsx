import { useState, useEffect } from 'react';
import { BadgeIndianRupee, Scale, School, Save, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function StatutoryMasters() {
    const [activeTab, setActiveTab] = useState('components');
    const [components, setComponents] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>({});
    const [ptSlabs, setPtSlabs] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);

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
            await api.post('/masters/salary-components', newComp);
            fetchComponents();
            setShowCompModal(false);
            toast.success("Component saved!");
        } catch (e) { toast.error("Failed to save"); }
    };

    const saveSettings = async () => {
        try {
            await api.post('/masters/statutory-settings', settings);
            toast.success("Settings updated!");
        } catch (e) { toast.error("Failed to update settings"); }
    };

    // PT Form State
    const [showPtModal, setShowPtModal] = useState(false);
    const [newPt, setNewPt] = useState({ stateId: '', minSalary: 0, maxSalary: 0, taxAmount: 0 });

    const savePtSlab = async () => {
        try {
            await api.post('/masters/professional-tax-slabs', {
                ...newPt, stateId: Number(newPt.stateId)
            });
            fetchPtSlabs();
            setShowPtModal(false);
            toast.success("PT Slab added!");
        } catch (e) { toast.error("Failed to add PT Slab"); }
    };


    return (
        <div className="space-y-6">
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
                            <button onClick={() => setShowCompModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium">
                                <Plus size={16} /> Add Component
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {components.map(comp => (
                                <div key={comp.id} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-gray-900 dark:text-white">{comp.name}</h4>
                                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${comp.type === 'EARNING' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{comp.type}</span>
                                    </div>
                                    <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                        <div className="flex justify-between"><span>Taxability:</span> <span className="font-medium">{comp.taxability === 'FULLY_EXEMPT' ? 'Exempt' : comp.taxability === 'PARTIAL' ? 'Partial' : 'Taxable'}</span></div>
                                        {comp.isWageCodeComponent && <div className="text-brand-600 font-bold">★ Basic Pay Component</div>}
                                        <div className="flex justify-between"><span>Part of PF Wages:</span> <span>{comp.isPartOfWages ? 'Yes' : 'No'}</span></div>
                                        <div className="flex justify-between"><span>Calculation:</span> <span>{comp.calculationType === 'FLAT' ? `₹${comp.value}` : `${comp.value}% of Basic`}</span></div>
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
                            <button onClick={saveSettings} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium">
                                <Save size={16} /> Save Settings
                            </button>
                        </div>

                        {/* EPF */}
                        <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> EPF Settings</h4>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={settings.epfEnabled || false} onChange={e => setSettings({ ...settings, epfEnabled: e.target.checked })} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                                </label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-medium mb-1">EPF Number</label><input type="text" className="w-full p-2 border rounded text-xs" value={settings.epfNumber || ''} onChange={e => setSettings({ ...settings, epfNumber: e.target.value })} /></div>
                                <div><label className="block text-xs font-medium mb-1">Wage Ceiling (₹15,000)</label>
                                    <select className="w-full p-2 border rounded text-xs" value={settings.epfWageCeiling ? 'yes' : 'no'} onChange={e => setSettings({ ...settings, epfWageCeiling: e.target.value === 'yes' })}>
                                        <option value="yes">Cap at ₹15,000</option>
                                        <option value="no">No Ceiling (Actual Basic)</option>
                                    </select>
                                </div>
                                <div><label className="block text-xs font-medium mb-1">Employee Rate (%)</label><input type="number" className="w-full p-2 border rounded text-xs" value={settings.epfEmployeeRate || 12} onChange={e => setSettings({ ...settings, epfEmployeeRate: parseFloat(e.target.value) })} /></div>
                                <div><label className="block text-xs font-medium mb-1">Employer EPF (%)</label><input type="number" className="w-full p-2 border rounded text-xs" value={settings.epfEmployerRate || 3.67} onChange={e => setSettings({ ...settings, epfEmployerRate: parseFloat(e.target.value) })} /></div>
                                <div><label className="block text-xs font-medium mb-1">Employer EPS (%)</label><input type="number" className="w-full p-2 border rounded text-xs" value={settings.epsEmployerRate || 8.33} onChange={e => setSettings({ ...settings, epsEmployerRate: parseFloat(e.target.value) })} /></div>
                                <div><label className="block text-xs font-medium mb-1">EDLI Charges (%)</label><input type="number" className="w-full p-2 border rounded text-xs" value={settings.edliEmployerRate || 0.5} onChange={e => setSettings({ ...settings, edliEmployerRate: parseFloat(e.target.value) })} /></div>
                            </div>
                        </div>

                        {/* ESIC */}
                        <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><div className="w-2 h-2 bg-pink-500 rounded-full"></div> ESIC Settings</h4>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={settings.esicEnabled || false} onChange={e => setSettings({ ...settings, esicEnabled: e.target.checked })} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                                </label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-medium mb-1">ESIC Number</label><input type="text" className="w-full p-2 border rounded text-xs" value={settings.esicNumber || ''} onChange={e => setSettings({ ...settings, esicNumber: e.target.value })} /></div>
                                <div><label className="block text-xs font-medium mb-1">Wage Limit</label><input type="number" className="w-full p-2 border rounded text-xs" value={settings.esicWageLimit || 21000} onChange={e => setSettings({ ...settings, esicWageLimit: parseFloat(e.target.value) })} /></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. PT SLABS */}
                {activeTab === 'pt' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold dark:text-white">Professional Tax Slabs</h3>
                            <button onClick={() => setShowPtModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium">
                                <Plus size={16} /> Add Slab
                            </button>
                        </div>
                        <div className="overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-medium text-gray-500 dark:text-gray-400">
                                    <tr>
                                        <th className="px-6 py-3">State</th>
                                        <th className="px-6 py-3">Salary Range</th>
                                        <th className="px-6 py-3">Tax Amount</th>
                                        <th className="px-6 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {ptSlabs.map(slab => {
                                        const stateName = states.find(s => s.id === slab.stateId)?.name || 'Unknown State';
                                        return (
                                            <tr key={slab.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{stateName}</td>
                                                <td className="px-6 py-4">{slab.minSalary} - {slab.maxSalary || 'Above'}</td>
                                                <td className="px-6 py-4">₹{slab.taxAmount}</td>
                                                <td className="px-6 py-4"><button className="text-red-500"><Trash2 size={16} /></button></td>
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="font-bold mb-4 dark:text-white">Add Salary Component</h3>
                        <div className="space-y-3">
                            <input type="text" placeholder="Component Name" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newComp.name} onChange={e => setNewComp({ ...newComp, name: e.target.value })} />

                            <div className="grid grid-cols-2 gap-3">
                                <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newComp.type} onChange={e => setNewComp({ ...newComp, type: e.target.value })}>
                                    <option value="EARNING">Earning</option>
                                    <option value="DEDUCTION">Deduction</option>
                                    <option value="REIMBURSEMENT">Reimbursement</option>
                                </select>
                                <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newComp.taxability} onChange={e => setNewComp({ ...newComp, taxability: e.target.value })}>
                                    <option value="TAXABLE">Taxable</option>
                                    <option value="PARTIAL">Partially Exempt</option>
                                    <option value="FULLY_EXEMPT">Fully Exempt</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newComp.calculationType} onChange={e => setNewComp({ ...newComp, calculationType: e.target.value })}>
                                    <option value="FLAT">Flat Amount</option>
                                    <option value="%_BASIC">% of Basic</option>
                                    <option value="%_GROSS">% of Gross</option>
                                </select>
                                <input type="number" placeholder="Value" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newComp.value} onChange={e => setNewComp({ ...newComp, value: parseFloat(e.target.value) })} />
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="flex items-center gap-2 text-sm dark:text-gray-300"><input type="checkbox" checked={newComp.isWageCodeComponent} onChange={e => setNewComp({ ...newComp, isWageCodeComponent: e.target.checked })} /> Is Basic Pay (Wage Code)</label>
                                <label className="flex items-center gap-2 text-sm dark:text-gray-300"><input type="checkbox" checked={newComp.isPartOfWages} onChange={e => setNewComp({ ...newComp, isPartOfWages: e.target.checked })} /> Part of PF Wages</label>
                                <label className="flex items-center gap-2 text-sm dark:text-gray-300"><input type="checkbox" checked={newComp.isFBP} onChange={e => setNewComp({ ...newComp, isFBP: e.target.checked })} /> FBP Eligible</label>
                            </div>

                            <div className="pt-2">
                                <label className="block text-xs font-medium mb-1 dark:text-gray-400">Proration Method</label>
                                <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" value={newComp.prorationMethod} onChange={e => setNewComp({ ...newComp, prorationMethod: e.target.value })}>
                                    <option value="CALENDAR_DAYS">Calendar Days</option>
                                    <option value="FIXED_30">Fixed 30 Days</option>
                                    <option value="WORKING_DAYS">Working Days</option>
                                </select>
                            </div>

                            <button onClick={saveComponent} className="w-full py-2 bg-brand-600 text-white rounded mt-2 hover:bg-brand-700">Save Component</button>
                            <button onClick={() => setShowCompModal(false)} className="w-full py-2 text-gray-500 mt-1 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {showPtModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="font-bold mb-4 dark:text-white">Add PT Slab</h3>
                        <div className="space-y-3">
                            <select className="w-full p-2 border rounded" value={newPt.stateId} onChange={e => setNewPt({ ...newPt, stateId: e.target.value })}>
                                <option value="">Select State</option>
                                {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <div className="flex gap-2">
                                <div className="w-1/2">
                                    <label className="block text-xs font-medium mb-1 dark:text-gray-400">Min Salary</label>
                                    <input type="number" placeholder="0" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newPt.minSalary} onChange={e => setNewPt({ ...newPt, minSalary: parseFloat(e.target.value) })} />
                                </div>
                                <div className="w-1/2">
                                    <label className="block text-xs font-medium mb-1 dark:text-gray-400">Max Salary</label>
                                    <input type="number" placeholder="0" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newPt.maxSalary} onChange={e => setNewPt({ ...newPt, maxSalary: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 dark:text-gray-400">Tax Amount</label>
                                <input type="number" placeholder="200" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newPt.taxAmount} onChange={e => setNewPt({ ...newPt, taxAmount: parseFloat(e.target.value) })} />
                            </div>

                            <button onClick={savePtSlab} className="w-full py-2 bg-brand-600 text-white rounded mt-2 hover:bg-brand-700">Save Slab</button>
                            <button onClick={() => setShowPtModal(false)} className="w-full py-2 text-gray-500 mt-1 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
