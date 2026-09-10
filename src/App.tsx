import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import SplashScreen from './components/SplashScreen';
import LogFile from "./pages/LogFile";
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
import CustomFieldsMasters from './pages/masters/CustomFieldsMasters';

import EmployeeAttendanceView from './pages/EmployeeAttendanceView';
import Notifications from './pages/Notifications';
// import Regularizations from './pages/Regularizations';

// Super Admin Imports
import { SuperAdminAuthProvider } from './context/SuperAdminAuthContext';
import { SuperAdminProtectedRoute } from './components/superadmin/SuperAdminProtectedRoute';
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import Companies from './pages/superadmin/Companies';
import CompanyDetails from './pages/superadmin/CompanyDetails';
import Subscriptions from './pages/superadmin/Subscriptions';
import Payments from './pages/superadmin/Payments';
import Plans from './pages/superadmin/Plans';
import SuperAdminNotifications from './pages/superadmin/Notifications';
import SuperAdminSettings from './pages/superadmin/SuperAdminSettings';



function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/signin" replace />;
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen bg-black">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-medium">Loading session...</p>
          </div>
        </div>
      ) : (
        <ThemeProvider>
          <SuperAdminAuthProvider>
            <BrowserRouter>
              <Routes>
            <Route path="/" element={<Navigate to="/signin" replace />} />
            <Route path="/signin" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignIn />} />
            <Route path="/signup" element={<Navigate to="/signin" replace />} />
            <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />

            {/* Super Admin Routes (Isolated Platform Console) */}
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route path="/superadmin/dashboard" element={<SuperAdminProtectedRoute><SuperAdminDashboard /></SuperAdminProtectedRoute>} />
            <Route path="/superadmin/companies" element={<SuperAdminProtectedRoute><Companies /></SuperAdminProtectedRoute>} />
            <Route path="/superadmin/companies/:id" element={<SuperAdminProtectedRoute><CompanyDetails /></SuperAdminProtectedRoute>} />
            <Route path="/superadmin/subscriptions" element={<SuperAdminProtectedRoute><Subscriptions /></SuperAdminProtectedRoute>} />
            <Route path="/superadmin/payments" element={<SuperAdminProtectedRoute><Payments /></SuperAdminProtectedRoute>} />
            <Route path="/superadmin/plans" element={<SuperAdminProtectedRoute><Plans /></SuperAdminProtectedRoute>} />
            <Route path="/superadmin/notifications" element={<SuperAdminProtectedRoute><SuperAdminNotifications /></SuperAdminProtectedRoute>} />
            <Route path="/superadmin/settings" element={<SuperAdminProtectedRoute><SuperAdminSettings /></SuperAdminProtectedRoute>} />
            <Route path="/superadmin" element={<Navigate to="/superadmin/dashboard" replace />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
            <Route path="/employee" element={<ProtectedRoute><EmployeeList /></ProtectedRoute>} />
            <Route path="/employee/add" element={<ProtectedRoute><AddEmployee /></ProtectedRoute>} />
            <Route path="/employee/:id" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
            <Route path="/employee-attendance/:id" element={<ProtectedRoute><EmployeeAttendanceView /></ProtectedRoute>} />
            {/* <Route path="/regularizations" element={<ProtectedRoute><Regularizations /></ProtectedRoute>} /> */}
            <Route path="/leave" element={<ProtectedRoute><Leave /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/leave-today" element={<ProtectedRoute><LeaveToday /></ProtectedRoute>} />
            <Route path="/new-joiners" element={<ProtectedRoute><NewJoiners /></ProtectedRoute>} />
            <Route path="/log-file" element={<ProtectedRoute><LogFile /></ProtectedRoute>} />

            {/* Masters Route */}
            <Route path="/masters" element={<ProtectedRoute><MastersLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="org" replace />} />
              <Route path="org" element={<OrgMasters />} />
              <Route path="statutory" element={<StatutoryMasters />} />
              <Route path="attendance" element={<AttendanceMasters />} />
              <Route path="access" element={<AccessMasters />} />
              <Route path="custom-fields" element={<CustomFieldsMasters />} />
            </Route>

          </Routes>
        </BrowserRouter>
        </SuperAdminAuthProvider>
      <Toaster 
        position="top-right" 
        containerStyle={{ zIndex: 99999999 }}
        toastOptions={{
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
        }} 
      />
        </ThemeProvider>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
