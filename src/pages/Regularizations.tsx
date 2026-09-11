import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Search,
  Loader2,
  CheckCircle,
  XIcon,
  XCircle,
  Filter,
  Eye
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
  approverComment?: string;
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

  // Search & Filter state
  const [filters, setFilters] = useState({
    name: '',
    status: 'All',
    startDate: '',
    endDate: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({
    name: '',
    status: 'All',
    startDate: '',
    endDate: ''
  });
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Rejection modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // View details modal state
  const [selectedRequestForReason, setSelectedRequestForReason] = useState<RegularizationRequest | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/regularize/pending?status=All');
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
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'APPROVED' } : r))
      );
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
      setRequests((prev) =>
        prev.map((r) => (r.id === rejectingId ? { ...r, status: 'REJECTED', approverComment: rejectComment } : r))
      );
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

  // Filtered requests with memoization
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const name = req.user?.name || '';
      const email = req.user?.email || '';
      const title = req.user?.employeeProfile?.title || '';
      const reason = req.reason || '';

      const query = appliedFilters.name.toLowerCase();
      const matchesSearch =
        !appliedFilters.name ||
        name.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query) ||
        title.toLowerCase().includes(query) ||
        reason.toLowerCase().includes(query);

      const matchesStatus =
        appliedFilters.status === 'All' ||
        req.status?.toUpperCase() === appliedFilters.status?.toUpperCase();

      const reqDate = req.date ? new Date(req.date) : null;
      const matchesStart =
        !appliedFilters.startDate || !reqDate ||
        reqDate >= new Date(appliedFilters.startDate);
      const matchesEnd =
        !appliedFilters.endDate || !reqDate ||
        reqDate <= new Date(appliedFilters.endDate);

      return matchesSearch && matchesStatus && matchesStart && matchesEnd;
    });
  }, [requests, appliedFilters]);

  return (
    <div className="animate-fade-in-up pb-8 relative">
      {/* Header & Toolbar matching Leave Approvals */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#12151C] dark:text-white mb-1">
            Attendance Regularizations
          </h2>
          <p className="page-sub text-[14px] text-[#5B6472] dark:text-gray-400 mb-[5px]">
            Review and approve attendance regularization requests
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 justify-start md:justify-end w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-[260px] md:w-[300px] group">
            <div className="relative flex items-center search">
              <Search size={15} className="absolute left-3 text-[#9AA3B1] group-focus-within:text-[#2C4FD6] transition-colors" />
              <input
                type="text"
                placeholder="Search by name, email or role..."
                value={appliedFilters.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilters((prev) => ({ ...prev, name: val }));
                  setAppliedFilters((prev) => ({ ...prev, name: val }));
                }}
                className="w-full pl-9 pr-3 py-[9px] h-[36px] bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] transition-all text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
              />
            </div>
          </div>

          {/* All Status Select */}
          <div className="relative group/dropdown">
            <select
              value={appliedFilters.status}
              onChange={(e) => {
                const val = e.target.value;
                setFilters((prev) => ({ ...prev, status: val }));
                setAppliedFilters((prev) => ({ ...prev, status: val }));
              }}
              className="appearance-none flex items-center gap-2 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] px-3 py-[9px] h-[36px] text-[13px] font-semibold text-[#5B6472] dark:text-gray-300 bg-white dark:bg-[#12151C] cursor-pointer transition-all hover:border-[#2C4FD6] focus:ring-2 focus:ring-[#2C4FD6]/20 outline-none pr-8"
            >
              <option value="All">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#5B6472] dark:text-gray-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Filter Icon Button */}
          <button
            onClick={() => {
              setFilters(appliedFilters);
              setShowFilterDrawer(true);
            }}
            className="flex items-center justify-center border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] px-3 py-[9px] h-[36px] text-[13px] font-semibold text-[#5B6472] dark:text-gray-300 bg-white dark:bg-[#12151C] hover:bg-gray-50 dark:hover:bg-white/5 transition-all shrink-0 cursor-pointer"
            title="Advanced Filters"
          >
            <Filter size={15} className="text-[#5B6472] dark:text-gray-300" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Fetching requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800">
          <Calendar size={44} className="mx-auto text-gray-300 mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">No Regularizations Found</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">No requests match your current filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-[#EEF1F5] dark:bg-gray-800/60 text-[#9AA3B1] dark:text-gray-400 text-[11px] font-semibold uppercase tracking-[.05em]">
                  <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800 w-[24%]">
                    EMPLOYEE
                  </th>
                  <th className="py-[9px] px-[40px] border-b border-[#E2E6ED] dark:border-gray-800 w-[14%]">
                    DATE
                  </th>
                  <th className="py-[9px] px-[22px] border-b border-[#E2E6ED] dark:border-gray-800 w-[18%]">
                    PROPOSED IN/OUT
                  </th>
                  <th className="py-[9px] px-[42px] border-b border-[#E2E6ED] dark:border-gray-800 w-[20%]">
                    REASON
                  </th>
                  <th className="py-[9px] px-[31px] border-b border-[#E2E6ED] dark:border-gray-800 w-[12%]">
                    STATUS
                  </th>
                  <th className="py-[9px] px-[82px] border-b border-[#E2E6ED] dark:border-gray-800 text-right w-[12%]">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
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

                  const isPending = req.status?.toUpperCase() === 'PENDING';
                  const isApproved = req.status?.toUpperCase() === 'APPROVED';
                  const isRejected = req.status?.toUpperCase() === 'REJECTED';

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
                        className="py-[13px] px-[22px] text-xs text-[#5B6472] dark:text-gray-300 cursor-pointer hover:text-[#2C4FD6] dark:hover:text-blue-400 transition-colors"
                        title="Click to view full details"
                      >
                        <span className="line-clamp-2">"{req.reason}"</span>
                      </td>
                      <td className="py-[13px] px-[22px]">
                        <span className={`px-[10px] py-[3px] rounded-[3px] text-[11.5px] font-semibold inline-block capitalize ${
                          isApproved
                            ? 'bg-[#E4F5EC] text-[#1F8A5A] dark:bg-green-950/50 dark:text-green-400'
                            : isRejected
                            ? 'bg-[#FBE7E7] text-[#C13A3A] dark:bg-red-950/50 dark:text-red-400'
                            : 'bg-[#FFF7ED] text-[#EA580C] dark:bg-amber-950/50 dark:text-amber-400'
                        }`}>
                          {req.status?.toLowerCase() || 'pending'}
                        </span>
                      </td>
                      <td className="py-[13px] px-[22px] text-right">
                        {isPending ? (
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleApprove(req.id)}
                              className="px-3.5 py-1.5 rounded-[3px] bg-[#E4F5EC] text-[#1F8A5A] hover:bg-[#d1f0e0] text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              title="Approve Request"
                            >
                              <CheckCircle size={14} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleRejectClick(req.id)}
                              className="px-3.5 py-1.5 rounded-[3px] bg-[#FBE7E7] text-[#DE350B] hover:bg-[#f7d6d6] text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              title="Reject Request"
                            >
                              <XIcon size={14} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedRequestForReason(req)}
                            className="inline-flex items-center gap-[6px] border border-[#E2E6ED] dark:border-gray-800 rounded-[3px] px-[10px] py-[5px] text-[12px] font-semibold text-[#5B6472] dark:text-gray-300 bg-white dark:bg-[#12151C] hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                          >
                            <Eye size={13} className="text-[#5B6472] dark:text-gray-300" /> View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filter Drawer matching Leave Approvals */}
      {showFilterDrawer &&
        createPortal(
          <div className="fixed inset-0 z-[999999]">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md"
              onClick={() => setShowFilterDrawer(false)}
            />

            {/* Drawer */}
            <div className="absolute right-0 top-0 w-full max-w-md h-full bg-white dark:bg-[#12151C] animate-slide-in-right border-l border-[#E2E6ED] dark:border-gray-800 shadow-2xl">
              <div className="flex flex-col justify-between h-full p-6">
                {/* TOP */}
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-[#12151C] dark:text-white">
                      Advanced Search
                    </h2>
                    <button
                      onClick={() => setShowFilterDrawer(false)}
                      className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">Employee Name</label>
                      <input
                        type="text"
                        placeholder="Search name, role or reason..."
                        value={filters.name}
                        onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white cursor-pointer"
                      >
                        <option value="All">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">From Date</label>
                        <input
                          type="date"
                          value={filters.startDate}
                          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-[#5B6472] dark:text-gray-300">To Date</label>
                        <input
                          type="date"
                          value={filters.endDate}
                          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] outline-none focus:border-[#2C4FD6] text-[13.5px] text-[#12151C] dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* BUTTONS */}
                <div className="flex gap-3 pt-6 border-t border-[#E2E6ED] dark:border-gray-800">
                  <button
                    onClick={() => {
                      const reset = {
                        name: '',
                        status: 'All',
                        startDate: '',
                        endDate: ''
                      };
                      setFilters(reset);
                      setAppliedFilters(reset);
                    }}
                    className="flex-1 py-2.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#5B6472] dark:text-gray-300 font-semibold text-[13.5px] hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      setAppliedFilters(filters);
                      setShowFilterDrawer(false);
                    }}
                    className="flex-1 py-2.5 rounded-[6px] bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold text-[13.5px] transition-all cursor-pointer"
                  >
                    Apply Search
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Reject Request Modal */}
      {rejectingId &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md" onClick={() => setRejectingId(null)} />
            <div className="relative bg-white dark:bg-[#12151C] w-full max-w-md rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden p-6 animate-scale-in shadow-xl">
              <h3 className="text-base font-bold text-[#12151C] dark:text-white mb-1">Reject Request</h3>
              <p className="text-xs text-[#5B6472] dark:text-gray-400 mb-4">Please provide a reason for rejecting this regularization request.</p>
              <form onSubmit={handleRejectSubmit}>
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Enter rejection reason..."
                  required
                  autoFocus
                  className="w-full px-3 py-2 rounded-[7px] border border-[#E2E6ED] dark:border-gray-700 bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white text-xs outline-none focus:border-[#2C4FD6] min-h-[90px] mb-4 placeholder-[#9AA3B1] resize-none"
                />
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRejectingId(null)}
                    className="flex-1 py-2.5 px-4 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 text-[#5B6472] dark:text-gray-300 font-semibold rounded-[8px] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReject}
                    className="flex-1 py-2.5 px-4 bg-[#DE350B] text-white font-semibold rounded-[8px] hover:bg-[#b02a08] transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-60"
                  >
                    {submittingReject ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reject'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* View Regularization Details Modal */}
      {selectedRequestForReason &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="relative bg-white dark:bg-[#12151C] w-full max-w-md rounded-[11px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4 border-b border-[#E2E6ED] dark:border-gray-800 pb-3">
                <h3 className="text-base font-bold text-[#12151C] dark:text-white">Regularization Details</h3>
                <button
                  type="button"
                  onClick={() => setSelectedRequestForReason(null)}
                  className="text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white transition-colors cursor-pointer"
                >
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Date</label>
                    <div className="p-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[7px] font-semibold text-xs text-[#12151C] dark:text-white font-mono-numbers">
                      {selectedRequestForReason.date}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Status</label>
                    <div className="p-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[7px] font-semibold text-xs text-[#12151C] dark:text-white capitalize">
                      {selectedRequestForReason.status?.toLowerCase() || 'pending'}
                    </div>
                  </div>
                </div>

                {(selectedRequestForReason.proposedIn || selectedRequestForReason.proposedOut) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Proposed In</label>
                      <div className="p-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[7px] font-semibold text-xs text-emerald-700 dark:text-emerald-400 font-mono-numbers">
                        {formatTime12h(selectedRequestForReason.proposedIn || selectedRequestForReason.inTime)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Proposed Out</label>
                      <div className="p-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[7px] font-semibold text-xs text-rose-600 dark:text-rose-400 font-mono-numbers">
                        {formatTime12h(selectedRequestForReason.proposedOut || selectedRequestForReason.outTime)}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Reason</label>
                  <div className="p-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[7px] text-xs text-[#12151C] dark:text-gray-300 leading-relaxed">
                    <div className="max-h-[120px] overflow-y-auto custom-scrollbar break-words">
                      {selectedRequestForReason.reason}
                    </div>
                  </div>
                </div>

                {selectedRequestForReason.approverComment && (
                  <div>
                    <label className="block text-xs font-semibold text-[#DE350B] mb-1">Rejection Reason</label>
                    <div className="p-3 bg-[#FBE7E7]/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-[7px] text-xs text-[#DE350B] leading-relaxed">
                      {selectedRequestForReason.approverComment}
                    </div>
                  </div>
                )}

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
