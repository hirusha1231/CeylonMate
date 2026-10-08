import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Calendar, Users, Car, ShieldCheck, ArrowRight, ArrowLeft,
  Sparkles, Clock, FileText, CheckCircle2, AlertTriangle, RefreshCw, Star, Globe, User
} from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../auth/AuthProvider';
import { scaleInModalVariants, buttonPressProps } from '../../utils/animations';

interface GuideOption {
  id: string;
  guideUserId: string;
  guideName: string;
  bio: string;
  licenseNumber: string;
  languages: string;
  priceAmount: number;
  currency: string;
  status: string;
  imageUrl?: string;
  rating?: number;
}

interface VehicleOption {
  id: string;
  vehicleCatalogId?: string;
  vehicleModel: string;
  categoryBadge: string;
  imageUrl: string;
  maxPassengers: number;
  featureHighlight: string;
  dailyRateUsd: number;
  currency: string;
  status: string;
}

interface CuratedBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  selectedPackage?: {
    id?: number | string;
    title: string;
    priceUsd?: number;
    priceLkr?: number;
    durationDays?: number;
    durationNights?: number;
    destinationsCovered?: string;
    highlights?: string[];
    imageUrl?: string;
  } | null;
}

export const CuratedBookingModal: React.FC<CuratedBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedPackage
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [pickupTime, setPickupTime] = useState<string>('06:30 AM');
  const [passengerCount, setPassengerCount] = useState<number>(2);
  const [travelerNotes, setTravelerNotes] = useState<string>('');

  // Loaded Options
  const [guides, setGuides] = useState<GuideOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loadingGuides, setLoadingGuides] = useState<boolean>(false);
  const [loadingVehicles, setLoadingVehicles] = useState<boolean>(false);

  // Selected Choices
  const [selectedGuide, setSelectedGuide] = useState<GuideOption | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (!user) {
        onClose();
        showToast('Sign In Required', 'Please sign in to book a curated signature journey.', 'info');
        navigate('/', { state: { openAuth: true, from: selectedPackage?.id ? `/book-journey/${selectedPackage.id}` : '/' } });
        return;
      }
      setCurrentStep(1);
      fetchAvailableGuides();
      fetchAvailableVehicles();
    }
  }, [isOpen, startDate, passengerCount, selectedPackage?.durationDays, user]);

  const fetchAvailableGuides = async () => {
    setLoadingGuides(true);
    try {
      const res = await api.get('/api/capacity/guide-availabilities', {
        params: {
          startDate,
          durationDays: selectedPackage?.durationDays || 1
        }
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        setGuides(res.data.map((item: any) => ({
          id: item.id,
          guideUserId: item.guideUserId,
          guideName: item.guideName || item.fullName || 'Certified Guide',
          bio: item.bio || '',
          licenseNumber: item.licenseNumber || '',
          languages: item.languages || '',
          priceAmount: item.priceAmount ?? 0,
          currency: item.currency || 'LKR',
          rating: item.rating,
          imageUrl: item.imageUrl || '',
          status: item.status
        })));
      } else {
        setGuides([]);
      }
    } catch {
      setGuides([]);
    } finally {
      setLoadingGuides(false);
    }
  };

  const fetchAvailableVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const res = await api.get('/api/capacity/available-vehicles-slots', {
        params: {
          startDate,
          durationDays: selectedPackage?.durationDays || 1,
          passengerCount
        }
      });
      const list = Array.isArray(res.data)
        ? res.data
        : (res.data?.vehicles || res.data?.data || []);

      setVehicles(list || []);
    } catch (err) {
      console.warn("Error fetching available vehicles from DB:", err);
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleRaiseCuratedRequest = async () => {
    if (!selectedVehicle) {
      showToast('Validation Error', 'Please select a vehicle escort for your journey.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const parsedPackageId = selectedPackage?.id != null
        ? (typeof selectedPackage.id === 'number' ? selectedPackage.id : parseInt(String(selectedPackage.id), 10) || selectedPackage.id)
        : null;

      const payload = {
        packageId: parsedPackageId,
        guideSlotId: selectedGuide?.id || null,
        vehicleId: selectedVehicle?.id || null,
        vehicleSlotId: selectedVehicle?.id || null,
        startDate: startDate,
        pickupTime: pickupTime,
        passengerCount: passengerCount,
        notes: travelerNotes.trim(),
        travelerNotes: travelerNotes.trim()
      };

      await api.post('/api/bookings/raise-curated-request', payload);

      showToast(
        'Booking Request Submitted!',
        'Your curated package booking request has been submitted for Concierge Approval.',
        'success'
      );

      onSuccess?.();
      onClose();
      navigate('/my-bookings');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit booking request.';
      showToast('Request Failed', msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          variants={scaleInModalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative w-full max-w-3xl bg-[#0F1A24] border border-[#C5A880]/30 rounded-2xl shadow-2xl overflow-hidden text-stone-100 font-sans flex flex-col max-h-[90vh]"
        >
          {/* Top Header Banner */}
          <div className="p-6 pb-4 border-b border-stone-800 bg-gradient-to-r from-[#0B131F] to-[#134E4A]/30 relative shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-mono text-[#C5A880] uppercase tracking-widest font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>FLOW 1: CURATED SIGNATURE PACKAGE BOOKING</span>
            </div>

            <h2 className="text-2xl font-serif-luxury font-bold text-stone-100">
              {selectedPackage?.title || 'Curated Package Booking'}
            </h2>

            {/* Stepper Header Pills */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[
                { step: 1, label: '1. Dates & Pax' },
                { step: 2, label: '2. Select Guide' },
                { step: 3, label: '3. Select Vehicle' },
                { step: 4, label: '4. Summary & Submit' },
              ].map((s) => (
                <div
                  key={s.step}
                  onClick={() => s.step < currentStep && setCurrentStep(s.step)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-mono font-bold text-center border transition-all cursor-pointer ${
                    currentStep === s.step
                      ? 'bg-[#C5A880] text-slate-950 border-[#D4AF37]'
                      : currentStep > s.step
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                      : 'bg-slate-900/60 text-stone-500 border-stone-800'
                  }`}
                >
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* STEP 1: SELECTED JOURNEY SUMMARY & DATES */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                  Step 1: Selected Journey Summary & Date
                </h3>

                <div className="p-5 bg-slate-900/80 rounded-2xl border border-stone-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedPackage?.imageUrl && (
                    <img
                      src={selectedPackage.imageUrl}
                      alt="Package"
                      className="w-full h-36 object-cover rounded-xl border border-stone-800"
                    />
                  )}

                  <div className="md:col-span-2 space-y-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#134E4A] text-emerald-200 border border-emerald-500/30 font-bold">
                      Curated Signature Package
                    </span>
                    <h4 className="text-xl font-serif-luxury font-bold text-stone-100">
                      {selectedPackage?.title || 'Curated Signature Package'}
                    </h4>

                    {selectedPackage?.destinationsCovered && (
                      <p className="text-xs text-[#C5A880] font-mono">
                        Route: {selectedPackage.destinationsCovered}
                      </p>
                    )}

                    {selectedPackage?.highlights && selectedPackage.highlights.length > 0 && (
                      <div className="pt-1 space-y-1">
                        {selectedPackage.highlights.slice(0, 3).map((h, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-stone-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between text-xs font-mono border-t border-stone-800">
                      {selectedPackage?.durationDays ? (
                        <span className="text-stone-400">
                          Duration: {selectedPackage.durationDays} Days{selectedPackage?.durationNights ? ` / ${selectedPackage.durationNights} Nights` : ''}
                        </span>
                      ) : <span />}
                      {selectedPackage?.priceUsd != null && (
                        <span className="text-[#D4AF37] font-bold text-base font-serif">
                          Starting Base Price: ${selectedPackage.priceUsd} USD
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">Trip Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 focus:border-[#C5A880] outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">Preferred Pickup Time</label>
                    <input
                      type="text"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      placeholder="e.g. 06:30 AM"
                      className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 focus:border-[#C5A880] outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">Number of Travelers (Pax)</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={passengerCount}
                      onChange={(e) => setPassengerCount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 focus:border-[#C5A880] outline-none text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: SELECT CERTIFIED GUIDE */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                    Step 2: Select Certified Guide (Guide Availability)
                  </h3>
                  <span className="text-xs font-mono text-stone-400">Available on {startDate}</span>
                </div>

                {loadingGuides ? (
                  <div className="py-12 text-center text-stone-400 font-mono text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C5A880]" />
                    <span>Querying live database for certified guides...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {guides.map((g) => {
                      const isSelected = selectedGuide?.id === g.id;
                      return (
                        <div
                          key={g.id}
                          onClick={() => setSelectedGuide(g)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-3 ${
                            isSelected
                              ? 'bg-[#134E4A]/30 border-[#C5A880] text-stone-100 shadow-xl'
                              : 'bg-slate-900/60 border-stone-800 text-stone-300 hover:border-stone-700'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-slate-800 border border-stone-700 overflow-hidden shrink-0 flex items-center justify-center text-[#C5A880]">
                              {g.imageUrl ? (
                                <img src={g.imageUrl} alt={g.guideName} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-6 h-6" />
                              )}
                            </div>

                            <div className="flex-1 space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="font-serif-luxury font-bold text-stone-100 text-base">
                                  {g.guideName}
                                </span>
                                {isSelected && <Check className="w-4 h-4 text-[#D4AF37] shrink-0" />}
                              </div>
                              <span className="text-[11px] font-mono text-emerald-400 block">
                                {g.licenseNumber}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-stone-400 leading-relaxed line-clamp-2">
                            {g.bio}
                          </p>

                          <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-stone-800">
                            <span className="text-stone-400 flex items-center gap-1">
                              <Globe className="w-3 h-3 text-[#C5A880]" />
                              {g.languages}
                            </span>
                            <span className="text-[#C5A880] font-bold">LKR {g.priceAmount.toLocaleString()}/day</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: SELECT VEHICLE */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                    Step 3: Select Vehicle (Transport Inventory)
                  </h3>
                  <span className="text-xs font-mono text-stone-400">Available on {startDate}</span>
                </div>

                {loadingVehicles ? (
                  <div className="py-12 text-center text-stone-400 font-mono text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C5A880]" />
                    <span>Querying transport inventory linked to fleet catalog...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicles.map((v) => {
                      const isExceeded = v.maxPassengers < passengerCount;
                      const isSelected = selectedVehicle?.id === v.id;
                      return (
                        <div
                          key={v.id}
                          onClick={() => {
                            if (!isExceeded) setSelectedVehicle(v);
                          }}
                          className={`p-4 rounded-2xl border transition-all space-y-3 ${
                            isExceeded
                              ? 'opacity-40 bg-slate-900/30 border-stone-800/80 cursor-not-allowed select-none'
                              : isSelected
                              ? 'bg-[#134E4A]/30 border-[#C5A880] text-stone-100 shadow-xl cursor-pointer'
                              : 'bg-slate-900/60 border-stone-800 text-stone-300 hover:border-stone-700 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <img
                              src={v.imageUrl}
                              alt={v.vehicleModel}
                              className={`w-16 h-16 object-cover rounded-xl border border-stone-700 shrink-0 ${isExceeded ? 'grayscale opacity-60' : ''}`}
                            />
                            <div className="flex-1 space-y-1">
                              {isExceeded ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/80 text-rose-300 border border-rose-800 font-semibold block w-fit">
                                  Exceeds Capacity (Max {v.maxPassengers} Pax)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-[#C5A880] border border-stone-700 font-bold">
                                  {v.categoryBadge}
                                </span>
                              )}
                              <h4 className="font-bold text-stone-100 text-sm font-serif-luxury">
                                {v.vehicleModel}
                              </h4>
                              <p className="text-[11px] text-stone-400">Max {v.maxPassengers} Passengers</p>
                            </div>
                            {isSelected && !isExceeded && <Check className="w-4 h-4 text-[#D4AF37] shrink-0" />}
                          </div>

                          <p className="text-xs text-stone-400 leading-relaxed font-sans">
                            {v.featureHighlight}
                          </p>

                          <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-stone-800">
                            <span className="text-stone-400">Daily vehicle rate</span>
                            <span className="text-[#D4AF37] font-bold">${v.dailyRateUsd} USD</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: SUMMARY & SUBMIT REQUEST */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                  Step 4: Summary & Submit Request
                </h3>

                <div className="p-5 bg-slate-900/90 rounded-2xl border border-[#C5A880]/30 space-y-4 text-xs font-sans">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-stone-800">
                    <div>
                      <span className="text-stone-400 block font-mono">Curated Package</span>
                      <span className="text-stone-100 font-bold font-serif-luxury text-base">
                        {selectedPackage?.title || 'Curated Package'}
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400 block font-mono">Date, Time & Passengers</span>
                      <span className="text-stone-100 font-bold font-mono">
                        {startDate} at {pickupTime} ({passengerCount} Pax)
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400 block font-mono">Selected Certified Guide</span>
                      <span className="text-stone-100 font-semibold">
                        {selectedGuide ? selectedGuide.guideName : 'To be assigned'}
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400 block font-mono">Selected Transport Vehicle</span>
                      <span className="text-stone-100 font-semibold">
                        {selectedVehicle ? selectedVehicle.vehicleModel : 'To be assigned'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">Special requests / luggage notes</label>
                    <textarea
                      rows={3}
                      value={travelerNotes}
                      onChange={(e) => setTravelerNotes(e.target.value)}
                      placeholder="Special requests, dietary preferences, or luggage notes..."
                      className="w-full bg-slate-950 border border-stone-700 rounded-xl p-3 text-stone-100 focus:border-[#C5A880] outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-[#134E4A]/30 border border-emerald-500/30 rounded-xl text-emerald-200 text-xs flex items-center gap-2 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Submitting auto-holds the vehicle slot and dispatches alert to Capacity Desk & Concierge Agent.</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-stone-800 bg-[#0B131F] flex items-center justify-between shrink-0">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-stone-700 text-stone-300 text-xs font-semibold hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>
            ) : <div />}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 transition flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Step {currentStep + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <motion.button
                {...buttonPressProps}
                type="button"
                onClick={handleRaiseCuratedRequest}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Booking Request for Concierge Approval</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Also export as alias CuratedPackageBookingModal to guarantee backwards compatibility
export const CuratedPackageBookingModal = CuratedBookingModal;
