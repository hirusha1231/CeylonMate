import { Navigate } from 'react-router';

export function LoginPage() {
  return <Navigate to="/" replace state={{ openAuth: true }} />;
}

