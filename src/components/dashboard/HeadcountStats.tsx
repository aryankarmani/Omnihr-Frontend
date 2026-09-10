import { Users, Calendar, User, Clock, TrendingUp } from 'lucide-react';

interface HeadcountStatsProps {
    headcount: number | string;
    onLeaveToday: number | string;
    newJoiners: number | string;
    avgAttendance: number | string;
    navigate: any;
}

export default function HeadcountStats({ headcount, onLeaveToday, newJoiners, avgAttendance, navigate }: HeadcountStatsProps) {
    const stats = [
        { 
            label: 'TOTAL EMPLOYEES', 
            value: headcount, 
            icon: Users, 
            subtext: `+${newJoiners} this month`,
            isPositive: true,
            path: '/employee' 
        },
        { 
            label: 'ON LEAVE TODAY', 
            value: onLeaveToday, 
            icon: Calendar, 
            subtext: `of ${headcount} active`,
            isPositive: false,
            path: '/leave-today' 
        },
        { 
            label: 'NEW JOINERS', 
            value: newJoiners, 
            icon: User, 
            subtext: 'this month',
            isPositive: false,
            path: '/new-joiners' 
        },
        { 
            label: 'AVG ATTENDANCE', 
            value: `${avgAttendance}%`, 
            icon: Clock, 
            subtext: Number(avgAttendance) >= 80 ? 'Good attendance' : 'Needs attention',
            isPositive: Number(avgAttendance) >= 80,
            path: '/reports' 
        },
    ];

    return (
        <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 divide-[#E2E6ED] dark:divide-gray-800">
            {stats.map((stat, index) => (
                <div 
                    key={index} 
                    onClick={() => navigate(stat.path)}
                    className={`p-5 flex flex-col justify-between h-[130px] hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all cursor-pointer group ${
                        index < stats.length - 1 ? 'border-b sm:border-b-0 sm:border-r border-[#E2E6ED] dark:border-gray-800' : ''
                    }`}
                >
                    <div className="flex justify-between items-start">
                        <span className="kpi-label text-[11px] font-semibold text-[#9AA3B1] uppercase tracking-[.06em]">
                            {stat.label}
                        </span>
                        <div className="w-7 h-7 rounded-[6px] bg-[#EEF1F5] dark:bg-gray-800 text-[#5B6472] dark:text-gray-300 flex items-center justify-center transition-colors group-hover:text-[#2C4FD6]">
                            <stat.icon size={15} />
                        </div>
                    </div>

                    <div>
                        <div className="kpi-num text-[26px] sm:text-[28px] font-bold text-[#12151C] dark:text-white font-mono tracking-tight leading-none mb-[6px]">
                            {stat.value}
                        </div>

                        <div className="flex items-center gap-1 text-xs">
                            {stat.isPositive ? (
                                <div className="inline-flex items-center gap-1 text-[#1F8A5A] font-medium text-[12px]">
                                    <TrendingUp size={12} />
                                    {stat.subtext}
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-1 text-[#9AA3B1] text-[12px]">
                                    {stat.subtext}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
