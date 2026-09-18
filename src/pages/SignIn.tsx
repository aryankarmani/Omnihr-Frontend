import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Eye, EyeOff, Mail, Lock, Loader2, ArrowRight,
    CheckCircle2, ShieldCheck, TrendingUp, Clock, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SignIn() {
    const navigate = useNavigate();
    const { login, error: authContextError } = useAuth();

    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const validateEmail = (val: string): string => {
        const trimmed = val.trim();
        if (!trimmed) return "Username or Work E-mail is required";
        if (trimmed.includes('@')) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmed)) {
                return "Please enter a valid e-mail address (e.g. name@company.com)";
            }
        }
        return "";
    };

    const validatePassword = (val: string): string => {
        if (!val) return "Password is required";
        if (val.length < 6) return "Password must be at least 6 characters";
        return "";
    };

    const handleEmailChange = (val: string) => {
        setEmail(val);
        setServerError(null);
        if (touched.email) {
            setErrors(prev => ({ ...prev, email: validateEmail(val) }));
        }
    };

    const handlePasswordChange = (val: string) => {
        setPassword(val);
        setServerError(null);
        if (touched.password) {
            setErrors(prev => ({ ...prev, password: validatePassword(val) }));
        }
    };

    const handleBlur = (field: 'email' | 'password') => {
        setTouched(prev => ({ ...prev, [field]: true }));
        if (field === 'email') {
            setErrors(prev => ({ ...prev, email: validateEmail(email) }));
        } else {
            setErrors(prev => ({ ...prev, password: validatePassword(password) }));
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setServerError(null);

        const emailErr = validateEmail(email);
        const passErr = validatePassword(password);

        setTouched({ email: true, password: true });
        setErrors({ email: emailErr, password: passErr });

        if (emailErr || passErr) {
            return;
        }

        setIsSubmitting(true);
        try {
            const loggedInUser = await login(email.trim(), password);
            if (loggedInUser?.role === 'SUPER_ADMIN') {
                navigate('/superadmin/dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error("Login failed", err);
            const msg = err.response?.data?.message || err.message || "Invalid credentials. Please verify your email and password.";
            setServerError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
            {/* Multi-Layer Pastel Aurora Ambient Background (Identical to Landing Page) */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_12%_8%,rgba(254,215,170,0.45)_0%,transparent_60%),radial-gradient(ellipse_65%_50%_at_88%_12%,rgba(224,231,255,0.60)_0%,transparent_65%),radial-gradient(circle_at_50%_38%,rgba(186,230,253,0.40)_0%,transparent_65%),radial-gradient(ellipse_60%_45%_at_82%_70%,rgba(236,72,153,0.16)_0%,transparent_60%),radial-gradient(circle_at_18%_82%,rgba(99,102,241,0.20)_0%,transparent_55%)] pointer-events-none" />

            {/* Main Unified Light Card with Landing Page Frosted Glass Shadow & rounded-[6px] */}
            <div className="frosted-glass rounded-[6px] w-full max-w-5xl overflow-hidden flex flex-col md:flex-row relative z-10 transition-all duration-300 hover:-translate-y-1.5 shadow-glass-lum hover:shadow-glass-card-hover group">

                {/* LEFT: Light Aesthetic Product Showcase Panel */}
                <div className="hidden md:flex md:w-[46%] lg:w-[48%] bg-gradient-to-br from-[#F0F4FC]/90 via-[#F6F9FE]/90 to-[#EAF1FB]/90 p-8 lg:p-10 flex-col justify-between relative overflow-hidden border-r border-[#E2E6ED]">
                    {/* Subtle dot pattern */}
                    <div className="absolute inset-0 bg-[radial-gradient(#2C4FD6_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.06]" />

                    {/* Top Identity */}
                    <div className="relative z-10">
                        <div className="flex items-center gap-3">
                            <img
                                src="/logo.png"
                                alt="OmniHR Logo"
                                className="w-10 h-10 object-contain rounded-[6px] shrink-0"
                            />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-extrabold tracking-tight text-[#12151C]">
                                        Omni<span className="text-[#2C4FD6]">HR</span>
                                    </span>
                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-[6px] bg-[#2C4FD6]/10 text-[#2C4FD6] border border-[#2C4FD6]/20">
                                        Enterprise
                                    </span>
                                </div>
                                <p className="text-[11px] text-[#5B6472]">Intelligent Human Capital Platform</p>
                            </div>
                        </div>

                        <div className="mt-8">
                            <h2 className="text-2xl lg:text-[25px] font-extrabold text-[#12151C] leading-tight tracking-tight">
                                Smart Payroll. Seamless Compliance. Scale with Confidence.
                            </h2>
                            <p className="text-xs lg:text-sm text-[#5B6472] mt-2.5 leading-relaxed font-normal">
                                Automated shift attendance, zero-error tax calculation, and self-service employee portals unified in one workspace.
                            </p>
                        </div>
                    </div>

                    {/* Middle Feature Highlights - Cards with Landing Page Shadow */}
                    <div className="relative z-10 my-8 space-y-3">
                        {/* Feature 1 */}
                        <div className="frosted-glass rounded-[6px] p-3.5 flex items-center justify-between hover:-translate-y-1 hover:shadow-glass-card-hover transition-all duration-300 cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-[6px] bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-[#12151C]">Live Attendance Sync</span>
                                        <span className="flex h-2 w-2 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-[#5B6472]">Real-time punch tracking & shift logs</p>
                                </div>
                            </div>
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[6px] border border-emerald-200">
                                99.2% Active
                            </span>
                        </div>

                        {/* Feature 2 */}
                        <div className="frosted-glass rounded-[6px] p-3.5 flex items-center justify-between hover:-translate-y-1 hover:shadow-glass-card-hover transition-all duration-300 cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-[6px] bg-blue-50 text-[#2C4FD6] border border-blue-200/60 flex items-center justify-center shrink-0">
                                    <TrendingUp size={18} />
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-[#12151C]">Automated Payroll</span>
                                    <p className="text-[11px] text-[#5B6472]">100% Tax & Statutory Compliance</p>
                                </div>
                            </div>
                            <span className="text-[11px] font-semibold text-[#2C4FD6] bg-blue-50 px-2 py-0.5 rounded-[6px] border border-blue-200">
                                Zero Error
                            </span>
                        </div>

                        {/* Feature 3 */}
                        <div className="frosted-glass rounded-[6px] p-3.5 flex items-center justify-between hover:-translate-y-1 hover:shadow-glass-card-hover transition-all duration-300 cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-[6px] bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0">
                                    <ShieldCheck size={18} />
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-[#12151C]">Enterprise Security</span>
                                    <p className="text-[11px] text-[#5B6472]">256-bit AES multi-tenant isolation</p>
                                </div>
                            </div>
                            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-[6px] border border-indigo-200">
                                Protected
                            </span>
                        </div>
                    </div>

                    {/* Bottom Trust Row */}
                    <div className="relative z-10 pt-4 border-t border-[#E2E6ED] flex items-center justify-between text-[11px] text-[#5B6472]">
                        <span className="flex items-center gap-1.5 font-medium">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            SOC-2 Type II & ISO 27001 Certified
                        </span>
                        <span className="font-semibold text-[#9AA3B1]">v2.4 LTS</span>
                    </div>
                </div>

                {/* RIGHT: Clean Light Form Panel */}
                <div className="w-full md:w-[54%] lg:w-[52%] p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-white/95">
                    <div>
                        {/* Mobile Brand (Only shown on small screens) */}
                        <div className="flex items-center gap-2.5 mb-6 md:hidden">
                            <img
                                src="/logo.png"
                                alt="OmniHR Logo"
                                className="w-9 h-9 object-contain rounded-[6px] shrink-0"
                            />
                            <div>
                                <span className="text-xl font-extrabold text-[#12151C]">
                                    Omni<span className="text-[#2C4FD6]">HR</span>
                                </span>
                                <span className="text-[10px] ml-2 uppercase font-bold tracking-wider px-2 py-0.5 rounded-[6px] bg-blue-50 text-[#2C4FD6] border border-blue-200">
                                    Enterprise
                                </span>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#12151C] tracking-tight">
                                Sign In
                            </h1>
                            <p className="text-xs sm:text-sm text-[#5B6472] mt-1.5">
                                Welcome back! Please enter your details to access your workspace.
                            </p>
                        </div>

                        {/* Sign-In Form */}
                        <form onSubmit={handleLogin} noValidate className="space-y-4">
                            {/* Server Alert Banner */}
                            {(serverError || authContextError) && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] flex items-center gap-2.5 text-xs font-semibold text-rose-700 animate-fade-in">
                                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                                    <span>{serverError || authContextError}</span>
                                </div>
                            )}

                            {/* Email / Username Input with rounded-[6px] */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#5B6472] uppercase tracking-wider block">
                                    Username or Work E-mail
                                </label>
                                <div className="relative group">
                                    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${touched.email && errors.email ? 'text-rose-500' : 'text-gray-400 group-focus-within:text-[#2C4FD6]'
                                        }`}>
                                        <Mail size={17} />
                                    </div>
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(e) => handleEmailChange(e.target.value)}
                                        onBlur={() => handleBlur('email')}
                                        placeholder="admin@encalm.com"
                                        className={`login-input w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-[6px] text-sm text-[#12151C] placeholder-[#64748B] placeholder:opacity-100 transition-all font-medium border ${touched.email && errors.email
                                                ? 'border-rose-500 bg-rose-50/20 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
                                                : 'border-[#E2E6ED] bg-[#F8F9FA] focus:outline-none focus:border-[#2C4FD6] focus:bg-white focus:ring-2 focus:ring-[#2C4FD6]/15'
                                            }`}
                                    />
                                </div>
                                {touched.email && errors.email && (
                                    <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5 mt-1 animate-fade-in">
                                        <AlertCircle size={13} className="shrink-0" />
                                        <span>{errors.email}</span>
                                    </p>
                                )}
                            </div>

                            {/* Password Input with rounded-[6px] */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[#5B6472] uppercase tracking-wider block">
                                    Password
                                </label>
                                <div className="relative group">
                                    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${touched.password && errors.password ? 'text-rose-500' : 'text-gray-400 group-focus-within:text-[#2C4FD6]'
                                        }`}>
                                        <Lock size={17} />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => handlePasswordChange(e.target.value)}
                                        onBlur={() => handleBlur('password')}
                                        placeholder="••••••••••••"
                                        className={`login-input w-full pl-10 pr-11 py-2.5 sm:py-3 rounded-[6px] text-sm text-[#12151C] placeholder-[#64748B] placeholder:opacity-100 transition-all font-medium border ${touched.password && errors.password
                                                ? 'border-rose-500 bg-rose-50/20 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
                                                : 'border-[#E2E6ED] bg-[#F8F9FA] focus:outline-none focus:border-[#2C4FD6] focus:bg-white focus:ring-2 focus:ring-[#2C4FD6]/15'
                                            }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                        title={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                                {touched.password && errors.password && (
                                    <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5 mt-1 animate-fade-in">
                                        <AlertCircle size={13} className="shrink-0" />
                                        <span>{errors.password}</span>
                                    </p>
                                )}
                            </div>

                            {/* Remember Me & Forgot Password */}
                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#5B6472] font-medium">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 rounded-[3px] text-[#2C4FD6] border-gray-300 focus:ring-[#2C4FD6]/20 accent-[#2C4FD6] cursor-pointer"
                                    />
                                    Remember me
                                </label>

                                <Link
                                    to="/forgot-password"
                                    className="text-xs font-semibold text-[#2C4FD6] hover:underline cursor-pointer"
                                >
                                    Forgot Password?
                                </Link>
                            </div>

                            {/* Submit Button with rounded-[6px] and shadow */}
                            <div className="pt-3">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 px-4 bg-[#2C4FD6] hover:bg-[#203FB4] disabled:opacity-60 text-white font-bold text-sm rounded-[6px] transition-all shadow-[0_10px_25px_-5px_rgba(44,79,214,0.35)] hover:shadow-[0_14px_30px_-5px_rgba(44,79,214,0.45)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Signing In...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Sign In to Workspace</span>
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Bottom Security / Terms Footer */}
                    <div className="mt-8 pt-4 border-t border-[#E2E6ED] text-center">
                        <p className="text-[11px] text-[#9AA3B1] leading-relaxed">
                            Protected by 256-bit SSL encryption. By signing in, you agree to OmniHR's Terms of Service and Privacy Policy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
