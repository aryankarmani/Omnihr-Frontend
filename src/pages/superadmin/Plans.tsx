import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Plus,
  Check,
  Edit2,
  Trash2,
  Users,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { superAdminApi } from "../../utils/superAdminApi";

interface PlanFormValues {
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  maxEmployees: string;
  featuresString: string;
  isActive: boolean;
}

export default function Plans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PlanFormValues>({
    defaultValues: {
      name: "",
      description: "",
      monthlyPrice: "",
      yearlyPrice: "",
      maxEmployees: "25",
      featuresString: "EMPLOYEES, ATTENDANCE, LEAVE",
      isActive: true,
    },
  });

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.get("/plans");
      setPlans(res.data.plans || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load plans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    reset({
      name: "",
      description: "",
      monthlyPrice: "",
      yearlyPrice: "",
      maxEmployees: "25",
      featuresString: "EMPLOYEES, ATTENDANCE, LEAVE",
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (plan: any) => {
    setEditingPlan(plan);
    reset({
      name: plan.name,
      description: plan.description || "",
      monthlyPrice: String(plan.monthlyPrice),
      yearlyPrice: String(plan.yearlyPrice),
      maxEmployees: String(plan.maxEmployees),
      featuresString: Array.isArray(plan.features) ? plan.features.join(", ") : "",
      isActive: plan.isActive,
    });
    setShowModal(true);
  };

  const onPlanSubmit = async (data: PlanFormValues) => {
    const featuresList = data.featuresString
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      setSubmitting(true);
      if (editingPlan) {
        await superAdminApi.put(`/plans/${editingPlan.id}`, {
          name: data.name.trim(),
          description: data.description.trim(),
          monthlyPrice: Number(data.monthlyPrice),
          yearlyPrice: Number(data.yearlyPrice),
          maxEmployees: Number(data.maxEmployees),
          features: featuresList,
          isActive: data.isActive,
        });
        toast.success("Plan updated successfully!");
      } else {
        await superAdminApi.post("/plans", {
          name: data.name.trim(),
          description: data.description.trim(),
          monthlyPrice: Number(data.monthlyPrice),
          yearlyPrice: Number(data.yearlyPrice),
          maxEmployees: Number(data.maxEmployees),
          features: featuresList,
          isActive: data.isActive,
        });
        toast.success("New plan created successfully!");
      }
      setShowModal(false);
      reset();
      fetchPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save plan tier.");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlanActive = async (plan: any) => {
    try {
      await superAdminApi.put(`/plans/${plan.id}`, {
        isActive: !plan.isActive,
      });
      toast.success(`Plan ${!plan.isActive ? "activated" : "deactivated"}.`);
      fetchPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update plan.");
    }
  };

  const handleDeletePlan = async (plan: any) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${plan.name}" plan? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      setDeletingPlanId(plan.id);
      await superAdminApi.delete(`/plans/${plan.id}`);
      toast.success(`"${plan.name}" plan deleted successfully.`);
      fetchPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete plan.");
    } finally {
      setDeletingPlanId(null);
    }
  };

  return (
    <div className="w-full text-[#12151C] dark:text-white animate-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#12151C] dark:text-white mb-1">
            Subscription Plans Management
          </h2>
          <p className="text-sm text-[#5B6472] dark:text-gray-400">
            Configure tier pricing, employee quotas, and feature entitlements across the platform.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13px] font-semibold transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Create New Tier</span>
        </button>
      </div>

      {/* Plans Cards */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 w-full">
          <div className="w-8 h-8 border-3 border-[#2C4FD6] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#5B6472] dark:text-gray-400 text-sm">Loading plans...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {plans.map((p) => {
            const isUnlimited = p.maxEmployees === -1 || p.maxEmployees === 0;

            return (
              <div
                key={p.id}
                className={`bg-white dark:bg-[#12151C] rounded-[6px] border ${p.isActive
                  ? "border-[#E2E6ED] dark:border-gray-800"
                  : "border-gray-200/60 dark:border-gray-800/40 opacity-70"
                  } p-6 flex flex-col justify-between relative`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold text-[#12151C] dark:text-white tracking-tight">
                      {p.name}
                    </span>
                    <button
                      onClick={() => togglePlanActive(p)}
                      title={p.isActive ? "Deactivate Plan" : "Activate Plan"}
                      className="text-[#9AA3B1] hover:text-[#2C4FD6] transition-colors cursor-pointer"
                    >
                      {p.isActive ? (
                        <ToggleRight size={26} className="text-[#2C4FD6]" />
                      ) : (
                        <ToggleLeft size={26} className="text-[#9AA3B1]" />
                      )}
                    </button>
                  </div>

                  <p className="text-[12.5px] text-[#5B6472] dark:text-gray-400 mb-4 min-h-[36px]">
                    {p.description || "Core HRMS software subscription package"}
                  </p>

                  <div className="mb-4 pb-4 border-b border-[#E2E6ED] dark:border-gray-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-[#12151C] dark:text-white font-mono-numbers">
                        ₹{Number(p.monthlyPrice).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[12px] text-[#9AA3B1]">/ month</span>
                    </div>
                    <p className="text-[12px] text-[#5B6472] dark:text-gray-400 mt-1">
                      or ₹{Number(p.yearlyPrice).toLocaleString("en-IN")} billed annually
                    </p>
                  </div>

                  {/* Employee Capacity */}
                  <div className="flex items-center gap-2 mb-4 text-[#12151C] dark:text-gray-200 font-semibold text-[13px]">
                    <Users size={16} className="text-[#2C4FD6]" />
                    <span>
                      {isUnlimited ? "Unlimited Employees" : `Up to ${p.maxEmployees} Employees`}
                    </span>
                  </div>

                  {/* Features list */}
                  <div className="space-y-2 mb-6">
                    <p className="text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-wider">
                      Included Modules:
                    </p>
                    {Array.isArray(p.features) && p.features.length > 0 ? (
                      p.features.map((feat: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-[#5B6472] dark:text-gray-300 text-[12.5px]">
                          <Check size={14} className="text-emerald-500 shrink-0" />
                          <span className="capitalize">{feat.toLowerCase().replace(/_/g, " ")}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[#9AA3B1] text-[12px]">Standard features access</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E2E6ED] dark:border-gray-800 flex items-center justify-between">
                  <span className="text-[12px] text-[#9AA3B1] font-medium">
                    {p.subscribersCount || 0} active {(p.subscribersCount || 0) === 1 ? "customer" : "customers"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDeletePlan(p)}
                      disabled={deletingPlanId === p.id}
                      title="Delete Plan"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:text-rose-400 rounded-[6px] text-[12px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      <span>{deletingPlanId === p.id ? "..." : "Delete"}</span>
                    </button>
                    <button
                      onClick={() => openEditModal(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF1F5] hover:bg-[#E8ECFC] hover:text-[#2C4FD6] dark:bg-white/5 dark:hover:bg-white/10 text-[#12151C] dark:text-gray-200 rounded-[6px] text-[12px] font-semibold transition-colors cursor-pointer"
                    >
                      <Edit2 size={13} />
                      <span>Edit Tier</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6 max-w-lg w-full shadow-xl animate-fade-in space-y-4">
            <div>
              <h3 className="text-lg font-bold text-[#12151C] dark:text-white">
                {editingPlan ? "Edit Subscription Tier" : "Create New Subscription Tier"}
              </h3>
              <p className="text-[13px] text-[#5B6472] dark:text-gray-400 mt-0.5">
                Set plan pricing, employee capacity constraints, and module entitlements
              </p>
            </div>

            <form onSubmit={handleSubmit(onPlanSubmit)} className="space-y-3.5">
              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Plan Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Basic, Pro, Enterprise"
                  {...register("name", {
                    required: "Plan name is required",
                    minLength: { value: 2, message: "Plan name must be at least 2 characters" },
                  })}
                  className={`w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none transition-all ${
                    errors.name
                      ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                      : "border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]"
                  }`}
                />
                {errors.name && (
                  <p className="text-xs text-rose-500 font-medium mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  placeholder="Target audience or key value proposition"
                  {...register("description")}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                    Monthly Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 999"
                    {...register("monthlyPrice", {
                      required: "Monthly price is required",
                      pattern: {
                        value: /^[0-9]+$/,
                        message: "Only numbers are allowed",
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
                      errors.monthlyPrice
                        ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                        : "border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]"
                    }`}
                  />
                  {errors.monthlyPrice && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                      {errors.monthlyPrice.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                    Yearly Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 9990"
                    {...register("yearlyPrice", {
                      required: "Yearly price is required",
                      pattern: {
                        value: /^[0-9]+$/,
                        message: "Only numbers are allowed",
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
                      errors.yearlyPrice
                        ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                        : "border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]"
                    }`}
                  />
                  {errors.yearlyPrice && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                      {errors.yearlyPrice.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Max Allowed Employees (-1 for Unlimited) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 25, 100, or -1"
                  {...register("maxEmployees", {
                    required: "Max employees is required",
                    pattern: {
                      value: /^-?[0-9]+$/,
                      message: "Enter a valid number or -1 for unlimited",
                    },
                  })}
                  onKeyDown={(e) => {
                    if (
                      !/[0-9-]/.test(e.key) &&
                      !["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"].includes(e.key)
                    ) {
                      e.preventDefault();
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none transition-all ${
                    errors.maxEmployees
                      ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                      : "border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]"
                  }`}
                />
                {errors.maxEmployees && (
                  <p className="text-xs text-rose-500 font-medium mt-1">
                    {errors.maxEmployees.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Included Features (Comma-separated) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. EMPLOYEES, ATTENDANCE, LEAVE, PAYROLL, REPORTS"
                  {...register("featuresString", {
                    required: "Features list is required",
                  })}
                  className={`w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none resize-none transition-all ${
                    errors.featuresString
                      ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                      : "border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]"
                  }`}
                />
                {errors.featuresString && (
                  <p className="text-xs text-rose-500 font-medium mt-1">
                    {errors.featuresString.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  {...register("isActive")}
                  className="rounded text-[#2C4FD6] focus:ring-[#2C4FD6]"
                />
                <label
                  htmlFor="activeCheck"
                  className="text-[13px] font-medium text-[#12151C] dark:text-gray-300 cursor-pointer"
                >
                  Plan is Active and available for purchase
                </label>
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
                  className="px-5 py-2 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13px] font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Saving..." : "Save Tier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
