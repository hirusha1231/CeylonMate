import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Car, UserCheck, ArrowRight, Sparkles, ShieldCheck, Compass } from 'lucide-react';
import { Link } from 'react-router';
import { fadeInVariants, buttonPressProps } from '../utils/animations';
import { FleetShowcaseSection } from '../components/fleet/FleetShowcaseSection';
import { GuideShowcaseSection } from '../components/guides/GuideShowcaseSection';

export const FleetPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'fleet' | 'guides'>('all');

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
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#134E4A]/10 border border-[#134E4A]/30 text-[#134E4A] text-xs font-semibold uppercase tracking-widest">
            <Car className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Company-Owned VIP Fleet & Licensed Chauffeur Guides</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif-luxury font-bold text-[#0B131F]">
            Unrivaled Ground Transport & Guides
          </h1>
          <p className="text-stone-600 text-sm leading-relaxed">
            Every CeylonMate journey is piloted by SLTDA-certified chauffeur guides fluent in English, German, French, or Japanese, driving company-maintained VIP vehicles.
          </p>

          {/* View Filter Pill Switcher */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#0B131F] text-[#C5A880] shadow-lg shadow-[#0B131F]/20'
                  : 'bg-white text-stone-600 hover:text-[#0B131F] border border-stone-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>All Fleet & Guides</span>
            </button>

            <button
              onClick={() => setActiveTab('fleet')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'fleet'
                  ? 'bg-[#0B131F] text-[#C5A880] shadow-lg shadow-[#0B131F]/20'
                  : 'bg-white text-stone-600 hover:text-[#0B131F] border border-stone-200'
              }`}
            >
              <Car className="w-3.5 h-3.5 text-[#134E4A]" />
              <span>VIP Vehicle Fleet</span>
            </button>

            <button
              onClick={() => setActiveTab('guides')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'guides'
                  ? 'bg-[#0B131F] text-[#C5A880] shadow-lg shadow-[#0B131F]/20'
                  : 'bg-white text-stone-600 hover:text-[#0B131F] border border-stone-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Certified Local Guides</span>
            </button>
          </div>
        </div>

        {/* Fleet Showcase Section */}
        {(activeTab === 'all' || activeTab === 'fleet') && (
          <div className="space-y-6">
            {activeTab === 'all' && (
              <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
                <Car className="w-5 h-5 text-[#134E4A]" />
                <h2 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
                  Private VIP Transport Fleet
                </h2>
              </div>
            )}
            <FleetShowcaseSection layout="grid" showTitle={false} />
          </div>
        )}

        {/* Guides Showcase Section */}
        {(activeTab === 'all' || activeTab === 'guides') && (
          <div className="space-y-6 pt-6">
            {activeTab === 'all' && (
              <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
                <UserCheck className="w-5 h-5 text-[#D4AF37]" />
                <h2 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
                  SLTDA-Certified Local & Chauffeur Guides
                </h2>
              </div>
            )}
            <GuideShowcaseSection showTitle={false} />
          </div>
        )}

        {/* CTA */}
        <div className="p-8 bg-[#0B131F] rounded-2xl text-stone-100 text-center space-y-4 shadow-2xl">
          <h3 className="text-2xl font-serif-luxury font-bold text-[#C5A880]">
            Ready to Travel in Unrivaled Elegance?
          </h3>
          <p className="text-xs text-stone-300 max-w-lg mx-auto leading-relaxed">
            Book your private transport and certified local chauffeur guide today with 100% guaranteed capacity and instant SLTDA verification.
          </p>
          <Link to="/plan-my-trip">
            <motion.button
              {...buttonPressProps}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-[#0B131F] font-bold text-xs uppercase tracking-wider shadow-lg inline-flex items-center gap-2 mt-2 cursor-pointer"
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

