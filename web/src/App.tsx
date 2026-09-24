import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { CurrencyProvider } from './context/CurrencyContext';
import { ToastProvider } from './context/ToastContext';

import { PublicLayout } from './components/PublicLayout';
import { HomePage } from './pages/HomePage';
import { BespokePlannerPage } from './pages/BespokePlannerPage';
import { AboutPage } from './pages/AboutPage';
import { DestinationsPage } from './pages/DestinationsPage';
import { FleetPage } from './pages/FleetPage';
import { MyBookingsPage } from './pages/traveler/MyBookingsPage';
import { ConciergeApprovalPage } from './pages/concierge/ConciergeApprovalPage';

import { AdminLayout } from './components/layout/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { DestinationsMasterPage } from './pages/admin/DestinationsMasterPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';

import { ScrollToTop } from './components/common/ScrollToTop';
import { RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { StaffPage } from './pages/StaffPage';
import { TripRequestsPage } from './features/trips/TripRequestsPage';
import { TripDetailsPage } from './features/trips/TripDetailsPage';
import { DestinationsManagementPage } from './features/destinations/DestinationsManagementPage';

function AnimatedAppRoutes() {
  const location = useLocation();

  return (
    <Routes location={location} key={location.pathname}>
      {/* Public Commercial Luxury Platform Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/destinations" element={<DestinationsPage />} />
        <Route path="/plan-my-trip" element={<BespokePlannerPage />} />
        <Route path="/fleet-and-guides" element={<FleetPage />} />
        <Route path="/fleet" element={<Navigate to="/fleet-and-guides" replace />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/agent-portal" element={<ConciergeApprovalPage />} />
      </Route>

      {/* Admin Operations Module Routes */}
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/admin/destinations" element={<DestinationsMasterPage />} />
        <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
      </Route>

      {/* Legacy / Direct Login Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Staff Operations Routes */}
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
            <Route path="destinations" element={<DestinationsManagementPage />} />
          </Route>
          <Route element={<RequireAuth roles={['ADMIN']} />}>
            <Route path="admin" element={<StaffPage kind="admin" />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all redirect to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <CurrencyProvider>
          <ToastProvider>
            <AnimatedAppRoutes />
          </ToastProvider>
        </CurrencyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
