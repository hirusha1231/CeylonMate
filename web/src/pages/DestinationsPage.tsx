import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Compass, Clock, MapPin, Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';
import { useNavigate } from 'react-router';
import { api } from '../services/api';
import { fadeInVariants, buttonPressProps, hoverLiftProps, staggerContainerVariants, staggerItemVariants } from '../utils/animations';
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

const FALLBACK_JOURNEYS: SignatureJourney[] = [
  {
    id: 'cultural-triangle-royal-heritage',
    title: 'Cultural Triangle & Royal Heritage',
    slug: 'cultural-triangle-royal-heritage',
    tagline: 'A 7-Day Royal Expedition Across Ancient Citadel Ruins, Sacred Relics & High Tea Slopes',
    description: 'Ascend to the ancient clouds of Sigiriya Rock Fortress before traversing lush emerald tea slopes in Ceylon\'s luxury highlands. Experience colonial heritage luxury in private tea planter bungalows combined with exclusive private chauffeur travel.',
    heroImageUrl: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=1600&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1546708973-b339540b5162?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1578637387939-43c525550085?q=80&w=800&auto=format&fit=crop'
    ],
    durationDays: 7,
    durationNights: 6,
    startingPriceUsd: 2450,
    startingPriceLkr: 750000,
    destinationsCovered: 'Sigiriya, Kandy, Nuwara Eliya, Colombo',
    highlights: [
      'Private chartered helicopter option to Sigiriya Rock fortress',
      'VIP access to Temple of the Tooth Relic sacred vault',
      'Highland Tea Tasting Masterclass with a Senior Ceylon Planter',
      'Private luxury chauffeur guide throughout the journey'
    ],
    isPublished: true
  },
  {
    id: 'wild-safaris-southern-coastal',
    title: 'Wild Safaris & Southern Coastal Sanctuary',
    slug: 'wild-safaris-southern-coastal',
    tagline: 'Immerse in Leopard Trackings at Yala National Park & Luxury Cliffside Ocean Living',
    description: 'Unrivalled luxury wildlife exploration paired with pristine Indian Ocean coastline retreat. Encounter leopards, sloth bears, and blue whales under expert private guide supervision.',
    heroImageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1600&auto=format&fit=crop',
    galleryImages: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1512100356356-de1b84283e18?q=80&w=800&auto=format&fit=crop'
    ],
    durationDays: 10,
    durationNights: 9,
    startingPriceUsd: 3800,
    startingPriceLkr: 1150000,
    destinationsCovered: 'Yala National Park, Weligama, Galle Fort, Mirissa',
    highlights: [
      'Private 4x4 Leopard Tracker Game Drives in Yala Block 1',
      'Exclusive sunset catamaran yacht trip along Mirissa coast',
      'Private architectural walk inside 16th-century Galle Fort',
      'Luxury oceanfront cliffside villa accommodations'
    ],
    isPublished: true
  },
  {
    id: 'highland-mist-railway',
    title: 'Tea Country Mist & Scenic Highland Railway',
    slug: 'highland-mist-railway',
    tagline: 'Private Luxury Carriage Ride Through Misty Bamboo Forests & Century Bungalows',
    description: 'Journey through emerald mountain gaps on Sri Lanka\'s iconic highland train line. Stay in secluded Victorian tea estate bungalows with private fireside dining.',
    heroImageUrl: 'https://images.unsplash.com/photo-1546708973-b339540b5162?q=80&w=1600&auto=format&fit=crop',
    galleryImages: [],
    durationDays: 5,
    durationNights: 4,
    startingPriceUsd: 1950,
    startingPriceLkr: 590000,
    destinationsCovered: 'Nuwara Eliya, Ella, Hatton, Kandy',
    highlights: [
      'First-Class Private Train Carriage Booking across Nine Arch Bridge',
      'Pekoe Trail private walking tour with waterfall tea stops',
      'Colonial bungalow fireside gourmet 5-course dinner'
    ],
    isPublished: true
  },
  {
    id: 'ayurvedic-coastal-sanctuary',
    title: 'Ayurvedic Wellness & Coastal Riviera Escape',
    slug: 'ayurvedic-coastal-sanctuary',
    tagline: 'Holistic Mind & Body Sanctuary Surrounded by Coconut Groves & Ocean Reefs',
    description: 'Rejuvenate under certified Ayurvedic physicians on pristine southern beaches. Includes daily custom wellness treatments, organic culinary dining, and oceanfront suites.',
    heroImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop',
    galleryImages: [],
    durationDays: 8,
    durationNights: 7,
    startingPriceUsd: 2850,
    startingPriceLkr: 870000,
    destinationsCovered: 'Bentota, Mirissa, Galle Fort, Tangalle',
    highlights: [
      'Personal Ayurvedic Doctor consultation & custom herbal regimen',
      'Daily oceanfront sunset yoga & meditation sessions',
      'Private reef snorkeling & marine safari excursion'
    ],
    isPublished: true
  }
];

