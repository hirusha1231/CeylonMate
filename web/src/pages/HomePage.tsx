import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, MapPin, Calendar, Users, Sparkles, ShieldCheck, Mountain, Wind,
  CheckCircle, ArrowRight, Star, Clock, Car, ChevronRight, ChevronLeft, X, PhoneCall, Award, CloudSun, Gauge, Quote, CheckCircle2, Heart
} from 'lucide-react';
import { AnimatedCounter } from '../components/common/Counter';
import { QuickInquiryBar } from '../components/common/QuickInquiryBar';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../context/ToastContext';
import {
  fadeInVariants, slideUpVariants, staggerContainerVariants, staggerItemVariants,
  hoverLiftProps, buttonPressProps, scaleInModalVariants
} from '../utils/animations';
import { api } from '../services/api';
import { HERO_VIDEO_FALLBACK, FLEET_IMAGES, SIGNATURE_PACKAGES_DATA } from '../utils/mediaData';
import { FleetShowcaseSection } from '../components/fleet/FleetShowcaseSection';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { formatPrice, currency } = useCurrency();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [liveJourneys, setLiveJourneys] = useState<any[]>([]);

  const handleBookJourney = (pkgId: string | number) => {
    if (!user) {
      showToast('Sign In Required', 'Please sign in to book a curated signature journey.', 'info');
      navigate('/', { state: { openAuth: true, from: `/book-journey/${pkgId}` } });
      return;
    }
    navigate(`/book-journey/${pkgId}`);
  };

  useEffect(() => {
    const fetchSignatureJourneys = async () => {
      try {
        const res = await api.get('/api/journeys/signature');
        if (res.data && res.data.length > 0) {
          setLiveJourneys(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch signature journeys for homepage:', err);
      }
    };
    fetchSignatureJourneys();
  }, []);

  // Floating Bar State
  const [selectedRegion, setSelectedRegion] = useState('Cultural Heartland');
  const [dates, setDates] = useState('');
  const [guests, setGuests] = useState('2 Guests');
  const [travelStyle, setTravelStyle] = useState('Bespoke Luxury');

  // Modal Detail & Gallery State
  const [activeModalPackage, setActiveModalPackage] = useState<any | null>(null);
  const [activeGalleryImage, setActiveGalleryImage] = useState<string | null>(null);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const reviewsScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = reviewsScrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        el.scrollBy({
          left: e.deltaY * 1.5,
          behavior: 'auto'
        });
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handleReviewsScroll = () => {
    const el = reviewsScrollRef.current;
    if (!el) return;
    const cardWidth = 380;
    const currentIdx = Math.min(4, Math.max(0, Math.round(el.scrollLeft / cardWidth)));
    setActiveReviewIndex(currentIdx);
  };

  const scrollReviewsTo = (index: number) => {
    const el = reviewsScrollRef.current;
    if (!el) return;
    const cardWidth = 390;
    el.scrollTo({
      left: index * cardWidth,
      behavior: 'smooth'
    });
    setActiveReviewIndex(index);
  };

  const scrollReviewsBy = (dir: 'left' | 'right') => {
    const el = reviewsScrollRef.current;
    if (!el) return;
    const cardWidth = 390;
    el.scrollBy({
      left: dir === 'left' ? -cardWidth : cardWidth,
      behavior: 'smooth'
    });
  };

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
                className="px-7 py-4 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] font-bold text-sm tracking-wider uppercase shadow-2xl gold-shadow-bloom flex items-center gap-2.5 cursor-pointer"
              >
                <span>Curate Your Journey</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
            <a href="#signature-collections">
              <motion.button
                {...buttonPressProps}
                className="px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 border border-stone-400/40 text-stone-100 font-semibold text-sm tracking-wide backdrop-blur-md transition-all cursor-pointer"
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

      {/* SECTION 3: LIVE ISLAND INTELLIGENCE TICKER & DESTINATION SAFETY HUB LAUNCHER */}
      <section className="py-8 max-w-7xl mx-auto px-4 md:px-8 mt-6">
        <div className="bg-[#0F1A24] border border-stone-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg text-stone-200">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Multi-Agent Intelligence Network
            </span>
            <span className="text-xs text-stone-400 hidden sm:inline">On-Demand Execution</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="hidden lg:flex items-center gap-2 bg-[#0B131F] px-3 py-2 rounded-xl border border-stone-800 text-xs">
              <CloudSun className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-semibold text-stone-200">Microclimate Radar:</span>{' '}
                <span className="text-stone-400">Live 3-Day Telemetry Active</span>
              </div>
            </div>

            <Link to="/operations/capacity-dispatch">
              <motion.button
                {...buttonPressProps}
                className="px-4 py-2 rounded-xl bg-[#1C1405] border border-amber-500/50 hover:bg-amber-900/60 text-amber-300 hover:text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Gauge className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Fleet & Route Dispatch ➔</span>
              </motion.button>
            </Link>

            <Link to="/operations/destinations-safety">
              <motion.button
                {...buttonPressProps}
                className="px-4 py-2 rounded-xl bg-emerald-950 border border-emerald-500/50 hover:bg-emerald-900/80 text-emerald-300 hover:text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <CloudSun className="w-3.5 h-3.5 text-emerald-400" />
                <span>Destination & Safety Hub ➔</span>
              </motion.button>
            </Link>
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

          <Link to="/signature-journeys">
            <motion.button
              {...buttonPressProps}
              className="text-xs font-semibold text-[#134E4A] hover:text-[#0B131F] flex items-center gap-1.5 border-b border-[#134E4A] pb-1 transition-colors"
            >
              <span>Explore All Signature Collections</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
        </div>

        {liveJourneys.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8 space-y-3">
            <Compass className="w-10 h-10 text-[#C5A880] mx-auto" />
            <h3 className="text-lg font-serif-luxury font-bold text-[#0B131F]">No Signature Expeditions Published Yet</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Certified guides and concierge travel agents can publish new curated expeditions from the Agent & Guide console.
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainerVariants}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {liveJourneys.map((pkg: any) => {
              const title = pkg.title;
              const image = pkg.heroImageUrl || pkg.image;
              const region = pkg.destinationsCovered || pkg.region || 'Sri Lanka';
              const description = pkg.description;
              const highlights = pkg.highlights || [];

              return (
                <motion.div
                  key={pkg.id}
                  variants={staggerItemVariants}
                  {...hoverLiftProps}
                  onClick={() => {
                    setActiveModalPackage(pkg);
                    setActiveGalleryImage(image);
                  }}
                  className="bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-lg hover:shadow-2xl transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    {/* Package Image Banner */}
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=800';
                        }}
                      />
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        {region ? (
                          <div className="bg-[#0B131F]/80 backdrop-blur-md border border-[#C5A880]/40 text-[#C5A880] text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                            {region}
                          </div>
                        ) : <div />}
                        {pkg.durationDays > 0 && (
                          <div className="bg-slate-950/80 backdrop-blur-md border border-stone-700 text-stone-200 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                            <Clock className="w-3 h-3 text-[#C5A880]" />
                            <span>{pkg.durationDays} Days</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-3">
                      <span className="text-[11px] font-semibold text-[#134E4A] uppercase tracking-wider truncate block">
                        {region}
                      </span>
                      <h3 className="text-xl font-serif-luxury font-bold text-[#0B131F] leading-snug group-hover:text-[#134E4A] transition-colors line-clamp-1">
                        {title}
                      </h3>
                      <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {description}
                      </p>

                      <div className="pt-2 border-t border-stone-100 space-y-1.5">
                        {highlights.slice(0, 3).map((h: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-stone-700">
                            <CheckCircle className="w-3.5 h-3.5 text-[#134E4A] shrink-0" />
                            <span className="truncate">{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Collection Action */}
                  <div className="p-5 pt-0 flex items-center justify-end border-t border-stone-100 mt-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalPackage(pkg);
                        setActiveGalleryImage(image);
                      }}
                      className="p-2.5 rounded-full bg-[#134E4A] text-white hover:bg-[#0B131F] transition-colors cursor-pointer"
                      title="View Details & Gallery"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
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
        <FleetShowcaseSection layout="horizontal-cards" showTitle={true} />

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

      {/* SECTION 5: TESTIMONIALS & SLTDA BADGES (Horizontal Mouse-Wheel Scrollable Track) */}
      <section
        className="py-24 bg-[#F4EFEA] border-t border-stone-200 relative overflow-hidden"
      >
        {/* Animated Subtle Ambient Background Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.12, 0.22, 0.12],
            x: [-20, 20, -20],
            y: [-10, 10, -10]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/4 w-[600px] h-[350px] bg-[#C5A880]/20 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.08, 0.18, 0.08],
            x: [20, -20, 20],
            y: [10, -10, 10]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-10 right-1/4 w-[500px] h-[300px] bg-[#134E4A]/15 rounded-full blur-3xl pointer-events-none"
        />

        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-8 relative z-10">
          {/* Animated Header with Interactive Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-stone-200/80 pb-6">
            <motion.div
              variants={slideUpVariants}
              initial="initial"
              whileInView="whileInView"
              viewport={{ once: true, margin: "-50px" }}
              className="space-y-2.5 max-w-xl"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#134E4A]/10 border border-[#134E4A]/20 text-xs font-mono tracking-widest text-[#134E4A] uppercase font-bold"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] animate-spin-slow" />
                <span>Guest Stories & Recognition</span>
              </motion.div>

              <h2 className="text-3xl sm:text-5xl font-serif-luxury font-bold text-[#0B131F] tracking-tight">
                Reflections of Elegance
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 font-light">
                Memories etched in time from travelers who experienced Sri Lanka with CeylonMate.
              </p>
            </motion.div>

            {/* Navigation Buttons & Mouse Wheel Scroll Hint */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-stone-500 bg-white/80 border border-stone-200/80 px-3 py-1.5 rounded-full shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />

              </div>
              <span className="text-xs font-mono font-bold text-stone-500 tracking-wider">
                0{activeReviewIndex + 1} / 05
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollReviewsBy('left')}
                  className="p-2.5 rounded-full bg-white border border-stone-200 text-stone-700 hover:bg-[#134E4A] hover:text-white hover:border-[#134E4A] transition-all shadow-sm cursor-pointer"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollReviewsBy('right')}
                  className="p-2.5 rounded-full bg-white border border-stone-200 text-stone-700 hover:bg-[#134E4A] hover:text-white hover:border-[#134E4A] transition-all shadow-sm cursor-pointer"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 5 Reviews Horizontal Scrollable Rail (Mouse Wheel Rotates Horizontally) */}
          <div
            ref={reviewsScrollRef}
            onScroll={handleReviewsScroll}
            className="flex gap-6 sm:gap-8 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-4 px-1 select-none"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {[
              {
                id: 1,
                name: "Kasun & Chathurika Senanayake",
                location: "Melbourne, Australia",
                trip: "Family Heritage & Nuwara Eliya Highlands",
                quote: "CeylonMate curated a breathtaking homecoming expedition for our family. From our private Sigiriya villa to the scenic tea bungalows in Nuwara Eliya, our chauffeur guide's hospitality was world-class.",
                rating: 5,
              },
              {
                id: 2,
                name: "Lord & Lady Harrington",
                location: "London, UK",
                trip: "Bespoke Honeymoon & Tea Trails",
                quote: "CeylonMate transformed our two-week honeymoon into a seamless dream. Our private chauffeur guide knew every hidden viewpoint in Nuwara Eliya and arranged effortless Yala safari access.",
                rating: 5,
              },
              {
                id: 3,
                name: "Dr. Dinesh & Nilushi Jayawardena",
                location: "London, UK",
                trip: "Southern Coast & Hill Country Expedition",
                quote: "The 1.25x hill country transit estimates and real-time route physics were remarkably precise. We arrived at our Hatton tea estate bungalow completely relaxed. True Sri Lankan warmth meets Swiss precision.",
                rating: 5,
              },
              {
                id: 4,
                name: "Dr. Aris Thorne",
                location: "Zurich, Switzerland",
                trip: "Cultural Triangle & Ella Trails",
                quote: "The 1.25x hill country transit estimates were spot-on! We arrived at our tea estate bungalow relaxed and stress-free. Truly authoritative luxury service with zero guesswork.",
                rating: 5,
              },
              {
                id: 5,
                name: "Malinda & Sanduni Wickramasinghe",
                location: "Singapore",
                trip: "Wildlife Safari & Whale Expedition",
                quote: "The live ground intelligence and bespoke safari dispatch in Yala made our expedition unforgettable. Highly recommend CeylonMate for anyone seeking authoritative, uncompromised luxury in Sri Lanka.",
                rating: 5,
              }
            ].map((review, idx) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.08 }}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                  boxShadow: "0 25px 50px -12px rgba(197, 168, 128, 0.25)",
                  transition: { duration: 0.3, ease: 'easeOut' }
                }}
                className="w-[340px] sm:w-[380px] md:w-[410px] shrink-0 snap-start bg-white p-7 rounded-2xl border border-stone-200/90 shadow-lg transition-all duration-300 space-y-4 relative group flex flex-col justify-between overflow-hidden cursor-pointer"
              >
                {/* Subtle Card Glow Top Edge */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C5A880] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[#D4AF37]">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current group-hover:scale-110 transition-transform duration-200" />
                      ))}
                    </div>
                    <motion.div
                      whileHover={{ rotate: 15, scale: 1.15 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <Quote className="w-6 h-6 text-[#C5A880]/30 group-hover:text-[#C5A880] transition-colors duration-300" />
                    </motion.div>
                  </div>

                  <p className="text-xs sm:text-sm text-stone-700 italic leading-relaxed font-serif min-h-[76px]">
                    "{review.quote}"
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#0B131F] block group-hover:text-[#134E4A] transition-colors">
                      {review.name}
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">{review.location}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#134E4A]/10 text-[#134E4A] text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 group-hover:bg-[#134E4A] group-hover:text-white transition-colors duration-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Verified
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* 5 Interactive Pagination Navigation Dots */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[0, 1, 2, 3, 4].map((dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => scrollReviewsTo(dotIdx)}
                className={`transition-all duration-300 rounded-full h-2 cursor-pointer ${activeReviewIndex === dotIdx
                    ? 'w-8 bg-[#134E4A]'
                    : 'w-2 bg-stone-300 hover:bg-[#C5A880]'
                  }`}
                title={`Jump to review ${dotIdx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ITINERARY & GALLERY DETAIL MODAL */}
      <AnimatePresence>
        {activeModalPackage && (() => {
          const isLive = !!activeModalPackage.heroImageUrl;
          const title = activeModalPackage.title;
          const mainImage = activeGalleryImage || activeModalPackage.heroImageUrl || activeModalPackage.image;
          const allImages = Array.from(new Set([
            activeModalPackage.heroImageUrl || activeModalPackage.image,
            ...(activeModalPackage.galleryImages || [])
          ].filter(Boolean))) as string[];
          const region = isLive ? (activeModalPackage.destinationsCovered || 'Sri Lanka') : activeModalPackage.region;
          const price = activeModalPackage.startingPriceUsd || activeModalPackage.priceUsd || 0;
          const highlights = activeModalPackage.highlights || [];

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                variants={scaleInModalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="relative w-full max-w-4xl max-h-[92vh] bg-[#0F1A24] border border-stone-700 rounded-2xl shadow-2xl overflow-hidden text-stone-100 flex flex-col"
              >
                {/* Modal Header */}
                <div className="relative p-6 border-b border-stone-800 bg-[#0B131F] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {activeModalPackage.durationDays > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#134E4A]/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#C5A880]" />
                          <span>{activeModalPackage.durationDays} Days Expedition</span>
                        </span>
                      )}
                      {region && (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-[#C5A880] uppercase tracking-wider">
                          <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>{region}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-stone-100">
                      {title}
                    </h3>
                    {activeModalPackage.tagline && (
                      <p className="text-xs text-[#C5A880] font-serif italic mt-0.5">
                        "{activeModalPackage.tagline}"
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setActiveModalPackage(null)}
                    className="p-2 text-stone-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                  {/* Gallery & Photo Display */}
                  <div className="space-y-3">
                    <div className="relative h-64 sm:h-80 w-full rounded-2xl overflow-hidden border border-stone-800 bg-slate-950 shadow-inner">
                      <img
                        src={mainImage}
                        alt={title}
                        className="w-full h-full object-cover transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    </div>

                    {/* Gallery Thumbnails Strip */}
                    {allImages.length > 1 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                          Expedition Photos ({allImages.length}):
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {allImages.map((imgUrl: string, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveGalleryImage(imgUrl)}
                              className={`relative h-16 w-24 rounded-xl overflow-hidden border shrink-0 transition-all cursor-pointer ${mainImage === imgUrl ? 'border-[#C5A880] ring-2 ring-[#C5A880]/50 scale-95' : 'border-stone-800 opacity-70 hover:opacity-100'
                                }`}
                            >
                              <img src={imgUrl} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Full Description */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                      Expedition Overview
                    </h4>
                    <p className="text-sm text-stone-300 leading-relaxed">
                      {activeModalPackage.description}
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  {highlights.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-stone-800">
                      <h4 className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                        Curated Highlights
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {highlights.map((h: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-stone-200 bg-slate-900/60 p-3 rounded-xl border border-stone-800/80">
                            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Day-by-day if available */}
                  {activeModalPackage.itinerary && activeModalPackage.itinerary.length > 0 && (
                    <div className="space-y-4 pt-2 border-t border-stone-800">
                      <h4 className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                        Day-by-Day Experience Schedule
                      </h4>
                      <div className="space-y-3">
                        {activeModalPackage.itinerary.map((item: any) => (
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
                  )}
                </div>

                {/* Modal Footer CTA */}
                <div className="p-6 border-t border-stone-800 bg-[#0B131F] flex items-center justify-end">
                  <motion.button
                    {...buttonPressProps}
                    onClick={() => {
                      const pkgId = activeModalPackage.id;
                      setActiveModalPackage(null);
                      handleBookJourney(pkgId);
                    }}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <span>Book This Journey</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
};
