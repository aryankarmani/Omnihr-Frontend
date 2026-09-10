import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Building2, Landmark, CalendarClock, ShieldCheck, Sliders } from 'lucide-react';

const tabs = [
    { label: 'Organization', path: '/masters/org', icon: Building2 },
    { label: 'Statutory & Payroll', path: '/masters/statutory', icon: Landmark },
    { label: 'Shifts & Holidays', path: '/masters/attendance', icon: CalendarClock },
    { label: 'Access Control', path: '/masters/access', icon: ShieldCheck },
    { label: 'Custom Fields', path: '/masters/custom-fields', icon: Sliders },
];

export default function MastersLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-[#12151C] dark:text-white">Masters Configuration</h1>
                <p className="page-sub text-[14px] text-[#5B6472] dark:text-gray-400 mb-[26px]">
                    Manage organization structure, payroll rules, and system settings.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 sm:gap-4 border-b border-[#E2E6ED] dark:border-gray-800 overflow-x-auto no-scrollbar whitespace-nowrap pb-0.5">
                {tabs.map((tab) => {
                    const isActive = location.pathname.startsWith(tab.path);
                    return (
                        <button
                            key={tab.path}
                            onClick={() => navigate(tab.path)}
                            className={`flex items-center gap-2 px-3.5 py-2.5 text-[13.5px] transition-all border-b-2 shrink-0 cursor-pointer ${
                                isActive
                                    ? 'tab active font-semibold text-[#12151C] dark:text-white border-[#2C4FD6]'
                                    : 'font-semibold text-[#5B6472] hover:text-[#12151C] dark:text-gray-400 dark:hover:text-gray-200 border-transparent'
                            }`}
                        >
                            <tab.icon size={16} className={isActive ? 'text-[#2C4FD6]' : 'text-[#9AA3B1]'} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="space-y-4">
                <Outlet />
            </div>
        </div>
    );
}
