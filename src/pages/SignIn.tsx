import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
// @ts-ignore
import officeWorkerImg from '../assets/office-worker-3d.png';
import { useAuth } from '../context/AuthContext';

export default function SignIn() {
    const navigate = useNavigate();
    const { setTheme } = useTheme();
    const { login, error: authError } = useAuth();

    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const loggedInUser = await login(email, password);
            setTheme('light');
            if (loggedInUser?.role === 'SUPER_ADMIN') {
                navigate('/superadmin/dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            console.error("Login failed", err);
        }
    };

    const renderLoginForm = () => (
        <form onSubmit={handleLogin} className="w-full space-y-4 md:space-y-5">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#5B6472] dark:text-gray-300 ml-1 uppercase tracking-wider">
                    Username or E-mail
                </label>
                <input
                    type="text"
                    required
                    placeholder="admin@encalm.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="login-input w-full px-4 py-3 bg-[#F7F8FA] dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6] focus:bg-white dark:focus:bg-[#12151C] focus:ring-4 focus:ring-[#2C4FD6]/10 rounded-xl text-[#12151C] dark:text-white font-medium transition-all placeholder:text-[#9AA3B1] hover:border-gray-400"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#5B6472] dark:text-gray-300 ml-1 uppercase tracking-wider">
                    Password
                </label>
                <div className="relative group">
                    <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="login-input w-full px-4 py-3 bg-[#F7F8FA] dark:bg-[#12151C] border border-[#E2E6ED] dark:border-gray-700 focus:border-[#2C4FD6] focus:bg-white dark:focus:bg-[#12151C] focus:ring-4 focus:ring-[#2C4FD6]/10 rounded-xl text-[#12151C] dark:text-white font-medium transition-all placeholder:text-[#9AA3B1] hover:border-gray-400"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9AA3B1] hover:text-[#5B6472] transition-colors"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                {authError && <p className="text-xs text-[#C13A3A] font-semibold mt-1 ml-1">{authError}</p>}
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    className="w-full py-3 bg-[#2C4FD6] hover:bg-[#2442B8] text-white font-bold text-base rounded-xl active:scale-[0.99] transition-all cursor-pointer"
                >
                    Log In
                </button>
            </div>
            
            <div className="text-center pt-1">
                <Link 
                    to="/forgot-password"
                    className="text-[#2C4FD6] font-semibold hover:underline text-xs sm:text-sm inline-block"
                >
                    Forgot Password?
                </Link>
            </div>
        </form>
    );

    return (
        <div className="fixed inset-0 h-screen w-screen bg-[#F7F8FA] dark:bg-[#12151C] flex items-center justify-center p-4 sm:p-6 font-sans overflow-hidden">
            {/* Ambient subtle decorative background glows */}
            <div className="absolute top-[-10%] right-[-10%] w-[45vh] h-[45vh] bg-[#2C4FD6]/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[45vh] h-[45vh] bg-[#E8ECFC] dark:bg-[#2C4FD6]/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="bg-white dark:bg-[#161B26] rounded-2xl md:rounded-[32px] border border-[#E2E6ED] dark:border-gray-800 w-full max-w-4xl max-h-[92vh] flex flex-col md:flex-row overflow-hidden relative z-10 animate-fade-in-up">
                {/* Left Banner */}
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

                {/* Right Form Container */}
                <div className="w-full md:w-1/2 bg-white dark:bg-[#161B26] flex flex-col justify-center items-center p-6 sm:p-8 lg:p-12 relative z-10 overflow-hidden">
                    <div className="w-full max-w-sm">
                        <div className="mb-6 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-2.5 mb-3 md:hidden">
                                <div className="w-8 h-8 bg-[#2C4FD6] rounded-[7px] flex items-center justify-center text-white font-bold text-base">
                                    O
                                </div>
                                <span className="text-xl font-bold text-[#12151C] dark:text-white">OmniHR</span>
                            </div>
                            <h1 className="text-2xl font-bold text-[#12151C] dark:text-white tracking-tight">Sign In</h1>
                            <p className="text-xs sm:text-sm text-[#5B6472] dark:text-gray-400 mt-1">Welcome back! Please enter your details.</p>
                        </div>
                        
                        <div className="transition-all duration-300 w-full">
                            {renderLoginForm()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

