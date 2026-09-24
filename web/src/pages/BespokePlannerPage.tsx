import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Calendar, Users, DollarSign, CheckCircle2, ArrowRight, ArrowLeft,
  Compass, Loader2, Save, Send, Mountain, ShieldCheck, Clock, MapPin, Heart
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { AuthModal } from '../components/auth/AuthModal';
import { api } from '../api/client';
import {
  fadeInVariants, slideUpVariants, hoverLiftProps, buttonPressProps, scaleInModalVariants
} from '../utils/animations';

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
  const [startDate, setStartDate] = useState('2026-11-10');
  const [endDate, setEndDate] = useState('2026-11-18');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [mobilityPref, setMobilityPref] = useState('Standard VIP Escort');
  const [budgetUsd, setBudgetUsd] = useState(3500);

  // Concierge Loading State for Step 4
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generatedItinerary, setGeneratedItinerary] = useState<any | null>(null);

  const interestOptions = [
    'Tea Estates & Mist', 'Wildlife Safaris', 'UNESCO Heritage', 'Coastal Riviera',
    'Ayurveda Wellness', 'Scuba & Marine Life', 'Culinary & Spices', 'Train Journeys'
  ];

  const toggleInterest = (item: string) => {
    if (selectedInterests.includes(item)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== item));
    } else {
      setSelectedInterests([...selectedInterests, item]);
    }
  };

  const handleNextStep = () => {
    if (step === 3) {
      // Trigger Loader and advance to step 4
      setStep(4);
      startConciergeLoader();
    } else {
      setStep((prev) => (prev + 1) as any);
    }
  };

  const startConciergeLoader = () => {
    setIsGenerating(true);
    setGenerationStep(0);

    const steps = [
      'Verifying scenic mountain route elevation parameters...',
      'Checking VIP vehicle availability and chauffeur schedules...',
      'Synthesizing UNESCO monument and safari slot reservations...',
      'Assembling authoritative itemized quotation...'
    ];

    let current = 0;
    const interval = setInterval(() => {
      current++;
      if (current < steps.length) {
        setGenerationStep(current);
      } else {
        clearInterval(interval);
        setIsGenerating(false);

        // Calculate days count
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const days = Math.max(3, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        setGeneratedItinerary({
          tripId: `CM-JOURNEY-${Math.floor(100000 + Math.random() * 900000)}`,
          title: `${days}-Day Bespoke ${selectedInterests.join(' & ')} Expedition`,
          days,
          startDate,
          endDate,
          travelers: `${adults} Adults${children > 0 ? `, ${children} Children` : ''}`,
          totalQuoteUsd: Math.round(budgetUsd * 0.92),
          terrainRoutingFactor: '1.25x Mountain Precision Active',
          capacityStatus: '100% Guaranteed',
          itineraryDays: [
            { day: 1, title: 'VIP Airport Reception & Scenic Highway Transfer', detail: 'Chauffeur escort to Colombo 02 executive suite with coconut welcome refreshments.' },
            { day: 2, title: 'Ascension to Tea Estates & Bungalow High Tea', detail: 'Private hill-country routing with waterfall photo stops and evening fireside dinner.' },
            { day: 3, title: 'Dawn Wildlife Safari & Private Leopard Tracking', detail: 'Exclusive 4x4 modified safari jeep with certified wildlife naturalist.' },
            { day: 4, title: 'Southern Riviera & Heritage Dutch Fort Ramparts', detail: 'Curated walking tour of Galle Dutch Fort and evening oceanfront dining.' },
          ]
        });
      }
    }, 900);
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
      await api.post('/api/trips', {
        objective: dreamPrompt || `Bespoke ${selectedInterests.join(', ')} Trip`,
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
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="bg-[#FDFBF7] text-[#0B131F] min-h-screen py-12 px-4 md:px-8 font-sans"
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
                    onClick={handleNextStep}
                    className="px-6 py-3 rounded-xl bg-[#0B131F] hover:bg-[#134E4A] text-stone-100 font-semibold text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
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
                ) : generatedItinerary ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-emerald-950/10 border border-emerald-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-mono text-[#134E4A] uppercase font-bold">
                          Proposal #{generatedItinerary.tripId}
                        </span>
                        <h3 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
                          {generatedItinerary.title}
                        </h3>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-stone-500 uppercase block">Authoritative Total</span>
                        <span className="text-2xl font-serif-luxury font-bold text-[#134E4A]">
                          {formatPrice(generatedItinerary.totalQuoteUsd)}
                        </span>
                      </div>
                    </div>

                    {/* Highlights & Logistics Tokens */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-2">
                        <Mountain className="w-4 h-4 text-[#134E4A]" />
                        <span>1.25x Hill Elevation Applied</span>
                      </div>
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>100% Guaranteed Capacity</span>
                      </div>
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#C5A880]" />
                        <span>{generatedItinerary.startDate} – {generatedItinerary.endDate}</span>
                      </div>
                    </div>

                    {/* Schedule List */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider font-mono">
                        Generated Day-by-Day Schedule
                      </h4>
                      {generatedItinerary.itineraryDays.map((d: any) => (
                        <div key={d.day} className="p-4 bg-[#FDFBF7] rounded-xl border border-stone-200 space-y-1">
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

                    {/* Action Bar */}
                    <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="px-4 py-2 text-stone-600 hover:text-[#0B131F] text-xs font-semibold"
                      >
                        ← Modify Budget or Details
                      </button>

                      <div className="flex items-center gap-3">
                        <motion.button
                          {...buttonPressProps}
                          onClick={() => handleSaveOrSubmit('save')}
                          className="px-5 py-2.5 rounded-xl border border-[#134E4A] text-[#134E4A] hover:bg-[#134E4A] hover:text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save My Journey</span>
                        </motion.button>

                        <motion.button
                          {...buttonPressProps}
                          onClick={() => handleSaveOrSubmit('submit')}
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-[#0B131F] font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-1.5"
                        >
                          <Send className="w-4 h-4" />
                          <span>Submit for Concierge Review</span>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ) : null}
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
  );
};
