import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Shield, Plus, Edit2, Check, Lock, Trash2, X, Loader2,
    LayoutDashboard, Fingerprint, Users, UsersRound, CalendarRange,
    BarChart3, Settings2, CheckSquare, UserCircle, Calendar, FileSpreadsheet,
    ChevronDown, ChevronUp, CheckCheck, Info, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

interface ModuleDef {
    key: string;
    label: string;
    icon: any;
    description: string;
}

const ALL_MODULES: ModuleDef[] = [
    { key: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard, description: 'Analytics overview and key business metrics' },
    { key: 'ATTENDANCE', label: 'My Attendance', icon: Fingerprint, description: 'Personal punch-in/out and shift attendance logs' },
    { key: 'EMPLOYEE_ATTENDANCE', label: 'Employee Attendance', icon: Calendar, description: 'Organization-wide attendance & shift tracking' },
    { key: 'EMPLOYEE', label: 'Employee List', icon: Users, description: 'Staff directory, onboarding & employee profiles' },
    { key: 'TEAM', label: 'Team', icon: UsersRound, description: 'Department hierarchies & team leadership' },
    { key: 'LEAVE', label: 'Leave', icon: CalendarRange, description: 'Leave requests, quota balances & approvals' },
    { key: 'PAYROLL', label: 'Payroll', icon: FileSpreadsheet, description: 'Salary calculations, payslips & tax deductions' },
    { key: 'REPORTS', label: 'Reports', icon: BarChart3, description: 'HR analytics, attendance & payroll reports' },
    { key: 'MASTERS', label: 'Masters', icon: Settings2, description: 'System-wide organizational masters & statutory' },
    { key: 'TASK', label: 'Task', icon: CheckSquare, description: 'Task assignments and project progress' },
    { key: 'MY_PROFILE', label: 'My Profile', icon: UserCircle, description: 'Personal user profile & credentials' },
];

const MODULE_ALIASES: Record<string, string> = {
    EMPLOYEES: 'EMPLOYEE',
    HR: 'EMPLOYEE',
    SETTINGS: 'MASTERS',
    ADMIN: 'MASTERS',
};

const normalizeModuleKey = (key: string): string => {
    const upper = String(key || '').trim().toUpperCase();
    return MODULE_ALIASES[upper] || upper;
};

const VALID_MODULE_KEYS = new Set(ALL_MODULES.map(m => m.key));

const moduleLabels: Record<string, string> = ALL_MODULES.reduce((acc, m) => {
    acc[m.key] = m.label;
    return acc;
}, {} as Record<string, string>);

