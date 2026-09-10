import React, { useEffect, useState } from "react";
import {
  CreditCard,
  Search,
  Plus,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { superAdminApi } from "../../utils/superAdminApi";

export default function Payments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [txnId, setTxnId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const res = await superAdminApi.get("/payments", { params });
      setPayments(res.data.payments || []);

      const compRes = await superAdminApi.get("/companies");
      setCompanies(compRes.data.companies || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !amount) {
      toast.error("Please specify company and amount.");
      return;
    }

    try {
      setSubmitting(true);
      await superAdminApi.post("/payments", {
        tenantId: companyId,
        amount: Number(amount),
        paymentMethod: method,
        transactionId: txnId || undefined,
        notes,
      });
      toast.success("Payment recorded successfully.");
      setShowModal(false);
      setCompanyId("");
      setAmount("");
      setTxnId("");
      setNotes("");
      fetchPayments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full text-[#12151C] dark:text-white animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#12151C] dark:text-white mb-1">
            Payments & Billing Ledger
          </h2>
          <p className="text-sm text-[#5B6472] dark:text-gray-400">
            Real-time feed of all subscription payments processed across the platform.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13px] font-semibold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Record Manual Payment</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#12151C] p-4 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="text-[#9AA3B1] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchPayments()}
            placeholder="Search by Txn ID or company..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1] outline-none focus:border-[#2C4FD6] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6] cursor-pointer"
          >
            <option value="">All Payment Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-3 border-[#2C4FD6] border-t-transparent rounded-full animate-spin" />
              <span className="text-[#5B6472] dark:text-gray-400 text-sm">Loading transactions...</span>
            </div>
          ) : payments.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F4F6FB] dark:bg-[#1A1F2C] border-b border-[#E2E6ED] dark:border-gray-800 text-[12px] text-[#5B6472] dark:text-gray-400 font-semibold">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Gateway</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60 text-[13.5px]">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F9FAFD] dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[12px] text-[#5B6472] dark:text-gray-400">
                      {p.transactionId}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#12151C] dark:text-white">
                      {p.companyName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-[3px] font-semibold text-[11px] bg-[#E8ECFC] text-[#2C4FD6]">
                        {p.planName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#12151C] dark:text-white font-mono-numbers">
                      ₹{Number(p.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-[#5B6472] dark:text-gray-300">
                      {p.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#9AA3B1]">
                      {p.gateway}
                    </td>
                    <td className="py-3.5 px-4 text-[#5B6472] dark:text-gray-400">
                      {new Date(p.paidAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center text-[#9AA3B1]">
              <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No transactions found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6 max-w-md w-full shadow-xl animate-fade-in space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#12151C] dark:text-white">
                Record Manual Payment
              </h3>
              <p className="text-[13px] text-[#5B6472] dark:text-gray-400 mt-0.5">
                Log an offline bank wire, cheque or direct payment from a company
              </p>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-3.5">
              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Customer Company
                </label>
                <select
                  required
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                >
                  <option value="">Select Company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.domain})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Amount (₹ INR)
                </label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 24990"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                >
                  <option value="BANK_TRANSFER">Bank Wire / NEFT / RTGS</option>
                  <option value="UPI">UPI Direct</option>
                  <option value="CHEQUE">Corporate Cheque</option>
                  <option value="ONLINE">Online Portal</option>
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Transaction / Reference ID (Optional)
                </label>
                <input
                  type="text"
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                  placeholder="e.g. UTR-982138912"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any remarks or reference details..."
                  className="w-full px-3.5 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E6ED] dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-[13px] font-semibold text-[#5B6472] dark:text-gray-300 hover:bg-[#EEF1F5] dark:hover:bg-white/5 rounded-[6px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13px] font-semibold shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
