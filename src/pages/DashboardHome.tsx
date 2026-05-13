import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import EmployeeDashboard from '../components/dashboard/EmployeeDashboard';

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
    const [employees, setEmployees] = useState<any[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            // Only fetch admin data if role is HR_ADMIN
            if (user?.role !== 'HR_ADMIN') {
                setLoading(false);
                return;
            }

            try {
                const [statsRes, attRes, authRes, empRes] = await Promise.all([
                    api.get('/dashboard/stats'),
                    api.get('/dashboard/live-attendance'),
                    api.get('/dashboard/pending-approvals'),
                    api.get('/dashboard/employee-overview')
                ]);

                setStats(statsRes.data);
                setAttendanceData(attRes.data);
                setPendingApprovals(authRes.data);
                setEmployees(empRes.data);
            } catch (error) {
                console.error("Failed to fetch admin dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-brand-500" size={48} />
            </div>
        );
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
            employees={employees}
        />
    );
}
