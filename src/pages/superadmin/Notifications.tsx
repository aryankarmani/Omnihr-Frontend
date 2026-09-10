import React, { useEffect, useState } from "react";
import {
  BellRing,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { superAdminApi } from "../../utils/superAdminApi";

export default function Notifications() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.get("/notifications");
      setData(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load notifications overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleSendManual = async (subscriptionId: string) => {
    try {
      setSendingId(subscriptionId);
      await superAdminApi.post("/notifications/send", { subscriptionId });
      toast.success("Notification reminder dispatched to HR Admin!");
      fetchOverview();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send notification.");
    } finally {
      setSendingId(null);
    }
  };

  const handleTriggerCheck = async () => {
    try {
      setChecking(true);
      await superAdminApi.post("/notifications/check");
      toast.success("Expiry check triggered successfully.");
      fetchOverview();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to trigger check.");
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#2C4FD6] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-[#5B6472] dark:text-gray-400">Loading notifications center...</p>
        </div>
      </div>
    );
  }

  const schedule = [
    { label: "30 Days Before Expiry", code: "EXPIRY_30_DAYS", desc: "First renewal courtesy reminder" },
    { label: "15 Days Before Expiry", code: "EXPIRY_15_DAYS", desc: "Mid-cycle upcoming renewal reminder" },
    { label: "7 Days Before Expiry",  code: "EXPIRY_7_DAYS",  desc: "Urgent renewal warning (Banner active)" },
    { label: "3 Days Before Expiry",  code: "EXPIRY_3_DAYS",  desc: "Critical service suspension alert" },
    { label: "1 Day Before Expiry",   code: "EXPIRY_1_DAY",   desc: "Final reminder before expiration" },
    { label: "On Expiry Day",         code: "SUBSCRIPTION_EXPIRED", desc: "Account moved to read-only mode" },
  ];

  const expiring = data?.expiringCompanies || [];
  const history = data?.history || [];

  return (
    <div className="w-full text-[#12151C] dark:text-white animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#12151C] dark:text-white mb-1">
            Subscription Expiry Notifications
          </h2>
          <p className="text-sm text-[#5B6472] dark:text-gray-400">
            Automated reminder cadence schedule, pending alerts and dispatch audit ledger.
          </p>
        </div>
        <button
          onClick={handleTriggerCheck}
          disabled={checking}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13px] font-semibold shadow-sm transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw size={15} className={checking ? "animate-spin" : ""} />
          <span>{checking ? "Checking..." : "Trigger Cadence Run"}</span>
        </button>
      </div>

      {/* Cadence Config Panel */}
      <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-5 sm:p-6 mb-6">
        <h3 className="text-[15px] font-semibold text-[#12151C] dark:text-white mb-1 flex items-center gap-2">
          <Clock size={18} className="text-[#2C4FD6]" />
          <span>Configured Expiry Reminder Cadence</span>
        </h3>
        <p className="text-[12.5px] text-[#9AA3B1] dark:text-gray-400 mb-4">
          The background daemon checks validity every hour and dispatches in-app notices and emails without duplicates.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {schedule.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 bg-[#F4F6FB]/70 dark:bg-white/5 flex items-start gap-3"
            >
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#12151C] dark:text-white block text-[13px]">
                  {item.label}
                </span>
                <span className="text-[12px] text-[#5B6472] dark:text-gray-400 block mt-0.5">
                  {item.desc}
                </span>
                <span className="inline-block mt-1 font-mono text-[10px] text-[#2C4FD6] bg-[#E8ECFC] dark:bg-white/10 px-1.5 py-0.5 rounded-[3px]">
                  {item.code}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expiring Companies Table with Manual Action */}
      <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden mb-6">
        <div className="p-4 sm:p-5 border-b border-[#E2E6ED] dark:border-gray-800">
          <h3 className="text-[15px] font-semibold text-[#12151C] dark:text-white flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            <span>Companies Approaching Expiry (≤ 30 Days)</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          {expiring.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F4F6FB] dark:bg-[#1A1F2C] border-b border-[#E2E6ED] dark:border-gray-800 text-[12px] text-[#5B6472] dark:text-gray-400 font-semibold">
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Remaining</th>
                  <th className="py-3 px-4 text-right">Manual Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60 text-[13.5px]">
                {expiring.map((c: any) => (
                  <tr key={c.id} className="hover:bg-[#F9FAFD] dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#12151C] dark:text-white block">
                        {c.companyName}
                      </span>
                      <span className="text-[11px] text-[#9AA3B1] font-mono">
                        {c.contactEmail || c.companyDomain}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-[3px] font-semibold text-[11px] bg-[#E8ECFC] text-[#2C4FD6]">
                        {c.planName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#12151C] dark:text-gray-200">
                      {new Date(c.endDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        {c.daysRemaining > 0
                          ? `${c.daysRemaining} days left`
                          : `Expired ${Math.abs(c.daysRemaining)} days ago`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleSendManual(c.id)}
                        disabled={sendingId === c.id}
                        className="px-3.5 py-1.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                      >
                        <Send size={13} />
                        <span>{sendingId === c.id ? "Sending..." : "Send Reminder Now"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-[#9AA3B1] text-sm font-medium">
              No companies currently in the 30-day expiry window.
            </div>
          )}
        </div>
      </div>

      {/* Dispatch History Audit Ledger */}
      <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E2E6ED] dark:border-gray-800">
          <h3 className="text-[15px] font-semibold text-[#12151C] dark:text-white flex items-center gap-2">
            <BellRing size={18} className="text-[#2C4FD6]" />
            <span>Notification Dispatch History Log</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          {history.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F4F6FB] dark:bg-[#1A1F2C] border-b border-[#E2E6ED] dark:border-gray-800 text-[12px] text-[#5B6472] dark:text-gray-400 font-semibold">
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Notification Type</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Message Content</th>
                  <th className="py-3 px-4">Dispatched At</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60 text-[13px]">
                {history.map((h: any) => (
                  <tr key={h.id} className="hover:bg-[#F9FAFD] dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-[#12151C] dark:text-white">
                      {h.companyName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#2C4FD6]">
                      {h.notificationType}
                    </td>
                    <td className="py-3.5 px-4 text-[#5B6472] dark:text-gray-300 font-medium">
                      {h.channel}
                    </td>
                    <td className="py-3.5 px-4 text-[#5B6472] dark:text-gray-300 max-w-sm truncate">
                      {h.message}
                    </td>
                    <td className="py-3.5 px-4 text-[#5B6472] dark:text-gray-400">
                      {new Date(h.sentAt).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold ${
                          h.status === "SENT"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : h.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-[#9AA3B1] text-sm font-medium">
              No notifications dispatched yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
