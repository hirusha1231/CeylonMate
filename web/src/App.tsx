import { BrowserRouter, Route, Routes, Navigate, useLocation } from 'react-router';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { CurrencyProvider } from './context/CurrencyContext';
import { ToastProvider } from './context/ToastContext';

import { PublicLayout } from './components/PublicLayout';
import { HomePage } from './pages/HomePage';
import { BespokePlannerPage } from './pages/BespokePlannerPage';
import { AboutPage } from './pages/AboutPage';
import { FleetPage } from './pages/FleetPage';
import { MyBookingsPage } from './pages/traveler/MyBookingsPage';
import { ConciergeApprovalPage } from './pages/concierge/ConciergeApprovalPage';
import { SignatureJourneysPage } from './pages/SignatureJourneysPage';
import { CuratedJourneyBookingPage } from './pages/traveler/CuratedJourneyBookingPage';
import { PaymentGatewayPage } from './pages/traveler/PaymentGatewayPage';
import { GuidePortalPage } from './pages/guide/GuidePortalPage';
import { DestinationsSafetyPage } from './pages/destinations/DestinationsSafetyPage';
import { CapacityDispatchPage } from './pages/capacity/CapacityDispatchPage';

import { AdminLayout } from './components/layout/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { AgentSignatureJourneysPage } from './pages/agent/AgentSignatureJourneysPage';

import { ScrollToTop } from './components/common/ScrollToTop';
import { RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './components/AppLayout';
import { StaffPage } from './pages/StaffPage';
import { isStaffUserRole, getRoleRedirectPath } from './auth/types';

// Guard for Public Consumer Pages: Staff members trying to view tourist pages are redirected to their staff console
function PublicRouteGuard() {
  const { user, status } = useAuth();

  if (status === 'checking') return null;

  if (user && isStaffUserRole(user.role)) {
    return <Navigate to={getRoleRedirectPath(user.role)} replace />;
  }

  return <PublicLayout />;
}

function AnimatedAppRoutes() {
  const location = useLocation();

  return (
    <Routes location={location} key={location.pathname}>
      {/* Public Consumer Platform Routes (Guarded: Staff are auto-redirected to staff consoles) */}
      <Route element={<PublicRouteGuard />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/destinations" element={<SignatureJourneysPage />} />
        <Route path="/signature-journeys" element={<SignatureJourneysPage />} />
        <Route path="/book-journey/:packageId" element={<CuratedJourneyBookingPage />} />
        <Route path="/payment-gateway/:bookingId" element={<PaymentGatewayPage />} />
        <Route path="/checkout/:bookingId" element={<PaymentGatewayPage />} />
        <Route path="/plan-my-trip" element={<BespokePlannerPage />} />
        <Route path="/fleet-and-guides" element={<FleetPage />} />
        <Route path="/fleet" element={<Navigate to="/fleet-and-guides" replace />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/agent-showcase" element={<Navigate to="/plan-my-trip" replace />} />
        <Route path="/operations/destinations-safety" element={<DestinationsSafetyPage />} />
        <Route path="/operations/capacity-dispatch" element={<CapacityDispatchPage />} />
        <Route path="/operations/concierge-approval" element={<ConciergeApprovalPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/guide/schedule" element={<Navigate to="/fleet-and-guides" replace />} />
      </Route>

      {/* Direct Route Aliases */}
      <Route path="/capacity" element={<Navigate to="/staff/capacity" replace />} />

      {/* Local Guide Dedicated Ecosystem Route (Protected for Local Guides & Admin) */}
      <Route element={<RequireAuth roles={['LOCAL_GUIDE', 'ADMIN']} />}>
        <Route element={<PublicLayout />}>
          <Route path="/guide-portal" element={<GuidePortalPage />} />
        </Route>
      </Route>

      {/* Account & Security Settings (Universal for ALL Roles: Traveler, Staff, Admin, Guide, Agent) */}
      <Route element={<RequireAuth roles={['TRAVELER', 'CAPACITY_OFFICER', 'TRAVEL_AGENT', 'ADMIN', 'LOCAL_GUIDE']} />}>
        <Route element={<AppLayout />}>
          <Route path="/account" element={<MyBookingsPage />} />
          <Route path="/profile" element={<Navigate to="/account" replace />} />
        </Route>
      </Route>

      {/* Concierge Agent Portal Route (Protected for Travel Agents & Admin) */}
      <Route element={<RequireAuth roles={['TRAVEL_AGENT', 'ADMIN']} />}>
        <Route element={<PublicLayout />}>
          <Route path="/agent-portal" element={<ConciergeApprovalPage />} />
        </Route>
      </Route>

      {/* Admin Operations Module Routes */}
      <Route element={<RequireAuth roles={['ADMIN']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/admin/destinations" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/audit-logs" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>

      {/* Staff Operations Routes */}
      <Route element={<RequireAuth roles={['CAPACITY_OFFICER', 'TRAVEL_AGENT', 'ADMIN']} />}>
        <Route path="/staff" element={<AppLayout />}>
          <Route index element={<StaffPage kind="overview" />} />
          <Route element={<RequireAuth roles={['CAPACITY_OFFICER', 'ADMIN']} />}>
            <Route path="capacity" element={<StaffPage kind="capacity" />} />
          </Route>
          <Route element={<RequireAuth roles={['TRAVEL_AGENT', 'ADMIN']} />}>
            <Route path="agents" element={<StaffPage kind="agents" />} />
            <Route path="trips" element={<Navigate to="/agent-portal" replace />} />
            <Route path="trips/:id" element={<Navigate to="/agent-portal" replace />} />
            <Route path="signature-journeys" element={<AgentSignatureJourneysPage />} />
          </Route>
          <Route element={<RequireAuth roles={['ADMIN']} />}>
            <Route path="admin" element={<StaffPage kind="admin" />} />
          </Route>
        </Route>
      </Route>

      {/* Unified Login Redirection */}
      <Route path="/login" element={<Navigate to="/" replace state={{ openAuth: true }} />} />

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
