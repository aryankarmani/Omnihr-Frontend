import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Eager load core entry points so login screen renders instantly
import SignIn from './pages/SignIn';
import ForgotPassword from './pages/ForgotPassword';

// Lazy-loaded application pages
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const EmployeeList = lazy(() => import('./pages/EmployeeList'));
const AddEmployee = lazy(() => import('./pages/AddEmployee'));
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Leave = lazy(() => import('./pages/Leave'));
const Team = lazy(() => import('./pages/Team'));
const Reports = lazy(() => import('./pages/Reports'));
const LeaveToday = lazy(() => import('./pages/LeaveToday'));
const NewJoiners = lazy(() => import('./pages/NewJoiners'));
const LogFile = lazy(() => import('./pages/LogFile'));
const EmployeeAttendanceView = lazy(() => import('./pages/EmployeeAttendanceView'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Regularizations = lazy(() => import('./pages/Regularizations'));
const ChatHub = lazy(() => import('./pages/chat/ChatHub'));
import { CallProvider } from './context/CallContext';

// Masters Pages
const MastersLayout = lazy(() => import('./pages/masters/MastersLayout'));
const OrgMasters = lazy(() => import('./pages/masters/OrgMasters'));
const StatutoryMasters = lazy(() => import('./pages/masters/StatutoryMasters'));
const AttendanceMasters = lazy(() => import('./pages/masters/AttendanceMasters'));
const AccessMasters = lazy(() => import('./pages/masters/AccessMasters'));
const CustomFieldsMasters = lazy(() => import('./pages/masters/CustomFieldsMasters'));

// Super Admin Pages
import { SuperAdminAuthProvider } from './context/SuperAdminAuthContext';
import { SuperAdminProtectedRoute } from './components/superadmin/SuperAdminProtectedRoute';
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));
const Companies = lazy(() => import('./pages/superadmin/Companies'));
const CompanyDetails = lazy(() => import('./pages/superadmin/CompanyDetails'));
const Subscriptions = lazy(() => import('./pages/superadmin/Subscriptions'));
const Payments = lazy(() => import('./pages/superadmin/Payments'));
const Plans = lazy(() => import('./pages/superadmin/Plans'));
const SuperAdminNotifications = lazy(() => import('./pages/superadmin/Notifications'));
const SuperAdminSettings = lazy(() => import('./pages/superadmin/SuperAdminSettings'));
const DemoRequests = lazy(() => import('./pages/superadmin/DemoRequests'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh] w-full">
    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
  </div>
);



function ProtectedRoute({ children, module }: { children: React.ReactNode; module?: string }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/signin" replace />;

  if (module) {
    const isHrAdmin = user?.role === 'HR_ADMIN' || (user?.role as string) === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    const adminDefaultModules = ['DASHBOARD', 'ATTENDANCE', 'EMPLOYEE', 'EMPLOYEE_ATTENDANCE', 'TEAM', 'LEAVE', 'REPORTS', 'MASTERS', 'LOG', 'MY_PROFILE', 'CHAT'];
    const employeeDefaultModules = ['DASHBOARD', 'ATTENDANCE', 'LEAVE', 'MY_PROFILE', 'CHAT'];
    const hasCustomModules = Array.isArray(user?.accessibleModules) && user.accessibleModules.length > 0;
    const userModules = hasCustomModules
      ? user!.accessibleModules!
      : (isHrAdmin ? adminDefaultModules : employeeDefaultModules);

    if (!userModules.includes(module) && !isHrAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Layout>{children}</Layout>;
}

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <>

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
            <CallProvider>
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/signin" replace />} />
                  <Route
                    path="/signin"
                    element={
                      isAuthenticated ? (
                        user?.role === 'SUPER_ADMIN' ? (
                          <Navigate to="/superadmin/dashboard" replace />
                        ) : (
                          <Navigate to="/dashboard" replace />
                        )
                      ) : (
                        <SignIn />
                      )
                    }
                  />
                  <Route path="/login" element={<Navigate to="/signin" replace />} />
                  <Route path="/signup" element={<Navigate to="/signin" replace />} />
                  <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />

                  {/* Super Admin Routes (Unified Login, redirects old login to /signin) */}
                  <Route path="/superadmin/login" element={<Navigate to="/signin" replace />} />
                  <Route path="/superadmin/dashboard" element={<SuperAdminProtectedRoute><SuperAdminDashboard /></SuperAdminProtectedRoute>} />
                  <Route path="/superadmin/companies" element={<SuperAdminProtectedRoute><Companies /></SuperAdminProtectedRoute>} />
                  <Route path="/superadmin/companies/:id" element={<SuperAdminProtectedRoute><CompanyDetails /></SuperAdminProtectedRoute>} />
                  <Route path="/superadmin/subscriptions" element={<SuperAdminProtectedRoute><Subscriptions /></SuperAdminProtectedRoute>} />
                  <Route path="/superadmin/payments" element={<SuperAdminProtectedRoute><Payments /></SuperAdminProtectedRoute>} />
                  <Route path="/superadmin/plans" element={<SuperAdminProtectedRoute><Plans /></SuperAdminProtectedRoute>} />
                  <Route path="/superadmin/notifications" element={<SuperAdminProtectedRoute><SuperAdminNotifications /></SuperAdminProtectedRoute>} />
                  <Route path="/superadmin/demo-requests" element={<SuperAdminProtectedRoute><DemoRequests /></SuperAdminProtectedRoute>} />
                  <Route path="/superadmin/settings" element={<SuperAdminProtectedRoute><SuperAdminSettings /></SuperAdminProtectedRoute>} />
                  <Route path="/superadmin" element={<Navigate to="/superadmin/dashboard" replace />} />

                  {/* Protected Routes */}
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
                  <Route path="/employee" element={<ProtectedRoute><EmployeeList /></ProtectedRoute>} />
                  <Route path="/employee/add" element={<ProtectedRoute><AddEmployee /></ProtectedRoute>} />
                  <Route path="/employee/:id" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
                  <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
                  <Route path="/employee-attendance/:id" element={<ProtectedRoute><EmployeeAttendanceView /></ProtectedRoute>} />
                  <Route path="/regularizations" element={<ProtectedRoute><Regularizations /></ProtectedRoute>} />
                  <Route path="/leave" element={<ProtectedRoute><Leave /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><EmployeeProfile /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
                  <Route path="/chat" element={<ProtectedRoute module="CHAT"><ChatHub /></ProtectedRoute>} />
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
              </Suspense>
            </BrowserRouter>
          </CallProvider>
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
