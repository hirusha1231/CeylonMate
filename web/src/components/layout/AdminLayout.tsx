import React, { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Users, MapPin, FileText, ArrowLeft, LogOut, Menu, X, Shield, Server, Sparkles, Compass
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../common/Logo';
import { sidebarDrawerVariants } from '../../utils/animations';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleSignOut = () => {
    logout();
    showToast('Signed Out', 'You have been logged out of the Admin Portal.', 'info');
    navigate('/login');
  };

  const navItems = [
    { to: '/admin', label: 'Overview Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Staff & User Directory', icon: Users, end: false },
    { to: '/admin/destinations', label: 'Destinations & Quotas', icon: MapPin, end: false },
    { to: '/admin/audit-logs', label: 'Audit & Concurrency Logs', icon: FileText, end: false },
  ];

  return (
    <div className="min-h-screen bg-[#0B131F] text-stone-100 flex flex-col font-sans selection:bg-[#C5A880] selection:text-[#0B131F]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0F1A24]/95 backdrop-blur-xl border-b border-stone-800 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden p-2 text-stone-300 hover:text-white rounded-lg focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Logo />
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            Admin Operations
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right text-xs">
            <span className="font-semibold text-stone-200">{user?.email || 'admin@ceylonmate.lk'}</span>
            <span className="text-[10px] text-[#C5A880] font-mono">Role: {user?.role || 'ADMIN'}</span>
          </div>

          <Link to="/">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#C5A880]" />
              <span className="hidden sm:inline">Public Site</span>
            </button>
          </Link>

          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-2 text-stone-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-white/5"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body Shell */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#0F1A24] border-r border-stone-800 p-4 justify-between shrink-0">
          <div className="space-y-6">
            <div className="text-[10px] font-mono font-bold text-[#C5A880] uppercase tracking-widest px-3 pt-2">
              System Operations
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-[#134E4A] text-emerald-100 border border-emerald-500/40 shadow-lg'
                          : 'text-stone-400 hover:text-stone-100 hover:bg-slate-900 border border-transparent'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 text-[#C5A880]" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="p-3 bg-[#0B131F] rounded-xl border border-stone-800 text-[11px] text-stone-400 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Server className="w-3.5 h-3.5" />
              <span>System Status: 200 OK</span>
            </div>
            <div className="text-[10px]">PostgreSQL OCC Active</div>
            <div className="text-[10px]">LangGraph Multi-Agent Ready</div>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              variants={sidebarDrawerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute top-0 left-0 w-4/5 max-w-xs h-full bg-[#0F1A24] border-r border-stone-800 p-6 flex flex-col justify-between shadow-2xl text-stone-100"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                  <Logo />
                  <button onClick={() => setMobileDrawerOpen(false)} className="p-2 text-stone-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-[#134E4A] text-emerald-100 border border-emerald-500/40'
                              : 'text-stone-300 hover:bg-slate-900'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 text-[#C5A880]" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-stone-800 space-y-2">
                <Link to="/" onClick={() => setMobileDrawerOpen(false)}>
                  <button className="w-full py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 font-semibold text-xs flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Return to Public Site</span>
                  </button>
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
