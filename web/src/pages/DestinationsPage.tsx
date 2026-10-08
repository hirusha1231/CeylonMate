import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, MapPin, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Heart, Clock, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router';
import { api } from '../services/api';
import { fadeInVariants, buttonPressProps, hoverLiftProps, staggerContainerVariants, staggerItemVariants } from '../utils/animations';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../context/ToastContext';
import { CuratedBookingModal } from '../components/booking/CuratedBookingModal';

export interface SignatureJourney {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  heroImageUrl: string;
  galleryImages: string[];
  durationDays: number;
  durationNights: number;
  startingPriceUsd: number;
  startingPriceLkr: number;
  destinationsCovered: string;
  highlights: string[];
  isPublished: boolean;
}

type DurationFilterOption = 'all' | '1-4' | '5-7' | '8-10' | '11+';

interface DurationOption {
  id: DurationFilterOption;
  label: string;
  min?: number;
  max?: number;
}

const DURATION_OPTIONS: DurationOption[] = [
  { id: 'all', label: 'All Durations' },
  { id: '1-4', label: '1 - 4 Days', min: 1, max: 4 },
  { id: '5-7', label: '5 - 7 Days', min: 5, max: 7 },
  { id: '8-10', label: '8 - 10 Days', min: 8, max: 10 },
  { id: '11+', label: '11+ Days', min: 11, max: Infinity },
];

