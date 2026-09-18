export function SkeletonBox({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
    return (
        <div className={`skeleton-shimmer rounded-[6px] ${className}`} style={style} />
    );
}

// 1. Dashboard Skeleton (Employee & Admin)
export function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-fade-in w-full">
            {/* Top Quick Stats Strip */}
            <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E2E6ED] dark:divide-gray-800">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-5 sm:p-6 flex flex-col justify-between h-[150px]">
                        <div className="flex justify-between items-center mb-3">
                            <SkeletonBox className="h-3 w-24" />
                            <SkeletonBox className="w-7 h-7 rounded-[6px]" />
                        </div>
                        <div>
                            <SkeletonBox className="h-3 w-20 mb-2" />
                            <SkeletonBox className="h-7 w-36 mb-2" />
                            <SkeletonBox className="h-2.5 w-28" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Middle Section: Chart (2 cols) & Side card (1 col) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-[#12151C] rounded-[6px] p-6 border border-[#E2E6ED] dark:border-gray-800 space-y-4">
                    <div className="flex justify-between items-center mb-6">
                        <div className="space-y-2">
                            <SkeletonBox className="h-4 w-40" />
                            <SkeletonBox className="h-3 w-60" />
                        </div>
                        <SkeletonBox className="h-7 w-28 rounded-[4px]" />
                    </div>
                    {/* Bar chart skeleton */}
                    <div className="h-[210px] flex items-end justify-between gap-3 pt-6 px-2">
                        {[40, 75, 60, 90, 50, 80, 65].map((height, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                <SkeletonBox className="w-full rounded-t-[4px]" style={{ height: `${height}%` }} />
                                <SkeletonBox className="h-2.5 w-8" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-[#12151C] rounded-[6px] p-6 border border-[#E2E6ED] dark:border-gray-800 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                        <SkeletonBox className="h-4 w-32" />
                        <SkeletonBox className="h-3 w-48" />
                    </div>
                    <div className="space-y-3 my-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-3 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 flex items-center justify-between">
                                <div className="space-y-1.5">
                                    <SkeletonBox className="h-3.5 w-24" />
                                    <SkeletonBox className="h-2.5 w-16" />
                                </div>
                                <SkeletonBox className="h-5 w-14 rounded-full" />
                            </div>
                        ))}
                    </div>
                    <SkeletonBox className="h-9 w-full rounded-[6px]" />
                </div>
            </div>

            {/* Bottom Row / Table strip */}
            <div className="bg-white dark:bg-[#12151C] rounded-[6px] p-6 border border-[#E2E6ED] dark:border-gray-800 space-y-4">
                <div className="flex justify-between items-center">
                    <SkeletonBox className="h-4 w-36" />
                    <SkeletonBox className="h-7 w-20 rounded-[6px]" />
                </div>
                <div className="space-y-2.5 pt-2">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-[#E2E6ED]/60 dark:border-gray-800/60 last:border-0">
                            <div className="flex items-center gap-3">
                                <SkeletonBox className="w-8 h-8 rounded-full" />
                                <div className="space-y-1">
                                    <SkeletonBox className="h-3.5 w-32" />
                                    <SkeletonBox className="h-2.5 w-20" />
                                </div>
                            </div>
                            <SkeletonBox className="h-5 w-20 rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// 2. Table Skeleton (EmployeeList, Leave, Regularizations)
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
    return (
        <div className="space-y-5 animate-fade-in w-full">
            {/* Header / Actions Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1.5">
                    <SkeletonBox className="h-6 w-44" />
                    <SkeletonBox className="h-3 w-64" />
                </div>
                <div className="flex gap-2.5 self-stretch sm:self-auto">
                    <SkeletonBox className="h-9 w-24 rounded-[6px]" />
                    <SkeletonBox className="h-9 w-32 rounded-[6px]" />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-[#12151C] rounded-[6px] p-4 border border-[#E2E6ED] dark:border-gray-800 flex flex-wrap gap-3 items-center justify-between">
                <SkeletonBox className="h-9 w-72 rounded-[6px]" />
                <div className="flex gap-2">
                    <SkeletonBox className="h-9 w-28 rounded-[6px]" />
                    <SkeletonBox className="h-9 w-28 rounded-[6px]" />
                </div>
            </div>

            {/* Table Box */}
            <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden">
                {/* Table Header */}
                <div className="px-6 py-3.5 border-b border-[#E2E6ED] dark:border-gray-800 flex items-center justify-between gap-4 bg-[#F7F8FA] dark:bg-white/[0.02]">
                    <SkeletonBox className="h-3.5 w-32" />
                    <SkeletonBox className="h-3.5 w-24 hidden sm:block" />
                    <SkeletonBox className="h-3.5 w-24 hidden md:block" />
                    <SkeletonBox className="h-3.5 w-20" />
                    <SkeletonBox className="h-3.5 w-16" />
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-[#E2E6ED] dark:divide-gray-800">
                    {Array.from({ length: rows }).map((_, i) => (
                        <div key={i} className="px-6 py-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <SkeletonBox className="w-9 h-9 rounded-[6px] shrink-0" />
                                <div className="space-y-1.5 min-w-0">
                                    <SkeletonBox className="h-3.5 w-36" />
                                    <SkeletonBox className="h-2.5 w-24" />
                                </div>
                            </div>
                            <SkeletonBox className="h-3.5 w-28 hidden sm:block" />
                            <SkeletonBox className="h-3.5 w-24 hidden md:block" />
                            <SkeletonBox className="h-5 w-20 rounded-full" />
                            <SkeletonBox className="h-7 w-16 rounded-[6px]" />
                        </div>
                    ))}
                </div>

                {/* Pagination footer */}
                <div className="px-6 py-3.5 border-t border-[#E2E6ED] dark:border-gray-800 flex items-center justify-between bg-[#F7F8FA] dark:bg-white/[0.02]">
                    <SkeletonBox className="h-3 w-40" />
                    <div className="flex gap-1.5">
                        <SkeletonBox className="w-8 h-8 rounded-[5px]" />
                        <SkeletonBox className="w-8 h-8 rounded-[5px]" />
                        <SkeletonBox className="w-8 h-8 rounded-[5px]" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// 3. Profile Skeleton (EmployeeProfile)
export function ProfileSkeleton() {
    return (
        <div className="space-y-6 animate-fade-in w-full">
            {/* Header card with user avatar and details */}
            <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-5 w-full md:w-auto">
                    <SkeletonBox className="w-20 h-20 rounded-full shrink-0" />
                    <div className="space-y-2">
                        <SkeletonBox className="h-6 w-48" />
                        <SkeletonBox className="h-3.5 w-36" />
                        <div className="flex gap-2 pt-1">
                            <SkeletonBox className="h-5 w-20 rounded-full" />
                            <SkeletonBox className="h-5 w-24 rounded-full" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto justify-end">
                    <SkeletonBox className="h-10 w-28 rounded-[6px]" />
                    <SkeletonBox className="h-10 w-28 rounded-[6px]" />
                </div>
            </div>

            {/* Tab navigation strip */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonBox key={i} className="h-10 w-32 rounded-[6px] shrink-0" />
                ))}
            </div>

            {/* Form card with 2 columns */}
            <div className="bg-white dark:bg-[#12151C] rounded-[6px] p-6 border border-[#E2E6ED] dark:border-gray-800 space-y-6">
                <div className="flex justify-between items-center border-b border-[#E2E6ED] dark:border-gray-800 pb-4">
                    <div className="space-y-1.5">
                        <SkeletonBox className="h-5 w-40" />
                        <SkeletonBox className="h-3 w-64" />
                    </div>
                    <SkeletonBox className="h-8 w-24 rounded-[6px]" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="space-y-2">
                            <SkeletonBox className="h-3 w-24" />
                            <SkeletonBox className="h-10 w-full rounded-[6px]" />
                        </div>
                    ))}
                </div>

                <div className="pt-4 border-t border-[#E2E6ED] dark:border-gray-800 flex justify-end gap-3">
                    <SkeletonBox className="h-10 w-28 rounded-[6px]" />
                    <SkeletonBox className="h-10 w-36 rounded-[6px]" />
                </div>
            </div>
        </div>
    );
}

