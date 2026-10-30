import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import EmployeeDashboard from '../components/dashboard/EmployeeDashboard';
import { DashboardSkeleton } from '../components/common/SkeletonLoaders';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

export default function DashboardHome() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Admin Specific State
    const [stats, setStats] = useState({
        headcount: 0,
        onLeaveToday: 0,
        newJoiners: 0,
        avgAttendance: 0
    });
    const [attendanceData, setAttendanceData] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
    const [pendingRegularizations, setPendingRegularizations] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);

    const fetchDashboardData = useCallback(async () => {
        // Only fetch admin data if role is HR_ADMIN
        if (user?.role !== 'HR_ADMIN') {
            setLoading(false);
            return;
        }

        try {
            const [statsRes, attRes, authRes, empRes, regRes] = await Promise.all([
                api.get('/dashboard/stats'),
                api.get('/dashboard/live-attendance'),
                api.get('/dashboard/pending-approvals'),
                api.get('/dashboard/employee-overview'),
                api.get('/attendance/regularize/pending').catch(() => ({ data: [] }))
            ]);

            setStats(statsRes.data);
            setAttendanceData(attRes.data);
            setPendingApprovals(authRes.data);
            setEmployees(empRes.data);
            setPendingRegularizations(Array.isArray(regRes.data) ? regRes.data : []);
        } catch (error) {
            console.error("Failed to fetch admin dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.role]);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user, fetchDashboardData]);

    // Live real-time updates for Admin Dashboard
    useRealtimeSync(
        ['leave_updated', 'regularization_updated', 'attendance_updated', 'onboarding_updated', 'employee_roster_updated'],
        fetchDashboardData,
        user?.role === 'HR_ADMIN'
    );

    if (loading) {
        return <DashboardSkeleton />;
    }

    // Role-based rendering
    if (user?.role === 'EMPLOYEE') {
        return <EmployeeDashboard user={user} />;
    }

    // Default to Admin Dashboard for HR_ADMIN
    return (
        <AdminDashboard
            navigate={navigate}
            stats={stats}
            attendanceData={attendanceData}
            pendingApprovals={pendingApprovals}
            pendingRegularizations={pendingRegularizations}
            employees={employees}
        />
    );
}