const parseModuleList = (raw: string | string[] | null | undefined): string[] => {
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : String(raw).split(',');
    const normalized = arr
        .map(normalizeModuleKey)
        .filter(m => VALID_MODULE_KEYS.has(m));
    return Array.from(new Set(normalized));
};

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
    const [expandedModules, setExpandedModules] = useState<string[]>([]);

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
        const rolePermIds = role.permissions ? role.permissions.map((p: any) => p.id) : [];
        const roleMods = parseModuleList(role.accessibleModules);
        
        setSelectedPermissions(rolePermIds);
        setSelectedModules(roleMods);
        // Expand all enabled modules by default for easy review
        setExpandedModules(roleMods);
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingRole(null);
        setRoleName('');
        setSelectedPermissions([]);
        setSelectedModules(['DASHBOARD']);
        setExpandedModules(['DASHBOARD']);
        setShowModal(true);
    };

    const toggleModuleAccess = (moduleKey: string) => {
        if (selectedModules.includes(moduleKey)) {
            // Module is being unselected/disabled
            const newModules = selectedModules.filter(m => m !== moduleKey);
            setSelectedModules(newModules);
            // Remove granular permissions belonging to this disabled module
            const modulePermIds = permissions
                .filter(p => p.module?.toUpperCase() === moduleKey.toUpperCase())
                .map(p => p.id);
            setSelectedPermissions(prev => prev.filter(id => !modulePermIds.includes(id)));
            // Collapse it
            setExpandedModules(prev => prev.filter(m => m !== moduleKey));
        } else {
            // Module is being selected/enabled -> unlock its granular permissions!
            const newModules = [...selectedModules, moduleKey];
            setSelectedModules(newModules);
            // Automatically expand the newly enabled module
            setExpandedModules(prev => Array.from(new Set([...prev, moduleKey])));
        }
    };

    const toggleModuleExpansion = (moduleKey: string) => {
        setExpandedModules(prev =>
            prev.includes(moduleKey) ? prev.filter(m => m !== moduleKey) : [...prev, moduleKey]
        );
    };

    const togglePermission = (id: string) => {
        if (selectedPermissions.includes(id)) {
            setSelectedPermissions(selectedPermissions.filter(pid => pid !== id));
        } else {
            setSelectedPermissions([...selectedPermissions, id]);
        }
    };

    const selectAllForModule = (moduleKey: string) => {
        const modulePerms = permissions.filter(p => p.module?.toUpperCase() === moduleKey.toUpperCase());
        const modulePermIds = modulePerms.map(p => p.id);
        setSelectedPermissions(prev => Array.from(new Set([...prev, ...modulePermIds])));
    };

    const deselectAllForModule = (moduleKey: string) => {
        const modulePerms = permissions.filter(p => p.module?.toUpperCase() === moduleKey.toUpperCase());
        const modulePermIds = modulePerms.map(p => p.id);
        setSelectedPermissions(prev => prev.filter(id => !modulePermIds.includes(id)));
    };

    const handleSelectAllModules = () => {
        const allKeys = ALL_MODULES.map(m => m.key);
        setSelectedModules(allKeys);
        setExpandedModules(allKeys);
    };

    const handleDeselectAllModules = () => {
        setSelectedModules([]);
        setSelectedPermissions([]);
        setExpandedModules([]);
    };

    const handleGrantAllEnabledPermissions = () => {
        const activePerms = permissions
            .filter(p => selectedModules.includes(p.module?.toUpperCase()))
            .map(p => p.id);
        setSelectedPermissions(activePerms);
    };

    const handleClearAllPermissions = () => {
        setSelectedPermissions([]);
    };

    const handleSave = async () => {
        if (!roleName.trim()) return toast.error("Role Name is required");
        if (selectedModules.length === 0) return toast.error("Please enable at least one module for this role");

        // Filter permissions strictly by selected modules before sending
        const validPermissionIds = permissions
            .filter(p => selectedModules.includes(p.module?.toUpperCase()) && selectedPermissions.includes(p.id))
            .map(p => p.id);

        const payload = {
            name: roleName.trim(),
            permissionIds: validPermissionIds,
            accessibleModules: selectedModules.join(',')
        };

        try {
            setLoading(true);
            if (editingRole) {
                await api.put(`/masters/roles/${editingRole.id}`, payload);
                toast.success(`Role "${roleName}" updated successfully!`);
            } else {
                await api.post('/masters/roles', payload);
                toast.success(`Role "${roleName}" created successfully!`);
            }
            setShowModal(false);
            fetchRoles();
        } catch (e: any) {
            toast.error(e.response?.data?.error || "Failed to save role");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            setLoading(true);
            await api.delete(`/masters/roles/${itemToDelete.id}`);
            toast.success(`${itemToDelete.name} deleted successfully!`);
            fetchRoles();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to delete role");
        } finally {
            setItemToDelete(null);
            setLoading(false);
        }
    };

    // Group permissions by module
    const permissionsByModule = permissions.reduce((acc: any, p: any) => {
        const mod = (p.module || 'OTHER').toUpperCase();
        if (!acc[mod]) acc[mod] = [];
        acc[mod].push(p);
        return acc;
    }, {});

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-inner">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Role & Access Control</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Configure role boundaries, module access, and granular functional permissions</p>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-brand-500/20"
                >
                    <Plus size={16} /> Create Role
                </button>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(role => {
                    const activeMods = parseModuleList(role.accessibleModules);
                    const permCount = role.permissions?.length || 0;

                    return (
                        <div key={role.id} className="group bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-6 relative hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
                            <div>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                                            {role.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{role.name}</h3>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 mt-0.5">
                                                <Shield size={12} /> {permCount} Granular {permCount === 1 ? 'Permission' : 'Permissions'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(role)}
                                            className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
                                            title="Edit Role & Permissions"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => setItemToDelete({ id: role.id, name: role.name })}
                                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete Role"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Top Permissions */}
                                <div className="space-y-1.5 bg-gray-50/70 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50 mb-4">
                                    <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                                        <span>Permissions</span>
                                        <span>{permCount} Total</span>
                                    </div>
                                    {role.permissions?.slice(0, 3).map((p: any) => (
                                        <div key={p.id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 truncate">
                                            <Check size={13} className="text-green-500 shrink-0" />
                                            <span className="truncate">{p.name}</span>
                                        </div>
                                    ))}
                                    {permCount > 3 && (
                                        <div className="text-xs text-brand-600 dark:text-brand-400 font-semibold pl-5 pt-0.5">
                                            + {permCount - 3} more granted
                                        </div>
                                    )}
                                    {permCount === 0 && (
                                        <div className="text-xs text-gray-400 italic flex items-center gap-1.5 py-1">
                                            <Lock size={13} /> No granular permissions assigned
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Module Access Badges */}
                            <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                        Module Access ({activeMods.length})
                                    </h4>
                                </div>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                                    {activeMods.length > 0 ? (
                                        activeMods.map((moduleKey: string) => (
                                            <span
                                                key={moduleKey}
                                                className="text-[10px] bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 px-2.5 py-1 rounded-md font-semibold border border-brand-200/50 dark:border-brand-500/20 shadow-2xs"
                                            >
                                                {moduleLabels[moduleKey] || moduleKey}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">No modules enabled</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Role Modal */}
            {showModal && createPortal(
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-scale-in">
                        {/* Modal Header */}
                        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                                    <Shield size={22} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Role'}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Enable modules to open and configure their specific granular permissions
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-gray-900/40 space-y-6">
                            {/* Role Name */}
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                                    Role Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-sm font-medium"
                                    value={roleName}
                                    onChange={e => setRoleName(e.target.value)}
                                    placeholder="e.g. HR Manager, Team Lead, Payroll Executive"
                                />
                            </div>

                            {/* Section 1: Module Access */}
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                            <span>1. Module Access</span>
                                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 font-semibold">
                                                {selectedModules.length} of {ALL_MODULES.length} Enabled
                                            </span>
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            Click any module to enable it. Enabling a module will open its granular permissions below.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllModules}
                                            className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 px-2.5 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
                                        >
                                            Select All
                                        </button>
                                        <span className="text-gray-300 dark:text-gray-600">|</span>
                                        <button
                                            type="button"
                                            onClick={handleDeselectAllModules}
                                            className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-gray-400 px-2.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            Deselect All
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {ALL_MODULES.map(module => {
                                        const isSelected = selectedModules.includes(module.key);
                                        const Icon = module.icon;
                                        const modulePerms = permissions.filter(p => p.module?.toUpperCase() === module.key.toUpperCase());
                                        const activeModulePerms = modulePerms.filter(p => selectedPermissions.includes(p.id));

                                        return (
                                            <div
                                                key={module.key}
                                                onClick={() => toggleModuleAccess(module.key)}
                                                className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-200 flex items-start gap-3 select-none relative ${isSelected
                                                    ? 'bg-brand-50/70 border-brand-300 dark:bg-brand-900/30 dark:border-brand-500/40 shadow-sm ring-1 ring-brand-500/20'
                                                    : 'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 opacity-75 hover:opacity-100'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {}} // handled by parent div onClick
                                                    className="mt-0.5 w-4 h-4 rounded text-brand-600 focus:ring-brand-500 pointer-events-none shrink-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <Icon size={15} className={isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'} />
                                                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-brand-900 dark:text-brand-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                {module.label}
                                                            </span>
                                                        </div>
                                                        {isSelected && (
                                                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 shrink-0">
                                                                {modulePerms.length > 0 ? `${activeModulePerms.length}/${modulePerms.length}` : 'Active'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                        {module.description}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 2: Granular Permissions (Only for Enabled Modules) */}
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                            <span>2. Granular Permissions</span>
                                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-semibold">
                                                {selectedPermissions.length} Granted
                                            </span>
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            Configure action-level controls (View, Create, Edit, Delete, Approve, Regularize) for each enabled module.
                                        </p>
                                    </div>
                                    {selectedModules.length > 0 && (
                                        <div className="flex items-center gap-2 self-end sm:self-auto">
                                            <button
                                                type="button"
                                                onClick={handleGrantAllEnabledPermissions}
                                                className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 px-2.5 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors flex items-center gap-1"
                                            >
                                                <CheckCheck size={14} /> Grant All Active
                                            </button>
                                            <span className="text-gray-300 dark:text-gray-600">|</span>
                                            <button
                                                type="button"
                                                onClick={handleClearAllPermissions}
                                                className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-gray-400 px-2.5 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* If No Modules Enabled */}
                                {selectedModules.length === 0 ? (
                                    <div className="text-center py-10 px-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                        <div className="w-12 h-12 mx-auto rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3">
                                            <Info size={24} />
                                        </div>
                                        <h5 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">No Modules Selected</h5>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                            Select one or more modules in <strong>Section 1: Module Access</strong> above. When you click a module, its granular permission panel will open here.
                                        </p>
                                    </div>
                                ) : (
                                    /* Render only enabled modules */
                                    <div className="space-y-4">
                                        {selectedModules.map(moduleKey => {
                                            const moduleDef = ALL_MODULES.find(m => m.key === moduleKey);
                                            const moduleName = moduleDef?.label || moduleKey;
                                            const Icon = moduleDef?.icon || Shield;
                                            const modulePerms = permissionsByModule[moduleKey] || [];
                                            const isExpanded = expandedModules.includes(moduleKey);

                                            const selectedInModule = modulePerms.filter((p: any) => selectedPermissions.includes(p.id));
                                            const allSelected = modulePerms.length > 0 && selectedInModule.length === modulePerms.length;

                                            return (
                                                <div
                                                    key={moduleKey}
                                                    className="bg-white dark:bg-gray-850 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-2xs overflow-hidden transition-all duration-200"
                                                >
                                                    {/* Module Accordion Header */}
                                                    <div className="p-4 bg-gray-50/80 dark:bg-gray-800/80 flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700">
                                                        <div
                                                            className="flex items-center gap-3 cursor-pointer flex-1 select-none"
                                                            onClick={() => toggleModuleExpansion(moduleKey)}
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                                                                <Icon size={16} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h5 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                                                                        {moduleName}
                                                                    </h5>
                                                                    {modulePerms.length > 0 && (
                                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${allSelected
                                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                                            : selectedInModule.length > 0
                                                                                ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                                                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                                                            }`}>
                                                                            {selectedInModule.length} of {modulePerms.length} Enabled
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                                    {moduleDef?.description}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {modulePerms.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (allSelected) {
                                                                            deselectAllForModule(moduleKey);
                                                                        } else {
                                                                            selectAllForModule(moduleKey);
                                                                        }
                                                                    }}
                                                                    className="text-[11px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 px-2.5 py-1 rounded-md hover:bg-brand-50 dark:hover:bg-brand-900/40 transition-colors"
                                                                >
                                                                    {allSelected ? 'Deselect All' : 'Select All'}
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleModuleExpansion(moduleKey)}
                                                                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                                            >
                                                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Module Granular Permissions Body */}
                                                    {isExpanded && (
                                                        <div className="p-4 bg-white dark:bg-gray-800">
                                                            {modulePerms.length > 0 ? (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                    {modulePerms.map((p: any) => {
                                                                        const isChecked = selectedPermissions.includes(p.id);
                                                                        return (
                                                                            <label
                                                                                key={p.id}
                                                                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 select-none ${isChecked
                                                                                    ? 'bg-brand-50/60 border-brand-300 dark:bg-brand-900/20 dark:border-brand-500/30 ring-1 ring-brand-500/10'
                                                                                    : 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600'
                                                                                    }`}
                                                                            >
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="mt-0.5 w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                                                                                    checked={isChecked}
                                                                                    onChange={() => togglePermission(p.id)}
                                                                                />
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="text-xs font-bold text-gray-900 dark:text-white leading-tight mb-1 truncate">
                                                                                        {p.name}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                                        <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                                                            {p.code}
                                                                                        </span>
                                                                                    </div>
                                                                                    {p.description && (
                                                                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight line-clamp-2">
                                                                                            {p.description}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 italic py-2 px-1">
                                                                    <Check size={14} className="text-green-500" />
                                                                    <span>Full module-level access enabled. No additional granular sub-permissions are required for this module.</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 shadow-xl">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-bold text-gray-800 dark:text-gray-200">{selectedModules.length}</span> modules active &bull; <span className="font-bold text-gray-800 dark:text-gray-200">{selectedPermissions.length}</span> permissions granted
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 text-xs text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="px-7 py-2.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
                                >
                                    {loading && <Loader2 size={15} className="animate-spin" />}
                                    Save Role & Permissions
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Delete Confirmation Modal */}
            {itemToDelete && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-[2px] p-4 animate-fade-in">
                    <div className="bg-[#0f1016] rounded-2xl shadow-2xl w-full max-w-[360px] border-t-4 border-red-600 text-center relative overflow-hidden pb-8 px-6">
                        <div className="w-20 h-20 bg-[#1c1d26] rounded-full flex items-center justify-center mx-auto mb-6 mt-8">
                            <Trash2 size={32} className="text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Delete Role?</h3>
                        <p className="text-[#8a8b94] mb-8 text-sm leading-relaxed px-2">
                            Are you sure you want to delete <span className="font-bold text-gray-200">{itemToDelete.name}</span>? <br />
                            This action cannot be undone and will permanently remove all associated permissions.
                        </p>
                        <div className="flex gap-4 px-2">
                            <button
                                onClick={() => setItemToDelete(null)}
                                className="flex-1 py-3.5 px-4 bg-[#1c1d26] text-white font-bold rounded-xl hover:bg-[#252631] transition-all active:scale-95 text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 py-3.5 px-4 bg-[#ff3b3b] text-white font-bold rounded-xl hover:bg-[#ff4d4d] transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2 text-xs"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

