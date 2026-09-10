import React, { useState } from "react";
import { Shield, KeyRound } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSuperAdminAuth } from "../../context/SuperAdminAuthContext";
import { superAdminApi } from "../../utils/superAdminApi";

export default function SuperAdminSettings() {
  const { admin, updateProfile } = useSuperAdminAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }

    try {
      setSubmitting(true);
      await superAdminApi.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      toast.success("Super Admin password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
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
              <label className="block text-xs font-semibold text-[#9AA3B1] uppercase tracking-wider mb-1">
                Session Isolation
              </label>
              <span className="font-mono text-xs text-[#5B6472] dark:text-gray-400">
                superadmin_token in sessionStorage (Zero conflict with tenant session)
              </span>
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

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
              />
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-[#12151C] dark:text-gray-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 rounded-[6px] text-[13.5px] text-[#12151C] dark:text-white outline-none focus:border-[#2C4FD6]"
              />
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
