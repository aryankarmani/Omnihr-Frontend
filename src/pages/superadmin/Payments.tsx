import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  CreditCard,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Building2,
  Check,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { superAdminApi } from "../../utils/superAdminApi";

interface PaymentFormValues {
  companyName: string;
  amount: string;
  paymentMethod: string;
  transactionId?: string;
  notes?: string;
}

export default function Payments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(10);

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const companyComboboxRef = useRef<HTMLDivElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    defaultValues: {
      companyName: "",
      amount: "",
      paymentMethod: "BANK_TRANSFER",
      transactionId: "",
      notes: "",
    },
  });

  const companyNameValue = watch("companyName");

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        companyComboboxRef.current &&
        !companyComboboxRef.current.contains(event.target as Node)
      ) {
        setIsCompanyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Debounced auto-search as user types
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchPayments();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, statusFilter]);

  const onSubmitPayment = async (data: PaymentFormValues) => {
    const trimmedName = data.companyName.trim();
    if (!trimmedName) {
      setError("companyName", {
        type: "manual",
        message: "Company name is required.",
      });
      return;
    }

    // Determine tenantId from selectedCompany or matching company by typed name
    let targetTenantId = selectedCompany?.id;
    if (!targetTenantId) {
      const match = companies.find(
        (c) =>
          c.name.toLowerCase() === trimmedName.toLowerCase() ||
          c.domain?.toLowerCase() === trimmedName.toLowerCase()
      );
      if (match) {
        targetTenantId = match.id;
      }
    }

    try {
      setSubmitting(true);
      await superAdminApi.post("/payments", {
        tenantId: targetTenantId || undefined,
        companyName: trimmedName,
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      });
      toast.success(`Payment recorded for ${trimmedName} successfully.`);
      setShowModal(false);
      reset();
      setSelectedCompany(null);
      fetchPayments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(payments.length / perPage) || 1;
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, payments.length);
  const paginatedPayments = payments.slice(startIndex, endIndex);

  return (
    <div className="w-full text-[#12151C] dark:text-white animate-fade-in font-sans">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#12151C] dark:text-white mb-1">
            Subscription Payments
          </h2>
          <p className="text-sm text-[#5B6472] dark:text-gray-400">
            Audit history of all incoming SaaS subscription payments, manual wires and gateway charges.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13px] font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>Record Offline Payment</span>
        </button>
      </header>

      {/* Filters */}
      <div className="bg-white dark:bg-[#12151C] p-4 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="text-[#9AA3B1] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            onKeyDown={(e) => e.key === "Enter" && fetchPayments()}
            placeholder="Search by Txn ID or company..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white placeholder-[#9AA3B1] outline-none focus:border-[#2C4FD6] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
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
      <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto max-h-[460px] overflow-y-auto table-scrollbar border-b border-[#E2E6ED] dark:border-gray-800">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-3 border-[#2C4FD6] border-t-transparent rounded-full animate-spin" />
              <span className="text-[#5B6472] dark:text-gray-400 text-sm">Loading transactions...</span>
            </div>
          ) : payments.length > 0 ? (
            <table className="w-full text-left min-w-[850px]">
              <thead className="sticky top-0 z-10 bg-[#F4F6FB] dark:bg-[#1A1F2C]">
                <tr className="border-b border-[#E2E6ED] dark:border-gray-800 text-[12px] text-[#5B6472] dark:text-gray-400 font-semibold shadow-2xs">
                  <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Transaction ID</th>
                  <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Company</th>
                  <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Plan</th>
                  <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Amount</th>
                  <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Payment Method</th>
                  <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Gateway</th>
                  <th className="py-3 px-4 bg-[#F4F6FB] dark:bg-[#1A1F2C]">Date</th>
                  <th className="py-3 px-4 text-right bg-[#F4F6FB] dark:bg-[#1A1F2C]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6ED] dark:divide-gray-800/60 text-[13.5px]">
                {paginatedPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F9FAFD] dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[12px] text-[#5B6472] dark:text-gray-400 whitespace-nowrap">
                      {p.transactionId}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#12151C] dark:text-white whitespace-nowrap">
                      {p.companyName}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-[3px] font-semibold text-[11px] bg-[#E8ECFC] text-[#2C4FD6]">
                        {p.planName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#12151C] dark:text-white font-mono-numbers whitespace-nowrap">
                      ₹{Number(p.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-[#5B6472] dark:text-gray-300 whitespace-nowrap">
                      {p.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#9AA3B1] whitespace-nowrap">
                      {p.gateway}
                    </td>
                    <td className="py-3.5 px-4 text-[#5B6472] dark:text-gray-400 whitespace-nowrap">
                      {new Date(p.paidAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
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

        {/* Table Footer with Pagination */}
        {payments.length > 0 && (
          <div className="p-3.5 sm:px-5 sm:py-3.5 border-t border-[#E2E6ED] dark:border-gray-800 bg-[#F9FAFD] dark:bg-[#12151C] flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[#5B6472] dark:text-gray-400 font-medium">
                Showing <span className="font-semibold text-[#12151C] dark:text-white">{startIndex + 1}</span> to{" "}
                <span className="font-semibold text-[#12151C] dark:text-white">{endIndex}</span> of{" "}
                <span className="font-semibold text-[#12151C] dark:text-white">{payments.length}</span> entries
              </span>

              <div className="flex items-center gap-2 pl-3 border-l border-gray-300 dark:border-gray-700">
                <span className="text-xs font-semibold text-[#9AA3B1] dark:text-gray-400 uppercase tracking-wider">
                  Rows:
                </span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-white dark:bg-[#1A1F2C] border border-[#E2E6ED] dark:border-gray-700 rounded-[5px] text-[#12151C] dark:text-white font-semibold cursor-pointer outline-none focus:border-[#2C4FD6] text-xs shadow-2xs"
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
                Page <span className="font-semibold text-[#12151C] dark:text-white">{currentPage}</span> of{" "}
                <span className="font-semibold text-[#12151C] dark:text-white">{totalPages}</span>
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-[5px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#1A1F2C] text-[#12151C] dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#EEF1F5] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                  title="First Page"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-[5px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#1A1F2C] text-[#12151C] dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#EEF1F5] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-[5px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#1A1F2C] text-[#12151C] dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#EEF1F5] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-[5px] border border-[#E2E6ED] dark:border-gray-800 bg-white dark:bg-[#1A1F2C] text-[#12151C] dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#EEF1F5] dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                  title="Last Page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-white/60 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6 max-w-md w-full shadow-xl animate-fade-in space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#12151C] dark:text-white">
                Record Manual Payment
              </h3>
              <p className="text-[13px] text-[#5B6472] dark:text-gray-400 mt-0.5">
                Log an offline bank wire, cheque or direct payment from a company
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmitPayment)} className="space-y-3.5">
              {/* Company Name Field with Dual Type/Search + Dropdown */}
              <div className="relative" ref={companyComboboxRef}>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Type or select company name..."
                    {...register("companyName", {
                      required: "Company name is required",
                    })}
                    onFocus={() => setIsCompanyDropdownOpen(true)}
                    onChange={(e) => {
                      setValue("companyName", e.target.value, { shouldValidate: true });
                      clearErrors("companyName");
                      setIsCompanyDropdownOpen(true);
                      const exact = companies.find(
                        (c) =>
                          c.name.toLowerCase() === e.target.value.trim().toLowerCase() ||
                          c.domain?.toLowerCase() === e.target.value.trim().toLowerCase()
                      );
                      setSelectedCompany(exact || null);
                    }}
                    className={`w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-[#12151C] border rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none transition-all ${
                      errors.companyName
                        ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                        : "border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]"
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9AA3B1] hover:text-[#12151C] dark:hover:text-white p-1 cursor-pointer transition-colors"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        isCompanyDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                {errors.companyName && (
                  <p className="text-xs text-rose-500 font-medium mt-1">
                    {errors.companyName.message}
                  </p>
                )}

                {/* Dropdown Menu */}
                {isCompanyDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto bg-white dark:bg-[#1A1F2C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] shadow-lg z-50 divide-y divide-gray-100 dark:divide-gray-800">
                    {companies
                      .filter((c) => {
                        if (!companyNameValue) return true;
                        const q = companyNameValue.toLowerCase();
                        return (
                          c.name.toLowerCase().includes(q) ||
                          (c.domain && c.domain.toLowerCase().includes(q))
                        );
                      })
                      .map((c) => {
                        const isSelected =
                          selectedCompany?.id === c.id || companyNameValue === c.name;
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCompany(c);
                              setValue("companyName", c.name, { shouldValidate: true });
                              clearErrors("companyName");
                              setIsCompanyDropdownOpen(false);
                            }}
                            className={`px-3.5 py-2.5 text-xs flex items-center justify-between cursor-pointer hover:bg-[#EEF1F5] dark:hover:bg-white/5 transition-colors ${
                              isSelected ? "bg-[#EEF1F5] dark:bg-white/10 font-semibold" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Building2 size={14} className="text-[#2C4FD6]" />
                              <div>
                                <span className="text-[#12151C] dark:text-white font-medium">
                                  {c.name}
                                </span>
                                {c.domain && (
                                  <span className="text-[#9AA3B1] text-[11px] ml-1.5 font-mono">
                                    ({c.domain})
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSelected && <Check size={14} className="text-[#2C4FD6]" />}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Amount (₹ INR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 24990"
                  {...register("amount", {
                    required: "Amount is required",
                    min: { value: 1, message: "Amount must be at least ₹1" },
                    pattern: {
                      value: /^[0-9]+$/,
                      message: "Only numbers are allowed in Amount",
                    },
                  })}
                  onKeyDown={(e) => {
                    if (
                      !/[0-9]/.test(e.key) &&
                      !["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"].includes(e.key)
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none transition-all ${
                    errors.amount
                      ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                      : "border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]"
                  }`}
                />
                {errors.amount && (
                  <p className="text-xs text-rose-500 font-medium mt-1">
                    {errors.amount.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  {...register("paymentMethod")}
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
                  {...register("transactionId")}
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
                  {...register("notes")}
                  placeholder="Add any remarks or reference details..."
                  className="w-full px-3.5 py-2 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E6ED] dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    reset();
                    setSelectedCompany(null);
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
                  {submitting ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
