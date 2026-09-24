import React from 'react';
import { motion } from 'framer-motion';
import {
  Compass, ShieldCheck, Leaf, Users, Award, MapPin, Building2, Server, Code, Layers, Sparkles
} from 'lucide-react';
import { AnimatedCounter } from '../components/common/Counter';
import { fadeInVariants, slideUpVariants, hoverLiftProps } from '../utils/animations';

export const AboutPage: React.FC = () => {
  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="bg-[#FDFBF7] text-[#0B131F] min-h-screen font-sans space-y-20 pb-20"
    >
      {/* Hero Header */}
      <section className="bg-[#0B131F] text-stone-100 py-24 px-4 md:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#134E4A]/20 rounded-full filter blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-[#C5A880]/40 text-[#C5A880] text-xs font-semibold tracking-widest uppercase backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Hospitality & Logistics Intelligence</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif-luxury font-bold text-stone-100 tracking-tight">
            Curating Ceylon's Most Extraordinary Journeys
          </h1>

          <p className="text-stone-300 max-w-2xl mx-auto text-base leading-relaxed font-light">
            CeylonMate was founded with a singular ambition: to unite Sri Lanka's legendary warm hospitality with high-precision logistics technology and 100% guaranteed capacity.
          </p>
        </div>
      </section>

      {/* Animated Rolling Counters */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 -mt-12 relative z-20">
        <div className="bg-[#0F1A24] border border-[#C5A880]/30 rounded-2xl p-8 shadow-2xl text-stone-100 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div className="space-y-1">
            <div className="text-4xl font-serif-luxury font-bold text-[#C5A880]">
              <AnimatedCounter end={1450} suffix="+" />
            </div>
            <div className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Bespoke Expeditions Hosted
            </div>
          </div>

          <div className="space-y-1 border-y sm:border-y-0 sm:border-x border-stone-800 py-4 sm:py-0">
            <div className="text-4xl font-serif-luxury font-bold text-[#C5A880]">
              <AnimatedCounter end={120} suffix="+" />
            </div>
            <div className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Certified Chauffeur Guides
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-4xl font-serif-luxury font-bold text-[#C5A880]">
              <AnimatedCounter end={99.4} decimals={1} suffix="%" />
            </div>
            <div className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Guest Satisfaction Rating
            </div>
          </div>
        </div>
      </section>

      {/* Our Story & Three Pillars */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            variants={slideUpVariants}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="space-y-4"
          >
            <span className="text-xs font-mono tracking-widest text-[#134E4A] uppercase font-semibold">
              Our Vision & Philosophy
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif-luxury font-bold text-[#0B131F]">
              Uncompromising Quality across Every Kilometer
            </h2>
            <p className="text-stone-600 text-sm leading-relaxed">
              Sri Lanka is an island of incredible diversity—from ancient rock citadels to tea-covered mist peaks and marine sanctuaries. However, navigating terrain, overbooked safaris, and unpredictable transit times can diminish the luxury experience.
            </p>
            <p className="text-stone-600 text-sm leading-relaxed">
              CeylonMate solves this by pairing luxury private chauffeurs with active terrain elevation routing and real-time concurrency locks, guaranteeing that every moment of your itinerary unfolds effortlessly.
            </p>
          </motion.div>

          {/* Three Pillars Cards */}
          <div className="space-y-4">
            <motion.div
              {...hoverLiftProps}
              className="p-6 bg-white rounded-2xl border border-stone-200 shadow-md space-y-2 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-[#134E4A]/10 text-[#134E4A] flex items-center justify-center shrink-0">
                <Leaf className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-serif-luxury font-bold text-[#0B131F]">
                  1. Ethical Wildlife & Carbon Offsetting
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed mt-1">
                  We adhere to strict non-intrusive safari guidelines in Yala and offset 100% of vehicle emissions through local rainforest restoration.
                </p>
              </div>
            </motion.div>

            <motion.div
              {...hoverLiftProps}
              className="p-6 bg-white rounded-2xl border border-stone-200 shadow-md space-y-2 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-[#134E4A]/10 text-[#134E4A] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-serif-luxury font-bold text-[#0B131F]">
                  2. Empowering Certified Local Guides
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed mt-1">
                  Every CeylonMate chauffeur guide receives ongoing hospitality training, fair living wages, and complete health insurance.
                </p>
              </div>
            </motion.div>

            <motion.div
              {...hoverLiftProps}
              className="p-6 bg-white rounded-2xl border border-stone-200 shadow-md space-y-2 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-[#134E4A]/10 text-[#134E4A] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-serif-luxury font-bold text-[#0B131F]">
                  3. Uncompromising Reliability
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed mt-1">
                  Our double-entry reservation tokens mean your vehicle, hotel suites, and safari slots are locked with 100% guaranteed availability.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Enterprise Architecture Executive Overview */}
      <section className="bg-[#0B131F] text-stone-100 py-16 px-4 md:px-8">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono tracking-widest text-[#C5A880] uppercase font-semibold">
              The Engineering Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif-luxury font-bold text-stone-100">
              Powered by Logistics Intelligence
            </h2>
            <p className="text-stone-300 text-sm leading-relaxed">
              Behind CeylonMate's effortless luxury lies an enterprise platform designed for concurrent booking integrity, multi-agent AI orchestration, and terrain dynamics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            <div className="p-6 bg-[#0F1A24] rounded-2xl border border-stone-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#134E4A]/30 text-emerald-400 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <h4 className="text-base font-serif-luxury font-bold text-stone-100">ASP.NET Core Web API</h4>
              <p className="text-stone-400 leading-relaxed">
                High-performance C# RESTful services enforcing transactional workflow isolation and role-based JWT authorization.
              </p>
            </div>

            <div className="p-6 bg-[#0F1A24] rounded-2xl border border-stone-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#134E4A]/30 text-[#C5A880] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-base font-serif-luxury font-bold text-stone-100">PostgreSQL Concurrency</h4>
              <p className="text-stone-400 leading-relaxed">
                Atomic database row locking eliminating overbooking across vehicles, hotel suites, and certified chauffeurs.
              </p>
            </div>

            <div className="p-6 bg-[#0F1A24] rounded-2xl border border-stone-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#134E4A]/30 text-sky-400 flex items-center justify-center">
                <Code className="w-5 h-5" />
              </div>
              <h4 className="text-base font-serif-luxury font-bold text-stone-100">Multi-Agent AI Engine</h4>
              <p className="text-stone-400 leading-relaxed">
                Python LangGraph workflow coordination calculating hill elevation routing and live attraction operating rules.
              </p>
            </div>

            <div className="p-6 bg-[#0F1A24] rounded-2xl border border-stone-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#134E4A]/30 text-amber-400 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h4 className="text-base font-serif-luxury font-bold text-stone-100">React & Flutter Suite</h4>
              <p className="text-stone-400 leading-relaxed">
                Responsive web portal with Framer Motion aesthetics alongside real-time Flutter mobile chauffeur dispatch apps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Corporate Credentials */}
      <section className="max-w-5xl mx-auto px-4 md:px-8 text-center space-y-6">
        <div className="p-8 bg-white rounded-2xl border border-stone-200 shadow-lg space-y-4">
          <Award className="w-10 h-10 text-[#C5A880] mx-auto" />
          <h3 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
            Corporate Operations Office
          </h3>
          <p className="text-xs text-stone-600 max-w-xl mx-auto leading-relaxed">
            CeylonMate Private Limited is a registered Sri Lankan tour operator (#SLTDA/SQA/TA/01492) operating out of Colombo 02 World Trade Centre.
          </p>
          <div className="flex justify-center gap-2 text-xs font-semibold text-[#134E4A] pt-2">
            <MapPin className="w-4 h-4" />
            <span>Level 14, World Trade Centre, Echelon Square, Colombo 02, Sri Lanka</span>
          </div>
        </div>
      </section>
    </motion.div>
  );
};
