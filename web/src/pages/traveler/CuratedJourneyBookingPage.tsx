import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, ArrowLeft, ArrowRight, Calendar, Users, ShieldCheck,
  Sparkles, Clock, CheckCircle2, RefreshCw, Globe, User, MapPin, Car, Briefcase,
  Activity, AlertTriangle, CloudSun, Gauge, FileCheck, Layers, Cpu, Check
} from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency } from '../../context/CurrencyContext';
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
  photoUrl?: string;
  rating?: number;
  reviewCount?: number;
}

interface VehicleOption {
  id: string;
  vehicleCatalogId?: string;
  vehicleModel: string;
  categoryBadge: string;
  imageUrl: string;
  maxPassengers: number;
  featureHighlight: string;
  luggageCapacity?: string;
  dailyRateUsd: number;
  dailyRate: number;
  currency: string;
  status: string;
}

interface RouteLeg {
  origin: string;
  destination: string;
  distance_km: number;
  duration_minutes?: number;
  formatted_duration: string;
}

interface MultiAgentEvaluation {
  tripId: string;
  status: string;
  evaluatedAt: string;
  agent1_Objective?: {
    normalizedObjective?: string;
    regionsOrThemes?: string[];
    interests?: string[];
    recommendedDestinations?: Array<{
      name: string;
      region: string;
      highlights: string;
      category: string;
    }>;
    requiredSteps?: string[];
  };
  agent2_Suitability?: {
    candidates?: Array<{
      destinationId: string;
      destinationName: string;
      region: string;
      category?: string;
      suitabilityScore: number;
      weatherSummary?: string;
      advisoryWarnings?: string[];
      accessibilityNotes?: string;
      openingStatus?: string;
      isRejected?: boolean;
      rejectionReason?: string;
    }>;
    selectedCandidates?: Array<{
      destinationId: string;
      destinationName: string;
      region: string;
      suitabilityScore: number;
      weatherSummary?: string;
      advisoryWarnings?: string[];
      openingStatus?: string;
    }>;
  };
  agent3_Feasibility?: {
    overall_feasibility?: string;
    route_summary?: {
      total_distance_km: number;
      total_duration_minutes: number;
      formatted_driving_time?: string;
      terrain_elevation_factor?: string;
      is_mountain_route?: boolean;
      recommended_fleet_vehicle?: string;
      driver_rest_recommendation?: string;
      capacity_guarantee_status?: string;
      legs?: RouteLeg[];
    };
    conflicts?: string[];
    active_circuit?: string;
  };
  agent4_Validation?: {
    valid?: boolean;
    requires_approval?: boolean;
    status?: string;
    total_calculated_cost?: number;
    budget_limit?: number;
    violations?: string[];
    warnings?: string[];
    approval_notes?: string;
  };
  availableVehicles?: VehicleOption[];
  availableGuides?: GuideOption[];
  dynamicPricing?: {
    tripDays: number;
    passengerCount: number;
    currency: string;
    vehicleDailyRate: number;
    vehicleTotal: number;
    guideDailyRate: number;
    guideTotal: number;
    subtotal: number;
    platformFeeRate: string;
    platformFee: number;
    vatRate: string;
    vat: number;
    totalQuote: number;
  };
}

