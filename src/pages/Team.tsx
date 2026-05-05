import { useState } from 'react';
import { useEffect } from 'react';
import { Users, Plus, MoreVertical, Briefcase, UserPlus, X, Trash2 } from 'lucide-react';
import { useRBAC } from '../hooks/useRBAC';
// import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
    getTeams,
    createTeam as createTeamApi,
    addMembers,
    removeMember,
    deleteTeam,
    updateTeam
} from '../utils/teamApi';


export default function Team() {
    const [employees, setEmployees] = useState<any[]>([]);
    const { hasPermission } = useRBAC();
    // const { user } = useAuth();
    const canManageTeams = hasPermission(['HR_ADMIN', 'MANAGER']);
    const [teams, setTeams] = useState<any[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
    const [menuOpen, setMenuOpen] = useState<number | null>(null);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
    const [selectedManager, setSelectedManager] = useState<number | null>(null);
    const [editTeam, setEditTeam] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
    const [confirmRemove, setConfirmRemove] = useState<any>(null);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamDesc, setNewTeamDesc] = useState('');
    const fetchEmployees = async () => {
        try {
            const res = await api.get('/employee');
            if (res.data) {
                setEmployees(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch employees", err);
            setEmployees([]);
        }
    };
    const fetchTeams = async () => {
        try {
            const res = await getTeams();
            setTeams(res.data);
        } catch (err) {
            console.log(err);
        }
    };
    useEffect(() => {
        fetchTeams();
        fetchEmployees();
    }, []);
    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowCreateModal(false);
        setShowAddMemberModal(true);
    };
    useEffect(() => {
        const closeMenu = () => setMenuOpen(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    return (
        <div className="animate-fade-in-up pb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Team Management</h2>
                    <p className="text-gray-500 dark:text-gray-400">Organize your workforce into functional units.</p>
                </div>
                {canManageTeams && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/20 hover:bg-brand-700 active:scale-95 transition-all"
                    >
                        <Plus size={20} /> Create New Team
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {teams.map((team) => (
                    <div key={team.id} className="bg-white dark:bg-brand-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-xl flex items-center justify-center">
                                    <Briefcase size={24} />
                                </div>
                                <div className="relative">

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMenuOpen(prev => prev === team.id ? null : team.id);
                                        }}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                                    >
                                        <MoreVertical size={20} />
                                    </button>
                                    {menuOpen === team.id && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute right-0 mt-2 w-36 bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuOpen(null);
                                                    setEditTeam(team);
                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-white/10 transition-all"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    setMenuOpen(null);
                                                    // await deleteTeam(team.id);
                                                    // fetchTeams();  mock
                                                    setConfirmDelete(team.id);

                                                }}
                                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-all"
                                            >
                                                Delete
                                            </button>

                                        </div>
                                    )}

                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{team.name}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 line-clamp-2 min-h-[40px]">{team.description}</p>

                            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-white/5 flex items-center justify-center font-bold text-brand-600 dark:text-brand-400">
                                    {team.manager ? (typeof team.manager === 'object' ? team.manager.name?.[0] : team.manager[0]) : '?'}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Manager</p>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        {team.manager ? (typeof team.manager === 'object' ? team.manager.name : team.manager) : 'Unassigned'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                    <Users size={16} />
                                    <span className="font-semibold">{team.members.length} Members</span>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTeam(team.id);
                                    }}
                                    className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
                                >
                                    View Members
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {showAddMemberModal && (
                <div className="fixed inset-0 z-[60] flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm">

                    <div className="bg-white dark:bg-brand-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

                        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Add Members</h3>
                            <button
                                onClick={() => setShowAddMemberModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[40vh] overflow-y-auto space-y-3 custom-scroll">

                            {employees.map(emp => {
                                const isSelected = selectedEmployees.includes(emp.id);

                                return (
                                    <div
                                        key={emp.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl"
                                    >
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-white text-sm">{emp.name}</p>
                                            <p className="text-xs text-gray-500">{typeof emp.role === 'object' ? emp.role?.name || 'Employee' : emp.role || 'Employee'}</p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setSelectedManager(emp.id)}
                                                className={`text-sm font-medium transition-all ${selectedManager === emp.id
                                                    ? 'text-yellow-300'
                                                    : 'text-gray-400 hover:text-blue-400'
                                                    }`}
                                            >
                                                Manager
                                            </button>
                                            <div className="w-px h-4 bg-white/20"></div>
                                            <button
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedEmployees(prev => prev.filter(id => id !== emp.id));
                                                    } else {
                                                        setSelectedEmployees(prev => [...prev, emp.id]);
                                                    }
                                                }}
                                                className={`text-sm font-medium transition-all ${isSelected
                                                    ? 'text-green-400'
                                                    : 'text-brand-400 hover:text-green-300'
                                                    }`}
                                            >
                                                {isSelected ? 'Added' : 'Add'}
                                            </button>

                                        </div>
                                    </div>
                                );
                            })}

                        </div>
                        <div className="p-4 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowAddMemberModal(false);
                                    if (!selectedTeam) {
                                        setNewTeamName('');
                                        setNewTeamDesc('');
                                    }
                                }}
                                className="flex-1 py-2 rounded-xl bg-gray-400 text-white hover:bg-gray-500 transition-all active:scale-95"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={async () => {
                                    if (selectedTeam) {
                                        await addMembers(selectedTeam, {
                                            members: selectedEmployees,
                                            managerId: selectedManager
                                        });
                                    } else {
                                        const res = await createTeamApi({
                                            name: newTeamName,
                                            description: newTeamDesc
                                        });
                                        if (res.data && res.data.id) {
                                            await addMembers(res.data.id, {
                                                members: selectedEmployees,
                                                managerId: selectedManager
                                            });
                                        }
                                        setNewTeamName('');
                                        setNewTeamDesc('');
                                    }

                                    fetchTeams();
                                    setShowAddMemberModal(false);
                                    setSelectedEmployees([]);
                                    setSelectedManager(null);

                                }}
                                className="flex-1 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all active:scale-95"
                            >
                                {selectedTeam ? 'Add' : 'Create Team'}
                            </button>
                        </div>

                    </div>
                </div>
            )}
            {showCreateModal && (
                <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20">
                    <div className="bg-white dark:bg-brand-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Create New Team</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTeam} className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Team Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    placeholder="e.g. Quality Assurance"
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500/50 outline-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
                                <textarea
                                    rows={3}
                                    value={newTeamDesc}
                                    onChange={(e) => setNewTeamDesc(e.target.value)}
                                    placeholder="Brief description of the team's responsibilities"
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500/50 outline-none"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition-all mt-2"
                            >
                                Create Team
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {editTeam && (
                <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20">
                    <div className="bg-white dark:bg-brand-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Edit Team</h3>
                            <button onClick={() => setEditTeam(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Team Name</label>
                                <input
                                    type="text"
                                    value={editTeam.name}
                                    onChange={(e) => setEditTeam({ ...editTeam, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500/50 outline-none text-gray-800 dark:text-white"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
                                <textarea
                                    rows={3}
                                    value={editTeam.description}
                                    onChange={(e) => setEditTeam({ ...editTeam, description: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-500/50 outline-none text-gray-800 dark:text-white"
                                />
                            </div>
                            <button
                                onClick={async () => {
                                    await updateTeam(editTeam.id, {
                                        name: editTeam.name,
                                        description: editTeam.description
                                    });
                                    fetchTeams();
                                    setEditTeam(null);
                                }}
                                className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition-all mt-2"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {selectedTeam && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-brand-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-white">{teams.find(t => t.id === selectedTeam)?.name}</h3>
                                <p className="text-sm text-gray-500">Team Roster</p>
                            </div>
                            <button onClick={() => setSelectedTeam(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[45vh] overflow-y-auto space-y-2 custom-scroll">

                            {canManageTeams && (
                                <button
                                    onClick={() => setShowAddMemberModal(true)}
                                    className="w-full py-2 mb-4 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl text-gray-500 hover:border-brand-500 hover:text-brand-500 transition-all flex items-center justify-center gap-2 font-medium"
                                >
                                    <UserPlus size={18} /> Add Member
                                </button>
                            )}

                            {teams.find(t => t.id === selectedTeam)?.members.map((emp: any) => (
                                <div key={emp.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-xs">
                                            {emp.name.split(' ').map((n: string) => n[0]).join('')}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-white text-sm">{emp.name}</p>
                                            <p className="text-xs text-gray-500">{emp.role}</p>
                                        </div>
                                    </div>
                                    {canManageTeams && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setConfirmRemove(emp.id)}
                                                className="text-xs text-red-400 hover:text-red-300 transition-all"
                                            >
                                                Remove
                                            </button>

                                            {confirmRemove === emp.id && (
                                                <div className="absolute right-0 top-6 w-[180px] bg-brand-900 border border-white/10 rounded-xl shadow-xl p-3 z-50 animate-fade-in">

                                                    <p className="text-xs text-gray-300 mb-3">
                                                        Remove Employee?
                                                    </p>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setConfirmRemove(null)}
                                                            className="flex-1 text-xs py-1 rounded bg-gray-600 hover:bg-gray-500 transition-all"
                                                        >
                                                            Cancel
                                                        </button>

                                                        <button
                                                            onClick={async () => {
                                                                if (!selectedTeam) return;

                                                                await removeMember(selectedTeam, emp.id);
                                                                fetchTeams();

                                                                setConfirmRemove(null);
                                                            }}
                                                            className="flex-1 text-xs py-1 rounded bg-red-500 hover:bg-red-600 transition-all"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>

                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {confirmDelete && (
                <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-32">
                    <div className="bg-white dark:bg-brand-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-gray-100 dark:border-white/10">
                        <div className="w-16 h-16 mx-auto mb-4 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Delete Team?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Are you sure you want to delete this team? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!confirmDelete) return;
                                    await deleteTeam(confirmDelete);
                                    fetchTeams();
                                    setConfirmDelete(null);
                                }}
                                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold shadow-lg shadow-red-500/30 transition-all"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

        </div >
    );
}
