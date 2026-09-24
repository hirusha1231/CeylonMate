import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Compass, Sparkles, ChevronRight, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { DESTINATION_IMAGES } from '../utils/mediaData';
import { fadeInVariants, slideUpVariants, staggerContainerVariants, staggerItemVariants, hoverLiftProps, buttonPressProps, scaleInModalVariants } from '../utils/animations';

interface DestinationItem {
  id: string;
  name: string;
  tagline: string;
  region: string;
  image: string;
  description: string;
  attractions: string[];
  weather: string;
  season: string;
}

const DESTINATIONS_LIST: DestinationItem[] = [
  {
    id: 'sigiriya',
    name: 'Sigiriya Ancient Rock Citadel',
    tagline: '8th Wonder of the Ancient World',
    region: 'Cultural Heartland',
    image: DESTINATION_IMAGES.sigiriya,
    description: 'Rise above emerald jungle canopies to inspect King Kasyapa 5th-century sky fortress, mirror wall frescoes, and royal water gardens.',
    attractions: ['Water Gardens Walk', 'Frescoes Cave Sanctuary', 'Lion Paw Gate Ascension', 'Pidurangala Sunset Viewpoint'],
    weather: '28°C Sunshine',
    season: 'Year-Round Optimal',
  },
  {
    id: 'nuwara-eliya',
    name: 'Nuwara Eliya Tea Highlands',
    tagline: 'Little England of Ceylon',
    region: 'Highlands',
    image: DESTINATION_IMAGES.nuwaraEliya,
    description: 'Misty tea slopes, Tudor-style heritage bungalows, crisp mountain air, and century-old orthodox tea processing factories.',
    attractions: ['Grand Hotel High Tea', 'Pekoe Trail Walk', 'Horton Plains World End', 'Pedro Tea Estate Tasting'],
    weather: '16°C Misty Breeze',
    season: 'Prime Hiking Season',
  },
  {
    id: 'galle',
    name: 'Galle Dutch Fort UNESCO Citadel',
    tagline: '17th-Century Colonial Fortification',
    region: 'Southern Riviera',
    image: DESTINATION_IMAGES.galle,
    description: 'Cobblestone alleyways lined with artisan jewelers, oceanfront bastion ramparts, and restored Dutch merchant villas.',
    attractions: ['Flag Rock Bastion Sunset', 'Old Dutch Hospital Dining', 'Lighthouse Rampart Stroll', 'Maritime Museum'],
    weather: '29°C Tropical Ocean',
    season: 'South Coast Peak Season',
  },
  {
    id: 'yala',
    name: 'Yala National Park Sanctuary',
    tagline: 'Land of the Elusive Leopard',
    region: 'Deep South',
    image: DESTINATION_IMAGES.yala,
    description: 'Dense dry-zone scrub jungle boasting the highest density of leopards on Earth, alongside wild elephant herds and sloth bears.',
    attractions: ['Block 1 Dawn Safari', 'Sithulpawwa Rock Temple', 'Privately Guided Naturalist Jeep', 'Patnanangala Beach'],
    weather: '31°C Dry Optimal',
    season: 'Dry Zone Tracking Peak',
  },
  {
    id: 'ella',
    name: 'Ella Peak & Nine Arch Bridge',
    tagline: 'Misty Mountain Gaps & Railways',
    region: 'Highlands',
    image: DESTINATION_IMAGES.ella,
    description: 'Iconic stone viaduct bridge surrounded by dense bamboo forests, tea trails, and panoramic mountain pass vistas.',
    attractions: ['Nine Arch Train Photo Walk', 'Little Adams Peak Sunrise', 'Ravana Waterfalls', 'Ella Rock Trek'],
    weather: '21°C Mild Mountain',
    season: 'Clear Trail Season',
  },
  {
    id: 'kandy',
    name: 'Kandy Sacred Relic Sanctuary',
    tagline: 'Last Royal Capital of Ceylon',
    region: 'Cultural Heartland',
    image: DESTINATION_IMAGES.kandy,
    description: 'Nestled beside a serene central lake, home to the sacred Temple of the Tooth and lush Royal Botanical Gardens.',
    attractions: ['Temple of the Sacred Tooth', 'Royal Botanical Gardens', 'Kandy Lake Promenade', 'Kandyan Cultural Dance'],
    weather: '25°C Pleasant',
    season: 'Year-Round Cultural',
  },
];

