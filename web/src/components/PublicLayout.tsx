import React from 'react';
import { Outlet, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from './layout/Navbar';
import { Footer } from './layout/Footer';
import { pageTransitionVariants } from '../utils/animations';

export const PublicLayout: React.FC = () => {
  const location = useLocation();

  const isAccountPage =
    location.pathname === '/account' ||
    location.pathname === '/profile' ||
    location.pathname === '/my-bookings';

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFBF7] selection:bg-[#C5A880] selection:text-[#0B131F]">
      <Navbar />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageTransitionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {!isAccountPage && <Footer />}
    </div>
  );
};
