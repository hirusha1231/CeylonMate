import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthProvider';
import type { StaffRole } from './types';

export function RequireAuth({ roles }: { roles?: StaffRole[] }) {
  const { user, status, logout } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <main className="state"><p>Checking session…</p></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role as StaffRole)) {
    return <main className="state" role="alert">
      <h1>Access denied</h1>
      <p>Your role does not have access to this page.</p>
      <button type="button" onClick={logout}>Log out</button>
    </main>;
  }
  return <Outlet />;
}
