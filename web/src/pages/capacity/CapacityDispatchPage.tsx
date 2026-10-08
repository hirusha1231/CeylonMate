import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Compass, Car, Clock, MapPin, Sparkles, Loader2,
  CheckCircle2, ArrowRight, ShieldCheck, Gauge, Layers
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router';
import { useCurrency } from '../../context/CurrencyContext';
import { api } from '../../api/client';
import { fadeInVariants, hoverLiftProps } from '../../utils/animations';

interface RouteOption {
  id: string;
  name: string;
  via: string;
  distanceKm: number;
  estimatedDuration: string;
  terrainType: string;
  elevationMultiplier: string;
  isFastest?: boolean;
  keyHighlightsOrStops?: string[];
}

interface DispatchedVehicle {
  vehicleType: string;
  model: string;
  maxPax: number;
  luggageCapacity: number;
  terrainSuitabilityNote: string;
  estimatedDailyRateLkr?: number;
}

interface Agent3Response {
  origin: string;
  destination: string;
  routes: RouteOption[];
  dispatchedFleet: DispatchedVehicle[];
}

export const CapacityDispatchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  const incomingOrigin = searchParams.get('origin') || searchParams.get('pickup') || searchParams.get('from') || 'Colombo Airport';
  const incomingDest = searchParams.get('destination') || searchParams.get('dest') || searchParams.get('to') || searchParams.get('route') || 'Mirissa';
  const incomingPax = searchParams.get('pax') ? Number(searchParams.get('pax')) : 2;

  const incomingStartDate = searchParams.get('startDate') || searchParams.get('date') || searchParams.get('start') || '';
  const incomingDuration = (searchParams.get('duration') || searchParams.get('durationDays') || searchParams.get('days'))
    ? Number(searchParams.get('duration') || searchParams.get('durationDays') || searchParams.get('days'))
    : 1;

  // Clean 2-input state + pax
  const [currentLocation, setCurrentLocation] = useState<string>(incomingOrigin);
  const [targetDestination, setTargetDestination] = useState<string>(
    incomingDest.includes('->') ? incomingDest.split('->').pop()?.trim() || 'Mirissa' : incomingDest
  );
  const [paxCount, setPaxCount] = useState<number>(incomingPax);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<Agent3Response | null>(null);

  const dispatchAgent3 = async (originOverride?: string, destOverride?: string, paxOverride?: number) => {
    const o = (originOverride !== undefined ? originOverride : currentLocation).trim();
    const d = (destOverride !== undefined ? destOverride : targetDestination).trim();
    const p = paxOverride !== undefined ? paxOverride : paxCount;

    if (!o || !d) return;

    setLoading(true);
    try {
      let resData: Agent3Response | null = null;
      try {
        const response = await api.post('/api/trips/agent3-route-logistics', {
          origin: o,
          destination: d,
          passengers: p,
          startDate: incomingStartDate || undefined,
          durationDays: incomingDuration || undefined
        });
        resData = response.data;
      } catch (proxyErr) {
        console.warn('Backend proxy failed, trying direct AI microservice:', proxyErr);
        const directRes = await fetch('http://localhost:8000/agent/feasibility/route-logistics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: o,
            destination: d,
            passengers: p,
            startDate: incomingStartDate || undefined,
            durationDays: incomingDuration || undefined
          })
        });
        if (directRes.ok) {
          resData = await directRes.json();
        }
      }

      if (resData && ((resData.routes && resData.routes.length > 0) || (resData.dispatchedFleet && resData.dispatchedFleet.length > 0))) {
        setResult(resData);
      } else {
        setResult(null);
      }
    } catch (err: any) {
      console.error('[AGENT 3 ERROR]', err);
      setResult(null);
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

          {/* Header */}
          <div className="p-6 sm:p-8 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] border border-emerald-900/40 rounded-3xl shadow-2xl space-y-3 relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-xs text-[#D4AF37] font-bold uppercase tracking-wider">
                <Gauge className="w-4 h-4 text-[#D4AF37]" />
                <span> • Route Logistics & Fleet Dispatch Cockpit</span>
              </div>

            </div>

            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-100 tracking-tight">
              Route Logistics & VIP Fleet Dispatch
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-3xl leading-relaxed">
              Dynamically analyzes terrain physics, road telemetry, expressway transit corridors, elevation grade multipliers, and dispatches luxury fleet options for Sri Lanka journeys.
            </p>
          </div>

          {/* Clean 2-Input Dispatch Panel */}
          <div className="p-6 sm:p-7 bg-slate-900/95 border border-stone-800 rounded-3xl shadow-xl space-y-5 font-mono text-xs">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

              {/* Input 1: Current Location / Pickup */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[11px] uppercase font-bold text-stone-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Current Location / Pickup</span>
                </label>
                <input
                  type="text"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  placeholder="e.g. Colombo Airport"
                  className="w-full bg-[#0B132B] border border-stone-700 focus:border-[#C5A880] rounded-xl px-4 py-3 text-stone-100 placeholder-stone-500 outline-none text-xs transition"
                />
              </div>

              {/* Input 2: Destination */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[11px] uppercase font-bold text-stone-300 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Destination</span>
                </label>
                <input
                  type="text"
                  value={targetDestination}
                  onChange={(e) => setTargetDestination(e.target.value)}
                  placeholder="e.g. Mirissa or Ella"
                  className="w-full bg-[#0B132B] border border-stone-700 focus:border-[#C5A880] rounded-xl px-4 py-3 text-stone-100 placeholder-stone-500 outline-none text-xs transition"
                />
              </div>

              {/* Pax Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase font-bold text-stone-300 flex items-center gap-1.5">
                  <span>Passengers</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={paxCount}
                  onChange={(e) => setPaxCount(Number(e.target.value))}
                  className="w-full bg-[#0B132B] border border-stone-700 focus:border-[#C5A880] rounded-xl px-4 py-3 text-stone-100 outline-none text-xs transition"
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-end pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => dispatchAgent3(currentLocation, targetDestination, paxCount)}
                disabled={loading || !currentLocation.trim() || !targetDestination.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Route Physics...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Calculate Route & Dispatch Fleet</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Dynamic Results Panel */}
          {loading ? (
            <div className="p-12 bg-slate-900/90 border border-dashed border-stone-800 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-mono font-bold text-[#C5A880] animate-pulse">
                  Agent 3 analyzing route physics & fleet telemetry...
                </p>
                <p className="text-xs font-mono text-stone-400">
                  Computing terrain gradients, road kilometers, and chassis dynamics for {currentLocation} ➔ {targetDestination}
                </p>
              </div>
            </div>
          ) : result && ((result.routes && result.routes.length > 0) || (result.dispatchedFleet && result.dispatchedFleet.length > 0)) ? (
            <div className="space-y-8">

              {/* Dynamic Route Options */}
              <div className="p-6 sm:p-7 bg-slate-900/95 border border-stone-800 rounded-3xl shadow-xl space-y-5">
                <div className="flex flex-wrap items-center justify-between border-b border-stone-800 pb-4 gap-2">
                  <div className="flex items-center gap-2">
                    <Compass className="w-5 h-5 text-[#D4AF37]" />
                    <h3 className="text-base font-serif font-bold text-stone-100">
                      Dynamic Route Options ({result.routes?.length || 0})
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-stone-400">
                    {result.origin} ➔ {result.destination}
                  </span>
                </div>

                {result.routes && result.routes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.routes.map((route, idx) => (
                      <div
                        key={route.id || idx}
                        className={`p-5 rounded-2xl border transition-all space-y-3.5 ${route.isFastest
                          ? 'bg-slate-950 border-[#C5A880]/60 ring-1 ring-[#C5A880]/30 shadow-lg'
                          : 'bg-slate-950 border-stone-800'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-serif font-bold text-stone-100 text-sm sm:text-base">
                                {route.name}
                              </h4>
                              {route.isFastest && (
                                <span className="text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-bold uppercase">
                                  Fastest
                                </span>
                              )}
                            </div>
                            {route.via && (
                              <p className="text-[11px] font-mono text-stone-400 mt-1">
                                Via: {route.via}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Telemetry Metrics */}
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-stone-800/80 text-xs font-mono">
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-stone-500 uppercase block">Distance</span>
                            <p className="text-[#D4AF37] font-bold text-sm">{route.distanceKm} km</p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-stone-500 uppercase block">Duration</span>
                            <p className="text-stone-200 font-bold text-sm">{route.estimatedDuration}</p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[9px] text-stone-500 uppercase block">Elevation Mult.</span>
                            <p className="text-emerald-400 font-bold text-sm">{route.elevationMultiplier}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono bg-[#0B132B] px-3 py-2 rounded-xl border border-stone-800/60">
                          <span className="text-stone-400">Terrain Physics:</span>
                          <span className="text-stone-200 font-medium">{route.terrainType}</span>
                        </div>

                        {route.keyHighlightsOrStops && route.keyHighlightsOrStops.length > 0 && (
                          <div className="text-[11px] font-mono space-y-1.5">
                            <span className="text-stone-500 uppercase text-[10px] block font-bold">Recommended En-Route Stops:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {route.keyHighlightsOrStops.map((stop, sIdx) => (
                                <span key={sIdx} className="bg-stone-900 text-stone-300 px-2.5 py-0.5 rounded-lg border border-stone-800 text-[10px]">
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
                  <p className="text-stone-400 text-xs font-mono py-4 text-center">
                    No dynamic routes generated.
                  </p>
                )}
              </div>

              {/* Dynamic Dispatched Fleet */}
              <div className="p-6 sm:p-7 bg-slate-900/95 border border-stone-800 rounded-3xl shadow-xl space-y-5">
                <div className="flex flex-wrap items-center justify-between border-b border-stone-800 pb-4 gap-2">
                  <div className="flex items-center gap-2">
                    <Car className="w-5 h-5 text-[#D4AF37]" />
                    <h3 className="text-base font-serif font-bold text-stone-100">
                      Dispatched Fleet Telemetry ({result.dispatchedFleet?.length || 0} Vehicles)
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-stone-400">
                    Tuned for Route Gradient & Terrain Physics
                  </span>
                </div>

                {result.dispatchedFleet && result.dispatchedFleet.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.dispatchedFleet.map((vehicle, vIdx) => (
                      <div
                        key={vIdx}
                        className="p-5 rounded-2xl bg-slate-950 border border-stone-800 hover:border-stone-700 transition-all space-y-3.5"
                      >
                        <div>
                          <span className="text-[9px] font-mono bg-[#0B132B] text-[#C5A880] border border-[#C5A880]/30 px-2.5 py-0.5 rounded-md font-bold uppercase">
                            {vehicle.vehicleType}
                          </span>
                          <h4 className="font-serif font-bold text-stone-100 text-base mt-2">
                            {vehicle.model}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono text-stone-300 py-2 border-y border-stone-800/80">
                          <span className="font-bold text-stone-200">{vehicle.maxPax} Pax Max</span>
                          <span className="text-stone-400">{vehicle.luggageCapacity} Luggage Bags</span>
                          {vehicle.estimatedDailyRateLkr ? (
                            <span className="text-[#D4AF37] font-bold">
                              {formatPrice(vehicle.estimatedDailyRateLkr, 'LKR')} / day
                            </span>
                          ) : null}
                        </div>

                        <div className="p-3 bg-[#0B132B] rounded-xl border border-stone-800/80 text-[11px] font-mono space-y-1">
                          <span className="text-[9px] text-[#C5A880] uppercase tracking-wider block font-bold">
                            Terrain Suitability:
                          </span>
                          <p className="text-stone-300 leading-relaxed">
                            {vehicle.terrainSuitabilityNote}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-400 text-xs font-mono py-4 text-center">
                    No fleet dispatched yet.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 bg-slate-900/60 border border-dashed border-stone-800 rounded-3xl flex flex-col items-center justify-center text-center space-y-3">
              <Car className="w-10 h-10 text-stone-600" />
              <p className="text-sm font-mono text-stone-400">
                Enter pickup location and destination to dispatch real-time route physics and fleet telemetry.
              </p>

            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
};
