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
  Eye,
  Coffee
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';

interface RegularizationRequest {
  id: string;
  userId: number;
  date: string;
  inTime?: string;
  outTime?: string;
  proposedIn?: string;
  proposedOut?: string;
  correctionType?: string;
  proposedBreakStart?: string;
  proposedBreakEnd?: string;
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
  const { user, hasPermission } = useAuth();

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

  // Approval modal state
  const [approvingItem, setApprovingItem] = useState<{ id: string; name: string; details?: string } | null>(null);
  const [submittingApprove, setSubmittingApprove] = useState(false);

  // Rejection modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // View details modal state
  const [selectedRequestForReason, setSelectedRequestForReason] = useState<RegularizationRequest | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/regularize/pending?status=All');
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      console.error('Error fetching regularizations:', error);
      toast.error(error.response?.data?.message || 'Failed to load corrections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApproveConfirm = async () => {
    if (!approvingItem || submittingApprove) return;
    try {
      setSubmittingApprove(true);
      await api.put(`/attendance/regularize/${approvingItem.id}/approve`);
      toast.success('Attendance correction approved successfully');
      setRequests((prev) =>
        prev.map((r) => (r.id === approvingItem.id ? { ...r, status: 'APPROVED' } : r))
      );
      setApprovingItem(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setSubmittingApprove(false);
    }
  };

  const handleRejectClick = (id: string) => {
    setRejectingId(id);
    setRejectComment('');
    setRejectError('');
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectComment.trim()) {
      setRejectError('Please provide a reason for rejecting this correction request');
      return;
    }
    if (!rejectingId) return;

    setRejectError('');
    setSubmittingReject(true);
    try {
      await api.put(`/attendance/regularize/${rejectingId}/reject`, {
        reason: rejectComment.trim(),
        approverComment: rejectComment.trim()
      });
      toast.success('Attendance correction rejected');
      setRequests((prev) =>
        prev.map((r) => (r.id === rejectingId ? { ...r, status: 'REJECTED', approverComment: rejectComment.trim() } : r))
      );
      setRejectingId(null);
      setRejectComment('');
      setRejectError('');
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
            Attendance Corrections
          </h2>
          <p className="page-sub text-[14px] text-[#5B6472] dark:text-gray-400 mb-[5px]">
            Review and approve attendance correction requests
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
          >
            <Filter size={15} className="text-[#5B6472] dark:text-gray-300" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden animate-fade-in">
          <div className="divide-y divide-[#E2E6ED] dark:divide-gray-800">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[6px] skeleton-shimmer shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-32 skeleton-shimmer rounded-[4px]" />
                    <div className="h-2.5 w-20 skeleton-shimmer rounded-[4px]" />
                  </div>
                </div>
                <div className="h-3.5 w-24 skeleton-shimmer rounded-[4px] hidden sm:block" />
                <div className="h-3.5 w-24 skeleton-shimmer rounded-[4px] hidden md:block" />
                <div className="h-5 w-20 skeleton-shimmer rounded-full" />
                <div className="flex gap-2">
                  <div className="h-7 w-16 skeleton-shimmer rounded-[6px]" />
                  <div className="h-7 w-16 skeleton-shimmer rounded-[6px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800">
          <Calendar size={44} className="mx-auto text-gray-300 mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">No Corrections Found</h3>
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
                  <th className="py-[9px] px-[40px] border-b border-[#E2E6ED] dark:border-gray-800 w-[14%] translate-x-[-50px]">
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
                      <td className="py-[13px] px-[22px] text-xs text-[#12151C] dark:text-white font-mono-numbers translate-x-[-50px]">
                        {req.date}
                      </td>
                      <td className="py-[13px] px-[22px] text-xs">
                        <div className="flex flex-col gap-1">
                          {req.correctionType === 'BREAK_IN' || req.reason?.includes('Break In') ? (
                            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold text-xs">
                              <Coffee size={12} className="text-amber-600 shrink-0" />
                              <span>Break In: {formatTime12h(req.proposedBreakStart || req.proposedIn || req.inTime)}</span>
                            </div>
                          ) : req.correctionType === 'BREAK_OUT' || req.reason?.includes('Break Out') ? (
                            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold text-xs">
                              <Coffee size={12} className="text-amber-600 shrink-0" />
                              <span>Break Out: {formatTime12h(req.proposedBreakEnd || req.proposedOut || req.outTime)}</span>
                            </div>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                      </td>
                      <td
                        onClick={() => setSelectedRequestForReason(req)}
                        className="py-[13px] px-[22px] text-xs text-[#5B6472] dark:text-gray-300 cursor-pointer hover:text-[#2C4FD6] dark:hover:text-blue-400 transition-colors"
                      >
                        <span className="line-clamp-2">"{req.reason}"</span>
                      </td>
                      <td className="py-[13px] px-[22px]">
                        <span className={`px-[10px] py-[3px] rounded-[3px] text-[11.5px] font-semibold inline-block capitalize ${isApproved
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
                          (user?.role === 'SUPER_ADMIN' || hasPermission('ATTENDANCE_APPROVE')) ? (
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => setApprovingItem({
                                  id: req.id,
                                  name: req.user?.name || `Employee #${req.userId}`,
                                  details: `${req.reason || 'Correction request'}${req.date ? ` · ${req.date}` : ''}`
                                })}
                                disabled={submittingApprove && approvingItem?.id === req.id}
                                className="px-3.5 py-1.5 rounded-[3px] bg-[#E4F5EC] text-[#1F8A5A] hover:bg-[#d1f0e0] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle size={14} />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleRejectClick(req.id)}
                                className="px-3.5 py-1.5 rounded-[3px] bg-[#FBE7E7] text-[#DE350B] hover:bg-[#f7d6d6] text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <XIcon size={14} />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end pr-[53px]">
                              <button
                                onClick={() => setSelectedRequestForReason(req)}
                                className="inline-flex items-center gap-[6px] border border-[#E2E6ED] dark:border-gray-800 rounded-[3px] px-[10px] py-[5px] text-[12px] font-semibold text-[#5B6472] dark:text-gray-300 bg-white dark:bg-[#12151C] hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                              >
                                <Eye size={13} className="text-[#5B6472] dark:text-gray-300" /> View
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center justify-end pr-[53px]">
                            <button
                              onClick={() => setSelectedRequestForReason(req)}
                              className="inline-flex items-center gap-[6px] border border-[#E2E6ED] dark:border-gray-800 rounded-[3px] px-[10px] py-[5px] text-[12px] font-semibold text-[#5B6472] dark:text-gray-300 bg-white dark:bg-[#12151C] hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer"
                            >
                              <Eye size={13} className="text-[#5B6472] dark:text-gray-300" /> View
                            </button>
                          </div>
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

      {/* Approval Confirmation Modal */}
      {approvingItem &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md"
              onClick={() => {
                if (!submittingApprove) {
                  setApprovingItem(null);
                }
              }}
            />
            <div className="relative bg-white dark:bg-[#12151C] w-full max-w-md rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden p-6 animate-scale-in shadow-xl">
              <h3 className="text-base font-bold text-[#12151C] dark:text-white mb-1">Approve Request</h3>
              <p className="text-xs text-[#5B6472] dark:text-gray-400 mb-4">
                Are you sure you want to approve this correction request for <strong className="text-[#12151C] dark:text-white font-semibold">{approvingItem.name}</strong>?
              </p>
              {approvingItem.details && (
                <div className="mb-5 p-3 rounded-[6px] bg-[#F7F8FA] dark:bg-gray-800/60 border border-[#E2E6ED] dark:border-gray-700 text-xs text-[#5B6472] dark:text-gray-300">
                  <span className="font-semibold text-[#12151C] dark:text-white block mb-0.5">Details</span>
                  <span>{approvingItem.details}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setApprovingItem(null)}
                  disabled={submittingApprove}
                  className="flex-1 py-2.5 px-4 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 text-[#5B6472] dark:text-gray-300 font-semibold rounded-[6px] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-xs cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApproveConfirm}
                  disabled={submittingApprove}
                  className="flex-1 py-2.5 px-4 bg-[#1F8A5A] text-white font-semibold rounded-[6px] hover:bg-[#186f48] transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-60"
                >
                  {submittingApprove ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Approve'
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Reject Request Modal */}
      {rejectingId &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/20 dark:bg-black/60 backdrop-blur-md"
              onClick={() => {
                if (!submittingReject) {
                  setRejectingId(null);
                  setRejectComment('');
                  setRejectError('');
                }
              }}
            />
            <div className="relative bg-white dark:bg-[#12151C] w-full max-w-md rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden p-6 animate-scale-in shadow-xl">
              <h3 className="text-base font-bold text-[#12151C] dark:text-white mb-1">Reject Request</h3>
              <p className="text-xs text-[#5B6472] dark:text-gray-400 mb-4">Please provide a reason for rejecting this correction request.</p>
              <form onSubmit={handleRejectSubmit} noValidate>
                <textarea
                  value={rejectComment}
                  onChange={(e) => {
                    setRejectComment(e.target.value);
                    if (rejectError) setRejectError('');
                  }}
                  placeholder="Enter rejection reason..."
                  autoFocus
                  className={`w-full px-3 py-2 rounded-[6px] border ${
                    rejectError
                      ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20'
                      : 'border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]'
                  } bg-white dark:bg-[#12151C] text-[#12151C] dark:text-white text-xs outline-none min-h-[90px] mb-2 placeholder-[#9AA3B1] resize-none transition-all`}
                />
                {rejectError && (
                  <p className="text-[11.5px] text-red-500 font-medium mb-3 animate-fade-in">{rejectError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingId(null);
                      setRejectComment('');
                      setRejectError('');
                    }}
                    disabled={submittingReject}
                    className="flex-1 py-2.5 px-4 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 text-[#5B6472] dark:text-gray-300 font-semibold rounded-[6px] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReject}
                    className="flex-1 py-2.5 px-4 bg-[#DE350B] text-white font-semibold rounded-[6px] hover:bg-[#b02a08] transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-60"
                  >
                    {submittingReject ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Reject'
                    )}
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
            <div className="relative bg-white dark:bg-[#12151C] w-full max-w-md rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4 border-b border-[#E2E6ED] dark:border-gray-800 pb-3">
                <h3 className="text-base font-bold text-[#12151C] dark:text-white">Correction Details</h3>
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
                  <div className="p-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] font-semibold text-xs text-[#12151C] dark:text-white">
                    {selectedRequestForReason.user?.name || `Employee #${selectedRequestForReason.userId}`}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Date</label>
                    <div className="p-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] font-semibold text-xs text-[#12151C] dark:text-white font-mono-numbers">
                      {selectedRequestForReason.date}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Status</label>
                    <div className="p-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] font-semibold text-xs text-[#12151C] dark:text-white capitalize">
                      {selectedRequestForReason.status?.toLowerCase() || 'pending'}
                    </div>
                  </div>
                </div>

                {(selectedRequestForReason.proposedIn || selectedRequestForReason.proposedOut) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Proposed In</label>
                      <div className="p-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] font-semibold text-xs text-emerald-700 dark:text-emerald-400 font-mono-numbers">
                        {formatTime12h(selectedRequestForReason.proposedIn || selectedRequestForReason.inTime)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Proposed Out</label>
                      <div className="p-2.5 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] font-semibold text-xs text-rose-600 dark:text-rose-400 font-mono-numbers">
                        {formatTime12h(selectedRequestForReason.proposedOut || selectedRequestForReason.outTime)}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#5B6472] dark:text-gray-400 mb-1">Reason</label>
                  <div className="p-3 bg-[#F7F8FA] dark:bg-white/5 border border-[#E2E6ED] dark:border-gray-800 rounded-[6px] text-xs text-[#12151C] dark:text-gray-300 leading-relaxed">
                    <div className="max-h-[120px] overflow-y-auto custom-scrollbar break-words">
                      {selectedRequestForReason.reason}
                    </div>
                  </div>
                </div>

                {selectedRequestForReason.approverComment && (
                  <div>
                    <label className="block text-xs font-semibold text-[#DE350B] mb-1">Rejection Reason</label>
                    <div className="p-3 bg-[#FBE7E7]/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-[6px] text-xs text-[#DE350B] leading-relaxed">
                      {selectedRequestForReason.approverComment}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRequestForReason(null)}
                    className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white font-semibold rounded-[6px] transition-colors text-xs cursor-pointer"
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
