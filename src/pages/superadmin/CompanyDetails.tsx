import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Building2,
  UserCheck,
  Calendar,
  CreditCard,
  BellRing,
  ArrowLeft,
  Users,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { superAdminApi } from "../../utils/superAdminApi";

export default function CompanyDetails() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.get(`/companies/${id}`);
      setData(res.data.company);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load company details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-[#2C4FD6] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-[#5B6472] dark:text-gray-400">Loading company profile...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-16 text-center text-[#9AA3B1] w-full">
        <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm font-medium">Company not found.</p>
        <Link to="/superadmin/companies" className="text-[#2C4FD6] underline mt-2 inline-block font-semibold">
          Return to Companies
        </Link>
      </div>
    );
  }

  const sub = data.currentSubscription;

  return (
    <div className="w-full text-[#12151C] dark:text-white animate-fade-in font-sans">
      {/* Back Button & Title */}
      <div className="mb-6">
        <Link
          to="/superadmin/companies"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#5B6472] dark:text-gray-400 hover:text-[#2C4FD6] transition-colors mb-3 font-semibold"
        >
          <ArrowLeft size={16} />
          <span>Back to Companies Directory</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[6px] bg-[#2C4FD6] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {data.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#12151C] dark:text-white tracking-tight">
                {data.name}
              </h1>
              <p className="text-xs text-[#9AA3B1] font-mono mt-0.5">
                {data.domain}.encalm-hrms.com • Created on{" "}
                {new Date(data.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div>
            <span
              className={`px-3 py-1 rounded-[3px] text-xs font-semibold ${
                data.isActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
              }`}
            >
              {data.isActive ? "Company Active" : "Company Deactivated"}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Card 1: HR Admin Info */}
        <div className="bg-white dark:bg-[#12151C] p-5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800">
          <div className="flex items-center gap-2 mb-3 text-[#2C4FD6] font-semibold text-[13px]">
            <UserCheck size={16} />
            <span>Designated HR Administrator</span>
          </div>
          {data.hrAdmins && data.hrAdmins.length > 0 ? (
            <div className="space-y-1">
              <p className="font-bold text-base text-[#12151C] dark:text-white">
                {data.hrAdmins[0].name}
              </p>
              <p className="text-sm text-[#5B6472] dark:text-gray-300">{data.hrAdmins[0].email}</p>
              <p className="text-[12px] text-[#9AA3B1] pt-1">
                User ID: #{data.hrAdmins[0].id} • Role: HR_ADMIN
              </p>
            </div>
          ) : (
            <p className="text-[#9AA3B1] text-sm">No primary HR Admin linked.</p>
          )}
        </div>

        {/* Card 2: Current Subscription */}
        <div className="bg-white dark:bg-[#12151C] p-5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800">
          <div className="flex items-center gap-2 mb-3 text-[#2C4FD6] font-semibold text-[13px]">
            <Calendar size={16} />
            <span>Active Subscription Tier</span>
          </div>
          {sub ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-[#12151C] dark:text-white">
                  {sub.planName}
                </span>
                <span className="px-2 py-0.5 rounded-[3px] text-[11px] font-semibold bg-[#E8ECFC] text-[#2C4FD6] uppercase">
                  {sub.billingCycle}
                </span>
              </div>
              <p className="text-sm text-[#5B6472] dark:text-gray-300">
                Expires on:{" "}
                <span className="font-semibold text-[#12151C] dark:text-white">
                  {new Date(sub.endDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </p>
              <p className="text-[12px] text-[#9AA3B1] pt-1">
                {sub.daysRemaining > 0
                  ? `${sub.daysRemaining} days remaining`
                  : `Expired ${Math.abs(sub.daysRemaining)} days ago`}
              </p>
            </div>
          ) : (
            <p className="text-[#9AA3B1] text-sm">No active subscription plan.</p>
          )}
        </div>

        {/* Card 3: Employee Capacity */}
        <div className="bg-white dark:bg-[#12151C] p-5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800">
          <div className="flex items-center gap-2 mb-3 text-[#2C4FD6] font-semibold text-[13px]">
            <Users size={16} />
            <span>Employee Utilization</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-[#12151C] dark:text-white font-mono-numbers">
                {data.employeeCount}
              </span>
              <span className="text-[#9AA3B1] text-xs font-semibold">
                Limit: {sub?.maxEmployees === -1 ? "Unlimited" : `${sub?.maxEmployees || 25} Max`}
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#EEF2F8] dark:bg-gray-800 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-[#2C4FD6] rounded-full transition-all"
                style={{
                  width: `${
                    sub?.maxEmployees > 0
                      ? Math.min((data.employeeCount / sub.maxEmployees) * 100, 100)
                      : 15
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden mb-6">
        <div className="p-4 sm:p-5 border-b border-[#E2E6ED] dark:border-gray-800">
          <h3 className="text-[15px] font-semibold text-[#12151C] dark:text-white flex items-center gap-2">
            <CreditCard size={18} className="text-[#2C4FD6]" />
            <span>Customer Payment Transactions</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          {data.payments && data.payments.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F4F6FB] dark:bg-[#1A1F2C] border-b border-[#E2E6ED] dark:border-gray-800 text-[12px] text-[#5B6472] dark:text-gray-400 font-semibold">
                  <th className="py-3 px-4">Txn Reference ID</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60 text-[13px]">
                {data.payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-[#F9FAFD] dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-mono text-[12px] text-[#5B6472] dark:text-gray-400">
                      {p.transactionId || p.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-[#12151C] dark:text-white font-medium">{p.plan}</td>
                    <td className="py-3 px-4 font-bold text-[#12151C] dark:text-white font-mono-numbers">
                      ₹{Number(p.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-[#5B6472] dark:text-gray-300">{p.paymentMethod}</td>
                    <td className="py-3 px-4 text-[#5B6472] dark:text-gray-400">
                      {new Date(p.paidAt || p.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[#9AA3B1] p-8 text-center text-sm">No payment history found for this company.</p>
          )}
        </div>
      </div>

      {/* Subscription Notifications Sent History */}
      <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E2E6ED] dark:border-gray-800">
          <h3 className="text-[15px] font-semibold text-[#12151C] dark:text-white flex items-center gap-2">
            <BellRing size={18} className="text-[#2C4FD6]" />
            <span>Subscription Expiry Reminders Dispatched</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          {data.recentNotifications && data.recentNotifications.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F4F6FB] dark:bg-[#1A1F2C] border-b border-[#E2E6ED] dark:border-gray-800 text-[12px] text-[#5B6472] dark:text-gray-400 font-semibold">
                  <th className="py-3 px-4">Reminder Type</th>
                  <th className="py-3 px-4">Message Content</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Dispatched At</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60 text-[13px]">
                {data.recentNotifications.map((n: any) => (
                  <tr key={n.id} className="hover:bg-[#F9FAFD] dark:hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#12151C] dark:text-white">
                      {n.notificationType}
                    </td>
                    <td className="py-3 px-4 text-[#5B6472] dark:text-gray-300 max-w-sm truncate">
                      {n.message}
                    </td>
                    <td className="py-3 px-4 text-[#5B6472] dark:text-gray-400 font-medium">{n.channel}</td>
                    <td className="py-3 px-4 text-[#5B6472] dark:text-gray-400">
                      {new Date(n.sentAt || n.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold bg-[#E8ECFC] text-[#2C4FD6]">
                        {n.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[#9AA3B1] p-8 text-center text-sm">No automated or manual reminders sent yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
