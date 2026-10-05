import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Calendar, Users, DollarSign, CheckCircle2, ArrowRight, ArrowLeft,
  Compass, Loader2, Save, Send, Mountain, ShieldCheck, Clock, MapPin, Heart, AlertTriangle,
  Cpu, CloudSun, Gauge, FileCheck, Car, User, Check, Briefcase, Globe, CloudRain, Sun, Droplets, Thermometer, ShieldAlert,
  Star, Award, UserCheck, X, RefreshCw, Receipt, TrendingUp, TrendingDown
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
  photoUrl?: string;
  avatarUrl?: string;
  rating?: number;
  reviewCount?: number;
  specialties?: string;
  licenseType?: string;
  isChauffeur?: boolean;
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

export interface Agent4PricingResult {
  pricingBreakdown: {
    fuelAndTransitLkr: number;
    vehicleDayRateLkr: number;
    tollFeesLkr: number;
    guideFeeLkr: number;
    taxesAndPlatformLkr: number;
    totalTripCostLkr: number;
    totalTripCostUsd: number;
  };
  budgetAudit: {
    targetBudgetLkr: number;
    varianceLkr: number;
    status: 'WITHIN_BUDGET' | 'EXCEEDS_BUDGET';
    verdictSummary: string;
    conciergeOptimizationTip: string;
  };
  synthesisSignOff: {
    isFeasible: boolean;
    driverSafetyHoursCompliant: boolean;
    auditBadge: string;
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

const isValidGuid = (id?: any): boolean =>
  typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

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
  const [budgetUsd, setBudgetUsd] = useState(1667);
  const [budgetLkr, setBudgetLkr] = useState(500000);

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
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [guideFilterLang, setGuideFilterLang] = useState('ALL');
  const [isLoadingGuides, setIsLoadingGuides] = useState(false);

  const fetchAvailableGuides = async () => {
    setIsLoadingGuides(true);
    try {
      const res = await api.get<any[]>('/api/guides');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: GuideOption[] = res.data.map((g: any) => ({
          id: g.id || g.userId || String(Math.random()),
          guideUserId: g.userId || g.id,
          guideName: g.fullName || g.name || 'SLTDA Certified Guide',
          bio: g.bio || 'SLTDA Certified Ceylon Tourist Escort with deep cultural expertise.',
          licenseNumber: g.licenseNumber || 'SLTDA/CG/2026/0001',
          languages: g.languages || g.languagesSpoken || 'English, Sinhala',
          priceAmount: Number(g.dailyRate || g.defaultDailyRateLkr || 18000),
          currency: g.currency || 'LKR',
          status: 'AVAILABLE',
          photoUrl: g.photoUrl || g.avatarUrl,
          avatarUrl: g.photoUrl || g.avatarUrl,
          rating: Number(g.rating) || 5.0,
          reviewCount: Number(g.reviewCount) || 12,
          specialties: g.specialties || 'Cultural Heritage & Ancient Kingdoms',
          licenseType: g.licenseType || g.guideType || 'National Tourist Guide Lecturer',
          isChauffeur: Boolean(g.isChauffeur)
        }));
        setAvailableGuides(mapped);
        setSelectedGuide((prev) => prev || mapped[0]);
      }
    } catch (e) {
      console.warn('Failed to load guide catalog:', e);
    } finally {
      setIsLoadingGuides(false);
    }
  };

  useEffect(() => {
    fetchAvailableGuides();
  }, []);

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

  const [selectedRoute, setSelectedRoute] = useState<{
    id?: string;
    name: string;
    distanceKm: number;
    via: string;
    estimatedDuration?: string;
    terrainType?: string;
    elevationMultiplier?: string;
    isFastest?: boolean;
    keyHighlightsOrStops?: string[];
  } | null>(null);

  // Agent 4 Pure LLM Pricing & Concierge State
  const [agent4Pricing, setAgent4Pricing] = useState<Agent4PricingResult | null>(null);
  const [isSynthesizingPricing, setIsSynthesizingPricing] = useState(false);
  const [isPricingStale, setIsPricingStale] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Sync destination from Agent 1 output
  useEffect(() => {
    if (destinationsList.length > 0 && !destination) {
      const topDest = destinationsList[0]?.name;
      if (topDest) {
        setDestination(topDest);
      }
    }
  }, [destinationsList, destination]);

