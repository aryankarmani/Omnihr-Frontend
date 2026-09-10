import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { Plus, MoreVertical, Briefcase, UserPlus, X, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
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
    const { user } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'HR_ADMIN';
    // ✅ CHANGED: only HR admin can create/edit teams
    const canManageTeams = user?.role === 'HR_ADMIN';
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

    const [accessControlTeam, setAccessControlTeam] = useState<any>(null);
    const [permissions, setPermissions] = useState({
        list: true,
        attendance: true,
        leaveApproval: true,
        regularization: true
    });
    useEffect(() => {
        const savedState = sessionStorage.getItem('teamModalState');

        if (!savedState) return;

        const { modal, teamId } = JSON.parse(savedState);

        if (teamId) {
            setSelectedTeam(teamId);
        }

        if (modal === 'add-members') {
            setShowAddMemberModal(true);
        }

        sessionStorage.removeItem('teamModalState');
    }, []);

    const handleOpenAccessControl = async (team: any) => {
        setAccessControlTeam(team);
        try {
            const res = await api.get(`/teams/${team.id}/access-control`);
            setPermissions(res.data);
        } catch (e) {
            setPermissions({
                list: true,
                attendance: true,
                leaveApproval: true,
                regularization: true
            });
        }
    };

    const handleSaveAccessControl = async () => {
        if (accessControlTeam) {
            try {
                await api.post(`/teams/${accessControlTeam.id}/access-control`, permissions);
                toast.success(`Access control updated for team ${accessControlTeam.name}`);
                setAccessControlTeam(null);
            } catch (e) {
                toast.error("Failed to save access control permissions");
            }
        }
    };

    useEffect(() => {
        if (showAddMemberModal && selectedTeam) {
            const team = teams.find(t => t.id === selectedTeam);
            if (team) {
                const memberIds = team.members.map((m: any) => m.id);
                setSelectedEmployees(memberIds);
                const mgrId = team.managerId || team.manager?.id || null;
                setSelectedManager(mgrId);
            }
        } else if (!showAddMemberModal) {
            setSelectedEmployees([]);
            setSelectedManager(null);
        }
    }, [showAddMemberModal, selectedTeam, teams]);

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
    const saveTeamLog = async (
        action: string,
        description: string,
        teamName: string
    ) => {
        try {
            await api.post('/audit-logs', {
                module: 'Team',
                action,
                description,
                performedBy: user?.name || 'Admin',
                performedByRole: user?.role || 'HR_ADMIN',
                targetUser: teamName,
                targetUserRole: 'Team',
                dateTime: new Date().toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                }),
            });
        } catch (error) {
            console.error('Failed to save team log:', error);
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
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-[#12151C] dark:text-white mb-1">Team Management</h2>
                    <p className="page-sub text-[14px] text-[#5B6472] dark:text-gray-400 mb-[5px]">Organize your workforce into functional units.</p>
                </div>
                {canManageTeams && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary inline-flex items-center justify-center gap-[7px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white text-[13.5px] font-semibold rounded-[6px] px-[15px] py-[9px] active:scale-95 transition-all cursor-pointer"
                    >
                        <Plus size={16} /> Create New Team
                    </button>
                )}
            </div>

            {/* Team Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {teams.map((team) => {
                    const managerName = team.manager ? (typeof team.manager === 'object' ? team.manager.name : team.manager) : 'Unassigned';
                    const initials = managerName.split(' ').map((n: string) => n[0]).join('').substring(0, 2);

                    return (
                        <div key={team.id} className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6 hover:border-[#2C4FD6]/40 transition-all flex flex-col justify-between min-h-[230px] relative">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-[36px] h-[36px] rounded-[6px] bg-[#E8ECFC] text-[#2C4FD6] dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center mb-[14px]">
                                        <Briefcase size={16} />
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMenuOpen(prev => prev === team.id ? null : team.id);
                                            }}
                                            className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors p-1 cursor-pointer"
                                        >
                                            <MoreVertical size={16} />
                                        </button>
                                        {menuOpen === team.id && (
                                            <div
                                                onClick={(e) => e.stopPropagation()}
                                                className="absolute right-0 mt-1 w-36 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] overflow-hidden z-50">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMenuOpen(null);
                                                        setEditTeam(team);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-xs text-[#12151C] dark:text-gray-200 hover:bg-[#EEF1F5] dark:hover:bg-white/10 transition-all font-semibold cursor-pointer"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        setMenuOpen(null);
                                                        setConfirmDelete(team.id);
                                                    }}
                                                    className="w-full text-left px-4 py-2 text-xs text-[#DE350B] dark:text-rose-400 hover:bg-[#FBE7E7] dark:hover:bg-rose-500/10 transition-all font-semibold border-b border-[#E2E6ED] dark:border-gray-800 cursor-pointer"
                                                >
                                                    Delete
                                                </button>
                                                {isAdmin && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setMenuOpen(null);
                                                            handleOpenAccessControl(team);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-xs text-[#2C4FD6] dark:text-blue-400 hover:bg-[#E8ECFC] dark:hover:bg-blue-500/10 transition-all font-semibold cursor-pointer"
                                                    >
                                                        Access Control
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-base font-semibold text-[#12151C] dark:text-white mb-0.5">{team.name}</h3>
                                <p className="text-xs text-[#9AA3B1] dark:text-gray-400">
                                    {team.description || 'No description provided'}
                                </p>

                                <div className="border-t border-[#E2E6ED] dark:border-gray-800 my-4"></div>

                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className="w-7 h-7 rounded-full bg-[#EEF1F5] dark:bg-gray-700 text-[#5B6472] dark:text-white font-mono-numbers font-bold text-[10px] flex items-center justify-center shrink-0 uppercase">
                                        {initials}
                                    </div>
                                    <div>
                                        <div className="manager-role text-[10.5px] text-[#9AA3B1] dark:text-gray-400 uppercase tracking-[0.04em] leading-none mb-1">MANAGER</div>
                                        <div className="manager-name text-[13px] font-semibold text-[#12151C] dark:text-white leading-none">
                                            {managerName}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-[12.5px] text-[#5B6472] dark:text-gray-300">
                                        {team.members ? team.members.length : 0} Members
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedTeam(team.id);
                                        }}
                                        className="text-[12.5px] font-semibold text-[#2C4FD6] dark:text-blue-400 hover:underline cursor-pointer"
                                    >
                                        View Members
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {showAddMemberModal && createPortal(
                <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/20 dark:bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-lg overflow-hidden animate-scale-in">

                        <div className="p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-white/5">
                            <h3 className="text-base font-bold text-[#12151C] dark:text-white">Add Members</h3>
                            <button
                                onClick={() => setShowAddMemberModal(false)}
                                className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[40vh] overflow-y-auto space-y-2.5 custom-scrollbar">

                            {employees.map(emp => {
                                const isSelected = selectedEmployees.includes(emp.id);
                                const isManager = selectedManager === emp.id;

                                let cardBgClass = "bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800";
                                if (isManager) {
                                    cardBgClass = "bg-amber-500/10 border border-amber-500/30 dark:bg-amber-500/10";
                                } else if (isSelected) {
                                    cardBgClass = "bg-[#E4F5EC] border border-[#BBE5D0] dark:bg-emerald-500/10";
                                }

                                return (
                                    <div
                                        key={emp.id}
                                        className={`flex items-center justify-between p-3 rounded-[6px] transition-all ${cardBgClass}`}
                                    >
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    sessionStorage.setItem(
                                                        'teamModalState',
                                                        JSON.stringify({
                                                            modal: 'add-members',
                                                            teamId: selectedTeam
                                                        })
                                                    );

                                                    navigate(`/employee/${emp.id}`);
                                                }} 
                                                className="font-semibold text-[#12151C] dark:text-white text-[13.5px] hover:text-[#2C4FD6] hover:underline cursor-pointer"
                                            >
                                                {emp.name}
                                            </button>

                                            <p className="text-[11.5px] text-[#717E95] dark:text-gray-400">{typeof emp.role === 'object' ? emp.role?.name || 'Employee' : emp.role || 'Employee'}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedManager(isManager ? null : emp.id)}
                                                className={`px-2.5 py-1 text-xs font-semibold rounded-[6px] transition-all cursor-pointer ${isManager
                                                    ? 'bg-amber-500 text-white'
                                                    : 'text-[#717E95] hover:text-amber-600 hover:bg-amber-50'
                                                    }`}
                                            >
                                                Manager
                                            </button>
                                            <div className="w-px h-4 bg-[#E2E6ED] dark:bg-gray-800"></div>
                                            <button
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedEmployees(prev => prev.filter(id => id !== emp.id));
                                                    } else {
                                                        setSelectedEmployees(prev => [...prev, emp.id]);
                                                    }
                                                }}
                                                className={`px-3 py-1 text-xs font-semibold rounded-[6px] transition-all cursor-pointer ${isSelected
                                                    ? 'bg-[#1F8A5A] text-white'
                                                    : 'bg-[#2C4FD6] text-white hover:bg-[#203FB4]'
                                                    }`}
                                            >
                                                {isSelected ? 'Added' : 'Add'}
                                            </button>

                                        </div>
                                    </div>
                                );
                            })}

                        </div>
                        <div className="p-5 border-t border-[#E2E6ED] dark:border-gray-800 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowAddMemberModal(false);
                                    if (!selectedTeam) {
                                        setNewTeamName('');
                                        setNewTeamDesc('');
                                    }
                                }}
                                className="flex-1 py-2.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-300 font-semibold text-[13.5px] hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer"
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
                                        } await saveTeamLog(
                                            'Created',
                                            `Team "${newTeamName}" created`,
                                            newTeamName
                                        );
                                        setNewTeamName('');
                                        setNewTeamDesc('');
                                    }

                                    fetchTeams();
                                    setShowAddMemberModal(false);
                                    setSelectedEmployees([]);
                                    setSelectedManager(null);

                                }}
                                className="flex-1 py-2.5 rounded-[6px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-[13.5px] transition-all cursor-pointer"
                            >
                                {selectedTeam ? 'Add' : 'Create Team'}
                            </button>
                        </div>

                    </div>
                </div>
                , document.body)}
            {showCreateModal &&
                createPortal(
                    <div className="fixed inset-0 z-[999999] bg-slate-900/20 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-md overflow-hidden animate-scale-in">
                            <div className="p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-white/5">
                                <h3 className="text-base font-bold text-[#12151C] dark:text-white">Create New Team</h3>
                                <button onClick={() => setShowCreateModal(false)} className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer">
                                    <X size={18} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateTeam} className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">Team Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newTeamName}
                                        onChange={(e) => setNewTeamName(e.target.value)}
                                        placeholder="e.g. Quality Assurance"
                                        className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">Description</label>
                                    <textarea
                                        rows={3}
                                        value={newTeamDesc}
                                        onChange={(e) => setNewTeamDesc(e.target.value)}
                                        placeholder="Brief description of the team's responsibilities"
                                        className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-[13.5px] rounded-[6px] transition-all cursor-pointer mt-2"
                                >
                                    Create Team
                                </button>
                            </form>
                        </div>
                    </div>,
                    document.body
                )
            }

            {editTeam && createPortal(
                <div className="fixed inset-0 z-[999999] bg-slate-900/20 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-white/5">
                            <h3 className="text-base font-bold text-[#12151C] dark:text-white">Edit Team</h3>
                            <button onClick={() => setEditTeam(null)} className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">Team Name</label>
                                <input
                                    type="text"
                                    value={editTeam.name}
                                    onChange={(e) => setEditTeam({ ...editTeam, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">Description</label>
                                <textarea
                                    rows={3}
                                    value={editTeam.description}
                                    onChange={(e) => setEditTeam({ ...editTeam, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                                />
                            </div>
                            <button
                                onClick={async () => {
                                    await updateTeam(editTeam.id, {
                                        name: editTeam.name,
                                        description: editTeam.description
                                    });
                                    await saveTeamLog(
                                        'Updated',
                                        `Team "${editTeam.name}" updated`,
                                        editTeam.name
                                    );
                                    fetchTeams();
                                    setEditTeam(null);
                                }}
                                className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-[13.5px] rounded-[6px] transition-all cursor-pointer mt-2"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
{selectedTeam && !showAddMemberModal && createPortal(
                    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-lg overflow-hidden animate-scale-in">
                        <div className="p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-white/5">
                            <div>
                                <h3 className="text-base font-bold text-[#12151C] dark:text-white break-all">{teams.find(t => t.id === selectedTeam)?.name}</h3>
                                <p className="text-xs text-[#5B6472] dark:text-gray-400">Team Roster</p>
                            </div>
                            <button onClick={() => setSelectedTeam(null)} className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[45vh] overflow-y-auto space-y-2 custom-scrollbar">

                            {canManageTeams && (
                                <button
                                    onClick={() => setShowAddMemberModal(true)}
                                    className="w-full py-2.5 mb-3 border-2 border-dashed border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[#5B6472] dark:text-gray-300 hover:border-[#2C4FD6] hover:text-[#2C4FD6] transition-all flex items-center justify-center gap-2 font-semibold text-xs cursor-pointer"
                                >
                                    <UserPlus size={16} /> Add Member
                                </button>
                            )}

                            {teams.find(t => t.id === selectedTeam)?.members.map((emp: any) => (
                                <div key={emp.id} className="flex items-center justify-between p-3 bg-[#F7F8FA] dark:bg-white/5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#EEF1F5] dark:bg-gray-700 text-[#5B6472] dark:text-white font-mono-numbers font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                                            {emp.name.split(' ').map((n: string) => n[0]).join('')}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    sessionStorage.setItem(
                                                        'teamModalState',
                                                        JSON.stringify({
                                                            modal: 'team-roster',
                                                            teamId: selectedTeam
                                                        })
                                                    );

                                                    navigate(`/employee/${emp.id}`);
                                                }} className="font-semibold text-[#12151C] dark:text-white text-[13.5px] break-all hover:text-[#2C4FD6] hover:underline text-left cursor-pointer"
                                            >
                                                {emp.name}
                                            </button>                                            <p className="text-[11.5px] text-[#717E95] dark:text-gray-400 truncate">{emp.role}</p>
                                        </div>
                                    </div>
                                    {canManageTeams && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setConfirmRemove(emp.id)}
                                                className="text-xs font-semibold text-[#DE350B] hover:underline cursor-pointer transition-all"
                                            >
                                                Remove
                                            </button>

                                            {confirmRemove === emp.id && (
                                                <div className="absolute right-0 top-6 w-[180px] bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] p-3 z-50 animate-fade-in">

                                                    <p className="text-xs font-semibold text-[#12151C] dark:text-gray-200 mb-2.5">
                                                        Remove Employee?
                                                    </p>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setConfirmRemove(null)}
                                                            className="flex-1 text-xs py-1.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-300 font-semibold cursor-pointer"
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
                                                            className="flex-1 text-xs py-1.5 rounded-[6px] bg-[#DE350B] text-white font-semibold cursor-pointer"
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
                </div>,
                document.body
            )}
            {confirmDelete && createPortal(
                <div className="fixed inset-0 z-[999999] bg-slate-900/20 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-sm p-6 text-center animate-scale-in">
                        <div className="w-12 h-12 mx-auto mb-3 bg-[#FBE7E7] dark:bg-red-500/10 rounded-full flex items-center justify-center text-[#DE350B]">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-base font-bold text-[#12151C] dark:text-white mb-1">Delete Team?</h3>
                        <p className="text-xs text-[#5B6472] dark:text-gray-400 mb-5">
                            Are you sure you want to delete this team? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-2.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-300 font-semibold text-[13.5px] hover:bg-gray-50 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!confirmDelete) return;
                                    const deletedTeam = teams.find(t => t.id === confirmDelete);

                                    await deleteTeam(confirmDelete);

                                    await saveTeamLog(
                                        'Deleted',
                                        `Team "${deletedTeam?.name || 'Team'}" deleted`,
                                        deletedTeam?.name || 'Team'
                                    );

                                    fetchTeams();
                                    setConfirmDelete(null);
                                }}
                                className="flex-1 py-2.5 rounded-[6px] bg-[#DE350B] hover:bg-[#b02a08] text-white font-semibold text-[13.5px] transition-all cursor-pointer"
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {accessControlTeam && createPortal(
                <div className="fixed inset-0 z-[999999] bg-slate-900/20 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-md overflow-hidden animate-scale-in text-left">
                        <div className="p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex justify-between items-center bg-[#F7F8FA] dark:bg-white/5">
                            <div>
                                <h3 className="text-base font-bold text-[#12151C] dark:text-white">Access Control</h3>
                                <p className="text-xs text-[#5B6472] dark:text-gray-400 mt-0.5">Configure manager dashboard tabs for <strong>{accessControlTeam.name}</strong></p>
                            </div>
                            <button onClick={() => setAccessControlTeam(null)} className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-[11px] font-semibold text-[#9AA3B1] dark:text-gray-500 uppercase tracking-widest">Select allowed dashboard tabs</p>

                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { key: 'list', label: 'Employee List', desc: 'Allows viewing and searching the team member roster' },
                                    { key: 'attendance', label: 'Attendance', desc: 'Allows viewing daily attendance sheets of the team' },
                                    { key: 'leaveApproval', label: 'Leave Approval', desc: 'Allows reviewing, approving, and rejecting leave requests' },
                                    { key: 'regularization', label: 'Regularization', desc: 'Allows managing attendance regularizations and requests' }
                                ].map((option) => {
                                    const isChecked = (permissions as any)[option.key];
                                    return (
                                        <div
                                            key={option.key}
                                            onClick={() => setPermissions(prev => ({ ...prev, [option.key]: !isChecked }))}
                                            className={`p-3.5 rounded-[6px] border transition-all cursor-pointer flex items-start gap-3 ${isChecked
                                                ? 'border-[#2C4FD6] bg-[#E8ECFC]/40 dark:bg-blue-500/10'
                                                : 'border-[#E2E6ED] dark:border-gray-800 bg-[#F7F8FA] dark:bg-white/5 hover:border-gray-300'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => { }} // handled by div onClick
                                                className="mt-0.5 accent-[#2C4FD6] rounded cursor-pointer"
                                            />
                                            <div>
                                                <h4 className="font-semibold text-xs text-[#12151C] dark:text-white">{option.label}</h4>
                                                <p className="text-[11.5px] text-[#717E95] dark:text-gray-400 mt-0.5">{option.desc}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                onClick={handleSaveAccessControl}
                                className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold rounded-[6px] transition-all mt-2 cursor-pointer text-xs"
                            >
                                Save Permissions
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
}

