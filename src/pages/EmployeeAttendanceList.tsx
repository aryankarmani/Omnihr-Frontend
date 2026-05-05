import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Loader2 } from 'lucide-react';
import api from '../utils/api';

export default function EmployeeAttendanceList() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
                {employees.map((emp, index) => {
                  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
                  const avatarColor = colors[index % colors.length];

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md ${avatarColor}`}>
                            {emp.name?.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800 dark:text-white">{emp.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">ID: #{emp.id}</div>
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
                          onClick={() => navigate(`/employee-attendance/${emp.id}`)}
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
    </div>
  );
}