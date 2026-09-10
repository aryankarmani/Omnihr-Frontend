
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Settings, Save, Plus, Calendar, Trash2, X, Loader2, Layers, Sliders, AlertCircle } from 'lucide-react';
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
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: any; type: 'SHIFT' | 'HOLIDAY' }>({
        isOpen: false,
        id: null,
        type: 'SHIFT',
    });

    useEffect(() => {
        if (activeTab === 'shifts') fetchShifts();
        if (activeTab === 'policy') fetchPolicy();
        if (activeTab === 'holidays') fetchHolidays();
        if (activeTab === 'sandwich') {
            console.log('Sandwich Rule Tab Opened');
        }
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
        } catch { toast.error("Failed to save shift"); }
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
        } catch { toast.error("Failed to add holiday"); }
        finally { setLoading(false); }
    };

    const savePolicy = async () => {
        try {
            setLoading(true);
            await api.post('/masters/attendance-policy', policy);
            toast.success("Policy updated!");
        } catch { toast.error("Failed to update policy"); }
        finally { setLoading(false); }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            setLoading(true);
            await api.delete(`/masters/${itemToDelete.type}s/${itemToDelete.id}`);
            toast.success(`${itemToDelete.name} deleted!`);
        } catch {
            console.warn("Backend delete not available.");
            toast.success(`${itemToDelete.name} removed from UI.`);
        } finally {
            if (itemToDelete.type === 'shift') setShifts(shifts.filter(s => s.id !== itemToDelete.id));
            if (itemToDelete.type === 'holiday') setHolidays(holidays.filter(h => h.id !== itemToDelete.id));

            setItemToDelete(null);
        }
    };

    const handleDeleteShift = (id: any) => setDeleteModal({ isOpen: true, id, type: 'SHIFT' });
    const handleDeleteHoliday = (id: any) => setDeleteModal({ isOpen: true, id, type: 'HOLIDAY' });

    const confirmDelete = async () => {
        try {
            setLoading(true);
            if (deleteModal.type === 'SHIFT') await api.delete(`/masters/shifts/${deleteModal.id}`);
            else await api.delete(`/masters/holidays/${deleteModal.id}`);
            toast.success("Deleted successfully!");
            if (deleteModal.type === 'SHIFT') fetchShifts(); else fetchHolidays();
            setDeleteModal({ isOpen: false, id: null, type: 'SHIFT' });
        } catch { toast.error("Delete failed"); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex gap-2 items-center overflow-x-auto pb-1">
                {[
                    { id: 'SHIFTS', label: 'Work Shifts', icon: Clock },
                    { id: 'HOLIDAYS', label: 'Holiday Calendar', icon: Calendar },
                    { id: 'POLICY', label: 'Attendance Rules', icon: Sliders },
                    { id: 'WEEKOFFS', label: 'Week Off Policy', icon: Sliders }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-3.5 py-1.5 rounded-[6px] flex items-center gap-2 text-[13px] transition-all whitespace-nowrap cursor-pointer ${activeTab === tab.id
                            ? 'bg-[#2C4FD6] text-white font-semibold'
                            : 'bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-400 hover:bg-[#EEF1F5] dark:hover:bg-gray-800 border border-[#E2E6ED] dark:border-gray-800'
                            }`}
                    >
                        <tab.icon size={15} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6 sm:p-8 min-h-[400px]">
                {activeTab === 'SHIFTS' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center pb-4 border-b border-[#E2E6ED] dark:border-gray-800">
                            <div>
                                <h3 className="text-base font-bold text-[#12151C] dark:text-white">Shift Timings</h3>
                                <p className="text-xs text-[#5B6472] dark:text-gray-400">Configure working hours, break durations, and grace times.</p>
                            </div>
                            <button onClick={() => setShowShiftModal(true)} className="inline-flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13.5px] font-semibold px-[15px] py-[9px] transition-all cursor-pointer">
                                <Plus size={16} /> Add Shift
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {shifts.map((shift) => (
                                <div key={shift.id} className="group p-4 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] transition-all relative">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-[#12151C] dark:text-white text-sm">{shift.name}</h4>
                                            <p className="text-xs text-[#2C4FD6] font-semibold mt-0.5">{shift.startTime} - {shift.endTime}</p>
                                        </div>
                                        <button onClick={() => handleDeleteShift(shift.id)} className="opacity-0 group-hover:opacity-100 p-1 text-[#DE350B] hover:bg-[#FBE7E7] dark:hover:bg-rose-900/30 rounded transition-all cursor-pointer"><Trash2 size={15} /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-[#5B6472] dark:text-gray-400 border-t border-[#E2E6ED] dark:border-gray-800 pt-3">
                                        <div>Break: <span className="font-semibold text-[#12151C] dark:text-gray-200">{shift.breakDuration}m</span></div>
                                        <div>Grace In: <span className="font-semibold text-[#12151C] dark:text-gray-200">{shift.graceTime}m</span></div>
                                        <div>Night Shift: <span className="font-semibold text-[#12151C] dark:text-gray-200">{shift.isNightShift ? 'Yes' : 'No'}</span></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'HOLIDAYS' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center pb-4 border-b border-[#E2E6ED] dark:border-gray-800">
                            <div>
                                <h3 className="text-base font-bold text-[#12151C] dark:text-white">Annual Holidays</h3>
                                <p className="text-xs text-[#5B6472] dark:text-gray-400">Manage public and company holidays for the current year.</p>
                            </div>
                            <button onClick={() => setShowHolidayModal(true)} className="inline-flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13.5px] font-semibold px-[15px] py-[9px] transition-all cursor-pointer">
                                <Plus size={16} /> Add Holiday
                            </button>
                        </div>
                        <div className="overflow-hidden bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#F7F8FA] dark:bg-gray-800/50 border-b border-[#E2E6ED] dark:border-gray-800 text-[#5B6472] dark:text-gray-400 font-bold uppercase tracking-wider">
                                        <th className="p-3">Holiday Name</th>
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Type</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800 text-[#12151C] dark:text-gray-200">
                                    {holidays.map((h) => (
                                        <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="p-3 font-semibold">{h.name}</td>
                                            <td className="p-3 font-mono">{new Date(h.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                            <td className="p-3"><span className="px-[10px] py-[3px] rounded-full bg-[#EEF1F5] dark:bg-gray-700/60 text-[#717E95] dark:text-gray-300 text-[11.5px] font-semibold">{h.type}</span></td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => handleDeleteHoliday(h.id)} className="p-1 text-[#DE350B] hover:bg-[#FBE7E7] dark:hover:bg-rose-900/30 rounded transition-all cursor-pointer"><Trash2 size={15} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'POLICY' && (
                    <div className="space-y-6 max-w-2xl">
                        <div className="flex justify-between items-center pb-4 border-b border-[#E2E6ED] dark:border-gray-800">
                            <div>
                                <h3 className="text-base font-bold text-[#12151C] dark:text-white">Attendance Rules</h3>
                                <p className="text-xs text-[#5B6472] dark:text-gray-400">Configure cutoff times, late marks, and half-day hours.</p>
                            </div>
                            <button onClick={savePolicy} disabled={loading} className="inline-flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13.5px] font-semibold px-[15px] py-[9px] transition-all cursor-pointer">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Rules
                            </button>
                        </div>
                        <div className="bg-white dark:bg-[#12151C] p-6 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 space-y-6">
                            <div className="space-y-4">
                                <h4 className="font-bold text-sm text-[#12151C] dark:text-white">Hours Calculation</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Min Half Day</label><input type="number" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white text-sm outline-none focus:border-[#2C4FD6]" value={policy.minHalfDayHours || 4} onChange={e => setPolicy({ ...policy, minHalfDayHours: parseFloat(e.target.value) })} /></div>
                                    <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Min Full Day</label><input type="number" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white text-sm outline-none focus:border-[#2C4FD6]" value={policy.minFullDayHours || 8} onChange={e => setPolicy({ ...policy, minFullDayHours: parseFloat(e.target.value) })} /></div>
                                </div>
                            </div>
                            <div className="border-t border-[#E2E6ED] dark:border-gray-800 pt-4 space-y-4">
                                <h4 className="font-bold text-sm text-[#12151C] dark:text-white">Late Mark Penalty</h4>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-[#5B6472] dark:text-gray-300">After</span>
                                    <input type="number" className="w-16 px-2 py-1.5 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white text-center font-bold text-sm outline-none focus:border-[#2C4FD6]" value={policy.lateMarkThreshold || 3} onChange={e => setPolicy({ ...policy, lateMarkThreshold: parseInt(e.target.value) })} />
                                    <span className="text-xs text-[#5B6472] dark:text-gray-300">late marks, deduct</span>
                                    <select className="px-3 py-1.5 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white text-sm font-semibold outline-none focus:border-[#2C4FD6]" value={policy.lateMarkDeduction || 'HALF_DAY'} onChange={e => setPolicy({ ...policy, lateMarkDeduction: e.target.value })}>
                                        <option value="HALF_DAY">0.5 Day Leave</option>
                                        <option value="FULL_DAY">1 Day Leave</option>
                                    </select>
                                </div>
                            </div>
                            <div className="border-t border-[#E2E6ED] dark:border-gray-800 pt-4 space-y-3">
                                <h4 className="font-bold text-sm text-[#12151C] dark:text-white">Overtime (OT)</h4>
                                <label className="flex items-center gap-3 mb-2 text-xs text-[#5B6472] dark:text-gray-300 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded accent-[#2C4FD6]" checked={policy.otEnabled || false} onChange={e => setPolicy({ ...policy, otEnabled: e.target.checked })} /> Enable Overtime Calculation</label>
                                {policy.otEnabled && (
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">OT Rate Multiplier</label><input type="number" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white text-sm outline-none focus:border-[#2C4FD6]" value={policy.otRate || 2} onChange={e => setPolicy({ ...policy, otRate: parseFloat(e.target.value) })} /></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'WEEKOFFS' && (
                    <div className="space-y-6 max-w-2xl">
                        <div className="flex justify-between items-center pb-4 border-b border-[#E2E6ED] dark:border-gray-800">
                            <div>
                                <h3 className="text-base font-bold text-[#12151C] dark:text-white">Week Off Policy</h3>
                                <p className="text-xs text-[#5B6472] dark:text-gray-400">Configure weekly days off for your organization.</p>
                            </div>
                            <button onClick={savePolicy} disabled={loading} className="inline-flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13.5px] font-semibold px-[15px] py-[9px] transition-all cursor-pointer">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Week Offs
                            </button>
                        </div>
                        <div className="bg-white dark:bg-[#12151C] p-6 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 space-y-6">
                            <div className="space-y-3">
                                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => (
                                    <div key={day} className="flex items-center justify-between p-3 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px]">
                                        <span className="text-sm font-semibold text-[#12151C] dark:text-white">{day}</span>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded accent-[#2C4FD6]"
                                                checked={policy.weekOffs ? policy.weekOffs.includes(idx) : idx === 0}
                                                onChange={(e) => {
                                                    const current = policy.weekOffs || [0];
                                                    const updated = e.target.checked
                                                        ? [...current, idx]
                                                        : current.filter((d: number) => d !== idx);
                                                    setPolicy({ ...policy, weekOffs: updated });
                                                }}
                                            />
                                            <span className="text-xs text-[#5B6472] dark:text-gray-400">Week Off</span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {showShiftModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center">
                            <h3 className="font-bold text-[#12151C] dark:text-white text-sm">Add Shift</h3>
                            <button onClick={() => setShowShiftModal(false)} className="text-[#5B6472] hover:text-[#12151C] dark:hover:text-white"><X size={18} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1 uppercase">Shift Name</label>
                                <input type="text" placeholder="Shift Name" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newShift.name} onChange={e => setNewShift({ ...newShift, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-semibold mb-1 text-[#5B6472] dark:text-gray-300 uppercase">Start Time</label><input type="time" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newShift.startTime} onChange={e => setNewShift({ ...newShift, startTime: e.target.value })} /></div>
                                <div><label className="block text-xs font-semibold mb-1 text-[#5B6472] dark:text-gray-300 uppercase">End Time</label><input type="time" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newShift.endTime} onChange={e => setNewShift({ ...newShift, endTime: e.target.value })} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-semibold mb-1 text-[#5B6472] dark:text-gray-300 uppercase">Break (mins)</label><input type="number" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newShift.breakDuration} onChange={e => setNewShift({ ...newShift, breakDuration: parseInt(e.target.value) })} /></div>
                                <div><label className="block text-xs font-semibold mb-1 text-[#5B6472] dark:text-gray-300 uppercase">Grace In (mins)</label><input type="number" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newShift.graceTime} onChange={e => setNewShift({ ...newShift, graceTime: parseInt(e.target.value) })} /></div>
                            </div>
                            <label className="flex items-center gap-3 text-xs text-[#5B6472] dark:text-gray-300 cursor-pointer"><input type="checkbox" className="w-4 h-4 rounded accent-[#2C4FD6]" checked={newShift.isNightShift} onChange={e => setNewShift({ ...newShift, isNightShift: e.target.checked })} /> Night Shift (Ends Next Day)</label>
                        </div>
                        <div className="p-4 border-t border-[#E2E6ED] dark:border-gray-800 bg-[#F7F8FA] dark:bg-gray-800/30">
                            <button onClick={saveShift} className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-[13.5px] rounded-[6px] transition-all cursor-pointer mt-2">Save Shift</button>
                        </div>
                    </div>
                </div>
            )}

            {showHolidayModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center">
                            <h3 className="font-bold text-[#12151C] dark:text-white text-sm">Add Holiday</h3>
                            <button onClick={() => setShowHolidayModal(false)} className="text-[#5B6472] hover:text-[#12151C] dark:hover:text-white"><X size={18} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Holiday Name</label><input type="text" placeholder="e.g. Independence Day" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} /></div>
                            <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Date</label><input type="date" className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} /></div>
                            <div><label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-300 mb-1">Type</label><select className="w-full px-3 py-2 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#12151C] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]" value={newHoliday.type} onChange={e => setNewHoliday({ ...newHoliday, type: e.target.value })}><option value="PUBLIC">Public Holiday</option><option value="COMPANY">Company Holiday</option></select></div>
                        </div>
                        <div className="p-4 border-t border-[#E2E6ED] dark:border-gray-800 bg-[#F7F8FA] dark:bg-gray-800/30">
                            <button onClick={saveHoliday} className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-[13.5px] rounded-[6px] transition-all cursor-pointer mt-2">Add Holiday</button>
                        </div>
                    </div>
                </div>
            )}

            {deleteModal.isOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-[#0f1016] rounded-[6px] w-full max-w-[calc(100vw-2rem)] sm:max-w-[360px] border-t-4 border-red-600 text-center relative overflow-hidden pb-8 px-5 sm:px-6">
                        <div className="w-20 h-20 bg-[#1c1d26] rounded-full flex items-center justify-center mx-auto mb-6 mt-8">
                            <AlertCircle size={40} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Delete Confirmation</h3>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                            Are you sure you want to delete this {deleteModal.type.toLowerCase()}? This action cannot be undone.
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setDeleteModal({ isOpen: false, id: null, type: 'SHIFT' })}
                                className="flex-1 py-3.5 px-4 bg-[#1c1d26] text-white font-bold rounded-[6px] hover:bg-[#252631] transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-3.5 px-4 bg-[#ff3b3b] text-white font-bold rounded-[6px] hover:bg-[#ff4d4d] transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
