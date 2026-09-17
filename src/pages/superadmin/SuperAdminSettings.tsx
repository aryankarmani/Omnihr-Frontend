import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Shield, KeyRound } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSuperAdminAuth } from "../../context/SuperAdminAuthContext";
import { superAdminApi } from "../../utils/superAdminApi";

interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SuperAdminSettings() {
  const { admin, updateProfile } = useSuperAdminAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPasswordValue = watch("newPassword");

  const onPasswordSubmit = async (data: ChangePasswordFormValues) => {
    try {
      setSubmitting(true);
      await superAdminApi.post("/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Super Admin password updated successfully!");
      reset();
      await updateProfile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full text-[#12151C] dark:text-white animate-fade-in font-sans">
      {/* Header */}
      <header className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-[#12151C] dark:text-white mb-1">
          Super Admin Settings & Security
        </h2>
        <p className="text-sm text-[#5B6472] dark:text-gray-400">
          Manage your platform master account credentials and security authentication.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Profile Card */}
        <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6">
          <h3 className="text-[15px] font-semibold text-[#12151C] dark:text-white mb-4 flex items-center gap-2">
            <Shield size={18} className="text-[#2C4FD6]" />
            <span>Platform Owner Identity</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#9AA3B1] uppercase tracking-wider mb-1">
                Account Name
              </label>
              <p className="font-bold text-[#12151C] dark:text-white text-base">
                {admin?.name || "Platform Owner"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9AA3B1] uppercase tracking-wider mb-1">
                Email Address
              </label>
              <p className="font-bold text-[#12151C] dark:text-white text-base">
                {admin?.email || "superadmin@encalm.com"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9AA3B1] uppercase tracking-wider mb-1">
                Access Role
              </label>
              <span className="inline-block px-2.5 py-0.5 rounded-[3px] text-[11px] font-semibold bg-[#E8ECFC] text-[#2C4FD6]">
                SUPER_ADMIN (Platform Master)
              </span>
            </div>

            <div>
              {/* <label className="block text-xs font-semibold text-[#9AA3B1] uppercase tracking-wider mb-1">
                Session Isolation
              </label>
              <span className="font-mono text-xs text-[#5B6472] dark:text-gray-400">
                superadmin_token in sessionStorage (Zero conflict with tenant session)
              </span> */}
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6">
          <h3 className="text-[15px] font-semibold text-[#12151C] dark:text-white mb-1 flex items-center gap-2">
            <KeyRound size={18} className="text-[#2C4FD6]" />
            <span>Update Master Password</span>
          </h3>
          <p className="text-[12.5px] text-[#9AA3B1] dark:text-gray-400 mb-5">
            Choose a strong password with at least 8 characters combining numbers and symbols.
          </p>

          <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1.5">
                Current Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                {...register("currentPassword", {
                  required: "Current password is required",
                })}
                className={`w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none transition-all ${
                  errors.currentPassword
                    ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                    : "border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]"
                }`}
              />
              {errors.currentPassword && (
                <p className="text-xs text-rose-500 font-medium mt-1">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1.5">
                New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                placeholder="At least 8 characters"
                {...register("newPassword", {
                  required: "New password is required",
                  minLength: {
                    value: 8,
                    message: "New password must be at least 8 characters long",
                  },
                })}
                className={`w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none transition-all ${
                  errors.newPassword
                    ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                    : "border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]"
                }`}
              />
              {errors.newPassword && (
                <p className="text-xs text-rose-500 font-medium mt-1">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1.5">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                placeholder="Re-enter new password"
                {...register("confirmPassword", {
                  required: "Please confirm your new password",
                  validate: (val) =>
                    val === newPasswordValue || "New passwords do not match",
                })}
                className={`w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none transition-all ${
                  errors.confirmPassword
                    ? "border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/20"
                    : "border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6]"
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-rose-500 font-medium mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[#2C4FD6] hover:bg-[#203FB4] text-white rounded-[6px] text-[13px] font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {submitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
