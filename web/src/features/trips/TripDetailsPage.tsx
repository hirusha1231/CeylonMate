import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { motion } from 'framer-motion';
import {
  ArrowLeft, FileText, Calendar, Users, MapPin, DollarSign, Clock, RefreshCw, ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import { apiError } from '../../api/client';
import { getTrip } from './api';
import type { TripRequest } from './types';
import { AgentDeskSubNav } from '../../components/layout/AgentDeskSubNav';
import { fadeInVariants } from '../../utils/animations';

function value(val: string | number | null | undefined) {
  return val === null || val === undefined || val === '' ? 'Not provided' : String(val);
}

export function TripDetailsPage() {
  const { id } = useParams();
  const [trip, setTrip] = useState<TripRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setError(null);
    setTrip(null);
    if (!id) {
      setError('Trip request ID is missing.');
      setLoading(false);
      return;
    }
    getTrip(id, controller.signal)
      .then((data) => {
        if (current) setTrip(data);
      })
      .catch((failure) => {
        if (!current || failure?.code === 'ERR_CANCELED') return;
        setError(
          axios.isAxiosError(failure) && failure.response?.status === 404
            ? 'Trip request not found.'
            : apiError(failure)
        );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [id, retry]);

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

        {/* Back Link & Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/staff/trips"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#C5A880] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Trip Proposals & Requests</span>
          </Link>
        </div>

        {loading ? (
          <div className="p-16 text-center text-stone-400 text-xs space-y-3 bg-[#0F1A24]/80 rounded-2xl border border-stone-800">
            <RefreshCw className="w-8 h-8 text-[#C5A880] animate-spin mx-auto" />
            <p className="font-mono">Loading trip proposal details...</p>
          </div>
        ) : error ? (
          <div className="bg-[#0F1A24]/80 border border-rose-500/40 rounded-2xl p-8 text-center space-y-4 shadow-xl">
            <h2 className="text-lg font-serif-luxury font-bold text-rose-300">
              Could not load trip request
            </h2>
            <p className="text-xs text-stone-400 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => setRetry((count) => count + 1)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-[#C5A880] border border-[#C5A880]/50 hover:bg-[#C5A880]/10 text-xs font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : trip ? (
          <div className="space-y-6">
            {/* Primary Details Card */}
            <div className="bg-[#0F1A24]/90 backdrop-blur-xl border border-[#C5A880]/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-800">
                <div>
                  <span className="text-xs font-mono text-[#C5A880] uppercase tracking-wider">
                    Trip Inquiry #{trip.id}
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-serif-luxury font-bold text-stone-100 mt-1">
                    {trip.objective}
                  </h1>
                </div>

                <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 uppercase">
                  {trip.status.replaceAll('_', ' ')}
                </span>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs font-sans">
                <div className="p-4 bg-slate-900/80 rounded-xl border border-stone-800 space-y-1">
                  <span className="text-stone-400 font-mono block">Traveler Identifier</span>
                  <span className="font-mono text-stone-200 font-semibold text-sm truncate block">
                    {trip.travelerId}
                  </span>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-stone-800 space-y-1">
                  <span className="text-stone-400 font-mono block">Travel Window</span>
                  <span className="font-mono text-stone-200 font-semibold text-sm block">
                    {trip.startDate} – {trip.endDate}
                  </span>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-stone-800 space-y-1">
                  <span className="text-stone-400 font-mono block">Target Budget</span>
                  <span className="font-mono text-[#D4AF37] font-bold text-sm block">
                    {trip.currency || 'USD'} {trip.budget.toLocaleString()}
                  </span>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-stone-800 space-y-1">
                  <span className="text-stone-400 font-mono block">Party Size</span>
                  <span className="font-mono text-stone-200 font-semibold text-sm block">
                    {trip.partySize} Guest(s)
                  </span>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-stone-800 space-y-1">
                  <span className="text-stone-400 font-mono block">Starting Location</span>
                  <span className="font-mono text-stone-200 font-semibold text-sm block">
                    {value(trip.startingLatitude)}, {value(trip.startingLongitude)}
                  </span>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-stone-800 space-y-1">
                  <span className="text-stone-400 font-mono block">Accessibility Needs</span>
                  <span className="text-stone-200 block">
                    {value(trip.accessibilityNeeds)}
                  </span>
                </div>
              </div>
            </div>

            {/* Workflow Execution Card */}
            <div className="bg-[#0F1A24]/90 backdrop-blur-xl border border-stone-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
              <h3 className="text-xs font-mono font-semibold text-[#C5A880] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Workflow Orchestration Details
              </h3>

              {trip.workflowExecution ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-4 bg-slate-900/80 rounded-xl border border-stone-800">
                    <span className="text-stone-400 block">Execution ID</span>
                    <span className="text-stone-100 font-bold">{trip.workflowExecution.id}</span>
                  </div>
                  <div className="p-4 bg-slate-900/80 rounded-xl border border-stone-800">
                    <span className="text-stone-400 block">Status</span>
                    <span className="text-emerald-400 font-bold">{trip.workflowExecution.status}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-stone-400">
                  Workflow orchestration token details are pending execution.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
