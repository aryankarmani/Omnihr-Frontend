import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Search,
  Loader2,
  CheckCircle,
  XIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { createPortal } from 'react-dom';
// import { useAuth } from '../context/AuthContext';
// import { getTeams } from '../utils/teamApi';

interface RegularizationRequest {
  id: string;
  userId: number;
  date: string;
  inTime?: string;
  outTime?: string;
  proposedIn?: string;
  proposedOut?: string;
  reason: string;
  status: string;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
    employeeProfile?: {
      avatar?: string;
      department?: string;
      title?: string;
    };
  };
}

export default function Regularizations() {
  // const { user } = useAuth();
  // const [teamMemberIds, setTeamMemberIds] = useState<number[]>([]);

  // useEffect(() => {
  //   const fetchManagerTeam = async () => {
  //     if (user?.role === 'MANAGER') {
  //       try {
  //         const res = await getTeams();
  //         const teams = res.data || [];
  //         const myTeam = teams.find((t: any) => t.managerId === user.id || t.manager?.id === user.id);
  //         if (myTeam) {
  //           const ids = myTeam.members.map((m: any) => m.id);
  //           setTeamMemberIds(ids);
  //         }
  //       } catch (e) {
  //         console.error("Failed to load manager's team in Regularizations", e);
  //       }
  //     }
  //   };
  //   fetchManagerTeam();
  // }, [user]);

  const [requests, setRequests] = useState<RegularizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');


  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);
  const [selectedRequestForReason, setSelectedRequestForReason] = useState<RegularizationRequest | null>(null);


  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/regularize/pending');
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      console.error('Error fetching regularizations:', error);
      toast.error(error.response?.data?.message || 'Failed to load regularizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);


  const handleApprove = async (id: string) => {
    try {
      await api.put(`/attendance/regularize/${id}/approve`);
      toast.success('Attendance correction approved successfully');
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectingId(id);
    setRejectComment('');
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId || !rejectComment.trim()) return;

    setSubmittingReject(true);
    try {
      await api.put(`/attendance/regularize/${rejectingId}/reject`, {
        reason: rejectComment,
        approverComment: rejectComment
      });
      toast.success('Attendance correction rejected');
      setRequests((prev) => prev.filter((r) => r.id !== rejectingId));
      setRejectingId(null);
      setRejectComment('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setSubmittingReject(false);
    }
  };


  const formatTime12h = (timeStr?: string) => {
    if (!timeStr) return '--:--';
    try {

      if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
        const [hoursStr, minutesStr] = timeStr.split(':');
        let hours = parseInt(hoursStr, 10);
        const minutes = parseInt(minutesStr, 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minutesFormatted = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutesFormatted} ${ampm}`;
      }


      const date = new Date(timeStr);
      if (isNaN(date.getTime())) {

        const match = timeStr.match(/(\d{2}):(\d{2})/);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          const minutesFormatted = minutes < 10 ? '0' + minutes : minutes;
          return `${hours}:${minutesFormatted} ${ampm}`;
        }
        return timeStr;
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return timeStr;
    }
  };


  const filteredRequests = requests.filter(req => {
    // if (user?.role === 'MANAGER' && !teamMemberIds.includes(req.userId || req.user?.id || 0)) {
    //   return false;
    // }

    const name = req.user?.name || '';
    const email = req.user?.email || '';
    const title = req.user?.employeeProfile?.title || '';
    const reason = req.reason || '';

    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reason.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="animate-fade-in-up pb-8">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Attendance Corrections</h2>
            <p className="text-gray-500 dark:text-gray-400">Review and approve attendance regularization requests</p>
          </div>
        </div>
      </div>




      <div className="bg-white dark:bg-brand-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, role or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all text-gray-800 dark:text-white font-medium"
          />
        </div>

      </div>


      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-brand-900 rounded-3xl border border-gray-100 dark:border-white/5">
          <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Fetching requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-brand-900 rounded-3xl border border-gray-100 dark:border-white/5 shadow-inner">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">No Pending Corrections</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">All requests have been processed successfully.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-brand-900 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Employee</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Proposed In/Out Times</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Reason</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredRequests.map((req, index) => {
                  const name = req.user?.name || `Employee #${req.userId}`;
                  const title = req.user?.employeeProfile?.title || 'Employee';
                  const department = req.user?.employeeProfile?.department || 'General';
                  const avatar = req.user?.employeeProfile?.avatar;

                  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
                  const avatarColor = colors[index % colors.length];

                  return (
                    <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {avatar ? (
                            <img src={avatar} alt={name} className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                          ) : (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md ${avatarColor}`}>
                              {name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-gray-800 dark:text-white">{name}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{title} • {department}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 dark:text-white font-bold">
                        {req.date}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col gap-1">
                          {(req.proposedIn || req.inTime) && (
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <Clock size={12} />
                              <span>In: {formatTime12h(req.proposedIn || req.inTime)}</span>
                            </div>
                          )}
                          {(req.proposedOut || req.outTime) && (
                            <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 font-semibold">
                              <Clock size={12} />
                              <span>Out: {formatTime12h(req.proposedOut || req.outTime)}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        onClick={() => setSelectedRequestForReason(req)}
                        className="px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-300 max-w-xs truncate italic cursor-pointer hover:text-brand-500 dark:hover:text-brand-400 hover:underline transition-all"
                        title="Click to view full reason"
                      >
                        "{req.reason}"
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                            title="Approve Request"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => handleRejectClick(req.id)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            title="Reject Request"
                          >
                            <XIcon size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {rejectingId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRejectingId(null)} />
          <div className="relative bg-white dark:bg-brand-950 w-full max-w-md rounded-[2rem] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden p-8 animate-scale-in">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Reject Request</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Please provide a reason for rejecting this regularization request.</p>
            <form onSubmit={handleRejectSubmit}>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Enter rejection reason..."
                required
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/50 min-h-[100px] mb-6 font-semibold"
              />
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReject}
                  className="flex-1 py-3 px-4 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2"
                >
                  {submittingReject ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {selectedRequestForReason && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative bg-white dark:bg-brand-950 w-full max-w-md rounded-[2rem] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden p-8 animate-scale-in animate-none">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 to-purple-500"></div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Correction Reason</h3>
              <button type="button" onClick={() => setSelectedRequestForReason(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors text-gray-400">
                <XIcon size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Employee Name</label>
                <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl font-bold text-sm text-gray-800 dark:text-white">
                  {selectedRequestForReason.user?.name || `Employee #${selectedRequestForReason.userId}`}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Date Requested</label>
                <div className="p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl font-bold text-sm text-gray-800 dark:text-white">
                  {selectedRequestForReason.date}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Submission Reason</label>
                <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-sm text-gray-700 dark:text-gray-300 font-semibold leading-relaxed">
                  <div className="max-h-[150px] overflow-y-auto custom-scrollbar break-words pr-2">
                    {selectedRequestForReason.reason}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedRequestForReason(null)}
                  className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-500/20 text-sm tracking-wider uppercase cursor-pointer"
                >
                  Close
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
