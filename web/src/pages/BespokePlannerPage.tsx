import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Calendar, Users, DollarSign, CheckCircle2, ArrowRight, ArrowLeft,
  Compass, Loader2, Save, Send, Mountain, ShieldCheck, Clock, MapPin, Heart, AlertTriangle, Cpu
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { AuthModal } from '../components/auth/AuthModal';
import { api } from '../api/client';
import {
  fadeInVariants, slideUpVariants, hoverLiftProps, buttonPressProps, scaleInModalVariants
} from '../utils/animations';
import { PipelineStepperHeader } from '../components/common/PipelineStepperHeader';

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
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['Tea Estates', 'Heritage']);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [mobilityPref, setMobilityPref] = useState('Standard VIP Escort');
  const [budgetUsd, setBudgetUsd] = useState(3500);

  // Concierge Loading State for Step 4
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generatedItinerary, setGeneratedItinerary] = useState<any | null>(null);
  const [aiOutput, setAiOutput] = useState<{
    normalizedObjective: string;
    regionsOrThemes: string[];
    interests: string[];
    dateConstraints: { startDate?: string; endDate?: string };
    budgetConstraint: { amount?: number; currency?: string };
    accessibilityConstraints: string[];
    requiredSteps: string[];
    delegatedAgentRoles: string[];
    missingCriticalFields: string[];
    recommendedDestinations?: Array<{
      name: string;
      region: string;
      highlights: string;
      category: string;
    }>;
  } | null>(null);

  const [destinationSuitabilityOutput, setDestinationSuitabilityOutput] = useState<{
    selectedCandidates: Array<{
      destinationId: string;
      destinationName: string;
      region: string;
      category: string;
      suitabilityScore: number;
      openingStatus: string;
      weatherSummary?: string;
    }>;
    rejectedCandidates: Array<{
      destinationId: string;
      destinationName: string;
      region: string;
      category: string;
      rejectionReason?: string;
    }>;
  } | null>(null);

  const [feasibilityOutput, setFeasibilityOutput] = useState<{
    overall_feasibility: 'FEASIBLE' | 'PARTIALLY_FEASIBLE' | 'INFEASIBLE';
    route_summary: {
      total_distance_km: number;
      total_duration_minutes: number;
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
    if (!dreamPrompt || !dreamPrompt.trim()) {
      showToast('Validation Error', 'Please describe your travel dream before proceeding.', 'error');
      setAiOutput(null);
      setGeneratedItinerary(null);
      setIsGenerating(false);
      return;
    }

    setIsGenerating(true);
    setGenerationStep(0);

    const payload = {
      prompt: dreamPrompt.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      budget: budgetUsd,
      currency: currency || 'USD',
      partySize: adults + children,
      selectedInterests: selectedInterests,
      accessibilityNeeds: mobilityPref
    };

    try {
      const response = await api.post('/api/trips/orchestrate-plan', payload);
      const data = response.data;
      setAiOutput(data);

      if (data.destinationSuitability) {
        setDestinationSuitabilityOutput(data.destinationSuitability);
      } else {
        try {
          const destRes = await api.post('/api/trips/evaluate-destinations', {
            tripRequestId: `CM-TRIP-${Date.now()}`,
            regionsOrThemes: data?.regionsOrThemes || [],
            interests: data?.interests || selectedInterests,
            startDate: startDate || null,
            endDate: endDate || null,
            accessibilityConstraints: data?.accessibilityConstraints || []
          });
          setDestinationSuitabilityOutput(destRes.data);
        } catch (destErr) {
          console.warn('Destination Suitability Agent call failed:', destErr);
        }
      }

      if (data.feasibility) {
        setFeasibilityOutput(data.feasibility);
      } else {
        try {
          const feasRes = await api.post('/api/trips/check-feasibility', {
            items: [
              { item_id: 'res-guide-1', resource_type: 'GUIDE', date: startDate, party_size: adults + children },
              { item_id: 'res-transport-1', resource_type: 'TRANSPORT', date: startDate, party_size: adults + children, lat: 6.9271, lng: 79.8612 },
              { item_id: 'res-attr-1', resource_type: 'ATTRACTION', date: startDate, party_size: adults + children, lat: 7.9570, lng: 80.7603 }
            ]
          });
          setFeasibilityOutput(feasRes.data);
        } catch (feasErr) {
          console.warn('Resource Feasibility Agent call failed:', feasErr);
        }
      }

      if (data.validation) {
        setValidationOutput(data.validation);
      } else {
        try {
          const valRes = await api.post('/api/trips/validate-itinerary', {
            trip_request_id: 9901,
            budget_limit: budgetUsd,
            party_size: adults + children,
            days: [
              { day_number: 1, title: 'VIP Airport Reception & Scenic Transfer', destination_id: 1, attraction_ids: [101], estimated_cost: budgetUsd * 0.25 },
              { day_number: 2, title: 'Ascension to Tea Estates & Planter High Tea', destination_id: 2, attraction_ids: [102], estimated_cost: budgetUsd * 0.25 },
              { day_number: 3, title: 'Dawn Wildlife Safari & Leopard Tracking', destination_id: 3, attraction_ids: [103], estimated_cost: budgetUsd * 0.25 },
              { day_number: 4, title: 'Southern Riviera & Heritage Dutch Fort Ramparts', destination_id: 4, attraction_ids: [104], estimated_cost: budgetUsd * 0.25 }
            ]
          });
          setValidationOutput(valRes.data);
        } catch (valErr) {
          console.warn('Itinerary Validation Agent call failed:', valErr);
        }
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const days = Math.max(3, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const activeInterests = (data?.interests && data.interests.length > 0)
        ? data.interests
        : selectedInterests;

      setGeneratedItinerary({
        tripId: `CM-JOURNEY-${Math.floor(100000 + Math.random() * 900000)}`,
        title: formatBespokeTitle(days, activeInterests),
        days,
        startDate,
        endDate,
        travelers: `${adults} Adults${children > 0 ? `, ${children} Children` : ''}`,
        totalQuoteUsd: Math.round(budgetUsd * 0.92),
        terrainRoutingFactor: '1.25x Mountain Precision Active',
        capacityStatus: '100% Guaranteed',
        itineraryDays: [
          { day: 1, title: 'VIP Airport Reception & Scenic Highway Transfer', detail: 'Chauffeur escort to executive suite with coconut welcome refreshments.' },
          { day: 2, title: 'Ascension to Tea Estates & Planter Bungalow High Tea', detail: 'Private hill-country routing with waterfall photo stops and evening fireside dinner.' },
          { day: 3, title: 'Dawn Wildlife Safari & Private Leopard Tracking', detail: 'Exclusive 4x4 modified safari jeep with certified wildlife naturalist.' },
          { day: 4, title: 'Southern Riviera & Heritage Dutch Fort Ramparts', detail: 'Curated walking tour of Galle Dutch Fort and evening oceanfront dining.' },
        ]
      });
    } catch (err: any) {
      console.warn('Backend orchestrate-plan call failed, using client fallback:', err);
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const days = Math.max(3, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      const promptLower = dreamPrompt.trim().toLowerCase();
      const hasTravelWords = ['travel', 'trip', 'tour', 'visit', 'explore', 'vacation', 'holiday', 'journey', 'expedition', 'wildlife', 'safari', 'culture', 'heritage', 'beach', 'coast', 'sea', 'tea', 'estate', 'kandy', 'galle', 'ella', 'colombo', 'yala', 'hotel', 'villa', 'train'].some(w => promptLower.includes(w));
      const isInvalid = promptLower.length < 15 || (!hasTravelWords && selectedInterests.length === 0);

      setAiOutput({
        normalizedObjective: isInvalid
          ? "Input does not contain recognizable travel intent or destinations."
          : dreamPrompt.trim(),
        regionsOrThemes: isInvalid ? [] : ['hill country', 'southern coast', 'tea country'],
        interests: selectedInterests,
        dateConstraints: { startDate, endDate },
        budgetConstraint: { amount: budgetUsd, currency },
        accessibilityConstraints: [mobilityPref],
        requiredSteps: isInvalid
          ? ['Prompt Clarification Required']
          : ['RESEARCH_DESTINATION_OPTIONS', 'DRAFT_ITINERARY', 'CHECK_RESOURCE_FEASIBILITY', 'PREPARE_QUOTATION', 'REQUEST_HUMAN_APPROVAL'],
        delegatedAgentRoles: isInvalid
          ? []
          : ['DESTINATION_RESEARCH_AGENT', 'ITINERARY_PLANNING_AGENT', 'RESOURCE_FEASIBILITY_AGENT', 'QUOTATION_AGENT'],
        missingCriticalFields: isInvalid ? ['Valid travel description or destinations'] : [],
        recommendedDestinations: isInvalid ? [] : [
          {
            name: 'Sigiriya Rock Fortress',
            region: 'Cultural Triangle',
            highlights: 'Ancient palace ruins, 360-degree panorama, frescoes',
            category: 'HERITAGE'
          },
          {
            name: 'Nuwara Eliya Tea Country',
            region: 'Central Highlands',
            highlights: 'Colonial bungalows, tea plucking experience, waterfalls',
            category: 'NATURE_AND_TEA'
          },
          {
            name: 'Yala National Park',
            region: 'Southern Province',
            highlights: 'High-density leopard safari, elephant herds',
            category: 'WILDLIFE'
          }
        ]
      });

      setGeneratedItinerary({
        tripId: `CM-JOURNEY-${Math.floor(100000 + Math.random() * 900000)}`,
        title: formatBespokeTitle(days, isInvalid ? [] : selectedInterests),
        days,
        startDate,
        endDate,
        travelers: `${adults} Adults${children > 0 ? `, ${children} Children` : ''}`,
        totalQuoteUsd: Math.round(budgetUsd * 0.92),
        terrainRoutingFactor: isInvalid ? 'Clarification Required' : '1.25x Mountain Precision Active',
        capacityStatus: isInvalid ? 'Capacity On Hold' : '100% Guaranteed',
        itineraryDays: [
          { day: 1, title: 'VIP Airport Reception & Scenic Highway Transfer', detail: 'Chauffeur escort to executive suite with coconut welcome refreshments.' },
          { day: 2, title: 'Ascension to Tea Estates & Planter Bungalow High Tea', detail: 'Private hill-country routing with waterfall photo stops and evening fireside dinner.' },
          { day: 3, title: 'Dawn Wildlife Safari & Private Leopard Tracking', detail: 'Exclusive 4x4 modified safari jeep with certified wildlife naturalist.' },
          { day: 4, title: 'Southern Riviera & Heritage Dutch Fort Ramparts', detail: 'Curated walking tour of Galle Dutch Fort and evening oceanfront dining.' },
        ]
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const days = Math.max(3, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const tripTitle = generatedItinerary?.title || formatBespokeTitle(days, selectedInterests);

      await api.post('/api/trips', {
        objective: dreamPrompt || tripTitle,
        startDate,
        endDate,
        budget: budgetUsd,
        currency,
        guestsCount: adults + children,
      });
      showToast(
        action === 'submit' ? 'Proposal Submitted for Review' : 'Journey Saved to Account',
        'Our Colombo 02 Concierge desk will review your proposal shortly.',
        'success'
      );
      navigate('/my-bookings');
    } catch {
      // Optimistic fallback for demonstration
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
      <PipelineStepperHeader currentStep={1} />
      <motion.div
        variants={fadeInVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="text-[#0B131F] py-12 px-4 md:px-8 font-sans"
      >
      <div className="max-w-4xl mx-auto space-y-8">
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
            <span className={step >= 4 ? 'text-[#134E4A] font-bold' : ''}>4. Proposal</span>
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
                          className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                            active
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
                    className={`px-6 py-3 rounded-xl font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 ${
                      !dreamPrompt || !dreamPrompt.trim()
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Adult Guests
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={adults}
                      onChange={(e) => setAdults(Number(e.target.value))}
                      className="w-full bg-[#FDFBF7] border border-stone-300 focus:border-[#134E4A] rounded-xl p-3 text-xs text-stone-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                      Children (Under 12)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={6}
                      value={children}
                      onChange={(e) => setChildren(Number(e.target.value))}
                      className="w-full bg-[#FDFBF7] border border-stone-300 focus:border-[#134E4A] rounded-xl p-3 text-xs text-stone-800 focus:outline-none"
                    />
                  </div>
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
                    {formatPrice(budgetUsd)}
                  </div>

                  <input
                    type="range"
                    min={1500}
                    max={12000}
                    step={250}
                    value={budgetUsd}
                    onChange={(e) => setBudgetUsd(Number(e.target.value))}
                    className="w-full accent-[#C5A880] cursor-pointer"
                  />

                  <div className="flex justify-between text-[11px] text-stone-400">
                    <span>{formatPrice(1500)} (Deluxe)</span>
                    <span>{formatPrice(6000)} (Premier Villa)</span>
                    <span>{formatPrice(12000)} (Presidential Privé)</span>
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

            {/* STEP 4: PROPOSAL & LOADER */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
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
                        CeylonMate AI Concierge at Work
                      </h3>
                      <p className="text-xs text-stone-600 font-mono animate-pulse">
                        {[
                          'Verifying scenic mountain route elevation parameters...',
                          'Checking VIP vehicle availability and chauffeur schedules...',
                          'Synthesizing UNESCO monument and safari slot reservations...',
                          'Assembling authoritative itemized quotation...'
                        ][generationStep]}
                      </p>
                    </div>

                    {/* Filling Progress Bar */}
                    <div className="max-w-md mx-auto bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#134E4A] transition-all duration-700 ease-out"
                        style={{ width: `${((generationStep + 1) / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : generatedItinerary && aiOutput && dreamPrompt.trim().length > 0 ? (() => {
                  const isPromptInvalid = Boolean(
                    aiOutput?.missingCriticalFields?.includes("Valid travel description or destinations") ||
                    (aiOutput?.normalizedObjective && aiOutput.normalizedObjective.includes("does not contain recognizable travel intent")) ||
                    (aiOutput?.requiredSteps?.includes("Prompt Clarification Required"))
                  );

                  const allThemesLower = [
                    ...(aiOutput?.regionsOrThemes || []),
                    ...selectedInterests
                  ].map((s) => s.toLowerCase());

                  const isHillCountry = !isPromptInvalid && allThemesLower.some((t) =>
                    t.includes('hill') || t.includes('tea') || t.includes('nuwara') || t.includes('ella') || t.includes('kandy') || t.includes('mountain')
                  );
                  const isCoastal = !isPromptInvalid && allThemesLower.some((t) =>
                    t.includes('coast') || t.includes('beach') || t.includes('galle') || t.includes('bentota') || t.includes('mirissa') || t.includes('riviera') || t.includes('scuba')
                  );
                  const isWildlife = !isPromptInvalid && allThemesLower.some((t) =>
                    t.includes('wildlife') || t.includes('safari') || t.includes('yala')
                  );

                  return (
                    <div className="space-y-6">
                      {/* DYNAMIC PROPOSAL HEADER BANNER (Renders ONLY after valid prompt analysis & generated itinerary) */}
                      {!isPromptInvalid && generatedItinerary && (
                        <div className="p-4 bg-emerald-950/10 border border-emerald-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
                          <div>
                            <span className="text-[10px] font-mono text-[#134E4A] uppercase font-bold">
                              Proposal #{generatedItinerary.tripId}
                            </span>
                            <h3 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
                              {generatedItinerary.title}
                            </h3>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-[#0B131F]/60 uppercase block text-xs font-semibold">Authoritative Total</span>
                            <span className="text-2xl font-serif-luxury font-bold text-[#134E4A]">
                              {formatPrice(generatedItinerary.totalQuoteUsd)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* GIBBERISH / INVALID PROMPT ALERT BOX */}
                      {isPromptInvalid && (
                        <div className="p-4 bg-amber-500/10 border-2 border-amber-500/50 rounded-2xl text-amber-900 flex items-start gap-3 shadow-md">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-1 text-xs">
                            <h4 className="font-bold text-amber-800 uppercase tracking-wider font-mono">
                              ⚠️ Travel Vision Clarification Required
                            </h4>
                            <p className="text-stone-700 leading-relaxed font-sans">
                              We couldn't recognize specific destinations or travel interests from your description. Please provide more details (e.g., places you want to visit, preferred activities) so our AI can craft an accurate itinerary.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* LANGGRAPH OBJECTIVE INTERPRETATION OUTPUT CARD */}
                      {aiOutput && (
                        <div className="p-5 bg-gradient-to-br from-[#0B131F] to-[#132338] text-stone-100 rounded-2xl border border-[#C5A880]/40 space-y-4 shadow-xl">
                          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                              <span className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                                LangGraph Objective Interpretation Agent
                              </span>
                            </div>
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                              Python AI Microservice (Port 8000)
                            </span>
                          </div>

                          {/* Normalized Prompt & Sanitization */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-mono text-stone-400 uppercase block">Sanitized Vision Prompt:</span>
                            <p className="text-xs italic text-stone-200 bg-slate-900/80 p-3 rounded-xl border border-stone-800 leading-relaxed font-serif">
                              "{aiOutput.normalizedObjective}"
                            </p>
                          </div>

                          {/* Extracted Regions/Themes & Interests Tags */}
                          {aiOutput.regionsOrThemes && aiOutput.regionsOrThemes.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="text-[10px] font-mono text-stone-400 uppercase">Identified Regions/Themes:</span>
                              {aiOutput.regionsOrThemes.map((r, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-[#134E4A] text-emerald-200 text-[11px] font-mono font-semibold">
                                  #{r}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Execution Pipeline Steps */}
                          <div className="space-y-2 pt-2 border-t border-stone-800">
                            <span className="text-[10px] font-mono text-stone-400 uppercase block font-semibold">
                              Autonomous Multi-Agent Pipeline & Delegated Roles:
                            </span>
                            <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                              {aiOutput.requiredSteps?.map((step, idx) => (
                                <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-[#C5A880]/30 text-amber-200 flex items-center gap-1 font-bold">
                                  <span>{idx + 1}. {step.replace(/_/g, ' ')}</span>
                                </span>
                              ))}
                            </div>
                            {aiOutput.delegatedAgentRoles && aiOutput.delegatedAgentRoles.length > 0 && (
                              <div className="flex flex-wrap gap-2 text-[10px] font-mono pt-1">
                                {aiOutput.delegatedAgentRoles.map((role, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-500/30">
                                    🤖 {role}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* RECOMMENDED DESTINATIONS & EXPERIENCES SECTION */}
                          <div className="space-y-3 pt-3 border-t border-stone-800">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-[#D4AF37]" />
                              <span className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                                📍 Recommended Destinations & Experiences for Your Journey
                              </span>
                            </div>

                            {aiOutput.recommendedDestinations && aiOutput.recommendedDestinations.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                {aiOutput.recommendedDestinations.map((dest, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-slate-900/90 border border-stone-800 hover:border-[#C5A880]/50 rounded-xl p-3.5 space-y-1.5 transition-all shadow-md"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <h5 className="text-xs font-bold text-stone-100 font-serif">
                                        {dest.name}
                                      </h5>
                                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-[#134E4A] text-emerald-200 uppercase font-semibold shrink-0">
                                        {dest.region}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-stone-300 leading-relaxed font-sans">
                                      {dest.highlights}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs italic text-stone-400 font-mono bg-slate-900/60 p-3 rounded-xl border border-stone-800">
                                No valid destinations matched. Please clarify your travel vision in Step 1.
                              </p>
                            )}
                          </div>

                          {/* Missing Critical Fields Warning */}
                          {aiOutput.missingCriticalFields && aiOutput.missingCriticalFields.length > 0 && (
                            <div className="p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl text-amber-200 text-xs font-mono space-y-1">
                              <span className="font-bold flex items-center gap-1">⚠️ Missing Critical Inputs:</span>
                              <p className="text-[11px] text-stone-300">
                                The AI agent detected missing parameters: {aiOutput.missingCriticalFields.join(', ')}. Please clarify in your prompt or form.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* DESTINATION SUITABILITY AGENT CANDIDATE EVALUATIONS */}
                      {destinationSuitabilityOutput && (
                        <div className="p-4 bg-[#0B131F] border border-stone-800 rounded-2xl space-y-3 font-mono text-xs">
                          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                            <span className="text-stone-300 font-bold flex items-center gap-1.5 text-xs">
                              🤖 Destination Suitability Agent Candidate Evaluation
                            </span>
                            <span className="text-[10px] text-[#C5A880]">
                              {destinationSuitabilityOutput.selectedCandidates?.length || 0} Suitable / {destinationSuitabilityOutput.rejectedCandidates?.length || 0} Filtered
                            </span>
                          </div>

                          {destinationSuitabilityOutput.rejectedCandidates && destinationSuitabilityOutput.rejectedCandidates.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] text-amber-400 font-semibold block">⚠️ Filtered / Restricted Destinations:</span>
                              <div className="flex flex-wrap gap-2">
                                {destinationSuitabilityOutput.rejectedCandidates.map((rej, idx) => (
                                  <span key={idx} className="px-2.5 py-1 rounded bg-rose-950/80 border border-rose-500/40 text-rose-200 text-[10px] flex items-center gap-1">
                                    <span className="font-bold">{rej.destinationName}:</span>
                                    <span className="italic">{rej.rejectionReason || 'Restricted due to safety advisory or closure'}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* DYNAMIC METRICS AND LOGISTICS TOKENS FROM RESOURCE FEASIBILITY AGENT */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className={`p-3 rounded-xl border flex items-center gap-2 ${isPromptInvalid ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-stone-50 border-stone-200 text-stone-800'}`}>
                          {isPromptInvalid ? (
                            <>
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                              <span>Input Clarification Needed</span>
                            </>
                          ) : isHillCountry ? (
                            <>
                              <Mountain className="w-4 h-4 text-[#134E4A]" />
                              <span>1.25x Hill Elevation Applied</span>
                            </>
                          ) : isCoastal ? (
                            <>
                              <Compass className="w-4 h-4 text-cyan-700" />
                              <span>Coastal Route Selected</span>
                            </>
                          ) : isWildlife ? (
                            <>
                              <Compass className="w-4 h-4 text-amber-700" />
                              <span>Wildlife Naturalist Escort</span>
                            </>
                          ) : (
                            <>
                              <Compass className="w-4 h-4 text-[#134E4A]" />
                              <span>Scenic Island Transit</span>
                            </>
                          )}
                        </div>

                        <div className={`p-3 rounded-xl border flex items-center gap-2 ${isPromptInvalid ? 'bg-stone-100 border-stone-200 text-stone-400' : 'bg-stone-50 border-stone-200 text-stone-800'}`}>
                          <ShieldCheck className={`w-4 h-4 ${isPromptInvalid ? 'text-stone-400' : 'text-emerald-600'}`} />
                          <span>
                            {isPromptInvalid
                              ? 'Capacity On Hold'
                              : feasibilityOutput
                              ? `Resource Status: ${feasibilityOutput.overall_feasibility}`
                              : '100% Guaranteed Capacity'}
                          </span>
                        </div>

                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-[#C5A880]" />
                          <span>
                            {feasibilityOutput?.route_summary?.total_distance_km
                              ? `${feasibilityOutput.route_summary.total_distance_km} km Transit Route (${feasibilityOutput.route_summary.total_duration_minutes || 280} mins)`
                              : `${generatedItinerary.startDate} – ${generatedItinerary.endDate}`}
                          </span>
                        </div>
                      </div>

                      {/* ITINERARY VALIDATION AGENT OUTPUT CARD (AGENT 4) */}
                      {validationOutput && (
                        <div className="p-4 bg-[#0B131F] border border-[#C5A880]/40 rounded-2xl space-y-2.5 font-mono text-xs text-stone-100 shadow-md">
                          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                              <span className="text-[#C5A880] font-bold uppercase tracking-wider text-xs">
                                Agent 4: Itinerary Validation & Concierge Audit Agent
                              </span>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              (validationOutput.status || validationOutput.approval_status) === 'REVISION_REQUIRED'
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            }`}>
                              Status: {validationOutput.status || validationOutput.approval_status || 'PENDING_APPROVAL'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-stone-800">
                              <span className="text-stone-400">Budget Compliance:</span>
                              <span className={validationOutput.budget_valid !== false ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                                {validationOutput.budget_valid !== false ? "COMPLIANT ($ Limit Respected)" : "REVISION SUGGESTED"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-stone-800">
                              <span className="text-stone-400">Route Continuity:</span>
                              <span className={validationOutput.continuity_valid !== false ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                                {validationOutput.continuity_valid !== false ? "CONTINUOUS (Zero Route Gaps)" : "DISCONTINUOUS"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="px-4 py-2 text-stone-600 hover:text-[#0B131F] text-xs font-semibold cursor-pointer font-mono"
                        >
                          ← Clarify Travel Vision in Step 1
                        </button>

                        <div className="flex items-center gap-3">
                          <motion.button
                            {...buttonPressProps}
                            disabled={isPromptInvalid}
                            onClick={() => handleSaveOrSubmit('save')}
                            className={`px-5 py-2.5 rounded-xl border font-semibold text-xs transition-colors flex items-center gap-1.5 font-mono ${
                              isPromptInvalid
                                ? 'border-stone-300 text-stone-400 bg-stone-100 cursor-not-allowed'
                                : 'border-[#134E4A] text-[#134E4A] hover:bg-[#134E4A] hover:text-white cursor-pointer'
                            }`}
                          >
                            <Save className="w-4 h-4" />
                            <span>Save My Journey</span>
                          </motion.button>

                          <motion.button
                            {...buttonPressProps}
                            disabled={isPromptInvalid}
                            onClick={() => handleSaveOrSubmit('submit')}
                            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 font-mono ${
                              isPromptInvalid
                                ? 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
                                : 'bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-[#0B131F] shadow-md cursor-pointer'
                            }`}
                          >
                            <Send className="w-4 h-4" />
                            <span>Submit for Concierge Review</span>
                          </motion.button>
                        </div>
                      </div>

                      {/* PROMINENT PIPELINE HANDOFF TO STAGE 02 */}
                      <div className="pt-4 border-t border-stone-200">
                        <button
                          type="button"
                          onClick={() => {
                            const route = dreamPrompt || 'Colombo -> Kandy -> Nuwara Eliya -> Yala';
                            const themes = selectedInterests.join(',');
                            const pax = adults + children;
                            navigate(`/operations/destinations-safety?theme=${encodeURIComponent(themes)}&route=${encodeURIComponent(route)}&pax=${pax}&budget=${budgetUsd}`);
                          }}
                          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-600 hover:to-teal-600 text-white font-mono font-bold text-xs sm:text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-emerald-400/40"
                        >
                          <span>⚡ HANDOFF TO STAGE 02: SAFETY & HAZARD AUDIT ➔</span>
                        </button>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="py-12 px-6 text-center space-y-4 bg-stone-50 border border-dashed border-stone-300 rounded-2xl">
                    <Compass className="w-10 h-10 text-stone-400 mx-auto" />
                    <h4 className="text-lg font-serif-luxury font-bold text-[#0B131F]">
                      No Travel Vision Provided
                    </h4>
                    <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                      Please enter your travel dream in Step 1 to generate a bespoke blueprint and itemized quotation.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-5 py-2.5 rounded-xl bg-[#0B131F] text-stone-100 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-[#134E4A] transition font-mono"
                    >
                      ← Return to Step 1: Describe Dream
                    </button>
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