export const DestinationsPage: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [activeModal, setActiveModal] = useState<DestinationItem | null>(null);

  const filters = ['All', 'Cultural Heartland', 'Highlands', 'Southern Riviera', 'Deep South'];

  const filtered = selectedFilter === 'All'
    ? DESTINATIONS_LIST
    : DESTINATIONS_LIST.filter((d) => d.region === selectedFilter);

  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="bg-[#FDFBF7] text-[#0B131F] min-h-screen py-16 px-4 md:px-8 font-sans space-y-12"
    >
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#134E4A]/10 border border-[#134E4A]/30 text-[#134E4A] text-xs font-semibold uppercase tracking-widest">
            <Compass className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Sri Lanka Regional Destinations</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif-luxury font-bold text-[#0B131F]">
            Destinations of Distinction
          </h1>
          <p className="text-stone-600 text-sm leading-relaxed">
            Explore curated Sri Lankan regions. Each destination is linked with live ground intelligence weather advisories and terrain elevation profiles.
          </p>

          {/* Region Chips */}
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setSelectedFilter(f)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  selectedFilter === f
                    ? 'bg-[#134E4A] text-emerald-100 shadow-md'
                    : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Destination Cards Grid */}
        <motion.div
          variants={staggerContainerVariants}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              variants={staggerItemVariants}
              {...hoverLiftProps}
              className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xl flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-[#0B131F]/80 backdrop-blur-md border border-[#C5A880]/40 text-[#C5A880] text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                    {item.region}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-emerald-950/80 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[10px] font-mono px-2.5 py-1 rounded-md">
                    {item.weather}
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <span className="text-[11px] font-mono text-[#C5A880] font-bold uppercase tracking-wider">
                    {item.tagline}
                  </span>
                  <h3 className="text-2xl font-serif-luxury font-bold text-[#0B131F] leading-snug">
                    {item.name}
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0 border-t border-stone-100 mt-4 flex items-center justify-between">
                <span className="text-xs text-stone-500">{item.season}</span>
                <motion.button
                  {...buttonPressProps}
                  onClick={() => setActiveModal(item)}
                  className="px-4 py-2 rounded-xl bg-[#0B131F] hover:bg-[#134E4A] text-stone-100 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>Explore Guide</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#C5A880]" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Destination Modal */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              variants={scaleInModalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative w-full max-w-2xl bg-[#0F1A24] border border-stone-700 rounded-2xl shadow-2xl overflow-hidden text-stone-100 p-6 space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                <div>
                  <span className="text-xs font-mono text-[#C5A880] uppercase">
                    {activeModal.region}
                  </span>
                  <h3 className="text-2xl font-serif-luxury font-bold text-stone-100">
                    {activeModal.name}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2 text-stone-400 hover:text-white rounded-full hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">
                {activeModal.description}
              </p>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                  Curated Curators Highlights
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeModal.attractions.map((att, i) => (
                    <div key={i} className="p-3 bg-[#0B131F] rounded-xl border border-stone-800 text-xs text-stone-200 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>{att}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-800 flex justify-between items-center">
                <span className="text-xs text-stone-400">Live Weather: {activeModal.weather}</span>
                <Link to={`/plan-my-trip?region=${encodeURIComponent(activeModal.region)}`}>
                  <motion.button
                    {...buttonPressProps}
                    onClick={() => setActiveModal(null)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-[#0B131F] font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-1.5"
                  >
                    <span>Plan Journey to {activeModal.name.split(' ')[0]}</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
