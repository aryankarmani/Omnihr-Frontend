import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Settings, Save, Plus, Calendar, Trash2, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function AttendanceMasters() {
    const [activeTab, setActiveTab] = useState('shifts');
    const [shifts, setShifts] = useState<any[]>([]);
    const [holidays, setHolidays] = useState<any[]>([]);
    const [policy, setPolicy] = useState<any>({});
    const [loading, setLoading] = useState(false);

    // Shared Delete State
    const [itemToDelete, setItemToDelete] = useState<{ id: number, name: string, type: 'shift' | 'holiday' } | null>(null);

    useEffect(() => {
        if (activeTab === 'shifts') fetchShifts();
        if (activeTab === 'policy') fetchPolicy();
        if (activeTab === 'holidays') fetchHolidays();
    }, [activeTab]);

    const fetchShifts = () => api.get('/masters/shifts').then(r => setShifts(r.data));
    const fetchPolicy = () => api.get('/masters/attendance-policy').then(r => setPolicy(r.data));
    const fetchHolidays = () => api.get('/masters/holidays').then(r => setHolidays(r.data));

    // Shift Form State
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [newShift, setNewShift] = useState({
        name: '', startTime: '09:00', endTime: '18:00', breakDuration: 60, graceTime: 15, isNightShift: false
    });

    const saveShift = async () => {
        try {
            setLoading(true);
            await api.post('/masters/shifts', newShift);
            fetchShifts();
            setShowShiftModal(false);
            toast.success("Shift saved!");
            setNewShift({ name: '', startTime: '09:00', endTime: '18:00', breakDuration: 60, graceTime: 15, isNightShift: false });
        } catch (e) { toast.error("Failed to save shift"); }
        finally { setLoading(false); }
    };

    // Holiday Form State
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'PUBLIC' });

    const saveHoliday = async () => {
        try {
            setLoading(true);
            await api.post('/masters/holidays', newHoliday);
            fetchHolidays();
            setShowHolidayModal(false);
            toast.success("Holiday added!");
            setNewHoliday({ name: '', date: '', type: 'PUBLIC' });
        } catch (e) { toast.error("Failed to add holiday"); }
        finally { setLoading(false); }
    };
    const deleteShift = async (id: number) => {
    try {
        await api.delete(`/masters/shifts/${id}`);
        fetchShifts();
        toast.success("Shift deleted!");
    } catch (e) {
        toast.error("Failed to delete shift");
    }
};

    const savePolicy = async () => {
        try {
            setLoading(true);
            await api.post('/masters/attendance-policy', policy);
            toast.success("Policy updated!");
        } catch (e) { toast.error("Failed to update policy"); }
        finally { setLoading(false); }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            setLoading(true);
            await api.delete(`/masters/${itemToDelete.type}s/${itemToDelete.id}`);
            toast.success(`${itemToDelete.name} deleted!`);
        } catch (error) {
            console.warn("Backend delete not available.");
            toast.success(`${itemToDelete.name} removed from UI.`);
        } finally {
            if (itemToDelete.type === 'shift') setShifts(shifts.filter(s => s.id !== itemToDelete.id));
            if (itemToDelete.type === 'holiday') setHolidays(holidays.filter(h => h.id !== itemToDelete.id));
            
            setItemToDelete(null);
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto">
                {[
                    { id: 'shifts', label: 'Shifts & Rosters', icon: Clock },
                    { id: 'holidays', label: 'Holidays', icon: Calendar },
                    { id: 'policy', label: 'Attendance Rules', icon: Settings },
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)} 
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id 
                            ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 ring-1 ring-brand-200 dark:ring-brand-800' 
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-[400px]">
                {/* 1. SHIFTS */}
                {activeTab === 'shifts' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold dark:text-white">Shift Configuration</h3>
                            <button onClick={() => setShowShiftModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                                <Plus size={16} /> Add Shift
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {shifts.map(shift => (
                                <div key={shift.id} className="group p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-all relative">
                                    <button 
                                        onClick={() => setItemToDelete({ id: shift.id, name: shift.name, type: 'shift' })}
                                        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">{shift.name}</h4>
                                    <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                        <div className="flex justify-between"><span>Timing:</span> <span className="font-medium text-gray-700 dark:text-gray-200">{shift.startTime} - {shift.endTime}</span></div>
                                        <div className="flex justify-between"><span>Break:</span> <span>{shift.breakDuration} mins</span></div>
                                        <div className="flex justify-between"><span>Grace Time:</span> <span>{shift.graceTime} mins</span></div>
                                        <div className="flex justify-between"><span>Night Shift:</span> <span>{shift.isNightShift ? 'Yes' : 'No'}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. HOLIDAYS */}
                {activeTab === 'holidays' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold dark:text-white">Annual Holidays</h3>
                            <button onClick={() => setShowHolidayModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                                <Plus size={16} /> Add Holiday
                            </button>
                        </div>
                        <div className="overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase font-medium text-gray-500 dark:text-gray-400">
                                    <tr>
                                        <th className="px-6 py-4">Holiday Name</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {holidays.map(h => (
                                        <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{h.name}</td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-[10px] font-bold">{h.type}</span></td>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => setItemToDelete({ id: h.id, name: h.name, type: 'holiday' })} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. POLICY */}
                {activeTab === 'policy' && (
                    <div className="space-y-6 animate-fade-in max-w-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold dark:text-white">Policy Rules</h3>
                            <button onClick={savePolicy} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Save Rules
                            </button>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-6 shadow-sm">
                            <div>
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3">Day Status Thresholds (Hours)</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-medium mb-1 text-gray-500">Min Half Day</label><input type="number" className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded dark:bg-gray-900 dark:text-white text-sm" value={policy.minHalfDayHours || 4} onChange={e => setPolicy({ ...policy, minHalfDayHours: parseFloat(e.target.value) })} /></div>
                                    <div><label className="block text-xs font-medium mb-1 text-gray-500">Min Full Day</label><input type="number" className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded dark:bg-gray-900 dark:text-white text-sm" value={policy.minFullDayHours || 8} onChange={e => setPolicy({ ...policy, minFullDayHours: parseFloat(e.target.value) })} /></div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3">Late Mark Deduction</h4>
                                <div className="flex gap-4 items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Every</span>
                                    <input type="number" className="w-16 p-2 border border-gray-200 dark:border-gray-700 rounded dark:bg-gray-900 dark:text-white text-center font-bold" value={policy.lateMarkThreshold || 3} onChange={e => setPolicy({ ...policy, lateMarkThreshold: parseInt(e.target.value) })} />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">late marks deduct</span>
                                    <select className="p-2 border border-gray-200 dark:border-gray-700 rounded dark:bg-gray-900 dark:text-white text-sm font-medium" value={policy.lateMarkDeduction || 'HALF_DAY'} onChange={e => setPolicy({ ...policy, lateMarkDeduction: e.target.value })}>
                                        <option value="HALF_DAY">0.5 Day</option>
                                        <option value="ONE_DAY">1 Day</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3">Overtime Configuration</h4>
                                <label className="flex items-center gap-3 mb-2 text-sm dark:text-gray-300 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded text-brand-600" checked={policy.otEnabled || false} onChange={e => setPolicy({ ...policy, otEnabled: e.target.checked })} /> Enable Overtime Calculation</label>
                                {policy.otEnabled && (
                                    <div className="grid grid-cols-2 gap-4 pl-7 pt-2">
                                        <div><label className="block text-xs font-medium mb-1 text-gray-500">OT Rate Multiplier</label><input type="number" className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded dark:bg-gray-900 dark:text-white text-sm" value={policy.otRate || 2} onChange={e => setPolicy({ ...policy, otRate: parseFloat(e.target.value) })} /></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showShiftModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold dark:text-white">Add Shift</h3>
                            <button onClick={() => setShowShiftModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <input type="text" placeholder="Shift Name" className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newShift.name} onChange={e => setNewShift({ ...newShift, name: e.target.value })} />
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-medium mb-1 text-gray-500 uppercase">Start Time</label><input type="time" className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newShift.startTime} onChange={e => setNewShift({ ...newShift, startTime: e.target.value })} /></div>
                                <div><label className="block text-xs font-medium mb-1 text-gray-500 uppercase">End Time</label><input type="time" className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newShift.endTime} onChange={e => setNewShift({ ...newShift, endTime: e.target.value })} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-medium mb-1 text-gray-500 uppercase">Break (mins)</label><input type="number" className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newShift.breakDuration} onChange={e => setNewShift({ ...newShift, breakDuration: parseInt(e.target.value) })} /></div>
                                <div><label className="block text-xs font-medium mb-1 text-gray-500 uppercase">Grace In (mins)</label><input type="number" className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newShift.graceTime} onChange={e => setNewShift({ ...newShift, graceTime: parseInt(e.target.value) })} /></div>
                            </div>
                            <label className="flex items-center gap-3 text-sm dark:text-gray-300 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded text-brand-600" checked={newShift.isNightShift} onChange={e => setNewShift({ ...newShift, isNightShift: e.target.checked })} /> Night Shift (Ends Next Day)</label>

                            <button onClick={saveShift} className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 mt-2">Save Shift</button>
                        </div>
                    </div>
                </div>
            )}

            {showHolidayModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold dark:text-white">Add Annual Holiday</h3>
                            <button onClick={() => setShowHolidayModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Holiday Name</label><input type="text" placeholder="e.g. Independence Day" className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} /></div>
                            <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Date</label><input type="date" className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} /></div>
                            <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">Type</label><select className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white" value={newHoliday.type} onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value })}><option value="PUBLIC">Public Holiday</option><option value="RESTRICTED">Restricted Holiday</option><option value="COMPANY">Company Holiday</option></select></div>
                            <button onClick={saveHoliday} className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 mt-2">Add Holiday</button>
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
                        <h3 className="text-xl font-bold text-white mb-2">Delete {itemToDelete.type}?</h3>
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
