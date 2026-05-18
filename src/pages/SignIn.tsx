import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
// @ts-ignore
import officeWorkerImg from '../assets/office-worker-3d.png';
import vedaLogo from '../assets/veda-logo.png';
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
            await login(email, password);
            setTheme('dark');
            navigate('/dashboard');
        } catch (err) {
            console.error("Login failed", err);
        }
    };

    const renderLoginForm = () => (
        <form onSubmit={handleLogin} className="space-y-4 md:space-y-5">
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wide">Username or E-mail</label>
                <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10 rounded-xl text-gray-700 font-medium transition-all placeholder:text-gray-300 shadow-sm"
                    placeholder="Enter your username"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1 uppercase tracking-wide">Password</label>
                <div className="relative group">
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10 rounded-xl text-gray-700 font-medium transition-all placeholder:text-gray-300 shadow-sm"
                        placeholder="Enter your password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                {authError && <p className="text-[10px] text-red-500 font-medium mt-1 ml-1">{authError}</p>}
            </div>

            <div className="pt-1">
                <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-bold text-lg rounded-full shadow-lg shadow-brand-500/30 active:scale-[0.98] transition-all transform"
                >
                    Log In
                </button>
            </div>
            
            <div className="text-center space-y-3 pt-1">
                <Link 
                    to="/forgot-password"
                    className="text-brand-500 font-bold hover:underline text-xs md:text-sm block w-full"
                >
                    Forgot Password?
                </Link>

                <p className="text-gray-400 text-xs md:text-sm">
                    Do Not Have Account? <Link to="/signup" className="text-brand-500 font-bold hover:underline ml-1">Sign Up</Link>
                </p>
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
                            {renderLoginForm()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