export const DestinationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [journeys, setJourneys] = useState<SignatureJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDuration, setSelectedDuration] = useState<DurationFilterOption>('all');
  const [selectedJourney, setSelectedJourney] = useState<SignatureJourney | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleBookJourney = (journey: SignatureJourney) => {
    if (!user) {
      showToast('Sign In Required', 'Please sign in to book a curated signature journey.', 'info');
      navigate('/', { state: { openAuth: true, from: `/book-journey/${journey.id}` } });
      return;
    }
    setSelectedJourney(journey);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const fetchJourneys = async () => {
      try {
        setLoading(true);
        const res = await api.get<SignatureJourney[]>('/api/journeys/signature');
        if (Array.isArray(res.data)) {
          setJourneys(res.data);
        } else {
          setJourneys([]);
        }
      } catch (err) {
        console.error('Failed to load signature journeys from API:', err);
        setJourneys([]);
      } finally {
        setLoading(false);
      }
    };
    fetchJourneys();
  }, []);

  const categories = ['All', 'Heritage & Culture', 'Wildlife & Safaris', 'Highland Railway', 'Coastal Riviera'];

  const filteredJourneys = useMemo(() => {
    return journeys.filter((j) => {
      // Category filter
      if (selectedCategory !== 'All') {
        const catLower = selectedCategory.toLowerCase();
        const titleLower = j.title.toLowerCase();
        const destLower = j.destinationsCovered.toLowerCase();
        if (catLower.includes('heritage') || catLower.includes('culture')) {
          if (!titleLower.includes('cultural') && !destLower.includes('sigiriya') && !destLower.includes('kandy')) return false;
        } else if (catLower.includes('wildlife') || catLower.includes('safaris')) {
          if (!titleLower.includes('wild') && !destLower.includes('yala')) return false;
        } else if (catLower.includes('railway') || catLower.includes('highland')) {
          if (!titleLower.includes('highland') && !destLower.includes('nuwara') && !destLower.includes('ella')) return false;
        } else if (catLower.includes('coastal') || catLower.includes('riviera')) {
          if (!titleLower.includes('coastal') && !titleLower.includes('ayurvedic') && !destLower.includes('galle') && !destLower.includes('mirissa')) return false;
        }
      }

      // Duration filter
      if (selectedDuration !== 'all') {
        const days = Number(j.durationDays) || 0;
        const option = DURATION_OPTIONS.find((opt) => opt.id === selectedDuration);
        if (option && option.min !== undefined) {
          const min = option.min;
          const max = option.max ?? Infinity;
          if (days < min || days > max) return false;
        }
      }

      return true;
    });
  }, [journeys, selectedCategory, selectedDuration]);

  const getCountForDuration = (optionId: DurationFilterOption) => {
    if (optionId === 'all') return journeys.length;
    const option = DURATION_OPTIONS.find((opt) => opt.id === optionId);
    if (!option || option.min === undefined) return 0;
    const min = option.min;
    const max = option.max ?? Infinity;
    return journeys.filter((j) => {
      const days = Number(j.durationDays) || 0;
      return days >= min && days <= max;
    }).length;
  };

  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-[#0B131F] text-stone-100 font-sans space-y-12 pb-24"
    >
      {/* Hero Banner Header */}
      <section className="relative py-20 px-4 md:px-8 bg-gradient-to-b from-[#0F1A24] to-[#0B131F] border-b border-stone-800">
        <div className="max-w-7xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#134E4A]/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Sri Lanka Curated Signature Expeditions</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif-luxury font-bold text-stone-100 tracking-tight">
            Curated Signature Collections
          </h1>

          <p className="text-stone-400 max-w-3xl mx-auto text-sm md:text-base leading-relaxed">
            Find custom travel plans with private drivers, luxury stays, expert guides, and guaranteed tickets.
          </p>

          {/* Duration Filters */}
          <div className="pt-4 max-w-4xl mx-auto">
            <div className="bg-[#0F1A24]/80 border border-stone-800/90 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                <div className="flex items-center gap-2 text-xs font-mono text-[#C5A880] uppercase tracking-wider font-semibold">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter by Duration</span>
                </div>
                {(selectedDuration !== 'all' || selectedCategory !== 'All') && (
                  <button
                    onClick={() => {
                      setSelectedDuration('all');
                      setSelectedCategory('All');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-[#C5A880] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All Filters</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {DURATION_OPTIONS.map((option) => {
                  const isActive = selectedDuration === option.id;
                  const count = getCountForDuration(option.id);
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedDuration(option.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer border ${
                        isActive
                          ? 'bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-[#0B131F] font-bold border-[#D4AF37] shadow-lg'
                          : 'bg-[#0B131F]/80 border-stone-800 text-stone-300 hover:border-[#C5A880]/50'
                      }`}
                    >
                      <Clock className={`w-3.5 h-3.5 ${isActive ? 'text-[#0B131F]' : 'text-[#C5A880]'}`} />
                      <span>{option.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-sans font-bold ${
                          isActive
                            ? 'bg-[#0B131F]/20 text-[#0B131F]'
                            : 'bg-stone-800/80 text-stone-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold font-mono transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-stone-200 text-[#0B131F] font-bold shadow-md'
                    : 'bg-[#0F1A24] border border-stone-700 text-stone-300 hover:border-[#C5A880]/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Journeys Grid Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-96 bg-[#0F1A24] border border-stone-800 rounded-2xl animate-pulse p-4" />
            ))}
          </div>
        ) : filteredJourneys.length === 0 ? (
          <div className="text-center py-20 bg-[#0F1A24] border border-stone-800 rounded-2xl p-8 space-y-4">
            <Compass className="w-12 h-12 text-[#C5A880] mx-auto" />
            <h3 className="text-xl font-serif-luxury text-stone-200">No Signature Collections Found</h3>
            <p className="text-xs text-stone-400">Try selecting another filter or explore all collections.</p>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSelectedDuration('all');
              }}
              className="px-4 py-2 rounded-xl bg-[#134E4A] text-emerald-200 text-xs font-semibold font-mono cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <motion.div
            variants={staggerContainerVariants}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {filteredJourneys.map((journey) => (
              <motion.div
                key={journey.id}
                variants={staggerItemVariants}
                {...hoverLiftProps}
                className="group bg-[#0F1A24] border border-stone-800 hover:border-[#C5A880]/60 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between transition-all duration-300"
              >
                {/* Image Header Banner */}
                <div className="relative h-64 w-full overflow-hidden bg-slate-900">
                  <img
                    src={journey.heroImageUrl}
                    alt={journey.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F1A24] via-transparent to-black/40" />



                  <div className="absolute bottom-4 left-4 right-4 space-y-1">
                    <h2 className="text-2xl font-serif-luxury font-bold text-stone-100 drop-shadow-md">
                      {journey.title}
                    </h2>
                    {journey.destinationsCovered && (
                      <div className="flex items-center gap-1.5 text-xs text-[#C5A880] font-mono">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-[#D4AF37]" />
                        <span>{journey.destinationsCovered}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <p className="text-xs text-[#C5A880] font-semibold italic">
                      "{journey.tagline}"
                    </p>
                    <p className="text-xs text-stone-300 leading-relaxed line-clamp-3">
                      {journey.description}
                    </p>

                    {/* Key Highlights */}
                    {journey.highlights && journey.highlights.length > 0 && (
                      <div className="pt-2 space-y-1.5">
                        <span className="text-[10px] font-mono uppercase text-stone-400 block font-semibold">Curated Highlights:</span>
                        {journey.highlights.map((hl, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-stone-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A880] shrink-0 mt-0.5" />
                            <span>{hl}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Journey CTA */}
                  <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-4">
                    <motion.button
                      {...buttonPressProps}
                      onClick={() => handleBookJourney(journey)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                    >
                      <span>Book This Journey</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Booking Modal */}
      <CuratedBookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedPackage={selectedJourney ? {
          id: selectedJourney.id,
          title: selectedJourney.title,
          priceUsd: selectedJourney.startingPriceUsd,
          priceLkr: selectedJourney.startingPriceLkr,
          durationDays: selectedJourney.durationDays,
          durationNights: selectedJourney.durationNights,
          destinationsCovered: selectedJourney.destinationsCovered,
          highlights: selectedJourney.highlights,
          imageUrl: selectedJourney.heroImageUrl
        } : null}
      />
    </motion.div>
  );
};