// 4. Attendance Skeleton (Attendance, EmployeeAttendanceView)
export function AttendanceSkeleton() {
    return (
        <div className="space-y-6 animate-fade-in w-full">
            {/* Top Stat Cards Strip */}
            <div className="bg-white dark:bg-[#12151C] rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 overflow-hidden grid grid-cols-2 lg:grid-cols-4 divide-[#E2E6ED] dark:divide-gray-800">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-5 flex flex-col justify-start h-[130px] border-r border-[#E2E6ED] dark:border-gray-800 last:border-r-0">
                        <SkeletonBox className="w-8 h-8 rounded-[6px] mb-4" />
                        <SkeletonBox className="h-7 w-16 mb-2" />
                        <SkeletonBox className="h-3 w-24" />
                    </div>
                ))}
            </div>

            {/* Monthly Calendar Skeleton */}
            <div className="bg-white dark:bg-[#12151C] rounded-[6px] p-6 border border-[#E2E6ED] dark:border-gray-800 space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <SkeletonBox className="w-5 h-5 rounded-[4px]" />
                        <SkeletonBox className="h-5 w-32" />
                    </div>
                    <div className="flex items-center gap-2">
                        <SkeletonBox className="w-8 h-8 rounded-[6px]" />
                        <SkeletonBox className="h-4 w-32" />
                        <SkeletonBox className="w-8 h-8 rounded-[6px]" />
                    </div>
                </div>

                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-2 text-center pb-2">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                        <div key={d} className="flex justify-center">
                            <SkeletonBox key={d} className="h-3 w-10" />
                        </div>
                    ))}
                </div>

                {/* Calendar grid tiles */}
                <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 35 }).map((_, idx) => (
                        <div key={idx} className="h-24 p-2 rounded-[6px] border border-[#E2E6ED] dark:border-gray-800 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <SkeletonBox className="w-4 h-4 rounded-full" />
                                <SkeletonBox className="w-10 h-3.5 rounded-full" />
                            </div>
                            <div className="space-y-1">
                                <SkeletonBox className="h-2.5 w-12" />
                                <SkeletonBox className="h-2.5 w-14" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
