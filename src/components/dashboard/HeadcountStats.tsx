import { Users, UserMinus, UserCheck, Clock } from 'lucide-react';

interface HeadcountStatsProps {
    headcount: number | string;
    onLeaveToday: number | string;
    newJoiners: number | string;
    avgAttendance: number | string;
    navigate: any;
}

export default function HeadcountStats({ headcount, onLeaveToday, newJoiners, avgAttendance, navigate }: HeadcountStatsProps) {
    const stats = [
        { label: 'Total Headcount', value: headcount, icon: Users, color: 'text-brand-500', bg: 'bg-brand-50', path: '/attendance' },
        { label: 'On Leave Today', value: onLeaveToday, icon: UserMinus, color: 'text-orange-500', bg: 'bg-orange-50', path: '/leave-today' },
        { label: 'New Joiners', value: newJoiners, icon: UserCheck, color: 'text-green-500', bg: 'bg-green-50', path: '/employee' },
        { label: 'Avg Attendance', value: `${avgAttendance}%`, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', path: '/reports' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in-up">
            {stats.map((stat, index) => (
                <div 
                    key={index} 
                    onClick={() => navigate(stat.path)}
                    className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 rounded-3xl border border-gray-100/50 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden cursor-pointer"
                >
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-current to-transparent opacity-[0.03] dark:opacity-[0.05] rounded-full group-hover:scale-150 transition-transform duration-500" style={{ color: 'inherit' }}></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div className="space-y-2">
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold tracking-wide uppercase">{stat.label}</p>
                            <h3 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">{stat.value}</h3>
                        </div>
                        <div className={`p-3.5 rounded-2xl ${stat.bg} ${stat.color} dark:bg-white/5 shadow-inner`}>
                            <stat.icon size={26} strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
