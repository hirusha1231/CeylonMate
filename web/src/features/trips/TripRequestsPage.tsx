import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import {
  FileText, Search, RefreshCw, Filter, Calendar, Users, ChevronRight,
  Inbox, FileQuestion, Sparkles, ArrowRight, X
} from 'lucide-react';
import { apiError } from '../../api/client';
import { searchTrips } from './api';
import { emptyTripFilters, tripStatuses } from './types';
import type { TripFilters, TripPage, TripStatus } from './types';
import { AgentDeskSubNav } from '../../components/layout/AgentDeskSubNav';
import { fadeInVariants } from '../../utils/animations';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function filtersFromUrl(params: URLSearchParams): TripFilters {
  const status = params.get('status') ?? '';
  return {
    travelerId: params.get('travelerId') ?? '',
    objective: params.get('objective') ?? '',
    status: tripStatuses.includes(status as TripStatus) ? (status as TripStatus) : '',
    startFrom: params.get('startFrom') ?? '',
    startTo: params.get('startTo') ?? '',
  };
}

export function TripRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = filtersFromUrl(searchParams);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const [draft, setDraft] = useState<TripFilters>(active);
  const [validation, setValidation] = useState<string | null>(null);
  const [result, setResult] = useState<TripPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setError(null);
    searchTrips(active, page, controller.signal)
      .then((data) => {
        if (current) setResult(data);
      })
      .catch((failure) => {
        if (current && failure?.code !== 'ERR_CANCELED') setError(apiError(failure));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [searchParams, retry]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const travelerId = draft.travelerId.trim();
    if (travelerId && !uuidPattern.test(travelerId)) {
      setValidation('Traveler search requires a complete UUID format.');
      return;
    }
    if (draft.startFrom && draft.startTo && draft.startFrom > draft.startTo) {
      setValidation('Start date "To" must be on or after "From".');
      return;
    }
    setValidation(null);
    const next = new URLSearchParams();
    if (travelerId) next.set('travelerId', travelerId);
    if (draft.objective.trim()) next.set('objective', draft.objective.trim());
    if (draft.status) next.set('status', draft.status);
    if (draft.startFrom) next.set('startFrom', draft.startFrom);
    if (draft.startTo) next.set('startTo', draft.startTo);
    setSearchParams(next);
  }

  function handleReset() {
    setDraft(emptyTripFilters);
    setValidation(null);
    setSearchParams(new URLSearchParams());
  }

  function changePage(next: number) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(next));
    setSearchParams(params);
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACCEPTED':
      case 'OFFERED':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30';
      case 'PENDING_REVIEW':
      case 'SUBMITTED':
        return 'bg-amber-950/60 text-amber-300 border-amber-500/30';
      case 'DRAFT':
        return 'bg-slate-900 text-stone-300 border-stone-700';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-rose-950/60 text-rose-400 border-rose-500/30';
      default:
        return 'bg-blue-950/60 text-blue-300 border-blue-500/30';
    }
  };

  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-[#0B131F] text-stone-100 font-sans selection:bg-[#C5A880] selection:text-[#0B131F] pb-16"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 space-y-6">
        {/* Sub Navigation Bar */}
        <AgentDeskSubNav activeTab="trips" />

        {/* Action Header Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#0F1A24]/60 backdrop-blur-xl p-6 rounded-2xl border border-[#C5A880]/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#C5A880] font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              Client Inquiry Console
            </div>
            <h1 className="text-2xl md:text-3xl font-serif-luxury font-bold text-stone-100">
              Bespoke Trip Requests & Proposals
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Review client custom itinerary requests, agent revisions, and quote approvals.
            </p>
          </div>

          <button
            onClick={() => setRetry((count) => count + 1)}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-stone-300 border border-stone-700/60 text-xs font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#C5A880] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Requests</span>
          </button>
        </div>

        {/* Structured Filter Card Container */}
        <form
          onSubmit={apply}
          className="bg-[#0F1A24]/60 backdrop-blur-xl p-6 rounded-2xl border border-[#C5A880]/20 shadow-xl space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input: Objective / Traveler */}
            <div className="space-y-1">
              <label className="block text-xs font-mono font-semibold text-[#C5A880] uppercase tracking-wider">
                Search Objective / Keyword
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={draft.objective}
                  placeholder="e.g. Wildlife, Tea Estate..."
                  onChange={(e) => setDraft({ ...draft, objective: e.target.value })}
                  className="w-full bg-slate-900/80 border border-stone-800 text-white placeholder-stone-500 rounded-xl pl-9 pr-3.5 py-2.5 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none text-xs font-sans"
                />
              </div>
            </div>

            {/* Status Dropdown */}
            <div className="space-y-1">
              <label className="block text-xs font-mono font-semibold text-[#C5A880] uppercase tracking-wider">
                Proposal Status
              </label>
              <div className="relative">
                <Filter className="w-3.5 h-3.5 text-[#C5A880] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as TripStatus })}
                  className="w-full bg-slate-900 border border-stone-800 text-stone-200 rounded-xl pl-9 pr-3.5 py-2.5 focus:border-[#C5A880] outline-none text-xs font-sans cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  {tripStatuses.map((st) => (
                    <option key={st} value={st}>
                      {st.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date From */}
            <div className="space-y-1">
              <label className="block text-xs font-mono font-semibold text-[#C5A880] uppercase tracking-wider">
                Start Date From
              </label>
              <input
                type="date"
                value={draft.startFrom}
                onChange={(e) => setDraft({ ...draft, startFrom: e.target.value })}
                className="w-full bg-slate-900/80 border border-stone-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none"
              />
            </div>

            {/* Date To */}
            <div className="space-y-1">
              <label className="block text-xs font-mono font-semibold text-[#C5A880] uppercase tracking-wider">
                Start Date To
              </label>
              <input
                type="date"
                value={draft.startTo}
                onChange={(e) => setDraft({ ...draft, startTo: e.target.value })}
                className="w-full bg-slate-900/80 border border-stone-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none"
              />
            </div>
          </div>

          {/* Validation Alert */}
          {validation && (
            <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl font-mono">
              ⚠️ {validation}
            </p>
          )}

          {/* Action Buttons Row */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-800/80">
            <button
              type="button"
              onClick={handleReset}
              className="bg-slate-900 hover:bg-slate-800 text-stone-300 border border-stone-700 font-semibold px-4 py-2.5 rounded-xl cursor-pointer text-xs flex items-center gap-2 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>

            <button
              type="submit"
              className="bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold px-6 py-2.5 rounded-xl hover:brightness-110 shadow-lg transition-all text-xs cursor-pointer flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Filter</span>
            </button>
          </div>
        </form>

        {/* Loading State */}
        {loading ? (
          <div className="p-16 text-center text-stone-400 text-xs space-y-3 bg-[#0F1A24]/80 rounded-2xl border border-stone-800">
            <RefreshCw className="w-8 h-8 text-[#C5A880] animate-spin mx-auto" />
            <p className="font-mono">Loading traveler trip inquiries & quotations...</p>
          </div>
        ) : error ? (
          <div className="bg-[#0F1A24]/80 border border-rose-500/40 rounded-2xl p-8 text-center space-y-4 shadow-xl">
            <h2 className="text-lg font-serif-luxury font-bold text-rose-300">
              Could not load trip requests
            </h2>
            <p className="text-xs text-stone-400 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => setRetry((count) => count + 1)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-[#C5A880] border border-[#C5A880]/50 hover:bg-[#C5A880]/10 text-xs font-semibold cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : !result || result.items.length === 0 ? (
          /* Empty State Display */
          <div className="bg-[#0F1A24]/80 border border-stone-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4 shadow-xl">
            <FileQuestion className="w-12 h-12 text-[#C5A880] mx-auto" />
            <h3 className="text-lg font-serif-luxury font-bold text-stone-100">
              No Trip Requests Found
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              There are currently no trip inquiries matching your filter criteria. Try adjusting the search filters or dates.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-2.5 rounded-xl bg-[#C5A880]/20 text-[#C5A880] border border-[#C5A880] hover:bg-[#C5A880]/30 font-semibold text-xs transition-all cursor-pointer inline-block"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          /* Luxury Data Table Display */
          <div className="bg-[#0F1A24]/80 backdrop-blur-xl border border-[#C5A880]/20 rounded-2xl overflow-hidden shadow-2xl space-y-4">
            <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
              <span className="text-xs font-mono text-[#C5A880] font-semibold uppercase tracking-wider">
                Matching Results ({result.totalCount})
              </span>
              <span className="text-xs text-stone-400 font-mono">
                Page {page} of {Math.max(1, Math.ceil(result.totalCount / result.pageSize))}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-stone-800 text-[11px] font-mono uppercase tracking-wider text-[#C5A880]">
                    <th className="px-5 py-4 font-semibold">Objective / Itinerary</th>
                    <th className="px-5 py-4 font-semibold">Traveler Details</th>
                    <th className="px-5 py-4 font-semibold">Dates Window</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Budget Range</th>
                    <th className="px-5 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 text-xs font-sans">
                  {result.items.map((trip) => (
                    <tr key={trip.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="px-5 py-4">
                        <Link
                          to={`/staff/trips/${trip.id}`}
                          className="font-serif-luxury font-bold text-stone-100 hover:text-[#C5A880] text-sm block transition-colors"
                        >
                          {trip.objective}
                        </Link>
                        <span className="text-[10px] text-stone-500 font-mono block mt-0.5">
                          ID: #{trip.id.slice(0, 8)}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono text-stone-300">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#C5A880]" />
                          <span className="truncate max-w-[150px]">{trip.travelerId}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono text-stone-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#C5A880]" />
                          <span>
                            {trip.startDate} – {trip.endDate}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border shadow-sm ${getStatusBadgeClass(
                            trip.status
                          )}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                          {trip.status.replaceAll('_', ' ')}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono font-semibold text-[#D4AF37] text-sm">
                        {trip.currency || 'USD'} {trip.budget.toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/staff/trips/${trip.id}`}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-[#C5A880]/20 text-[#C5A880] border border-stone-700/60 hover:border-[#C5A880]/60 text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <span>Review / Edit Proposal</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Row */}
            <div className="px-6 py-4 border-t border-stone-800 flex items-center justify-between text-xs">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => changePage(page - 1)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-stone-300 border border-stone-700 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>

              <span className="text-stone-400 font-mono">
                Page {page} of {Math.max(1, Math.ceil(result.totalCount / result.pageSize))}
              </span>

              <button
                type="button"
                disabled={page * result.pageSize >= result.totalCount}
                onClick={() => changePage(page + 1)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-stone-300 border border-stone-700 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
