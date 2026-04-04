import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AUTH_TOKEN_KEY } from '../../config/constants';
import { getCurrentUserRole } from '../../lib/auth';
import type { UserRole } from '../../routes/types';

interface ProtectedRouteProps {
  /** If specified, only users with one of these roles can access the child routes */
  allowedRoles?: UserRole[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified, enforce role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = getCurrentUserRole();
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Redirect unauthorized users to dashboard instead of showing admin UI
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
