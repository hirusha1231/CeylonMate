import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Compass, Clock, MapPin, Sparkles, ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import { api } from '../services/api';
import { buttonPressProps } from '../utils/animations';
import { useCurrency } from '../context/CurrencyContext';
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

export const SignatureJourneysPage: React.FC = () => {
  const navigate = useNavigate();
  const [journeys, setJourneys] = useState<SignatureJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJourney, setSelectedJourney] = useState<SignatureJourney | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    const fetchJourneys = async () => {
      try {
        setLoading(true);
        const res = await api.get<SignatureJourney[]>('/api/journeys/signature');
        setJourneys(res.data);
      } catch (err) {
        console.error('Failed to fetch public signature journeys:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJourneys();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B131F] text-stone-100 font-sans">
      {/* Hero Banner Section */}
      <section className="relative py-20 px-4 md:px-8 bg-gradient-to-b from-[#0F1A24] to-[#0B131F] border-b border-stone-800">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#134E4A]/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Bespoke Sri Lankan Expeditions</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-serif-luxury font-bold text-stone-100 tracking-tight">
            Curated Signature Collections
          </h1>
          <p className="text-stone-400 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Handcrafted luxury itineraries with private chauffeur transport, handpicked heritage accommodations, and guaranteed monument & safari reservations.
          </p>
        </div>
      </section>

      {/* Journeys Catalog Section */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2].map(i => (
              <div key={i} className="h-96 bg-[#0F1A24] border border-stone-800 rounded-2xl animate-pulse p-4" />
            ))}
          </div>
        ) : journeys.length === 0 ? (
          <div className="text-center py-20 bg-[#0F1A24] border border-stone-800 rounded-2xl p-8 space-y-4">
            <Compass className="w-12 h-12 text-[#C5A880] mx-auto" />
            <h3 className="text-xl font-serif-luxury text-stone-200">No Signature Journeys Available</h3>
            <p className="text-xs text-stone-400">Please check back soon for newly published bespoke luxury collections.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {journeys.map(journey => (
              <motion.div
                key={journey.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-[#0F1A24] border border-stone-800 hover:border-[#C5A880]/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between transition-all duration-300"
              >
                {/* Image Header */}
                <div className="relative h-64 w-full overflow-hidden bg-slate-900">
                  <img
                    src={journey.heroImageUrl || 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=800'}
                    alt={journey.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F1A24] via-transparent to-black/30" />

                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-slate-950/80 border border-[#C5A880]/40 text-[#C5A880] text-xs font-mono font-semibold flex items-center gap-1.5 backdrop-blur-md">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{journey.durationDays} Days / {journey.durationNights} Nights</span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 space-y-1">
                    <h2 className="text-2xl font-serif-luxury font-bold text-stone-100 drop-shadow-md">
                      {journey.title}
                    </h2>
                    {journey.destinationsCovered && (
                      <div className="flex items-center gap-1 text-xs text-[#C5A880] font-mono">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
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

                    {/* Highlights List */}
                    {journey.highlights && journey.highlights.length > 0 && (
                      <div className="pt-2 space-y-1.5">
                        {journey.highlights.map((hl, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-stone-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A880] shrink-0 mt-0.5" />
                            <span>{hl}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pricing & CTA */}
                  <div className="pt-4 border-t border-stone-800 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono block">Starting Price</span>
                      <span className="text-lg font-bold font-mono text-[#D4AF37]">
                        {formatPrice(journey.startingPriceUsd)}
                      </span>
                    </div>

                    <motion.button
                      {...buttonPressProps}
                      onClick={() => {
                        navigate(`/book-journey/${journey.id}`);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                    >
                      <span>Book This Journey</span>
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

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
    </div>
  );
};

export default SignatureJourneysPage;
