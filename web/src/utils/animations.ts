import { Variants } from 'framer-motion';

// 1. Fade In
export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.8 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
};

// 2. Slide Up (for viewports)
export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  whileInView: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

// 3. Container Stagger & Item Variants
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 25 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

// 4. Hover Lift Card Effect
export const hoverLiftProps = {
  whileHover: {
    y: -8,
    transition: { duration: 0.25 },
  },
};

// 5. Button Press Micro-Bounce
export const buttonPressProps = {
  whileTap: { scale: 0.96 },
};

// 6. Scale-in Modal / Dialog
export const scaleInModalVariants: Variants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

// 10. Smooth Sidebar Drawer
export const sidebarDrawerVariants: Variants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } },
  exit: { x: '100%', transition: { type: 'spring', damping: 25, stiffness: 200 } },
};

// 11. Page Route Transition
export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25 } },
};
