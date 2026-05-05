import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Check, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function AccessMasters() {
    const [roles, setRoles] = useState<any[]>([]);
    const [permissions, setPermissions] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [editingRole, setEditingRole] = useState<any>(null);
    const [roleName, setRoleName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [selectedModules, setSelectedModules] = useState<string[]>([]);

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

        const payload = { name: roleName, permissionIds: selectedPermissions };

        try {
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
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Shield className="text-brand-600" size={24} />
                    <h2 className="text-xl font-bold dark:text-white">Access Control</h2>
                </div>
                <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium">
                    <Plus size={16} /> Create Role
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(role => (
                    <div key={role.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 relative group hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg dark:text-white">{role.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{role.permissions.length} Permissions Assigned</p>
                            </div>
                            <button onClick={() => handleEdit(role)} className="p-2 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                                <Edit2 size={16} />
                            </button>
                        </div>

                        <div className="space-y-2">
                            {role.permissions.slice(0, 3).map((p: any) => (
                                <div key={p.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                    <Check size={12} className="text-green-500" /> {p.name}
                                </div>
                            ))}
                            {role.permissions.length > 3 && (
                                <div className="text-xs text-brand-600 dark:text-brand-400 font-medium pl-5">
                                    + {role.permissions.length - 3} more...
                                </div>
                            )}
                            {role.permissions.length === 0 && (
                                <div className="text-xs text-gray-400 italic flex items-center gap-1">
                                    <Lock size={12} /> No specific permissions
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Role Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-xl font-bold dark:text-white">{editingRole ? 'Edit Role' : 'Create Role'}</h3>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Role Name</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    value={roleName}
                                    onChange={e => setRoleName(e.target.value)}
                                    placeholder="e.g. HR Manager"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Module Access</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {['DASHBOARD', 'ATTENDANCE', 'EMPLOYEE', 'TEAM', 'LEAVE', 'REPORTS', 'MASTERS', 'TASK'].map(module => (
                                        <label key={module} className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${(editingRole?.accessibleModules || '').includes(module) || (selectedModules || []).includes(module)
                                            ? 'bg-brand-50 border-brand-200 dark:bg-brand-900/20'
                                            : 'border-gray-200 dark:border-gray-700'
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
                                                className="rounded text-brand-600"
                                            />
                                            <span className="text-sm font-medium capitalize">{module.toLowerCase()}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2 dark:border-gray-700">Permissions</h4>
                                {Object.keys(permissionsByModule).map(module => {
                                    const modulePermissions = permissionsByModule[module];
                                    const allSelected = modulePermissions.every((p: any) => selectedPermissions.includes(p.id));

                                    const toggleModule = () => {
                                        if (allSelected) {
                                            // Deselect all
                                            const idsToRemove = modulePermissions.map((p: any) => p.id);
                                            setSelectedPermissions(selectedPermissions.filter(id => !idsToRemove.includes(id)));
                                        } else {
                                            // Select all
                                            const idsToAdd = modulePermissions.map((p: any) => p.id).filter((id: string) => !selectedPermissions.includes(id));
                                            setSelectedPermissions([...selectedPermissions, ...idsToAdd]);
                                        }
                                    };

                                    return (
                                        <div key={module} className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                            <div className="flex justify-between items-center mb-3">
                                                <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{module}</h5>
                                                <button onClick={toggleModule} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                                                    {allSelected ? 'Deselect All' : 'Select All'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {modulePermissions.map((p: any) => (
                                                    <label key={p.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedPermissions.includes(p.id) ? 'bg-white border-brand-200 shadow-sm dark:bg-brand-900/20 dark:border-brand-500/30' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                                                        <input
                                                            type="checkbox"
                                                            className="mt-1 rounded text-brand-600 focus:ring-brand-500"
                                                            checked={selectedPermissions.includes(p.id)}
                                                            onChange={() => togglePermission(p.id)}
                                                        />
                                                        <div>
                                                            <div className="text-sm font-medium dark:text-white">{p.name}</div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">{p.code}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white font-medium">Cancel</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium shadow-sm">Save Role</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
