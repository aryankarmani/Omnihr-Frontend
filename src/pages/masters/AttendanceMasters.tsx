import { useState, useEffect } from 'react';
import { Clock, Settings, Save, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function AttendanceMasters() {
    const [activeTab, setActiveTab] = useState('shifts');
    const [shifts, setShifts] = useState<any[]>([]);
    const [policy, setPolicy] = useState<any>({});

    useEffect(() => {
        if (activeTab === 'shifts') fetchShifts();
        if (activeTab === 'policy') fetchPolicy();
    }, [activeTab]);

    const fetchShifts = () => api.get('/masters/shifts').then(r => setShifts(r.data));
    const fetchPolicy = () => api.get('/masters/attendance-policy').then(r => setPolicy(r.data));

    // Shift Form State
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [newShift, setNewShift] = useState({
        name: '', startTime: '09:00', endTime: '18:00', breakDuration: 60, graceTime: 15, isNightShift: false
    });

    const saveShift = async () => {
        try {
            await api.post('/masters/shifts', newShift);
            fetchShifts();
            setShowShiftModal(false);
            toast.success("Shift saved!");
        } catch (e) { toast.error("Failed to save shift"); }
    };

    const savePolicy = async () => {
        try {
            await api.post('/masters/attendance-policy', policy);
            toast.success("Policy updated!");
        } catch (e) { toast.error("Failed to update policy"); }
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                <button onClick={() => setActiveTab('shifts')} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'shifts' ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400' : 'text-gray-600 dark:text-gray-400'}`}><Clock size={16} /> Shifts & Rosters</button>
                <button onClick={() => setActiveTab('policy')} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${activeTab === 'policy' ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400' : 'text-gray-600 dark:text-gray-400'}`}><Settings size={16} /> Attendance Rules</button>
            </div>

            {activeTab === 'shifts' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold dark:text-white">Shift Configuration</h3>
                        <button onClick={() => setShowShiftModal(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium">
                            <Plus size={16} /> Add Shift
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {shifts.map(shift => (
                            <div key={shift.id} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-2">{shift.name}</h4>
                                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex justify-between"><span>Timing:</span> <span className="font-medium">{shift.startTime} - {shift.endTime}</span></div>
                                    <div className="flex justify-between"><span>Break:</span> <span>{shift.breakDuration} mins</span></div>
                                    <div className="flex justify-between"><span>Grace Time:</span> <span>{shift.graceTime} mins</span></div>
                                    <div className="flex justify-between"><span>Night Shift:</span> <span>{shift.isNightShift ? 'Yes' : 'No'}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'policy' && (
                <div className="space-y-6 animate-fade-in max-w-2xl">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold dark:text-white">Policy Rules</h3>
                        <button onClick={savePolicy} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium">
                            <Save size={16} /> Save Rules
                        </button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-6">
                        {/* Half/Full Day Logic */}
                        <div>
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-3">Day Status Thresholds (Hours)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-medium mb-1 dark:text-gray-400">Min Half Day</label><input type="number" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={policy.minHalfDayHours || 4} onChange={e => setPolicy({ ...policy, minHalfDayHours: parseFloat(e.target.value) })} /></div>
                                <div><label className="block text-xs font-medium mb-1 dark:text-gray-400">Min Full Day</label><input type="number" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={policy.minFullDayHours || 8} onChange={e => setPolicy({ ...policy, minFullDayHours: parseFloat(e.target.value) })} /></div>
                            </div>
                        </div>

                        {/* Late Mark Logic */}
                        <div>
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-3">Late Mark Deduction</h4>
                            <div className="flex gap-4 items-center">
                                <span className="text-sm dark:text-gray-300">Every</span>
                                <input type="number" className="w-16 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={policy.lateMarkThreshold || 3} onChange={e => setPolicy({ ...policy, lateMarkThreshold: parseInt(e.target.value) })} />
                                <span className="text-sm dark:text-gray-300">late marks deduct</span>
                                <select className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" value={policy.lateMarkDeduction || 'HALF_DAY'} onChange={e => setPolicy({ ...policy, lateMarkDeduction: e.target.value })}>
                                    <option value="HALF_DAY">0.5 Day</option>
                                    <option value="ONE_DAY">1 Day</option>
                                </select>
                            </div>
                        </div>

                        {/* OT Logic */}
                        <div>
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-3">Overtime Configuration</h4>
                            <label className="flex items-center gap-2 mb-2 text-sm dark:text-gray-300"><input type="checkbox" checked={policy.otEnabled || false} onChange={e => setPolicy({ ...policy, otEnabled: e.target.checked })} /> Enable Overtime</label>
                            {policy.otEnabled && (
                                <div className="grid grid-cols-2 gap-4 pl-6">
                                    <div><label className="block text-xs font-medium mb-1 dark:text-gray-400">OT Rate Multiplier</label><input type="number" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={policy.otRate || 2} onChange={e => setPolicy({ ...policy, otRate: parseFloat(e.target.value) })} /></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Shift Modal */}
            {showShiftModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="font-bold mb-4 dark:text-white">Add Shift</h3>
                        <div className="space-y-3">
                            <input type="text" placeholder="Shift Name" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newShift.name} onChange={e => setNewShift({ ...newShift, name: e.target.value })} />
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs mb-1 dark:text-gray-400">Start Time</label><input type="time" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newShift.startTime} onChange={e => setNewShift({ ...newShift, startTime: e.target.value })} /></div>
                                <div><label className="block text-xs mb-1 dark:text-gray-400">End Time</label><input type="time" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newShift.endTime} onChange={e => setNewShift({ ...newShift, endTime: e.target.value })} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs mb-1 dark:text-gray-400">Break (mins)</label><input type="number" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newShift.breakDuration} onChange={e => setNewShift({ ...newShift, breakDuration: parseInt(e.target.value) })} /></div>
                                <div><label className="block text-xs mb-1 dark:text-gray-400">Grace In (mins)</label><input type="number" className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={newShift.graceTime} onChange={e => setNewShift({ ...newShift, graceTime: parseInt(e.target.value) })} /></div>
                            </div>
                            <label className="flex items-center gap-2 text-sm dark:text-gray-300"><input type="checkbox" checked={newShift.isNightShift} onChange={e => setNewShift({ ...newShift, isNightShift: e.target.checked })} /> Night Shift (Ends Next Day)</label>

                            <button onClick={saveShift} className="w-full py-2 bg-brand-600 text-white rounded mt-2 hover:bg-brand-700">Save Shift</button>
                            <button onClick={() => setShowShiftModal(false)} className="w-full py-2 text-gray-500 mt-1 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
