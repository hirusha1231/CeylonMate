import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Users, Car, Phone, ShieldCheck, Clock, CheckCircle2,
  ChevronRight, RefreshCw, FileText, Compass, Sparkles, User, KeyRound, Save,
  Lock, Mail, Eye, EyeOff, CreditCard, Receipt, DollarSign
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency } from '../../context/CurrencyContext';
import { useToast } from '../../context/ToastContext';
import { isStaffUserRole } from '../../auth/types';
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
  pickupTime?: string;
  passengerCount?: number;
  tripDurationDays?: number;
  status: string;
  vehicleCapacityStatus?: string;
  capacityRejectionReason?: string;
  guideAssignmentStatus?: string; // "PENDING_GUIDE_ACCEPTANCE", "ACCEPTED_BY_GUIDE", "REJECTED_BY_GUIDE", "NOT_REQUIRED"
  guideResponseMessage?: string;
  guideName?: string;
  hasGuide?: boolean;
  packageTitle?: string;
  packageTagline?: string;
  destinationsCovered?: string;
  finalPriceQuoteLkr?: number;
  finalPriceQuoteUsd?: number;
  totalUsd: number;
  chauffeurName?: string;
  chauffeurPhone?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  vehicle?: {
    modelName?: string;
    categoryBadge?: string;
    registrationNumber?: string;
    maxPassengers?: number;
    photoUrl?: string;
  };
  guide?: {
    fullName?: string;
    licenseNumber?: string;
    contactPhone?: string;
    photoUrl?: string;
  } | null;
  days: { day: number; title: string; detail: string }[];
}

