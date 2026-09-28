import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, Mountain, ShieldCheck, Calendar, Users, FileCode, Play, RefreshCw, CheckCircle2, Car, Clock, MapPin, Layers, Info
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router';
import { api } from '../../api/client';
import { fadeInVariants, hoverLiftProps, buttonPressProps } from '../../utils/animations';
import { PipelineStepperHeader } from '../../components/common/PipelineStepperHeader';

export const CapacityDispatchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const incomingRoute = searchParams.get('route');
  const incomingPax = searchParams.get('pax');
  const incomingBudget = searchParams.get('budget');

  const defaultRoute = incomingRoute || 'Colombo -> Kandy -> Nuwara Eliya -> Yala';
  const defaultPax = incomingPax ? Number(incomingPax) : 2;

  const [selectedRoute, setSelectedRoute] = useState<string>(defaultRoute);
  const [customRouteInput, setCustomRouteInput] = useState<string>(defaultRoute);
  const [paxCount, setPaxCount] = useState<number>(defaultPax);
  const [travelDate, setTravelDate] = useState<string>('2026-11-10');
  const [activeTab, setActiveTab] = useState<'matrix' | 'legs' | 'items' | 'json'>('matrix');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  const dispatchAgent3 = async (routeOverride?: string, paxOverride?: number) => {
    const activeRoute = routeOverride !== undefined ? routeOverride : customRouteInput;
    const activePax = paxOverride !== undefined ? paxOverride : paxCount;
    setLoading(true);
    try {
      const response = await api.post('/api/trips/check-feasibility', {
        traveler_id: 'CAPACITY-DISPATCH-OP',
        circuit_route: activeRoute,
        pax_count: activePax,
        items: [
          { item_id: 'res-guide-dispatch', resource_type: 'GUIDE', date: travelDate, party_size: activePax },
          { item_id: 'res-transport-dispatch', resource_type: 'TRANSPORT', date: travelDate, party_size: activePax, lat: 6.9271, lng: 79.8612 },
          { item_id: 'res-attr-dispatch', resource_type: 'ATTRACTION', date: travelDate, party_size: activePax, lat: 7.9570, lng: 80.7603 }
        ]
      });
      setResult({ ...response.data, active_circuit: activeRoute });
    } catch (err: any) {
      setResult({ error: err?.message || 'Agent 3 Execution Failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatchAgent3();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B132B]">
      <PipelineStepperHeader currentStep={3} />
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
          <div className="flex items-center gap-2 font-mono text-xs text-amber-400 font-bold uppercase tracking-wider">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Agent 03 • Logistics & Fleet Operations Desk</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px]">
              Python AI Microservice (Port 8000)
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif-luxury font-bold text-slate-100">
            Logistics Feasibility & Route Elevation Dispatch
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            Performs real-time guide & VIP fleet inventory allocation, GIS transit matrix calculation, and applies 1.25x mountain terrain routing precision.
          </p>
        </div>

        {/* Controls Panel */}
        <div className="p-6 bg-slate-900/90 border border-emerald-900/40 rounded-3xl space-y-6 shadow-xl backdrop-blur-md font-mono text-xs">
          
          {/* Preset Circuits & Custom Route Input */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-slate-300 uppercase font-semibold">Preset Blueprint Circuits:</label>
                <select
                  value={selectedRoute}
                  onChange={(e) => {
                    setSelectedRoute(e.target.value);
                    setCustomRouteInput(e.target.value);
                    dispatchAgent3(e.target.value);
                  }}
                  className="w-full bg-[#0B132B] border border-slate-700 focus:border-emerald-500 rounded-xl p-3 text-slate-100 outline-none"
                >
                  <option value="Colombo -> Kandy -> Nuwara Eliya -> Yala">Colombo → Kandy → Nuwara Eliya → Yala (Central Highlands Loop)</option>
                  <option value="Galle Riviera -> Sinharaja -> Mirissa">Galle Riviera → Sinharaja → Mirissa (Southern Coast)</option>
                  <option value="Cultural Triangle -> Sigiriya -> Polonnaruwa">Cultural Triangle → Sigiriya → Polonnaruwa (Historical Triangle)</option>
                  <option value="Colombo -> Sigiriya -> Trincomalee">Colombo → Sigiriya → Trincomalee (East Coast Excursion)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 uppercase font-semibold">Pax Count:</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={paxCount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPaxCount(val);
                    dispatchAgent3(undefined, val);
                  }}
                  className="w-full bg-[#0B132B] border border-slate-700 focus:border-emerald-500 rounded-xl p-3 text-slate-100 outline-none"
                />
              </div>
            </div>

            {/* Custom Interactive Route Input */}
            <div className="space-y-1">
              <label className="block text-slate-300 uppercase font-semibold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Custom Waypoint Route (Type Any Destinations):</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customRouteInput}
                  onChange={(e) => setCustomRouteInput(e.target.value)}
                  placeholder="e.g. Colombo -> Kandy -> Ella -> Yala -> Mirissa"
                  className="w-full bg-[#0B132B] border border-slate-700 focus:border-emerald-500 rounded-xl p-3 text-slate-100 outline-none font-mono text-xs"
                />
                <button
                  onClick={() => dispatchAgent3(customRouteInput)}
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold uppercase tracking-wider text-xs whitespace-nowrap cursor-pointer transition-all"
                >
                  Recalculate Route
                </button>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Date:</span>
              <input
                type="date"
                value={travelDate}
                onChange={(e) => {
                  setTravelDate(e.target.value);
                  dispatchAgent3();
                }}
                className="bg-[#0B132B] border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none text-xs"
              />
            </div>

            <button
              onClick={() => dispatchAgent3()}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>⚡ EXECUTE LOGISTICS FEASIBILITY AGENT</span>
            </button>
          </div>
        </div>

        {/* Live Output Section with Interactive Navigation Tabs */}
        {result && (
          <div className="p-6 bg-slate-900/90 border border-emerald-900/40 rounded-3xl space-y-6 shadow-xl font-mono text-xs">
            
            {/* Header & Status */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-serif-luxury font-bold text-slate-100">
                    Logistics & Route Matrix Telemetry
                  </h3>
                  <p className="text-[11px] text-slate-400 font-sans">
                    Route: <span className="text-amber-300 font-mono">{result.active_circuit || customRouteInput}</span>
                  </p>
                </div>
              </div>

              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 uppercase">
                Feasibility Status: {result.overall_feasibility || 'FEASIBLE'}
              </span>
            </div>

            {/* Dynamic Output Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setActiveTab('matrix')}
                className={`px-3 py-1.5 rounded-lg transition-all font-mono text-xs flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'matrix'
                    ? 'bg-emerald-600 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Overview Matrix</span>
              </button>

              <button
                onClick={() => setActiveTab('legs')}
                className={`px-3 py-1.5 rounded-lg transition-all font-mono text-xs flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'legs'
                    ? 'bg-emerald-600 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>GIS Waypoint Legs ({result.route_summary?.legs?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('items')}
                className={`px-3 py-1.5 rounded-lg transition-all font-mono text-xs flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'items'
                    ? 'bg-emerald-600 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Resource Allocation ({result.items?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('json')}
                className={`px-3 py-1.5 rounded-lg transition-all font-mono text-xs flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'json'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Live Telemetry (JSON)</span>
              </button>
            </div>

            {/* Tab 1: Overview Matrix */}
            {activeTab === 'matrix' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#0B132B] border border-slate-800 rounded-2xl space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase block">Calculated GIS Distance:</span>
                    <span className="text-slate-100 font-bold text-lg">{result.route_summary?.total_distance_km ?? 0} km</span>
                  </div>
                  <div className="p-4 bg-[#0B132B] border border-slate-800 rounded-2xl space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase block">Est. Driving Transit Time:</span>
                    <span className="text-slate-100 font-bold text-lg">{result.route_summary?.formatted_driving_time ?? '0m'}</span>
                  </div>
                  <div className="p-4 bg-[#0B132B] border border-slate-800 rounded-2xl space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase block">Terrain Elevation Factor:</span>
                    <span className="text-amber-300 font-bold text-xs block pt-1">
                      {result.route_summary?.terrain_elevation_factor ?? '1.00x Standard Waypoint GIS Matrix'}
                    </span>
                  </div>
                </div>

                {result.route_summary?.recommended_fleet_vehicle && (
                  <div className="p-4 bg-[#0B132B] rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase block">Matched Fleet Vehicle (from DB):</span>
                    <span className="text-emerald-300 font-bold text-xs">{result.route_summary.recommended_fleet_vehicle}</span>
                    {result.route_summary.driver_rest_recommendation && (
                      <p className="text-[11px] text-slate-400 pt-1 font-sans flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{result.route_summary.driver_rest_recommendation}</span>
                      </p>
                    )}
                  </div>
                )}

                <div className="p-4 bg-[#0B132B] rounded-2xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    {result.route_summary?.capacity_guarantee_status || '100% Guaranteed Licensed Guide & Fleet Capacity Reserved'}
                  </span>
                  <span className="text-emerald-400 font-bold uppercase">CONFIRMED</span>
                </div>
              </div>
            )}

            {/* Tab 2: GIS Waypoint Legs */}
            {activeTab === 'legs' && (
              <div className="space-y-3">
                {result.route_summary?.legs && result.route_summary.legs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                          <th className="py-2 px-3">Leg</th>
                          <th className="py-2 px-3">Origin Waypoint</th>
                          <th className="py-2 px-3">Destination Waypoint</th>
                          <th className="py-2 px-3">Leg Distance</th>
                          <th className="py-2 px-3">Est. Leg Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs">
                        {result.route_summary.legs.map((leg: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-bold text-amber-400">Leg #{idx + 1}</td>
                            <td className="py-2.5 px-3 text-slate-200">{leg.origin}</td>
                            <td className="py-2.5 px-3 text-slate-200">{leg.destination}</td>
                            <td className="py-2.5 px-3 text-emerald-300 font-bold">{leg.distance_km} km</td>
                            <td className="py-2.5 px-3 text-slate-300">{leg.formatted_duration}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-slate-400 py-4 text-center">Type 2 or more waypoints in custom route (e.g. &quot;Colombo &rarr; Kandy &rarr; Yala&quot;) to view GIS leg matrix.</p>
                )}
              </div>
            )}

            {/* Tab 3: Resource Allocations */}
            {activeTab === 'items' && (
              <div className="space-y-3">
                {result.items && result.items.length > 0 ? (
                  <div className="space-y-2">
                    {result.items.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 bg-[#0B132B] border border-slate-800 rounded-xl flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-amber-400 font-bold uppercase block text-[10px]">{item.resource_type} • ID #{item.item_id}</span>
                          <span className="text-slate-300 text-xs">{item.message}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                          item.is_available ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                        }`}>
                          {item.is_available ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 py-4 text-center">No resource items requested.</p>
                )}
              </div>
            )}

            {/* Tab 4: Raw Telemetry JSON */}
            {activeTab === 'json' && (
              <pre className="p-5 bg-slate-950 border border-amber-500/40 rounded-2xl text-amber-300 font-mono text-xs overflow-x-auto max-h-96 shadow-2xl">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}

            {/* PROMINENT HANDOFF TO STAGE 04 */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  const activeBudget = incomingBudget || 3500;
                  navigate(`/operations/concierge-approval?itineraryId=BESPOKE-CM-2026&budget=${activeBudget}&route=${encodeURIComponent(customRouteInput)}&pax=${paxCount}`);
                }}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs sm:text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all border border-emerald-400/40"
              >
                <span>⚡ HANDOFF TO STAGE 04: CONCIERGE APPROVAL DESK ➔</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </motion.div>
    </div>
  );
};
