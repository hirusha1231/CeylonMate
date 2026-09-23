import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';

const links = [
  { to: '/staff', label: 'Overview', roles: ['CAPACITY_OFFICER', 'TRAVEL_AGENT', 'ADMIN'] },
  { to: '/staff/capacity', label: 'Capacity desk', roles: ['CAPACITY_OFFICER', 'ADMIN'] },
  { to: '/staff/agents', label: 'Agent desk', roles: ['TRAVEL_AGENT', 'ADMIN'] },
  { to: '/staff/trips', label: 'Trip requests', roles: ['TRAVEL_AGENT', 'ADMIN'] },
  { to: '/staff/destinations', label: 'Destinations', roles: ['TRAVEL_AGENT', 'ADMIN'] },
  { to: '/staff/admin', label: 'Administration', roles: ['ADMIN'] },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate('/login', { replace: true });
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand">CeylonMate <span>Staff</span></div>
      <div className="account">
        <span>{user?.email}</span>
        <button type="button" className="secondary" onClick={signOut}>Log out</button>
      </div>
    </header>
    <div className="shell-body">
      <nav aria-label="Staff navigation" className="sidebar">
        {links.filter((link) => link.roles.includes(user?.role ?? '')).map((link) =>
          <NavLink key={link.to} to={link.to} end={link.to === '/staff'}
            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            {link.label}
          </NavLink>)}
      </nav>
      <div className="content"><Outlet /></div>
    </div>
  </div>;
}

