import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Search,
  Loader2,
  CheckCircle,
  XIcon,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { createPortal } from 'react-dom';

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
  const navigate = useNavigate();

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
      toast.success('Attendance regularization approved successfully');
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
      toast.success('Attendance regularization rejected');
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Attendance Regularizations</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Review and approve attendance regularization requests</p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="relative w-full max-w-[340px] group">
          <div className="relative flex items-center search">
            <Search size={15} className="absolute left-3 text-[#9AA3B1] group-focus-within:text-[#2C4FD6] transition-colors" />
            <input
              type="text"
              placeholder="Search by name, role or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-[9px] h-[36px] bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[7px] outline-none focus:border-[#2C4FD6] transition-all text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
            />
          </div>
        </div>

        <button className="flex items-center gap-2 border border-[#E2E6ED] dark:border-gray-800 rounded-[8px] px-3 py-[9px] text-[13px] font-semibold text-[#5B6472] dark:text-gray-300 bg-white dark:bg-[#12151C] hover:bg-gray-50 dark:hover:bg-white/5 transition-all shrink-0 cursor-pointer self-end sm:self-auto">
          <Filter size={15} className="text-[#5B6472] dark:text-gray-300" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-[#E2E6ED] dark:border-gray-800">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Fetching requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-[#E2E6ED] dark:border-gray-800">
          <Calendar size={44} className="mx-auto text-gray-300 mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">No Pending Regularizations</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">All requests have been processed successfully.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-[#E2E6ED] dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#EEF1F5] dark:bg-gray-800/60 text-[#9AA3B1] dark:text-gray-400 text-[11px] font-semibold uppercase tracking-[.05em]">
                  <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800">
                    EMPLOYEE
                  </th>
                  <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800">
                    DATE
                  </th>
                  <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800">
                    PROPOSED IN/OUT
                  </th>
                  <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800">
                    REASON
                  </th>
                  <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRequests.map((req) => {
                  const name = req.user?.name || `Employee #${req.userId}`;
                  const title = req.user?.employeeProfile?.title || 'Employee';
                  const department = req.user?.employeeProfile?.department || 'General';

                  const initials = name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((word) => word.charAt(0).toUpperCase())
                    .join('');

                  return (
                    <tr key={req.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-[13px] px-[22px]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#EEF1F5] dark:bg-gray-700 text-[#5B6472] dark:text-gray-300 font-bold text-xs flex items-center justify-center shrink-0 uppercase font-mono-numbers">
                            {initials}
                          </div>
                          <div>
                            <button
                              onClick={() => navigate(`/employee/${req.user?.id || req.userId}`)}
                              className="font-semibold text-[#12151C] dark:text-white text-[13.5px] hover:text-[#2C4FD6] dark:hover:text-blue-400 transition-colors block text-left"
                            >
                              {name}
                            </button>
                            <div className="text-[11.5px] text-[#717E95] dark:text-gray-400">
                              {title} • {department}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-[13px] px-[22px] text-xs text-[#12151C] dark:text-white font-mono-numbers">
                        {req.date}
                      </td>
                      <td className="py-[13px] px-[22px] text-xs">
                        <div className="flex flex-col gap-1">
                          {(req.proposedIn || req.inTime) && (
                            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium text-xs">
                              <Clock size={12} />
                              <span>In: {formatTime12h(req.proposedIn || req.inTime)}</span>
                            </div>
                          )}
                          {(req.proposedOut || req.outTime) && (
                            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium text-xs">
                              <Clock size={12} />
                              <span>Out: {formatTime12h(req.proposedOut || req.outTime)}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        onClick={() => setSelectedRequestForReason(req)}
                        className="py-[13px] px-[22px] text-xs text-[#5B6472] dark:text-gray-300 max-w-xs truncate cursor-pointer hover:text-[#2C4FD6] dark:hover:text-blue-400 transition-colors"
                        title="Click to view full reason"
                      >
                        "{req.reason}"
                      </td>
                      <td className="py-[13px] px-[22px] text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-[3px] border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors cursor-pointer"
                            title="Approve Request"
                          >
                            <CheckCircle size={14} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleRejectClick(req.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-[3px] border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold transition-colors cursor-pointer"
                            title="Reject Request"
                          >
                            <XIcon size={14} />
                            <span>Reject</span>
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
          <div className="absolute inset-0 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md" onClick={() => setRejectingId(null)} />
          <div className="relative bg-white dark:bg-[#12151C] w-full max-w-md rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden p-6 animate-scale-in">
            <h3 className="text-base font-bold text-[#12151C] dark:text-white mb-1">Reject Request</h3>
            <p className="text-xs text-[#5B6472] dark:text-gray-400 mb-4">Please provide a reason for rejecting this regularization request.</p>
            <form onSubmit={handleRejectSubmit}>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Enter rejection reason..."
                required
                className="w-full px-3 py-2 rounded-[7px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white text-xs outline-none focus:border-[#2C4FD6] min-h-[90px] mb-4 placeholder-[#9AA3B1]"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="flex-1 py-2.5 px-4 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 text-[#5B6472] dark:text-gray-300 font-semibold rounded-[8px] hover:bg-gray-50 transition-colors text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReject}
                  className="flex-1 py-2.5 px-4 bg-[#DE350B] text-white font-semibold rounded-[8px] hover:bg-[#b02a08] transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="relative bg-white dark:bg-[#12151C] w-full max-w-md rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4 border-b border-[#E2E6ED] dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-[#12151C] dark:text-white">Regularization Reason</h3>
              <button type="button" onClick={() => setSelectedRequestForReason(null)} className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer">
                <XIcon size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Employee Name</label>
                <div className="p-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[7px] font-semibold text-xs text-[#12151C] dark:text-white">
                  {selectedRequestForReason.user?.name || `Employee #${selectedRequestForReason.userId}`}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Date Requested</label>
                <div className="p-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[7px] font-semibold text-xs text-[#12151C] dark:text-white font-mono-numbers">
                  {selectedRequestForReason.date}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Submission Reason</label>
                <div className="p-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[7px] text-xs text-[#12151C] dark:text-gray-300 leading-relaxed">
                  <div className="max-h-[150px] overflow-y-auto custom-scrollbar break-words">
                    {selectedRequestForReason.reason}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequestForReason(null)}
                  className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold rounded-[8px] transition-colors text-xs cursor-pointer"
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

