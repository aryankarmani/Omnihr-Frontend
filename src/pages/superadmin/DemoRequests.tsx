import React, { useEffect, useState } from "react";
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Eye,
  Mail,
  Send,
  Building,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { superAdminApi } from "../../utils/superAdminApi";

interface DemoRequest {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  companyName: string | null;
  teamSize: string | null;
  message: string | null;
  source: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function DemoRequests() {
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    emailed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Details Modal
  const [selectedRequest, setSelectedRequest] = useState<DemoRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Send Email Modal
  const [emailModalRequest, setEmailModalRequest] = useState<DemoRequest | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== "ALL") params.status = statusFilter;

      const res = await superAdminApi.get("/demo-requests", { params });
      setRequests(res.data.data || []);
      if (res.data.counts) {
        setCounts({
          total: res.data.counts.total || 0,
          pending: res.data.counts.pending || 0,
          emailed: res.data.counts.emailed || 0,
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load demo requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchRequests();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, statusFilter]);

  const handleOpenEmailModal = (req: DemoRequest) => {
    setEmailModalRequest(req);
    const greetingName = req.name ? req.name.trim() : "there";
    setEmailSubject("OmniHR Product Walkthrough Demo Invitation");
    setEmailMessage(
`Hello ${greetingName},

Thank you for your interest in OmniHR!

We received your request for a product walkthrough. We would love to give you a personalized 15-20 minute demo and show you how OmniHR can automate your employee directory, attendance tracking, leave management, and payroll.

Please let us know your preferred day and time for a quick Google Meet or Zoom call, or feel free to reply directly with any questions.

Looking forward to speaking with you!

Best regards,
The OmniHR Team`
    );
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailModalRequest) return;
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast.error("Please provide both subject and message");
      return;
    }

