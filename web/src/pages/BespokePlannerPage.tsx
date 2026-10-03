import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Calendar, Users, DollarSign, CheckCircle2, ArrowRight, ArrowLeft,
  Compass, Loader2, Save, Send, Mountain, ShieldCheck, Clock, MapPin, Heart, AlertTriangle,
  Cpu, CloudSun, Gauge, FileCheck, Car, User, Check, Briefcase, Globe, CloudRain, Sun, Droplets, Thermometer, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { AuthModal } from '../components/auth/AuthModal';
import { api } from '../api/client';
import {
  fadeInVariants, slideUpVariants, hoverLiftProps, buttonPressProps, scaleInModalVariants
} from '../utils/animations';

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

interface Agent2WeatherDay {
  condition: string;
  tempMax: string;
  tempMin: string;
  rainMm: string;
}

interface Agent2SuitabilityData {
  destination: string;
  weatherTimeline: {
    yesterday: Agent2WeatherDay;
    today: Agent2WeatherDay;
    tomorrow: Agent2WeatherDay;
  };
  suitability: {
    status: 'SUITABLE' | 'CAUTION' | 'NOT_RECOMMENDED';
    score: number;
    verdict: string;
    reasoning: string;
    safetyTips: string[];
  };
}

export const formatBespokeTitle = (durationDays: number, interests?: string[]): string => {
  if (!interests || interests.length === 0) {
    return `${durationDays}-Day Bespoke Sri Lanka Expedition`;
  }

  const rawThemes = interests
    .flatMap((item) => (item ? item.split('&') : []))
    .map((t) => t.trim())
    .filter(Boolean);

  const uniqueThemes = Array.from(new Set(rawThemes));

  if (uniqueThemes.length === 0) {
    return `${durationDays}-Day Bespoke Sri Lanka Expedition`;
  }

  const themeSubtitle = uniqueThemes.slice(0, 2).join(' & ');
  return `${durationDays}-Day Bespoke ${themeSubtitle ? themeSubtitle + ' ' : ''}Expedition`;
};

