import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, ChevronDown, Sparkles, User, LogOut, Menu, X, Shield, Compass, Users, Cpu, ShieldCheck, MapPin, CloudSun, Gauge, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency, Currency } from '../../context/CurrencyContext';
import { isStaffUserRole } from '../../auth/types';
import { AuthModal } from '../auth/AuthModal';
import { Logo } from '../common/Logo';
import { buttonPressProps, sidebarDrawerVariants } from '../../utils/animations';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [isLiteMode, setIsLiteMode] = useState(() => document.documentElement.classList.contains('lite-mode'));

  const toggleLiteMode = () => {
    const isLite = document.documentElement.classList.toggle('lite-mode');
    setIsLiteMode(isLite);
  };

  useEffect(() => {
    setMoreDropdownOpen(false);
    setMobileMenuOpen(false);
    setCurrencyDropdownOpen(false);
  }, [location.pathname]);

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    if (location.state?.openAuth && !user) {
      setAuthModalOpen(true);
    }
  }, [location.state, user]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currencies: Currency[] = ['USD', 'LKR'];
  const isStaff = user && isStaffUserRole(user.role);

  // 1. Staff Operations Header
  if (isStaff) {
    const roleUpper = user.role.toUpperCase();

    return (
      <header className="sticky top-0 z-40 w-full bg-[#0F1A24]/95 backdrop-blur-xl border-b border-[#C5A880]/30 shadow-2xl px-4 md:px-8 py-3.5 font-sans text-slate-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Brand Logo & Role Badge */}
          <div className="flex items-center gap-3">
            <Logo />
            {roleUpper === 'ADMIN' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                SYSTEM ADMIN
              </span>
            )}
            {roleUpper === 'CAPACITY_OFFICER' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold uppercase tracking-wider">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                CAPACITY OFFICER CONSOLE
              </span>
            )}
            {roleUpper === 'TRAVEL_AGENT' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-semibold uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                AGENT DESK
              </span>
            )}
            {roleUpper === 'LOCAL_GUIDE' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                CERTIFIED GUIDE PORTAL
              </span>
            )}
          </div>

          {/* Center: Quick Staff Navigation Links */}
          <div className="hidden md:flex items-center gap-3 text-xs font-medium">
            {roleUpper === 'CAPACITY_OFFICER' && (
              <Link
                to="/staff/capacity"
                className="px-3.5 py-1.5 rounded-lg bg-[#C5A880]/10 text-[#C5A880] border border-[#C5A880]/30 hover:bg-[#C5A880]/20 transition-all font-semibold"
              >
                Guide & Logistics Capacity Desk
              </Link>
            )}



            {roleUpper === 'ADMIN' && (
              <>
                <Link
                  to="/admin"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-[#C5A880] transition-colors font-medium"
                >
                  Overview
                </Link>
                <Link
                  to="/admin/users"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-[#C5A880] transition-colors font-medium"
                >
                  User Directory
                </Link>
                <Link
                  to="/staff/capacity"
                  className="px-3.5 py-1.5 rounded-lg bg-[#C5A880]/10 text-[#C5A880] border border-[#C5A880]/30 hover:bg-[#C5A880]/20 transition-all font-semibold"
                >
                  Capacity Engine
                </Link>
                <Link
                  to="/admin/audit-logs"
                  className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-[#C5A880] transition-colors font-medium"
                >
                  Audit Logs
                </Link>
              </>
            )}

            {roleUpper === 'LOCAL_GUIDE' && (
              <Link
                to="/guide-portal"
                className="px-3.5 py-1.5 rounded-lg bg-[#C5A880]/10 text-[#C5A880] border border-[#C5A880]/30 hover:bg-[#C5A880]/20 transition-all font-semibold"
              >
                Guide Portal
              </Link>
            )}
          </div>

          {/* Right: Staff Account Email & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right text-xs">
              <span className="font-semibold text-slate-200">{user.email}</span>
              <span className="text-[10px] text-[#C5A880] font-mono uppercase tracking-wide">
                Role: {user.role}
              </span>
            </div>

            <button
              onClick={toggleLiteMode}
              title="Toggle Theme"
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-stone-700/60 text-stone-300 hover:text-[#C5A880] transition-colors cursor-pointer shadow-md"
            >
              {isLiteMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <Link to="/account">
              <button
                title="My Account & Security Settings"
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-[#C5A880]/50 text-[#C5A880] hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="hidden md:inline">My Account</span>
              </button>
            </Link>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // 2. Public Consumer Traveler Navbar
  return (
    <>
      <header className="sticky top-0 z-40 w-full font-sans transition-all duration-300">
        {/* Top Utility Bar */}
        <div className="bg-[#0B131F] text-stone-300 text-xs py-2 px-4 md:px-8 border-b border-stone-800 flex flex-wrap justify-between items-center gap-2">
          {/* Left: Island Season Alert */}


          {/* Right: Phone Concierge + Currency Switcher */}
          <div className="flex items-center gap-6 ml-auto">
            <a
              href="tel:+94117311611"
              className="hidden sm:flex items-center gap-1.5 hover:text-[#C5A880] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>24/7 Concierge: +94 11 7311 611</span>
            </a>

            {/* Theme Toggle */}
            <button
              onClick={toggleLiteMode}
              title="Toggle Theme"
              className="flex items-center gap-1 hover:text-[#C5A880] transition-colors p-1 rounded-full bg-slate-900/60 border border-stone-700/60 cursor-pointer"
            >
              {isLiteMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Currency Selector */}
            <div className="relative">
              <button
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="flex items-center gap-1 hover:text-[#C5A880] transition-colors font-semibold px-2.5 py-0.5 rounded bg-slate-900/60 border border-stone-700/60 cursor-pointer"
              >
                <span>{currency}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              <AnimatePresence>
                {currencyDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute right-0 mt-1 w-24 bg-[#0F1A24] border border-stone-700 rounded-lg shadow-xl overflow-hidden z-50 py-1"
                  >
                    {currencies.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setCurrency(c);
                          setCurrencyDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1 text-xs hover:bg-[#134E4A] transition-colors cursor-pointer ${currency === c ? 'text-[#C5A880] font-bold' : 'text-stone-300'
                          }`}
                      >
                        {c}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Main Glass Navbar */}
        <nav
          className={`px-4 md:px-8 py-3.5 transition-all duration-300 ${scrolled
            ? 'bg-[#0B131F]/95 backdrop-blur-xl border-b border-stone-800/80 shadow-xl text-stone-100'
            : 'bg-[#0B131F]/85 backdrop-blur-md text-stone-100 border-b border-stone-800/40'
            }`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Brand Logo */}
            <Logo />

            {/* Desktop Nav Links (4 Main Visible Links + Luxury 'More' Dropdown) */}
            <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-stone-300">
              {/* 1. Signature Journeys */}
              <Link
                to="/"
                className={`hover:text-[#C5A880] transition-colors ${location.pathname === '/' ? 'text-[#C5A880] font-semibold' : ''
                  }`}
              >
                Signature Journeys
              </Link>

              {/* 2. Destinations */}
              <Link
                to="/destinations"
                className={`hover:text-[#C5A880] transition-colors ${location.pathname === '/destinations' ? 'text-[#C5A880] font-semibold' : ''
                  }`}
              >
                Destinations
              </Link>

              {/* 3. Drivers & Guides */}
              <Link
                to="/fleet-and-guides"
                className={`hover:text-[#C5A880] transition-colors ${location.pathname === '/fleet-and-guides' ? 'text-[#C5A880] font-semibold' : ''
                  }`}
              >
                Drivers & Guides
              </Link>

              {/* 4. About Us */}
              <Link
                to="/about"
                className={`hover:text-[#C5A880] transition-colors ${location.pathname === '/about' ? 'text-[#C5A880] font-semibold' : ''
                  }`}
              >
                About Us
              </Link>


            </div>

            {/* Right Auth Action Button */}
            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <Link to="/my-bookings">
                    <motion.button
                      {...buttonPressProps}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 border border-[#C5A880]/50 text-[#C5A880] hover:text-white hover:border-[#C5A880] text-xs font-semibold tracking-wide transition-all shadow-md cursor-pointer"
                    >
                      <User className="w-4 h-4" />
                      <span>My Account & Bookings</span>
                    </motion.button>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    title="Sign Out"
                    className="p-2 text-stone-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <motion.button
                  {...buttonPressProps}
                  onClick={() => setAuthModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] font-semibold text-xs tracking-wider uppercase transition-all shadow-lg gold-shadow-bloom cursor-pointer"
                >
                  Sign In / Register
                </motion.button>
              )}
            </div>

            {/* Mobile Hamburger Trigger */}
            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 text-stone-300 hover:text-white rounded-lg focus:outline-none cursor-pointer"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Smooth Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Sliding Drawer */}
            <motion.div
              variants={sidebarDrawerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute top-0 right-0 w-4/5 max-w-sm h-full bg-[#0B131F] border-l border-stone-800 p-6 flex flex-col justify-between shadow-2xl text-stone-100 overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                  <Logo />
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-stone-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Primary Links */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#C5A880] font-bold block mb-2">
                    Primary Navigation
                  </span>
                  <div className="flex flex-col gap-2 text-sm font-medium">
                    <Link
                      to="/"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-3 py-2 rounded-xl transition-colors ${location.pathname === '/' ? 'bg-[#C5A880]/15 text-[#C5A880] font-semibold' : 'hover:bg-white/5 text-stone-200'
                        }`}
                    >
                      Signature Journeys
                    </Link>

                    <Link
                      to="/destinations"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-3 py-2 rounded-xl transition-colors ${location.pathname === '/destinations' ? 'bg-[#C5A880]/15 text-[#C5A880] font-semibold' : 'hover:bg-white/5 text-stone-200'
                        }`}
                    >
                      Destinations
                    </Link>

                    <Link
                      to="/fleet-and-guides"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-3 py-2 rounded-xl transition-colors ${location.pathname === '/fleet-and-guides' ? 'bg-[#C5A880]/15 text-[#C5A880] font-semibold' : 'hover:bg-white/5 text-stone-200'
                        }`}
                    >
                      Drivers & Guides
                    </Link>

                    <Link
                      to="/about"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-3 py-2 rounded-xl transition-colors ${location.pathname === '/about' ? 'bg-[#C5A880]/15 text-[#C5A880] font-semibold' : 'hover:bg-white/5 text-stone-200'
                        }`}
                    >
                      About Us
                    </Link>
                  </div>
                </div>


              </div>

              <div className="pt-6 border-t border-stone-800 space-y-3">
                {user ? (
                  <div className="space-y-2">
                    <Link
                      to="/my-bookings"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full py-3 text-center bg-stone-900 border border-[#C5A880] text-[#C5A880] font-semibold rounded-xl text-sm"
                    >
                      My Bookings & Account
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full py-2.5 text-center text-rose-400 hover:bg-rose-950/20 rounded-xl text-sm cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-[#0B131F] font-bold rounded-xl text-sm uppercase tracking-wider cursor-pointer"
                  >
                    Sign In / Register
                  </button>
                )}
                <p className="text-[11px] text-stone-500 text-center pt-2">
                  24/7 Island Desk: +94 11 7311 611
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};
