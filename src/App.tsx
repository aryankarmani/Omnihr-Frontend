import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import SignIn from './pages/SignIn';
import ForgotPassword from './pages/ForgotPassword';
import Layout from './components/Layout';
import DashboardHome from './pages/DashboardHome';
import EmployeeList from './pages/EmployeeList';
import AddEmployee from './pages/AddEmployee';
import EmployeeProfile from './pages/EmployeeProfile';
import Attendance from './pages/Attendance';
import Leave from './pages/Leave';
import Team from './pages/Team';
import Reports from './pages/Reports';
import LeaveToday from './pages/LeaveToday';
import NewJoiners from './pages/NewJoiners';
import MastersLayout from './pages/masters/MastersLayout';
import OrgMasters from './pages/masters/OrgMasters';
import StatutoryMasters from './pages/masters/StatutoryMasters';
import AttendanceMasters from './pages/masters/AttendanceMasters';
import AccessMasters from './pages/masters/AccessMasters';
import EmployeeAttendanceList from './pages/EmployeeAttendanceList';
import EmployeeAttendanceView from './pages/EmployeeAttendanceView';
import Notifications from './pages/Notifications';
import Regularizations from './pages/Regularizations';


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/signin" replace />;
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-brand-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/signin" replace />} />
          <Route path="/signin" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignIn />} />
          <Route path="/signup" element={<Navigate to="/signin" replace />} />
          <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
          <Route path="/employee" element={<ProtectedRoute><EmployeeList /></ProtectedRoute>} />
          <Route path="/employee/add" element={<ProtectedRoute><AddEmployee /></ProtectedRoute>} />
          <Route path="/employee/:id" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          <Route path="/employee-attendance" element={<ProtectedRoute><EmployeeAttendanceList /></ProtectedRoute>} />
          <Route path="/employee-attendance/:id" element={<ProtectedRoute><EmployeeAttendanceView /></ProtectedRoute>} />
          <Route path="/regularizations" element={<ProtectedRoute><Regularizations /></ProtectedRoute>} />
          <Route path="/leave" element={<ProtectedRoute><Leave /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/leave-today" element={<ProtectedRoute><LeaveToday /></ProtectedRoute>} />
          <Route path="/new-joiners" element={<ProtectedRoute><NewJoiners /></ProtectedRoute>} />

          {/* Masters Route */}
          <Route path="/masters" element={<ProtectedRoute><MastersLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="org" replace />} />
            <Route path="org" element={<OrgMasters />} />
            <Route path="statutory" element={<StatutoryMasters />} />
            <Route path="attendance" element={<AttendanceMasters />} />
            <Route path="access" element={<AccessMasters />} />
          </Route>

        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        className: 'dark:bg-brand-900 dark:text-white',
        style: {
          background: '#333',
          color: '#fff',
        },
        success: {
          style: {
            background: 'green',
          },
        },
        error: {
          style: {
            background: 'red',
          },
        },
      }} />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
