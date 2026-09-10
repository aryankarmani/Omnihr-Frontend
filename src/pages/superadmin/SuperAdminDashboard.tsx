import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarCheck,
  AlertTriangle,
  XCircle,
  TrendingUp,
  IndianRupee,
  Send,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { toast } from "react-hot-toast";
import { superAdminApi } from "../../utils/superAdminApi";

export default function SuperAdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchDashboard = async () => {
    try {
      const res = await superAdminApi.get("/dashboard");
      setData(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleManualReminder = async (subId: string) => {
    try {
      setNotifyingId(subId);
      await superAdminApi.post("/notifications/send", { subscriptionId: subId });
      toast.success("Expiry notification sent to HR Admin!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send notification.");
    } finally {
      setNotifyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-[#2C4FD6] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-[#5B6472] dark:text-gray-400">Loading SaaS metrics...</p>
        </div>
      </div>
    );
  }

  const cards = data?.cards || {
    totalCompanies: 0,
    activeSubscriptions: 0,
    expiringSoon: 0,
    expired: 0,
    totalRevenue: 0,
    thisMonthRevenue: 0,
  };

  const kpis = [
    {
      label: "TOTAL COMPANIES",
      value: cards.totalCompanies,
      icon: Building2,
      subtext: "Active corporate tenants",
      path: "/superadmin/companies",
    },
    {
      label: "ACTIVE SUBSCRIPTIONS",
      value: cards.activeSubscriptions,
      icon: CalendarCheck,
      subtext: "Currently paid & valid",
      path: "/superadmin/subscriptions",
    },
    {
      label: "EXPIRING SOON",
      value: cards.expiringSoon,
      icon: AlertTriangle,
      subtext: "Expires in ≤ 7 days",
      path: "/superadmin/subscriptions?status=EXPIRING_SOON",
    },
    {
      label: "EXPIRED PLANS",
      value: cards.expired,
      icon: XCircle,
      subtext: "Requires renewal",
      path: "/superadmin/subscriptions?status=EXPIRED",
    },
    {
      label: "TOTAL REVENUE",
      value: `₹${Number(cards.totalRevenue).toLocaleString("en-IN")}`,
      icon: TrendingUp,
      subtext: "Cumulative payments",
      path: "/superadmin/payments",
    },
    {
      label: "THIS MONTH REVENUE",
      value: `₹${Number(cards.thisMonthRevenue).toLocaleString("en-IN")}`,
      icon: IndianRupee,
      subtext: "Current month collection",
      path: "/superadmin/payments",
    },
  ];

  return (
    <div className="w-full text-[#12151C] dark:text-white animate-fade-in font-sans">
      {/* Page Title matching AdminDashboard */}
      <header className="mb-5">
        <h2 className="text-2xl font-bold tracking-tight text-[#12151C] dark:text-white mb-1">
          Super Admin Dashboard
        </h2>
        <p className="text-sm text-[#5B6472] dark:text-gray-400">
          Real-time SaaS organizational metrics, subscriptions status, and company payments.
        </p>
      </header>

      {/* KPI Cards styled exactly like HeadcountStats */}
      <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 divide-[#E2E6ED] dark:divide-gray-800">
        {kpis.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              onClick={() => navigate(stat.path)}
              className={`p-5 flex flex-col justify-between h-[135px] hover:bg-[#F9FAFD] dark:hover:bg-white/5 transition-all cursor-pointer group ${
                index % 3 !== 2 ? "lg:border-r border-[#E2E6ED] dark:border-gray-800" : ""
              } ${index < 3 ? "lg:border-b border-[#E2E6ED] dark:border-gray-800" : ""}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-[.06em]">
                  {stat.label}
                </span>
                <Icon
                  size={19}
                  className="text-[#9AA3B1] group-hover:text-[#2C4FD6] transition-colors"
                />
              </div>
              <div>
                <div className="text-2xl font-bold tracking-tight text-[#12151C] dark:text-white font-mono-numbers">
                  {stat.value}
                </div>
                <div className="text-[12px] text-[#5B6472] dark:text-gray-400 font-medium mt-1">
                  {stat.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue Trajectory Chart Section */}
      <div className="bg-white dark:bg-[#12151C] p-5 sm:p-6 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-[#12151C] dark:text-white">
              Revenue Trajectory
            </h3>
            <p className="text-[12.5px] text-[#9AA3B1] dark:text-gray-400 mt-0.5">
              Monthly collection from customer purchases (Last 6 Months)
            </p>
          </div>
          <span className="text-[12px] font-semibold text-[#2C4FD6] bg-[#E8ECFC] px-2.5 py-1 rounded-[3px]">
            Live Ledger
          </span>
        </div>

        <div className="h-72 w-full pt-2">
          {data?.chartData && data.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2C4FD6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2C4FD6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E6ED" opacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9AA3B1" }} stroke="#E2E6ED" />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9AA3B1" }}
                  stroke="#E2E6ED"
                  tickFormatter={(val) => `₹${val >= 1000 ? `${val / 1000}k` : val}`}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Revenue"]}
                  contentStyle={{
                    backgroundColor: "#12151C",
                    borderColor: "#374151",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2C4FD6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[#9AA3B1] text-sm">
              No revenue records logged yet
            </div>
          )}
        </div>
      </div>

      {/* Two Column Grid: Expiring Subscriptions & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Expiring Subscriptions Panel */}
        <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 flex flex-col overflow-hidden">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#E2E6ED] dark:border-gray-800">
            <div>
              <span className="text-[15px] font-semibold text-[#12151C] dark:text-white block">
                Expiring Subscriptions
              </span>
              <p className="text-[12.5px] text-[#9AA3B1] dark:text-gray-400 mt-0.5">
                Companies needing immediate renewal (≤ 7 days)
              </p>
            </div>
            <Link
              to="/superadmin/subscriptions?status=EXPIRING_SOON"
              className="text-[12px] font-semibold text-[#2C4FD6] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            {data?.expiringSubscriptions && data.expiringSubscriptions.length > 0 ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F4F6FB] dark:bg-[#1A1F2C] border-b border-[#E2E6ED] dark:border-gray-800 text-[12px] text-[#5B6472] dark:text-gray-400 font-semibold">
                    <th className="py-2.5 px-4">Company</th>
                    <th className="py-2.5 px-4">Plan</th>
                    <th className="py-2.5 px-4">Remaining</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60">
                  {data.expiringSubscriptions.map((sub: any) => (
                    <tr key={sub.id} className="hover:bg-[#F9FAFD] dark:hover:bg-white/5 transition-colors text-[13px]">
                      <td className="py-3 px-4 font-semibold text-[#12151C] dark:text-white">
                        {sub.companyName}
                      </td>
                      <td className="py-3 px-4 text-[#5B6472] dark:text-gray-300">{sub.planName}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-[3px] text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                          {sub.daysRemaining} days left
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleManualReminder(sub.id)}
                          disabled={notifyingId === sub.id}
                          className="px-3 py-1 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[12px] font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          <Send size={12} />
                          <span>{notifyingId === sub.id ? "Sending..." : "Notify"}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-[#9AA3B1] text-[13px]">
                All customer subscriptions are currently active and in good standing!
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments Panel */}
        <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 flex flex-col overflow-hidden">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#E2E6ED] dark:border-gray-800">
            <div>
              <span className="text-[15px] font-semibold text-[#12151C] dark:text-white block">
                Recent Payments
              </span>
              <p className="text-[12.5px] text-[#9AA3B1] dark:text-gray-400 mt-0.5">
                Latest customer subscription transactions
              </p>
            </div>
            <Link
              to="/superadmin/payments"
              className="text-[12px] font-semibold text-[#2C4FD6] hover:underline flex items-center gap-1"
            >
              <span>View Ledger</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            {data?.recentPayments && data.recentPayments.length > 0 ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F4F6FB] dark:bg-[#1A1F2C] border-b border-[#E2E6ED] dark:border-gray-800 text-[12px] text-[#5B6472] dark:text-gray-400 font-semibold">
                    <th className="py-2.5 px-4">Company</th>
                    <th className="py-2.5 px-4">Plan</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60">
                  {data.recentPayments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-[#F9FAFD] dark:hover:bg-white/5 transition-colors text-[13px]">
                      <td className="py-3 px-4 font-semibold text-[#12151C] dark:text-white">
                        {p.company}
                      </td>
                      <td className="py-3 px-4 text-[#5B6472] dark:text-gray-300">{p.plan}</td>
                      <td className="py-3 px-4 font-bold text-[#12151C] dark:text-white font-mono-numbers">
                        ₹{Number(p.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-2 py-0.5 rounded-[3px] text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-[#9AA3B1] text-[13px]">
                No payment transactions recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recently Registered Companies Table */}
      <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden">
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#E2E6ED] dark:border-gray-800">
          <div>
            <span className="text-[15px] font-semibold text-[#12151C] dark:text-white block">
              Recently Registered Companies
            </span>
            <p className="text-[12.5px] text-[#9AA3B1] dark:text-gray-400 mt-0.5">
              Tenants registered through customer checkout
            </p>
          </div>
          <Link
            to="/superadmin/companies"
            className="text-[12px] font-semibold text-[#2C4FD6] hover:underline flex items-center gap-1"
          >
            <span>All Companies</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {data?.recentCompanies && data.recentCompanies.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F4F6FB] dark:bg-[#1A1F2C] border-b border-[#E2E6ED] dark:border-gray-800 text-[12px] text-[#5B6472] dark:text-gray-400 font-semibold">
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Tenant Domain</th>
                  <th className="py-3 px-4">Current Plan</th>
                  <th className="py-3 px-4">Employees</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60">
                {data.recentCompanies.map((c: any) => (
                  <tr key={c.id} className="hover:bg-[#F9FAFD] dark:hover:bg-white/5 transition-colors text-[13px]">
                    <td className="py-3.5 px-4 font-bold text-[#12151C] dark:text-white">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-4 text-[#5B6472] dark:text-gray-300 font-mono text-[12px]">
                      {c.domain}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-[3px] text-[11px] font-semibold bg-[#E8ECFC] text-[#2C4FD6]">
                        {c.plan}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#5B6472] dark:text-gray-300">
                      {c.employeeCount} active
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/superadmin/companies/${c.id}`}
                        className="text-[#2C4FD6] hover:underline inline-flex items-center gap-1 text-[12px] font-semibold"
                      >
                        <span>Details</span>
                        <ExternalLink size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-[#9AA3B1] text-[13px]">No companies found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
