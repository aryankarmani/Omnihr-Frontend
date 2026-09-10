import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Power,
  Users,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { superAdminApi } from "../../utils/superAdminApi";

export default function Companies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const res = await superAdminApi.get("/companies", { params });
      setCompanies(res.data.companies || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load companies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCompanies();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, statusFilter]);

  const handleToggleStatus = async (companyId: string, currentStatus: boolean) => {
    try {
      setUpdatingId(companyId);
      await superAdminApi.put(`/companies/${companyId}/status`, {
        isActive: !currentStatus,
      });
      toast.success(`Company ${!currentStatus ? "activated" : "deactivated"} successfully.`);
      fetchCompanies();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update company status.");
    } finally {
      setUpdatingId(null);
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
          Companies Directory
        </h2>
        <p className="text-sm text-[#5B6472] dark:text-gray-400">
          All registered customer tenants, their assigned HR Admins and subscription plans.
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
            placeholder="Search company, domain or email..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1] outline-none focus:border-[#2C4FD6] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6] cursor-pointer"
          >
            <option value="">All Subscription Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRING_SOON">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-3 border-[#2C4FD6] border-t-transparent rounded-full animate-spin" />
              <span className="text-[#5B6472] dark:text-gray-400 text-sm">Loading companies...</span>
            </div>
          ) : companies.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F4F6FB] dark:bg-[#1A1F2C] border-b border-[#E2E6ED] dark:border-gray-800 text-[12px] text-[#5B6472] dark:text-gray-400 font-semibold">
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">HR Admin</th>
                  <th className="py-3 px-4">Plan & Cycle</th>
                  <th className="py-3 px-4">Subscription Status</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Employees</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60 text-[13.5px]">
                {companies.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-[#F9FAFD] dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[6px] bg-[#E8ECFC] text-[#2C4FD6] font-bold text-sm flex items-center justify-center shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/superadmin/companies/${c.id}`}
                            className="font-bold text-[#12151C] dark:text-white hover:text-[#2C4FD6] transition-colors block truncate"
                          >
                            {c.name}
                          </Link>
                          <span className="block text-[11px] text-[#9AA3B1] font-mono">
                            {c.domain}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="min-w-0">
                        <span className="font-semibold text-[#12151C] dark:text-white block">
                          {c.hrAdminName}
                        </span>
                        <span className="text-[11.5px] text-[#5B6472] dark:text-gray-400 truncate block">
                          {c.hrAdminEmail}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-[3px] font-semibold text-[11px] bg-[#E8ECFC] text-[#2C4FD6]">
                          {c.planName}
                        </span>
                        <span className="text-[12px] text-[#5B6472] dark:text-gray-400 capitalize">
                          {c.billingCycle?.toLowerCase()}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">{getStatusBadge(c.subscriptionStatus)}</td>

                    <td className="py-3.5 px-4">
                      {c.expiryDate ? (
                        <div className="min-w-0">
                          <span className="text-[#12151C] dark:text-white font-medium block">
                            {new Date(c.expiryDate).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-[11.5px] text-[#5B6472] dark:text-gray-400">
                            {c.daysRemaining > 0
                              ? `${c.daysRemaining} days left`
                              : `${Math.abs(c.daysRemaining)} days ago`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#9AA3B1]">N/A</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-[#5B6472] dark:text-gray-300 font-medium">
                        <Users size={15} className="text-[#9AA3B1]" />
                        <span>
                          {c.employeeCount} / {c.maxEmployees === -1 ? "Unlimited" : c.maxEmployees}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(c.id, c.isActive)}
                          disabled={updatingId === c.id}
                          title={c.isActive ? "Deactivate Company" : "Activate Company"}
                          className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                            c.isActive
                              ? "text-[#5B6472] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          }`}
                        >
                          <Power size={16} />
                        </button>
                        <Link
                          to={`/superadmin/companies/${c.id}`}
                          className="p-1.5 text-[#2C4FD6] hover:bg-[#E8ECFC] rounded-[6px] transition-colors inline-flex items-center gap-1 text-[12px] font-semibold"
                          title="View Company Details"
                        >
                          <span>View</span>
                          <ExternalLink size={13} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center text-[#9AA3B1]">
              <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No companies found matching your query.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
