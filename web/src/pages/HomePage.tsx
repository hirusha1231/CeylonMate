import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, MapPin, Calendar, Users, Sparkles, ShieldCheck, Mountain, Wind,
  CheckCircle, ArrowRight, Star, Clock, Car, ChevronRight, X, PhoneCall, Award
} from 'lucide-react';
import { AnimatedCounter } from '../components/common/Counter';
import { QuickInquiryBar } from '../components/common/QuickInquiryBar';
import { useCurrency } from '../context/CurrencyContext';
import {
  fadeInVariants, slideUpVariants, staggerContainerVariants, staggerItemVariants,
  hoverLiftProps, buttonPressProps, scaleInModalVariants
} from '../utils/animations';
import { HERO_VIDEO_FALLBACK, FLEET_IMAGES, SIGNATURE_PACKAGES_DATA } from '../utils/mediaData';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  // Floating Bar State
  const [selectedRegion, setSelectedRegion] = useState('Cultural Heartland');
  const [dates, setDates] = useState('');
  const [guests, setGuests] = useState('2 Guests');
  const [travelStyle, setTravelStyle] = useState('Bespoke Luxury');

  // Modal Itinerary State
  const [activeModalPackage, setActiveModalPackage] = useState<typeof SIGNATURE_PACKAGES_DATA[0] | null>(null);

  const handleQuickInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/plan-my-trip?region=${encodeURIComponent(selectedRegion)}&guests=${encodeURIComponent(guests)}`);
  };

  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="bg-[#FDFBF7] text-[#0B131F] min-h-screen font-sans overflow-x-hidden"
    >
      {/* HERO SECTION */}
      <section className="relative h-[92vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-[#0B131F]">
        {/* Background Image / Ambient Vignette */}
        <div className="absolute inset-0 z-0">
          <img
            src={HERO_VIDEO_FALLBACK}
            alt="Sigiriya Sri Lanka Sunrise"
            className="w-full h-full object-cover object-center scale-105 filter brightness-[0.70] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B131F] via-[#0B131F]/40 to-black/60" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center text-stone-100 space-y-6 pt-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-[#C5A880]/40 text-[#C5A880] text-xs font-semibold tracking-widest uppercase backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Curators of Bespoke Sri Lanka Journeys</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-serif-luxury font-semibold tracking-tight text-white leading-[1.1] max-w-4xl mx-auto"
          >
            Experience Sri Lanka in <span className="italic text-[#C5A880]">Unrivaled Elegance</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-base sm:text-lg text-stone-300 max-w-2xl mx-auto font-light leading-relaxed"
          >
            Discover ancient UNESCO citadels, colonial tea estates, and wild leopard safaris with guaranteed capacity, terrain-aware logistics, and dedicated private chauffeurs.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            className="pt-4 flex flex-wrap justify-center gap-4"
          >
            <Link to="/plan-my-trip">
              <motion.button
                {...buttonPressProps}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] font-bold text-sm tracking-wider uppercase shadow-2xl gold-shadow-bloom flex items-center gap-3"
              >
                <span>Curate Your Journey</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
            <a href="#signature-collections">
              <motion.button
                {...buttonPressProps}
                className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-stone-400/40 text-stone-100 font-semibold text-sm tracking-wide backdrop-blur-md transition-all"
              >
                View Collections
              </motion.button>
            </a>
          </motion.div>
        </div>

        {/* Hero Scroll Indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center text-stone-400 text-xs gap-1.5 animate-bounce">
          <span className="tracking-widest uppercase text-[10px]">Scroll</span>
          <ChevronRight className="w-4 h-4 rotate-90" />
        </div>
      </section>

      {/* FLOATING QUICK-INQUIRY BAR */}
      <QuickInquiryBar />

      {/* SECTION 3: LIVE ISLAND INTELLIGENCE TICKER */}
      <section className="py-8 max-w-7xl mx-auto px-4 md:px-8 mt-6">
        <div className="bg-[#0F1A24] border border-stone-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg text-stone-200">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Field Intelligence
            </span>
            <span className="text-xs text-stone-400 hidden sm:inline">Updated 15 mins ago from certified guides</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto text-xs">
            <div className="flex items-center gap-2 bg-[#0B131F] px-3 py-2 rounded-xl border border-stone-800">
              <Wind className="w-4 h-4 text-sky-400" />
              <div>
                <span className="font-semibold text-stone-200">Nuwara Eliya:</span>{' '}
                <span className="text-stone-400">16°C, Clear Tea Trails</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#0B131F] px-3 py-2 rounded-xl border border-stone-800">
              <Mountain className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-semibold text-stone-200">Yala Block 1:</span>{' '}
                <span className="text-stone-400">Dry, Optimal Tracking</span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#0B131F] px-3 py-2 rounded-xl border border-stone-800">
              <Compass className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-semibold text-stone-200">Southern Coast:</span>{' '}
                <span className="text-stone-400">Calm Seas, Whale Season</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: CURATED SIGNATURE COLLECTIONS */}
      <section id="signature-collections" className="py-20 max-w-7xl mx-auto px-4 md:px-8 space-y-12">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <motion.div
            variants={slideUpVariants}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="space-y-3"
          >
            <span className="text-xs font-mono tracking-widest text-[#C5A880] uppercase font-semibold">
              Bespoke Sri Lankan Expeditions
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif-luxury font-bold text-[#0B131F]">
              Curated Signature Collections
            </h2>
            <p className="text-stone-600 max-w-xl text-sm leading-relaxed">
              Each itinerary is handcrafted with private chauffeur transport, handpicked luxury accommodations, and guaranteed monument and safari reservations.
            </p>
          </motion.div>

          <Link to="/destinations">
            <motion.button
              {...buttonPressProps}
              className="text-xs font-semibold text-[#134E4A] hover:text-[#0B131F] flex items-center gap-1.5 border-b border-[#134E4A] pb-1 transition-colors"
            >
              <span>Explore All Destinations</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </div>

        {/* Package Cards Grid with Stagger Animation */}
        <motion.div
          variants={staggerContainerVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {SIGNATURE_PACKAGES_DATA.map((pkg) => (
            <motion.div
              key={pkg.id}
              variants={staggerItemVariants}
              {...hoverLiftProps}
              className="bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-lg hover:shadow-2xl transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Package Image Banner */}
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={pkg.image}
                    alt={pkg.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-[#0B131F]/80 backdrop-blur-md border border-[#C5A880]/40 text-[#C5A880] text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                    {pkg.duration}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 space-y-3">
                  <span className="text-[11px] font-semibold text-[#134E4A] uppercase tracking-wider">
                    {pkg.region}
                  </span>
                  <h3 className="text-xl font-serif-luxury font-bold text-[#0B131F] leading-snug group-hover:text-[#134E4A] transition-colors">
                    {pkg.title}
                  </h3>
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {pkg.description}
                  </p>

                  <div className="pt-2 border-t border-stone-100 space-y-1.5">
                    {pkg.highlights.slice(0, 3).map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-stone-700">
                        <CheckCircle className="w-3.5 h-3.5 text-[#134E4A] shrink-0" />
                        <span className="truncate">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price & Action */}
              <div className="p-5 pt-0 flex items-center justify-between border-t border-stone-100 mt-4">
                <div>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider block">From</span>
                  <span className="text-lg font-bold text-[#0B131F] font-serif-luxury">
                    {formatPrice(pkg.priceUsd)}
                  </span>
                  <span className="text-[10px] text-stone-500"> / guest</span>
                </div>

                <motion.button
                  {...buttonPressProps}
                  onClick={() => setActiveModalPackage(pkg)}
                  className="px-3.5 py-2 rounded-xl bg-[#0B131F] hover:bg-[#134E4A] text-stone-100 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>View Itinerary</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#C5A880]" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* SECTION 2: THE CEYLONMATE DISTINCTION */}
      <section className="py-20 bg-[#0B131F] text-stone-100 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-16 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-mono tracking-widest text-[#C5A880] uppercase font-semibold">
              Logistics Excellence & High Hospitality
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif-luxury font-semibold tracking-tight text-stone-100">
              The CeylonMate Distinction
            </h2>
            <p className="text-stone-300 text-sm leading-relaxed">
              Why premier global travelers choose CeylonMate to curate and orchestrate their Sri Lanka private expeditions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Advantage 1 */}
            <motion.div
              {...hoverLiftProps}
              className="bg-[#0F1A24] border border-stone-800 p-8 rounded-2xl space-y-4 hover:border-[#C5A880]/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#134E4A]/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-3xl font-serif-luxury font-bold text-[#C5A880]">
                <AnimatedCounter end={100} suffix="%" /> Guaranteed
              </div>
              <h3 className="text-lg font-serif-luxury font-semibold text-stone-100">
                Guaranteed Capacity & Private Chauffeur
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Backed by real-time concurrency reservation tokens to eliminate vehicle, hotel, or guide overbooking completely.
              </p>
            </motion.div>

            {/* Advantage 2 */}
            <motion.div
              {...hoverLiftProps}
              className="bg-[#0F1A24] border border-stone-800 p-8 rounded-2xl space-y-4 hover:border-[#C5A880]/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#134E4A]/40 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
                <Mountain className="w-6 h-6" />
              </div>
              <div className="text-3xl font-serif-luxury font-bold text-[#C5A880]">
                <AnimatedCounter end={1.25} decimals={2} suffix="x Precision" />
              </div>
              <h3 className="text-lg font-serif-luxury font-semibold text-stone-100">
                Terrain-Aware Mountain Routing
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Calculated with true hill-country road elevation dynamics so you spend more time enjoying tea trails and less time in transit.
              </p>
            </motion.div>

            {/* Advantage 3 */}
            <motion.div
              {...hoverLiftProps}
              className="bg-[#0F1A24] border border-stone-800 p-8 rounded-2xl space-y-4 hover:border-[#C5A880]/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#134E4A]/40 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Wind className="w-6 h-6" />
              </div>
              <div className="text-3xl font-serif-luxury font-bold text-[#C5A880]">
                24/7 Live Desk
              </div>
              <h3 className="text-lg font-serif-luxury font-semibold text-stone-100">
                Live Ground Intelligence
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Real-time synchronization with active weather advisories, monument opening rules, and field reports from certified local guides.
              </p>
            </motion.div>

            {/* Advantage 4 */}
            <motion.div
              {...hoverLiftProps}
              className="bg-[#0F1A24] border border-stone-800 p-8 rounded-2xl space-y-4 hover:border-[#C5A880]/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#134E4A]/40 border border-amber-500/30 flex items-center justify-center text-[#D4AF37]">
                <Award className="w-6 h-6" />
              </div>
              <div className="text-3xl font-serif-luxury font-bold text-[#C5A880]">
                Zero Hidden Fees
              </div>
              <h3 className="text-lg font-serif-luxury font-semibold text-stone-100">
                Transparent Authoritative Pricing
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Itemized breakdown of vehicle mileage, licensed chauffeur day-rates, and monument entry passes with zero hidden markups.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SECTION 4: PRIVATE FLEET & MULTILINGUAL CHAUFFEURS */}
      <section className="py-20 max-w-7xl mx-auto px-4 md:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-mono tracking-widest text-[#134E4A] uppercase font-semibold">
            Unrivaled Comfort & Safety
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif-luxury font-bold text-[#0B131F]">
            Our Private Fleet & Certified Chauffeur Guides
          </h2>
          <p className="text-stone-600 text-sm leading-relaxed">
            All vehicles are company-owned, climate-controlled, equipped with Wi-Fi, and piloted by English/German/French fluent SLTDA-licensed chauffeur guides.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Fleet 1: Toyota KDH VIP Van */}
          <motion.div
            {...hoverLiftProps}
            className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xl flex flex-col sm:flex-row group"
          >
            <div className="sm:w-1/2 relative h-56 sm:h-auto overflow-hidden">
              <img
                src={FLEET_IMAGES.kdhVan}
                alt="Toyota KDH Super GL VIP Van"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="sm:w-1/2 p-6 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-[#134E4A] uppercase tracking-wider">
                  Executive VIP Group Transport
                </span>
                <h3 className="text-xl font-serif-luxury font-bold text-[#0B131F]">
                  Toyota KDH Super GL VIP Van
                </h3>
                <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                  Dual air-conditioned luxury seating with reclining leather armchairs, onboard Wi-Fi, luggage space for 6 large bags.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-stone-500 pt-2 border-t border-stone-100">
                <span className="flex items-center gap-1 font-semibold text-[#0B131F]">
                  <Users className="w-3.5 h-3.5 text-[#134E4A]" /> Up to 6 Passengers
                </span>
                <span className="flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-[#134E4A]" /> VIP Leather Interior
                </span>
              </div>
            </div>
          </motion.div>

          {/* Fleet 2: Mercedes E-Class */}
          <motion.div
            {...hoverLiftProps}
            className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xl flex flex-col sm:flex-row group"
          >
            <div className="sm:w-1/2 relative h-56 sm:h-auto overflow-hidden">
              <img
                src={FLEET_IMAGES.mercedes}
                alt="Mercedes-Benz E-Class Sedan"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="sm:w-1/2 p-6 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-[#134E4A] uppercase tracking-wider">
                  Couple & Solo Executive Travel
                </span>
                <h3 className="text-xl font-serif-luxury font-bold text-[#0B131F]">
                  Mercedes-Benz E-Class Sedan
                </h3>
                <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                  Superior German engineering, whisper-quiet cabin acoustics, ideal for coastal expressway transfers and romantic getaways.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-stone-500 pt-2 border-t border-stone-100">
                <span className="flex items-center gap-1 font-semibold text-[#0B131F]">
                  <Users className="w-3.5 h-3.5 text-[#134E4A]" /> Up to 3 Passengers
                </span>
                <span className="flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-[#134E4A]" /> Premium Prestige
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="text-center pt-4">
          <Link to="/fleet-and-guides">
            <motion.button
              {...buttonPressProps}
              className="px-6 py-3 rounded-xl bg-[#0B131F] hover:bg-[#134E4A] text-stone-100 font-semibold text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-2"
            >
              <span>Explore Full Fleet & Chauffeur Bios</span>
              <ArrowRight className="w-4 h-4 text-[#C5A880]" />
            </motion.button>
          </Link>
        </div>
      </section>

      {/* SECTION 5: TESTIMONIALS & SLTDA BADGES */}
      <section className="py-20 bg-[#F4EFEA] border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono tracking-widest text-[#134E4A] uppercase font-semibold">
              Guest Stories & Recognition
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif-luxury font-bold text-[#0B131F]">
              Reflections of Elegance
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-md space-y-4">
              <div className="flex items-center gap-1 text-[#D4AF37]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-xs text-stone-700 italic leading-relaxed">
                "CeylonMate transformed our two-week honeymoon into a seamless dream. Our private chauffeur guide knew every hidden viewpoint in Nuwara Eliya and arranged effortless Yala safari access."
              </p>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs font-bold text-[#0B131F]">Lord & Lady Harrington</span>
                <span className="text-[10px] text-stone-500">London, UK</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-md space-y-4">
              <div className="flex items-center gap-1 text-[#D4AF37]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-xs text-stone-700 italic leading-relaxed">
                "The 1.25x hill country transit estimates were spot-on! We arrived at our tea estate bungalow relaxed and stress-free. Truly authoritative luxury service."
              </p>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs font-bold text-[#0B131F]">Dr. Aris Thorne</span>
                <span className="text-[10px] text-stone-500">Zurich, Switzerland</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-md space-y-4">
              <div className="flex items-center gap-1 text-[#D4AF37]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-xs text-stone-700 italic leading-relaxed">
                "CeylonMate's live ground intelligence kept us updated on weather and sea conditions before our Mirissa whale expedition. Highly recommended!"
              </p>
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs font-bold text-[#0B131F]">Claire & Jean-Luc Vasseur</span>
                <span className="text-[10px] text-stone-500">Paris, France</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ITINERARY DETAIL MODAL */}
      <AnimatePresence>
        {activeModalPackage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              variants={scaleInModalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative w-full max-w-3xl max-h-[90vh] bg-[#0F1A24] border border-stone-700 rounded-2xl shadow-2xl overflow-hidden text-stone-100 flex flex-col"
            >
              {/* Modal Header */}
              <div className="relative p-6 border-b border-stone-800 bg-[#0B131F] flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-[#C5A880] uppercase tracking-wider">
                    {activeModalPackage.duration}
                  </span>
                  <h3 className="text-2xl font-serif-luxury font-bold text-stone-100">
                    {activeModalPackage.title}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveModalPackage(null)}
                  className="p-2 text-stone-400 hover:text-white rounded-full hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                <p className="text-sm text-stone-300 leading-relaxed">
                  {activeModalPackage.description}
                </p>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                    Day-by-Day Experience Schedule
                  </h4>
                  <div className="space-y-3">
                    {activeModalPackage.itinerary.map((item) => (
                      <div key={item.day} className="p-4 bg-[#0B131F] rounded-xl border border-stone-800 space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#C5A880]">
                          <span className="px-2 py-0.5 rounded bg-[#134E4A] text-emerald-200">Day {item.day}</span>
                          <span>{item.title}</span>
                        </div>
                        <p className="text-xs text-stone-400 leading-relaxed pl-1 pt-1">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer CTA */}
              <div className="p-6 border-t border-stone-800 bg-[#0B131F] flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-400 block">Total Package Quote</span>
                  <span className="text-xl font-bold font-serif-luxury text-[#C5A880]">
                    {formatPrice(activeModalPackage.priceUsd)} / guest
                  </span>
                </div>
                <motion.button
                  {...buttonPressProps}
                  onClick={() => {
                    const pkgId = activeModalPackage.id;
                    setActiveModalPackage(null);
                    navigate(`/plan-my-trip?package=${pkgId}`);
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-[#0B131F] font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2"
                >
                  <span>Customize This Journey</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