export const MyBookingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();

  const isStaff = user && isStaffUserRole(user.role);

  // Tab State: Default to 'profile' for staff users (Capacity Officers, Admins, Local Guides, Travel Agents)
  const [activeTab, setActiveTab] = useState<'bookings' | 'profile'>(isStaff ? 'profile' : 'bookings');

  // Bookings State
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Profile Management State
  const [fullName, setFullName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Password Visibility Toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      if (!isStaff) {
        fetchTravelerBookings();
      } else {
        setLoading(false);
      }
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [user, isStaff]);

  const fetchUserProfile = async () => {
    setProfileLoading(true);
    try {
      const response = await api.get('/api/users/profile/me');
      if (response.data) {
        setFullName(response.data.fullName || user?.fullName || '');
        setPhoneNumber(response.data.phoneNumber || '');
      }
    } catch {
      setFullName(user?.fullName || '');
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchTravelerBookings = async () => {
    setLoading(true);
    try {
      let rawData: any[] = [];
      try {
        const response = await api.get('/api/bookings/my');
        rawData = Array.isArray(response.data) ? response.data : (response.data?.items || []);
      } catch {
        rawData = [];
      }

      if (rawData.length === 0) {
        try {
          const tripsRes = await api.get('/api/trips/my');
          rawData = Array.isArray(tripsRes.data) ? tripsRes.data : (tripsRes.data?.items || []);
        } catch {
          rawData = [];
        }
      }

      if (Array.isArray(rawData) && rawData.length > 0) {
        const mapped: Booking[] = rawData.map((b: any) => {
          const bTripDays = b.tripDurationDays || 5;
          const bHasGuide = b.hasGuide !== false && b.guideAssignmentStatus !== 'NOT_REQUIRED';
          const bGuideCost = bHasGuide ? bTripDays * 50 : 0;
          const bVehicleCost = bTripDays * 120;
          const bSubtotal = bGuideCost + bVehicleCost;
          const bVat = bSubtotal * 0.05;
          const bCalculatedTotal = Math.round(bSubtotal + bVat);

          return {
            id: String(b.id || Math.random()),
            reference: b.bookingReference || b.reference || `CM-BK-${String(b.id).substring(0, 6).toUpperCase()}`,
            title: b.packageTitle || b.title || b.objective || 'Curated Signature Expedition',
            packageTitle: b.packageTitle || b.title || 'Curated Signature Expedition',
            packageTagline: b.packageTagline || 'Bespoke Luxury Sri Lankan Expedition',
            destinationsCovered: b.destinationsCovered || 'Sigiriya - Kandy - Nuwara Eliya - Yala',
            startDate: b.startDate || (b.bookedAt ? new Date(b.bookedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
            endDate: b.endDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
            pickupTime: b.pickupTime || '08:00 AM',
            passengerCount: b.passengerCount || 2,
            tripDurationDays: b.tripDurationDays || 5,
            status: String(b.status || 'PENDING_REVIEW').toUpperCase(),
            vehicleCapacityStatus: b.vehicleCapacityStatus || 'HELD_PENDING_CONFIRMATION',
            capacityRejectionReason: b.capacityRejectionReason,
            guideAssignmentStatus: b.guideAssignmentStatus || 'PENDING_GUIDE_ACCEPTANCE',
            guideResponseMessage: b.guideResponseMessage,
            hasGuide: bHasGuide,
            guideName: b.guide?.fullName || b.guideName || b.chauffeurName,
            finalPriceQuoteLkr: b.finalPriceQuoteLkr ? Number(b.finalPriceQuoteLkr) : (bCalculatedTotal * 310),
            finalPriceQuoteUsd: b.finalPriceQuoteUsd ? Number(b.finalPriceQuoteUsd) : bCalculatedTotal,
            totalUsd: Number(b.finalPriceQuoteUsd || b.totalUsd || b.budget || b.totalCost || bCalculatedTotal),
            chauffeurName: b.guide?.fullName || b.chauffeurName || 'Kavinda Fernando',
            chauffeurPhone: b.guide?.contactPhone || b.chauffeurPhone || '+94 77 123 4567',
            vehicleModel: b.vehicle?.modelName || b.vehicleModel || 'Toyota KDH Super GL VIP Van',
            vehiclePlate: b.vehicle?.registrationNumber || b.vehiclePlate || 'WP-CM VIP',
            vehicle: b.vehicle || {
              modelName: b.vehicleModel || 'Toyota KDH Super GL VIP Van',
              categoryBadge: 'EXECUTIVE VIP GROUP TRANSPORT',
              registrationNumber: b.vehiclePlate || 'WP-CM VIP',
              maxPassengers: 6,
              photoUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80'
            },
            guide: b.guide || (bHasGuide ? {
              fullName: b.guideName || b.chauffeurName || 'Kavinda Fernando',
              licenseNumber: 'SLTDA/NTG/2024/0481',
              contactPhone: b.chauffeurPhone || '+94 77 123 4567',
              photoUrl: ''
            } : null),
            days: Array.isArray(b.days) ? b.days : [],
          };
        });
        setBookings(mapped);
        setSelectedBooking(mapped[0]);
      } else {
        setBookings([]);
        setSelectedBooking(null);
      }
    } catch (error) {
      console.error('Failed to load user bookings:', error);
      setBookings([]);
      setSelectedBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (bookingId: string) => {
    try {
      await api.post(`/api/bookings/${bookingId}/confirm-payment`);
      showToast('Payment Confirmed!', 'Your journey status is now CONFIRMED. Travel vouchers issued.', 'success');
      fetchTravelerBookings();
    } catch (err: any) {
      showToast('Payment Failed', err.response?.data?.message || err.message || 'Payment processing failed.', 'error');
    }
  };

  const handleSaveProfileInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Validation Error', 'Full Name cannot be empty.', 'error');
      return;
    }

    if (/\d/.test(fullName)) {
      showToast('Validation Error', 'Full Name must contain letters only. Numbers are not allowed.', 'error');
      return;
    }

    if (phoneNumber && /[a-zA-Z]/.test(phoneNumber)) {
      showToast('Validation Error', 'Phone Number must contain numbers only. Letters are not allowed.', 'error');
      return;
    }

    setIsSavingProfile(true);
    try {
      let response;
      try {
        response = await api.put('/api/users/profile/update-info', {
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim()
        });
      } catch (err: any) {
        if (err.response?.status === 404) {
          response = await api.post('/api/users/profile/update-info', {
            fullName: fullName.trim(),
            phoneNumber: phoneNumber.trim()
          });
        } else {
          throw err;
        }
      }

      showToast('Profile Updated', 'Your personal information has been saved.', 'success');

      // Update local storage user session
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          localStorage.setItem('user', JSON.stringify({
            ...parsed,
            fullName: fullName.trim(),
            phoneNumber: phoneNumber.trim()
          }));
        } catch { }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update profile information.';
      showToast('Update Failed', msg, 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Validation Error', 'Please enter your current password.', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showToast('Validation Error', 'New password must be at least 6 characters long.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Validation Error', 'New password and confirmation do not match.', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/api/users/profile/change-password', {
        currentPassword,
        newPassword
      });

      showToast('Password Changed Successfully', 'Please log in with your new password.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      logout();
      navigate('/', { state: { openAuth: true } });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to change password.';
      showToast('Password Change Failed', msg, 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-[#0B131F] min-h-screen py-20 px-4 text-center text-stone-100 flex items-center justify-center font-sans">
        <div className="max-w-md w-full p-8 bg-[#0F1A24]/90 border border-[#C5A880]/30 rounded-2xl shadow-2xl space-y-4 backdrop-blur-xl">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#C5A880]/10 flex items-center justify-center border border-[#C5A880]/30 text-[#D4AF37]">
            <FileText className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-serif-luxury font-bold text-stone-100">
            Sign In to Access Account
          </h2>
          <p className="text-xs text-stone-400 leading-relaxed">
            Please sign in to access your saved itineraries, active booking references, and profile settings.
          </p>
          <motion.button
            {...buttonPressProps}
            onClick={() => setAuthModalOpen(true)}
            className="w-full py-3 bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:brightness-110 cursor-pointer"
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
      className="bg-[#0B131F] text-stone-100 min-h-screen py-12 px-4 md:px-8 font-sans selection:bg-[#C5A880] selection:text-[#0B131F]"
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-6">
          <div>
            <span className="text-xs font-mono text-[#C5A880] uppercase font-bold tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              {isStaff ? `${user.role.replace('_', ' ')} ACCOUNT MANAGEMENT` : 'TRAVELER PORTAL'}
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif-luxury font-bold text-stone-100">
              {isStaff ? 'My Account & Security' : 'My Account & Bookings'}
            </h1>
          </div>

          <button
            onClick={() => {
              fetchTravelerBookings();
              fetchUserProfile();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-stone-300 border border-stone-700 transition-all cursor-pointer shadow-md active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#C5A880] ${loading || profileLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Sub Navigation Segmented Pill Tabs (For Traveler accounts only) */}
        {!isStaff && (
          <div className="flex flex-wrap items-center gap-2 bg-[#0F1A24]/90 p-2.5 rounded-2xl border border-[#C5A880]/20 backdrop-blur-xl shadow-xl w-fit">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`px-5 py-2.5 rounded-xl font-medium text-xs md:text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${activeTab === 'bookings'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold shadow-lg shadow-[#C5A880]/20'
                : 'text-slate-300 hover:text-white hover:bg-[#C5A880]/10'
                }`}
            >
              <Compass className="w-4 h-4" />
              <span>My Journeys & Bookings</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-5 py-2.5 rounded-xl font-medium text-xs md:text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${activeTab === 'profile'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold shadow-lg shadow-[#C5A880]/20'
                : 'text-slate-300 hover:text-white hover:bg-[#C5A880]/10'
                }`}
            >
              <User className="w-4 h-4" />
              <span>Profile & Security Settings</span>
            </button>
          </div>
        )}

        {/* TAB 1: MY JOURNEYS & BOOKINGS (Travelers Only) */}
        {!isStaff && activeTab === 'bookings' && (
          <>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : bookings.length === 0 ? (
              /* Luxury Empty State for New Users (0 Bookings) */
              <div className="text-center py-16 px-6 bg-[#0F1A24]/60 backdrop-blur-xl border border-[#C5A880]/20 rounded-2xl max-w-2xl mx-auto shadow-2xl space-y-4">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-[#C5A880]/10 flex items-center justify-center border border-[#C5A880]/30">
                  <Compass className="w-8 h-8 text-[#C5A880]" />
                </div>
                <h3 className="text-2xl font-serif-luxury font-bold text-white mb-2">No Active Journeys Yet</h3>
                <p className="text-stone-400 text-sm mb-6 leading-relaxed max-w-md mx-auto">
                  You haven't reserved any bespoke Sri Lankan experiences yet. Explore our handcrafted signature collections or tailor-make your own custom itinerary.
                </p>
                <Link
                  to="/plan-my-trip"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Plan Your First Journey</span>
                </Link>
              </div>
            ) : (
              /* Real User Bookings Grid Display */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Bookings List */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                    Active Journeys ({bookings.length})
                  </h3>
                  {bookings.map((b) => {
                    const isSelected = selectedBooking?.id === b.id;
                    return (
                      <motion.div
                        key={b.id}
                        {...hoverLiftProps}
                        onClick={() => setSelectedBooking(b)}
                        className={`p-5 rounded-2xl border cursor-pointer transition-all ${isSelected
                          ? 'bg-[#134E4A]/30 text-stone-100 border-[#C5A880] shadow-xl'
                          : 'bg-[#0F1A24] text-stone-300 border-stone-800 hover:border-stone-700'
                          }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono mb-2">
                          <span className="text-[#C5A880] font-bold">
                            {b.reference}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${b.status === 'CONFIRMED'
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                              }`}
                          >
                            {b.status.replace('_', ' ')}
                          </span>
                        </div>

                        <h4 className="text-base font-serif-luxury font-bold leading-snug text-stone-100">
                          {b.title}
                        </h4>

                        <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-stone-800">
                          <span className="flex items-center gap-1 text-stone-400 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-[#C5A880]" />
                            {b.startDate}
                          </span>
                          <span className="font-bold font-serif-luxury text-sm text-[#D4AF37]">
                            {b.finalPriceQuoteUsd && b.finalPriceQuoteUsd > 0
                              ? formatPrice(b.finalPriceQuoteUsd)
                              : b.totalUsd && b.totalUsd > 0
                                ? formatPrice(b.totalUsd)
                                : 'Quote Pending'}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Detailed View Panel */}
                <div className="lg:col-span-2">
                  {selectedBooking ? (
                    <div className="bg-[#0F1A24] border border-[#C5A880]/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
                      {/* LIVE MULTI-STEP APPROVAL STEPPER */}
                      <div className="bg-[#0B131F] border border-stone-800 rounded-2xl p-6 mb-2">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-serif-luxury font-bold text-white">
                            Booking #{selectedBooking.id.slice(0, 8)} Journey Status
                          </h3>
                          <span className="text-xs px-3 py-1 rounded-full border border-[#C5A880]/30 text-[#C5A880] bg-[#C5A880]/10 font-mono font-bold">
                            {selectedBooking.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        {/* Multi-Step Timeline */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                          {/* Step 1 */}
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs shrink-0">✓</div>
                            <div>
                              <p className="text-sm font-medium text-white">Request Raised</p>
                              <p className="text-xs text-stone-400">Package, Guide & Fleet chosen</p>
                            </div>
                          </div>

                          {/* Step 2 */}
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${selectedBooking.vehicleCapacityStatus === 'REJECTED_BY_CAPACITY'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              }`}>
                              {selectedBooking.vehicleCapacityStatus === 'REJECTED_BY_CAPACITY' ? '!' : '✓'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">Capacity & Fleet</p>
                              <p className="text-xs text-stone-400">
                                {selectedBooking.vehicleCapacityStatus === 'REJECTED_BY_CAPACITY' ? 'Agent re-routing fleet' : 'Transport & slots verified'}
                              </p>
                            </div>
                          </div>

                          {/* Step 3 */}
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${selectedBooking.status === 'APPROVED_PENDING_PAYMENT' || selectedBooking.status === 'CONFIRMED'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-[#C5A880]/20 text-[#C5A880] border-[#C5A880]/40 animate-pulse'
                              }`}>
                              3
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">Concierge Review</p>
                              <p className="text-xs text-stone-400">Travel Agent reviewing quote</p>
                            </div>
                          </div>

                          {/* Step 4 */}
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${selectedBooking.status === 'CONFIRMED'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : selectedBooking.status === 'APPROVED_PENDING_PAYMENT'
                                ? 'bg-[#C5A880] text-black font-bold'
                                : 'bg-stone-800 text-stone-500 border-stone-700'
                              }`}>
                              4
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">Payment & Confirmation</p>
                              <p className="text-xs text-stone-400">
                                {selectedBooking.status === 'APPROVED_PENDING_PAYMENT' ? 'Ready to Pay' : 'Voucher issuance'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Action Bar for Approved State */}
                        {selectedBooking.status === 'APPROVED_PENDING_PAYMENT' && (
                          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-[#C5A880]/20 to-transparent border border-[#C5A880]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                              <p className="text-xs text-[#C5A880] uppercase tracking-wider font-semibold">Proposal Approved by Travel Agent</p>
                              <p className="text-lg font-serif-luxury text-white font-bold">
                                Total: {formatPrice(selectedBooking.finalPriceQuoteUsd || selectedBooking.totalUsd)}
                              </p>
                            </div>
                            <button
                              onClick={() => navigate(`/payment-gateway/${selectedBooking.id}`)}
                              className="px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:brightness-110 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg cursor-pointer flex items-center gap-2"
                            >
                              <CreditCard className="w-4 h-4 text-slate-950" />
                              <span>Pay & Confirm Journey</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Top Details Header */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
                        <div>
                          <span className="text-xs font-mono text-[#C5A880] font-bold">
                            Booking Ref: {selectedBooking.reference}
                          </span>
                          <h2 className="text-2xl font-serif-luxury font-bold text-stone-100">
                            {selectedBooking.title}
                          </h2>
                        </div>

                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                          Capacity Lock Guaranteed
                        </span>
                      </div>

                      {/* A. EXPEDITION OVERVIEW HEADER BAR */}
                      <div className="p-4 bg-gradient-to-r from-slate-900 via-[#0B131F] to-[#134E4A]/30 rounded-2xl border border-[#C5A880]/30 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans shadow-lg">
                        <div className="space-y-1">
                          <span className="text-stone-400 font-mono text-[10px] uppercase block font-semibold text-[#C5A880]">
                            Selected Plan / Destination
                          </span>
                          <p className="font-bold text-stone-100 text-sm font-serif-luxury">
                            {selectedBooking.packageTitle || selectedBooking.title}
                          </p>
                          {selectedBooking.destinationsCovered && (
                            <p className="text-[11px] text-[#C5A880] font-mono">
                              {selectedBooking.destinationsCovered}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <span className="text-stone-400 font-mono text-[10px] uppercase block font-semibold text-[#C5A880]">
                            Travelers (Pax)
                          </span>
                          <p className="font-bold text-stone-100 text-sm flex items-center gap-1.5 font-mono">
                            <Users className="w-4 h-4 text-[#D4AF37]" />
                            <span>{selectedBooking.passengerCount || 2} Passengers</span>
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-stone-400 font-mono text-[10px] uppercase block font-semibold text-[#C5A880]">
                            Expedition Schedule
                          </span>
                          <p className="font-bold text-stone-100 text-xs font-mono">
                            {selectedBooking.startDate} • {selectedBooking.tripDurationDays || 7} Days
                          </p>
                          <p className="text-[11px] text-stone-300 font-mono">
                            Pickup Time: <span className="text-[#C5A880] font-bold">{selectedBooking.pickupTime || '08:00 AM'}</span>
                          </p>
                        </div>
                      </div>

                      {/* B. DEDICATED VEHICLE ESCORT CARD */}
                      <div className="p-5 bg-slate-900 rounded-2xl border border-stone-800 space-y-3">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                              Dedicated Vehicle Escort
                            </span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                            {selectedBooking.vehicle?.categoryBadge || 'VIP FLEET ESCORT'}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <h5 className="text-base font-serif-luxury font-bold text-stone-100">
                              {selectedBooking.vehicle?.modelName || selectedBooking.vehicleModel || 'Toyota KDH Super GL VIP Van'}
                            </h5>
                            <p className="text-stone-400 text-xs font-mono">
                              Registration Plate: <span className="text-stone-200 font-bold">{selectedBooking.vehicle?.registrationNumber || selectedBooking.vehiclePlate || 'WP-CM VIP'}</span>
                            </p>
                          </div>

                          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-stone-800 text-stone-300 font-mono text-xs">
                            Capacity: <strong className="text-emerald-400">{selectedBooking.vehicle?.maxPassengers || 6} Pax Capacity</strong>
                          </div>
                        </div>
                      </div>

                      {/* C. DEDICATED PRIVATE GUIDE CARD */}
                      {selectedBooking.guideAssignmentStatus === 'NOT_REQUIRED' || selectedBooking.hasGuide === false ? (
                        <div className="p-5 bg-slate-900 rounded-2xl border border-stone-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-stone-400" />
                              <span className="text-xs font-mono font-bold text-stone-300 uppercase tracking-wider">
                                Guide Assignment Status
                              </span>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-stone-800 text-stone-300 border border-stone-700 font-bold uppercase">
                              No Guide Requested
                            </span>
                          </div>
                          <h5 className="text-sm font-serif-luxury font-bold text-stone-200">
                            Self-Guided / Chauffeur Drive Only
                          </h5>
                          <p className="text-xs text-stone-400 leading-relaxed">
                            You opted for private chauffeur vehicle escort without an additional local tour guide. Your professional driver will manage navigation and route logistics.
                          </p>
                        </div>
                      ) : (
                        <div className="p-5 bg-slate-900 rounded-2xl border border-stone-800 space-y-4">
                          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                              <span className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                                Dedicated Private Guide
                              </span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${selectedBooking.guideAssignmentStatus === 'ACCEPTED_BY_GUIDE'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30'
                                : selectedBooking.guideAssignmentStatus === 'REJECTED_BY_GUIDE'
                                  ? 'bg-rose-950 text-rose-300 border-rose-500/30'
                                  : 'bg-amber-950 text-amber-300 border-amber-500/30 animate-pulse'
                              }`}>
                              {selectedBooking.guideAssignmentStatus === 'ACCEPTED_BY_GUIDE'
                                ? '✓ Guide Confirmed'
                                : selectedBooking.guideAssignmentStatus === 'REJECTED_BY_GUIDE'
                                  ? '⚠️ Guide Unavailable'
                                  : '⏳ Pending Guide Acceptance'}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-sans">
                            <div className="space-y-1">
                              <h5 className="text-base font-serif-luxury font-bold text-stone-100">
                                {selectedBooking.guide?.fullName || selectedBooking.guideName || selectedBooking.chauffeurName || 'Kavinda Fernando'}
                              </h5>
                              <p className="text-stone-400 font-mono text-[11px]">
                                SLTDA License: <span className="text-stone-200 font-semibold">{selectedBooking.guide?.licenseNumber || 'SLTDA/NTG/2024/0481'}</span>
                              </p>
                            </div>

                            {(selectedBooking.guide?.contactPhone || selectedBooking.chauffeurPhone) && (
                              <a
                                href={`tel:${selectedBooking.guide?.contactPhone || selectedBooking.chauffeurPhone}`}
                                className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-stone-800 text-[#C5A880] font-mono text-xs flex items-center gap-2 transition"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>{selectedBooking.guide?.contactPhone || selectedBooking.chauffeurPhone}</span>
                              </a>
                            )}
                          </div>

                          {/* Display guide response note if present */}
                          {selectedBooking.guideResponseMessage && (
                            <div className="p-3 bg-slate-950/80 rounded-xl border border-stone-800/80 text-xs italic text-emerald-300">
                              Message from Guide: "{selectedBooking.guideResponseMessage}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* D. ESTIMATED TOUR BUDGET (Exact match to booking budget structure) */}
                      {(() => {
                        const bDays = selectedBooking.tripDurationDays || 5;
                        const hasGuideReq = selectedBooking.hasGuide !== false && selectedBooking.guideAssignmentStatus !== 'NOT_REQUIRED';
                        const guideCost = hasGuideReq ? bDays * 50 : 0;
                        const vehicleCost = bDays * 120;
                        const budgetSubtotal = guideCost + vehicleCost;
                        const vat = budgetSubtotal * 0.05;
                        const totalBudget = budgetSubtotal + vat;

                        return (
                          <div className="p-5 bg-[#134E4A]/20 border border-emerald-500/30 rounded-2xl space-y-3 font-sans shadow-xl">
                            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                              <h4 className="text-stone-100 font-semibold font-mono text-xs uppercase tracking-wider">
                                Estimated Tour Budget
                              </h4>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${selectedBooking.status === 'CONFIRMED'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                                  : selectedBooking.status === 'APPROVED_PENDING_PAYMENT'
                                    ? 'bg-amber-950 text-amber-300 border-amber-500/40 animate-pulse'
                                    : 'bg-slate-800 text-stone-300 border-stone-700'
                                }`}>
                                {selectedBooking.status === 'CONFIRMED' ? '✓ Fully Paid' : selectedBooking.status === 'APPROVED_PENDING_PAYMENT' ? 'Ready to Pay' : 'Concierge Quote'}
                              </span>
                            </div>

                            {hasGuideReq && (
                              <div className="flex items-center justify-between gap-4 text-xs">
                                <span className="text-stone-300">Guide ({bDays} days)</span>
                                <span className="text-stone-100 font-mono font-semibold">{formatPrice(guideCost)}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-4 text-xs">
                              <span className="text-stone-300">Vehicle ({bDays} days)</span>
                              <span className="text-stone-100 font-mono font-semibold">{formatPrice(vehicleCost)}</span>
                            </div>

                            <div className="flex items-center justify-between gap-4 border-t border-stone-700/80 pt-3 text-xs">
                              <span className="text-stone-300">Subtotal</span>
                              <span className="text-stone-100 font-mono font-semibold">{formatPrice(budgetSubtotal)}</span>
                            </div>

                            <div className="flex items-center justify-between gap-4 text-xs">
                              <span className="text-stone-300">VAT (5%)</span>
                              <span className="text-stone-100 font-mono font-semibold">{formatPrice(vat)}</span>
                            </div>

                            <div className="flex items-center justify-between gap-4 border-t border-emerald-500/30 pt-3">
                              <span className="text-emerald-200 font-semibold text-xs sm:text-sm">Total budget (VAT included)</span>
                              <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-300">{formatPrice(totalBudget)}</span>
                            </div>

                            {/* Action Bar */}
                            {selectedBooking.status === 'APPROVED_PENDING_PAYMENT' ? (
                              <div className="pt-2">
                                <button
                                  onClick={() => navigate(`/payment-gateway/${selectedBooking.id}`)}
                                  className="w-full py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:brightness-110 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
                                >
                                  <CreditCard className="w-4 h-4 text-slate-950" />
                                  <span>Proceed to Payment Gateway ({formatPrice(totalBudget)})</span>
                                </button>
                              </div>
                            ) : selectedBooking.status === 'CONFIRMED' ? (
                              <div className="pt-2 flex items-center justify-between text-xs text-emerald-400 font-mono bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-500/20">
                                <span className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  Payment Confirmed & Verified
                                </span>
                                <button
                                  onClick={() => navigate(`/payment-gateway/${selectedBooking.id}`)}
                                  className="text-[#C5A880] hover:underline cursor-pointer font-bold text-[11px]"
                                >
                                  View Travel Voucher & Slip →
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}

                      {/* Day-by-Day Accordion */}
                      {selectedBooking.days && selectedBooking.days.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                            Day-by-Day Itinerary Breakdown
                          </h4>
                          {selectedBooking.days.map((d) => (
                            <div key={d.day} className="p-4 bg-slate-900/60 rounded-xl border border-stone-800 space-y-1">
                              <div className="flex items-center gap-2 text-xs font-bold text-stone-100">
                                <span className="px-2 py-0.5 rounded bg-[#134E4A] text-emerald-100 font-mono">Day {d.day}</span>
                                <span>{d.title}</span>
                              </div>
                              <p className="text-xs text-stone-400 pl-1 pt-1 leading-relaxed">
                                {d.detail}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-4 border-t border-stone-800 flex justify-between items-center text-[11px] font-mono text-stone-500">
                        <span>SLTDA Guaranteed Operator #01492</span>
                        <span>24/7 Concierge Hotline: +94 11 222 0000</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-[300px] flex items-center justify-center p-8 bg-[#0F1A24] rounded-2xl border border-dashed border-stone-800 text-stone-500 text-xs font-mono">
                      Select a booking from the left list to inspect details.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: PROFILE & SECURITY SETTINGS */}
        {(isStaff || activeTab === 'profile') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form 1: Personal Information */}
            <form
              onSubmit={handleSaveProfileInfo}
              className="bg-[#0F1A24] border border-[#C5A880]/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-stone-800">
                <div className="p-2.5 rounded-xl bg-[#C5A880]/10 border border-[#C5A880]/30 text-[#D4AF37]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif-luxury font-bold text-stone-100">
                    Personal Information
                  </h3>
                  <p className="text-xs text-stone-400">Manage your display name and contact details</p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-sans">
                {/* Account Email (Read-Only) */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Email Address</span>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Verified Account
                    </span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full bg-slate-900/60 border border-stone-800 text-stone-400 rounded-xl pl-10 pr-3.5 py-2.5 outline-none font-mono text-xs cursor-not-allowed"
                    />
                    <Lock className="w-3.5 h-3.5 text-stone-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Your email is tied to your account login credentials.
                  </p>
                </div>

                {/* Full Name Input */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value.replace(/[0-9]/g, ''))}
                    placeholder="Enter your full name..."
                    className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none text-xs"
                  />
                </div>

                {/* Phone Number Input */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[a-zA-Z]/g, ''))}
                    placeholder="e.g. +94 77 123 4567"
                    className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none font-mono text-xs"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Used by chauffeurs and concierges for VIP arrival escorts.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-800 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSavingProfile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Form 2: Security & Password Management */}
            <form
              onSubmit={handleChangePassword}
              className="bg-[#0F1A24] border border-[#C5A880]/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-stone-800">
                <div className="p-2.5 rounded-xl bg-[#C5A880]/10 border border-[#C5A880]/30 text-[#D4AF37]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif-luxury font-bold text-stone-100">
                    Security & Password
                  </h3>
                  <p className="text-xs text-stone-400">Update your password to keep your account secure</p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-sans">
                {/* Current Password */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password..."
                      className="w-full bg-slate-900 border border-stone-700 rounded-xl pl-3.5 pr-10 py-2.5 text-stone-100 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer p-1"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters..."
                      className="w-full bg-slate-900 border border-stone-700 rounded-xl pl-3.5 pr-10 py-2.5 text-stone-100 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer p-1"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password..."
                      className="w-full bg-slate-900 border border-stone-700 rounded-xl pl-3.5 pr-10 py-2.5 text-stone-100 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-800 flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isChangingPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </motion.div>
  );
};
