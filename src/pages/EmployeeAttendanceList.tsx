import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, Filter } from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getTeams } from '../utils/teamApi';

export default function EmployeeAttendanceList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [teamMemberIds, setTeamMemberIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchManagerTeam = async () => {
      if (user?.role === 'MANAGER') {
        try {
          const res = await getTeams();
          const teams = res.data || [];
          const myTeam = teams.find((t: any) => t.managerId === user.id || t.manager?.id === user.id);
          if (myTeam) {
            const ids = myTeam.members.map((m: any) => m.id);
            setTeamMemberIds(ids);
          }
        } catch (e) {
          console.error("Failed to load manager's team in EmployeeAttendanceList", e);
        }
      }
    };
    fetchManagerTeam();
  }, [user]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    role: '',
    location: '',
    status: 'All'
  });
  const [appliedFilters, setAppliedFilters] = useState({
    name: '',
    email: '',
    role: '',
    location: '',
    status: 'All'
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get('/employee');
        setEmployees(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter(emp => {
    const profile = emp.employeeProfile || {};

    if (user?.role === 'MANAGER' && !teamMemberIds.includes(emp.id)) {
      return false;
    }

    return (
      (!appliedFilters.name ||
        emp.name.toLowerCase().includes(appliedFilters.name.toLowerCase()) ||
        emp.email.toLowerCase().includes(appliedFilters.name.toLowerCase()) ||
        (profile.title || '').toLowerCase().includes(appliedFilters.name.toLowerCase())) &&
      (!appliedFilters.email || emp.email.toLowerCase().includes(appliedFilters.email.toLowerCase())) &&
      (!appliedFilters.role || (profile.title || '').toLowerCase().includes(appliedFilters.role.toLowerCase())) &&
      (!appliedFilters.location || (profile.location || '').toLowerCase().includes(appliedFilters.location.toLowerCase())) &&
      (appliedFilters.status === 'All' || (profile.status || 'Active') === appliedFilters.status)
    );
  });

  return (
    <div className="animate-fade-in-up">

      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Employee Attendance
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          View attendance of all employees
        </p>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-brand-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 mb-6 flex flex-col md:flex-row gap-4 items-center animate-fade-in-up">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, email or role..."
            value={filters.name}
            onChange={(e) => {
              const val = e.target.value;
              setFilters({ ...filters, name: val });
              setAppliedFilters({ ...appliedFilters, name: val });
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-gray-800 dark:text-white font-medium"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative group/dropdown">
            <select
              value={filters.status}
              onChange={(e) => {
                const val = e.target.value;
                setFilters({ ...filters, status: val });
                setAppliedFilters({ ...appliedFilters, status: val });
              }}
              className="appearance-none px-5 py-2.5 bg-brand-600 dark:bg-brand-600/20 border-2 border-brand-500/50 rounded-2xl text-white font-bold cursor-pointer transition-all hover:bg-brand-700 hover:border-brand-400 shadow-lg shadow-brand-500/20 focus:ring-4 focus:ring-brand-500/20 outline-none w-52 pr-10"
            >
              <option value="All" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white font-bold">All Status</option>
              <option value="Active" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white font-bold">Active</option>
              <option value="Inactive" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white font-bold">Inactive</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white transition-transform group-hover/dropdown:scale-110">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          <button
            onClick={() => setShowFilterDrawer(true)}
            className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-600 dark:text-gray-300 
            hover:bg-brand-500 hover:text-white hover:scale-105 
            transition-all duration-200 shadow-sm flex items-center justify-center"
          >
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-brand-900 rounded-3xl border border-gray-100 dark:border-white/5">
          <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Loading employees...
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-brand-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Email Address</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Role / Designation</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredEmployees.map((emp, index) => {
                  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
                  const avatarColor = colors[index % colors.length];

                  return (
                    <tr key={emp.id} onClick={() => navigate(`/employee-attendance/${emp.id}`)} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md ${avatarColor}`}>
                            {emp.name?.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800 dark:text-white">{emp.name}</div>

                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">
                        {emp.email}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-800 dark:text-white font-bold">{emp.employeeProfile?.title || 'Employee'}</div>
                        <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{emp.employeeProfile?.department || 'General'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${(emp.employeeProfile?.status || 'Active').toLowerCase() === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}>
                          {emp.employeeProfile?.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/employee-attendance/${emp.id}`);
                          }}
                          className="px-6 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 hover:scale-105 active:scale-95 transition-all text-xs font-bold uppercase tracking-wider shadow-lg shadow-brand-500/20"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showFilterDrawer &&
        createPortal(
          <div className="fixed inset-0 z-[999999]">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setShowFilterDrawer(false)}
            />

            {/* Drawer */}
            <div className="absolute right-0 top-0 w-full max-w-md h-full bg-white dark:bg-brand-900 shadow-2xl animate-slide-in-right">
              <div className="flex flex-col justify-between h-full p-6">
                {/* TOP */}
                <div>
                  <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">
                    Advanced Search
                  </h2>

                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Search name..."
                      value={filters.name}
                      onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                    />

                    <input
                      type="text"
                      placeholder="Search email..."
                      value={filters.email}
                      onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                    />

                    <input
                      type="text"
                      placeholder="Filter by role..."
                      value={filters.role}
                      onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                    />

                    <input
                      type="text"
                      placeholder="Filter by location..."
                      value={filters.location}
                      onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10"
                    />

                    <div className="relative group/dropdown">
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="appearance-none w-full px-4 py-2.5 bg-brand-600 dark:bg-brand-600/20 border-2 border-brand-500/50 rounded-xl text-white font-bold cursor-pointer focus:ring-4 focus:ring-brand-500/20 outline-none pr-10 transition-all"
                      >
                        <option value="All" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white">All Status</option>
                        <option value="Active" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white">Active</option>
                        <option value="Inactive" className="bg-white dark:bg-brand-900 text-gray-900 dark:text-white">Inactive</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BUTTONS */}
                <div className="flex gap-3 pt-6">
                  <button
                    onClick={() => {
                      const reset = {
                        name: '',
                        email: '',
                        role: '',
                        location: '',
                        status: 'All'
                      };
                      setFilters(reset);
                      setAppliedFilters(reset);
                    }}
                    className="flex-1 py-2 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20 cursor-pointer"
                  >
                    Clear
                  </button>

                  <button
                    onClick={() => {
                      setAppliedFilters(filters);
                      setShowFilterDrawer(false);
                    }}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-700 text-white cursor-pointer hover:from-brand-600 hover:to-brand-800 transition-all duration-200"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}