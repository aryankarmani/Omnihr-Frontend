import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    ArrowLeft, 
    ArrowRight, 
    Clock, 
    TrendingUp, 
    ShieldCheck, 
    CheckCircle2, 
    Loader2,
    AlertCircle 
} from 'lucide-react';
import { Captcha } from '../components/auth/Captcha';
import { OtpInput } from '../components/auth/OtpInput';
import api from '../utils/api';
import toast from 'react-hot-toast';

type AuthStep = 'INITIAL_FORM' | 'OTP_VERIFICATION';

export default function ForgotPassword() {
    const navigate = useNavigate();

    const [step, setStep] = useState<AuthStep>('INITIAL_FORM');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedCaptcha, setGeneratedCaptcha] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [otp, setOtp] = useState('');

    const [touched, setTouched] = useState<{
        email?: boolean;
        password?: boolean;
        confirmPassword?: boolean;
        captchaInput?: boolean;
        otp?: boolean;
    }>({});

    const [fieldErrors, setFieldErrors] = useState<{
        email?: string;
        password?: string;
        confirmPassword?: string;
        captchaInput?: string;
        otp?: string;
    }>({});

    const validateEmail = (val: string): string => {
        const trimmed = val.trim();
        if (!trimmed) return "Registered email or mobile is required";
        if (trimmed.includes('@')) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmed)) {
                return "Please enter a valid email address (e.g. admin@encalm.com)";
            }
        }
        return "";
    };

    const validatePassword = (val: string): string => {
        if (!val) return "New password is required";
        if (val.length < 8) return "Password must be at least 8 characters";
        if (!/[A-Za-z]/.test(val) || !/[0-9]/.test(val)) {
            return "Password must contain both letters and numbers";
        }
        return "";
    };

    const validateConfirmPassword = (val: string, originalPass: string): string => {
        if (!val) return "Please confirm your new password";
        if (val !== originalPass) return "Passwords do not match";
        return "";
    };

    const validateCaptcha = (val: string, targetCaptcha: string): string => {
        const trimmed = val.trim();
        if (!trimmed) return "Please enter the captcha code";
        if (trimmed.toUpperCase() !== targetCaptcha.trim().toUpperCase()) {
            return "Incorrect Captcha code. Please check and re-enter.";
        }
        return "";
    };

    const validateOtp = (val: string): string => {
        const trimmed = val.trim();
        if (!trimmed) return "Please enter the 6-digit OTP code";
        if (trimmed.length < 6) return "Please enter all 6 digits of the OTP code";
        return "";
    };

    const handleEmailChange = (val: string) => {
        setEmail(val);
        setError('');
        if (touched.email) {
            setFieldErrors(prev => ({ ...prev, email: validateEmail(val) }));
        }
    };

    const handlePasswordChange = (val: string) => {
        setPassword(val);
        setError('');
        if (touched.password) {
            setFieldErrors(prev => ({ ...prev, password: validatePassword(val) }));
        }
        if (touched.confirmPassword && confirmPassword) {
            setFieldErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(confirmPassword, val) }));
        }
    };

    const handleConfirmPasswordChange = (val: string) => {
        setConfirmPassword(val);
        setError('');
        if (touched.confirmPassword) {
            setFieldErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(val, password) }));
        }
    };

    const handleCaptchaChange = (val: string) => {
        setCaptchaInput(val);
        setError('');
        if (touched.captchaInput) {
            setFieldErrors(prev => ({ ...prev, captchaInput: validateCaptcha(val, generatedCaptcha) }));
        }
    };

    const handleBlur = (field: 'email' | 'password' | 'confirmPassword' | 'captchaInput') => {
        setTouched(prev => ({ ...prev, [field]: true }));
        if (field === 'email') {
            setFieldErrors(prev => ({ ...prev, email: validateEmail(email) }));
        } else if (field === 'password') {
            setFieldErrors(prev => ({ ...prev, password: validatePassword(password) }));
        } else if (field === 'confirmPassword') {
            setFieldErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(confirmPassword, password) }));
        } else if (field === 'captchaInput') {
            setFieldErrors(prev => ({ ...prev, captchaInput: validateCaptcha(captchaInput, generatedCaptcha) }));
        }
    };

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const emailErr = validateEmail(email);
        const passErr = validatePassword(password);
        const confirmErr = validateConfirmPassword(confirmPassword, password);
        const captchaErr = validateCaptcha(captchaInput, generatedCaptcha);

        setTouched({
            email: true,
            password: true,
            confirmPassword: true,
            captchaInput: true
        });

        setFieldErrors({
            email: emailErr,
            password: passErr,
            confirmPassword: confirmErr,
            captchaInput: captchaErr
        });

        if (emailErr || passErr || confirmErr || captchaErr) {
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/send-otp', { email: email.trim(), mode: 'FORGOT_PASSWORD' });
            setStep('OTP_VERIFICATION');
            setFieldErrors({});
            setTouched({});
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to send OTP. Please verify your email and try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const otpErr = validateOtp(otp);
        setTouched(prev => ({ ...prev, otp: true }));
        setFieldErrors(prev => ({ ...prev, otp: otpErr }));

        if (otpErr) {
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', {
                email: email.trim(),
                password,
                otp: otp.trim()
            });

            toast.success('Password reset successfully! Please sign in with your new password.');
            navigate('/signin');
        } catch (err: any) {
            setError(err.response?.data?.message || "Verification failed. Invalid or expired OTP.");
        } finally {
            setLoading(false);
        }
    };

    const renderInitialForm = () => (
        <form onSubmit={handleSendOTP} noValidate className="space-y-4">
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#12151C] tracking-tight">Reset Password</h1>
                <p className="text-xs sm:text-sm text-[#5B6472] mt-1.5 font-normal">
                    Enter your details to receive an OTP and recover your account.
                </p>
            </div>

            {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] flex items-center gap-2.5 text-xs font-semibold text-rose-700 animate-fade-in">
                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Email Input */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#5B6472] uppercase tracking-wider block">
                    Registered Email or Mobile
                </label>
                <div className="relative group">
                    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${
                        touched.email && fieldErrors.email ? 'text-rose-500' : 'text-gray-400 group-focus-within:text-[#2C4FD6]'
                    }`}>
                        <Mail size={17} />
                    </div>
                    <input
                        type="text"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        onBlur={() => handleBlur('email')}
                        placeholder="admin@encalm.com"
                        className={`login-input w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-[6px] text-sm text-[#12151C] placeholder-[#64748B] placeholder:opacity-100 transition-all font-medium border ${
                            touched.email && fieldErrors.email 
                                ? 'border-rose-500 bg-rose-50/20 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15' 
                                : 'border-[#E2E6ED] bg-[#F8F9FA] focus:outline-none focus:border-[#2C4FD6] focus:bg-white focus:ring-2 focus:ring-[#2C4FD6]/15'
                        }`}
                    />
                </div>
                {touched.email && fieldErrors.email && (
                    <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5 mt-1 animate-fade-in">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{fieldErrors.email}</span>
                    </p>
                )}
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#5B6472] uppercase tracking-wider block">
                    New Password
                </label>
                <div className="relative group">
                    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${
                        touched.password && fieldErrors.password ? 'text-rose-500' : 'text-gray-400 group-focus-within:text-[#2C4FD6]'
                    }`}>
                        <Lock size={17} />
                    </div>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        onBlur={() => handleBlur('password')}
                        placeholder="••••••••••••"
                        className={`login-input w-full pl-10 pr-11 py-2.5 sm:py-3 rounded-[6px] text-sm text-[#12151C] placeholder-[#64748B] placeholder:opacity-100 transition-all font-medium border ${
                            touched.password && fieldErrors.password 
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
                {touched.password && fieldErrors.password && (
                    <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5 mt-1 animate-fade-in">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{fieldErrors.password}</span>
                    </p>
                )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#5B6472] uppercase tracking-wider block">
                    Confirm New Password
                </label>
                <div className="relative group">
                    <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${
                        touched.confirmPassword && fieldErrors.confirmPassword ? 'text-rose-500' : 'text-gray-400 group-focus-within:text-[#2C4FD6]'
                    }`}>
                        <Lock size={17} />
                    </div>
                    <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                        onBlur={() => handleBlur('confirmPassword')}
                        placeholder="••••••••••••"
                        className={`login-input w-full pl-10 pr-11 py-2.5 sm:py-3 rounded-[6px] text-sm text-[#12151C] placeholder-[#64748B] placeholder:opacity-100 transition-all font-medium border ${
                            touched.confirmPassword && fieldErrors.confirmPassword 
                                ? 'border-rose-500 bg-rose-50/20 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15' 
                                : 'border-[#E2E6ED] bg-[#F8F9FA] focus:outline-none focus:border-[#2C4FD6] focus:bg-white focus:ring-2 focus:ring-[#2C4FD6]/15'
                        }`}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                        {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                </div>
                {touched.confirmPassword && fieldErrors.confirmPassword && (
                    <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5 mt-1 animate-fade-in">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{fieldErrors.confirmPassword}</span>
                    </p>
                )}
            </div>

            {/* Captcha */}
            <div className="space-y-1">
                <Captcha onVerify={setGeneratedCaptcha} className="pt-1">
                    <input
                        type="text"
                        value={captchaInput}
                        onChange={(e) => handleCaptchaChange(e.target.value)}
                        onBlur={() => handleBlur('captchaInput')}
                        className={`login-input w-28 h-11 rounded-[6px] text-center font-bold tracking-widest text-[#12151C] text-sm uppercase transition-all placeholder-[#64748B] placeholder:opacity-100 border ${
                            touched.captchaInput && fieldErrors.captchaInput 
                                ? 'border-rose-500 bg-rose-50/20 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15' 
                                : 'border-[#E2E6ED] bg-[#F8F9FA] focus:outline-none focus:border-[#2C4FD6] focus:bg-white focus:ring-2 focus:ring-[#2C4FD6]/15'
                        }`}
                        placeholder="----"
                    />
                </Captcha>
                {touched.captchaInput && fieldErrors.captchaInput && (
                    <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1.5 mt-1 animate-fade-in">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{fieldErrors.captchaInput}</span>
                    </p>
                )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-[#2C4FD6] hover:bg-[#203FB4] disabled:opacity-60 text-white font-bold text-sm rounded-[6px] transition-all shadow-[0_10px_25px_-5px_rgba(44,79,214,0.35)] hover:shadow-[0_14px_30px_-5px_rgba(44,79,214,0.45)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Sending OTP...</span>
                        </>
                    ) : (
                        <>
                            <span>Send OTP</span>
                            <ArrowRight size={16} />
                        </>
                    )}
                </button>
            </div>

            <div className="text-center pt-2">
                <Link
                    to="/signin"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2C4FD6] hover:underline cursor-pointer"
                >
                    <ArrowLeft size={14} /> Back to Sign In
                </Link>
            </div>
        </form>
    );

    const renderOtpStep = () => (
        <form onSubmit={handleVerifyOTP} noValidate className="space-y-6 py-2">
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#12151C] tracking-tight">Verify OTP</h1>
                <p className="text-xs sm:text-sm text-[#5B6472] mt-1.5 font-normal">
                    We've sent a 6-digit verification code to <span className="font-bold text-[#12151C]">{email}</span>
                </p>
            </div>

            {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-[6px] flex items-center gap-2.5 text-xs font-semibold text-rose-700 animate-fade-in">
                    <AlertCircle size={16} className="text-rose-600 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="py-2">
                <div className="flex justify-center">
                    <OtpInput onComplete={(val) => {
                        setOtp(val);
                        setError('');
                        if (touched.otp) {
                            setFieldErrors(prev => ({ ...prev, otp: validateOtp(val) }));
                        }
                    }} />
                </div>
                {touched.otp && fieldErrors.otp && (
                    <p className="text-[11px] text-rose-600 font-semibold flex items-center justify-center gap-1.5 mt-2 animate-fade-in">
                        <AlertCircle size={13} className="shrink-0" />
                        <span>{fieldErrors.otp}</span>
                    </p>
                )}
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full py-3 px-4 bg-[#2C4FD6] hover:bg-[#203FB4] disabled:opacity-60 text-white font-bold text-sm rounded-[6px] transition-all shadow-[0_10px_25px_-5px_rgba(44,79,214,0.35)] hover:shadow-[0_14px_30px_-5px_rgba(44,79,214,0.45)] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Verifying...</span>
                        </>
                    ) : (
                        <>
                            <span>Confirm & Reset Password</span>
                            <ArrowRight size={16} />
                        </>
                    )}
                </button>
            </div>

            <div className="text-center pt-2">
                <button
                    type="button"
                    onClick={() => {
                        setStep('INITIAL_FORM');
                        setError('');
                        setFieldErrors({});
                        setTouched({});
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B6472] hover:text-[#2C4FD6] transition-colors cursor-pointer"
                >
                    <ArrowLeft size={14} /> Change Email or Password
                </button>
            </div>
        </form>
    );

    return (
        <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
            {/* Multi-Layer Pastel Aurora Ambient Background (Identical to Landing Page & Sign In) */}
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
                            <div className="w-10 h-10 rounded-[6px] bg-[#2C4FD6] flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#2C4FD6]/30">
                                O
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black tracking-tight text-[#12151C]">OmniHR</span>
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
                            <div className="w-9 h-9 rounded-[6px] bg-[#2C4FD6] flex items-center justify-center text-white font-bold text-lg">
                                O
                            </div>
                            <div>
                                <span className="text-xl font-bold tracking-tight text-[#12151C]">OmniHR</span>
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-[6px] bg-[#2C4FD6]/10 text-[#2C4FD6] ml-2 border border-[#2C4FD6]/20">
                                    Enterprise
                                </span>
                            </div>
                        </div>

                        {step === 'INITIAL_FORM' ? renderInitialForm() : renderOtpStep()}
                    </div>

                    {/* Bottom Security / Terms Footer */}
                    <div className="mt-8 pt-4 border-t border-[#E2E6ED] text-center">
                        <p className="text-[11px] text-[#9AA3B1] leading-relaxed">
                            Protected by 256-bit SSL encryption. OmniHR Enterprise Security & Account Recovery.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
