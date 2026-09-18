import React, { useEffect, useState } from "react";
import {
  BellRing,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { superAdminApi } from "../../utils/superAdminApi";

export default function Notifications() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [activeTab, setActiveTab] = useState<"cadence" | "expiring" | "history">("cadence");
  const [expiryFilterDays, setExpiryFilterDays] = useState<number>(30);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyPerPage, setHistoryPerPage] = useState<number>(10);
  const [expiringPage, setExpiringPage] = useState<number>(1);
  const [expiringPerPage, setExpiringPerPage] = useState<number>(10);

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

  const handleSendManual = async (subscriptionId: string, companyName?: string) => {
    try {
      setSendingId(subscriptionId);
      await superAdminApi.post("/notifications/send", { subscriptionId });
      toast.success(`Notification reminder dispatched to ${companyName || "company"}!`);
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
  const filteredExpiring = expiring.filter((c: any) => c.daysRemaining <= expiryFilterDays);

  const totalExpiringPages = Math.ceil(filteredExpiring.length / expiringPerPage) || 1;
  const expiringStartIndex = (expiringPage - 1) * expiringPerPage;
  const expiringEndIndex = Math.min(expiringStartIndex + expiringPerPage, filteredExpiring.length);
  const paginatedExpiring = filteredExpiring.slice(expiringStartIndex, expiringEndIndex);

  const totalHistoryPages = Math.ceil(history.length / historyPerPage) || 1;
  const historyStartIndex = (historyPage - 1) * historyPerPage;
  const historyEndIndex = Math.min(historyStartIndex + historyPerPage, history.length);
  const paginatedHistory = history.slice(historyStartIndex, historyEndIndex);

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
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13px] font-semibold transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw size={15} className={checking ? "animate-spin" : ""} />
          <span>{checking ? "Checking..." : "Trigger Cadence Run"}</span>
        </button>
      </div>

      {/* 3 Clickable Cards / Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Card 1: Reminder Cadence */}
        <button
          onClick={() => setActiveTab("cadence")}
          className={`text-left p-4 rounded-[6px] border transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === "cadence"
              ? "bg-white dark:bg-[#12151C] border-[#2C4FD6] ring-2 ring-[#2C4FD6]/20"
              : "bg-white/70 dark:bg-[#12151C]/70 border-[#E2E6ED] dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
          }`}
        >
          <div className="flex items-center justify-between w-full mb-3">
            <div
              className={`p-2 rounded-[6px] ${
                activeTab === "cadence"
                  ? "bg-[#E8ECFC] text-[#2C4FD6]"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500"
              }`}
            >
              <Clock size={18} />
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-[3px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              6 Intervals
            </span>
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-[#12151C] dark:text-white">
              Reminder Cadence
            </h4>
            <p className="text-[12px] text-[#5B6472] dark:text-gray-400 mt-0.5">
              Configured automated expiry schedule
            </p>
          </div>
        </button>

        {/* Card 2: Approaching Expiry */}
        <button
          onClick={() => setActiveTab("expiring")}
          className={`text-left p-4 rounded-[6px] border transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === "expiring"
              ? "bg-white dark:bg-[#12151C] border-[#2C4FD6] ring-2 ring-[#2C4FD6]/20"
              : "bg-white/70 dark:bg-[#12151C]/70 border-[#E2E6ED] dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
          }`}
        >
          <div className="flex items-center justify-between w-full mb-3">
            <div
              className={`p-2 rounded-[6px] ${
                activeTab === "expiring"
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500"
              }`}
            >
              <AlertTriangle size={18} />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-[3px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              {filteredExpiring.length} {filteredExpiring.length === 1 ? "Company" : "Companies"}
            </span>
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-[#12151C] dark:text-white">
              Approaching Expiry
            </h4>
            <p className="text-[12px] text-[#5B6472] dark:text-gray-400 mt-0.5">
              Companies within ≤ {expiryFilterDays} days & manual dispatch
            </p>
          </div>
        </button>

        {/* Card 3: Dispatch History */}
        <button
          onClick={() => setActiveTab("history")}
          className={`text-left p-4 rounded-[6px] border transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === "history"
              ? "bg-white dark:bg-[#12151C] border-[#2C4FD6] ring-2 ring-[#2C4FD6]/20"
              : "bg-white/70 dark:bg-[#12151C]/70 border-[#E2E6ED] dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
          }`}
        >
          <div className="flex items-center justify-between w-full mb-3">
            <div
              className={`p-2 rounded-[6px] ${
                activeTab === "history"
                  ? "bg-[#E8ECFC] text-[#2C4FD6]"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500"
              }`}
            >
              <BellRing size={18} />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-[3px] bg-[#E8ECFC] text-[#2C4FD6] dark:bg-white/10">
              {history.length} {history.length === 1 ? "Log" : "Logs"}
            </span>
          </div>
          <div>
            <h4 className="text-[14px] font-bold text-[#12151C] dark:text-white">
              Dispatch History Log
            </h4>
            <p className="text-[12px] text-[#5B6472] dark:text-gray-400 mt-0.5">
              Audit ledger of all sent notifications
            </p>
          </div>
        </button>
      </div>

      {/* Tab 1 Content: Cadence Config Panel (Image 1) */}
      {activeTab === "cadence" && (
        <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-5 sm:p-6 animate-fade-in">
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
      )}

      {/* Tab 2 Content: Expiring Companies Table with Manual Action (Image 2) */}
      {activeTab === "expiring" && (
        <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden animate-fade-in">
          <div className="p-4 sm:p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-[#12151C] dark:text-white flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <span>Companies Approaching Expiry</span>
            </h3>

            <div className="flex items-center gap-2">
              <span className="text-[12.5px] text-[#5B6472] dark:text-gray-400 font-medium">Expiry Window:</span>
              <select
                value={expiryFilterDays}
                onChange={(e) => setExpiryFilterDays(Number(e.target.value))}
                className="px-3 py-1.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13px] font-semibold text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6] cursor-pointer"
              >
                <option value={30}>≤ 30 Days</option>
                <option value={15}>≤ 15 Days</option>
                <option value={7}>≤ 7 Days</option>
                <option value={3}>≤ 3 Days</option>
                <option value={1}>≤ 1 Day</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[380px] overflow-y-auto table-scrollbar border-b border-[#E2E6ED] dark:border-gray-800">
            {filteredExpiring.length > 0 ? (
              <table className="w-full text-left min-w-[750px]">
                <thead className="sticky top-0 z-10 bg-[#F4F6FB] dark:bg-[#1A1F2C]">
                  <tr className="border-b border-[#E2E6ED] dark:border-gray-800 text-[12px] text-[#5B6472] dark:text-gray-400 font-semibold">
                    <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Company</th>
                    <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Plan</th>
                    <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Expiry Date</th>
                    <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Remaining</th>
                    <th className="py-3 px-4 text-right bg-[#F4F6FB] dark:bg-[#1A1F2C]">Manual Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60 text-[13.5px]">
                  {paginatedExpiring.map((c: any) => (
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
                          onClick={() => handleSendManual(c.id, c.companyName)}
                          disabled={sendingId === c.id}
                          className="px-3.5 py-1.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
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
                No companies currently in the ≤ {expiryFilterDays} days expiry window.
              </div>
            )}
          </div>

          {/* Table Footer with Pagination for Approaching Expiry */}
          {filteredExpiring.length > 0 && (
            <div className="p-3.5 sm:px-5 sm:py-3.5 border-t border-[#E2E6ED] dark:border-gray-800 bg-[#F9FAFD] dark:bg-[#12151C] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[#5B6472] dark:text-gray-400 font-medium">
                  Showing <span className="font-semibold text-[#12151C] dark:text-white">{expiringStartIndex + 1}</span> to{" "}
                  <span className="font-semibold text-[#12151C] dark:text-white">{expiringEndIndex}</span> of{" "}
                  <span className="font-semibold text-[#12151C] dark:text-white">{filteredExpiring.length}</span> entries
                </span>

                <div className="flex items-center gap-2 pl-3 border-l border-gray-300 dark:border-gray-700">
                  <span className="text-xs font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-wider">
                    Rows:
                  </span>
                  <select
                    value={expiringPerPage}
                    onChange={(e) => {
                      setExpiringPerPage(Number(e.target.value));
                      setExpiringPage(1);
                    }}
                    className="px-2 py-1 bg-white dark:bg-[#1A1F2C] border border-[#E2E6ED] dark:border-gray-700 rounded-[5px] text-[#12151C] dark:text-white font-semibold cursor-pointer outline-none focus:border-[#2C4FD6] text-xs"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#5B6472] dark:text-gray-400 mr-1">
                  Page <span className="font-semibold text-[#12151C] dark:text-white">{expiringPage}</span> of{" "}
                  <span className="font-semibold text-[#12151C] dark:text-white">{totalExpiringPages}</span>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setExpiringPage(1)}
                    disabled={expiringPage === 1}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-[5px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#1A1F2C] text-[#12151C] dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#EEF1F5] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
                    title="First Page"
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  <button
                    onClick={() => setExpiringPage((prev) => Math.max(prev - 1, 1))}
                    disabled={expiringPage === 1}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-[5px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#1A1F2C] text-[#12151C] dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#EEF1F5] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <button
                    onClick={() => setExpiringPage((prev) => Math.min(prev + 1, totalExpiringPages))}
                    disabled={expiringPage === totalExpiringPages}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-[5px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#1A1F2C] text-[#12151C] dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#EEF1F5] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => setExpiringPage(totalExpiringPages)}
                    disabled={expiringPage === totalExpiringPages}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-[5px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#1A1F2C] text-[#12151C] dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#EEF1F5] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
                    title="Last Page"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3 Content: Dispatch History Audit Ledger (Image 3) */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden animate-fade-in flex flex-col">
          <div className="p-4 sm:p-5 border-b border-[#E2E6ED] dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#12151C] dark:text-white flex items-center gap-2">
              <BellRing size={18} className="text-[#2C4FD6]" />
              <span>Notification Dispatch History Log</span>
            </h3>
            <span className="text-xs text-[#9AA3B1] dark:text-gray-400 font-mono">
              Total {history.length} {history.length === 1 ? "record" : "records"}
            </span>
          </div>

          <div className="overflow-x-auto max-h-[380px] overflow-y-auto table-scrollbar border-b border-[#E2E6ED] dark:border-gray-800">
            {history.length > 0 ? (
              <table className="w-full text-left min-w-[850px]">
                <thead className="sticky top-0 z-10 bg-[#F4F6FB] dark:bg-[#1A1F2C]">
                  <tr className="border-b border-[#E2E6ED] dark:border-gray-800 text-[12px] text-[#5B6472] dark:text-gray-400 font-semibold">
                    <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Company</th>
                    <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Notification Type</th>
                    <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Channel</th>
                    <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Message Content</th>
                    <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Dispatched At</th>
                    <th className="py-3 px-4 text-right bg-[#F4F6FB] dark:bg-[#1A1F2C]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60 text-[13px]">
                  {paginatedHistory.map((h: any) => (
                    <tr key={h.id} className="hover:bg-[#F9FAFD] dark:hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#12151C] dark:text-white whitespace-nowrap">
                        {h.companyName}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#2C4FD6] whitespace-nowrap">
                        {h.notificationType}
                      </td>
                      <td className="py-3.5 px-4 text-[#5B6472] dark:text-gray-300 font-medium whitespace-nowrap">
                        {h.channel}
                      </td>
                      <td className="py-3.5 px-4 text-[#5B6472] dark:text-gray-300 max-w-sm truncate" title={h.message}>
                        {h.message}
                      </td>
                      <td className="py-3.5 px-4 text-[#5B6472] dark:text-gray-400 whitespace-nowrap">
                        {new Date(h.sentAt).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
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

          {/* Table Footer with Pagination */}
          {history.length > 0 && (
            <div className="p-3.5 sm:px-5 sm:py-3.5 border-t border-[#E2E6ED] dark:border-gray-800 bg-[#F9FAFD] dark:bg-[#12151C] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[#5B6472] dark:text-gray-400 font-medium">
                  Showing <span className="font-semibold text-[#12151C] dark:text-white">{historyStartIndex + 1}</span> to{" "}
                  <span className="font-semibold text-[#12151C] dark:text-white">{historyEndIndex}</span> of{" "}
                  <span className="font-semibold text-[#12151C] dark:text-white">{history.length}</span> entries
                </span>

                <div className="flex items-center gap-2 pl-3 border-l border-gray-300 dark:border-gray-700">
                  <span className="text-xs font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-wider">
                    Rows:
                  </span>
                  <select
                    value={historyPerPage}
                    onChange={(e) => {
                      setHistoryPerPage(Number(e.target.value));
                      setHistoryPage(1);
                    }}
                    className="px-2 py-1 bg-white dark:bg-[#1A1F2C] border border-[#E2E6ED] dark:border-gray-700 rounded-[5px] text-[#12151C] dark:text-white font-semibold cursor-pointer outline-none focus:border-[#2C4FD6] text-xs"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#5B6472] dark:text-gray-400 mr-1">
                  Page <span className="font-semibold text-[#12151C] dark:text-white">{historyPage}</span> of{" "}
                  <span className="font-semibold text-[#12151C] dark:text-white">{totalHistoryPages}</span>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setHistoryPage(1)}
                    disabled={historyPage === 1}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-[5px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#1A1F2C] text-[#12151C] dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#EEF1F5] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
                    title="First Page"
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  <button
                    onClick={() => setHistoryPage((prev) => Math.max(prev - 1, 1))}
                    disabled={historyPage === 1}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-[5px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#1A1F2C] text-[#12151C] dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#EEF1F5] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <button
                    onClick={() => setHistoryPage((prev) => Math.min(prev + 1, totalHistoryPages))}
                    disabled={historyPage === totalHistoryPages}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-[5px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#1A1F2C] text-[#12151C] dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#EEF1F5] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => setHistoryPage(totalHistoryPages)}
                    disabled={historyPage === totalHistoryPages}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-[5px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#1A1F2C] text-[#12151C] dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#EEF1F5] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
                    title="Last Page"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
