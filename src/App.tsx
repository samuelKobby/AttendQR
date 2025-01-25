import { AuthProvider } from './contexts/auth-context';
import { Route, Routes, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/sidebar';
import { RoleSelector } from './components/auth/role-selector';
import { LoginForm } from './components/auth/login-form';
import { SignupForm } from './components/auth/signup-form';
import { AuthCallback } from './components/auth/auth-callback';
import { AdminDashboard } from './components/dashboard/admin/admin-dashboard';
import { LecturerDashboard } from './components/dashboard/lecturer/lecturer-dashboard';
import { StudentDashboard } from './components/dashboard/student/student-dashboard';
import { useAuth } from './contexts/auth-context';
import { ManageLecturers } from './components/dashboard/admin/manage-lecturers';
import { ManageStudents } from './components/dashboard/admin/manage-students';
import { Reports } from './components/dashboard/admin/reports';
import { Settings } from './components/dashboard/admin/settings';
import { Notifications } from './components/dashboard/admin/notifications';
import { MyClasses } from './components/dashboard/lecturer/my-classes';
import { TakeAttendance } from './components/dashboard/lecturer/take-attendance';
import { Reports as LecturerReports } from './components/dashboard/lecturer/reports';
import { ErrorBoundary } from './components/error-boundary';
import { StudentAttendance } from './components/dashboard/student/student-attendance';
import { AttendanceHistory } from './components/dashboard/student/attendance-history';
import { StudentNotifications } from './components/dashboard/student/student-notifications';
import { Toaster } from './components/ui/toaster';

function AppContent() {
  const { authState } = useAuth();
  const { isAuthenticated, user } = authState;

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<RoleSelector />} />
        <Route path="/login/:role" element={<LoginForm />} />
        <Route path="/signup/:role" element={<SignupForm />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  if (user?.role === 'admin') {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar role="admin" />
        <main className="flex-1 overflow-y-auto p-8">
            <Routes>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/lecturers" element={<ManageLecturers />} />
              <Route path="/admin/students" element={<ManageStudents />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route path="/admin/notifications" element={<Notifications />} />
              <Route path="*" element={<Navigate to="/admin" />} />
            </Routes>
        </main>
      </div>
    );
  }

  if (user?.role === 'lecturer') {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar role="lecturer" />
        <main className="flex-1 overflow-y-auto p-8">
            <Routes>
              <Route path="/lecturer" element={<LecturerDashboard />} />
              <Route path="/lecturer/classes" element={<MyClasses />} />
              <Route path="/lecturer/attendance" element={<TakeAttendance />} />
              <Route path="/lecturer/reports" element={<LecturerReports />} />
              <Route path="/" element={<Navigate to="/lecturer" />} />
              <Route path="*" element={<Navigate to="/lecturer" />} />
            </Routes>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar role="student" />
      <main className="flex-1 overflow-y-auto">
        <div className="pt-16 lg:pt-8 px-4 lg:px-8 pb-8">
          <Routes>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/attendance" element={<StudentAttendance />} />
            <Route path="/student/history" element={<AttendanceHistory />} />
            <Route path="/student/notifications" element={<StudentNotifications />} />
            <Route path="*" element={<Navigate to="/student" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;