import React, { useEffect, useState } from "react";
import {
  Plus,
  Check,
  Edit2,
  Users,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { superAdminApi } from "../../utils/superAdminApi";

export default function Plans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [yearlyPrice, setYearlyPrice] = useState("");
  const [maxEmployees, setMaxEmployees] = useState("25");
  const [featuresString, setFeaturesString] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
    setName("");
    setDescription("");
    setMonthlyPrice("");
    setYearlyPrice("");
    setMaxEmployees("25");
    setFeaturesString("EMPLOYEES, ATTENDANCE, LEAVE");
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (plan: any) => {
    setEditingPlan(plan);
    setName(plan.name);
    setDescription(plan.description || "");
    setMonthlyPrice(String(plan.monthlyPrice));
    setYearlyPrice(String(plan.yearlyPrice));
    setMaxEmployees(String(plan.maxEmployees));
    setFeaturesString(Array.isArray(plan.features) ? plan.features.join(", ") : "");
    setIsActive(plan.isActive);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const featuresList = featuresString
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      setSubmitting(true);
      if (editingPlan) {
        await superAdminApi.put(`/plans/${editingPlan.id}`, {
          name,
          description,
          monthlyPrice: Number(monthlyPrice),
          yearlyPrice: Number(yearlyPrice),
          maxEmployees: Number(maxEmployees),
          features: featuresList,
          isActive,
        });
        toast.success("Plan updated successfully!");
      } else {
        await superAdminApi.post("/plans", {
          name,
          description,
          monthlyPrice: Number(monthlyPrice),
          yearlyPrice: Number(yearlyPrice),
          maxEmployees: Number(maxEmployees),
          features: featuresList,
          isActive,
        });
        toast.success("Plan created successfully!");
      }

      setShowModal(false);
      fetchPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save plan.");
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
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13px] font-semibold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
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
                className={`bg-white dark:bg-[#12151C] rounded-[6px] border ${
                  p.isActive
                    ? "border-[#E2E6ED] dark:border-gray-800"
                    : "border-gray-200/60 dark:border-gray-800/40 opacity-70"
                } p-6 flex flex-col justify-between relative shadow-xs`}
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
                    {p.subscribersCount || 0} active companies
                  </span>
                  <button
                    onClick={() => openEditModal(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF1F5] hover:bg-[#E8ECFC] hover:text-[#2C4FD6] dark:bg-white/5 dark:hover:bg-white/10 text-[#12151C] dark:text-gray-200 rounded-[6px] text-[12px] font-semibold transition-colors cursor-pointer"
                  >
                    <Edit2 size={13} />
                    <span>Edit Tier</span>
                  </button>
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

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Plan Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Basic, Pro, Enterprise"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Target audience or key value proposition"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                    Monthly Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(e.target.value)}
                    placeholder="e.g. 999"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                    Yearly Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={yearlyPrice}
                    onChange={(e) => setYearlyPrice(e.target.value)}
                    placeholder="e.g. 9990"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Max Allowed Employees (-1 for Unlimited)
                </label>
                <input
                  type="number"
                  required
                  value={maxEmployees}
                  onChange={(e) => setMaxEmployees(e.target.value)}
                  placeholder="e.g. 25, 100, or -1"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1">
                  Included Features (Comma-separated)
                </label>
                <textarea
                  rows={2}
                  value={featuresString}
                  onChange={(e) => setFeaturesString(e.target.value)}
                  placeholder="e.g. EMPLOYEES, ATTENDANCE, LEAVE, PAYROLL, REPORTS"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6] resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-[#2C4FD6] focus:ring-[#2C4FD6]"
                />
                <label htmlFor="activeCheck" className="text-[13px] font-medium text-[#12151C] dark:text-gray-300 cursor-pointer">
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
                  className="px-5 py-2 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13px] font-semibold shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
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
