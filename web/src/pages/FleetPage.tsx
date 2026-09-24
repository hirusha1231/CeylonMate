import React from 'react';
import { motion } from 'framer-motion';
import { Car, Users, Luggage, ShieldCheck, Wifi, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { FLEET_IMAGES } from '../utils/mediaData';
import { fadeInVariants, hoverLiftProps, buttonPressProps } from '../utils/animations';

export const FleetPage: React.FC = () => {
  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="bg-[#FDFBF7] text-[#0B131F] min-h-screen py-16 px-4 md:px-8 font-sans space-y-16"
    >
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#134E4A]/10 border border-[#134E4A]/30 text-[#134E4A] text-xs font-semibold uppercase tracking-widest">
            <Car className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Company-Owned VIP Fleet & Licensed Chauffeur Guides</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif-luxury font-bold text-[#0B131F]">
            Unrivaled Ground Transport
          </h1>
          <p className="text-stone-600 text-sm leading-relaxed">
            Every CeylonMate journey is piloted by an SLTDA-certified chauffeur guide fluent in English, German, or French, driving company-maintained VIP vehicles.
          </p>
        </div>

        {/* Fleet Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1 */}
          <motion.div
            {...hoverLiftProps}
            className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="relative h-64 overflow-hidden">
                <img src={FLEET_IMAGES.kdhVan} alt="Toyota KDH VIP Van" className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 bg-[#0B131F]/80 text-[#C5A880] text-xs font-semibold px-3 py-1 rounded-full">
                  Executive VIP Group
                </div>
              </div>
              <div className="p-6 space-y-4">
                <h3 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
                  Toyota KDH Super GL VIP Van
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Ideal for families and luxury groups. Dual climate control, plush leather reclining armchairs, high-speed onboard 5G Wi-Fi, and spacious luggage capacity.
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-stone-100">
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    <Users className="w-4 h-4 text-[#134E4A]" /> Up to 6 Passengers
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    <Luggage className="w-4 h-4 text-[#134E4A]" /> 6 Large Luggage
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    <Wifi className="w-4 h-4 text-[#134E4A]" /> Free 5G Wi-Fi
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    <ShieldCheck className="w-4 h-4 text-[#134E4A]" /> SLTDA Certified Chauffeur
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            {...hoverLiftProps}
            className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="relative h-64 overflow-hidden">
                <img src={FLEET_IMAGES.mercedes} alt="Mercedes Sedan" className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 bg-[#0B131F]/80 text-[#C5A880] text-xs font-semibold px-3 py-1 rounded-full">
                  Prestige Executive Sedan
                </div>
              </div>
              <div className="p-6 space-y-4">
                <h3 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
                  Mercedes-Benz E-Class Sedan
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Unmatched elegance for couples and solo executive travelers. Whisper-quiet cabin acoustics, leather seating, and smooth transit along coastal expressways.
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-stone-100">
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    <Users className="w-4 h-4 text-[#134E4A]" /> Up to 3 Passengers
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    <Luggage className="w-4 h-4 text-[#134E4A]" /> 3 Large Luggage
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    <Wifi className="w-4 h-4 text-[#134E4A]" /> Free Onboard Wi-Fi
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    <ShieldCheck className="w-4 h-4 text-[#134E4A]" /> Senior Master Chauffeur
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            {...hoverLiftProps}
            className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="relative h-64 overflow-hidden">
                <img src={FLEET_IMAGES.landCruiser} alt="Toyota Land Cruiser V8" className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 bg-[#0B131F]/80 text-[#C5A880] text-xs font-semibold px-3 py-1 rounded-full">
                  4x4 Safari & Expedition
                </div>
              </div>
              <div className="p-6 space-y-4">
                <h3 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
                  Toyota Land Cruiser V8 Safari
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Heavy-duty luxury 4x4 modified for Yala and Udawalawe national park tracking. High elevation seating with pop-up roof for wildlife photography.
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-stone-100">
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    <Users className="w-4 h-4 text-[#134E4A]" /> Up to 5 Passengers
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    <Shield className="w-4 h-4 text-[#134E4A]" /> High-Clearance 4x4
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 4 */}
          <motion.div
            {...hoverLiftProps}
            className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="relative h-64 overflow-hidden">
                <img src={FLEET_IMAGES.luxuryCoaster} alt="Luxury Coaster Minibus" className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 bg-[#0B131F]/80 text-[#C5A880] text-xs font-semibold px-3 py-1 rounded-full">
                  VIP Coach Transport
                </div>
              </div>
              <div className="p-6 space-y-4">
                <h3 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
                  Toyota Coaster VIP Minibus
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Ideal for private delegation groups. Equipped with dual AC, microphone, panoramic windows, and dedicated luggage compartment.
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-stone-100">
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    <Users className="w-4 h-4 text-[#134E4A]" /> Up to 14 Passengers
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-stone-700">
                    <Luggage className="w-4 h-4 text-[#134E4A]" /> 12 Large Luggage
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* CTA */}
        <div className="p-8 bg-[#0B131F] rounded-2xl text-stone-100 text-center space-y-4">
          <h3 className="text-2xl font-serif-luxury font-bold text-[#C5A880]">
            Ready to Travel in Unrivaled Elegance?
          </h3>
          <p className="text-xs text-stone-300 max-w-lg mx-auto">
            Book your private transport and certified chauffeur guide today with 100% guaranteed capacity.
          </p>
          <Link to="/plan-my-trip">
            <motion.button
              {...buttonPressProps}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-[#0B131F] font-bold text-xs uppercase tracking-wider shadow-lg inline-flex items-center gap-2 mt-2"
            >
              <span>Curate Your Journey Now</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
