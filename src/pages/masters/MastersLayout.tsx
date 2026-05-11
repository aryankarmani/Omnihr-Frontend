import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Building2, Landmark, CalendarClock, ShieldCheck } from 'lucide-react';

const tabs = [
    { label: 'Organization', path: '/masters/org', icon: Building2 },
    { label: 'Statutory & Payroll', path: '/masters/statutory', icon: Landmark },
    { label: 'Shifts & Holidays', path: '/masters/attendance', icon: CalendarClock },
    { label: 'Access Control', path: '/masters/access', icon: ShieldCheck },
];

export default function MastersLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Masters Configuration</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage organization structure, payroll rules, and system settings.</p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
                {tabs.map((tab) => {
                    const isActive = location.pathname.startsWith(tab.path);
                    return (
                        <button
                            key={tab.path}
                            onClick={() => navigate(tab.path)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${isActive
                                    ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <Outlet />
            </div>
        </div>
    );
}
