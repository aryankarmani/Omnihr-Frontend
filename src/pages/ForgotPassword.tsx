import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import officeWorkerImg from '../assets/office-worker-3d.png';
import vedaLogo from '../assets/veda-logo.png';
import { Captcha } from '../components/auth/Captcha';
import { OtpInput } from '../components/auth/OtpInput';
import api from '../utils/api';

type AuthStep = 'INITIAL_FORM' | 'OTP_VERIFICATION';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const { setTheme } = useTheme();

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

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (captchaInput.toUpperCase() !== generatedCaptcha.toUpperCase()) {
            setError('Invalid Captcha. Please try again.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/send-otp', { email, mode: 'FORGOT_PASSWORD' });
            setStep('OTP_VERIFICATION');
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/reset-password', {
                email,
                password,
                otp
            });

            alert('Password reset successfully! Please login.');
            navigate('/signin');
        } catch (err: any) {
            setError(err.response?.data?.message || "Verification failed. Invalid OTP.");
        } finally {
            setLoading(false);
        }
    };

    const renderInitialForm = () => (
        <form onSubmit={handleSendOTP} className="space-y-3 md:space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">Forgot Password</h2>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wide">Registered Email / Mobile *</label>
                <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10 rounded-xl text-gray-700 font-medium transition-all"
                    placeholder="admin@gmail.com"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wide">New Password *</label>
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10 rounded-xl text-gray-700 font-medium transition-all"
                        placeholder="Enter New Password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wide">Confirm Password *</label>
                <div className="relative">
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10 rounded-xl text-gray-700 font-medium transition-all"
                        placeholder="Enter Confirm Password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </div>

            <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-gray-500 ml-1 uppercase tracking-wide">Enter Captcha *</label>
                <div className="flex gap-2">
                    <Captcha onVerify={setGeneratedCaptcha} className="flex-1" />
                    <input
                        type="text"
                        required
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value)}
                        className="w-28 h-12 bg-gray-100 border border-gray-200 focus:border-brand-500 rounded-xl text-center font-black tracking-widest text-gray-900 shadow-inner uppercase"
                        placeholder="----"
                    />
                </div>
            </div>

            {error && <p className="text-[10px] text-red-500 font-bold text-center">{error}</p>}

            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
                {loading ? 'Sending...' : 'Send OTP'}
            </button>

            <Link
                to="/signin"
                className="w-full text-center block text-brand-500 font-bold text-sm hover:underline"
            >
                Back to Login
            </Link>
        </form>
    );

    const renderOtpStep = () => (
        <form onSubmit={handleVerifyOTP} className="space-y-8 py-4">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-gray-800">Verify OTP</h2>
                <p className="text-gray-500 text-sm">We've sent a code to your email/mobile</p>
            </div>

            <div className="py-4">
                <OtpInput onComplete={setOtp} />
            </div>

            <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
            >
                {loading ? 'Verifying...' : 'Confirm'}
            </button>

            <div className="text-center">
                <button
                    type="button"
                    onClick={() => setStep('INITIAL_FORM')}
                    className="flex items-center justify-center gap-2 text-gray-500 hover:text-brand-600 font-medium text-sm mx-auto transition-colors"
                >
                    <ArrowLeft size={16} /> Change Email / Password
                </button>
            </div>
        </form>
    );

    return (
        <div className="h-screen w-full bg-brand-950 flex items-center justify-center p-2 md:p-8 font-sans relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-900 to-brand-950 opacity-90 z-0"></div>
            <div className="absolute top-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-white/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-purple-600/20 rounded-full blur-3xl z-0 pointer-events-none"></div>

            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl h-fit max-h-[95vh] flex flex-col md:flex-row overflow-hidden relative z-10 animate-fade-in-up">
                <div className="hidden md:flex md:w-1/2 bg-brand-50/50 relative overflow-visible flex-col justify-between p-8 lg:p-12 border-r border-gray-100">
                    <div className="absolute top-0 left-0 w-64 h-64 bg-white/60 rounded-full mix-blend-overlay blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-200/40 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3"></div>

                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center">
                            <img src={vedaLogo} alt="EnCalm" className="w-full h-full object-contain drop-shadow-md" />
                        </div>
                        <span className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight">EnCalm HRX</span>
                    </div>

                    <div className="relative z-10 self-start">
                        <p className="text-gray-600 text-base lg:text-lg font-medium max-w-xs leading-relaxed">
                            Smart Payroll. Seamless Compliance. Scale with Confidence.
                        </p>
                    </div>

                    <div className="relative flex-1 flex items-center justify-center pointer-events-none">
                        <img
                            src={officeWorkerImg}
                            alt="Welcome"
                            className="w-[80%] h-auto object-contain drop-shadow-2xl transform translate-y-4"
                        />
                    </div>
                </div>

                <div className="w-full md:w-1/2 bg-white flex flex-col justify-center items-center p-6 md:p-10 lg:p-14 relative z-10 overflow-y-auto">
                    <div className="absolute top-24 right-8 w-8 h-8 bg-brand-100/50 rounded-full blur-sm"></div>
                    <div className="w-full max-w-sm">
                        <div className="text-center mb-6">
                            <img
                                src="/logo.png"
                                alt="Logo"
                                className="h-14 w-auto mx-auto object-contain"
                            />
                        </div>
                        <div className="transition-all duration-300">
                            {step === 'INITIAL_FORM' ? renderInitialForm() : renderOtpStep()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
