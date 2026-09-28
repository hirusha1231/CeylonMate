import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';
import { getRoleRedirectPath } from './types';

export function RequireAuth({ roles }: { roles?: string[] }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'checking') return null;

  if (!user) {
    return <Navigate to="/" replace state={{ openAuth: true, from: location.pathname }} />;
  }

  if (roles && !roles.map((r) => r.toUpperCase()).includes(user.role?.toUpperCase())) {
    return <Navigate to={getRoleRedirectPath(user.role)} replace />;
  }

  return <Outlet />;
}
