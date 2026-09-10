import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, Mail, Eye, EyeOff, ArrowRight } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSuperAdminAuth } from "../../context/SuperAdminAuthContext";

export default function SuperAdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { login } = useSuperAdminAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please provide both email and password.");
      return;
    }

    try {
      setSubmitting(true);
      await login(email.trim(), password);
      toast.success("Welcome back, Platform Administrator!");
      navigate("/superadmin/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid Super Admin credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickFill = () => {
    setEmail("superadmin@encalm.com");
    setPassword("SuperAdmin@2026!");
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0B0D13] flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-[#12151C] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden animate-fade-in">
        {/* Header Branding */}
        <div className="p-8 pb-6 border-b border-gray-100 dark:border-gray-800 text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white mx-auto mb-4 shadow-md shadow-indigo-500/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            Encalm HRMS
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Super Admin SaaS Management & Billing Portal
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-8 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Super Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@encalm.com"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Access Super Admin Panel</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Quick Credential Helper */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800/60 text-center">
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Fill Default Super Admin Credentials
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
