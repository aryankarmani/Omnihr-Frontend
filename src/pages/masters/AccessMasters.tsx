import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Shield, Plus, Edit2, Check, Lock, Trash2, X, Loader2,
    LayoutDashboard, Fingerprint, Users, UsersRound, CalendarRange,
    BarChart3, Settings2, CheckSquare, UserCircle, Calendar, FileSpreadsheet,
    ChevronDown, ChevronUp, CheckCheck, Info, Sparkles, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

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

const parseModuleList = (raw: string | string[] | null | undefined): string[] => {
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : String(raw).split(',');
    const normalized = arr
        .map(normalizeModuleKey)
        .filter(m => VALID_MODULE_KEYS.has(m));
    return Array.from(new Set(normalized));
};

export default function AccessMasters() {
    const auth = useAuth() as any;
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
        setRoleName(role.name === 'HR_ADMIN' ? 'ADMIN' : role.name);
        const rolePermIds = role.permissions ? role.permissions.map((p: any) => p.id) : [];
        const roleMods = parseModuleList(role.accessibleModules);

        setSelectedPermissions(rolePermIds);
        setSelectedModules(roleMods);
        // Expand all currently enabled modules
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
        const isCurrentlySelected = selectedModules.includes(moduleKey);

        if (isCurrentlySelected) {
            // Disable module: remove from selectedModules
            const newModules = selectedModules.filter(m => m !== moduleKey);
            setSelectedModules(newModules);

            // Automatically purge all granular permissions belonging to this disabled module
            const modulePermIds = permissions
                .filter(p => normalizeModuleKey(p.module) === moduleKey)
                .map(p => p.id);
            setSelectedPermissions(prev => prev.filter(id => !modulePermIds.includes(id)));

            // Collapse module accordion
            setExpandedModules(prev => prev.filter(m => m !== moduleKey));
        } else {
            // Enable module: add to selectedModules
            const newModules = [...selectedModules, moduleKey];
            setSelectedModules(newModules);

            // Automatically expand newly enabled module to configure granular permissions
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
        const modulePerms = permissions.filter(p => normalizeModuleKey(p.module) === moduleKey);
        const modulePermIds = modulePerms.map(p => p.id);
        setSelectedPermissions(prev => Array.from(new Set([...prev, ...modulePermIds])));
    };

    const deselectAllForModule = (moduleKey: string) => {
        const modulePerms = permissions.filter(p => normalizeModuleKey(p.module) === moduleKey);
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

    const handleGrantAllActivePermissions = () => {
        const activePerms = permissions
            .filter(p => selectedModules.includes(normalizeModuleKey(p.module)))
            .map(p => p.id);
        setSelectedPermissions(activePerms);
    };

    const handleClearAllPermissions = () => {
        setSelectedPermissions([]);
    };

    const handleSave = async () => {
        if (!roleName.trim()) {
            return toast.error("Role Name is required");
        }
        if (selectedModules.length === 0) {
            return toast.error("Please enable at least one module under Module Access");
        }

        // Filter permissions strictly by enabled modules before sending
        const validPermissionIds = permissions
            .filter(p => selectedModules.includes(normalizeModuleKey(p.module)) && selectedPermissions.includes(p.id))
            .map(p => p.id);

        let finalRoleName = roleName.trim();
        // If editing HR_ADMIN and user retained "ADMIN", preserve 'HR_ADMIN' for internal consistency
        if (editingRole?.name === 'HR_ADMIN' && finalRoleName.toUpperCase() === 'ADMIN') {
            finalRoleName = 'HR_ADMIN';
        }

        const payload = {
            name: finalRoleName,
            permissionIds: validPermissionIds,
            accessibleModules: selectedModules.join(',')
        };

        try {
            setLoading(true);
            const displayName = finalRoleName === 'HR_ADMIN' ? 'ADMIN' : finalRoleName;
            if (editingRole) {
                await api.put(`/masters/roles/${editingRole.id}`, payload);
                toast.success(`Role "${displayName}" updated successfully!`);
            } else {
                await api.post('/masters/roles', payload);
                toast.success(`Role "${displayName}" created successfully!`);
            }

            // Immediately synchronize current active session and notify the system
            if (typeof auth?.refreshUser === 'function') {
                await auth.refreshUser();
            }
            window.dispatchEvent(new Event('auth_user_updated'));

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

            // Synchronize active session if current user was affected
            if (typeof auth?.refreshUser === 'function') {
                await auth.refreshUser();
            }
            window.dispatchEvent(new Event('auth_user_updated'));

            fetchRoles();
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to delete role");
        } finally {
            setItemToDelete(null);
            setLoading(false);
        }
    };

    // Group permissions by normalized module key
    const permissionsByModule = permissions.reduce((acc: Record<string, any[]>, p: any) => {
        const mod = normalizeModuleKey(p.module || 'OTHER');
        if (!acc[mod]) acc[mod] = [];
        acc[mod].push(p);
        return acc;
    }, {});

    // Count of currently active granular permissions
    const activePermissionCount = permissions.filter(
        p => selectedModules.includes(normalizeModuleKey(p.module)) && selectedPermissions.includes(p.id)
    ).length;

    return (
        <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6 sm:p-8 space-y-6 animate-fade-in relative">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#2C4FD6]/10 text-[#2C4FD6] rounded-[6px]">
                        <Shield size={22} />
                    </div>
                    <div>
                        <h2 className="text-[16px] font-bold text-[#12151C] dark:text-white flex items-center gap-2">
                            Access Control & Role Management
                        </h2>
                        <p className="text-[12px] text-[#717E95] dark:text-gray-400">
                            Configure module visibility and granular permissions for Admins, Employees, and Custom Roles
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13.5px] font-semibold px-[16px] py-[9px] transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
                >
                    <Plus size={16} /> Create Role
                </button>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map(role => {
                    const roleMods = parseModuleList(role.accessibleModules);
                    const permCount = role.permissions?.length || 0;

                    return (
                        <div
                            key={role.id}
                            className="group bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-[8px] p-6 relative transition-all hover:border-[#2C4FD6]/40 hover:shadow-md flex flex-col justify-between"
                        >
                            <div>
                                <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(role)}
                                        title="Edit Role"
                                        className="p-1.5 text-[#9AA3B1] hover:text-[#2C4FD6] hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors cursor-pointer"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => setItemToDelete({ id: role.id, name: role.name === 'HR_ADMIN' ? 'ADMIN' : role.name })}
                                        title="Delete Role"
                                        className="p-1.5 text-[#9AA3B1] hover:text-[#DE350B] hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="mb-4 pr-14">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-[14px] font-bold text-[#12151C] dark:text-white">{role.name === 'HR_ADMIN' ? 'ADMIN' : role.name}</h3>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8ECFC] text-[#2C4FD6] dark:bg-blue-950/60 dark:text-blue-300">
                                            {roleMods.length} Modules
                                        </span>
                                    </div>
                                    <p className="text-[11.5px] font-medium text-[#717E95] dark:text-gray-400 mt-1">
                                        {permCount} Granular Permission{permCount === 1 ? '' : 's'} Active
                                    </p>
                                </div>

                                {/* Accessible Modules Badges */}
                                <div className="mb-4">
                                    <div className="text-[10.5px] font-semibold text-[#9AA3B1] uppercase tracking-wider mb-2">Accessible Modules</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {roleMods.length > 0 ? (
                                            roleMods.map(mKey => {
                                                const mDef = ALL_MODULES.find(m => m.key === mKey);
                                                const Icon = mDef?.icon || Shield;
                                                return (
                                                    <span
                                                        key={mKey}
                                                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                                                    >
                                                        <Icon size={12} className="text-[#2C4FD6]" />
                                                        {mDef?.label || mKey}
                                                    </span>
                                                );
                                            })
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">No module access configured</span>
                                        )}
                                    </div>
                                </div>

                                {/* Granular Permissions Preview */}
                                <div className="space-y-1.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                                    <div className="text-[10.5px] font-semibold text-[#9AA3B1] uppercase tracking-wider mb-1.5">Granular Permissions</div>
                                    {role.permissions?.slice(0, 3).map((p: any) => (
                                        <div key={p.id} className="flex items-center gap-2 text-xs text-[#5B6472] dark:text-gray-300">
                                            <Check size={12} className="text-[#1F8A5A] shrink-0" />
                                            <span className="truncate">{p.name}</span>
                                        </div>
                                    ))}
                                    {role.permissions?.length > 3 && (
                                        <div className="text-xs text-[#2C4FD6] dark:text-blue-400 font-semibold pl-5 pt-0.5">
                                            + {role.permissions.length - 3} more permissions...
                                        </div>
                                    )}
                                    {(!role.permissions || role.permissions.length === 0) && (
                                        <div className="text-xs text-[#9AA3B1] italic flex items-center gap-1.5">
                                            <Lock size={12} /> No specific granular permissions
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create / Edit Role Modal */}
            {showModal && createPortal(
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md">
                    <div className="bg-white dark:bg-[#12151C] rounded-[8px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-5xl max-h-[92vh] flex flex-col animate-scale-in shadow-2xl">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-white/5 rounded-t-[8px]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#2C4FD6] text-white rounded-[6px]">
                                    <Shield size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[#12151C] dark:text-white">
                                        {editingRole ? `Edit Role: ${editingRole.name === 'HR_ADMIN' ? 'ADMIN' : editingRole.name}` : 'Create New Access Role'}
                                    </h3>
                                    <p className="text-[12px] text-[#717E95] dark:text-gray-400">
                                        Select modules to unlock and configure their granular permissions
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-8 bg-gray-50/40 dark:bg-[#0E1015]">
                            {/* Role Name */}
                            <div className="bg-white dark:bg-[#12151C] p-5 rounded-[8px] border border-[#E2E6ED] dark:border-gray-800 shadow-sm">
                                <label className="block text-xs font-bold text-[#5B6472] dark:text-gray-300 mb-2 uppercase tracking-wide">
                                    Role Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3.5 py-2.5 border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] bg-white dark:bg-[#181B24] text-[14px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6] focus:ring-1 focus:ring-[#2C4FD6] transition-all font-medium placeholder:text-gray-400"
                                    value={roleName}
                                    onChange={e => setRoleName(e.target.value)}
                                    placeholder="e.g. ADMIN, EMPLOYEE, PAYROLL_EXECUTIVE, TEAM_LEAD"
                                />
                                <p className="text-[11.5px] text-[#717E95] dark:text-gray-400 mt-2">
                                    Use standard names like <span className="font-semibold text-[#2C4FD6]">ADMIN</span> or <span className="font-semibold text-[#2C4FD6]">EMPLOYEE</span> to update built-in system role defaults.
                                </p>
                            </div>

                            {/* Section 1: Module Access */}
                            <div className="bg-white dark:bg-[#12151C] p-5 rounded-[8px] border border-[#E2E6ED] dark:border-gray-800 shadow-sm space-y-4">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-[14px] text-[#12151C] dark:text-white uppercase tracking-tight">
                                                1. Module Access
                                            </h4>
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E8ECFC] text-[#2C4FD6] dark:bg-blue-950/60 dark:text-blue-300">
                                                {selectedModules.length} of {ALL_MODULES.length} Enabled
                                            </span>
                                        </div>
                                        <p className="text-[12px] text-[#717E95] dark:text-gray-400 mt-0.5">
                                            Click any module to enable it. Enabling a module immediately opens its granular permissions below.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={handleSelectAllModules}
                                            className="text-[11px] font-bold text-[#2C4FD6] hover:text-[#203FB4] bg-[#E8ECFC]/60 dark:bg-blue-950/40 px-3 py-1.5 rounded-[5px] transition-colors cursor-pointer"
                                        >
                                            Select All Modules
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDeselectAllModules}
                                            className="text-[11px] font-bold text-gray-500 hover:text-red-600 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-[5px] transition-colors cursor-pointer"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {ALL_MODULES.map(module => {
                                        const isSelected = selectedModules.includes(module.key);
                                        const Icon = module.icon;
                                        const modulePerms = permissionsByModule[module.key] || [];
                                        const moduleActivePerms = modulePerms.filter((p: any) => selectedPermissions.includes(p.id)).length;

                                        return (
                                            <div
                                                key={module.key}
                                                onClick={() => toggleModuleAccess(module.key)}
                                                className={`group/card p-3.5 rounded-[8px] border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${isSelected
                                                    ? 'bg-[#E8ECFC]/35 border-[#2C4FD6] shadow-sm dark:bg-blue-950/30 dark:border-blue-500'
                                                    : 'bg-white border-[#E2E6ED] dark:bg-[#181B24] dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 opacity-80 hover:opacity-100'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`p-2 rounded-[6px] transition-colors ${isSelected
                                                            ? 'bg-[#2C4FD6] text-white shadow-sm'
                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover/card:text-[#2C4FD6]'
                                                            }`}>
                                                            <Icon size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="text-[13px] font-bold text-[#12151C] dark:text-white leading-tight">
                                                                {module.label}
                                                            </div>
                                                            <div className="text-[10px] font-mono text-[#9AA3B1] uppercase">
                                                                {module.key}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => { }} // Managed by card onClick
                                                        className="w-4 h-4 rounded accent-[#2C4FD6] cursor-pointer shrink-0 mt-1"
                                                    />
                                                </div>

                                                <p className="text-[11px] text-[#717E95] dark:text-gray-400 line-clamp-2 mb-2">
                                                    {module.description}
                                                </p>

                                                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800/80 text-[10.5px]">
                                                    {isSelected ? (
                                                        <span className="inline-flex items-center gap-1 font-bold text-[#2C4FD6] dark:text-blue-400">
                                                            <CheckCheck size={13} />
                                                            {modulePerms.length > 0 ? `${moduleActivePerms}/${modulePerms.length} perms` : 'Module Active'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 font-medium italic">
                                                            Click to enable & configure
                                                        </span>
                                                    )}
                                                    <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${isSelected ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>
                                                        {isSelected ? 'ENABLED' : 'DISABLED'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 2: Granular Permissions */}
                            <div className="bg-white dark:bg-[#12151C] p-5 rounded-[8px] border border-[#E2E6ED] dark:border-gray-800 shadow-sm space-y-4">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-[14px] text-[#12151C] dark:text-white uppercase tracking-tight">
                                                2. Granular Permissions
                                            </h4>
                                            {selectedModules.length > 0 && (
                                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                                                    {activePermissionCount} Active Permissions
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[12px] text-[#717E95] dark:text-gray-400 mt-0.5">
                                            Granular permissions are unlocked strictly for modules enabled in step 1.
                                        </p>
                                    </div>

                                    {selectedModules.length > 0 && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={handleGrantAllActivePermissions}
                                                className="text-[11px] font-bold text-[#2C4FD6] hover:text-[#203FB4] bg-[#E8ECFC]/60 dark:bg-blue-950/40 px-3 py-1.5 rounded-[5px] transition-colors cursor-pointer"
                                            >
                                                Select All Permissions
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleClearAllPermissions}
                                                className="text-[11px] font-bold text-gray-500 hover:text-red-600 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-[5px] transition-colors cursor-pointer"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Conditional Render: When NO modules are selected */}
                                {selectedModules.length === 0 ? (
                                    <div className="py-12 px-4 text-center rounded-[8px] border-2 border-dashed border-[#E2E6ED] dark:border-gray-800 bg-[#F7F8FA]/60 dark:bg-gray-900/30">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#2C4FD6] dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
                                            <Info size={24} />
                                        </div>
                                        <h5 className="text-[14px] font-bold text-[#12151C] dark:text-white mb-1">
                                            No Modules Selected Yet
                                        </h5>
                                        <p className="text-[12.5px] text-[#717E95] dark:text-gray-400 max-w-md mx-auto">
                                            Click on module cards above (such as <strong className="text-[#2C4FD6]">Dashboard</strong>, <strong className="text-[#2C4FD6]">Attendance</strong>, <strong className="text-[#2C4FD6]">Leave</strong>, etc.) to open and grant their granular permissions.
                                        </p>
                                    </div>
                                ) : (
                                    /* Render granular permissions ONLY for selected modules */
                                    <div className="space-y-4">
                                        {selectedModules.map(modKey => {
                                            const moduleDef = ALL_MODULES.find(m => m.key === modKey);
                                            const Icon = moduleDef?.icon || Shield;
                                            const modulePermissions = permissionsByModule[modKey] || [];
                                            const isExpanded = expandedModules.includes(modKey);
                                            const activeForMod = modulePermissions.filter((p: any) => selectedPermissions.includes(p.id)).length;
                                            const allSelectedForMod = modulePermissions.length > 0 && activeForMod === modulePermissions.length;

                                            return (
                                                <div
                                                    key={modKey}
                                                    className="bg-white dark:bg-[#12151C] rounded-[8px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden shadow-sm transition-all"
                                                >
                                                    {/* Module Accordion Header */}
                                                    <div className="p-4 bg-gray-50/70 dark:bg-white/[0.02] flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800">
                                                        <div
                                                            className="flex items-center gap-3 cursor-pointer select-none flex-1"
                                                            onClick={() => toggleModuleExpansion(modKey)}
                                                        >
                                                            <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/50 text-[#2C4FD6]">
                                                                <Icon size={16} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[13.5px] font-bold text-[#12151C] dark:text-white">
                                                                        {moduleDef?.label || modKey}
                                                                    </span>
                                                                    <span className="text-[10px] font-mono text-[#9AA3B1] uppercase">
                                                                        ({modKey})
                                                                    </span>
                                                                </div>
                                                                <span className="text-[11px] font-semibold text-[#2C4FD6] dark:text-blue-400">
                                                                    {activeForMod} of {modulePermissions.length} Permissions Active
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {modulePermissions.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => allSelectedForMod ? deselectAllForModule(modKey) : selectAllForModule(modKey)}
                                                                    className="text-[11px] font-bold px-2.5 py-1 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[#5B6472] dark:text-gray-300 hover:text-[#2C4FD6] hover:border-[#2C4FD6] transition-colors cursor-pointer"
                                                                >
                                                                    {allSelectedForMod ? 'Deselect All' : 'Select All'}
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleModuleExpansion(modKey)}
                                                                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                                                            >
                                                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Permissions Grid */}
                                                    {isExpanded && (
                                                        <div className="p-4 bg-white dark:bg-[#12151C]">
                                                            {modulePermissions.length === 0 ? (
                                                                <div className="p-4 text-center text-xs text-gray-400 italic">
                                                                    No granular permissions configured for this module.
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                                                    {modulePermissions.map((p: any) => {
                                                                        const isChecked = selectedPermissions.includes(p.id);
                                                                        return (
                                                                            <label
                                                                                key={p.id}
                                                                                className={`flex items-start gap-3 p-3 rounded-[6px] border cursor-pointer transition-all select-none ${isChecked
                                                                                    ? 'bg-[#E8ECFC]/40 border-[#2C4FD6] dark:bg-blue-950/30 dark:border-blue-500/50'
                                                                                    : 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-200/70 dark:border-gray-800 hover:border-gray-300'
                                                                                    }`}
                                                                            >
                                                                                <input
                                                                                    type="checkbox"
                                                                                    className="mt-0.5 w-4 h-4 rounded accent-[#2C4FD6] shrink-0"
                                                                                    checked={isChecked}
                                                                                    onChange={() => togglePermission(p.id)}
                                                                                />
                                                                                <div className="min-w-0">
                                                                                    <div className="text-[12px] font-bold text-[#12151C] dark:text-white leading-tight mb-1 truncate">
                                                                                        {p.name}
                                                                                    </div>
                                                                                    <div className="text-[10px] text-[#9AA3B1] dark:text-gray-400 font-mono">
                                                                                        {p.code}
                                                                                    </div>
                                                                                </div>
                                                                            </label>
                                                                        );
                                                                    })}
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
                        <div className="p-4 sm:p-5 border-t border-[#E2E6ED] dark:border-gray-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-white dark:bg-[#12151C] rounded-b-[8px]">
                            <div className="text-[11.5px] text-[#717E95] dark:text-gray-400 flex items-center gap-1.5">
                                <Sparkles size={14} className="text-[#2C4FD6]" />
                                <span>Saving will automatically update live Employee and Admin sessions.</span>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 text-[13px] text-[#5B6472] hover:text-[#12151C] dark:text-gray-400 dark:hover:text-white font-semibold transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="inline-flex items-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-[13px] font-semibold rounded-[6px] px-[20px] py-[9.5px] transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={15} />}
                                    Save & Apply Changes
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
                    <div className="bg-[#0f1016] rounded-[8px] w-full max-w-[calc(100vw-2rem)] sm:max-w-[380px] border-t-4 border-red-600 text-center relative overflow-hidden pb-8 px-5 sm:px-6">
                        <div className="w-16 h-16 bg-[#1c1d26] rounded-full flex items-center justify-center mx-auto mb-4 mt-6">
                            <Trash2 size={28} className="text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Delete Role?</h3>
                        <p className="text-[#8a8b94] mb-6 text-xs leading-relaxed px-2">
                            Are you sure you want to delete <span className="font-bold text-gray-200">{itemToDelete.name}</span>? <br />
                            This action will permanently remove all associated permissions and synchronize active sessions.
                        </p>
                        <div className="flex gap-3 px-2">
                            <button
                                onClick={() => setItemToDelete(null)}
                                className="flex-1 py-2.5 px-4 bg-[#1c1d26] text-white font-bold rounded-[6px] hover:bg-[#252631] transition-all active:scale-95 text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="flex-1 py-2.5 px-4 bg-[#ff3b3b] text-white font-bold rounded-[6px] hover:bg-[#ff4d4d] transition-all active:scale-95 flex items-center justify-center gap-2 text-xs"
                            >
                                {loading ? <Loader2 size={15} className="animate-spin" /> : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