    try {
      setSendingEmail(true);
      const res = await superAdminApi.post(
        `/demo-requests/${emailModalRequest.id}/send-email`,
        {
          subject: emailSubject.trim(),
          message: emailMessage.trim(),
        }
      );

      toast.success(res.data.message || `Email sent successfully to ${emailModalRequest.email}!`);
      setIsEmailModalOpen(false);
      fetchRequests();

      if (selectedRequest && selectedRequest.id === emailModalRequest.id) {
        setSelectedRequest({
          ...selectedRequest,
          status: "EMAIL_SENT",
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send email. Please try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this demo request?")) return;

    try {
      await superAdminApi.delete(`/demo-requests/${id}`);
      toast.success("Demo request deleted successfully");
      fetchRequests();
      if (selectedRequest && selectedRequest.id === id) {
        setIsDetailsOpen(false);
      }
      if (emailModalRequest && emailModalRequest.id === id) {
        setIsEmailModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete demo request.");
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "EMAIL_SENT") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 size={12} />
          Email Sent
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400">
        <Clock size={12} />
        Pending
      </span>
    );
  };

  const getSourceBadge = (source: string) => {
    if (source === "HERO_MODAL") {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
          Hero Book Demo
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-gray-800 dark:text-gray-300">
        Bottom Banner
      </span>
    );
  };

  const totalPages = Math.ceil(requests.length / perPage) || 1;
  const startIndex = (currentPage - 1) * perPage;
  const paginatedRequests = requests.slice(startIndex, startIndex + perPage);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Demo Requests
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View landing page demo requests and easily email customers directly with product walkthrough details.
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Simplified Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/80 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Requests</span>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{counts.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/80 dark:border-gray-700">
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Pending (Awaiting Email)</span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{counts.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/80 dark:border-gray-700">
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Email Sent</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{counts.emailed}</p>
        </div>
      </div>

      {/* Search & Simple Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/80 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by customer email, name, or company..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C4FD6] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2C4FD6]"
          >
            <option value="ALL">All Requests</option>
            <option value="PENDING">Pending</option>
            <option value="EMAIL_SENT">Email Sent</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Company</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-[#2C4FD6]" />
                      Loading demo requests...
                    </div>
                  </td>
                </tr>
              ) : paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Users size={32} className="mx-auto mb-2 text-gray-300" />
                    No demo requests found.
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-750/50 transition-colors"
                  >
                    {/* Customer Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {req.name || "Customer Lead"}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                        <Mail size={12} className="text-gray-400" />
                        <span className="text-[#2C4FD6] font-medium">{req.email}</span>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                        <Building size={14} className="text-gray-400" />
                        {req.companyName || "—"}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {req.teamSize ? `Team: ${req.teamSize}` : "Team: Not specified"}
                      </div>
                    </td>

                    {/* Source */}
                    <td className="py-3.5 px-4">{getSourceBadge(req.source)}</td>

                    {/* Simple Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(req.status)}</td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {/* Send Email Button */}
                        <button
                          onClick={() => handleOpenEmailModal(req)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2C4FD6] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          <Send size={12} />
                          Send Email
                        </button>

                        {/* View Details */}
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                            setIsDetailsOpen(true);
                          }}
                          title="View Request Details"
                          className="p-1.5 text-gray-500 hover:text-[#2C4FD6] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors cursor-pointer"
                        >
                          <Eye size={16} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(req.id)}
                          title="Delete Request"
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {requests.length > 0 && (
          <div className="py-3.5 px-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <div>
              Showing {startIndex + 1} to{" "}
              {Math.min(startIndex + perPage, requests.length)} of {requests.length} results
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 disabled:opacity-40 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 font-medium text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 disabled:opacity-40 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SEND EMAIL MODAL (FULLY FUNCTIONAL) */}
      {/* ======================================================== */}
      {isEmailModalOpen && emailModalRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEmailModalOpen(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Mail size={18} className="text-[#2C4FD6]" />
                  Send Email to Customer
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  To: <span className="font-semibold text-gray-800 dark:text-gray-200">{emailModalRequest.email}</span>
                  {emailModalRequest.name && ` (${emailModalRequest.name})`}
                </p>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Email Subject */}
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Subject
              </label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email Subject"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2C4FD6]"
              />
            </div>

            {/* Email Message */}
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Message Body
              </label>
              <textarea
                rows={9}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Write your email to the customer..."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2C4FD6] font-sans leading-relaxed"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingEmail}
                onClick={handleSendEmail}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2C4FD6] hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {sendingEmail ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Sending Email...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Send Email Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DETAILS MODAL */}
      {/* ======================================================== */}
      {isDetailsOpen && selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs cursor-pointer"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsDetailsOpen(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Demo Request Details
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Source: {selectedRequest.source} • Status: {selectedRequest.status}
                </p>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 dark:bg-gray-900/60 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="overflow-hidden">
                <span className="text-gray-400 block font-medium">Customer Name</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200 break-words">
                  {selectedRequest.name || "N/A"}
                </span>
              </div>
              <div className="overflow-hidden">
                <span className="text-gray-400 block font-medium">Work Email</span>
                <span className="font-semibold text-[#2C4FD6] break-all">
                  {selectedRequest.email}
                </span>
              </div>
              <div className="overflow-hidden">
                <span className="text-gray-400 block font-medium">Company Name</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200 break-words">
                  {selectedRequest.companyName || "N/A"}
                </span>
              </div>
              <div className="overflow-hidden">
                <span className="text-gray-400 block font-medium">Team Size</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {selectedRequest.teamSize || "N/A"}
                </span>
              </div>
              <div className="overflow-hidden col-span-2">
                <span className="text-gray-400 block font-medium">Submitted At</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {new Date(selectedRequest.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Customer message if any */}
            {selectedRequest.message && (
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Customer Message / Requirements:
                </label>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700 break-words break-all whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedRequest.message}
                </div>
              </div>
            )}

            {/* History / Notes */}
            {selectedRequest.notes && (
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Email &amp; Activity Log:
                </label>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs text-gray-600 dark:text-gray-400 border border-gray-200/60 dark:border-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto font-mono text-[11px]">
                  {selectedRequest.notes}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => handleDelete(selectedRequest.id)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                Delete Request
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDetailsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setIsDetailsOpen(false);
                    handleOpenEmailModal(selectedRequest);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2C4FD6] hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                >
                  <Send size={12} />
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
