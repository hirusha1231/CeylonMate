import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { StaffPage } from './pages/StaffPage';
import { TripRequestsPage } from './features/trips/TripRequestsPage';
import { TripDetailsPage } from './features/trips/TripDetailsPage';

export function App() {
  return <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth roles={['CAPACITY_OFFICER', 'TRAVEL_AGENT', 'ADMIN']} />}>
          <Route path="/staff" element={<AppLayout />}>
            <Route index element={<StaffPage kind="overview" />} />
            <Route element={<RequireAuth roles={['CAPACITY_OFFICER', 'ADMIN']} />}>
              <Route path="capacity" element={<StaffPage kind="capacity" />} />
            </Route>
            <Route element={<RequireAuth roles={['TRAVEL_AGENT', 'ADMIN']} />}>
              <Route path="agents" element={<StaffPage kind="agents" />} />
              <Route path="trips" element={<TripRequestsPage />} />
              <Route path="trips/:id" element={<TripDetailsPage />} />
            </Route>
            <Route element={<RequireAuth roles={['ADMIN']} />}>
              <Route path="admin" element={<StaffPage kind="admin" />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/staff" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>;
}
