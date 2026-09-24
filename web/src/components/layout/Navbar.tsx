import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, ChevronDown, Sparkles, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency, Currency } from '../../context/CurrencyContext';
import { AuthModal } from '../auth/AuthModal';
import { Logo } from '../common/Logo';
import { buttonPressProps, sidebarDrawerVariants } from '../../utils/animations';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currencies: Currency[] = ['USD', 'LKR', 'EUR', 'GBP'];

  return (
    <>
      <header className="sticky top-0 z-40 w-full font-sans transition-all duration-300">
        {/* Top Utility Bar */}
        <div className="bg-[#0B131F] text-stone-300 text-xs py-2 px-4 md:px-8 border-b border-stone-800 flex flex-wrap justify-between items-center gap-2">
          {/* Left: Island Season Alert */}
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-stone-200">
              South Coast: <span className="text-[#C5A880]">Prime Beach & Whale Season</span>
            </span>
          </div>

          {/* Right: Phone Concierge + Currency Switcher */}
          <div className="flex items-center gap-6 ml-auto">
            <a
              href="tel:+94117311611"
              className="hidden sm:flex items-center gap-1.5 hover:text-[#C5A880] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>24/7 Concierge: +94 11 7311 611</span>
            </a>

            {/* Currency Selector */}
            <div className="relative">
              <button
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="flex items-center gap-1 hover:text-[#C5A880] transition-colors font-semibold px-2.5 py-0.5 rounded bg-slate-900/60 border border-stone-700/60"
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
                        className={`w-full text-left px-3 py-1 text-xs hover:bg-[#134E4A] transition-colors ${
                          currency === c ? 'text-[#C5A880] font-bold' : 'text-stone-300'
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
          className={`px-4 md:px-8 py-3.5 transition-all duration-300 ${
            scrolled
              ? 'bg-[#0B131F]/95 backdrop-blur-xl border-b border-stone-800/80 shadow-xl text-stone-100'
              : 'bg-[#0B131F]/85 backdrop-blur-md text-stone-100 border-b border-stone-800/40'
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Brand Logo with Compass & Leaf SVG Emblem */}
            <Logo />

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-stone-300">
              <Link
                to="/"
                className={`hover:text-[#C5A880] transition-colors ${
                  location.pathname === '/' ? 'text-[#C5A880] font-semibold' : ''
                }`}
              >
                Signature Journeys
              </Link>

              <Link
                to="/destinations"
                className={`hover:text-[#C5A880] transition-colors ${
                  location.pathname === '/destinations' ? 'text-[#C5A880] font-semibold' : ''
                }`}
              >
                Destinations
              </Link>

              <Link
                to="/plan-my-trip"
                className={`hover:text-[#C5A880] transition-colors flex items-center gap-1.5 ${
                  location.pathname === '/plan-my-trip' ? 'text-[#C5A880] font-semibold' : ''
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                Tailor-Made Planner
              </Link>

              <Link
                to="/fleet-and-guides"
                className={`hover:text-[#C5A880] transition-colors ${
                  location.pathname === '/fleet-and-guides' ? 'text-[#C5A880] font-semibold' : ''
                }`}
              >
                Chauffeurs & Fleet
              </Link>

              <Link
                to="/about"
                className={`hover:text-[#C5A880] transition-colors ${
                  location.pathname === '/about' ? 'text-[#C5A880] font-semibold' : ''
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
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 border border-[#C5A880]/50 text-[#C5A880] hover:text-white hover:border-[#C5A880] text-xs font-semibold tracking-wide transition-all shadow-md"
                    >
                      <User className="w-4 h-4" />
                      <span>My Account & Bookings</span>
                    </motion.button>
                  </Link>
                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-2 text-stone-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-white/5"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <motion.button
                  {...buttonPressProps}
                  onClick={() => setAuthModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] font-semibold text-xs tracking-wider uppercase transition-all shadow-lg gold-shadow-bloom"
                >
                  Sign In / Register
                </motion.button>
              )}
            </div>

            {/* Mobile Hamburger Trigger */}
            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 text-stone-300 hover:text-white rounded-lg focus:outline-none"
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
              className="absolute top-0 right-0 w-4/5 max-w-sm h-full bg-[#0B131F] border-l border-stone-800 p-6 flex flex-col justify-between shadow-2xl text-stone-100"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                  <Logo />
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-stone-400 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex flex-col gap-4 text-base font-medium">
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="hover:text-[#C5A880] transition-colors"
                  >
                    Signature Journeys
                  </Link>

                  <Link
                    to="/destinations"
                    onClick={() => setMobileMenuOpen(false)}
                    className="hover:text-[#C5A880] transition-colors"
                  >
                    Destinations
                  </Link>

                  <Link
                    to="/plan-my-trip"
                    onClick={() => setMobileMenuOpen(false)}
                    className="hover:text-[#C5A880] transition-colors flex items-center gap-2 text-[#D4AF37]"
                  >
                    <Sparkles className="w-4 h-4" />
                    Tailor-Made Planner
                  </Link>

                  <Link
                    to="/fleet-and-guides"
                    onClick={() => setMobileMenuOpen(false)}
                    className="hover:text-[#C5A880] transition-colors"
                  >
                    Chauffeurs & Fleet
                  </Link>

                  <Link
                    to="/about"
                    onClick={() => setMobileMenuOpen(false)}
                    className="hover:text-[#C5A880] transition-colors"
                  >
                    About Us
                  </Link>
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
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="block w-full py-2.5 text-center text-rose-400 hover:bg-rose-950/20 rounded-xl text-sm"
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
                    className="w-full py-3 bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-[#0B131F] font-bold rounded-xl text-sm uppercase tracking-wider"
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
