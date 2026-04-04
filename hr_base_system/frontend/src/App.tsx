import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppShell from './app/layout/AppShell';
import AppErrorBoundary from './app/layout/AppErrorBoundary';
import PageLoader from './components/common/PageLoader';
import NotFoundPage from './components/common/NotFoundPage';
import ServerErrorPage from './components/common/ServerErrorPage';

const Login = lazy(() => import('./pages/Auth/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard/DashboardPage'));
const EmployeeList = lazy(() => import('./pages/Employees/EmployeesPage'));
const EmployeeDetail = lazy(() => import('./pages/Employees/EmployeeDetailPage'));
const LeavePage = lazy(() => import('./pages/Leave/LeavePage'));
const AttendancePage = lazy(() => import('./pages/Attendance/AttendancePage'));
const Payroll = lazy(() => import('./pages/Payroll/PayrollPage'));
const PayrollDashboard = lazy(() => import('./pages/Payroll/PayrollDashboardPage'));
const DocumentsPage = lazy(() => import('./pages/Documents/DocumentsPage'));
const LeaveTypeManagement = lazy(() => import('./pages/Admin/LeaveTypeManagementPage'));
const CompanySettingsPage = lazy(() => import('./pages/Admin/CompanySettingsPage'));
const UserManagementPage = lazy(() => import('./pages/Admin/UserManagementPage'));
const AuditLogPage = lazy(() => import('./pages/Admin/AuditLogPage'));
const ExpiryDocumentsPage = lazy(() => import('./pages/Documents/ExpiryDocumentsPage'));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'));
const RosterPage = lazy(() => import('./pages/Roster/RosterPage'));
const SecurityPage = lazy(() => import('./pages/Auth/SecurityPage'));
const WebAuthnTestPage = lazy(() => import('./components/auth/WebAuthnTestPage'));

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/error" element={<ServerErrorPage />} />
          {/* All authenticated routes */}
          <Route element={<ProtectedRoute />}>
            <Route
              element={(
                <AppErrorBoundary>
                  <AppShell />
                </AppErrorBoundary>
              )}
            >
              <Route index element={<Dashboard />} />
              <Route path="employees" element={<EmployeeList />} />
              <Route path="employees/:id" element={<EmployeeDetail />} />
              <Route path="leave" element={<LeavePage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="documents/expiry" element={<ExpiryDocumentsPage />} />
              <Route path="roster" element={<RosterPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="security" element={<SecurityPage />} />
              <Route path="webauthn-test" element={<WebAuthnTestPage />} />
              {/* Payroll dashboard accessible to all roles — content is role-scoped */}
              <Route path="payroll/dashboard" element={<PayrollDashboard />} />
            </Route>
          </Route>
          {/* Admin & payroll routes — restricted to OWNER and ADMIN roles */}
          <Route element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN']} />}>
            <Route
              element={(
                <AppErrorBoundary>
                  <AppShell />
                </AppErrorBoundary>
              )}
            >
              <Route path="payroll" element={<Payroll />} />
              <Route path="admin/company" element={<CompanySettingsPage />} />
              <Route path="admin/users" element={<UserManagementPage />} />
              <Route path="admin/leave-types" element={<LeaveTypeManagement />} />
              <Route path="admin" element={<Navigate to="/admin/company" replace />} />
            </Route>
          </Route>
          {/* OWNER-only routes */}
          <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
            <Route
              element={(
                <AppErrorBoundary>
                  <AppShell />
                </AppErrorBoundary>
              )}
            >
              <Route path="admin/audit-logs" element={<AuditLogPage />} />
            </Route>
          </Route>
          {/* 404 Catch-all route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
