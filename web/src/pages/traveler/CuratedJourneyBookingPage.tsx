import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { motion } from 'framer-motion';
import {
  Compass, ArrowLeft, ArrowRight, Calendar, Users, ShieldCheck,
  Sparkles, Clock, CheckCircle2, RefreshCw, Globe, User, MapPin
} from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../auth/AuthProvider';
import { buttonPressProps } from '../../utils/animations';

interface SignatureJourney {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  heroImageUrl: string;
  durationDays: number;
  durationNights: number;
  startingPriceUsd: number;
  startingPriceLkr: number;
  destinationsCovered: string;
  highlights: string[];
}

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
  pricePerSeatLkr: number;
  currency: string;
  status: string;
}

export const CuratedJourneyBookingPage: React.FC = () => {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { currency, formatPrice } = useCurrency();
  const { user, status } = useAuth();

  const [journey, setJourney] = useState<SignatureJourney | null>(null);
  const [loadingJourney, setLoadingJourney] = useState<boolean>(true);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [pickupTime, setPickupTime] = useState<string>('06:30 AM');
  const [passengerCount, setPassengerCount] = useState<number>(2);
  const [travelerNotes, setTravelerNotes] = useState<string>('');

  // Guide and vehicle options
  const [guides, setGuides] = useState<GuideOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loadingGuides, setLoadingGuides] = useState<boolean>(false);
  const [loadingVehicles, setLoadingVehicles] = useState<boolean>(false);

  const [selectedGuide, setSelectedGuide] = useState<GuideOption | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (status !== 'checking' && !user) {
      showToast('Sign In Required', 'Please sign in to book a curated signature journey.', 'info');
      navigate('/', { state: { openAuth: true, from: `/book-journey/${packageId}` } });
    }
  }, [status, user, packageId, navigate, showToast]);

  useEffect(() => {
    const fetchPackage = async () => {
      if (!packageId) return;
      try {
        setLoadingJourney(true);
        const res = await api.get(`/api/journeys/signature/${packageId}`);
        setJourney(res.data);
      } catch {
        // Fallback package if database does not contain exact id
        setJourney({
          id: packageId || 'curated-001',
          title: 'Royal Heritage & Tea Bungalow Expedition',
          slug: 'royal-heritage-tea-expedition',
          tagline: 'Colonial Luxury & Cultural Marvels in Sri Lanka',
          description: 'Experience 7 days of private chauffeured travel through ancient Sigiriya, Kandy Temple of the Tooth, and private tea estate bungalows in Nuwara Eliya.',
          heroImageUrl: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?q=80&w=800',
          durationDays: 7,
          durationNights: 6,
          startingPriceUsd: 1450,
          startingPriceLkr: 435000,
          destinationsCovered: 'Colombo -> Sigiriya -> Kandy -> Nuwara Eliya -> Bentota',
          highlights: [
            'Private SLTDA Certified Chauffeur Escort',
            'Heritage Bungalow Stays with High Tea',
            'VIP Sigiriya Rock Access & Safari Hold'
          ]
        });
      } finally {
        setLoadingJourney(false);
      }
    };

    fetchPackage();
  }, [packageId]);

  useEffect(() => {
    fetchAvailableGuides();
    fetchAvailableVehicles();
  }, [startDate]);

  const fetchAvailableGuides = async () => {
    setLoadingGuides(true);
    try {
      const res = await api.get('/api/guides');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setGuides(res.data.map((item: any) => ({
          id: item.id || item.userId,
          guideUserId: item.userId || item.id,
          guideName: item.fullName || item.name || 'SLTDA Certified Guide',
          bio: item.bio || 'SLTDA Certified Local Tourist Guide',
          licenseNumber: item.licenseNumber || 'SLTDA Certified',
          languages: item.languages || item.languagesSpoken || 'English',
          priceAmount: item.dailyRate || item.defaultDailyRateLkr || 18000,
          currency: item.currency || 'LKR',
          rating: item.rating || 5.0,
          imageUrl: item.photoUrl || item.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
          status: 'AVAILABLE'
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
      const res = await api.get('/api/capacity/vehicles');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setVehicles(res.data);
      } else {
        setVehicles([]);
      }
    } catch {
      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleRaiseBookingRequest = async () => {
    if (!selectedVehicle) {
      showToast('Validation Error', 'Please select a vehicle escort for your journey.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const rawPkg = journey?.id || packageId;
      const pkgIdNum = typeof rawPkg === 'number' ? rawPkg : (parseInt(String(rawPkg), 10) || 101);

      const payload = {
        packageId: pkgIdNum,
        guideSlotId: selectedGuide?.id || null,
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

      navigate('/my-bookings');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit booking request.';
      showToast('Request Failed', msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJourney) {
    return (
      <div className="min-h-screen bg-[#0B131F] text-stone-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-3 font-mono">
          <RefreshCw className="w-8 h-8 text-[#C5A880] animate-spin mx-auto" />
          <p className="text-sm text-stone-400">Loading Curated Journey Details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B131F] text-stone-100 font-sans pb-24">
      {/* Top Banner & Header */}
      <section className="bg-gradient-to-b from-[#0F1A24] to-[#0B131F] border-b border-stone-800 py-8 px-4 md:px-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <Link to="/signature-journeys" className="inline-flex items-center gap-2 text-xs font-mono text-stone-400 hover:text-[#C5A880] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Curated Signature Collections</span>
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#134E4A]/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold uppercase tracking-widest mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Flow 1: Direct Curated Package Pipeline</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-serif-luxury font-bold text-stone-100">
                {journey?.title || 'Curated Signature Collection'}
              </h1>
            </div>

            <div className="px-4 py-2 bg-slate-900 border border-stone-800 rounded-xl text-right shrink-0">
              <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono block">Base Starting Rate</span>
              <span className="text-xl font-bold font-mono text-[#D4AF37]">
                {formatPrice(journey?.startingPriceUsd || 0)}
              </span>
            </div>
          </div>

          {/* Stepper Header Pills */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            {[
              { step: 1, label: '1. Dates & Pax' },
              { step: 2, label: '2. Select Guide' },
              { step: 3, label: '3. Select Vehicle' },
              { step: 4, label: '4. Summary & Submit' },
            ].map((s) => (
              <div
                key={s.step}
                onClick={() => s.step < currentStep && setCurrentStep(s.step)}
                className={`py-2 px-3 rounded-xl text-xs font-mono font-bold text-center border transition-all cursor-pointer ${
                  currentStep === s.step
                    ? 'bg-[#C5A880] text-slate-950 border-[#D4AF37] shadow-lg'
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
      </section>

      {/* Main Form Body */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* STEP 1: SELECTED JOURNEY SUMMARY & DATES */}
        {currentStep === 1 && (
          <div className="bg-[#0F1A24] border border-stone-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-sm font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
              Step 1: Selected Journey Summary & Date
            </h3>

            <div className="p-5 bg-slate-900/80 rounded-2xl border border-stone-800 grid grid-cols-1 md:grid-cols-3 gap-6">
              {journey?.heroImageUrl && (
                <img
                  src={journey.heroImageUrl}
                  alt={journey.title}
                  className="w-full h-44 object-cover rounded-xl border border-stone-800"
                />
              )}

              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#134E4A] text-emerald-200 border border-emerald-500/30 font-bold">
                    Curated Signature Package
                  </span>
                  <span className="text-xs text-stone-400 font-mono">
                    {journey?.durationDays} Days / {journey?.durationNights} Nights
                  </span>
                </div>

                <h4 className="text-xl font-serif-luxury font-bold text-stone-100">
                  {journey?.title}
                </h4>

                {journey?.destinationsCovered && (
                  <p className="text-xs text-[#C5A880] font-mono flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Route: {journey.destinationsCovered}</span>
                  </p>
                )}

                {journey?.highlights && journey.highlights.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {journey.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-stone-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-mono font-semibold text-stone-300 mb-1.5">Trip Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-2.5 text-stone-100 focus:border-[#C5A880] outline-none font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-stone-300 mb-1.5">Preferred Pickup Time</label>
                <input
                  type="text"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  placeholder="e.g. 06:30 AM"
                  className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-2.5 text-stone-100 focus:border-[#C5A880] outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-stone-300 mb-1.5">Number of Travelers (Pax)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-2.5 text-stone-100 focus:border-[#C5A880] outline-none text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: SELECT CERTIFIED GUIDE */}
        {currentStep === 2 && (
          <div className="bg-[#0F1A24] border border-stone-800 rounded-2xl p-6 space-y-6">
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
                      className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-3 ${
                        isSelected
                          ? 'bg-[#134E4A]/30 border-[#C5A880] text-stone-100 shadow-xl'
                          : 'bg-slate-900/60 border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-full bg-slate-800 border border-stone-700 overflow-hidden shrink-0 flex items-center justify-center text-[#C5A880]">
                          {g.imageUrl ? (
                            <img src={g.imageUrl} alt={g.guideName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-7 h-7" />
                          )}
                        </div>

                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-serif-luxury font-bold text-stone-100 text-base">
                              {g.guideName}
                            </span>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0" />}
                          </div>
                          <span className="text-xs font-mono text-emerald-400 block">
                            {g.licenseNumber}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-stone-400 leading-relaxed">
                        {g.bio}
                      </p>

                      <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-stone-800">
                        <span className="text-stone-400 flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-[#C5A880]" />
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
          <div className="bg-[#0F1A24] border border-stone-800 rounded-2xl p-6 space-y-6">
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
                  const isSelected = selectedVehicle?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVehicle(v)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-3 ${
                        isSelected
                          ? 'bg-[#134E4A]/30 border-[#C5A880] text-stone-100 shadow-xl'
                          : 'bg-slate-900/60 border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={v.imageUrl}
                          alt={v.vehicleModel}
                          className="w-20 h-20 object-cover rounded-xl border border-stone-700 shrink-0"
                        />
                        <div className="flex-1 space-y-1">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-[#C5A880] border border-stone-700 font-bold">
                            {v.categoryBadge}
                          </span>
                          <h4 className="font-bold text-stone-100 text-base font-serif-luxury">
                            {v.vehicleModel}
                          </h4>
                          <p className="text-xs text-stone-400">Max {v.maxPassengers} Passengers</p>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0" />}
                      </div>

                      <p className="text-xs text-stone-400 leading-relaxed">
                        {v.featureHighlight}
                      </p>

                      <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-stone-800">
                        <span className="text-stone-400">Rate per seat / day</span>
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
          <div className="bg-[#0F1A24] border border-stone-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-sm font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
              Step 4: Summary & Submit Request
            </h3>

            <div className="p-6 bg-slate-900/90 rounded-2xl border border-[#C5A880]/30 space-y-6 text-xs font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-stone-800">
                <div>
                  <span className="text-stone-400 block font-mono text-[11px] mb-1">Curated Package</span>
                  <span className="text-stone-100 font-bold font-serif-luxury text-lg block">
                    {journey?.title || 'Curated Signature Collection'}
                  </span>
                  <span className="text-stone-400 text-xs">{journey?.durationDays} Days / {journey?.durationNights} Nights</span>
                </div>

                <div>
                  <span className="text-stone-400 block font-mono text-[11px] mb-1">Date, Time & Passengers</span>
                  <span className="text-stone-100 font-bold font-mono text-sm block">
                    {startDate} at {pickupTime}
                  </span>
                  <span className="text-[#C5A880] font-mono text-xs">{passengerCount} Passenger(s)</span>
                </div>

                <div>
                  <span className="text-stone-400 block font-mono text-[11px] mb-1">Selected Certified Guide</span>
                  <span className="text-stone-100 font-semibold text-sm">
                    {selectedGuide ? selectedGuide.guideName : 'Standard Certified Guide Allocation'}
                  </span>
                </div>

                <div>
                  <span className="text-stone-400 block font-mono text-[11px] mb-1">Selected Transport Vehicle</span>
                  <span className="text-stone-100 font-semibold text-sm">
                    {selectedVehicle ? selectedVehicle.vehicleModel : 'Standard VIP Fleet Allocation'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-2">Special requests / luggage notes</label>
                <textarea
                  rows={4}
                  value={travelerNotes}
                  onChange={(e) => setTravelerNotes(e.target.value)}
                  placeholder="Special requests, dietary preferences, or luggage notes..."
                  className="w-full bg-slate-950 border border-stone-700 rounded-xl p-3.5 text-stone-100 focus:border-[#C5A880] outline-none text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-[#134E4A]/30 border border-emerald-500/30 rounded-xl text-emerald-200 text-xs flex items-center gap-3 font-mono">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Submitting auto-holds the vehicle slot and dispatches alert to Capacity Desk & Concierge Agent.</span>
            </div>
          </div>
        )}

        {/* Stepper Navigation Controls */}
        <div className="pt-4 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className="px-5 py-2.5 rounded-xl bg-slate-900 border border-stone-700 text-stone-300 text-xs font-semibold hover:bg-slate-800 transition flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous Step</span>
            </button>
          ) : <div />}

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 transition flex items-center gap-2 cursor-pointer"
            >
              <span>Continue to Step {currentStep + 1}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <motion.button
              {...buttonPressProps}
              type="button"
              onClick={handleRaiseBookingRequest}
              disabled={submitting}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
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
      </main>
    </div>
  );
};

export default CuratedJourneyBookingPage;
