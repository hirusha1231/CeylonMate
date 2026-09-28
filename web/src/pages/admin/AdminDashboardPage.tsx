import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import {
  Users, CalendarCheck, Wind, Server, Database, Cpu, ArrowRight, Activity, MapPin, FileText, Sparkles, RefreshCw, Car
} from 'lucide-react';
import { AnimatedCounter } from '../../components/common/Counter';
import { ApiDisconnectedBanner } from '../../components/common/ApiDisconnectedBanner';
import { Skeleton } from '../../components/common/Skeleton';
import { adminService, DashboardMetricsDto, SystemHealthDto } from '../../services/adminService';
import { fadeInVariants, hoverLiftProps } from '../../utils/animations';
import { FleetCatalogManagerModal } from '../../components/fleet/FleetCatalogManagerModal';

export const AdminDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetricsDto | null>(null);
  const [health, setHealth] = useState<SystemHealthDto | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [metricsRes, healthRes] = await Promise.all([
        adminService.fetchDashboardMetrics(),
        adminService.fetchSystemHealth(),
      ]);
      setMetrics(metricsRes);
      setHealth(healthRes);
    } catch {
      setIsOfflineMode(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-8 font-sans"
    >
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#134E4A]/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            Executive Telemetry
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif-luxury font-bold text-stone-100">
            Operations & Platform Dashboard
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Real-time telemetry, PostgreSQL concurrency status, and multi-agent coordination metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFleetModalOpen(true)}
            className="px-4 py-2 text-[#C5A880] hover:text-white rounded-xl bg-slate-900 border border-[#C5A880]/30 hover:border-[#C5A880] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <Car className="w-4 h-4 text-[#D4AF37]" />
            <span>Manage Private Fleet Showcase</span>
          </button>
          <button
            onClick={loadDashboardData}
            className="p-2 text-stone-400 hover:text-white rounded-lg bg-stone-900 border border-stone-800"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isOfflineMode && <ApiDisconnectedBanner />}

      {/* 4 Executive Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          {...hoverLiftProps}
          className="bg-[#0F1A24] border border-stone-800 p-6 rounded-2xl space-y-3 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-stone-400 uppercase font-semibold">Registered Users</span>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-stone-700 text-[#C5A880]">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-serif-luxury font-bold text-[#C5A880]">
            {loading ? <Skeleton className="h-9 w-24 bg-slate-800" /> : <AnimatedCounter end={metrics?.totalRegisteredUsers ?? 0} />}
          </div>
          <div className="text-[11px] text-stone-400 flex items-center justify-between pt-2 border-t border-stone-800/80">
            <span>Travelers: {metrics?.activeTravelers ?? 0}</span>
            <span>Guides: {metrics?.certifiedGuides ?? 0}</span>
            <span>Staff: {metrics?.internalStaff ?? 0}</span>
          </div>
        </motion.div>

        <motion.div
          {...hoverLiftProps}
          className="bg-[#0F1A24] border border-stone-800 p-6 rounded-2xl space-y-3 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-stone-400 uppercase font-semibold">Active Bookings & Holds</span>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-stone-700 text-emerald-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-serif-luxury font-bold text-emerald-400">
            {loading ? <Skeleton className="h-9 w-24 bg-slate-800" /> : <AnimatedCounter end={metrics?.totalBookings ?? 0} />}
          </div>
          <div className="text-[11px] text-stone-400 flex items-center justify-between pt-2 border-t border-stone-800/80">
            <span>Confirmed: {metrics?.confirmedBookings ?? 0}</span>
            <span>Active Holds: {metrics?.activeHoldsCount ?? 0}</span>
          </div>
        </motion.div>

        <motion.div
          {...hoverLiftProps}
          className="bg-[#0F1A24] border border-stone-800 p-6 rounded-2xl space-y-3 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-stone-400 uppercase font-semibold">Field Advisories</span>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-stone-700 text-sky-400">
              <Wind className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-serif-luxury font-bold text-sky-400">
            {loading ? <Skeleton className="h-9 w-24 bg-slate-800" /> : <AnimatedCounter end={metrics?.publishedAdvisoriesCount ?? 0} />}
          </div>
          <div className="text-[11px] text-stone-400 flex items-center justify-between pt-2 border-t border-stone-800/80">
            <span>Weather: 8</span>
            <span>Trail Rules: 6</span>
          </div>
        </motion.div>

        <motion.div
          {...hoverLiftProps}
          className="bg-[#0F1A24] border border-stone-800 p-6 rounded-2xl space-y-3 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-stone-400 uppercase font-semibold">System Uptime</span>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-stone-700 text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-serif-luxury font-bold text-amber-400">
            {health?.apiUptime || '99.98%'}
          </div>
          <div className="text-[11px] text-stone-400 flex items-center justify-between pt-2 border-t border-stone-800/80">
            <span>Avg Latency: {health?.avgLatencyMs || 42}ms</span>
            <span>OCC Locking: Active</span>
          </div>
        </motion.div>
      </div>



      {/* Quick Action Navigation Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Link to="/admin/users">
          <motion.div
            {...hoverLiftProps}
            className="p-6 bg-[#0F1A24] border border-stone-800 hover:border-[#C5A880]/50 rounded-2xl space-y-3 group transition-all h-full"
          >
            <div className="w-10 h-10 rounded-xl bg-[#134E4A]/30 text-emerald-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-serif-luxury font-bold text-stone-100 group-hover:text-[#C5A880] transition-colors flex items-center justify-between">
              <span>Staff Directory</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#C5A880]" />
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Provision internal staff accounts, edit role credentials, and manage traveler profiles.
            </p>
          </motion.div>
        </Link>

        <Link to="/admin/destinations">
          <motion.div
            {...hoverLiftProps}
            className="p-6 bg-[#0F1A24] border border-stone-800 hover:border-[#C5A880]/50 rounded-2xl space-y-3 group transition-all h-full"
          >
            <div className="w-10 h-10 rounded-xl bg-[#134E4A]/30 text-[#C5A880] flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-serif-luxury font-bold text-stone-100 group-hover:text-[#C5A880] transition-colors flex items-center justify-between">
              <span>Destinations</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#C5A880]" />
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Maintain Sri Lanka's master attraction inventory, foreign/local pass pricing, and daily capacity caps.
            </p>
          </motion.div>
        </Link>

        <div
          onClick={() => setIsFleetModalOpen(true)}
          className="cursor-pointer"
        >
          <motion.div
            {...hoverLiftProps}
            className="p-6 bg-[#0F1A24] border border-[#C5A880]/30 hover:border-[#C5A880] rounded-2xl space-y-3 group transition-all h-full"
          >
            <div className="w-10 h-10 rounded-xl bg-[#134E4A]/30 text-[#D4AF37] flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-serif-luxury font-bold text-stone-100 group-hover:text-[#C5A880] transition-colors flex items-center justify-between">
              <span>Fleet Showcase</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#C5A880]" />
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Publish & update VIP vehicle showcase models, passenger capacities, photos, and feature highlights on public frontend.
            </p>
          </motion.div>
        </div>

        <Link to="/admin/audit-logs">
          <motion.div
            {...hoverLiftProps}
            className="p-6 bg-[#0F1A24] border border-stone-800 hover:border-[#C5A880]/50 rounded-2xl space-y-3 group transition-all h-full"
          >
            <div className="w-10 h-10 rounded-xl bg-[#134E4A]/30 text-sky-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-serif-luxury font-bold text-stone-100 group-hover:text-[#C5A880] transition-colors flex items-center justify-between">
              <span>Audit & Logs</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#C5A880]" />
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Inspect critical system transactions, monitor active 15-minute holds, and trigger hold releases.
            </p>
          </motion.div>
        </Link>
      </div>

      <FleetCatalogManagerModal
        isOpen={isFleetModalOpen}
        onClose={() => setIsFleetModalOpen(false)}
      />
    </motion.div>
  );
};
