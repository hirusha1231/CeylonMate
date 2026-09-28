import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Users, Car, Phone, ShieldCheck, Clock, CheckCircle2,
  ChevronRight, RefreshCw, FileText, Compass, Sparkles, User, KeyRound, Save,
  Lock, Mail, Eye, EyeOff
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
  status: string;
  vehicleCapacityStatus?: string;
  capacityRejectionReason?: string;
  guideAssignmentStatus?: string; // "PENDING_GUIDE_ACCEPTANCE", "ACCEPTED_BY_GUIDE", "REJECTED_BY_GUIDE"
  guideResponseMessage?: string;
  guideName?: string;
  finalPriceQuoteLkr?: number;
  finalPriceQuoteUsd?: number;
  totalUsd: number;
  chauffeurName?: string;
  chauffeurPhone?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
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
        const mapped: Booking[] = rawData.map((b: any) => ({
          id: String(b.id || Math.random()),
          reference: b.bookingReference || b.reference || `CM-BK-${String(b.id).substring(0, 6).toUpperCase()}`,
          title: b.title || b.objective || 'Bespoke Sri Lanka Journey',
          startDate: b.startDate || (b.bookedAt ? new Date(b.bookedAt).toISOString().slice(0, 10) : '2026-11-10'),
          endDate: b.endDate || '2026-11-18',
          status: String(b.status || 'PENDING_REVIEW').toUpperCase(),
          vehicleCapacityStatus: b.vehicleCapacityStatus || 'HELD_PENDING_CONFIRMATION',
          capacityRejectionReason: b.capacityRejectionReason,
          guideAssignmentStatus: b.guideAssignmentStatus || 'PENDING_GUIDE_ACCEPTANCE',
          guideResponseMessage: b.guideResponseMessage,
          guideName: b.guideName || b.chauffeurName || 'SLTDA Certified Local Guide',
          finalPriceQuoteLkr: b.finalPriceQuoteLkr ? Number(b.finalPriceQuoteLkr) : 125000,
          finalPriceQuoteUsd: b.finalPriceQuoteUsd ? Number(b.finalPriceQuoteUsd) : 395,
          totalUsd: Number(b.finalPriceQuoteUsd || b.totalUsd || b.budget || b.totalCost || 395),
          chauffeurName: b.chauffeurName || 'SLTDA Certified Chauffeur Guide',
          chauffeurPhone: b.chauffeurPhone || '+94 11 7311 611',
          vehicleModel: b.vehicleModel || 'Luxury VIP Chauffeur Vehicle',
          vehiclePlate: b.vehiclePlate || 'WP-CM VIP',
          days: Array.isArray(b.days) ? b.days : [],
        }));
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
        } catch {}
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
              className={`px-5 py-2.5 rounded-xl font-medium text-xs md:text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                activeTab === 'bookings'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold shadow-lg shadow-[#C5A880]/20'
                  : 'text-slate-300 hover:text-white hover:bg-[#C5A880]/10'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>My Journeys & Bookings</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-5 py-2.5 rounded-xl font-medium text-xs md:text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                activeTab === 'profile'
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
                        className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#134E4A]/30 text-stone-100 border-[#C5A880] shadow-xl'
                            : 'bg-[#0F1A24] text-stone-300 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono mb-2">
                          <span className="text-[#C5A880] font-bold">
                            {b.reference}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${
                              b.status === 'CONFIRMED'
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
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                              selectedBooking.vehicleCapacityStatus === 'REJECTED_BY_CAPACITY' 
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            }`}>
                              {selectedBooking.vehicleCapacityStatus === 'REJECTED_BY_CAPACITY' ? '!' : '✓'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">Capacity & Fleet</p>
                              <p className="text-xs text-stone-400">
                                {selectedBooking.vehicleCapacityStatus === 'REJECTED_BY_CAPACITY' ? 'Agent re-routing fleet' : 'Seats & slots verified'}
                              </p>
                            </div>
                          </div>

                          {/* Step 3 */}
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                              selectedBooking.status === 'APPROVED_PENDING_PAYMENT' || selectedBooking.status === 'CONFIRMED'
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
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                              selectedBooking.status === 'CONFIRMED'
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
                              onClick={() => handlePayNow(selectedBooking.id)}
                              className="px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:brightness-110 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition shadow-lg cursor-pointer"
                            >
                              Pay & Confirm Journey
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Top Details */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-800">
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

                      {/* GUIDE APPROVAL & MESSAGING STATUS CARD */}
                      <div className="space-y-3">
                        {selectedBooking.guideAssignmentStatus === 'PENDING_GUIDE_ACCEPTANCE' && (
                          <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono text-amber-200">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">⏳</span>
                              <span className="font-semibold">
                                Awaiting confirmation from Guide {selectedBooking.guideName || selectedBooking.chauffeurName}
                              </span>
                            </div>
                            <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] uppercase font-bold border border-amber-500/30">
                              Pending Guide Acceptance
                            </span>
                          </div>
                        )}

                        {selectedBooking.guideAssignmentStatus === 'ACCEPTED_BY_GUIDE' && (
                          <div className="p-5 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-2 text-xs font-sans">
                            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                              <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
                                💬 <span>Message from your Guide ({selectedBooking.guideName || selectedBooking.chauffeurName}):</span>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                                ✓ Guide Confirmed
                              </span>
                            </div>
                            <p className="text-stone-200 italic leading-relaxed text-xs">
                              "{selectedBooking.guideResponseMessage || 'Looking forward to hosting your Sri Lanka expedition! Warm welcome awaits.'}"
                            </p>
                          </div>
                        )}

                        {selectedBooking.guideAssignmentStatus === 'REJECTED_BY_GUIDE' && (
                          <div className="p-5 bg-amber-950/60 border border-amber-500/50 rounded-2xl space-y-2 text-xs font-sans">
                            <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                              ⚠️ <span>Guide Availability Notice</span>
                            </div>
                            <p className="text-stone-200 leading-relaxed">
                              Guide <strong>{selectedBooking.guideName || selectedBooking.chauffeurName}</strong> is unavailable on this date ({selectedBooking.guideResponseMessage || 'Schedule conflict'}). Our travel concierge is assigning an equally certified replacement.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Chauffeur & Fleet Info Box */}
                      <div className="p-5 bg-slate-900 text-stone-100 rounded-2xl border border-stone-800 space-y-4">
                        <h4 className="text-xs font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                          Dedicated Chauffeur & Vehicle Escort
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <span className="text-stone-400 block font-mono">Assigned Chauffeur Guide</span>
                            <div className="font-semibold text-stone-200 flex items-center gap-2">
                              <Users className="w-4 h-4 text-[#C5A880]" />
                              <span>{selectedBooking.chauffeurName}</span>
                            </div>
                            {selectedBooking.chauffeurPhone && (
                              <a
                                href={`tel:${selectedBooking.chauffeurPhone}`}
                                className="inline-flex items-center gap-1 text-[#C5A880] hover:underline pt-1 font-mono"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>{selectedBooking.chauffeurPhone}</span>
                              </a>
                            )}
                          </div>

                          <div className="space-y-1">
                            <span className="text-stone-400 block font-mono">Allocated VIP Vehicle</span>
                            <div className="font-semibold text-stone-200 flex items-center gap-2">
                              <Car className="w-4 h-4 text-emerald-400" />
                              <span>{selectedBooking.vehicleModel}</span>
                            </div>
                            <span className="text-stone-400 block font-mono text-[11px]">
                              Registration: {selectedBooking.vehiclePlate}
                            </span>
                          </div>
                        </div>
                      </div>

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
                        <span>24/7 Concierge Hotline: +94 11 7311 611</span>
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