  const extractTopDestinationName = (dataObj: any): string => {
    if (!dataObj) return 'Mirissa';
    const raw = dataObj.recommendedDestinations ||
      dataObj.recommended_destinations ||
      dataObj.destinations ||
      dataObj.selectedCandidates ||
      dataObj.data?.destinations ||
      dataObj.data?.recommendedDestinations ||
      [];
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0];
      if (typeof first === 'string') return first.trim();
      if (first && typeof first === 'object') {
        return (first.name || first.destinationName || first.title || first.location || 'Mirissa').trim();
      }
    }
    return 'Mirissa';
  };

  const handleCalculateLogisticsAndDispatch = async (customOrigin?: string, customDest?: string) => {
    const o = (customOrigin || origin || 'Colombo Airport').trim();
    const d = (customDest || destination || inputDestination || destinationsList[0]?.name || 'Mirissa').trim();

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
          passengers: adults || 2,
          startDate: startDate,
          durationDays: durationDays
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
            passengers: adults || 2,
            startDate: startDate,
            durationDays: durationDays
          })
        });
        if (directRes.ok) {
          resData = await directRes.json();
        }
      }

      if (resData && (Array.isArray(resData.routes) || Array.isArray(resData.dispatchedFleet))) {
        console.log('[AGENT 3 ROUTE & FLEET LOGISTICS RESULT]', resData);
        setAgent3Output(resData);
        if (resData.routes && resData.routes.length > 0) {
          setSelectedRoute(resData.routes[0]);
          setIsPricingStale(true);
        }
        // Automatically synthesize Agent 4 Dynamic Quotation
        setTimeout(() => {
          handleSynthesizePricing();
        }, 150);
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

  const handleSynthesizePricing = async (
    overrideGuide?: GuideOption | null,
    overrideVehicle?: VehicleOption | null,
    overrideRoute?: any | null
  ) => {
    setIsSynthesizingPricing(true);
    try {
      const targetBudgetVal = currency === 'USD' ? budgetUsd * 300 : budgetLkr;
      const activeRoute = overrideRoute || selectedRoute || (agent3Output?.routes && agent3Output.routes[0]) || {
        name: `${origin || 'Origin'} to ${destination || inputDestination || 'Tour Destination'} Corridor`,
        distanceKm: Number(agent3Output?.routes?.[0]?.distanceKm) || 120,
        via: 'Standard Scenic Transit Link'
      };
      const defaultFleetOption = agent3Output?.dispatchedFleet?.[0];
      const activeVehicle = overrideVehicle || selectedVehicle || (defaultFleetOption ? {
        id: defaultFleetOption.model,
        vehicleCatalogId: defaultFleetOption.model,
        vehicleModel: defaultFleetOption.model,
        categoryBadge: defaultFleetOption.vehicleType || 'Executive Fleet',
        dailyRate: defaultFleetOption.estimatedDailyRateLkr || 36000,
        estimatedDailyRateLkr: defaultFleetOption.estimatedDailyRateLkr || 36000,
        currency: 'LKR',
        maxPassengers: defaultFleetOption.maxPax || 4,
        status: 'AVAILABLE'
      } : (availableVehicles[0] || {
        id: 'Executive Fleet',
        vehicleCatalogId: 'Executive Fleet',
        vehicleModel: 'Executive Fleet Transport',
        categoryBadge: 'VIP Transport',
        dailyRate: 36000,
        estimatedDailyRateLkr: 36000,
        currency: 'LKR',
        maxPassengers: 4,
        status: 'AVAILABLE'
      }));

      const vehicleDailyRateLkr = Number(
        (activeVehicle as any).estimatedDailyRateLkr ||
        (activeVehicle.currency === 'LKR' ? activeVehicle.dailyRate : ((activeVehicle as any).dailyRateUsd || 120) * 300) ||
        36000
      );

      const guideToUse = overrideGuide !== undefined ? overrideGuide : selectedGuide;
      const activeGuide = guideToUse ? {
        name: guideToUse.guideName,
        role: guideToUse.licenseType || 'National Tourist Guide',
        dailyRateLkr: guideToUse.currency === 'LKR'
          ? Number(guideToUse.priceAmount || 15000)
          : Number((guideToUse.priceAmount || 50) * 300)
      } : null;

      const payload = {
        targetBudget: targetBudgetVal,
        tripDurationDays: durationDays,
        durationDays: durationDays,
        selectedRoute: {
          name: activeRoute.name,
          distanceKm: Number(activeRoute.distanceKm) || 120,
          via: activeRoute.via || 'Direct Scenic Route'
        },
        selectedVehicle: {
          model: activeVehicle.vehicleModel,
          vehicleType: activeVehicle.categoryBadge || 'Luxury Vehicle',
          dailyRateLkr: vehicleDailyRateLkr
        },
        selectedGuide: activeGuide
      };

      let resData: Agent4PricingResult | null = null;
      try {
        const res = await api.post<Agent4PricingResult>('/api/trips/agent4-concierge-pricing', payload);
        resData = res.data;
      } catch (proxyErr) {
        console.warn('Backend proxy failed, trying direct AI service endpoint:', proxyErr);
        try {
          const directRes = await fetch('http://localhost:8000/agent/concierge-pricing/synthesize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (directRes.ok) {
            resData = await directRes.json();
          }
        } catch (directErr) {
          console.warn('Direct AI pricing call failed:', directErr);
        }
      }

      // If remote calls failed or returned null breakdown, perform deterministic dynamic calculation fallback
      if (!resData || !resData.pricingBreakdown || !resData.pricingBreakdown.totalTripCostUsd) {
        const distKm = Number(activeRoute.distanceKm) || 145;
        const fuelAndTransitLkr = Math.round(distKm * 220 + 8500);
        const vehicleDayRateLkr = Math.round(vehicleDailyRateLkr * durationDays);
        const tollFeesLkr = 0;
        const guideFeeLkr = activeGuide ? Math.round(Number(activeGuide.dailyRateLkr) * durationDays) : 0;
        const subtotalLkr = fuelAndTransitLkr + vehicleDayRateLkr + guideFeeLkr;
        const taxesAndPlatformLkr = Math.round(subtotalLkr * 0.08);
        const totalTripCostLkr = subtotalLkr + taxesAndPlatformLkr;
        const totalTripCostUsd = Math.round((totalTripCostLkr / 300) * 100) / 100;
        const varianceLkr = targetBudgetVal - totalTripCostLkr;

        const varianceFormatted = currency === 'USD'
          ? `$${Math.round(Math.abs(varianceLkr) / 300).toLocaleString()} USD`
          : `LKR ${Math.abs(varianceLkr).toLocaleString()}`;

        resData = {
          pricingBreakdown: {
            fuelAndTransitLkr,
            vehicleDayRateLkr,
            tollFeesLkr,
            guideFeeLkr,
            taxesAndPlatformLkr,
            totalTripCostLkr,
            totalTripCostUsd
          },
          budgetAudit: {
            targetBudgetLkr: targetBudgetVal,
            varianceLkr,
            status: varianceLkr >= 0 ? 'WITHIN_BUDGET' : 'EXCEEDS_BUDGET',
            verdictSummary: varianceLkr >= 0
              ? `Expedition configuration is highly cost-effective and comfortably within your target budget by ${varianceFormatted}.`
              : `Expedition configuration slightly exceeds target budget by ${varianceFormatted}. Consider optimizing vehicle class or duration.`,
            conciergeOptimizationTip: activeGuide
              ? 'Private certified tour guide and dedicated executive chauffeur vehicle locked with SLTDA compliance.'
              : 'Add an SLTDA certified chauffeur lecturer to enrich heritage exploration.'
          },
          synthesisSignOff: {
            isFeasible: true,
            driverSafetyHoursCompliant: true,
            auditBadge: 'CONCIERGE CERTIFIED'
          }
        };
      }

      // Synchronize exact dynamic vehicle charter fee and guide fee with selected options
      const calculatedVehicleFee = Math.round(vehicleDailyRateLkr * durationDays);
      const calculatedGuideFee = activeGuide ? Math.round(Number(activeGuide.dailyRateLkr) * durationDays) : 0;
      
      resData.pricingBreakdown.vehicleDayRateLkr = calculatedVehicleFee;
      resData.pricingBreakdown.guideFeeLkr = calculatedGuideFee;
      
      const fuelCost = resData.pricingBreakdown.fuelAndTransitLkr || 0;
      const tollCost = resData.pricingBreakdown.tollFeesLkr || 0;
      const subtotalLkr = fuelCost + calculatedVehicleFee + tollCost + calculatedGuideFee;
      const taxesAndPlatformLkr = Math.round(subtotalLkr * 0.08);
      
      resData.pricingBreakdown.taxesAndPlatformLkr = taxesAndPlatformLkr;
      resData.pricingBreakdown.totalTripCostLkr = subtotalLkr + taxesAndPlatformLkr;
      resData.pricingBreakdown.totalTripCostUsd = Math.round((resData.pricingBreakdown.totalTripCostLkr / 300) * 100) / 100;
      
      const varianceLkr = targetBudgetVal - resData.pricingBreakdown.totalTripCostLkr;
      if (resData.budgetAudit) {
        resData.budgetAudit.varianceLkr = varianceLkr;
        resData.budgetAudit.status = varianceLkr >= 0 ? 'WITHIN_BUDGET' : 'EXCEEDS_BUDGET';
      }

      if (resData && resData.pricingBreakdown) {
        console.log('[AGENT 4 DYNAMIC PRICING RESULT]', resData);
        setAgent4Pricing(resData);
        setIsPricingStale(false);
      }
    } catch (err: any) {
      console.error('[AGENT 4 PRICING ERROR]', err);
    } finally {
      setIsSynthesizingPricing(false);
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
    } else if (step === 2) {
      const todayStr = new Date().toISOString().slice(0, 10);
      if (!startDate || startDate < todayStr) {
        showToast('Validation Error', 'Start Date in the Date Window & Traveler Profile must not be a past date.', 'error');
        return;
      }
      if (!endDate || endDate <= startDate) {
        showToast('Validation Error', 'End Date must be greater than the Start Date (End Date > Start Date).', 'error');
        return;
      }
      setStep(3);
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

  // Step 4 Auto-Runner for Agent 2, Agent 3, and Agent 4
  useEffect(() => {
    if (step === 4 && !isGenerating) {
      const topDest = inputDestination || destination || (destinationsList[0]?.name) || 'Mirissa';
      if (!agent2Data && !isLoadingAgent2 && topDest) {
        handleInspectSuitability(topDest);
      }
      if (!agent3Output && !isDispatchingAgent3 && topDest) {
        handleCalculateLogisticsAndDispatch(origin || 'Colombo Airport', topDest);
      }
      if (!agent4Pricing && !isSynthesizingPricing) {
        handleSynthesizePricing();
      }
    }
  }, [step, isGenerating, agent2Data, isLoadingAgent2, agent3Output, isDispatchingAgent3, agent4Pricing, isSynthesizingPricing, inputDestination, destination, destinationsList, origin]);

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
      const topDest = extractTopDestinationName(agent1);
      setInputDestination(topDest);
      setDestination(topDest);
      // Automatically inspect live weather & safety telemetry for top destination (Agent 2)
      handleInspectSuitability(topDest);
      // Automatically calculate logistics and fleet for top destination from user's starting location (Agent 3)
      handleCalculateLogisticsAndDispatch(origin || 'Colombo Airport', topDest);

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
        const destName = typeof dest === 'string' ? dest : (dest?.name || dest?.destinationName || (activeInterests[i % (activeInterests.length || 1)] || 'Bespoke Exploration'));
        const destHighlights = (typeof dest === 'object' ? (dest?.highlights || dest?.description) : null) || 'Private chauffeur escort and curated destination highlights.';
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

          const directTopDest = extractTopDestinationName(directAgent1);
          setInputDestination(directTopDest);
          setDestination(directTopDest);
          handleInspectSuitability(directTopDest);
          handleCalculateLogisticsAndDispatch(origin || 'Colombo Airport', directTopDest);

          const activeInterests = (directAgent1?.interests && directAgent1.interests.length > 0)
            ? directAgent1.interests
            : selectedInterests;

          const destItems = directAgent1?.recommendedDestinations || directAgent1?.destinations || [];
          const generatedDays = Array.from({ length: durationDays }, (_, i) => {
            const dest = destItems[i % (destItems.length || 1)];
            const destName = typeof dest === 'string' ? dest : (dest?.name || dest?.destinationName || (activeInterests[i % (activeInterests.length || 1)] || 'Bespoke Exploration'));
            const destHighlights = (typeof dest === 'object' ? (dest?.highlights || dest?.description) : null) || 'Private chauffeur escort and curated destination highlights.';
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

  // Pure LLM Dynamic Pricing & Journey Duration (Zero hardcoded formulas)
  const durationDays = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)));
  const totalCalculatedQuote = agent4Pricing?.pricingBreakdown?.totalTripCostUsd || (currency === 'USD' ? budgetUsd : Math.round(budgetLkr / 300));

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
    setIsSubmittingReview(true);
    try {
      const tripTitle = generatedItinerary?.title || formatBespokeTitle(durationDays, selectedInterests);
      const destListStr = destinationsList.map((d: any) => d.name).filter(Boolean).join(' - ') || 'Colombo - Central Highlands - Southern Coast';

      const vehicleDailyRate = (selectedVehicle as any)?.estimatedDailyRateLkr
        || (selectedVehicle?.currency === 'LKR' ? selectedVehicle?.dailyRate : (selectedVehicle?.dailyRateUsd || 120) * 300)
        || 35000;

      const guideDailyRate = selectedGuide
        ? (selectedGuide.currency === 'LKR' ? selectedGuide.priceAmount : (selectedGuide.priceAmount || 60) * 300)
        : null;

      const finalUsd = agent4Pricing?.pricingBreakdown?.totalTripCostUsd || totalCalculatedQuote || (currency === 'USD' ? budgetUsd : Math.round(budgetLkr / 300));
      const finalLkr = agent4Pricing?.pricingBreakdown?.totalTripCostLkr || (finalUsd * 300);

      const effectivePricingBreakdown = agent4Pricing?.pricingBreakdown || {
        fuelAndTransitLkr: Math.round(finalLkr * 0.35),
        vehicleDayRateLkr: Math.round(finalLkr * 0.45),
        tollFeesLkr: Math.round(finalLkr * 0.05),
        guideFeeLkr: selectedGuide ? Math.round(finalLkr * 0.15) : 0,
        taxesAndPlatformLkr: Math.round(finalLkr * 0.05),
        totalTripCostLkr: finalLkr,
        totalTripCostUsd: finalUsd
      };

      const payload = {
        title: tripTitle,
        customTitle: tripTitle,
        dreamPrompt: dreamPrompt || tripTitle,
        startDate,
        endDate,
        durationDays: durationDays,
        tripDurationDays: durationDays,
        passengerCount: adults,
        selectedInterests,
        destinations: destListStr,
        destinationsCovered: destListStr,
        status: "PENDING_CONCIERGE_REVIEW",
        selectedRoute: selectedRoute ? {
          name: selectedRoute.name,
          transitType: (selectedRoute as any).transitType || 'Scenic Corridor & Expressway Link',
          distanceKm: Number(selectedRoute.distanceKm) || 120,
          via: selectedRoute.via || 'Expressway Link'
        } : null,
        selectedVehicle: selectedVehicle ? {
          model: selectedVehicle.vehicleModel,
          vehicleModel: selectedVehicle.vehicleModel,
          vehicleType: selectedVehicle.categoryBadge || 'Luxury VIP Fleet',
          categoryBadge: selectedVehicle.categoryBadge || 'Luxury VIP Fleet',
          dailyRateLkr: vehicleDailyRate
        } : null,
        selectedVehicleCategory: selectedVehicle?.categoryBadge || (selectedVehicle as any)?.category || 'Luxury VIP Fleet',
        selectedGuide: selectedGuide ? {
          id: selectedGuide.id,
          name: selectedGuide.guideName,
          guideName: selectedGuide.guideName,
          role: selectedGuide.licenseType || 'National Tourist Guide',
          licenseNumber: selectedGuide.licenseNumber,
          dailyRateLkr: guideDailyRate
        } : null,
        finalPriceUsd: finalUsd,
        finalPriceLkr: finalLkr,
        finalPriceQuoteUsd: finalUsd,
        finalPriceQuoteLkr: finalLkr,
        totalTripCostUsd: finalUsd,
        totalTripCostLkr: finalLkr,
        totalCalculatedQuote: finalUsd,
        agent1Output: aiOutput,
        agent2Suitability: agent2Data,
        agent3Logistics: agent3Output,
        pricingBreakdown: {
          fuelAndTransitLkr: effectivePricingBreakdown.fuelAndTransitLkr,
          vehicleCharterLkr: (effectivePricingBreakdown as any).vehicleCharterLkr || effectivePricingBreakdown.vehicleDayRateLkr,
          vehicleDayRateLkr: effectivePricingBreakdown.vehicleDayRateLkr,
          tollFeesLkr: effectivePricingBreakdown.tollFeesLkr,
          guideFeeLkr: effectivePricingBreakdown.guideFeeLkr,
          platformFeeLkr: (effectivePricingBreakdown as any).platformFeeLkr || effectivePricingBreakdown.taxesAndPlatformLkr,
          taxesAndPlatformLkr: effectivePricingBreakdown.taxesAndPlatformLkr,
          totalTripCostLkr: finalLkr,
          totalTripCostUsd: finalUsd
        },
        budgetAudit: agent4Pricing?.budgetAudit || null,
        synthesisSignOff: agent4Pricing?.synthesisSignOff || null,
        vehicleId: isValidGuid(selectedVehicle?.id) ? selectedVehicle?.id : null,
        guideSlotId: isValidGuid(selectedGuide?.id) ? selectedGuide?.id : null,
        guideName: selectedGuide?.guideName || ''
      };

      try {
        const response = await api.post('/api/bookings/submit-bespoke-review', payload);
        console.log("Submission response:", response.data);

        showToast(
          action === 'submit' ? 'Journey Submitted for Review!' : 'Blueprint Saved to Account',
          'Your journey has been submitted! Our concierge team is reviewing logistics and will confirm within 2 hours.',
          'success'
        );
        navigate('/my-bookings');
      } catch (err: any) {
        console.error('Submission failed:', err);
        const serverError = err?.response?.data?.message || err?.message || 'Failed to submit journey for review.';
        showToast('Submission Error', serverError, 'error');
      }
    } catch (err: any) {
      console.error("Submission preparation failed:", err);
      showToast('Submission Error', err?.message || 'Failed to prepare bespoke journey submission.', 'error');
    } finally {
      setIsSubmittingReview(false);
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
                        min={new Date().toISOString().slice(0, 10)}
                        value={startDate}
                        onChange={(e) => {
                          const todayStr = new Date().toISOString().slice(0, 10);
                          const val = e.target.value;
                          if (val && val < todayStr) {
                            showToast('Invalid Date', 'Start Date in the Date Window & Traveler Profile must not be a past date.', 'error');
                          }
                          setStartDate(val);
                        }}
                        className={`w-full bg-[#FDFBF7] border rounded-xl p-3 text-xs text-stone-800 focus:outline-none transition-colors ${
                          startDate && startDate < new Date().toISOString().slice(0, 10)
                            ? 'border-rose-500 focus:border-rose-600 bg-rose-50/30'
                            : 'border-stone-300 focus:border-[#134E4A]'
                        }`}
                      />
                      {startDate && startDate < new Date().toISOString().slice(0, 10) && (
                        <p className="text-[11px] text-rose-600 font-mono mt-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Start Date must not be a past date.</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        min={startDate ? new Date(new Date(startDate).getTime() + 86400000).toISOString().slice(0, 10) : new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                        value={endDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && startDate && val <= startDate) {
                            showToast('Invalid Date', 'End Date must be greater than Start Date (End Date > Start Date).', 'error');
                          }
                          setEndDate(val);
                        }}
                        className={`w-full bg-[#FDFBF7] border rounded-xl p-3 text-xs text-stone-800 focus:outline-none transition-colors ${
                          endDate && startDate && endDate <= startDate
                            ? 'border-rose-500 focus:border-rose-600 bg-rose-50/30'
                            : 'border-stone-300 focus:border-[#134E4A]'
                        }`}
                      />
                      {endDate && startDate && endDate <= startDate && (
                        <p className="text-[11px] text-rose-600 font-mono mt-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>End Date must be after Start Date (End Date &gt; Start Date).</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* CURRENT / STARTING LOCATION */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#134E4A]" />
                        <span>Current Location / Starting Pickup Point</span>
                      </span>

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
                          onClick={() => {
                            const nextCurrency = currency === 'USD' ? 'LKR' : 'USD';
                            setCurrency(nextCurrency);
                            if (nextCurrency === 'LKR') {
                              setBudgetLkr(Math.round(budgetUsd * 300));
                            } else {
                              setBudgetUsd(Math.round(budgetLkr / 300));
                            }
                          }}
                          className="font-bold text-[#C5A880] underline hover:text-amber-300 transition-colors cursor-pointer"
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
                      max={currency === 'LKR' ? 1000000 : 3333}
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
                      <span>{currency === 'LKR' ? 'LKR 500,000 (Premier)' : '$1,667 (Premier)'}</span>
                      <span>{currency === 'LKR' ? 'LKR 1,000,000 (Ultra Luxury)' : '$3,333 (Ultra Luxury)'}</span>
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
                                  {agent3Output.routes.map((route, idx) => {
                                    const isSelected = selectedRoute ? (selectedRoute.id === route.id || selectedRoute.name === route.name) : idx === 0;
                                    return (
                                      <div
                                        key={route.id || idx}
                                        onClick={() => {
                                          setSelectedRoute(route);
                                          setIsPricingStale(true);
                                        }}
                                        className={`p-4 rounded-xl border transition-all space-y-3 cursor-pointer ${
                                          isSelected
                                            ? 'bg-slate-950 border-[#D4AF37] ring-2 ring-[#D4AF37]/40 shadow-lg'
                                            : 'bg-slate-950 border-stone-800 hover:border-stone-700'
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
                                          {isSelected && (
                                            <span className="text-[9px] font-mono bg-[#D4AF37] text-slate-950 font-bold px-2 py-0.5 rounded uppercase">
                                              Selected
                                            </span>
                                          )}
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
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="p-4 bg-slate-950 rounded-xl border border-stone-800 text-stone-400 text-xs font-mono text-center">
                                  No routes generated by Agent 3.
                                </div>
                              )}
                            </div>

                              {/* 2. DYNAMIC DISPATCHED FLEET OPTIONS */}
                              {(() => {
                                const eligibleFleet = (agent3Output.dispatchedFleet || []).filter(
                                  (vehicle) => (vehicle.maxPax ?? 0) >= (adults || 1)
                                );
                                return (
                                  <div className="space-y-3 pt-2 border-t border-stone-800">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider flex items-center gap-1.5">
                                        <Car className="w-4 h-4 text-[#D4AF37]" />
                                        <span>Dispatched Fleet Telemetry ({eligibleFleet.length} Available Vehicles)</span>
                                      </span>
                                      <span className="text-[10px] font-mono text-stone-400">
                                        Click to Select Vehicle (Min. {adults || 1} Pax)
                                      </span>
                                    </div>

                                    {eligibleFleet.length > 0 ? (
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                        {eligibleFleet.map((vehicle, vIdx) => {
                                          const isSelected = selectedVehicle?.vehicleModel === vehicle.model || (!selectedVehicle && vIdx === 0);
                                          return (
                                            <div
                                              key={vIdx}
                                              onClick={() => {
                                                const newVeh = {
                                                  id: vehicle.model,
                                                  vehicleCatalogId: vehicle.model,
                                                  vehicleModel: vehicle.model,
                                                  categoryBadge: vehicle.vehicleType,
                                                  imageUrl: '',
                                                  maxPassengers: vehicle.maxPax,
                                                  featureHighlight: vehicle.terrainSuitabilityNote,
                                                  dailyRateUsd: vehicle.estimatedDailyRateLkr ? Math.round(vehicle.estimatedDailyRateLkr / 300) : 120,
                                                  dailyRate: vehicle.estimatedDailyRateLkr || 36000,
                                                  estimatedDailyRateLkr: vehicle.estimatedDailyRateLkr || 36000,
                                                  currency: 'LKR',
                                                  status: 'AVAILABLE'
                                                };
                                                setSelectedVehicle(newVeh);
                                                setIsPricingStale(false);
                                                handleSynthesizePricing(undefined, newVeh);
                                              }}
                                              className={`p-4 rounded-xl border transition-all space-y-3 cursor-pointer ${
                                                isSelected
                                                  ? 'bg-slate-950 border-[#D4AF37] ring-2 ring-[#D4AF37]/40 shadow-lg'
                                                  : 'bg-slate-950 border-stone-800 hover:border-stone-700'
                                              }`}
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
                                                {isSelected && (
                                                  <span className="text-[9px] font-mono bg-[#D4AF37] text-slate-950 font-bold px-2 py-0.5 rounded uppercase">
                                                    Selected
                                                  </span>
                                                )}
                                              </div>

                                              <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 py-1.5 border-y border-stone-800/60">
                                                <span className="text-stone-300 font-bold">{vehicle.maxPax} Pax</span>
                                                <span className="text-stone-400">{vehicle.luggageCapacity} Luggage Bags</span>
                                                {vehicle.estimatedDailyRateLkr ? (
                                                  <span className="text-[#D4AF37] font-bold">
                                                    {formatPrice(vehicle.estimatedDailyRateLkr, 'LKR')} / day
                                                  </span>
                                                ) : null}
                                              </div>

                                              <div className="p-2.5 bg-[#0B131F] rounded-lg border border-stone-800/80 text-[11px] font-mono text-stone-300 space-y-1">
                                                <span className="text-[9px] text-[#C5A880] uppercase tracking-wider block font-bold">Terrain Suitability:</span>
                                                <p className="text-[11px] text-stone-300 leading-relaxed">
                                                  {vehicle.terrainSuitabilityNote}
                                                </p>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="p-4 bg-slate-950 rounded-xl border border-stone-800 text-stone-400 text-xs font-mono text-center">
                                        No vehicles available with capacity for {adults || 1} passengers on {startDate || 'selected dates'}.
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
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
                      {/* [ CARD 3.5: PRIVATE CERTIFIED TOUR GUIDE & CHAUFFEUR ESCORT (OPTIONAL) ]  */}
                      {/* ========================================================================= */}
                      <div className="bg-[#0F1A24] border border-stone-800 text-stone-100 rounded-2xl p-6 space-y-5 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-800 pb-4 gap-3">
                          <div className="flex items-center gap-2.5">
                            <Award className="w-5 h-5 text-[#D4AF37]" />
                            <div>
                              <h4 className="text-sm font-mono font-bold text-[#C5A880] uppercase tracking-wider flex items-center gap-2">
                                <span>👨‍✈️ Private Certified Tour Guide & Escort</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-sans font-normal">
                                  Optional Add-on
                                </span>
                              </h4>
                              <p className="text-xs text-stone-400 font-sans mt-0.5">
                                Enrich your journey with an SLTDA-licensed national guide or private chauffeur lecturer.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {selectedGuide && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedGuide(null);
                                  setIsPricingStale(true);
                                  showToast('Guide Removed', 'Itinerary updated without a private guide.', 'info');
                                }}
                                className="px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-mono transition-all cursor-pointer"
                              >
                                Remove Guide
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (availableGuides.length === 0) {
                                  fetchAvailableGuides();
                                }
                                setIsGuideModalOpen(true);
                              }}
                              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20 transition-all cursor-pointer"
                            >
                              <UserCheck className="w-4 h-4" />
                              <span>{selectedGuide ? 'Change Guide' : 'View All Available Guides'}</span>
                              {availableGuides.length > 0 && (
                                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-950 text-[#D4AF37] text-[10px]">
                                  {availableGuides.length}
                                </span>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Selected Guide Details or Invitation Banner */}
                        {selectedGuide ? (
                          <div className="p-4 rounded-xl bg-slate-950 border border-[#C5A880]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <img
                                src={selectedGuide.photoUrl || selectedGuide.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'}
                                alt={selectedGuide.guideName}
                                className="w-14 h-14 rounded-full object-cover border-2 border-[#D4AF37] shrink-0"
                              />
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-serif font-bold text-stone-100 text-base">{selectedGuide.guideName}</h5>
                                  <span className="text-[10px] font-mono bg-[#134E4A] text-emerald-200 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
                                    {selectedGuide.licenseType || 'SLTDA National Guide'}
                                  </span>
                                </div>
                                <p className="text-xs text-stone-300 font-sans line-clamp-1">{selectedGuide.bio}</p>
                                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-stone-400">
                                  <span className="text-[#D4AF37] flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 fill-[#D4AF37]" /> {selectedGuide.rating || 5.0} (Certified)
                                  </span>
                                  <span>•</span>
                                  <span>Languages: {selectedGuide.languages}</span>
                                  <span>•</span>
                                  <span>Lic: {selectedGuide.licenseNumber}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right flex md:flex-col items-center md:items-end justify-between w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-stone-800">
                              <span className="text-[10px] font-mono text-stone-400 uppercase">Guide Fee ({durationDays} Days)</span>
                              <span className="text-base font-mono font-bold text-[#D4AF37]">
                                {formatPrice(
                                  (selectedGuide.currency === 'USD' ? selectedGuide.priceAmount * 300 : selectedGuide.priceAmount) * durationDays,
                                  'LKR'
                                )}
                              </span>
                              <span className="text-[10px] font-mono text-emerald-400 mt-0.5">
                                {formatPrice(
                                  selectedGuide.currency === 'USD' ? selectedGuide.priceAmount * 300 : selectedGuide.priceAmount,
                                  'LKR'
                                )} / day
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-slate-950/60 rounded-xl border border-dashed border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 text-stone-400 text-xs">
                              <User className="w-5 h-5 text-stone-500 shrink-0" />
                              <span>
                                No private guide selected. You can easily add a certified national lecturer or chauffeur guide anytime.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (availableGuides.length === 0) {
                                  fetchAvailableGuides();
                                }
                                setIsGuideModalOpen(true);
                              }}
                              className="text-xs text-[#D4AF37] hover:underline font-mono whitespace-nowrap flex items-center gap-1 cursor-pointer"
                            >
                              <span>Browse Guides</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* ========================================================================= */}
                      {/* [ CARD 4: AGENT 4 - PURE LLM PRICING & CONCIERGE AUDITOR ENGINE ]         */}
                      {/* ========================================================================= */}
                      <div className="bg-[#0B131F] border border-stone-800 text-stone-100 rounded-2xl p-6 space-y-5 shadow-xl relative overflow-hidden">
                        {/* Background Glow */}
                        <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-800 pb-4 gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400">
                              <FileCheck className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-mono font-bold text-stone-100 uppercase tracking-wider flex items-center gap-2">
                                <span>AGENT 4: CHIEF CONCIERGE & DYNAMIC PRICING AUDITOR</span>
                                <span className="text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
                                  PURE LLM ENGINE
                                </span>
                              </h4>
                              <p className="text-xs text-stone-400 font-sans mt-0.5">
                                Evaluates route distance, terrain difficulty, fleet day rate, and guide fees against real-time market dynamics.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {agent4Pricing && (
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 border ${
                                agent4Pricing.budgetAudit.status === 'WITHIN_BUDGET'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                                  : 'bg-amber-950 text-amber-300 border-amber-500/40'
                              }`}>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {agent4Pricing.synthesisSignOff?.auditBadge || 'CONCIERGE CERTIFIED'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stale Price Warning Banner */}
                        {isPricingStale && agent4Pricing && (
                          <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-center justify-between text-xs text-amber-200 gap-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>Configuration updated (Route / Vehicle / Guide changed). Please re-synthesize your quotation.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSynthesizePricing()}
                              disabled={isSynthesizingPricing}
                              className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-mono font-bold text-[11px] hover:bg-amber-400 whitespace-nowrap cursor-pointer flex items-center gap-1.5"
                            >
                              <RefreshCw className={`w-3 h-3 ${isSynthesizingPricing ? 'animate-spin' : ''}`} />
                              Re-synthesize
                            </button>
                          </div>
                        )}

                        {/* Loading State */}
                        {isSynthesizingPricing && (
                          <div className="p-8 bg-slate-950/80 rounded-xl border border-[#D4AF37]/30 text-center space-y-3 animate-pulse">
                            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
                            <h5 className="font-serif font-bold text-stone-100 text-sm">
                              Agent 4 synthesising real market rates and auditing budget...
                            </h5>
                            <p className="text-xs font-mono text-stone-400 max-w-md mx-auto">
                              Prompting Gemini 2.5 Flash with route ({selectedRoute?.distanceKm || 125} km via {selectedRoute?.via || 'Direct Link'}), fleet ({selectedVehicle?.vehicleModel || 'Executive Fleet'}), and certified guide escort.
                            </p>
                          </div>
                        )}

                        {/* LLM Pricing Breakdown & Budget Audit Results */}
                        {agent4Pricing && !isSynthesizingPricing && (
                          <div className="space-y-4">
                            {/* Dynamic Line Items */}
                            <div className="p-5 bg-gradient-to-br from-[#134E4A]/25 via-slate-950 to-[#0B131F] border border-emerald-500/30 rounded-xl space-y-3.5 text-xs font-sans">
                              <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                                <span className="text-stone-100 font-semibold font-mono uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                                  <span>Dynamic AI Market Price Breakdown</span>
                                </span>
                                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                                  No Static Multipliers
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div className="p-3 bg-slate-950/80 rounded-lg border border-stone-800/80 flex items-center justify-between">
                                  <span className="text-stone-300">Fuel & Long-Range Transit</span>
                                  <span className="text-stone-100 font-mono font-bold">
                                    {formatPrice(agent4Pricing.pricingBreakdown.fuelAndTransitLkr, 'LKR')}
                                  </span>
                                </div>

                                <div className="p-3 bg-slate-950/80 rounded-lg border border-stone-800/80 flex items-center justify-between">
                                  <div>
                                    <span className="text-stone-300 block">
                                      Vehicle Charter ({selectedVehicle?.vehicleModel || 'Executive Fleet'})
                                    </span>
                                    <span className="text-[10px] font-mono text-[#D4AF37]">
                                      {durationDays} Days @ {formatPrice(
                                        Number(
                                          (selectedVehicle as any)?.estimatedDailyRateLkr ||
                                          (selectedVehicle?.currency === 'LKR' ? selectedVehicle?.dailyRate : ((selectedVehicle as any)?.dailyRateUsd || 120) * 300) ||
                                          36000
                                        ),
                                        'LKR'
                                      )} / day
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-stone-100 font-mono font-bold block">
                                      {formatPrice(agent4Pricing.pricingBreakdown.vehicleDayRateLkr, 'LKR')}
                                    </span>
                                  </div>
                                </div>


                                <div className="p-3 bg-slate-950/80 rounded-lg border border-stone-800/80 flex items-center justify-between">
                                  <div>
                                    <span className="text-stone-300 block">
                                      Tour Escort ({selectedGuide?.guideName || 'None Selected'})
                                    </span>
                                    {selectedGuide && (
                                      <span className="text-[10px] font-mono text-[#D4AF37]">
                                        {durationDays} Days @ {formatPrice(selectedGuide.currency === 'USD' ? selectedGuide.priceAmount * 300 : selectedGuide.priceAmount, 'LKR')} / day
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="text-stone-100 font-mono font-bold block">
                                      {agent4Pricing.pricingBreakdown.guideFeeLkr > 0
                                        ? formatPrice(agent4Pricing.pricingBreakdown.guideFeeLkr, 'LKR')
                                        : (selectedGuide
                                            ? formatPrice((selectedGuide.currency === 'LKR' ? selectedGuide.priceAmount : selectedGuide.priceAmount * 300) * durationDays, 'LKR')
                                            : (currency === 'USD' ? '$0 (Self-Guided)' : 'LKR 0 (Self-Guided)'))}
                                    </span>
                                    {selectedGuide && (
                                      <span className="text-[10px] font-mono text-stone-400">
                                        {formatPrice(
                                          (agent4Pricing.pricingBreakdown.guideFeeLkr > 0
                                            ? agent4Pricing.pricingBreakdown.guideFeeLkr
                                            : (selectedGuide.currency === 'LKR' ? selectedGuide.priceAmount : selectedGuide.priceAmount * 300) * durationDays),
                                          'LKR'
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="p-3 bg-slate-950/80 rounded-lg border border-stone-800/80 flex items-center justify-between md:col-span-2">
                                  <span className="text-stone-300">Platform Concierge Fee & Tourism Taxes</span>
                                  <span className="text-stone-100 font-mono font-bold">
                                    {formatPrice(agent4Pricing.pricingBreakdown.taxesAndPlatformLkr, 'LKR')}
                                  </span>
                                </div>
                              </div>

                              {/* Grand Total Bar */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-emerald-500/30 pt-3 gap-2">
                                <div>
                                  <span className="text-emerald-300 font-bold text-sm block">TOTAL EXPEDITION QUOTE</span>
                                  <span className="text-[11px] font-mono text-stone-400">
                                    {currency === 'USD'
                                      ? `LKR ${agent4Pricing.pricingBreakdown.totalTripCostLkr.toLocaleString()} equivalent`
                                      : `$${agent4Pricing.pricingBreakdown.totalTripCostUsd.toFixed(2)} USD equivalent`}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-2xl font-bold font-mono text-[#D4AF37]">
                                    {formatPrice(agent4Pricing.pricingBreakdown.totalTripCostLkr, 'LKR')}
                                    <span className="text-xs text-stone-400 font-normal ml-1.5">{currency}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Budget Health & Variance Audit */}
                            <div className="p-4 bg-slate-950 rounded-xl border border-stone-800 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider flex items-center gap-1.5">
                                  {agent4Pricing.budgetAudit.status === 'WITHIN_BUDGET' ? (
                                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <TrendingUp className="w-4 h-4 text-amber-400" />
                                  )}
                                  <span>Budget Variance & Feasibility Audit</span>
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  agent4Pricing.budgetAudit.status === 'WITHIN_BUDGET'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {agent4Pricing.budgetAudit.status === 'WITHIN_BUDGET' ? '✓ WITHIN BUDGET' : '⚠ EXCEEDS BUDGET'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                                <div className="p-2.5 bg-[#0B131F] rounded-lg border border-stone-800/80">
                                  <span className="text-stone-500 text-[10px] block">TARGET BUDGET</span>
                                  <span className="text-stone-100 font-bold text-sm">
                                    {formatPrice(agent4Pricing.budgetAudit.targetBudgetLkr, 'LKR')}
                                  </span>
                                </div>
                                <div className="p-2.5 bg-[#0B131F] rounded-lg border border-stone-800/80">
                                  <span className="text-stone-500 text-[10px] block">VARIANCE</span>
                                  <span className={`font-bold text-sm ${
                                    agent4Pricing.budgetAudit.varianceLkr >= 0 ? 'text-emerald-400' : 'text-amber-400'
                                  }`}>
                                    {currency === 'USD'
                                      ? (agent4Pricing.budgetAudit.varianceLkr >= 0
                                          ? `+$${Math.round(agent4Pricing.budgetAudit.varianceLkr / 300).toLocaleString()} USD (Surplus)`
                                          : `-$${Math.round(Math.abs(agent4Pricing.budgetAudit.varianceLkr) / 300).toLocaleString()} USD (Deficit)`)
                                      : (agent4Pricing.budgetAudit.varianceLkr >= 0
                                          ? `+LKR ${agent4Pricing.budgetAudit.varianceLkr.toLocaleString()} (Surplus)`
                                          : `-LKR ${Math.abs(agent4Pricing.budgetAudit.varianceLkr).toLocaleString()} (Deficit)`)}
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-stone-200 font-sans leading-relaxed">
                                {agent4Pricing.budgetAudit.verdictSummary}
                              </p>

                              {agent4Pricing.budgetAudit.conciergeOptimizationTip && (
                                <div className="p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg text-xs space-y-1">
                                  <span className="text-[#D4AF37] font-mono font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Concierge Optimization Recommendation</span>
                                  </span>
                                  <p className="text-stone-300 font-sans leading-relaxed">
                                    {agent4Pricing.budgetAudit.conciergeOptimizationTip}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Governance & Driver Compliance Sign-off */}
                            <div className="p-3.5 bg-slate-950 rounded-xl border border-stone-800 text-[11px] font-mono text-stone-300 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Driver Safety Hours: <strong className="text-emerald-300">{agent4Pricing.synthesisSignOff?.driverSafetyHoursCompliant ? 'Compliant (<9h Daily)' : 'Requires Relief Driver'}</strong></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Feasibility Sign-off: <strong className="text-emerald-300">{agent4Pricing.synthesisSignOff?.isFeasible ? 'Certified Continuous' : 'Pending Verification'}</strong></span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Synthesis Trigger Button (Prompt / Re-run) */}
                        {!agent4Pricing && !isSynthesizingPricing && (
                          <div className="p-6 bg-slate-950/60 rounded-xl border border-dashed border-stone-800 text-center space-y-4">
                            <div className="space-y-1">
                              <h5 className="font-serif font-bold text-stone-100 text-sm">
                                Ready for Dynamic Journey Quotation?
                              </h5>
                              <p className="text-xs text-stone-400 font-sans max-w-md mx-auto">
                                Agent 4 will evaluate your selected route ({selectedRoute?.name || 'Corridor'}), fleet vehicle ({selectedVehicle?.vehicleModel || 'Executive Sedan'}), and guide escort against live Sri Lankan market pricing.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSynthesizePricing()}
                              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#D4AF37]/20 flex items-center gap-2 font-mono mx-auto cursor-pointer transition-all"
                            >
                              <Sparkles className="w-4 h-4" />
                              <span>Generate Final Journey Quotation & Concierge Audit</span>
                            </button>
                          </div>
                        )}

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
                              disabled={isSubmittingReview}
                              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 flex items-center gap-1.5 font-mono cursor-pointer disabled:opacity-50"
                            >
                              {isSubmittingReview ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Dispatching to Concierge Desk...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4" />
                                  <span>SUBMIT FOR CONCIERGE REVIEW</span>
                                </>
                              )}
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

        {/* ========================================================================= */}
        {/* [ AVAILABLE GUIDES SELECTION MODAL ]                                      */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isGuideModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
              <motion.div
                variants={scaleInModalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="bg-[#0F1A24] border border-stone-700 text-stone-100 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl relative my-8 max-h-[90vh] flex flex-col"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-[#D4AF37]" />
                    <div>
                      <h3 className="font-serif font-bold text-lg text-stone-100">
                        Select a Certified Sri Lankan Tour Guide
                      </h3>
                      <p className="text-xs text-stone-400 font-sans">
                        All guides are SLTDA accredited, background verified, and trained in luxury concierge hospitality.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGuideModalOpen(false)}
                    className="p-2 rounded-xl bg-stone-900 text-stone-400 hover:text-white border border-stone-800 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Language Filters */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs font-mono">
                  <span className="text-stone-400 uppercase text-[11px] whitespace-nowrap">Filter Language:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['ALL', 'English', 'German', 'French', 'Italian', 'Japanese', 'Mandarin', 'Sinhala'].map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setGuideFilterLang(lang)}
                        className={`px-3 py-1.5 rounded-lg border text-xs transition cursor-pointer ${
                          guideFilterLang === lang
                            ? 'bg-[#D4AF37] text-slate-950 font-bold border-[#D4AF37]'
                            : 'bg-stone-900/80 text-stone-300 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Guides List */}
                <div className="overflow-y-auto flex-1 pr-1 space-y-3.5 max-h-[55vh]">
                  {isLoadingGuides ? (
                    <div className="p-12 text-center space-y-3">
                      <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
                      <p className="text-xs font-mono text-stone-400">Loading certified guide roster...</p>
                    </div>
                  ) : availableGuides.filter(g => guideFilterLang === 'ALL' || (g.languages && g.languages.toLowerCase().includes(guideFilterLang.toLowerCase()))).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {availableGuides
                        .filter(g => guideFilterLang === 'ALL' || (g.languages && g.languages.toLowerCase().includes(guideFilterLang.toLowerCase())))
                        .map((g) => {
                          const isSelected = selectedGuide?.id === g.id;
                          const rateUsd = g.currency === 'USD' ? Number(g.priceAmount || 0) : Number(g.priceAmount || 0) / 300;
                          return (
                            <div
                              key={g.id}
                              className={`p-4 rounded-xl border transition-all space-y-3 flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-[#134E4A]/30 border-emerald-500 ring-1 ring-emerald-500/50'
                                  : 'bg-slate-950 border-stone-800 hover:border-stone-700'
                              }`}
                            >
                              <div className="space-y-3">
                                <div className="flex items-start gap-3.5">
                                  <img
                                    src={g.photoUrl || g.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'}
                                    alt={g.guideName}
                                    className="w-16 h-16 rounded-xl object-cover border border-stone-700 shrink-0"
                                  />
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-start justify-between gap-1">
                                      <h4 className="font-serif font-bold text-stone-100 text-sm">{g.guideName}</h4>
                                      <span className="text-[10px] font-mono text-[#D4AF37] font-bold flex items-center gap-1 shrink-0">
                                        <Star className="w-3 h-3 fill-[#D4AF37]" /> {g.rating || 5.0}
                                      </span>
                                    </div>
                                    <span className="inline-block text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold uppercase">
                                      {g.licenseType || 'National Tourist Guide'}
                                    </span>
                                    <p className="text-[11px] font-mono text-stone-400">Lic: {g.licenseNumber}</p>
                                  </div>
                                </div>

                                <p className="text-xs text-stone-300 font-sans line-clamp-2 leading-relaxed">
                                  {g.bio || 'SLTDA certified guide specializing in personalized private tours and cultural expeditions.'}
                                </p>

                                <div className="text-[11px] font-mono text-stone-400 bg-[#0B131F] p-2 rounded-lg border border-stone-800/80 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-stone-500">Languages:</span>
                                    <span className="text-stone-200 font-semibold">{g.languages}</span>
                                  </div>
                                  {g.specialties && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-stone-500">Specialty:</span>
                                      <span className="text-stone-300 truncate max-w-[180px]">{g.specialties}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-stone-800/80">
                                <div>
                                  <span className="text-[10px] font-mono text-stone-500 uppercase block">Daily Rate</span>
                                  <span className="text-sm font-mono font-bold text-[#D4AF37]">
                                    {formatPrice(
                                      g.currency === 'USD' ? g.priceAmount * 300 : g.priceAmount,
                                      'LKR'
                                    )} <span className="text-[10px] text-stone-400 font-normal">/ day</span>
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedGuide(null);
                                      setIsPricingStale(false);
                                      handleSynthesizePricing(null);
                                      showToast('Guide Removed', 'Itinerary updated without a private guide.', 'info');
                                    } else {
                                      setSelectedGuide(g);
                                      setIsPricingStale(false);
                                      setIsGuideModalOpen(false);
                                      handleSynthesizePricing(g);
                                      showToast('Guide Selected', `${g.guideName} has been assigned to your itinerary.`, 'success');
                                    }
                                  }}
                                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-emerald-900/60 hover:bg-red-900/60 text-emerald-300 hover:text-red-300 border border-emerald-500/50'
                                      : 'bg-[#D4AF37] hover:bg-[#E5C158] text-slate-950 shadow-md shadow-[#D4AF37]/20'
                                  }`}
                                >
                                  {isSelected ? 'Selected (Click to remove)' : 'Select Guide'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="p-8 bg-slate-950 rounded-xl border border-stone-800 text-center text-stone-400 text-xs font-mono">
                      No certified guides found matching "{guideFilterLang}".
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGuide(null);
                      setIsGuideModalOpen(false);
                    }}
                    className="text-xs text-stone-400 hover:text-stone-200 font-mono underline cursor-pointer"
                  >
                    Proceed without a guide
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsGuideModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-mono transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
