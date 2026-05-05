import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
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
import MastersLayout from './pages/masters/MastersLayout';
import OrgMasters from './pages/masters/OrgMasters';
import StatutoryMasters from './pages/masters/StatutoryMasters';
import AttendanceMasters from './pages/masters/AttendanceMasters';
import AccessMasters from './pages/masters/AccessMasters';
import EmployeeAttendanceList from './pages/EmployeeAttendanceList';
import EmployeeAttendanceView from './pages/EmployeeAttendanceView';


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
          <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignUp />} />
          <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />

          {/* Dashboard Route */}
          <Route path="/dashboard" element={
            isAuthenticated ? (
              <Layout>
                <DashboardHome />
              </Layout>
            ) : (
              <Navigate to="/signin" replace />
            )
          } />

          {/* Employee Routes */}
          <Route path="/employee" element={
            isAuthenticated ? (
              <Layout>
                <EmployeeList />
              </Layout>
            ) : (
              <Navigate to="/signin" replace />
            )
          } />

          <Route path="/employee/add" element={
            isAuthenticated ? (
              <Layout>
                <AddEmployee />
              </Layout>
            ) : (
              <Navigate to="/signin" replace />
            )
          } />

          <Route path="/employee/:id" element={
            isAuthenticated ? (
              <Layout>
                <EmployeeProfile />
              </Layout>
            ) : (
              <Navigate to="/signin" replace />
            )
          } />





          {/* Attendance Route */}
          <Route path="/attendance" element={
            isAuthenticated ? (
              <Layout>
                <Attendance />
              </Layout>
            ) : (
              <Navigate to="/signin" replace />
            )
          } />

          {/* Employee Attendance List (Admin Only) */}
          <Route path="/employee-attendance" element={
            isAuthenticated ? (
              <Layout>
                <EmployeeAttendanceList />
              </Layout>
            ) : (
              <Navigate to="/signin" replace />
            )
          } />

          {/* Employee Attendance View */}
          <Route path="/employee-attendance/:id" element={
            isAuthenticated ? (
              <Layout>
                <EmployeeAttendanceView />
              </Layout>
            ) : (
              <Navigate to="/signin" replace />
            )
          } />



          {/* Leave Route */}
          <Route path="/leave" element={
            isAuthenticated ? (
              <Layout>
                <Leave />
              </Layout>
            ) : (
              <Navigate to="/signin" replace />
            )
          } />

          {/* Profile Route */}
          <Route path="/profile" element={
            isAuthenticated ? (
              <Layout>
                <EmployeeProfile />
              </Layout>
            ) : (
              <Navigate to="/signin" replace />
            )
          } />



          {/* Team Route */}
          <Route path="/team" element={
            isAuthenticated ? (
              <Layout>
                <Team />
              </Layout>
            ) : (
              <Navigate to="/signin" replace />
            )
          } />

          {/* Reports Route */}
          <Route path="/reports" element={
            isAuthenticated ? (
              <Layout>
                <Reports />
              </Layout>
            ) : (
              <Navigate to="/signin" replace />
            )
          } />

          {/* Leave Today Route */}
          <Route path="/leave-today" element={
            isAuthenticated ? (
              <Layout>
                <LeaveToday />
              </Layout>
            ) : (
              <Navigate to="/signin" replace />
            )
          } />

          {/* Masters Route */}
          <Route path="/masters" element={
            isAuthenticated ? (
              <Layout>
                <MastersLayout />
              </Layout>
            ) : (
              <Navigate to="/signin" replace />
            )
          }>
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