export const DestinationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currency, formatPrice } = useCurrency();
  const [journeys, setJourneys] = useState<SignatureJourney[]>(FALLBACK_JOURNEYS);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedJourney, setSelectedJourney] = useState<SignatureJourney | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchJourneys = async () => {
      try {
        setLoading(true);
        const res = await api.get<SignatureJourney[]>('/api/journeys/signature');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setJourneys(res.data);
        }
      } catch (err) {
        console.warn('Backend signature journeys API unavailable, using curated collections:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchJourneys();
  }, []);

  const categories = ['All', 'Heritage & Culture', 'Wildlife & Safaris', 'Highland Railway', 'Coastal Riviera'];

  const filteredJourneys = journeys.filter((j) => {
    if (selectedCategory === 'All') return true;
    const catLower = selectedCategory.toLowerCase();
    const titleLower = j.title.toLowerCase();
    const destLower = j.destinationsCovered.toLowerCase();
    const taglineLower = j.tagline.toLowerCase();
    if (catLower.includes('heritage') || catLower.includes('culture')) {
      return titleLower.includes('cultural') || destLower.includes('sigiriya') || destLower.includes('kandy');
    }
    if (catLower.includes('wildlife') || catLower.includes('safaris')) {
      return titleLower.includes('wild') || destLower.includes('yala');
    }
    if (catLower.includes('railway') || catLower.includes('highland')) {
      return titleLower.includes('highland') || destLower.includes('nuwara') || destLower.includes('ella');
    }
    if (catLower.includes('coastal') || catLower.includes('riviera')) {
      return titleLower.includes('coastal') || titleLower.includes('ayurvedic') || destLower.includes('galle') || destLower.includes('mirissa');
    }
    return true;
  });

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

          {/* Category Chips */}
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold font-mono transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-[#0B131F] font-bold shadow-md'
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
              onClick={() => setSelectedCategory('All')}
              className="px-4 py-2 rounded-xl bg-[#134E4A] text-emerald-200 text-xs font-semibold font-mono"
            >
              Reset Category Filter
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
                    src={journey.heroImageUrl || 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=800'}
                    alt={journey.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F1A24] via-transparent to-black/40" />

                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-slate-950/80 border border-[#C5A880]/50 text-[#C5A880] text-xs font-mono font-semibold flex items-center gap-1.5 backdrop-blur-md">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{journey.durationDays} Days / {journey.durationNights} Nights</span>
                  </div>

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

                  {/* Pricing & CTA */}
                  <div className="pt-4 border-t border-stone-800 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono block">Starting Investment</span>
                      <span className="text-xl font-bold font-serif-luxury text-[#D4AF37]">
                        {formatPrice(journey.startingPriceUsd)}
                      </span>
                    </div>

                    <motion.button
                      {...buttonPressProps}
                      onClick={() => {
                        setSelectedJourney(journey);
                        setIsModalOpen(true);
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
