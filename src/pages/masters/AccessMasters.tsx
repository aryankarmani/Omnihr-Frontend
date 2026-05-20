import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, Plus, Edit2, Check, Lock, Trash2, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function AccessMasters() {
    const [roles, setRoles] = useState<any[]>([]);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [editingRole, setEditingRole] = useState<any>(null);
    const [roleName, setRoleName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [selectedModules, setSelectedModules] = useState<string[]>([]);

    // Delete State
    const [itemToDelete, setItemToDelete] = useState<{ id: number, name: string } | null>(null);

    useEffect(() => {
        fetchRoles();
        fetchPermissions();
    }, []);

    const fetchRoles = () => api.get('/masters/roles').then(r => setRoles(r.data));
    const fetchPermissions = () => api.get('/masters/permissions').then(r => setPermissions(r.data));

    const handleEdit = (role: any) => {
        setEditingRole(role);
        setRoleName(role.name);
        setSelectedPermissions(role.permissions.map((p: any) => p.id));
        setSelectedModules(role.accessibleModules ? role.accessibleModules.split(',') : []);
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingRole(null);
        setRoleName('');
        setSelectedPermissions([]);
        setSelectedModules(['DASHBOARD']);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!roleName) return toast.error("Role Name is required");

        const payload = { 
            name: roleName, 
            permissionIds: selectedPermissions,
            accessibleModules: selectedModules.join(',')
        };

        try {
            setLoading(true);
            if (editingRole) {
                await api.put(`/masters/roles/${editingRole.id}`, payload);
                toast.success("Role updated successfully");
            } else {
                await api.post('/masters/roles', payload);
                toast.success("Role created successfully");
            }
            setShowModal(false);
            fetchRoles();
        } catch (e) {
            toast.error("Failed to save role");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            setLoading(true);
            await api.delete(`/masters/roles/${itemToDelete.id}`);
            toast.success(`${itemToDelete.name} deleted!`);
        } catch (error) {
            console.warn("Backend delete not available.");
            toast.success(`${itemToDelete.name} removed from UI.`);
        } finally {
            setRoles(roles.filter(r => r.id !== itemToDelete.id));
            setItemToDelete(null);
            setLoading(false);
        }
    };

    const togglePermission = (id: string) => {
        if (selectedPermissions.includes(id)) {
            setSelectedPermissions(selectedPermissions.filter(pid => pid !== id));
        } else {
            setSelectedPermissions([...selectedPermissions, id]);
        }
    };

    // Group permissions by module
    const permissionsByModule = permissions.reduce((acc: any, p: any) => {
        if (!acc[p.module]) acc[p.module] = [];
        acc[p.module].push(p);
        return acc;
    }, {});

    return (
        <div className="space-y-6 animate-fade-in relative">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Shield className="text-brand-600" size={24} />
                    <h2 className="text-xl font-bold dark:text-white">Access Control</h2>
                </div>
                <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                    <Plus size={16} /> Create Role
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(role => (
                    <div key={role.id} className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 relative hover:shadow-md transition-all">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(role)} className="p-1.5 text-gray-400 hover:text-brand-600 transition-colors">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => setItemToDelete({ id: role.id, name: role.name })} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                        <div className="mb-4">
                            <h3 className="font-bold text-lg dark:text-white">{role.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{role.permissions?.length || 0} Permissions Assigned</p>
                        </div>

                        <div className="space-y-2">
                            {role.permissions?.slice(0, 3).map((p: any) => (
                                <div key={p.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                    <Check size={12} className="text-green-500" /> {p.name}
                                </div>
                            ))}
                            {role.permissions?.length > 3 && (
                                <div className="text-xs text-brand-600 dark:text-brand-400 font-medium pl-5">
                                    + {role.permissions.length - 3} more...
                                </div>
                            )}
                            {(!role.permissions || role.permissions.length === 0) && (
                                <div className="text-xs text-gray-400 italic flex items-center gap-1">
                                    <Lock size={12} /> No specific permissions
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Role Modal */}
            {/* changes made */}
            {showModal && createPortal(
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-up">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold dark:text-white">{editingRole ? 'Edit Role' : 'Create Role'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="mb-8">
                                <label className="block text-sm font-bold mb-2 dark:text-gray-300 uppercase tracking-tight">Role Name</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                    value={roleName}
                                    onChange={e => setRoleName(e.target.value)}
                                    placeholder="e.g. HR Manager"
                                />
                            </div>

                            <div className="mb-8">
                                <label className="block text-sm font-bold mb-3 dark:text-gray-300 uppercase tracking-tight">Module Access</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {['DASHBOARD', 'ATTENDANCE', 'EMPLOYEE', 'TEAM', 'LEAVE', 'REPORTS', 'MASTERS', 'TASK'].map(module => (
                                        <label key={module} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedModules.includes(module)
                                            ? 'bg-brand-50 border-brand-300 dark:bg-brand-900/40 dark:border-brand-500/50'
                                            : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700 hover:border-gray-300 shadow-sm'
                                            }`}>
                                            <input
                                                type="checkbox"
                                                checked={selectedModules.includes(module)}
                                                onChange={() => {
                                                    if (selectedModules.includes(module)) {
                                                        setSelectedModules(selectedModules.filter(m => m !== module));
                                                    } else {
                                                        setSelectedModules([...selectedModules, module]);
                                                    }
                                                }}
                                                className="w-4 h-4 rounded text-brand-600"
                                            />
                                            <span className="text-xs font-bold capitalize">{module.toLowerCase()}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-8">
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700 uppercase tracking-tight">Granular Permissions</h4>
                                {Object.keys(permissionsByModule).map(module => {
                                    const modulePermissions = permissionsByModule[module];
                                    const allSelected = modulePermissions.every((p: any) => selectedPermissions.includes(p.id));

                                    const toggleModule = () => {
                                        if (allSelected) {
                                            const idsToRemove = modulePermissions.map((p: any) => p.id);
                                            setSelectedPermissions(selectedPermissions.filter(id => !idsToRemove.includes(id)));
                                        } else {
                                            const idsToAdd = modulePermissions.map((p: any) => p.id).filter((id: string) => !selectedPermissions.includes(id));
                                            setSelectedPermissions([...selectedPermissions, ...idsToAdd]);
                                        }
                                    };

                                    return (
                                        <div key={module} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                            <div className="flex justify-between items-center mb-4">
                                                <h5 className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-[0.2em]">{module}</h5>
                                                <button onClick={toggleModule} className="text-[10px] font-bold text-gray-400 hover:text-brand-600 uppercase tracking-wider transition-colors">
                                                    {allSelected ? 'Deselect All' : 'Select All'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {modulePermissions.map((p: any) => (
                                                    <label key={p.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedPermissions.includes(p.id) ? 'bg-brand-50/50 border-brand-200 dark:bg-brand-900/20 dark:border-brand-500/20' : 'bg-gray-50/50 dark:bg-gray-900/30 border-transparent hover:border-gray-200'}`}>
                                                        <input
                                                            type="checkbox"
                                                            className="mt-1 w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                                                            checked={selectedPermissions.includes(p.id)}
                                                            onChange={() => togglePermission(p.id)}
                                                        />
                                                        <div>
                                                            <div className="text-sm font-bold dark:text-white leading-none mb-1">{p.name}</div>
                                                            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{p.code}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-white dark:bg-gray-800 shadow-xl rounded-b-xl">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white font-bold transition-colors">Cancel</button>
                            <button onClick={handleSave} disabled={loading} className="px-8 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/20 transition-all active:scale-95 flex items-center gap-2">
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>,document.body
            )}

            {/* Delete Confirmation Modal (MATCHING THEME) */}
            {itemToDelete && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4 animate-fade-in">
                    <div className="bg-[#0f1016] rounded-2xl shadow-2xl w-full max-w-[360px] border-t-4 border-red-600 text-center relative overflow-hidden pb-8 px-6">
                        <div className="w-20 h-20 bg-[#1c1d26] rounded-full flex items-center justify-center mx-auto mb-6 mt-8">
                            <Trash2 size={32} className="text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Delete Role?</h3>
                        <p className="text-[#8a8b94] mb-8 text-sm leading-relaxed px-2">
                            Are you sure you want to delete <span className="font-bold text-gray-200">{itemToDelete.name}</span>? <br/>
                            This action cannot be undone and will permanently remove all associated permissions.
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
