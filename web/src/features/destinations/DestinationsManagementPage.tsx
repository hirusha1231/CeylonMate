import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Search, Sparkles, Filter, RefreshCw, Compass, ShieldCheck,
  AlertTriangle, CheckCircle2, XCircle, Info, Ticket, AlertCircle, Clock
} from 'lucide-react';
import { fetchDestinations, fetchDestinationSuitability } from './api';
import { Destination, DestinationSuitability } from './types';
import { AgentDeskSubNav } from '../../components/layout/AgentDeskSubNav';
import { fadeInVariants, hoverLiftProps } from '../../utils/animations';

export function DestinationsManagementPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const [suitability, setSuitability] = useState<DestinationSuitability | null>(null);
  const [suitabilityLoading, setSuitabilityLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    loadDestinations();
  }, [categoryFilter]);

  async function loadDestinations() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDestinations({
        category: categoryFilter || undefined,
        search: search || undefined
      });
      setDestinations(data);
      if (data.length > 0 && !selectedDest) {
        handleSelectDestination(data[0]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load destinations.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectDestination(dest: Destination) {
    setSelectedDest(dest);
    setSuitabilityLoading(true);
    try {
      const suit = await fetchDestinationSuitability(dest.id);
      setSuitability(suit);
    } catch {
      setSuitability(null);
    } finally {
      setSuitabilityLoading(false);
    }
  }

  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-[#0B131F] text-stone-100 font-sans selection:bg-[#C5A880] selection:text-[#0B131F] pb-16"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 space-y-6">
        {/* Top Sub-Navigation Tabs */}
        <AgentDeskSubNav activeTab="collections" />

        {/* Action Header Card */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#0F1A24]/60 backdrop-blur-xl p-6 rounded-2xl border border-[#C5A880]/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#C5A880] font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              Attractions & Region Console
            </div>
            <h1 className="text-2xl md:text-3xl font-serif-luxury font-bold text-stone-100">
              Destinations & Attractions Management
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Manage travel spots, opening rules, active advisories, and local guide condition reports.
            </p>
          </div>

          <button
            onClick={loadDestinations}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-stone-300 border border-stone-700/60 text-xs font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#C5A880] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="bg-[#0F1A24]/40 p-4 rounded-2xl border border-stone-800/80 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search destination by name or region..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadDestinations()}
              className="w-full bg-slate-900/80 border border-stone-800 text-white placeholder-stone-500 rounded-xl pl-10 pr-4 py-2.5 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none text-xs font-sans"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <Filter className="w-3.5 h-3.5 text-[#C5A880] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-slate-900 border border-stone-800 text-stone-200 rounded-xl pl-9 pr-4 py-2.5 focus:border-[#C5A880] outline-none text-xs font-sans cursor-pointer"
              >
                <option value="">All Categories</option>
                <option value="NATURE">Nature</option>
                <option value="WILDLIFE">Wildlife</option>
                <option value="HERITAGE">Heritage</option>
                <option value="CULTURE">Culture</option>
              </select>
            </div>

            <button
              onClick={loadDestinations}
              className="bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold px-5 py-2.5 rounded-xl hover:brightness-110 shadow-lg transition-all text-xs cursor-pointer shrink-0"
            >
              Search
            </button>
          </div>
        </div>

        {/* Error State Banner */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 text-rose-200 text-xs flex items-center gap-3 shadow-lg">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main 2-Column Split View */}
        {loading ? (
          <div className="p-16 text-center text-stone-400 text-xs space-y-3 bg-[#0F1A24]/80 rounded-2xl border border-stone-800">
            <RefreshCw className="w-8 h-8 text-[#C5A880] animate-spin mx-auto" />
            <p className="font-mono">Loading registered destinations & attraction catalogs...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Registered Destinations List (40% width / 5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono text-[#C5A880] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Registered Destinations ({destinations.length})
                </span>
              </div>

              {destinations.length === 0 ? (
                <div className="p-8 text-center bg-[#0F1A24]/80 border border-stone-800 rounded-2xl text-stone-400 text-xs space-y-2">
                  <Info className="w-6 h-6 text-stone-600 mx-auto" />
                  <p className="font-medium text-stone-300">No destinations found.</p>
                  <p className="text-[11px] text-stone-500">Try adjusting your search criteria or category filter.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {destinations.map((d) => {
                    const isSelected = selectedDest?.id === d.id;
                    return (
                      <motion.div
                        key={d.id}
                        {...hoverLiftProps}
                        onClick={() => handleSelectDestination(d)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#134E4A]/30 border-[#C5A880] text-stone-100 shadow-xl'
                            : 'bg-slate-900/60 border-stone-800 text-stone-300 hover:border-[#C5A880]/50 hover:bg-slate-900/90'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-serif-luxury font-bold text-base text-stone-100">
                            {d.name}
                          </h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border shrink-0 ${
                              d.status === 'ACTIVE'
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-950/60 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {d.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="bg-slate-900 border border-stone-700/80 text-stone-300 text-[11px] px-2.5 py-0.5 rounded-lg font-mono">
                            Region: {d.region}
                          </span>
                          <span className="bg-slate-900 border border-stone-700/80 text-[#C5A880] text-[11px] px-2.5 py-0.5 rounded-lg font-mono">
                            {d.category}
                          </span>
                        </div>

                        {d.description && (
                          <p className="text-xs text-stone-400 line-clamp-2 mt-2 leading-relaxed">
                            {d.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-stone-800/60 text-[11px] font-mono text-stone-400">
                          {d.attractions?.length > 0 && (
                            <span className="flex items-center gap-1 text-[#C5A880]">
                              <Ticket className="w-3.5 h-3.5" />
                              {d.attractions.length} attraction(s)
                            </span>
                          )}
                          {d.guideReports?.length > 0 && (
                            <span className="flex items-center gap-1 text-teal-400">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {d.guideReports.length} report(s)
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Destination Details & Live Suitability Check (60% width / 7 cols) */}
            <div className="lg:col-span-7">
              {selectedDest ? (
                <div className="bg-[#0F1A24]/90 backdrop-blur-xl border border-[#C5A880]/30 shadow-2xl rounded-2xl p-6 sm:p-8 space-y-6">
                  {/* Destination Details Header */}
                  <div className="pb-6 border-b border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#C5A880] uppercase tracking-wider font-semibold">
                        Destination Profile #{selectedDest.id.slice(0, 8)}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#C5A880]/10 border border-[#C5A880]/30 text-[#D4AF37]">
                        {selectedDest.category}
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-stone-100">
                      {selectedDest.name}
                    </h2>

                    <p className="text-xs text-stone-400 font-mono flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>{selectedDest.region} ({selectedDest.latitude.toFixed(4)}, {selectedDest.longitude.toFixed(4)})</span>
                    </p>

                    {selectedDest.description && (
                      <p className="text-xs text-stone-300 leading-relaxed pt-2">
                        {selectedDest.description}
                      </p>
                    )}
                  </div>

                  {/* Live Suitability Evaluation Card */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono text-[#C5A880] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Live Suitability & Route Evaluation
                    </h3>

                    {suitabilityLoading ? (
                      <div className="p-6 text-center bg-slate-900/60 rounded-xl border border-stone-800 text-xs text-stone-400">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#C5A880] mx-auto mb-2" />
                        Evaluating real-time weather, elevation, & guide advisories...
                      </div>
                    ) : suitability ? (
                      <div
                        className={`p-4 rounded-xl border space-y-3 shadow-lg ${
                          suitability.isSuitable
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-sm">
                          {suitability.isSuitable ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-400" />
                          )}
                          <span>
                            {suitability.isSuitable ? 'Suitable for Traveler Itineraries' : 'Not Suitable (Restricted / Blocked)'}
                          </span>
                        </div>

                        <p className="text-xs text-stone-300">{suitability.summary}</p>

                        {suitability.blockingReasons?.length > 0 && (
                          <div className="space-y-1 pt-2 border-t border-rose-500/20 text-xs">
                            <span className="font-semibold text-rose-300 block font-mono">Blocking Reasons:</span>
                            <ul className="list-disc pl-5 text-rose-300/90 space-y-0.5">
                              {suitability.blockingReasons.map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-900/60 rounded-xl border border-stone-800 text-xs text-stone-400">
                        Suitability details unavailable for this destination.
                      </div>
                    )}
                  </div>

                  {/* Listed Attractions & Entry Rules */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-mono text-[#C5A880] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Ticket className="w-4 h-4 text-[#D4AF37]" />
                      Listed Attractions ({selectedDest.attractions?.length || 0})
                    </h3>

                    {!selectedDest.attractions || selectedDest.attractions.length === 0 ? (
                      <p className="text-xs text-stone-500 italic p-3 bg-slate-900/40 rounded-xl border border-stone-800">
                        No sub-attractions listed under this destination.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDest.attractions.map((a) => (
                          <div
                            key={a.id}
                            className="p-3.5 bg-slate-900/80 border border-stone-800 rounded-xl space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-stone-100">{a.name}</span>
                              <span className="font-mono text-[#D4AF37] font-semibold">
                                {a.currency || 'LKR'} {a.basePrice.toLocaleString()}
                              </span>
                            </div>

                            {a.accessibilityNotes && (
                              <p className="text-[11px] text-stone-400">
                                ♿ Accessibility: {a.accessibilityNotes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Local Guide Reports Section */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-mono text-[#C5A880] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-teal-400" />
                      Local Guide Condition Reports ({selectedDest.guideReports?.length || 0})
                    </h3>

                    {!selectedDest.guideReports || selectedDest.guideReports.length === 0 ? (
                      <p className="text-xs text-stone-500 italic p-3 bg-slate-900/40 rounded-xl border border-stone-800">
                        No active condition reports submitted by certified guides.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDest.guideReports.map((r) => (
                          <div
                            key={r.id}
                            className="p-3 bg-slate-900/80 border border-stone-800 rounded-xl text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-500/30 text-[10px] font-mono font-bold">
                                [{r.reportType}]
                              </span>
                              <span className="text-[10px] text-stone-500 font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3 text-stone-500" />
                                {new Date(r.reportedAtUtc).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-stone-300 text-xs">{r.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-[#0F1A24]/80 rounded-2xl border border-dashed border-stone-800 text-center space-y-3">
                  <Compass className="w-12 h-12 text-[#C5A880]/60 animate-pulse" />
                  <h4 className="text-base font-serif-luxury font-bold text-stone-200">
                    No Destination Selected
                  </h4>
                  <p className="text-xs text-stone-400 max-w-sm">
                    Select a destination on the left to inspect real-time capacity and suitability advisories.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
