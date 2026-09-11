import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface LiveAttendanceProps {
    data: { name: string; visitors: number }[];
}

export default function LiveAttendance({ data }: LiveAttendanceProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const timeSlots = [
        '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
        '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
        '21:00', '22:00', '23:00'
    ];

    const chartData = timeSlots.map(slot => {
        const found = data?.find(d => d.name === slot || d.name === slot.replace(/^0/, ''));
        return {
            name: slot,
            visitors: found ? found.visitors : 0
        };
    });

    const maxVal = Math.max(...chartData.map(d => d.visitors), 1);

    return (
        <div className="bg-white dark:bg-[#12151C] p-6 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 h-[300px] max-h-[300px] flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <span className="panel-title text-[15px] font-semibold text-[#12151C] dark:text-white block">Live Attendance</span>
                    <p className="text-[12.5px] text-[#9AA3B1] dark:text-gray-400 mt-0.5">Real-time check-ins today</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#E4F5EC] dark:bg-green-950/40 rounded-full">
                    <span className="w-1.5 h-1.5 bg-[#1F8A5A] rounded-full animate-pulse"></span>
                    <span className="text-[11px] font-bold text-[#1F8A5A] dark:text-green-400">Live</span>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 15, right: 5, left: 5, bottom: 0 }} barCategoryGap="10%">
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9AA3B1', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                            dy={5}
                        />
                        <YAxis domain={[0, 100]} hide />
                        <Tooltip
                            cursor={{ fill: 'rgba(238, 241, 245, 0.4)' }}
                            contentStyle={{
                                borderRadius: '6px',
                                border: '1px solid #E2E6ED',
                                backgroundColor: '#FFFFFF',
                                fontSize: '12px',
                                fontFamily: 'Instrument Sans, sans-serif',
                                color: '#12151C'
                            }}
                        />
                        <Bar dataKey="visitors" radius={[6, 6, 0, 0]} barSize={64}>
                            {chartData.map((entry, index) => {
                                const isPeak = entry.visitors >= maxVal * 0.7;
                                const isHovered = activeIndex === index;
                                return (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={isPeak || isHovered ? '#2C4FD6' : '#EEF1F5'}
                                        className="transition-all duration-200"
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onMouseLeave={() => setActiveIndex(null)}
                                    />
                                );
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