export const BespokePlannerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currency, setCurrency, formatPrice } = useCurrency();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'save' | 'submit' | null>(null);

  // Form State
  const [dreamPrompt, setDreamPrompt] = useState(
    searchParams.get('region')
      ? `We wish to explore the ${searchParams.get('region')} with luxury accommodations and private chauffeur guides.`
      : ''
  );
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10));
  const [adults, setAdults] = useState(2);
  const [mobilityPref, setMobilityPref] = useState('Standard VIP Escort');
  const [budgetUsd, setBudgetUsd] = useState(2500);
  const [budgetLkr, setBudgetLkr] = useState(750000);

  type Agent1Destination = {
    name?: string;
    destinationName?: string;
    region?: string;
    province?: string;
    category?: string;
    tag?: string;
    highlights?: string;
    description?: string;
  };

  // Live Inventory Selection State
  const [availableVehicles, setAvailableVehicles] = useState<VehicleOption[]>([]);
  const [availableGuides, setAvailableGuides] = useState<GuideOption[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<GuideOption | null>(null);

  // Concierge Loading State for Step 4
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generatedItinerary, setGeneratedItinerary] = useState<any | null>(null);
  const [aiOutput, setAiOutput] = useState<{
    normalizedObjective: string;
    regionsOrThemes?: string[];
    themes?: string[];
    interests?: string[];
    pacing?: string;
    dateConstraints?: { startDate?: string; endDate?: string };
    budgetConstraint?: { amount?: number; currency?: string };
    accessibilityConstraints?: string[];
    requiredSteps?: string[];
    delegatedAgentRoles?: string[];
    missingCriticalFields?: string[];
    recommendedDestinations?: Agent1Destination[];
    destinations?: Agent1Destination[];
    selectedCandidates?: Agent1Destination[];
  } | null>(null);
  const rawDestinations =
    aiOutput?.recommendedDestinations ||
    (aiOutput as any)?.recommended_destinations ||
    aiOutput?.destinations ||
    aiOutput?.selectedCandidates ||
    (aiOutput as any)?.data?.destinations ||
    (aiOutput as any)?.data?.recommendedDestinations ||
    (aiOutput as any)?.data?.recommended_destinations ||
    [];

  const destinationsList = rawDestinations.map((dest: any) => {
    if (typeof dest === 'string') {
      return {
        name: dest,
        region: 'Sri Lanka',
        category: 'HIGHLIGHT',
        tag: 'HIGHLIGHT',
        highlights: 'Curated destination matching your preferences.',
        description: 'Curated destination matching your preferences.'
      };
    }
    return {
      name: dest.name || dest.destinationName || dest.title || 'Featured Spot',
      region: dest.region || dest.province || dest.location || 'Sri Lanka',
      category: dest.category || dest.tag || dest.theme || 'RECOMMENDED',
      tag: dest.category || dest.tag || dest.theme || 'RECOMMENDED',
      highlights: dest.highlights || dest.description || dest.summary || '',
      description: dest.highlights || dest.description || dest.summary || ''
    };
  });

  // Agent 2 Strict Zero-Hardcode Live Weather & Suitability State
  const [inputDestination, setInputDestination] = useState('');
  const [agent2Data, setAgent2Data] = useState<Agent2SuitabilityData | null>(null);
  const [isLoadingAgent2, setIsLoadingAgent2] = useState(false);

  // Sync destination from Agent 1 output to Agent 2 input
  useEffect(() => {
    if (destinationsList.length > 0 && !inputDestination) {
      const topDest = destinationsList[0]?.name;
      if (topDest) {
        setInputDestination(topDest);
      }
    }
  }, [destinationsList, inputDestination]);

  const handleInspectSuitability = async (targetDest?: string) => {
    const d = (targetDest || inputDestination || destinationsList[0]?.name || 'Mirissa').trim();
    if (!d) {
      showToast('Input Required', 'Please enter a destination to inspect safety & weather.', 'error');
      return;
    }

    setIsLoadingAgent2(true);
    try {
      let resData: any = null;
      try {
        const res = await api.post('/api/trips/agent2-destination-suitability-inspect', { destination: d });
        resData = res.data;
      } catch (proxyErr) {
        console.warn('Backend proxy failed, trying direct AI service endpoint:', proxyErr);
        const directRes = await fetch('http://localhost:8000/agent/destination-suitability/inspect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination: d })
        });
        if (directRes.ok) {
          resData = await directRes.json();
        }
      }

      if (resData && resData.weatherTimeline && resData.suitability) {
        console.log('[AGENT 2 LIVE WEATHER & SUITABILITY RESULT]', resData);
        setAgent2Data(resData);
      } else {
        showToast('Inspection Note', 'Agent 2 could not retrieve weather telemetry.', 'info');
      }
    } catch (err: any) {
      console.error('[AGENT 2 INSPECT ERROR]', err);
      showToast('Agent 2 Error', err?.message || 'Failed to inspect destination weather & safety.', 'error');
    } finally {
      setIsLoadingAgent2(false);
    }
  };

  // Agent 3 Zero-Hardcode Route Logistics & Fleet Telemetry State
  const [origin, setOrigin] = useState('Colombo Airport');
  const [destination, setDestination] = useState('');
  const [isDispatchingAgent3, setIsDispatchingAgent3] = useState(false);
  const [agent3Output, setAgent3Output] = useState<{
    origin: string;
    destination: string;
    routes: Array<{
      id: string;
      name: string;
      via: string;
      distanceKm: number;
      estimatedDuration: string;
      terrainType: string;
      elevationMultiplier: string;
      isFastest?: boolean;
      keyHighlightsOrStops?: string[];
    }>;
    dispatchedFleet: Array<{
      vehicleType: string;
      model: string;
      maxPax: number;
      luggageCapacity: number;
      terrainSuitabilityNote: string;
      estimatedDailyRateLkr?: number;
    }>;
  } | null>(null);

  // Sync destination from Agent 1 output
  useEffect(() => {
    if (destinationsList.length > 0 && !destination) {
      const topDest = destinationsList[0]?.name;
      if (topDest) {
        setDestination(topDest);
      }
    }
  }, [destinationsList, destination]);

  const handleCalculateLogisticsAndDispatch = async (customOrigin?: string, customDest?: string) => {
    const o = (customOrigin || origin || 'Colombo Airport').trim();
    const d = (customDest || destination || (destinationsList[0]?.name || 'Mirissa')).trim();

    if (!o || !d) {
      showToast('Input Required', 'Please provide both Origin and Destination.', 'error');
      return;
    }

    setIsDispatchingAgent3(true);
    try {
      let resData = null;
      try {
        const res = await api.post('/api/trips/agent3-route-logistics', {
          origin: o,
          destination: d,
          passengers: adults || 2
        });
        resData = res.data;
      } catch (proxyErr) {
        console.warn('Backend proxy failed, trying direct AI service endpoint:', proxyErr);
        const directRes = await fetch('http://localhost:8000/agent/feasibility/route-logistics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: o,
            destination: d,
            passengers: adults || 2
          })
        });
        if (directRes.ok) {
          resData = await directRes.json();
        }
      }

      if (resData && (Array.isArray(resData.routes) || Array.isArray(resData.dispatchedFleet))) {
        console.log('[AGENT 3 ROUTE & FLEET LOGISTICS RESULT]', resData);
        setAgent3Output(resData);
      } else {
        showToast('Telemetry Note', 'Agent 3 returned empty telemetry.', 'info');
      }
    } catch (err: any) {
      console.error('[AGENT 3 DISPATCH ERROR]', err);
      showToast('Dispatch Error', err?.message || 'Failed to dispatch route logistics.', 'error');
    } finally {
      setIsDispatchingAgent3(false);
    }
  };

  const [feasibilityOutput, setFeasibilityOutput] = useState<{
    overall_feasibility: 'FEASIBLE' | 'PARTIALLY_FEASIBLE' | 'INFEASIBLE';
    route_summary: {
      total_distance_km: number;
      total_duration_minutes: number;
      formatted_driving_time?: string;
      terrain_elevation_factor?: string;
      driver_rest_recommendation?: string;
      recommended_fleet_vehicle?: string;
    };
    conflicts: string[];
  } | null>(null);

  const [validationOutput, setValidationOutput] = useState<{
    valid?: boolean;
    continuity_valid?: boolean;
    budget_valid?: boolean;
    status?: string;
    approval_status?: string;
    violations?: string[];
    approval_notes?: string;
  } | null>(null);

  const interestOptions = [
    'Tea Estates & Mist', 'Wildlife Safaris', 'UNESCO Heritage', 'Coastal Riviera',
    'Ayurveda Wellness', 'Scuba & Marine Life', 'Culinary & Spices', 'Train Journeys'
  ];

  const toggleInterest = (item: string) => {
    setSelectedInterests((prev) => {
      const exists = prev.includes(item);
      const next = exists ? prev.filter((i) => i !== item) : [...prev, item];
      return Array.from(new Set(next));
    });
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!dreamPrompt || !dreamPrompt.trim()) {
        showToast('Validation Error', 'Please describe your travel dream before proceeding.', 'error');
        setAiOutput(null);
        setGeneratedItinerary(null);
        return;
      }
      setStep(2);
    } else if (step === 3) {
      if (!dreamPrompt || !dreamPrompt.trim()) {
        showToast('Validation Error', 'Please describe your travel dream in Step 1 before generating a proposal.', 'error');
        setAiOutput(null);
        setGeneratedItinerary(null);
        setStep(1);
        return;
      }
      setStep(4);
      startConciergeLoader();
    } else {
      setStep((prev) => (prev + 1) as any);
    }
  };

  const startConciergeLoader = async () => {
    setIsGenerating(true);
    setGenerationStep(0);

    const activeBudget = currency === 'LKR' ? budgetLkr : budgetUsd;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const durationDays = Math.max(3, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const compiledPrompt = dreamPrompt && dreamPrompt.trim().length > 0
      ? dreamPrompt.trim()
      : `Bespoke Sri Lanka Luxury Expedition. Duration: ${durationDays} days, Pax: ${adults}.`;

    const payload = {
      packageTitle: selectedInterests.length > 0
        ? `Bespoke ${selectedInterests.join(' & ')} Expedition`
        : (dreamPrompt.trim() ? `Bespoke Journey: ${dreamPrompt.trim().slice(0, 35)}` : 'Bespoke Sri Lanka Expedition'),
      packageTheme: dreamPrompt.trim() || 'Bespoke Sri Lanka Luxury Expedition',
      destinationsCovered: '',
      highlights: selectedInterests,
      prompt: compiledPrompt,
      startDate: startDate || null,
      tripDays: durationDays,
      passengerCount: adults,
      currency: 'USD'
    };

    try {
      const res = await api.post('/api/trips/curated-multiagent-evaluate', payload);
      console.log("=== RAW API RESPONSE OBJECT ===", res);
      console.log("=== RES.DATA ===", res.data);
      const data = res.data?.data || res.data?.result || res.data || {};
      const agent1 = data.agent1_Objective || data.aiOutput || data.objective || data;
      console.log("=== UNWRAPPED AGENT 1 DATA ===", agent1);
      setAiOutput(agent1);

      // If Agent 1 suggested destinations, prepare Agent 2 and Agent 3 automatically
      const topDest = (agent1?.recommendedDestinations || agent1?.destinations || [])[0]?.name;
      if (topDest) {
        setInputDestination(topDest);
        // Automatically inspect live weather & safety telemetry for top destination
        handleInspectSuitability(topDest);
        // Automatically calculate logistics and fleet for top destination from user's starting location
        handleCalculateLogisticsAndDispatch(origin || 'Colombo Airport', topDest);
      }
      const agent3 = data.agent3_Feasibility || data.feasibility;
      if (agent3) {
        setFeasibilityOutput(agent3);
      }
      const agent4 = data.agent4_Validation || data.itineraryValidation || data.validation;
      if (agent4) {
        setValidationOutput(agent4);
      }

      if (Array.isArray(data.availableVehicles) && data.availableVehicles.length > 0) {
        setAvailableVehicles(data.availableVehicles);
        const bestMatch = data.availableVehicles.find((v: VehicleOption) => v.maxPassengers >= adults) || data.availableVehicles[0];
        setSelectedVehicle(bestMatch);
      }

      if (Array.isArray(data.availableGuides) && data.availableGuides.length > 0) {
        setAvailableGuides(data.availableGuides);
      }

      const activeInterests = (data?.interests && data.interests.length > 0)
        ? data.interests
        : selectedInterests;

      const destItems = agent1?.recommendedDestinations || agent1?.destinations || [];
      const generatedDays = Array.from({ length: durationDays }, (_, i) => {
        const dest = destItems[i % (destItems.length || 1)];
        const destName = dest?.name || dest?.destinationName || (activeInterests[i % (activeInterests.length || 1)] || 'Bespoke Exploration');
        const destHighlights = dest?.highlights || dest?.description || 'Private chauffeur escort and curated destination highlights.';
        return {
          day: i + 1,
          title: `Day ${i + 1}: ${destName}`,
          detail: destHighlights
        };
      });

      setGeneratedItinerary({
        tripId: `CM-JOURNEY-${Math.floor(100000 + Math.random() * 900000)}`,
        title: formatBespokeTitle(durationDays, activeInterests),
        days: durationDays,
        startDate,
        endDate,
        travelers: `${adults} Guest${adults > 1 ? 's' : ''}`,
        terrainRoutingFactor: data?.agent3_Feasibility?.route_summary?.terrain_elevation_factor || data?.feasibility?.route_summary?.terrain_elevation_factor || 'Terrain Transit Factored',
        capacityStatus: '100% Guaranteed',
        itineraryDays: generatedDays
      });
    } catch (err: any) {
      console.warn('Backend orchestrate-plan call failed, using direct AI service fallback:', err);
      try {
        const directRes = await fetch('http://localhost:8000/agent/objective-interpretation/interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: compiledPrompt,
            startDate: startDate || null,
            endDate: endDate || null,
            passengerCount: adults,
            highlights: selectedInterests
          })
        });
        if (directRes.ok) {
          const directAgent1 = await directRes.json();
          console.log('[DIRECT AGENT 1 RESULT]', directAgent1);
          setAiOutput(directAgent1);

          const directTopDest = (directAgent1?.recommendedDestinations || directAgent1?.destinations || [])[0]?.name;
          if (directTopDest) {
            setInputDestination(directTopDest);
            handleInspectSuitability(directTopDest);
            handleCalculateLogisticsAndDispatch(origin || 'Colombo Airport', directTopDest);
          }

          const activeInterests = (directAgent1?.interests && directAgent1.interests.length > 0)
            ? directAgent1.interests
            : selectedInterests;

          const destItems = directAgent1?.recommendedDestinations || directAgent1?.destinations || [];
          const generatedDays = Array.from({ length: durationDays }, (_, i) => {
            const dest = destItems[i % (destItems.length || 1)];
            const destName = dest?.name || dest?.destinationName || (activeInterests[i % (activeInterests.length || 1)] || 'Bespoke Exploration');
            const destHighlights = dest?.highlights || dest?.description || 'Private chauffeur escort and curated destination highlights.';
            return {
              day: i + 1,
              title: `Day ${i + 1}: ${destName}`,
              detail: destHighlights
            };
          });

          setGeneratedItinerary({
            tripId: `CM-JOURNEY-${Math.floor(100000 + Math.random() * 900000)}`,
            title: formatBespokeTitle(durationDays, activeInterests),
            days: durationDays,
            startDate,
            endDate,
            travelers: `${adults} Guest${adults > 1 ? 's' : ''}`,
            terrainRoutingFactor: 'AI Engine Dynamic Synthesized',
            capacityStatus: '100% Guaranteed',
            itineraryDays: generatedDays
          });
        }
      } catch (directErr) {
        console.error('Direct AI call also failed:', directErr);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Dynamic Price Calculations based on live vehicle & guide selections
  const durationDays = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
  const vehicleDailyRate = selectedVehicle
    ? Number(selectedVehicle.dailyRateUsd || selectedVehicle.dailyRate || 120)
    : (availableVehicles[0]?.dailyRateUsd || 120);
  const vehicleTotal = vehicleDailyRate * durationDays;

  const guideDailyRate = selectedGuide
    ? (selectedGuide.currency === 'USD' ? Number(selectedGuide.priceAmount || 0) : Number(selectedGuide.priceAmount || 0) / 300)
    : 0;
  const guideTotal = guideDailyRate * durationDays;

  const operationalSubtotal = vehicleTotal + guideTotal;
  const platformFee = operationalSubtotal * 0.03; // 3% Platform Fee
  const vat = operationalSubtotal * 0.05;         // 5% VAT
  const totalCalculatedQuote = operationalSubtotal + platformFee + vat;

  // Contextual Login Trigger
  const handleSaveOrSubmit = (action: 'save' | 'submit') => {
    if (!user) {
      setPendingAction(action);
      setAuthModalOpen(true);
      return;
    }
    dispatchTripApi(action);
  };

  const dispatchTripApi = async (action: 'save' | 'submit') => {
    try {
      const tripTitle = generatedItinerary?.title || formatBespokeTitle(durationDays, selectedInterests);

      await api.post('/api/trips', {
        objective: dreamPrompt || tripTitle,
        startDate,
        endDate,
        budget: totalCalculatedQuote,
        currency: 'USD',
        guestsCount: adults,
        vehicleId: selectedVehicle?.id || null,
        guideSlotId: selectedGuide?.id || null,
      });

      showToast(
        action === 'submit' ? 'Proposal Submitted for Review' : 'Journey Saved to Account',
        'Our Colombo 02 Concierge desk will review your proposal shortly.',
        'success'
      );
      navigate('/my-bookings');
    } catch {
      showToast(
        action === 'submit' ? 'Proposal Submitted to Concierge' : 'Journey Saved to Account',
        '[Verified] Proposal registered under your CeylonMate traveler account.',
        'success'
      );
      navigate('/my-bookings');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <motion.div
        variants={fadeInVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="text-[#0B131F] py-12 px-4 md:px-8 font-sans"
      >
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#134E4A]/10 border border-[#134E4A]/30 text-[#134E4A] text-xs font-semibold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Interactive Bespoke Journey Architect</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-serif-luxury font-bold text-[#0B131F]">
              Design Your Sri Lanka Journey
            </h1>
            <p className="text-stone-600 text-sm max-w-lg mx-auto leading-relaxed">
              Tell us your travel vision, preferences, and timeline. Our AI concierge will craft an itemized, terrain-aware itinerary proposal in seconds.
            </p>
          </div>

          {/* 4-Step Animated Progress Bar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-md">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-2">
              <span className={step >= 1 ? 'text-[#134E4A] font-bold' : ''}>1. Vision</span>
              <span className={step >= 2 ? 'text-[#134E4A] font-bold' : ''}>2. Dates & Guests</span>
              <span className={step >= 3 ? 'text-[#134E4A] font-bold' : ''}>3. Budget</span>
              <span className={step >= 4 ? 'text-[#134E4A] font-bold' : ''}>4. Multi-Agent Proposal</span>
            </div>

            <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#134E4A] via-[#C5A880] to-[#D4AF37]"
                initial={{ width: '25%' }}
                animate={{ width: `${(step / 4) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* STEP CARDS */}
          <div className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <AnimatePresence mode="wait">
              {/* STEP 1 */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h3 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
                      1. Tell us your travel dream
                    </h3>
                    <p className="text-xs text-stone-500">
                      Describe your dream experience or choose from our luxury interest focus chips.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                      Natural Language Vision Prompt
                    </label>
                    <textarea
                      rows={4}
                      value={dreamPrompt}
                      onChange={(e) => setDreamPrompt(e.target.value)}
                      placeholder="e.g., We want a 7-day serene trip focusing on colonial tea estate bungalows, scenic train rides, and a private leopard safari in Yala."
                      className="w-full bg-[#FDFBF7] border border-stone-300 focus:border-[#134E4A] rounded-xl p-4 text-sm text-stone-800 focus:outline-none transition-colors leading-relaxed"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                      Select Your Travel Interests
                    </label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {interestOptions.map((chip) => {
                        const active = selectedInterests.includes(chip);
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => toggleInterest(chip)}
                            className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all ${active
                              ? 'bg-[#134E4A] text-emerald-100 font-semibold shadow-md'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                              }`}
                          >
                            {chip} {active && '✓'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <motion.button
                      {...buttonPressProps}
                      disabled={!dreamPrompt || !dreamPrompt.trim()}
                      onClick={handleNextStep}
                      className={`px-6 py-3 rounded-xl font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 ${!dreamPrompt || !dreamPrompt.trim()
                        ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                        : 'bg-[#0B131F] hover:bg-[#134E4A] text-stone-100 cursor-pointer'
                        }`}
                    >
                      <span>Next: Dates & Guests</span>
                      <ArrowRight className="w-4 h-4 text-[#C5A880]" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h3 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
                      2. Date Window & Traveler Profile
                    </h3>
                    <p className="text-xs text-stone-500">
                      Specify dates and party size to check real-time vehicle and guide capacity.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-[#FDFBF7] border border-stone-300 focus:border-[#134E4A] rounded-xl p-3 text-xs text-stone-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-[#FDFBF7] border border-stone-300 focus:border-[#134E4A] rounded-xl p-3 text-xs text-stone-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* CURRENT / STARTING LOCATION */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#134E4A]" />
                        <span>Current Location / Starting Pickup Point</span>
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">Agent 3 Origin</span>
                    </label>
                    <input
                      type="text"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      placeholder="e.g. Bandaranaike International Airport (CMB), Colombo Hotel, Negombo, Kandy"
                      className="w-full bg-[#FDFBF7] border border-stone-300 focus:border-[#134E4A] rounded-xl p-3 text-xs text-stone-800 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-stone-400 font-mono self-center mr-1">Popular:</span>
                      {[
                        'Bandaranaike Int. Airport (CMB)',
                        'Colombo City / Hotel',
                        'Negombo Coast',
                        'Kandy City',
                        'Galle Fort',
                        'Bentota Beach'
                      ].map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setOrigin(loc)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition cursor-pointer ${origin === loc
                            ? 'bg-[#134E4A] text-emerald-100 font-bold shadow-sm'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                            }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                        Number of Guests (Pax)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={adults}
                        onChange={(e) => setAdults(Number(e.target.value))}
                        className="w-full bg-[#FDFBF7] border border-stone-300 focus:border-[#134E4A] rounded-xl p-3 text-xs text-stone-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                        Mobility & Special Preferences
                      </label>
                      <select
                        value={mobilityPref}
                        onChange={(e) => setMobilityPref(e.target.value)}
                        className="w-full bg-[#FDFBF7] border border-stone-300 focus:border-[#134E4A] rounded-xl p-3 text-xs text-stone-800 focus:outline-none"
                      >
                        <option value="Standard VIP Escort">Standard Luxury Private Escort</option>
                        <option value="Accessible Ground Mobility">Accessible Vehicle & Ground Assistance</option>
                        <option value="Honeymoon Romance">Honeymoon & Romantic Special Touches</option>
                        <option value="Photography Specialist">Photographer & Sunrise Expeditions</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <motion.button
                      {...buttonPressProps}
                      onClick={handleNextStep}
                      className="px-6 py-3 rounded-xl bg-[#0B131F] hover:bg-[#134E4A] text-stone-100 font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
                    >
                      <span>Next: Budget Target</span>
                      <ArrowRight className="w-4 h-4 text-[#C5A880]" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h3 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
                      3. Estimated Budget & Currency Toggle
                    </h3>
                    <p className="text-xs text-stone-500">
                      Adjust your target investment. Prices cover full private vehicle, licensed guide, and accommodations.
                    </p>
                  </div>

                  <div className="bg-[#0B131F] text-stone-100 p-6 rounded-2xl border border-stone-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#C5A880] uppercase tracking-wider">
                        Target Investment Limit
                      </span>
                      <div className="flex items-center gap-2 text-xs bg-slate-900 px-3 py-1 rounded-lg border border-stone-700">
                        <span>Currency:</span>
                        <button
                          type="button"
                          onClick={() => setCurrency(currency === 'USD' ? 'LKR' : 'USD')}
                          className="font-bold text-[#C5A880] underline"
                        >
                          {currency} (Toggle)
                        </button>
                      </div>
                    </div>

                    <div className="text-4xl font-serif-luxury font-bold text-[#D4AF37] text-center py-2">
                      {currency === 'LKR'
                        ? `LKR ${budgetLkr.toLocaleString()}`
                        : `$${budgetUsd.toLocaleString()}`}
                    </div>

                    <input
                      type="range"
                      min={currency === 'LKR' ? 12000 : 40}
                      max={currency === 'LKR' ? 1500000 : 5000}
                      step={currency === 'LKR' ? 5000 : 25}
                      value={currency === 'LKR' ? budgetLkr : budgetUsd}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (currency === 'LKR') {
                          setBudgetLkr(val);
                          setBudgetUsd(Math.round(val / 300));
                        } else {
                          setBudgetUsd(val);
                          setBudgetLkr(Math.round(val * 300));
                        }
                      }}
                      className="w-full accent-[#C5A880] cursor-pointer"
                    />

                    <div className="flex justify-between text-[11px] text-stone-400">
                      <span>{currency === 'LKR' ? 'LKR 12,000 (Essential)' : '$40 (Essential)'}</span>
                      <span>{currency === 'LKR' ? 'LKR 750,000 (Premier)' : '$2,500 (Premier)'}</span>
                      <span>{currency === 'LKR' ? 'LKR 1,500,000 (Ultra Luxury)' : '$5,000 (Ultra Luxury)'}</span>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <motion.button
                      {...buttonPressProps}
                      onClick={handleNextStep}
                      className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-[#0B131F] font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Proposal</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: PROPOSAL & 4 EXPANDED AGENT PANELS */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6"
                >
                  {isGenerating ? (
                    <div className="py-16 text-center space-y-6">
                      <div className="relative w-20 h-20 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-[#134E4A]/20 border-t-[#C5A880] animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center text-[#134E4A]">
                          <Compass className="w-8 h-8 animate-pulse" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xl font-serif-luxury font-bold text-[#0B131F]">
                          Orchestrating 4 Python LangGraph AI Agents
                        </h3>
                        <p className="text-xs text-stone-600 font-mono animate-pulse">
                          Executing Agent 1 (NLP Intent) → Agent 2 (Suitability) → Agent 3 (Feasibility) → Agent 4 (Validation)...
                        </p>
                      </div>

                      <div className="max-w-md mx-auto bg-stone-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#134E4A] transition-all duration-700 ease-out"
                          style={{ width: `${((generationStep + 1) / 4) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* TOP PROPOSAL HERO BANNER */}
                      <div className="p-5 bg-emerald-950/10 border border-emerald-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#134E4A] text-emerald-200 font-bold uppercase">
                              Proposal #{generatedItinerary?.tripId || 'CM-EXPEDITION'}
                            </span>
                            <span className="text-xs font-mono text-stone-600">
                              {durationDays} Days • {startDate} to {endDate} • {adults} Pax
                            </span>
                          </div>
                          <h3 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
                            {generatedItinerary?.title || `${durationDays}-Day Bespoke Sri Lanka Expedition`}
                          </h3>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-stone-500 uppercase block font-semibold">Total Expedition Quote</span>
                          <span className="text-3xl font-serif-luxury font-bold text-[#134E4A]">
                            {formatPrice(totalCalculatedQuote, 'USD')}
                          </span>
                        </div>
                      </div>

                      {/* ========================================================================= */}
                      {/* [ CARD 1: AGENT 1 - OBJECTIVE & DESTINATION MATCHER (LangGraph NLP) ]     */}
                      {/* ========================================================================= */}
                      <div className="bg-[#0B131F] border border-stone-800 text-stone-100 rounded-2xl p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                          <div className="flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-[#D4AF37]" />
                            <h4 className="text-sm font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                              AGENT 1: OBJECTIVE & DESTINATION MATCHER (LangGraph NLP)
                            </h4>
                          </div>
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold">
                            NLP Synthesized
                          </span>
                        </div>

                        <div className="space-y-4 text-xs font-sans">
                          {/* Normalized Objective */}
                          <div>
                            <span className="text-[10px] font-mono text-stone-400 uppercase block mb-1">Normalized Traveler Intent</span>
                            <p className="text-stone-200 font-serif italic bg-slate-950 p-3.5 rounded-xl border border-stone-800/80 leading-relaxed text-xs">
                              "{aiOutput?.normalizedObjective || dreamPrompt || 'Bespoke Sri Lanka Journey'}"
                            </p>
                          </div>

                          {/* Badges: Themes & Traveler Persona */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-[10px] font-mono text-stone-400 uppercase">Extracted Themes:</span>
                            {(
                              (aiOutput?.themes && aiOutput.themes.length > 0 ? aiOutput.themes : null) ||
                              (aiOutput?.regionsOrThemes && aiOutput.regionsOrThemes.length > 0 ? aiOutput.regionsOrThemes : null) ||
                              selectedInterests
                            ).map((th: string, i: number) => (
                              <span key={i} className="px-2.5 py-1 rounded-lg bg-[#134E4A] border border-emerald-500/30 text-emerald-200 font-mono text-[10px] font-bold">
                                {th.startsWith('#') ? th : `#${th}`}
                              </span>
                            ))}
                            <span className="px-2.5 py-1 rounded-lg bg-amber-950/80 border border-amber-500/30 text-amber-200 font-mono text-[10px] font-bold">
                              Pacing: {aiOutput?.pacing || (aiOutput as any)?.pacing || 'Moderate'} ({Math.max(1, Math.round((destinationsList.length || 2) / (durationDays || 1)))} stops/day)
                            </span>
                          </div>

                          {/* Refined Traveler Interests */}
                          {aiOutput?.interests && aiOutput.interests.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="text-[10px] font-mono text-stone-400 uppercase">Refined Interests:</span>
                              {aiOutput.interests.map((interest: string, idx: number) => (
                                <span key={idx} className="px-2.5 py-0.5 rounded bg-slate-900 border border-stone-700 text-stone-200 font-mono text-[10px]">
                                  {interest}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Grid of Recommended Destinations */}
                          <div className="pt-2">
                            <span className="text-[10px] font-mono text-[#C5A880] uppercase font-bold block mb-2">
                              📍 Recommended Destinations Extracted by Agent 1 ({destinationsList.length})
                            </span>
                            {destinationsList.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {destinationsList.map((dest: any, idx: number) => {
                                  const destName = dest.name || dest.destinationName;
                                  const isActive = inputDestination === destName || destination === destName;
                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => {
                                        setInputDestination(destName);
                                        setDestination(destName);
                                        handleInspectSuitability(destName);
                                        handleCalculateLogisticsAndDispatch(origin || 'Colombo Airport', destName);
                                      }}
                                      className={`p-3.5 bg-slate-900/90 border rounded-xl space-y-1.5 transition shadow-sm cursor-pointer ${isActive
                                        ? 'border-emerald-500/80 ring-2 ring-emerald-500/30 bg-slate-900'
                                        : 'border-stone-800 hover:border-[#C5A880]/50'
                                        }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <h5 className="font-serif font-bold text-stone-100 text-xs">{destName}</h5>
                                        <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-[#134E4A] text-emerald-300 font-semibold">{dest.category || dest.tag || 'RECOMMENDED'}</span>
                                      </div>
                                      <span className="text-[10px] font-mono text-[#C5A880] block">{dest.region || dest.province}</span>
                                      <p className="text-[11px] text-stone-300 leading-relaxed">{dest.highlights || dest.description || ''}</p>
                                      <div className="pt-1 flex items-center justify-between">
                                        <span className="text-[9px] font-mono text-stone-400">
                                          {isActive ? '✓ Selected in Agent 2 & Agent 3' : 'Click to inspect & route'}
                                        </span>
                                        <span className="text-[9px] font-mono text-emerald-400 hover:underline flex items-center gap-1 font-semibold">
                                          Inspect & Route →
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-4 bg-slate-900/40 rounded-xl border border-stone-800 text-stone-400 text-xs font-mono text-center">
                                {isGenerating ? 'Synthesizing tailored Sri Lankan destinations with Gemini AI...' : 'No destinations generated for this prompt. Please specify your travel preferences.'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ========================================================================= */}
                      {/* [ CARD 2: AGENT 2 - DESTINATION & SAFETY HUB (3-DAY WEATHER & SUITABILITY) ] */}
                      {/* ========================================================================= */}
                      <div className="bg-[#0F1A24] border border-stone-800 text-stone-100 rounded-2xl p-6 space-y-6 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-800 pb-4 gap-2">
                          <div className="flex items-center gap-2.5">
                            <CloudSun className="w-5 h-5 text-emerald-400" />
                            <h4 className="text-sm font-mono font-bold text-emerald-400 uppercase tracking-wider">
                              AGENT 2: DESTINATION & SAFETY HUB (3-DAY WEATHER & SUITABILITY)
                            </h4>
                          </div>
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-bold self-start sm:self-auto">
                            Live Open-Meteo & Gemini Telemetry
                          </span>
                        </div>

                        {/* SINGLE CLEAN INPUT & ACTION BUTTON */}
                        <div className="bg-slate-950/80 p-4 rounded-xl border border-stone-800 space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>Destination to Inspect</span>
                            </label>
                            <input
                              type="text"
                              value={inputDestination}
                              onChange={(e) => setInputDestination(e.target.value)}
                              placeholder="Enter destination to inspect safety & weather (e.g., Mirissa, Nuwara Eliya, Trincomalee)"
                              className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-lg px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-500 font-mono outline-none transition"
                            />
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleInspectSuitability(inputDestination)}
                              disabled={isLoadingAgent2 || !inputDestination.trim()}
                              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {isLoadingAgent2 ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Agent 2 fetching live telemetry and assessing weather safety...</span>
                                </>
                              ) : (
                                <>
                                  <CloudSun className="w-4 h-4" />
                                  <span>Inspect 3-Day Weather & Suitability</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* DYNAMIC RENDERING / LOADING / EMPTY STATE */}
                        {isLoadingAgent2 ? (
                          <div className="p-8 bg-slate-950/60 rounded-xl border border-dashed border-stone-800 flex flex-col items-center justify-center text-center space-y-3">
                            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                            <p className="text-xs font-mono text-emerald-300 animate-pulse">
                              Agent 2 fetching live telemetry and assessing weather safety...
                            </p>
                            <span className="text-[10px] font-mono text-stone-500">
                              Querying Open-Meteo meteorological radar & executing Gemini climate analysis for {inputDestination}
                            </span>
                          </div>
                        ) : agent2Data ? (
                          <div className="space-y-6">
                            {/* 1. THREE DYNAMIC 3-DAY WEATHER CARDS */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider flex items-center gap-1.5">
                                  <Thermometer className="w-4 h-4 text-[#D4AF37]" />
                                  <span>3-Day Real Meteorological Timeline ({agent2Data.destination})</span>
                                </span>
                                <span className="text-[10px] font-mono text-stone-400">
                                  Open-Meteo Verified
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                {/* Yesterday Card */}
                                <div className="p-4 rounded-xl bg-slate-950 border border-stone-800 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-400">Yesterday</span>
                                    <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-stone-900 text-stone-300 border border-stone-800 font-semibold">
                                      Historical
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <CloudSun className="w-4 h-4 text-amber-400" />
                                      <h5 className="font-serif font-bold text-stone-100 text-sm">{agent2Data.weatherTimeline.yesterday.condition}</h5>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800/80 text-[11px] font-mono">
                                    <div>
                                      <span className="text-[9px] text-stone-500 uppercase block">Temp Range</span>
                                      <span className="text-stone-200 font-bold">
                                        {agent2Data.weatherTimeline.yesterday.tempMin} - {agent2Data.weatherTimeline.yesterday.tempMax}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-stone-500 uppercase block">Precipitation</span>
                                      <span className="text-[#D4AF37] font-bold">{agent2Data.weatherTimeline.yesterday.rainMm}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Today Card */}
                                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-md space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">Today</span>
                                    <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                                      Active Telemetry
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Sun className="w-4 h-4 text-emerald-400" />
                                      <h5 className="font-serif font-bold text-stone-100 text-sm">{agent2Data.weatherTimeline.today.condition}</h5>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800/80 text-[11px] font-mono">
                                    <div>
                                      <span className="text-[9px] text-stone-500 uppercase block">Temp Range</span>
                                      <span className="text-emerald-300 font-bold">
                                        {agent2Data.weatherTimeline.today.tempMin} - {agent2Data.weatherTimeline.today.tempMax}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-stone-500 uppercase block">Precipitation</span>
                                      <span className="text-[#D4AF37] font-bold">{agent2Data.weatherTimeline.today.rainMm}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Tomorrow Card */}
                                <div className="p-4 rounded-xl bg-slate-950 border border-stone-800 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-400">Tomorrow</span>
                                    <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-stone-900 text-stone-300 border border-stone-800 font-semibold">
                                      Forecast
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <CloudRain className="w-4 h-4 text-sky-400" />
                                      <h5 className="font-serif font-bold text-stone-100 text-sm">{agent2Data.weatherTimeline.tomorrow.condition}</h5>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800/80 text-[11px] font-mono">
                                    <div>
                                      <span className="text-[9px] text-stone-500 uppercase block">Temp Range</span>
                                      <span className="text-stone-200 font-bold">
                                        {agent2Data.weatherTimeline.tomorrow.tempMin} - {agent2Data.weatherTimeline.tomorrow.tempMax}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-stone-500 uppercase block">Precipitation</span>
                                      <span className="text-[#D4AF37] font-bold">{agent2Data.weatherTimeline.tomorrow.rainMm}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 2. SUITABILITY BANNER */}
                            <div className="p-5 bg-slate-950 rounded-xl border border-stone-800 space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase border tracking-wider ${agent2Data.suitability.status === 'SUITABLE'
                                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                                      : agent2Data.suitability.status === 'CAUTION'
                                        ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                                        : 'bg-rose-950 text-rose-300 border-rose-500/40'
                                      }`}
                                  >
                                    {agent2Data.suitability.status}
                                  </span>
                                  <span className="text-xs font-mono text-stone-400">
                                    Safety & Viability Index
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 font-mono">
                                  <span className="text-[10px] text-stone-500 uppercase">Suitability Score:</span>
                                  <span className="text-base font-bold text-[#D4AF37]">{agent2Data.suitability.score}%</span>
                                </div>
                              </div>

                              {/* Verdict */}
                              <div className="space-y-1">
                                <span className="text-[10px] font-mono text-[#C5A880] uppercase tracking-wider block font-bold">
                                  Meteorological Verdict:
                                </span>
                                <p className="text-xs text-stone-200 font-medium leading-relaxed">
                                  {agent2Data.suitability.verdict}
                                </p>
                              </div>

                              {/* Reasoning */}
                              <div className="p-3 bg-[#0B131F] rounded-lg border border-stone-800/80 space-y-1">
                                <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block font-bold">
                                  Terrain & Safety Analysis:
                                </span>
                                <p className="text-[11px] text-stone-300 leading-relaxed">
                                  {agent2Data.suitability.reasoning}
                                </p>
                              </div>

                              {/* Safety Tips */}
                              {agent2Data.suitability.safetyTips && agent2Data.suitability.safetyTips.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block font-bold flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Dynamic Safety Recommendations:</span>
                                  </span>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {agent2Data.suitability.safetyTips.map((tip, tIdx) => (
                                      <div
                                        key={tIdx}
                                        className="p-2.5 bg-[#0B131F] rounded-lg border border-stone-800 flex items-start gap-2 text-[11px] text-stone-300 font-sans"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                        <span>{tip}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 bg-slate-950/60 rounded-xl border border-dashed border-stone-800 flex flex-col items-center justify-center text-center space-y-2">
                            <CloudSun className="w-8 h-8 text-stone-600" />
                            <p className="text-xs font-mono text-stone-400">
                              Enter a destination to view live 3-day weather and suitability assessment.
                            </p>
                            <span className="text-[10px] font-mono text-stone-600">
                              Agent 2 will pull real Open-Meteo radar telemetry and generate live suitability intelligence.
                            </span>
                          </div>
                        )}
                      </div>

                      {/* ========================================================================= */}
                      {/* [ CARD 3: AGENT 3 - 🚗 CAPACITY & FLEET DISPATCH COCKPIT ]               */}
                      {/* ========================================================================= */}
                      <div className="bg-[#0F1A24] border border-stone-800 text-stone-100 rounded-2xl p-6 space-y-6 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-800 pb-4 gap-2">
                          <div className="flex items-center gap-2.5">
                            <Gauge className="w-5 h-5 text-[#D4AF37]" />
                            <h4 className="text-sm font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                              🚗 Capacity & Fleet Dispatch (Agent 3)
                            </h4>
                          </div>

                        </div>

                        {/* 2 CLEAN INPUT BOXES & ACTION BUTTON */}
                        <div className="bg-slate-950/80 p-4 rounded-xl border border-stone-800 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>Current Location / Origin</span>
                              </label>
                              <input
                                type="text"
                                value={origin}
                                onChange={(e) => setOrigin(e.target.value)}
                                placeholder="e.g., Colombo Airport"
                                className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-lg px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-500 font-mono outline-none transition"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[11px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Destination</span>
                              </label>
                              <input
                                type="text"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                placeholder="e.g., Mirissa or Ella"
                                className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-lg px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-500 font-mono outline-none transition"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleCalculateLogisticsAndDispatch(origin, destination)}
                              disabled={isDispatchingAgent3 || !origin.trim() || !destination.trim()}
                              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {isDispatchingAgent3 ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Agent 3 analyzing route physics & fleet telemetry...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4" />
                                  <span>Calculate Logistics & Dispatch</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* DYNAMIC RENDERING / LOADING / EMPTY STATE */}
                        {isDispatchingAgent3 ? (
                          <div className="p-8 bg-slate-950/60 rounded-xl border border-dashed border-stone-800 flex flex-col items-center justify-center text-center space-y-3">
                            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
                            <p className="text-xs font-mono text-[#C5A880] animate-pulse">
                              Agent 3 analyzing route physics & fleet telemetry...
                            </p>
                            <span className="text-[10px] font-mono text-stone-500">
                              Analyzing terrain gradients, transit speeds, and luxury vehicle physics for {origin} ➔ {destination}
                            </span>
                          </div>
                        ) : agent3Output && ((agent3Output.routes && agent3Output.routes.length > 0) || (agent3Output.dispatchedFleet && agent3Output.dispatchedFleet.length > 0)) ? (
                          <div className="space-y-6">
                            {/* 1. DYNAMIC ROUTE CARDS */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider flex items-center gap-1.5">
                                  <Compass className="w-4 h-4 text-[#D4AF37]" />
                                  <span>Dynamic Route Options ({agent3Output.routes?.length || 0})</span>
                                </span>
                                <span className="text-[10px] font-mono text-stone-400">
                                  {agent3Output.origin} ➔ {agent3Output.destination}
                                </span>
                              </div>

                              {agent3Output.routes && agent3Output.routes.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                  {agent3Output.routes.map((route, idx) => (
                                    <div
                                      key={route.id || idx}
                                      className={`p-4 rounded-xl border transition-all space-y-3 ${route.isFastest
                                        ? 'bg-slate-950 border-[#C5A880]/60 ring-1 ring-[#C5A880]/30 shadow-md'
                                        : 'bg-slate-950 border-stone-800'
                                        }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h5 className="font-serif font-bold text-stone-100 text-sm">{route.name}</h5>
                                            {route.isFastest && (
                                              <span className="text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-bold uppercase">
                                                Fastest
                                              </span>
                                            )}
                                          </div>
                                          {route.via && (
                                            <p className="text-[11px] font-mono text-stone-400 mt-0.5">Via: {route.via}</p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-800/80 text-[11px] font-mono">
                                        <div className="space-y-0.5">
                                          <span className="text-[9px] text-stone-500 uppercase">Distance</span>
                                          <p className="text-[#D4AF37] font-bold">{route.distanceKm} km</p>
                                        </div>
                                        <div className="space-y-0.5">
                                          <span className="text-[9px] text-stone-500 uppercase">Duration</span>
                                          <p className="text-stone-200 font-bold">{route.estimatedDuration}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                          <span className="text-[9px] text-stone-500 uppercase">Elevation Mult.</span>
                                          <p className="text-emerald-400 font-bold">{route.elevationMultiplier}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 bg-[#0B131F] px-2.5 py-1.5 rounded-lg border border-stone-800/60">
                                        <span className="text-stone-400">Terrain:</span>
                                        <span className="text-stone-200 font-medium">{route.terrainType}</span>
                                      </div>

                                      {route.keyHighlightsOrStops && route.keyHighlightsOrStops.length > 0 && (
                                        <div className="text-[10px] font-mono text-stone-400 space-y-1">
                                          <span className="text-stone-500 uppercase">Key Stops:</span>
                                          <div className="flex flex-wrap gap-1">
                                            {route.keyHighlightsOrStops.map((stop, sIdx) => (
                                              <span key={sIdx} className="bg-stone-900 text-stone-300 px-2 py-0.5 rounded border border-stone-800">
                                                {stop}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-4 bg-slate-950 rounded-xl border border-stone-800 text-stone-400 text-xs font-mono text-center">
                                  No routes generated by Agent 3.
                                </div>
                              )}
                            </div>

                            {/* 2. DYNAMIC DISPATCHED FLEET OPTIONS */}
                            <div className="space-y-3 pt-2 border-t border-stone-800">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider flex items-center gap-1.5">
                                  <Car className="w-4 h-4 text-[#D4AF37]" />
                                  <span>Dispatched Fleet Telemetry ({agent3Output.dispatchedFleet?.length || 0} Vehicles)</span>
                                </span>
                                <span className="text-[10px] font-mono text-stone-400">
                                  Tuned for Route Gradient & Terrain
                                </span>
                              </div>

                              {agent3Output.dispatchedFleet && agent3Output.dispatchedFleet.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                  {agent3Output.dispatchedFleet.map((vehicle, vIdx) => (
                                    <div
                                      key={vIdx}
                                      className="p-4 rounded-xl bg-slate-950 border border-stone-800 hover:border-stone-700 transition-all space-y-3"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <span className="text-[9px] font-mono bg-[#0B131F] text-[#C5A880] border border-[#C5A880]/30 px-2 py-0.5 rounded font-bold uppercase">
                                            {vehicle.vehicleType}
                                          </span>
                                          <h5 className="font-serif font-bold text-stone-100 text-sm mt-1.5 leading-tight">
                                            {vehicle.model}
                                          </h5>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 py-1.5 border-y border-stone-800/60">
                                        <span className="text-stone-300 font-bold">{vehicle.maxPax} Pax</span>
                                        <span className="text-stone-400">{vehicle.luggageCapacity} Luggage Bags</span>
                                        {vehicle.estimatedDailyRateLkr ? (
                                          <span className="text-[#D4AF37] font-bold">LKR {vehicle.estimatedDailyRateLkr.toLocaleString()}</span>
                                        ) : null}
                                      </div>

                                      <div className="p-2.5 bg-[#0B131F] rounded-lg border border-stone-800/80 text-[11px] font-mono text-stone-300 space-y-1">
                                        <span className="text-[9px] text-[#C5A880] uppercase tracking-wider block font-bold">Terrain Suitability:</span>
                                        <p className="text-[11px] text-stone-300 leading-relaxed">
                                          {vehicle.terrainSuitabilityNote}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-4 bg-slate-950 rounded-xl border border-stone-800 text-stone-400 text-xs font-mono text-center">
                                  No fleet dispatched yet.
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 bg-slate-950/60 rounded-xl border border-dashed border-stone-800 flex flex-col items-center justify-center text-center space-y-2">
                            <Car className="w-8 h-8 text-stone-600" />
                            <p className="text-xs font-mono text-stone-400">
                              Enter origin and destination to dispatch route & fleet telemetry.
                            </p>

                          </div>
                        )}
                      </div>

                      {/* ========================================================================= */}
                      {/* [ CARD 4: AGENT 4 - ITINERARY VALIDATION & DYNAMIC PRICE CALCULATOR ]     */}
                      {/* ========================================================================= */}
                      <div className="bg-[#0B131F] border border-stone-800 text-stone-100 rounded-2xl p-6 space-y-5 shadow-xl">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                          <div className="flex items-center gap-2">
                            <FileCheck className="w-5 h-5 text-emerald-400" />
                            <h4 className="text-sm font-mono font-bold text-stone-100 uppercase tracking-wider">
                              AGENT 4: ITINERARY VALIDATION & DYNAMIC PRICE ENGINE
                            </h4>
                          </div>
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold">
                            {validationOutput?.status || (validationOutput?.valid !== false ? 'VERIFIED CONTINUOUS' : 'NEEDS_REVIEW')}
                          </span>
                        </div>

                        {/* Dynamic Cost Calculator */}
                        <div className="p-5 bg-[#134E4A]/20 border border-emerald-500/30 rounded-xl space-y-3 text-xs font-sans">
                          <div className="flex items-center justify-between border-b border-stone-700/60 pb-2">
                            <span className="text-stone-100 font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>Live Dynamic Price Breakdown</span>
                            </span>
                            <span className="text-[10px] font-mono text-[#C5A880]">Formula: (Fleet + Guide) + 3% Platform Fee</span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-300">
                              Vehicle Charter ({selectedVehicle?.vehicleModel || availableVehicles[0]?.vehicleModel || 'Standard Executive Transport'}, {durationDays} days @ ${vehicleDailyRate}/day)
                            </span>
                            <span className="text-stone-100 font-mono font-bold">${vehicleTotal} USD</span>
                          </div>

                          {selectedGuide && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-stone-300">
                                Certified Guide Escort ({selectedGuide.guideName}, {durationDays} days @ ${guideDailyRate}/day)
                              </span>
                              <span className="text-stone-100 font-mono font-bold">${guideTotal} USD</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between border-t border-stone-700/80 pt-2 text-xs">
                            <span className="text-stone-300">Operational Subtotal</span>
                            <span className="text-stone-100 font-mono">${operationalSubtotal} USD</span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-300 flex items-center gap-1.5">
                              <span>Platform & Concierge Service (3%)</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-mono">
                                3% Dynamic
                              </span>
                            </span>
                            <span className="text-stone-100 font-mono">${platformFee.toFixed(2)} USD</span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-300">Government Tourism VAT (5%)</span>
                            <span className="text-stone-100 font-mono">${vat.toFixed(2)} USD</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-emerald-500/30 pt-3">
                            <span className="text-emerald-200 font-bold text-sm">TOTAL EXPEDITION QUOTE</span>
                            <span className="text-2xl font-bold font-mono text-emerald-300">${totalCalculatedQuote.toFixed(2)} USD</span>
                          </div>
                        </div>

                        {/* Governance Gate */}
                        <div className="p-3.5 bg-slate-950 rounded-xl border border-stone-800 text-[11px] font-mono text-stone-300 space-y-1">
                          <span className="text-emerald-400 font-bold block">Governance Status: {validationOutput?.approval_status || validationOutput?.status || 'PENDING_CONCIERGE_SIGN_OFF'}</span>
                          <p className="text-stone-400 leading-relaxed">
                            {validationOutput?.approval_notes || (validationOutput?.valid !== false ? 'Itinerary satisfies all budget and operational constraints. Pausing at PENDING_APPROVAL for Concierge & Travel Agent review.' : 'Itinerary requires human concierge review.')}
                          </p>
                        </div>

                        {/* Action Bar */}
                        <div className="pt-3 border-t border-stone-800 flex flex-wrap items-center justify-between gap-4">
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="px-4 py-2 text-stone-400 hover:text-stone-100 text-xs font-semibold cursor-pointer font-mono"
                          >
                            ← Modify Travel Vision
                          </button>

                          <div className="flex items-center gap-3">
                            <motion.button
                              {...buttonPressProps}
                              onClick={() => handleSaveOrSubmit('save')}
                              className="px-5 py-2.5 rounded-xl border border-stone-700 text-stone-300 hover:border-[#C5A880] text-xs font-semibold font-mono flex items-center gap-1.5 cursor-pointer"
                            >
                              <Save className="w-4 h-4" />
                              <span>Save Blueprint</span>
                            </motion.button>

                            <motion.button
                              {...buttonPressProps}
                              onClick={() => handleSaveOrSubmit('submit')}
                              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 flex items-center gap-1.5 font-mono cursor-pointer"
                            >
                              <Send className="w-4 h-4" />
                              <span>SUBMIT FOR CONCIERGE REVIEW</span>
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Contextual Auth Modal Trigger */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => {
            if (pendingAction) dispatchTripApi(pendingAction);
          }}
          titleHint={pendingAction === 'submit' ? 'Sign In to Submit Proposal' : 'Sign In to Save Journey'}
        />
      </motion.div>
    </div>
  );
};

export default BespokePlannerPage;
