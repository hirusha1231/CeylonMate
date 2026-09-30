import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, AlertTriangle, ShieldCheck, FileCode, Play, RefreshCw, Compass, CheckCircle2, XCircle, ChevronRight
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router';
import { api } from '../../api/client';
import { fadeInVariants, hoverLiftProps, buttonPressProps } from '../../utils/animations';
import { PipelineStepperHeader } from '../../components/common/PipelineStepperHeader';

export const DestinationsSafetyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const incomingTheme = searchParams.get('theme');
  const incomingRoute = searchParams.get('route');
  const incomingPax = searchParams.get('pax');
  const incomingBudget = searchParams.get('budget');

  const [selectedThemes, setSelectedThemes] = useState<string[]>(
    incomingTheme ? incomingTheme.split(',').map((t) => t.trim()).filter(Boolean) : ['Tea Estates', 'Heritage', 'Coastal Riviera']
  );
  const [hazardSimActive, setHazardSimActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  const toggleTheme = (theme: string) => {
    setSelectedThemes((prev) =>
      prev.includes(theme) ? prev.filter((t) => t !== theme) : [...prev, theme]
    );
  };

  const dispatchAgent2 = async (overrideHazard?: boolean) => {
    const isSimActive = overrideHazard !== undefined ? overrideHazard : hazardSimActive;
    setLoading(true);
    try {
      const response = await api.post('/api/trips/evaluate-destinations', {
        tripRequestId: `CM-GEOSPATIAL-${Date.now()}`,
        regionsOrThemes: selectedThemes.length > 0 ? selectedThemes : ['Tea Estates', 'Heritage'],
        interests: selectedThemes.length > 0 ? selectedThemes : ['Tea Estates', 'Heritage'],
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        accessibilityConstraints: isSimActive
          ? ['RESTRICT_HEAVY_MONSOON_FLOODING', 'HAZARD_LOCAL_GUIDE_ROADBLOCK']
          : []
      });
      setResult(response.data);
    } catch (err: any) {
      setResult({ error: err?.message || 'Agent 2 Execution Failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatchAgent2();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B132B]">
      <PipelineStepperHeader currentStep={2} />
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
          <div className="flex items-center gap-2 font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>Agent 02 • Geospatial & Safety Hub</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px]">
              Python AI Microservice (Port 8000)
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif-luxury font-bold text-slate-100">
            Geospatial Suitability & Active Field Advisory Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Evaluates attraction suitability based on extracted travel themes, active weather advisories, and real-time hazard reports logged by certified Local Guides.
          </p>
        </div>

        {/* Controls Panel */}
        <div className="p-6 bg-slate-900/90 border border-emerald-900/40 rounded-3xl space-y-6 shadow-xl backdrop-blur-md">
          <div className="space-y-3">
            <label className="block text-xs font-mono text-slate-300 uppercase font-semibold">
              Select Regional Themes & Attractions Focus:
            </label>
            <div className="flex flex-wrap gap-2">
              {['Tea Estates', 'Heritage', 'Coastal Riviera', 'Wildlife Safaris', 'Ayurveda Wellness', 'Scuba & Marine'].map((chip) => {
                const active = selectedThemes.includes(chip);
                return (
                  <button
                    key={chip}
                    onClick={() => toggleTheme(chip)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                      active
                        ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-200 font-bold shadow'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {chip} {active && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Hazard Simulator Toggle */}
          <div className="p-4 bg-[#0B132B] rounded-2xl border border-amber-500/40 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-mono font-bold text-amber-200 block uppercase">
                  Simulate Field Hazard & Roadblock Advisories
                </span>
                <span className="text-[11px] text-slate-400 block font-sans">
                  Enforces safety advisory filtering for heavy monsoon flooding and Local Guide hazard reports.
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                const next = !hazardSimActive;
                setHazardSimActive(next);
                dispatchAgent2(next);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                hazardSimActive
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {hazardSimActive ? '⚠️ FIELD HAZARDS ACTIVE' : 'CLEAR WEATHER TRANSIT'}
            </button>
          </div>

          {/* Action Button & Telemetry Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileCode className="w-4 h-4 text-[#D4AF37]" />
              <span>{showRawJson ? 'Formatted Enterprise View' : '📋 Live Telemetry (JSON)'}</span>
            </button>

            <button
              onClick={() => dispatchAgent2()}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>⚡ EXECUTE GEOSPATIAL SUITABILITY AGENT</span>
            </button>
          </div>
        </div>

        {/* Live Output Section */}
        {result && (
          showRawJson ? (
            <pre className="p-5 bg-slate-950 border border-cyan-500/40 rounded-3xl text-cyan-300 font-mono text-xs overflow-x-auto max-h-96 shadow-2xl">
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : (
            <div className="space-y-6">
              {/* Approved Destinations */}
              <div className="p-6 bg-slate-900/90 border border-emerald-900/40 rounded-3xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base font-serif-luxury font-bold text-slate-100">
                      Approved Candidate Destinations ({result.selectedCandidates?.length || 0})
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                    Safety Cleared
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.selectedCandidates?.map((c: any, idx: number) => (
                    <div key={idx} className="p-4 bg-[#0B132B] border border-slate-800 hover:border-cyan-500/40 rounded-2xl space-y-2 transition-all shadow-md">
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif-luxury font-bold text-sm text-slate-100">{c.destinationName}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
                          Score: {c.suitabilityScore}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 space-y-0.5">
                        <p>Region: <span className="text-slate-200">{c.region}</span></p>
                        <p>Category: <span className="text-slate-200">{c.category}</span></p>
                        {c.weatherSummary && <p className="text-emerald-400">🌤️ {c.weatherSummary}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Restricted / Rejected Destinations */}
              {result.rejectedCandidates && result.rejectedCandidates.length > 0 && (
                <div className="p-6 bg-rose-950/40 border border-rose-500/40 rounded-3xl space-y-4 shadow-xl">
                  <div className="flex items-center gap-2 border-b border-rose-900/50 pb-3">
                    <XCircle className="w-5 h-5 text-rose-400" />
                    <h3 className="text-base font-serif-luxury font-bold text-rose-200">
                      Restricted / Filtered Destinations ({result.rejectedCandidates.length})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {result.rejectedCandidates.map((r: any, idx: number) => (
                      <div key={idx} className="p-3 bg-[#0B132B] border border-rose-900/60 rounded-xl flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-rose-200">{r.destinationName} ({r.region})</span>
                        <span className="text-rose-400 italic text-[11px]">{r.rejectionReason || 'Restricted by active field advisory'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* PROMINENT HANDOFF TO STAGE 03 */}
        {result && (
          <div className="p-6 bg-slate-900/90 border border-emerald-900/50 rounded-3xl shadow-xl">
            <button
              onClick={() => {
                const activeRoute = incomingRoute || 'Colombo -> Kandy -> Nuwara Eliya -> Yala';
                const activePax = incomingPax || 2;
                const activeBudget = incomingBudget || 3500;
                navigate(`/operations/capacity-dispatch?route=${encodeURIComponent(activeRoute)}&pax=${activePax}&budget=${activeBudget}&theme=${encodeURIComponent(selectedThemes.join(','))}`);
              }}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs sm:text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-emerald-400/40"
            >
              <span>⚡ HANDOFF TO STAGE 03: CAPACITY & FLEET DISPATCH ➔</span>
            </button>
          </div>
        )}

      </div>
    </motion.div>
    </div>
  );
};
