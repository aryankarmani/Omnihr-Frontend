import React, { useEffect, useState } from "react";
import {
  CalendarCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { superAdminApi } from "../../utils/superAdminApi";

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals state
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [extendDays, setExtendDays] = useState("30");
  const [submitting, setSubmitting] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const res = await superAdminApi.get("/subscriptions", { params });
      setSubscriptions(res.data.subscriptions || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter]);

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    try {
      setSubmitting(true);
      await superAdminApi.put(`/subscriptions/${selectedSub.id}`, {
        extendDays: Number(extendDays),
      });
      toast.success(`Subscription extended by ${extendDays} days!`);
      setShowExtendModal(false);
      setSelectedSub(null);
      fetchSubscriptions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to extend subscription.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSuspend = async (sub: any) => {
    const newStatus = sub.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    try {
      await superAdminApi.put(`/subscriptions/${sub.id}`, {
        status: newStatus,
      });
      toast.success(`Subscription ${newStatus.toLowerCase()} successfully.`);
      fetchSubscriptions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update status.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 size={12} />
            Active
          </span>
        );
      case "EXPIRING_SOON":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <AlertTriangle size={12} />
            Expiring Soon
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
            <XCircle size={12} />
            Expired
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
            <ShieldAlert size={12} />
            Suspended
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="w-full text-[#12151C] dark:text-white animate-fade-in font-sans">
      {/* Header */}
      <header className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight text-[#12151C] dark:text-white mb-1">
          Subscriptions Management
        </h2>
        <p className="text-sm text-[#5B6472] dark:text-gray-400">
          Monitor customer SaaS validity, renewal periods and manage suspension or extensions.
        </p>
      </header>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#12151C] p-4 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="text-[#9AA3B1] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchSubscriptions()}
            placeholder="Search company or domain..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1] outline-none focus:border-[#2C4FD6] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6] cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-3 border-[#2C4FD6] border-t-transparent rounded-full animate-spin" />
              <span className="text-[#5B6472] dark:text-gray-400 text-sm">Loading subscriptions...</span>
            </div>
          ) : subscriptions.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F4F6FB] dark:bg-[#1A1F2C] border-b border-[#E2E6ED] dark:border-gray-800 text-[12px] text-[#5B6472] dark:text-gray-400 font-semibold">
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Billing Cycle</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Remaining</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60 text-[13.5px]">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F9FAFD] dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#12151C] dark:text-white block">
                        {s.companyName}
                      </span>
                      <span className="text-[11px] text-[#9AA3B1] font-mono">
                        {s.companyDomain}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-[3px] font-semibold text-[11px] bg-[#E8ECFC] text-[#2C4FD6]">
                        {s.planName}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-[#5B6472] dark:text-gray-300 capitalize">
                        {s.billingCycle?.toLowerCase()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#5B6472] dark:text-gray-400">
                      {new Date(s.startDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-[#12151C] dark:text-white">
                      {new Date(s.endDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-[#12151C] dark:text-white font-medium">
                        {s.daysRemaining > 0
                          ? `${s.daysRemaining} days`
                          : `${Math.abs(s.daysRemaining)} days ago`}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">{getStatusBadge(s.status)}</td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedSub(s);
                            setShowExtendModal(true);
                          }}
                          className="px-3 py-1.5 bg-[#E8ECFC] hover:bg-[#D9E1FA] text-[#2C4FD6] rounded-[6px] text-[12px] font-semibold transition-colors cursor-pointer"
                        >
                          Extend
                        </button>
                        <button
                          onClick={() => handleToggleSuspend(s)}
                          className={`px-3 py-1.5 rounded-[6px] text-[12px] font-semibold transition-colors cursor-pointer ${
                            s.status === "SUSPENDED"
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400"
                          }`}
                        >
                          {s.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center text-[#9AA3B1]">
              <CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No subscriptions found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Extend Modal */}
      {showExtendModal && selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6 max-w-md w-full shadow-xl animate-fade-in space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#12151C] dark:text-white">
                Extend Subscription Validity
              </h3>
              <p className="text-[13px] text-[#5B6472] dark:text-gray-400 mt-0.5">
                {selectedSub.companyName} • Currently expires on{" "}
                {new Date(selectedSub.endDate).toLocaleDateString("en-IN")}
              </p>
            </div>

            <form onSubmit={handleExtend} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1.5">
                  Extension Duration (Days)
                </label>
                <select
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                >
                  <option value="15">15 Days</option>
                  <option value="30">30 Days (1 Month)</option>
                  <option value="60">60 Days (2 Months)</option>
                  <option value="90">90 Days (3 Months)</option>
                  <option value="180">180 Days (6 Months)</option>
                  <option value="365">365 Days (1 Year)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E6ED] dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowExtendModal(false);
                    setSelectedSub(null);
                  }}
                  className="px-4 py-2 text-[13px] font-semibold text-[#5B6472] dark:text-gray-300 hover:bg-[#EEF1F5] dark:hover:bg-white/5 rounded-[6px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13px] font-semibold shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Extending..." : "Confirm Extension"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
