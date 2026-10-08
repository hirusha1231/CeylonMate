import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Calendar, Users, Car, ShieldCheck, ArrowRight, ArrowLeft,
  Sparkles, Clock, FileText, CheckCircle2, AlertTriangle, RefreshCw
} from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
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

interface BookingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  selectedPackage?: {
    id?: number | string;
    title: string;
    priceUsd?: number;
    priceLkr?: number;
    durationDays?: number;
    imageUrl?: string;
  } | null;
}

export const BookingWizardModal: React.FC<BookingWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedPackage
}) => {
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [pickupTime, setPickupTime] = useState<string>('08:00 AM');
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
      setCurrentStep(1);
      fetchAvailableGuides();
      fetchAvailableVehicles();
    }
  }, [isOpen, selectedDate, passengerCount]);

  const fetchAvailableGuides = async () => {
    setLoadingGuides(true);
    try {
      const res = await api.get('/api/capacity/guide-availabilities', {
        params: {
          startDate: selectedDate,
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
          startDate: selectedDate,
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

  const handleRaiseBooking = async () => {
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
        startDate: selectedDate,
        pickupTime: pickupTime,
        passengerCount: passengerCount,
        tripDurationDays: selectedPackage?.durationDays || 1,
        travelerNotes: travelerNotes.trim()
      };

      await api.post('/api/bookings/raise-request', payload);

      showToast(
        'Booking Request Raised!',
        'Your request has been submitted for Travel Agent quote confirmation & Capacity Officer verification.',
        'success'
      );

      onSuccess?.();
      onClose();
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
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-mono text-[#C5A880] uppercase tracking-widest font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>UNIFIED BESPOKE BOOKING WIZARD</span>
            </div>

            <h2 className="text-2xl font-serif-luxury font-bold text-stone-100">
              {selectedPackage?.title || 'Bespoke Journey Booking'}
            </h2>

            {/* Stepper Header Pills */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[
                { step: 1, label: '1. Experience' },
                { step: 2, label: '2. Guide' },
                { step: 3, label: '3. Vehicle' },
                { step: 4, label: '4. Request' },
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
            {/* STEP 1: PACKAGE SUMMARY */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                  Step 1: Confirm Selected Journey Package
                </h3>

                <div className="p-5 bg-slate-900/80 rounded-2xl border border-stone-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedPackage?.imageUrl && (
                    <img
                      src={selectedPackage.imageUrl}
                      alt="Package"
                      className="w-full h-32 object-cover rounded-xl border border-stone-800"
                    />
                  )}

                  <div className="md:col-span-2 space-y-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#134E4A] text-emerald-200 border border-emerald-500/30">
                      Curated Experience Template
                    </span>
                    <h4 className="text-xl font-serif-luxury font-bold text-stone-100">
                      {selectedPackage?.title || 'Bespoke Journey Package'}
                    </h4>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      Includes luxury boutique hotel stays, private SLTDA certified guide escorts, and VIP transport.
                    </p>
                    <div className="pt-2 flex items-center justify-between text-xs font-mono border-t border-stone-800">
                      {selectedPackage?.durationDays ? (
                        <span className="text-stone-400">Duration: {selectedPackage.durationDays} Days</span>
                      ) : <span />}
                      {selectedPackage?.priceUsd != null && (
                        <span className="text-[#D4AF37] font-bold text-base font-serif">
                          ${selectedPackage.priceUsd} USD
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">Target Start Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 focus:border-[#C5A880] outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">Preferred Pickup Time</label>
                    <input
                      type="text"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      placeholder="e.g. 08:30 AM"
                      className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 focus:border-[#C5A880] outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">Travelers (Pax)</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={passengerCount}
                      onChange={(e) => setPassengerCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 focus:border-[#C5A880] outline-none font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: SELECT GUIDE */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                    Step 2: Choose Certified Chauffeur / Guide
                  </h3>
                  <span className="text-xs font-mono text-stone-400">Available on {selectedDate}</span>
                </div>

                {loadingGuides ? (
                  <div className="py-12 text-center text-stone-400 font-mono text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C5A880]" />
                    <span>Loading active certified guides...</span>
                  </div>
                ) : guides.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 font-mono text-xs space-y-3 bg-slate-900/40 rounded-2xl border border-stone-800 p-6">
                    <UserCheck className="w-10 h-10 text-[#C5A880] mx-auto opacity-60" />
                    <p className="text-stone-200 text-sm font-semibold font-serif">No certified guides are available for the selected dates.</p>
                    <p className="text-stone-400 max-w-md mx-auto text-xs leading-relaxed">
                      You can proceed without a guide, or select alternative travel dates.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {guides.map((g) => {
                      const isSelected = selectedGuide?.id === g.id;
                      return (
                        <div
                          key={g.id}
                          onClick={() => setSelectedGuide(g)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                            isSelected
                              ? 'bg-[#134E4A]/30 border-[#C5A880] text-stone-100 shadow-xl'
                              : 'bg-slate-900/60 border-stone-800 text-stone-300 hover:border-stone-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-serif-luxury font-bold text-stone-100 text-base">
                              {g.guideName}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-[#D4AF37]" />}
                          </div>

                          <p className="text-xs text-stone-400 leading-relaxed line-clamp-2">
                            {g.bio}
                          </p>

                          <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-stone-800">
                            <span className="text-stone-400">{g.languages}</span>
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
                    Step 3: Choose VIP Transport Vehicle Escort
                  </h3>
                  <span className="text-xs font-mono text-stone-400">Available on {selectedDate}</span>
                </div>

                {loadingVehicles ? (
                  <div className="py-12 text-center text-stone-400 font-mono text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C5A880]" />
                    <span>Loading available VIP transport fleet...</span>
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
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-[#C5A880] border border-stone-700">
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
                            <span className="text-stone-400">Rate/Day</span>
                            <span className="text-[#D4AF37] font-bold">${v.dailyRateUsd} USD</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: RAISE BOOKING REQUEST SUMMARY */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                  Step 4: Review & Raise Booking Request
                </h3>

                <div className="p-5 bg-slate-900/90 rounded-2xl border border-[#C5A880]/30 space-y-4 text-xs font-sans">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-stone-800">
                    <div>
                      <span className="text-stone-400 block font-mono">Package Experience</span>
                      <span className="text-stone-100 font-bold font-serif-luxury text-base">
                        {selectedPackage?.title || 'Bespoke Journey'}
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400 block font-mono">Target Date & Time</span>
                      <span className="text-stone-100 font-bold font-mono">
                        {selectedDate} at {pickupTime}
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400 block font-mono">Assigned Chauffeur Guide</span>
                      <span className="text-stone-100 font-semibold">
                        {selectedGuide ? selectedGuide.guideName : 'To be assigned'}
                      </span>
                    </div>

                    <div>
                      <span className="text-stone-400 block font-mono">Assigned Fleet Escort</span>
                      <span className="text-stone-100 font-semibold">
                        {selectedVehicle ? selectedVehicle.vehicleModel : 'To be assigned'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">Special Traveler Requests / Notes</label>
                    <textarea
                      rows={3}
                      value={travelerNotes}
                      onChange={(e) => setTravelerNotes(e.target.value)}
                      placeholder="e.g. Airport pickup required at 08:00 AM, child seat needed..."
                      className="w-full bg-slate-950 border border-stone-700 rounded-xl p-3 text-stone-100 focus:border-[#C5A880] outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#134E4A]/30 border border-emerald-500/30 rounded-xl text-emerald-200 text-xs flex items-center gap-2 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Submitting puts a temporary 15-minute seat & guide hold and alerts your Concierge Travel Agent.</span>
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
                onClick={handleRaiseBooking}
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
                    <span>Raise Booking Request</span>
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
