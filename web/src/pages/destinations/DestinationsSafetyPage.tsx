import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, AlertTriangle, ShieldCheck, Play, RefreshCw, Compass, CheckCircle2,
  XCircle, ChevronRight, CloudSun, Sun, CloudRain, Thermometer, Droplets, Loader2, Sparkles, ShieldAlert
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router';
import { api } from '../../api/client';
import { fadeInVariants, hoverLiftProps, buttonPressProps } from '../../utils/animations';

interface WeatherDay {
  date?: string;
  condition: string;
  tempMax: string;
  tempMin: string;
  rainMm: string;
}

interface Agent2Response {
  destination: string;
  weatherTimeline: {
    yesterday: WeatherDay;
    today: WeatherDay;
    tomorrow: WeatherDay;
  };
  suitability: {
    status: 'SUITABLE' | 'CAUTION' | 'NOT_RECOMMENDED';
    suitabilityStatus?: 'SUITABLE' | 'CAUTION' | 'NOT_RECOMMENDED';
    score: number;
    suitabilityScore?: number;
    verdict: string;
    reasoning: string;
    safetyTips: string[];
  };
}

export const DestinationsSafetyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const incomingDest = searchParams.get('destination') || searchParams.get('dest') || searchParams.get('route') || searchParams.get('location') || '';
  const incomingPax = searchParams.get('pax');
  const incomingBudget = searchParams.get('budget');

  const [targetDestination, setTargetDestination] = useState<string>(incomingDest || 'Mirissa');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<Agent2Response | null>(null);

  useEffect(() => {
    if (incomingDest && !targetDestination) {
      setTargetDestination(incomingDest);
    }
  }, [incomingDest]);

  const handleInspectSuitability = async (customDest?: string) => {
    const destToInspect = (customDest || targetDestination || 'Mirissa').trim();
    if (!destToInspect) return;

    setLoading(true);
    try {
      let data: Agent2Response | null = null;
      try {
        const response = await api.post('/api/trips/agent2-destination-suitability-inspect', {
          destination: destToInspect
        });
        data = response.data;
      } catch (proxyErr) {
        console.warn('Backend proxy failed, attempting direct AI service call:', proxyErr);
        const directRes = await fetch('http://localhost:8000/agent/destination-suitability/inspect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination: destToInspect })
        });
        if (directRes.ok) {
          data = await directRes.json();
        }
      }

      if (data && data.weatherTimeline && data.suitability) {
        setResult(data);
      }
    } catch (err: any) {
      console.error('Agent 2 Inspection Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B132B]">
      <motion.div
        variants={fadeInVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="text-slate-100 py-10 px-4 md:px-8 font-sans selection:bg-[#C5A880] selection:text-[#0B132B]"
      >
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="p-6 sm:p-8 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] border border-emerald-900/40 rounded-3xl shadow-2xl space-y-3 relative overflow-hidden">
            <div className="flex items-center gap-2 font-mono text-xs text-emerald-400 font-bold uppercase tracking-wider">
              <CloudSun className="w-4 h-4 text-emerald-400" />

            </div>

            <h1 className="text-3xl sm:text-4xl font-serif-luxury font-bold text-slate-100">
              Destination Weather & Safety Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Analyzes real meteorological telemetry for Yesterday (historical wetness), Today (active radar), and Tomorrow (microclimate forecast) with Gemini AI terrain and viability assessment.
            </p>
          </div>

          {/* Clean Destination Input Controls Panel */}
          <div className="p-6 bg-slate-900/90 border border-emerald-900/40 rounded-3xl space-y-5 shadow-xl backdrop-blur-md">
            <div className="space-y-2">
              <label className="block text-xs font-mono text-stone-300 uppercase font-semibold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Enter Destination to Inspect Safety & Weather:</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={targetDestination}
                  onChange={(e) => setTargetDestination(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInspectSuitability();
                  }}
                  placeholder="Enter destination (e.g. Mirissa, Ella, Nuwara Eliya, Trincomalee)"
                  className="flex-1 bg-[#0B132B] border border-slate-700 focus:border-emerald-400 rounded-2xl px-4 py-3.5 text-sm text-slate-100 placeholder-slate-500 font-mono outline-none transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => handleInspectSuitability()}
                  disabled={loading || !targetDestination.trim()}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing Telemetry...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Check Weather & Safety Verdict</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* DYNAMIC RENDERING / LOADING / EMPTY STATE */}
          {loading ? (
            <div className="p-12 bg-slate-900/60 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-mono text-emerald-300 font-bold animate-pulse">
                  Fetching live meteorological telemetry & evaluating terrain safety...
                </p>
                <span className="text-xs font-mono text-slate-400 block">
                  Querying Open-Meteo precipitation radar & calculating Gemini suitability score for {targetDestination}
                </span>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* 1. THREE DYNAMIC 3-DAY WEATHER CARDS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-[#D4AF37]" />
                    <span>3-Day Real Meteorological Timeline ({result.destination})</span>
                  </span>
                  <span className="text-[10px] font-mono text-stone-400">
                    Open-Meteo Verified Radar
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Yesterday Card */}
                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <span>📅 YESTERDAY</span>
                        </span>
                        {result.weatherTimeline.yesterday.date && (
                          <span className="text-[10px] font-mono text-slate-500 block">{result.weatherTimeline.yesterday.date}</span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                        Historical
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CloudSun className="w-4 h-4 text-amber-400" />
                        <h5 className="font-serif font-bold text-slate-100 text-sm">{result.weatherTimeline.yesterday.condition}</h5>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block">Temp Range</span>
                        <span className="text-slate-200 font-bold">
                          {result.weatherTimeline.yesterday.tempMin} - {result.weatherTimeline.yesterday.tempMax}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block">Rainfall</span>
                        <span className="text-[#D4AF37] font-bold">{result.weatherTimeline.yesterday.rainMm}</span>
                      </div>
                    </div>
                  </div>

                  {/* Today Card */}
                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <span>☀️ TODAY</span>
                        </span>
                        {result.weatherTimeline.today.date && (
                          <span className="text-[10px] font-mono text-emerald-500/80 block">{result.weatherTimeline.today.date}</span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                        Active Telemetry
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-emerald-400" />
                        <h5 className="font-serif font-bold text-slate-100 text-sm">{result.weatherTimeline.today.condition}</h5>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block">Temp Range</span>
                        <span className="text-emerald-300 font-bold">
                          {result.weatherTimeline.today.tempMin} - {result.weatherTimeline.today.tempMax}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block">Rainfall</span>
                        <span className="text-[#D4AF37] font-bold">{result.weatherTimeline.today.rainMm}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tomorrow Card */}
                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <span>🌤️ TOMORROW</span>
                        </span>
                        {result.weatherTimeline.tomorrow.date && (
                          <span className="text-[10px] font-mono text-slate-500 block">{result.weatherTimeline.tomorrow.date}</span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                        Micro Forecast
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CloudRain className="w-4 h-4 text-sky-400" />
                        <h5 className="font-serif font-bold text-slate-100 text-sm">{result.weatherTimeline.tomorrow.condition}</h5>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block">Temp Range</span>
                        <span className="text-slate-200 font-bold">
                          {result.weatherTimeline.tomorrow.tempMin} - {result.weatherTimeline.tomorrow.tempMax}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block">Rainfall</span>
                        <span className="text-[#D4AF37] font-bold">{result.weatherTimeline.tomorrow.rainMm}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. SUITABILITY VERDICT BANNER */}
              <div className="p-6 sm:p-8 bg-slate-900/90 rounded-3xl border border-emerald-900/40 space-y-5 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase border tracking-wider ${(result.suitability.status || result.suitability.suitabilityStatus) === 'SUITABLE'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        : (result.suitability.status || result.suitability.suitabilityStatus) === 'CAUTION'
                          ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                          : 'bg-rose-950 text-rose-300 border-rose-500/40'
                        }`}
                    >
                      {result.suitability.status || result.suitability.suitabilityStatus}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Viability & Safety Verdict
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-xs text-slate-400 uppercase">Suitability Score:</span>
                    <span className="text-xl font-bold text-[#D4AF37]">
                      {result.suitability.score ?? result.suitability.suitabilityScore}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar for Score */}
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-700 ${(result.suitability.status || result.suitability.suitabilityStatus) === 'SUITABLE'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : (result.suitability.status || result.suitability.suitabilityStatus) === 'CAUTION'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        : 'bg-gradient-to-r from-rose-500 to-red-400'
                      }`}
                    style={{ width: `${result.suitability.score ?? result.suitability.suitabilityScore ?? 90}%` }}
                  />
                </div>

                {/* Verdict */}
                <div className="space-y-1.5">
                  <span className="text-xs font-mono text-[#C5A880] uppercase tracking-wider block font-bold">
                    Meteorological Verdict:
                  </span>
                  <p className="text-sm text-slate-100 font-medium leading-relaxed bg-[#0B132B] p-4 rounded-2xl border border-slate-800">
                    {result.suitability.verdict}
                  </p>
                </div>

                {/* Reasoning */}
                <div className="space-y-1.5">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block font-bold">
                    Terrain & Safety Analysis:
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#0B132B] p-4 rounded-2xl border border-slate-800">
                    {result.suitability.reasoning}
                  </p>
                </div>

                {/* Safety Tips List */}
                {result.suitability.safetyTips && result.suitability.safetyTips.length > 0 && (
                  <div className="space-y-2.5 pt-2">
                    <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Actionable Safety Advisories:</span>
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.suitability.safetyTips.map((tip, tIdx) => (
                        <div
                          key={tIdx}
                          className="p-3.5 bg-[#0B132B] rounded-2xl border border-slate-800 flex items-start gap-2.5 text-xs text-slate-200 font-sans"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Handoff to Stage 03 Capacity & Fleet Dispatch */}
              <div className="p-6 bg-slate-900/90 border border-emerald-900/50 rounded-3xl shadow-xl">
                <button
                  onClick={() => {
                    const activeRoute = `Colombo -> ${result.destination}`;
                    const activePax = incomingPax || 2;
                    const activeBudget = incomingBudget || 3500;
                    navigate(`/operations/capacity-dispatch?route=${encodeURIComponent(activeRoute)}&pax=${activePax}&budget=${activeBudget}&destination=${encodeURIComponent(result.destination)}`);
                  }}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs sm:text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-emerald-400/40"
                >
                  <span>⚡ HANDOFF TO STAGE 03: CAPACITY & FLEET DISPATCH ➔</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 bg-slate-900/60 rounded-3xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-center space-y-3 shadow-xl">
              <CloudSun className="w-12 h-12 text-slate-600" />
              <div className="space-y-1">
                <p className="text-sm font-mono text-slate-300 font-bold">
                  Enter any destination to analyze Yesterday, Today, and Tomorrow's live weather & suitability.
                </p>

              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DestinationsSafetyPage;