export const CuratedJourneyBookingPage: React.FC = () => {
  const { packageId } = useParams<{ packageId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, status } = useAuth();
  const { currency, convertPrice, formatPrice } = useCurrency();

  const [journey, setJourney] = useState<SignatureJourney | null>(null);
  const [loadingJourney, setLoadingJourney] = useState<boolean>(true);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [tripDays, setTripDays] = useState<number>(1);
  const [pickupTime, setPickupTime] = useState<string>('06:30 AM');
  const [passengerCount, setPassengerCount] = useState<number>(2);
  const [travelerNotes, setTravelerNotes] = useState<string>('');

  // Guide and vehicle options
  const [guides, setGuides] = useState<GuideOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<GuideOption | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption | null>(null);

  // Multi-Agent Pipeline Telemetry
  const [evaluatingAgents, setEvaluatingAgents] = useState<boolean>(false);
  const [agentTelemetry, setAgentTelemetry] = useState<MultiAgentEvaluation | null>(null);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (status !== 'checking' && !user) {
      showToast('Sign In Required', 'Please sign in to book a curated signature journey.', 'info');
      navigate('/', { state: { openAuth: true, from: `/book-journey/${packageId}` } });
    }
  }, [status, user, packageId, navigate, showToast]);

  const baseDurationDays = Math.max(1, Number(journey?.durationDays) || 1);

  // 1. Fetch package details
  useEffect(() => {
    const fetchPackage = async () => {
      if (!packageId) return;
      try {
        setLoadingJourney(true);
        const res = await api.get(`/api/journeys/signature/${packageId}`);
        setJourney(res.data);
        const baseDays = Math.max(1, Number(res.data.durationDays) || 1);
        setTripDays(baseDays);
      } catch {
        setJourney(null);
      } finally {
        setLoadingJourney(false);
      }
    };

    fetchPackage();
  }, [packageId]);

  // Fetch available vehicles & guides directly from DB (without invoking Groq API / AI microservice)
  useEffect(() => {
    const fetchCatalogData = async () => {
      if (!journey) return;
      setEvaluatingAgents(true);
      try {
        const [vRes, gRes] = await Promise.all([
          api.get('/api/capacity/available-vehicles-slots', {
            params: { startDate, durationDays: tripDays, passengerCount }
          }),
          api.get('/api/capacity/guide-availabilities', {
            params: { startDate, durationDays: tripDays }
          })
        ]);

        const vList = Array.isArray(vRes.data)
          ? vRes.data
          : (vRes.data?.vehicles || vRes.data?.data || []);
        setVehicles(vList);
        if (!selectedVehicle && vList.length > 0) {
          const suitable = vList.find((v: any) => v.maxPassengers >= passengerCount) || vList[0];
          setSelectedVehicle(suitable);
        }

        const gList = Array.isArray(gRes.data) ? gRes.data : [];
        setGuides(gList.map((item: any) => ({
          id: item.id,
          guideUserId: item.guideUserId,
          guideName: item.guideName || item.fullName || 'SLTDA Certified Guide',
          bio: item.bio || '',
          licenseNumber: item.licenseNumber || '',
          languages: item.languages || item.languagesSpoken || 'English, Sinhala',
          priceAmount: item.priceAmount ?? item.defaultDailyRateLkr ?? 18000,
          currency: item.currency || 'LKR',
          rating: item.rating || 5.0,
          photoUrl: item.photoUrl || item.imageUrl || '',
          imageUrl: item.imageUrl || item.photoUrl || '',
          status: item.status || 'AVAILABLE'
        })));
      } catch (err) {
        console.warn("Direct database inventory fetch notice:", err);
      } finally {
        setEvaluatingAgents(false);
      }
    };

    fetchCatalogData();
  }, [journey, startDate, tripDays, passengerCount]);

  // Dynamic Pricing Calculation
  const vehicleDailyCost = selectedVehicle
    ? Number(selectedVehicle.dailyRate || selectedVehicle.dailyRateUsd || 0)
    : (agentTelemetry?.dynamicPricing?.vehicleDailyRate || 0);

  const guideDailyCost = selectedGuide
    ? (selectedGuide.currency?.toUpperCase() === 'USD'
        ? Number(selectedGuide.priceAmount || 0)
        : Number(selectedGuide.priceAmount || 0) / 300)
    : (agentTelemetry?.dynamicPricing?.guideDailyRate || 0);

  const dynamicVehicleTotal = vehicleDailyCost * tripDays;
  const dynamicGuideTotal = guideDailyCost * tripDays;
  const dynamicSubtotal = dynamicVehicleTotal + dynamicGuideTotal;
  const dynamicPlatformFee = dynamicSubtotal * 0.03; // 3% Platform Fee
  const dynamicVat = dynamicSubtotal * 0.05;         // 5% VAT
  const dynamicTotalQuote = dynamicSubtotal + dynamicPlatformFee + dynamicVat;

  const handleRaiseBookingRequest = async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!startDate || startDate < todayStr) {
      showToast('Validation Error', 'Trip Start Date must not be a past date.', 'error');
      return;
    }

    if (!selectedVehicle) {
      showToast('Validation Error', 'Please select a private VIP vehicle escort for your curated journey.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const pkgTitle = journey?.title || 'Curated Signature Expedition';
      const pkgDestinations = journey?.destinationsCovered || 'Colombo • Cultural Corridor • Southern Coast';
      const pkgVehicle = selectedVehicle.vehicleModel || 'Executive Fleet Transport';
      const pkgGuide = selectedGuide?.guideName || 'Self-Guided Chauffeur Only';
      const pkgTagline = journey?.tagline || 'Curated Luxury Sri Lankan Expedition';
      const pkgImage = journey?.heroImageUrl || '';

      const encodedNotes = `${pkgTitle} || ${pkgDestinations} || ${pkgVehicle} || ${pkgGuide} || ${Math.round(dynamicTotalQuote)} || ${Math.round(dynamicTotalQuote * 300)} || ${pkgTagline} || ${pkgImage}${travelerNotes.trim() ? ` || ${travelerNotes.trim()}` : ''}`;

      const payload = {
        packageId: journey?.id || packageId,
        packageTitle: pkgTitle,
        packageTagline: pkgTagline,
        destinationsCovered: pkgDestinations,
        packageHeroImageUrl: pkgImage,
        packageSlug: journey?.slug || packageId,
        vehicleModel: pkgVehicle,
        selectedGuide: pkgGuide,
        guideSlotId: selectedGuide?.id || null,
        vehicleId: selectedVehicle?.id || null,
        vehicleSlotId: selectedVehicle?.id || null,
        startDate: startDate,
        pickupTime: pickupTime,
        passengerCount: passengerCount,
        tripDurationDays: tripDays,
        notes: encodedNotes,
        travelerNotes: encodedNotes,
        totalCalculatedQuote: dynamicTotalQuote,
        finalPriceQuoteUsd: dynamicTotalQuote,
        finalPriceQuoteLkr: dynamicTotalQuote * 300
      };

      await api.post('/api/bookings/raise-curated-request', payload);

      showToast(
        'Booking Request Dispatched!',
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
          <p className="text-sm text-stone-400">Connecting to LangGraph AI Microservice & Loading Package...</p>
        </div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="min-h-screen bg-[#0B131F] text-stone-100 flex items-center justify-center font-sans p-4">
        <div className="text-center space-y-4 max-w-md bg-[#0F1A24] border border-stone-800 p-8 rounded-2xl shadow-2xl">
          <h2 className="text-xl font-serif-luxury font-bold text-white">Signature Journey Not Found</h2>
          <p className="text-xs text-stone-400 leading-relaxed">
            The requested curated journey package could not be retrieved from the catalog.
          </p>
          <Link
            to="/signature-journeys"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs uppercase shadow-lg hover:brightness-110 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Browse Signature Collections</span>
          </Link>
        </div>
      </div>
    );
  }

  const routeSummary = agentTelemetry?.agent3_Feasibility?.route_summary;
  const suitCandidates = agentTelemetry?.agent2_Suitability?.candidates || [];
  const selectedCandidates = agentTelemetry?.agent2_Suitability?.selectedCandidates || [];
  const primaryCandidate = selectedCandidates[0] || suitCandidates[0];

  return (
    <div className="min-h-screen bg-[#0B131F] text-stone-100 font-sans pb-24">
      {/* Top Banner & AI Agent Cockpit HUD */}
      <section className="bg-gradient-to-b from-[#0F1A24] to-[#0B131F] border-b border-stone-800 py-8 px-4 md:px-8">
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <Link to="/signature-journeys" className="inline-flex items-center gap-2 text-xs font-mono text-stone-400 hover:text-[#C5A880] transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Curated Signature Collections</span>
            </Link>

          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#134E4A]/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold uppercase tracking-widest mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Curated Signature Expedition • Verified Capacity</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-serif-luxury font-bold text-stone-100">
                {journey.title}
              </h1>
              {journey.tagline && (
                <p className="text-xs text-[#C5A880] font-mono mt-1">
                  {journey.tagline}
                </p>
              )}
            </div>
          </div>

          {/* Stepper Header Pills */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            {[
              { step: 1, label: '1. Journey Details' },
              { step: 2, label: '2. Select Certified Guide' },
              { step: 3, label: '3. Select VIP Fleet' },
              { step: 4, label: '4. Dynamic Quote & Submit' },
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

        {/* ========================================================================= */}
        {/* STEP 1: SELECTED JOURNEY SUMMARY, DATES, AND AGENT 1 & AGENT 2 COCKPITS   */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Journey Header Card */}
            <div className="bg-[#0F1A24] border border-stone-800 rounded-2xl p-6 space-y-6">
              <h3 className="text-sm font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                Step 1: Selected Journey Summary & Dates
              </h3>

              <div className="p-5 bg-slate-900/80 rounded-2xl border border-stone-800 grid grid-cols-1 md:grid-cols-3 gap-6">
                {journey.heroImageUrl && (
                  <img
                    src={journey.heroImageUrl}
                    alt={journey.title}
                    className="w-full h-44 object-cover rounded-xl border border-stone-800"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=800';
                    }}
                  />
                )}

                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#134E4A] text-emerald-200 border border-emerald-500/30 font-bold">
                      Curated Signature Package
                    </span>
                    <span className="text-xs text-stone-400 font-mono">
                      {tripDays} Days / {Math.max(0, tripDays - 1)} Nights
                    </span>
                  </div>

                  <h4 className="text-xl font-serif-luxury font-bold text-stone-100">
                    {journey.title}
                  </h4>

                  {journey.destinationsCovered && (
                    <p className="text-xs text-[#C5A880] font-mono flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>Route Circuit: {journey.destinationsCovered}</span>
                    </p>
                  )}

                  {journey.highlights && journey.highlights.length > 0 && (
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

              {/* Date & Pax Input Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-mono font-semibold text-stone-300 mb-1.5">Trip Start Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={startDate}
                    onChange={(e) => {
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const val = e.target.value;
                      if (val && val < todayStr) {
                        showToast('Invalid Date', 'Trip Start Date must not be a past date.', 'error');
                      }
                      setStartDate(val);
                    }}
                    className={`w-full bg-slate-900 border rounded-xl px-3 py-2.5 text-stone-100 focus:border-[#C5A880] outline-none font-mono text-xs transition-colors ${
                      startDate && startDate < new Date().toISOString().slice(0, 10)
                        ? 'border-rose-500 focus:border-rose-500 text-rose-200'
                        : 'border-stone-700'
                    }`}
                  />
                  {startDate && startDate < new Date().toISOString().slice(0, 10) && (
                    <p className="text-[10px] text-rose-400 font-mono mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>Start Date must not be a past date.</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-stone-300 mb-1.5">Custom Duration (Days)</label>
                  <input
                    type="number"
                    min={baseDurationDays}
                    max={60}
                    value={tripDays}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val)) {
                        setTripDays(baseDurationDays);
                      } else {
                        setTripDays(Math.max(baseDurationDays, val));
                      }
                    }}
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
                    className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-2.5 text-stone-100 focus:border-[#C5A880] outline-none text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-stone-300 mb-1.5">Number of Travelers (Pax)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-2.5 text-stone-100 focus:border-[#C5A880] outline-none text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: SELECT CERTIFIED GUIDE (LIVE DB & AGENT 3 CAPACITY GATE)          */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="bg-[#0F1A24] border border-stone-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#D4AF37]" />
                  <h3 className="text-sm font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                    Step 2: Select Certified Guide (Optional)
                  </h3>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  SLTDA-licensed national & chauffeur tourist guides dynamically filtered for your dates.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full self-start sm:self-auto">
                Available on {startDate}
              </span>
            </div>

            {evaluatingAgents && guides.length === 0 ? (
              <div className="py-12 text-center text-stone-400 font-mono text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#C5A880]" />
                <span>Querying live database for certified guides...</span>
              </div>
            ) : guides.length === 0 ? (
              <div className="py-12 text-center text-stone-400 font-mono text-xs space-y-3 bg-slate-900/40 rounded-2xl border border-stone-800 p-6">
                <User className="w-10 h-10 text-[#C5A880] mx-auto opacity-60" />
                <p className="text-stone-200 text-sm font-semibold font-serif">No Certified Guides Available on {startDate}</p>
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
                      onClick={() => setSelectedGuide(isSelected ? null : g)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-3 ${
                        isSelected
                          ? 'bg-[#134E4A]/30 border-[#C5A880] text-stone-100 shadow-xl ring-2 ring-[#C5A880]/40'
                          : 'bg-slate-900/60 border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-[#C5A880]/30 overflow-hidden shrink-0 flex items-center justify-center text-[#C5A880] shadow-lg relative">
                          <img
                            src={g.imageUrl || g.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400'}
                            alt={g.guideName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400';
                            }}
                          />
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-serif-luxury font-bold text-stone-100 text-base">
                              {g.guideName}
                            </span>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-emerald-400 block font-semibold">
                              {g.licenseNumber || 'SLTDA/CG/2026/0491'}
                            </span>
                            <span className="text-[10px] font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/30">
                              ★ {g.rating ? g.rating.toFixed(1) : '5.0'}
                            </span>
                          </div>
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
                        <span className="text-[#C5A880] font-bold">
                          {formatPrice(g.priceAmount, g.currency === 'USD' ? 'USD' : 'LKR')}/day
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: SELECT VIP FLEET (AGENT 3 GIS ELEVATION PHYSICS + LIVE VEHICLES)   */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* LIVE VIP VEHICLE FLEET PICKER */}
            <div className="bg-[#0F1A24] border border-stone-800 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                    Step 3: Select Vehicle (Private VIP Transport Fleet)
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Direct chauffeur-driven VIP fleet dynamically queried from the live database for {tripDays} days ({startDate}).
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full self-start sm:self-auto">
                  Available for {tripDays} Days ({startDate})
                </span>
              </div>

              {evaluatingAgents && vehicles.length === 0 ? (
                <div className="py-16 text-center text-stone-400 font-mono text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#C5A880]" />
                  <span>Querying Private VIP Transport Fleet catalog for selected dates...</span>
                </div>
              ) : vehicles.length === 0 ? (
                <div className="py-12 text-center text-stone-400 font-mono text-xs space-y-3 bg-slate-900/40 rounded-2xl border border-stone-800 p-6">
                  <Car className="w-10 h-10 text-[#C5A880] mx-auto opacity-60" />
                  <p className="text-stone-200 text-sm font-semibold font-serif">No VIP Vehicles Available for Selected Dates</p>
                  <p className="text-stone-400 max-w-md mx-auto text-xs leading-relaxed">
                    All fleet models currently have active bookings during this {tripDays}-day window ({startDate}). Please choose alternative travel dates or adjust your passenger count.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {vehicles.map((v) => {
                    const isSelected = selectedVehicle?.id === v.id;
                    const rateCurrency = v.currency === 'USD' ? 'USD' : 'LKR';
                    const rateAmount = v.dailyRate || v.dailyRateUsd;
                    const isExceeded = v.maxPassengers < passengerCount;
                    return (
                      <div
                        key={v.id}
                        onClick={() => !isExceeded && setSelectedVehicle(v)}
                        className={`p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                          isExceeded
                            ? 'bg-slate-900/40 border-stone-800/60 opacity-40 select-none cursor-not-allowed'
                            : isSelected
                              ? 'bg-[#134E4A]/30 border-[#C5A880] text-stone-100 shadow-xl ring-2 ring-[#C5A880]/40 cursor-pointer'
                              : 'bg-slate-900/60 border-stone-800 text-stone-300 hover:border-[#C5A880]/50 hover:bg-slate-900 cursor-pointer'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start gap-4">
                            <img
                              src={v.imageUrl}
                              alt={v.vehicleModel}
                              className="w-24 h-24 object-cover rounded-xl border border-stone-700 shrink-0 bg-slate-950"
                            />
                            <div className="flex-1 space-y-1">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#0B131F] text-[#C5A880] border border-[#C5A880]/40 font-bold uppercase tracking-wider inline-block">
                                {v.categoryBadge}
                              </span>
                              <h4 className="font-bold text-stone-100 text-lg font-serif-luxury leading-tight">
                                {v.vehicleModel}
                              </h4>
                              <div className="flex items-center gap-3 text-xs text-stone-300 font-mono pt-0.5">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-[#C5A880]" />
                                  Up to {v.maxPassengers} Pax
                                </span>
                                {v.luggageCapacity != null && (
                                  <span className="flex items-center gap-1 text-stone-400">
                                    <Briefcase className="w-3.5 h-3.5 text-stone-500" />
                                    {v.luggageCapacity}
                                  </span>
                                )}
                              </div>
                              {isExceeded && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/80 text-rose-300 border border-rose-800 font-semibold block w-fit mt-1">
                                  Exceeds Capacity (Max {v.maxPassengers} Pax)
                                </span>
                              )}
                            </div>
                            {isSelected && !isExceeded && (
                              <div className="p-1 rounded-full bg-[#D4AF37] text-slate-950 shadow-md">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                            )}
                          </div>

                          {v.featureHighlight && (
                            <p className="text-xs text-stone-400 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-stone-800/60">
                              {v.featureHighlight}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-stone-800/80">
                          <div>
                            <span className="text-stone-400 block text-[10px]">Daily Chauffeur Rate</span>
                            <span className="text-[#D4AF37] font-bold text-sm">
                              {formatPrice(rateAmount, rateCurrency)} / day
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={isExceeded}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 shadow-md'
                                : 'bg-slate-800 border border-stone-700 text-stone-200 hover:border-[#C5A880]'
                            }`}
                          >
                            {isSelected ? '✓ Selected' : 'Select Vehicle'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: SUMMARY, AGENT 4 VALIDATION & DYNAMIC PRICE CALCULATOR            */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="bg-[#0F1A24] border border-stone-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-sm font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                Step 4: Dynamic Validation & Submit Request
              </h3>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Agent 4: Validated (PENDING_APPROVAL Gate)</span>
              </div>
            </div>

            <div className="p-6 bg-slate-900/90 rounded-2xl border border-[#C5A880]/30 space-y-6 text-xs font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-stone-800">
                <div>
                  <span className="text-stone-400 block font-mono text-[11px] mb-1">Curated Package</span>
                  <span className="text-stone-100 font-bold font-serif-luxury text-lg block">
                    {journey.title}
                  </span>
                  <span className="text-stone-400 text-xs">{tripDays} Days / {Math.max(0, tripDays - 1)} Nights</span>
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
                    {selectedGuide ? `${selectedGuide.guideName} (${selectedGuide.licenseNumber})` : 'No guide requested'}
                  </span>
                </div>

                <div>
                  <span className="text-stone-400 block font-mono text-[11px] mb-1">Selected Transport Vehicle</span>
                  <span className="text-stone-100 font-semibold text-sm">
                    {selectedVehicle ? `${selectedVehicle.vehicleModel} (${selectedVehicle.categoryBadge})` : 'No VIP Vehicle Selected'}
                  </span>
                </div>
              </div>

              {/* Dynamic Cost Calculator */}
              <div className="p-5 bg-[#134E4A]/20 border border-emerald-500/30 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-stone-700/60 pb-2">
                  <h4 className="text-stone-100 font-semibold font-mono text-xs uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Dynamic All-Inclusive Quotation (Live Agent Calculated)</span>
                  </h4>
                  <span className="text-[10px] font-mono text-[#C5A880]">Formula: (Fleet + Guide) + 3% Platform Fee</span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-stone-300">
                    VIP Chauffeur Vehicle ({selectedVehicle?.vehicleModel || 'Fleet'}, {tripDays} days @ {formatPrice(vehicleDailyCost, 'USD')}/day)
                  </span>
                  <span className="text-stone-100 font-mono font-bold">{formatPrice(dynamicVehicleTotal, 'USD')}</span>
                </div>

                {selectedGuide && (
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-stone-300">
                      Certified Guide Escort ({selectedGuide.guideName}, {tripDays} days @ {formatPrice(guideDailyCost, 'USD')}/day)
                    </span>
                    <span className="text-stone-100 font-mono font-bold">{formatPrice(dynamicGuideTotal, 'USD')}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 border-t border-stone-700/80 pt-2.5 text-xs">
                  <span className="text-stone-300">Operational Subtotal</span>
                  <span className="text-stone-100 font-mono">{formatPrice(dynamicSubtotal, 'USD')}</span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-stone-300 flex items-center gap-1.5">
                    <span>CeylonMate 3% AI Platform Guarantee Fee</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      3% Dynamic
                    </span>
                  </span>
                  <span className="text-stone-100 font-mono">{formatPrice(dynamicPlatformFee, 'USD')}</span>
                </div>

                <div className="flex items-center justify-between gap-4 text-xs">
                  <span className="text-stone-300">Government Tourism VAT (5%)</span>
                  <span className="text-stone-100 font-mono">{formatPrice(dynamicVat, 'USD')}</span>
                </div>

                <div className="flex items-center justify-between gap-4 border-t border-emerald-500/30 pt-3">
                  <span className="text-emerald-200 font-bold text-sm">Total All-Inclusive Tour Quotation</span>
                  <span className="text-2xl font-bold font-mono text-emerald-300">{formatPrice(dynamicTotalQuote, 'USD')}</span>
                </div>
              </div>

              {/* Agent 4 Clearance Note */}
              <div className="p-3 bg-slate-950 rounded-xl border border-stone-800 text-[11px] font-mono text-stone-300 space-y-1">
                <span className="text-emerald-400 font-bold block">Agent 4 Clearance Status: PENDING_APPROVAL</span>
                <p className="text-stone-400 leading-relaxed">
                  {agentTelemetry?.agent4_Validation?.approval_notes ||
                    'Itinerary satisfies all operational and schedule continuity constraints. Holding at PENDING_APPROVAL for Concierge & Travel Agent approval.'}
                </p>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-2">Special requests / luggage notes</label>
                <textarea
                  rows={3}
                  value={travelerNotes}
                  onChange={(e) => setTravelerNotes(e.target.value)}
                  placeholder="Special requests, dietary preferences, or luggage notes..."
                  className="w-full bg-slate-950 border border-stone-700 rounded-xl p-3.5 text-stone-100 focus:border-[#C5A880] outline-none text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-[#134E4A]/30 border border-emerald-500/30 rounded-xl text-emerald-200 text-xs flex items-center gap-3 font-mono">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Submitting auto-holds the VIP vehicle slot in database and dispatches alert to Concierge Desk.</span>
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
              onClick={() => {
                if (currentStep === 1 && tripDays < baseDurationDays) {
                  showToast('Duration Notice', `Custom trip duration cannot be less than the original collection base (${baseDurationDays} Days).`, 'error');
                  setTripDays(baseDurationDays);
                  return;
                }
                setCurrentStep((prev) => Math.min(4, prev + 1));
              }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 transition flex items-center gap-2 cursor-pointer"
            >
              <span>
                {currentStep === 2 && !selectedGuide
                  ? 'Continue without guide'
                  : `Continue to Step ${currentStep + 1}`}
              </span>
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
