import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
// @ts-ignore
import officeWorkerImg from '../assets/office-worker-3d.png';
import { Captcha } from '../components/auth/Captcha';
import { OtpInput } from '../components/auth/OtpInput';
import api from '../utils/api';
import toast from 'react-hot-toast';

type AuthStep = 'INITIAL_FORM' | 'OTP_VERIFICATION';

export default function SignUp() {
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
            await api.post('/auth/send-otp', { email, mode: 'SIGN_UP' });
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
            await api.post('/auth/signup', {
                email,
                password,
                otp
            });

            toast.success('Account created successfully! Please login.');
            navigate('/signin');
        } catch (err: any) {
            setError(err.response?.data?.message || "Verification failed. Invalid OTP.");
        } finally {
            setLoading(false);
        }
    };

    const renderInitialForm = () => (
        <form onSubmit={handleSendOTP} className="w-full space-y-3 sm:space-y-4">
            <div className="mb-2 text-center md:text-left">
                <h2 className="text-xl font-bold text-[#12151C] dark:text-white">Create Account</h2>
                <p className="text-xs text-[#5B6472] dark:text-gray-400 mt-0.5">Sign up to get started with OmniHR</p>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-[#5B6472] dark:text-gray-300 ml-1 uppercase tracking-wider">Registered Email / Mobile *</label>
                <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="login-input w-full px-3.5 py-2.5 bg-[#F7F8FA] dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6] focus:bg-white dark:focus:bg-[#12151C] focus:ring-4 focus:ring-[#2C4FD6]/10 rounded-xl text-[#12151C] dark:text-white text-sm font-medium transition-all hover:border-gray-400"
                    placeholder="admin@encalm.com"
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-[#5B6472] dark:text-gray-300 ml-1 uppercase tracking-wider">New Password *</label>
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="login-input w-full px-3.5 py-2.5 bg-[#F7F8FA] dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6] focus:bg-white dark:focus:bg-[#12151C] focus:ring-4 focus:ring-[#2C4FD6]/10 rounded-xl text-[#12151C] dark:text-white text-sm font-medium transition-all hover:border-gray-400"
                        placeholder="••••••••"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9AA3B1] hover:text-[#5B6472]"
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-[#5B6472] dark:text-gray-300 ml-1 uppercase tracking-wider">Confirm Password *</label>
                <div className="relative">
                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="login-input w-full px-3.5 py-2.5 bg-[#F7F8FA] dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6] focus:bg-white dark:focus:bg-[#12151C] focus:ring-4 focus:ring-[#2C4FD6]/10 rounded-xl text-[#12151C] dark:text-white text-sm font-medium transition-all hover:border-gray-400"
                        placeholder="••••••••"
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9AA3B1] hover:text-[#5B6472]"
                    >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </div>

            <Captcha onVerify={setGeneratedCaptcha} className="pt-0.5">
                <input
                    type="text"
                    required
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    className="login-input w-28 h-10 bg-[#F7F8FA] dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6] rounded-xl text-center font-bold tracking-widest text-[#12151C] dark:text-white text-sm uppercase hover:border-gray-400 transition-all"
                    placeholder="----"
                />
            </Captcha>

            {error && <p className="text-xs text-[#C13A3A] font-bold text-center">{error}</p>}

            <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#2C4FD6] hover:bg-[#2442B8] text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
                {loading ? 'Sending...' : 'Send OTP'}
            </button>

            <Link
                to="/signin"
                className="w-full text-center block text-[#2C4FD6] font-semibold text-xs hover:underline"
            >
                Back to Login
            </Link>
        </form>
    );

    const renderOtpStep = () => (
        <form onSubmit={handleVerifyOTP} className="w-full space-y-6 py-2">
            <div className="text-center space-y-1">
                <h2 className="text-xl font-bold text-[#12151C] dark:text-white">Verify OTP</h2>
                <p className="text-[#5B6472] dark:text-gray-400 text-xs">We've sent a code to your email/mobile</p>
            </div>

            <div className="py-2">
                <OtpInput onComplete={setOtp} />
            </div>

            <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full py-3 bg-[#2C4FD6] hover:bg-[#2442B8] text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
                {loading ? 'Verifying...' : 'Sign Up'}
            </button>

            <div className="text-center">
                <button
                    type="button"
                    onClick={() => setStep('INITIAL_FORM')}
                    className="flex items-center justify-center gap-2 text-[#5B6472] hover:text-[#2C4FD6] font-medium text-xs mx-auto transition-colors cursor-pointer"
                >
                    <ArrowLeft size={14} /> Change Email / Password
                </button>
            </div>
        </form>
    );

    return (
        <div className="fixed inset-0 h-screen w-screen bg-[#F7F8FA] dark:bg-[#12151C] flex items-center justify-center p-4 sm:p-6 font-sans overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-[45vh] h-[45vh] bg-[#2C4FD6]/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[45vh] h-[45vh] bg-[#E8ECFC] dark:bg-[#2C4FD6]/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="bg-white dark:bg-[#161B26] rounded-2xl md:rounded-[32px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-4xl max-h-[92vh] flex flex-col md:flex-row overflow-hidden relative z-10 animate-fade-in-up">
                <div className="hidden md:flex md:w-1/2 bg-[#F4F6FB] dark:bg-[#1A1F2C] relative overflow-hidden flex-col justify-between p-8 lg:p-10 border-r border-[#E2E6ED] dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#2C4FD6] rounded-[9px] flex items-center justify-center text-white font-bold text-xl shrink-0">
                            O
                        </div>
                        <span className="text-2xl font-bold text-[#12151C] dark:text-white tracking-tight">OmniHR</span>
                    </div>

                    <div className="relative z-10 my-4">
                        <p className="text-[#5B6472] dark:text-gray-300 text-base lg:text-lg font-medium max-w-xs leading-relaxed">
                            Smart Payroll. Seamless Compliance. Scale with Confidence.
                        </p>
                    </div>

                    <div className="relative flex-1 flex items-center justify-center pointer-events-none min-h-0">
                        <img
                            src={officeWorkerImg}
                            alt="Welcome"
                            className="max-h-[240px] lg:max-h-[280px] w-auto object-contain"
                        />
                    </div>
                </div>

                <div className="w-full md:w-1/2 bg-white dark:bg-[#161B26] flex flex-col justify-center items-center p-6 sm:p-8 lg:p-12 relative z-10 overflow-hidden">
                    <div className="w-full max-w-sm">
                        <div className="mb-4 text-center md:text-left md:hidden">
                            <div className="flex items-center justify-center md:justify-start gap-2.5 mb-2">
                                <div className="w-8 h-8 bg-[#2C4FD6] rounded-[7px] flex items-center justify-center text-white font-bold text-base">
                                    O
                                </div>
                                <span className="text-xl font-bold text-[#12151C] dark:text-white">OmniHR</span>
                            </div>
                        </div>

                        <div className="transition-all duration-300 w-full">
                            {step === 'INITIAL_FORM' ? renderInitialForm() : renderOtpStep()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

