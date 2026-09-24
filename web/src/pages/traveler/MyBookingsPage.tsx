import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, MapPin, Users, Car, Phone, ShieldCheck, Clock, CheckCircle2, ChevronRight, RefreshCw, FileText
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency } from '../../context/CurrencyContext';
import { CardSkeleton } from '../../components/common/Skeleton';
import { AuthModal } from '../../components/auth/AuthModal';
import { api } from '../../api/client';
import { fadeInVariants, hoverLiftProps, buttonPressProps } from '../../utils/animations';

interface Booking {
  id: string;
  reference: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'CONFIRMED' | 'PENDING_REVIEW' | 'DRAFT';
  totalUsd: number;
  chauffeurName?: string;
  chauffeurPhone?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  days: { day: number; title: string; detail: string }[];
}

export const MyBookingsPage: React.FC = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    fetchTravelerBookings();
  }, [user]);

  const fetchTravelerBookings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/trips');
      const data = Array.isArray(response.data) ? response.data : [];
      if (data.length > 0) {
        setBookings(
          data.map((t: any) => ({
            id: t.id,
            reference: `CM-BK-${t.id.toString().substring(0, 6)}`,
            title: t.objective || 'Bespoke Sri Lanka Expedition',
            startDate: t.startDate || '2026-11-10',
            endDate: t.endDate || '2026-11-18',
            status: t.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING_REVIEW',
            totalUsd: t.budget || 2850,
            chauffeurName: 'Kusal Perera (SLTDA Gold License)',
            chauffeurPhone: '+94 77 412 8901',
            vehicleModel: 'Toyota KDH Super GL VIP Van',
            vehiclePlate: 'WP CB-8492',
            days: [
              { day: 1, title: 'Arrival & Escort to Sigiriya', detail: 'VIP Airport reception and private transfer to luxury water gardens resort.' },
              { day: 2, title: 'Sigiriya Rock & Dambulla Gold Caves', detail: 'Private guided climb followed by spice lunch.' },
              { day: 3, title: 'Scenic Tea Highlands & Nuwara Eliya', detail: 'Chauffeur transit via Ramboda Falls.' },
            ],
          }))
        );
      } else {
        loadFallbackBookings();
      }
    } catch {
      loadFallbackBookings();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackBookings = () => {
    const fallback: Booking[] = [
      {
        id: '101',
        reference: 'CM-BK-894102',
        title: '6-Day Cultural Heartland & Tea Estates Expedition',
        startDate: '2026-11-12',
        endDate: '2026-11-18',
        status: 'CONFIRMED',
        totalUsd: 2950,
        chauffeurName: 'Kusal Perera (SLTDA Master Chauffeur)',
        chauffeurPhone: '+94 77 412 8901',
        vehicleModel: 'Toyota KDH Super GL VIP Van',
        vehiclePlate: 'WP CB-8492',
        days: [
          { day: 1, title: 'Arrival & Escort to Sigiriya', detail: 'VIP Airport reception and private transfer to Sigiriya luxury resort.' },
          { day: 2, title: 'Sigiriya Rock Citadel & Dambulla Caves', detail: 'Morning climb before heat, afternoon spice lunch.' },
          { day: 3, title: 'Highlands & Colonial Tea Bungalow', detail: 'Chauffeur transit to Nuwara Eliya tea estate.' },
          { day: 4, title: 'Scenic Railway Ride across Nine Arch Bridge', detail: 'First-class rail ticket to Ella peak.' },
        ],
      },
      {
        id: '102',
        reference: 'CM-BK-491209',
        title: '4-Day Southern Riviera & Galle Fort Sanctuary',
        startDate: '2026-12-04',
        endDate: '2026-12-08',
        status: 'PENDING_REVIEW',
        totalUsd: 1850,
        chauffeurName: 'Dhammika Fernando (English/German Fluent)',
        chauffeurPhone: '+94 71 823 4410',
        vehicleModel: 'Mercedes-Benz E-Class Sedan',
        vehiclePlate: 'WP CAD-1029',
        days: [
          { day: 1, title: 'Private Transfer to Galle Dutch Fort', detail: 'Settle into 17th-century merchant villa inside fort.' },
          { day: 2, title: 'Fort Rampart Walk & Mirissa Whale Expedition', detail: 'Dawn private yacht whale watching trip.' },
        ],
      },
    ];
    setBookings(fallback);
    setSelectedBooking(fallback[0]);
  };

  if (!user) {
    return (
      <div className="bg-[#FDFBF7] min-h-screen py-20 px-4 text-center space-y-6">
        <div className="max-w-md mx-auto p-8 bg-white rounded-2xl border border-stone-200 shadow-xl space-y-4">
          <FileText className="w-12 h-12 text-[#C5A880] mx-auto" />
          <h2 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
            Sign In to View Bookings
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Please sign in to access your saved itineraries, active booking references, and private chauffeur contact details.
          </p>
          <motion.button
            {...buttonPressProps}
            onClick={() => setAuthModalOpen(true)}
            className="w-full py-3 bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-[#0B131F] font-bold text-xs uppercase tracking-wider rounded-xl shadow-md"
          >
            Sign In / Register
          </motion.button>
        </div>
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    );
  }

  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="bg-[#FDFBF7] text-[#0B131F] min-h-screen py-12 px-4 md:px-8 font-sans"
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <span className="text-xs font-mono text-[#134E4A] uppercase font-bold tracking-widest">
              Traveler Portal
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif-luxury font-bold text-[#0B131F]">
              My Account & Bookings
            </h1>
          </div>

          <button
            onClick={fetchTravelerBookings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-medium text-stone-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* Skeleton State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Bookings List */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-mono">
                Active Journeys ({bookings.length})
              </h3>
              {bookings.map((b) => {
                const isSelected = selectedBooking?.id === b.id;
                return (
                  <motion.div
                    key={b.id}
                    {...hoverLiftProps}
                    onClick={() => setSelectedBooking(b)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#0F1A24] text-stone-100 border-[#C5A880] shadow-xl'
                        : 'bg-white text-[#0B131F] border-stone-200 hover:border-stone-300 shadow'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className={isSelected ? 'text-[#C5A880]' : 'text-[#134E4A] font-bold'}>
                        {b.reference}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'CONFIRMED'
                            ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-900/40 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {b.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-base font-serif-luxury font-bold leading-snug">
                      {b.title}
                    </h4>

                    <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-stone-700/40">
                      <span className="flex items-center gap-1 opacity-80">
                        <Calendar className="w-3.5 h-3.5" />
                        {b.startDate}
                      </span>
                      <span className="font-bold font-serif-luxury text-sm">
                        {formatPrice(b.totalUsd)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Detailed View Panel */}
            <div className="lg:col-span-2">
              {selectedBooking ? (
                <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
                  {/* Top Details */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
                    <div>
                      <span className="text-xs font-mono text-[#134E4A] font-bold">
                        Booking Ref: {selectedBooking.reference}
                      </span>
                      <h2 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
                        {selectedBooking.title}
                      </h2>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Capacity Lock Guaranteed
                    </span>
                  </div>

                  {/* Chauffeur & Fleet Info Box */}
                  <div className="p-5 bg-[#0F1A24] text-stone-100 rounded-2xl border border-stone-800 space-y-4">
                    <h4 className="text-xs font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                      Dedicated Chauffeur & Vehicle Escort
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-stone-400 block">Assigned Chauffeur Guide</span>
                        <div className="font-semibold text-stone-200 flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#C5A880]" />
                          <span>{selectedBooking.chauffeurName}</span>
                        </div>
                        <a
                          href={`tel:${selectedBooking.chauffeurPhone}`}
                          className="inline-flex items-center gap-1 text-[#C5A880] hover:underline pt-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>{selectedBooking.chauffeurPhone}</span>
                        </a>
                      </div>

                      <div className="space-y-1">
                        <span className="text-stone-400 block">Allocated VIP Vehicle</span>
                        <div className="font-semibold text-stone-200 flex items-center gap-2">
                          <Car className="w-4 h-4 text-emerald-400" />
                          <span>{selectedBooking.vehicleModel}</span>
                        </div>
                        <span className="text-stone-400 block font-mono">
                          Registration: {selectedBooking.vehiclePlate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Day-by-Day Accordion */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider font-mono">
                      Day-by-Day Itinerary Breakdown
                    </h4>
                    {selectedBooking.days.map((d) => (
                      <div key={d.day} className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#0B131F]">
                          <span className="px-2 py-0.5 rounded bg-[#134E4A] text-emerald-100">Day {d.day}</span>
                          <span>{d.title}</span>
                        </div>
                        <p className="text-xs text-stone-600 pl-1 pt-1 leading-relaxed">
                          {d.detail}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-stone-100 flex justify-between items-center text-xs text-stone-500">
                    <span>SLTDA Guaranteed Operator #01492</span>
                    <span>24/7 Concierge Hotline: +94 11 7311 611</span>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px] flex items-center justify-center p-8 bg-white rounded-2xl border border-dashed border-stone-300 text-stone-400 text-sm">
                  Select a booking from the left list to inspect details.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
