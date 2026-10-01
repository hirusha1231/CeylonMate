import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bus,
  Ticket,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  X,
  ShieldCheck,
  Sparkles,
  Users,
  Calendar,
  Clock,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Info,
  MapPin,
  Compass
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../api/client';
import { fadeInVariants, scaleInModalVariants } from '../utils/animations';

export interface TransportSlot {
  id: string;
  transportOptionId: string;
  optionTitle?: string;
  vehicleType: string;
  startTimeUtc: string;
  endTimeUtc: string;
  status: string;
  maxPassengers: number;
  dailyRate: number;
  currency: string;
  rowVersion?: string;
}

export interface AttractionSlot {
  id: string;
  attractionId: string;
  startTimeUtc: string;
  endTimeUtc: string;
  status: string;
  maxCapacity: number;
  bookedCapacity: number;
  priceAmount: number;
  currency: string;
  notes?: string;
  rowVersion?: string;
}

interface TransportAttractionCapacityPageProps {
  onTabChange?: (tab: 'guides' | 'capacity') => void;
}

const initialCreateTransportForm = {
  startTime: '',
  endTime: '',
  vehicleType: '',
  maxPassengers: '',
  dailyRate: '',
  currency: 'LKR'
};

const initialCreateAttractionForm = {
  startTime: '',
  endTime: '',
  maxCapacity: '',
  priceAmount: '',
  currency: 'LKR',
  notes: ''
};

export const TransportAttractionCapacityPage: React.FC<TransportAttractionCapacityPageProps> = ({
  onTabChange
}) => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'transport' | 'attractions'>('transport');

  const [transportSlots, setTransportSlots] = useState<TransportSlot[]>([]);
  const [attractionSlots, setAttractionSlots] = useState<AttractionSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals for Transport Create/Edit/Delete
  const [isCreatingTransport, setIsCreatingTransport] = useState(false);
  const [createTransportForm, setCreateTransportForm] = useState(initialCreateTransportForm);
  const [editingTransport, setEditingTransport] = useState<TransportSlot | null>(null);
  const [editTransportForm, setEditTransportForm] = useState({
    startTime: '',
    endTime: '',
    vehicleType: 'VAN',
    maxPassengers: 12,
    dailyRate: 3500,
    currency: 'LKR',
    status: 'AVAILABLE'
  });
  const [deletingTransport, setDeletingTransport] = useState<TransportSlot | null>(null);

  // Modals for Attraction Create/Edit/Delete
  const [isCreatingAttraction, setIsCreatingAttraction] = useState(false);
  const [createAttractionForm, setCreateAttractionForm] = useState(initialCreateAttractionForm);
  const [editingAttraction, setEditingAttraction] = useState<AttractionSlot | null>(null);
  const [editAttractionForm, setEditAttractionForm] = useState({
    startTime: '',
    endTime: '',
    maxCapacity: 100,
    bookedCapacity: 0,
    priceAmount: 2000,
    currency: 'LKR',
    status: 'AVAILABLE',
    notes: ''
  });
  const [deletingAttraction, setDeletingAttraction] = useState<AttractionSlot | null>(null);

  const [submitting, setSubmitting] = useState<boolean>(false);

  const defaultOptionId = '00000000-0000-0000-0000-000000000001';

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeSubTab === 'transport') {
        const res = await api.get<TransportSlot[]>(`/api/transport/${defaultOptionId}/availability`);
        setTransportSlots(res.data || []);
      } else {
        const res = await api.get<AttractionSlot[]>(`/api/attractions/${defaultOptionId}/availability`);
        setAttractionSlots(res.data || []);
      }
    } catch (e: any) {
      console.error('Error fetching capacity data:', e);
      const msg = apiError(e);
      setError(msg);
      showToast('Logistics Data Error', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  // Open & Reset Create Modals
  const openCreateTransport = () => {
    setCreateTransportForm(initialCreateTransportForm);
    setIsCreatingTransport(true);
  };

  const closeCreateTransport = () => {
    setCreateTransportForm(initialCreateTransportForm);
    setIsCreatingTransport(false);
  };

  const openCreateAttraction = () => {
    setCreateAttractionForm(initialCreateAttractionForm);
    setIsCreatingAttraction(true);
  };

  const closeCreateAttraction = () => {
    setCreateAttractionForm(initialCreateAttractionForm);
    setIsCreatingAttraction(false);
  };

  // Handle Create Transport (POST)
  const handleCreateTransport = async () => {
    if (!createTransportForm.startTime || !createTransportForm.endTime) {
      showToast('Validation Failed', 'Please select valid departure and arrival date/times.', 'error');
      return;
    }
    if (!createTransportForm.vehicleType) {
      showToast('Validation Failed', 'Please select a vehicle type (e.g. VAN, SUV, SEDAN).', 'error');
      return;
    }
    if (!createTransportForm.maxPassengers || Number(createTransportForm.maxPassengers) <= 0) {
      showToast('Validation Failed', 'Please enter a valid maximum passenger count.', 'error');
      return;
    }
    if (!createTransportForm.dailyRate || Number(createTransportForm.dailyRate) <= 0) {
      showToast('Validation Failed', 'Please enter a valid daily vehicle rate.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const startTimeIso = new Date(createTransportForm.startTime).toISOString();
      const endTimeIso = new Date(createTransportForm.endTime).toISOString();

      const payload = {
        startTimeUtc: startTimeIso,
        endTimeUtc: endTimeIso,
        departureTimeUtc: startTimeIso,
        arrivalTimeUtc: endTimeIso,
        vehicleType: createTransportForm.vehicleType,
        maxPassengers: Number(createTransportForm.maxPassengers),
        dailyRate: Number(createTransportForm.dailyRate),
        currency: createTransportForm.currency || 'LKR',
        status: 'AVAILABLE'
      };

      await api.post(`/api/transport/${defaultOptionId}/availability`, payload);
      showToast('Transport Slot Created', 'New vehicle capacity slot successfully published.', 'success');
      closeCreateTransport();
      fetchData();
    } catch (e: any) {
      showToast('Failed to Create Transport Slot', apiError(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Transport (PUT)
  const openEditTransport = (slot: TransportSlot) => {
    setEditingTransport(slot);
    setEditTransportForm({
      startTime: slot.startTimeUtc ? new Date(slot.startTimeUtc).toISOString().slice(0, 16) : '',
      endTime: slot.endTimeUtc ? new Date(slot.endTimeUtc).toISOString().slice(0, 16) : '',
      vehicleType: slot.vehicleType || 'VAN',
      maxPassengers: slot.maxPassengers,
      dailyRate: slot.dailyRate,
      currency: slot.currency || 'LKR',
      status: slot.status || 'AVAILABLE'
    });
  };

  const handleUpdateTransport = async () => {
    if (!editingTransport) return;

    if (!editTransportForm.startTime || !editTransportForm.endTime) {
      showToast('Validation Failed', 'Please select valid start and end times.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const startTimeIso = new Date(editTransportForm.startTime).toISOString();
      const endTimeIso = new Date(editTransportForm.endTime).toISOString();

      const payload = {
        startTimeUtc: startTimeIso,
        endTimeUtc: endTimeIso,
        departureTimeUtc: startTimeIso,
        arrivalTimeUtc: endTimeIso,
        vehicleType: editTransportForm.vehicleType,
        status: editTransportForm.status,
        maxPassengers: Number(editTransportForm.maxPassengers),
        dailyRate: Number(editTransportForm.dailyRate),
        currency: editTransportForm.currency || 'LKR',
        rowVersion: editingTransport.rowVersion
      };

      await api.put(`/api/transport/slots/${editingTransport.id}`, payload);
      showToast('Transport Slot Updated', 'Vehicle capacity slot changes saved successfully.', 'success');
      setEditingTransport(null);
      fetchData();
    } catch (e: any) {
      showToast('Failed to Update Transport Slot', apiError(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Transport Block/Unblock Status (PUT)
  const toggleTransportStatus = async (slot: TransportSlot) => {
    const newStatus = slot.status === 'AVAILABLE' ? 'BLOCKED' : 'AVAILABLE';
    try {
      const payload = {
        startTimeUtc: slot.startTimeUtc,
        endTimeUtc: slot.endTimeUtc,
        vehicleType: slot.vehicleType,
        status: newStatus,
        maxPassengers: slot.maxPassengers,
        dailyRate: slot.dailyRate,
        currency: slot.currency || 'LKR',
        rowVersion: slot.rowVersion
      };

      await api.put(`/api/transport/slots/${slot.id}`, payload);
      showToast(
        newStatus === 'BLOCKED' ? 'Slot Blocked' : 'Slot Available',
        `Transport slot status changed to ${newStatus}.`,
        'info'
      );
      fetchData();
    } catch (e: any) {
      showToast('Status Toggle Error', apiError(e), 'error');
    }
  };

  // Handle Delete Transport (DELETE)
  const handleDeleteTransport = async () => {
    if (!deletingTransport) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/transport/slots/${deletingTransport.id}`);
      showToast('Transport Slot Removed', 'Capacity slot has been deleted.', 'success');
      setDeletingTransport(null);
      fetchData();
    } catch (e: any) {
      showToast('Delete Failed', apiError(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create Attraction (POST)
  const handleCreateAttraction = async () => {
    if (!createAttractionForm.startTime || !createAttractionForm.endTime) {
      showToast('Validation Failed', 'Please select valid start and end attraction entry times.', 'error');
      return;
    }
    if (!createAttractionForm.maxCapacity || Number(createAttractionForm.maxCapacity) <= 0) {
      showToast('Validation Failed', 'Please enter a valid max visitor capacity.', 'error');
      return;
    }
    if (!createAttractionForm.priceAmount || Number(createAttractionForm.priceAmount) <= 0) {
      showToast('Validation Failed', 'Please enter a valid entrance ticket price.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        startTimeUtc: new Date(createAttractionForm.startTime).toISOString(),
        endTimeUtc: new Date(createAttractionForm.endTime).toISOString(),
        maxCapacity: Number(createAttractionForm.maxCapacity),
        bookedCapacity: 0,
        priceAmount: Number(createAttractionForm.priceAmount),
        currency: createAttractionForm.currency || 'LKR',
        notes: createAttractionForm.notes || '',
        status: 'AVAILABLE'
      };

      await api.post(`/api/attractions/${defaultOptionId}/availability`, payload);
      showToast('Attraction Quota Created', 'New attraction entrance capacity slot published.', 'success');
      closeCreateAttraction();
      fetchData();
    } catch (e: any) {
      showToast('Failed to Create Attraction Quota', apiError(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Attraction (PUT)
  const openEditAttraction = (slot: AttractionSlot) => {
    setEditingAttraction(slot);
    setEditAttractionForm({
      startTime: slot.startTimeUtc ? new Date(slot.startTimeUtc).toISOString().slice(0, 16) : '',
      endTime: slot.endTimeUtc ? new Date(slot.endTimeUtc).toISOString().slice(0, 16) : '',
      maxCapacity: slot.maxCapacity,
      bookedCapacity: slot.bookedCapacity,
      priceAmount: slot.priceAmount,
      currency: slot.currency || 'LKR',
      status: slot.status || 'AVAILABLE',
      notes: slot.notes || ''
    });
  };

  const handleUpdateAttraction = async () => {
    if (!editingAttraction) return;

    if (!editAttractionForm.startTime || !editAttractionForm.endTime) {
      showToast('Validation Failed', 'Please select valid start and end times.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        startTimeUtc: new Date(editAttractionForm.startTime).toISOString(),
        endTimeUtc: new Date(editAttractionForm.endTime).toISOString(),
        status: editAttractionForm.status,
        maxCapacity: Number(editAttractionForm.maxCapacity),
        bookedCapacity: Number(editAttractionForm.bookedCapacity),
        priceAmount: Number(editAttractionForm.priceAmount),
        currency: editAttractionForm.currency || 'LKR',
        notes: editAttractionForm.notes,
        rowVersion: editingAttraction.rowVersion
      };

      await api.put(`/api/attractions/slots/${editingAttraction.id}`, payload);
      showToast('Attraction Quota Updated', 'Entrance quota changes saved successfully.', 'success');
      setEditingAttraction(null);
      fetchData();
    } catch (e: any) {
      showToast('Failed to Update Attraction Quota', apiError(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Attraction Status (PUT)
  const toggleAttractionStatus = async (slot: AttractionSlot) => {
    const newStatus = slot.status === 'AVAILABLE' ? 'BLOCKED' : 'AVAILABLE';
    try {
      const payload = {
        startTimeUtc: slot.startTimeUtc,
        endTimeUtc: slot.endTimeUtc,
        status: newStatus,
        maxCapacity: slot.maxCapacity,
        bookedCapacity: slot.bookedCapacity,
        priceAmount: slot.priceAmount,
        currency: slot.currency || 'LKR',
        notes: slot.notes,
        rowVersion: slot.rowVersion
      };

      await api.put(`/api/attractions/slots/${slot.id}`, payload);
      showToast(
        newStatus === 'BLOCKED' ? 'Attraction Quota Blocked' : 'Attraction Quota Available',
        `Entrance status updated to ${newStatus}.`,
        'info'
      );
      fetchData();
    } catch (e: any) {
      showToast('Status Toggle Error', apiError(e), 'error');
    }
  };

  // Handle Delete Attraction (DELETE)
  const handleDeleteAttraction = async () => {
    if (!deletingAttraction) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/attractions/slots/${deletingAttraction.id}`);
      showToast('Attraction Quota Removed', 'Entrance slot has been deleted.', 'success');
      setDeletingAttraction(null);
      fetchData();
    } catch (e: any) {
      showToast('Delete Failed', apiError(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-[#0B131F] text-slate-100 p-6 md:p-10 font-sans relative selection:bg-[#C5A880]/30 selection:text-white"
    >
      {/* Subtle Luxury Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C5A880]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#C5A880] mb-2">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>CeylonMate Commercial Inventory</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#C5A880] via-[#E6CA65] to-amber-100">
            Transport & Attraction Capacity Engine
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time control center for vehicle seat allocations, route timings, and attraction entry quotas.
          </p>
        </div>
      </div>

      {/* Navigation & Action Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 bg-[#0F1A24]/90 p-3 rounded-2xl border border-[#C5A880]/20 backdrop-blur-xl shadow-xl">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {onTabChange && (
            <button
              onClick={() => onTabChange('guides')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#C5A880]/70 hover:text-[#C5A880] hover:bg-[#C5A880]/10 transition-all flex items-center gap-2 border border-transparent hover:border-[#C5A880]/20 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Guide Availability</span>
            </button>
          )}

          <div className="h-6 w-px bg-[#C5A880]/20 hidden sm:block mx-1" />

          <button
            onClick={() => setActiveSubTab('transport')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'transport'
                ? 'bg-gradient-to-r from-[#C5A880] to-[#E6CA65] text-[#0B131F] font-semibold shadow-lg shadow-[#C5A880]/20'
                : 'text-slate-300 hover:text-white hover:bg-[#C5A880]/10'
            }`}
          >
            <Bus className="w-4 h-4" />
            <span>Transport Slots</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
              activeSubTab === 'transport' ? 'bg-[#0B131F]/20 text-[#0B131F]' : 'bg-[#C5A880]/20 text-[#C5A880]'
            }`}>
              {transportSlots.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('attractions')}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'attractions'
                ? 'bg-gradient-to-r from-[#C5A880] to-[#E6CA65] text-[#0B131F] font-semibold shadow-lg shadow-[#C5A880]/20'
                : 'text-slate-300 hover:text-white hover:bg-[#C5A880]/10'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Attraction Slots</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
              activeSubTab === 'attractions' ? 'bg-[#0B131F]/20 text-[#0B131F]' : 'bg-[#C5A880]/20 text-[#C5A880]'
            }`}>
              {attractionSlots.length}
            </span>
          </button>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-3 self-end lg:self-auto">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl font-medium text-xs md:text-sm text-[#C5A880] bg-[#0F1A24]/80 border border-[#C5A880]/30 hover:bg-[#C5A880]/10 backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {activeSubTab === 'transport' ? (
            <button
              onClick={openCreateTransport}
              className="px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm text-[#0B131F] bg-gradient-to-r from-[#C5A880] via-[#D4AF37] to-[#E6CA65] hover:from-[#D4AF37] hover:to-[#C5A880] shadow-lg shadow-[#C5A880]/20 hover:shadow-[#C5A880]/40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Transport Slot</span>
            </button>
          ) : (
            <button
              onClick={openCreateAttraction}
              className="px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm text-[#0B131F] bg-gradient-to-r from-[#C5A880] via-[#D4AF37] to-[#E6CA65] hover:from-[#D4AF37] hover:to-[#C5A880] shadow-lg shadow-[#C5A880]/20 hover:shadow-[#C5A880]/40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Attraction Slot</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-[#0F1A24]/80 backdrop-blur-xl border border-[#C5A880]/30 rounded-2xl shadow-2xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <RefreshCw className="w-8 h-8 text-[#C5A880] animate-spin mb-4" />
            <p className="text-[#C5A880] font-serif text-lg">Synchronizing Capacity Slots...</p>
            <p className="text-xs text-slate-500 mt-1">Connecting to CeylonMate real-time availability engine</p>
          </div>
        ) : error ? (
          <div className="p-8 m-6 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-200 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-rose-300 font-serif">Logistics Synchronization Issue</h4>
              <p className="text-sm mt-1 opacity-90">{error}</p>
              <button
                onClick={fetchData}
                className="mt-3 text-xs bg-rose-900/60 hover:bg-rose-800/80 border border-rose-500/40 px-3 py-1.5 rounded-lg font-medium transition-all"
              >
                Retry Request
              </button>
            </div>
          </div>
        ) : activeSubTab === 'transport' ? (
          /* Transport Slots Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0B131F]/90 border-b border-[#C5A880]/20 text-[#C5A880] text-xs font-serif uppercase tracking-wider">
                  <th className="px-6 py-4">Vehicle & Route</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C5A880]/10 text-sm">
                {transportSlots.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center text-slate-400 font-sans">
                      <Bus className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-60" />
                      <p className="text-base font-serif text-slate-300">No transport capacity slots found.</p>
                      <p className="text-xs text-slate-500 mt-1">Click "Add Transport Slot" above to publish a new vehicle schedule.</p>
                    </td>
                  </tr>
                ) : (
                  transportSlots.map((slot) => {
                    const isAvailable = slot.status === 'AVAILABLE';
                    const isBlocked = slot.status === 'BLOCKED';

                    return (
                      <tr
                        key={slot.id}
                        className="hover:bg-[#C5A880]/5 transition-colors duration-150"
                      >
                        <td className="px-6 py-4">
                          <div className="font-serif font-medium text-slate-100 text-base flex items-center gap-2">
                            <Bus className="w-4 h-4 text-[#C5A880] shrink-0" />
                            <span>{slot.optionTitle || `${slot.vehicleType} Express Logistics Route`}</span>
                          </div>
                          <div className="text-xs text-slate-400 font-sans flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1 text-slate-400">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {new Date(slot.startTimeUtc).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {new Date(slot.startTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.endTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#C5A880]/10 border border-[#C5A880]/30 text-[#C5A880] font-mono">
                            {slot.vehicleType}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {isAvailable ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              AVAILABLE
                            </span>
                          ) : isBlocked ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              BLOCKED
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              {slot.status}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleTransportStatus(slot)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                                isAvailable
                                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}
                              title={isAvailable ? 'Block transport slot' : 'Unblock transport slot'}
                            >
                              {isAvailable ? (
                                <>
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Block</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Unblock</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => openEditTransport(slot)}
                              className="p-2 text-slate-400 hover:text-[#C5A880] hover:bg-[#C5A880]/10 rounded-lg transition-all cursor-pointer"
                              title="Edit Transport Slot"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setDeletingTransport(slot)}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                              title="Delete Transport Slot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Attraction Slots Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0B131F]/90 border-b border-[#C5A880]/20 text-[#C5A880] text-xs font-serif uppercase tracking-wider">
                  <th className="px-6 py-4">Attraction & Notes</th>
                  <th className="px-6 py-4">Time Window</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Quota Booked</th>
                  <th className="px-6 py-4">Ticket Price</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C5A880]/10 text-sm">
                {attractionSlots.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-sans">
                      <Ticket className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-60" />
                      <p className="text-base font-serif text-slate-300">No attraction quota slots found.</p>
                      <p className="text-xs text-slate-500 mt-1">Click "Add Attraction Slot" above to publish a new entrance quota.</p>
                    </td>
                  </tr>
                ) : (
                  attractionSlots.map((slot) => {
                    const isAvailable = slot.status === 'AVAILABLE';
                    const isBlocked = slot.status === 'BLOCKED';

                    return (
                      <tr
                        key={slot.id}
                        className="hover:bg-[#C5A880]/5 transition-colors duration-150"
                      >
                        <td className="px-6 py-4">
                          <div className="font-serif font-medium text-slate-100 text-base flex items-center gap-2">
                            <Ticket className="w-4 h-4 text-[#C5A880] shrink-0" />
                            <span>{slot.notes || 'Attraction Entry Quota'}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-300 font-sans flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {new Date(slot.startTimeUtc).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-400 font-sans flex items-center gap-1.5 mt-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {new Date(slot.startTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.endTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {isAvailable ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              AVAILABLE
                            </span>
                          ) : isBlocked ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              BLOCKED
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              {slot.status}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-200 font-medium font-mono text-sm">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span>{slot.bookedCapacity} / {slot.maxCapacity} tickets</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-bold text-[#C5A880] text-base font-mono">
                            {slot.currency || 'LKR'} {slot.priceAmount.toLocaleString()}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleAttractionStatus(slot)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                                isAvailable
                                  ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}
                              title={isAvailable ? 'Block attraction quota' : 'Unblock attraction quota'}
                            >
                              {isAvailable ? (
                                <>
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Block</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Unblock</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => openEditAttraction(slot)}
                              className="p-2 text-slate-400 hover:text-[#C5A880] hover:bg-[#C5A880]/10 rounded-lg transition-all cursor-pointer"
                              title="Edit Attraction Quota"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setDeletingAttraction(slot)}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                              title="Delete Attraction Quota"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Create Transport Slot */}
      <AnimatePresence>
        {isCreatingTransport && (
          <div className="fixed inset-0 bg-[#0B131F]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              variants={scaleInModalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-[#0F1A24] border border-[#C5A880]/30 shadow-2xl rounded-2xl w-full max-w-xl overflow-hidden p-6 text-slate-200 relative"
            >
              <div className="flex items-center justify-between border-b border-[#C5A880]/20 pb-4 mb-6">
                <div className="flex items-center gap-2 text-[#C5A880]">
                  <Bus className="w-5 h-5" />
                  <h3 className="font-serif font-bold text-xl text-white">Add Transport Capacity Slot</h3>
                </div>
                <button
                  onClick={closeCreateTransport}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Departure Time
                    </label>
                    <input
                      type="datetime-local"
                      value={createTransportForm.startTime}
                      onChange={(e) => setCreateTransportForm({ ...createTransportForm, startTime: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Arrival Time
                    </label>
                    <input
                      type="datetime-local"
                      value={createTransportForm.endTime}
                      onChange={(e) => setCreateTransportForm({ ...createTransportForm, endTime: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Vehicle Type
                    </label>
                    <select
                      value={createTransportForm.vehicleType}
                      onChange={(e) => setCreateTransportForm({ ...createTransportForm, vehicleType: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-[#0F1A24]">Select Vehicle Type...</option>
                      <option value="SEDAN" className="bg-[#0F1A24]">Sedan</option>
                      <option value="SUV" className="bg-[#0F1A24]">SUV</option>
                      <option value="VAN" className="bg-[#0F1A24]">Luxury Van</option>
                      <option value="MINI_BUS" className="bg-[#0F1A24]">Mini Bus</option>
                      <option value="BUS" className="bg-[#0F1A24]">Coach / Bus</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Maximum Passengers
                    </label>
                    <input
                      type="number"
                      value={createTransportForm.maxPassengers}
                      placeholder="e.g. 12"
                      onChange={(e) => setCreateTransportForm({ ...createTransportForm, maxPassengers: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Daily Vehicle Rate (LKR)
                    </label>
                    <input
                      type="number"
                      value={createTransportForm.dailyRate}
                      placeholder="e.g. 45000"
                      onChange={(e) => setCreateTransportForm({ ...createTransportForm, dailyRate: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Currency
                    </label>
                    <input
                      type="text"
                      value={createTransportForm.currency}
                      onChange={(e) => setCreateTransportForm({ ...createTransportForm, currency: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-[#C5A880]/20">
                <button
                  onClick={closeCreateTransport}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTransport}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#0B131F] bg-gradient-to-r from-[#C5A880] to-[#E6CA65] hover:from-[#E6CA65] hover:to-[#C5A880] shadow-lg shadow-[#C5A880]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Transport Slot'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Edit Transport Slot */}
      <AnimatePresence>
        {editingTransport && (
          <div className="fixed inset-0 bg-[#0B131F]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              variants={scaleInModalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-[#0F1A24] border border-[#C5A880]/30 shadow-2xl rounded-2xl w-full max-w-xl overflow-hidden p-6 text-slate-200 relative"
            >
              <div className="flex items-center justify-between border-b border-[#C5A880]/20 pb-4 mb-6">
                <div className="flex items-center gap-2 text-[#C5A880]">
                  <Edit3 className="w-5 h-5" />
                  <h3 className="font-serif font-bold text-xl text-white">Edit Transport Capacity Slot</h3>
                </div>
                <button
                  onClick={() => setEditingTransport(null)}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Departure Time
                    </label>
                    <input
                      type="datetime-local"
                      value={editTransportForm.startTime}
                      onChange={(e) => setEditTransportForm({ ...editTransportForm, startTime: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Arrival Time
                    </label>
                    <input
                      type="datetime-local"
                      value={editTransportForm.endTime}
                      onChange={(e) => setEditTransportForm({ ...editTransportForm, endTime: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Vehicle Type
                    </label>
                    <select
                      value={editTransportForm.vehicleType}
                      onChange={(e) => setEditTransportForm({ ...editTransportForm, vehicleType: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors cursor-pointer"
                    >
                      <option value="SEDAN" className="bg-[#0F1A24]">Sedan</option>
                      <option value="SUV" className="bg-[#0F1A24]">SUV</option>
                      <option value="VAN" className="bg-[#0F1A24]">Luxury Van</option>
                      <option value="MINI_BUS" className="bg-[#0F1A24]">Mini Bus</option>
                      <option value="BUS" className="bg-[#0F1A24]">Coach / Bus</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Status
                    </label>
                    <select
                      value={editTransportForm.status}
                      onChange={(e) => setEditTransportForm({ ...editTransportForm, status: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors cursor-pointer"
                    >
                      <option value="AVAILABLE" className="bg-[#0F1A24]">AVAILABLE</option>
                      <option value="RESERVED" className="bg-[#0F1A24]">RESERVED</option>
                      <option value="BOOKED" className="bg-[#0F1A24]">BOOKED</option>
                      <option value="BLOCKED" className="bg-[#0F1A24]">BLOCKED</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Maximum Passengers
                    </label>
                    <input
                      type="number"
                      value={editTransportForm.maxPassengers}
                      onChange={(e) => setEditTransportForm({ ...editTransportForm, maxPassengers: Number(e.target.value) })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Daily Vehicle Rate
                    </label>
                    <input
                      type="number"
                      value={editTransportForm.dailyRate}
                      onChange={(e) => setEditTransportForm({ ...editTransportForm, dailyRate: Number(e.target.value) })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                    />
                  </div>
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-[#C5A880]/20">
                <button
                  onClick={() => setEditingTransport(null)}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTransport}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#0B131F] bg-gradient-to-r from-[#C5A880] to-[#E6CA65] hover:from-[#E6CA65] hover:to-[#C5A880] shadow-lg shadow-[#C5A880]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving Changes...' : 'Save Slot Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Delete Transport Confirmation */}
      <AnimatePresence>
        {deletingTransport && (
          <div className="fixed inset-0 bg-[#0B131F]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              variants={scaleInModalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-[#0F1A24] border border-rose-500/30 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden p-6 text-slate-200 relative"
            >
              <div className="flex items-center gap-3 text-rose-400 mb-4">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="font-serif font-bold text-xl text-white">Delete Transport Slot</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Are you sure you want to delete this transport slot? Any pending reservations linked to this slot will be canceled.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeletingTransport(null)}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTransport}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Create Attraction Slot */}
      <AnimatePresence>
        {isCreatingAttraction && (
          <div className="fixed inset-0 bg-[#0B131F]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              variants={scaleInModalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-[#0F1A24] border border-[#C5A880]/30 shadow-2xl rounded-2xl w-full max-w-xl overflow-hidden p-6 text-slate-200 relative"
            >
              <div className="flex items-center justify-between border-b border-[#C5A880]/20 pb-4 mb-6">
                <div className="flex items-center gap-2 text-[#C5A880]">
                  <Ticket className="w-5 h-5" />
                  <h3 className="font-serif font-bold text-xl text-white">Add Attraction Quota Slot</h3>
                </div>
                <button
                  onClick={closeCreateAttraction}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Window Start Time
                    </label>
                    <input
                      type="datetime-local"
                      value={createAttractionForm.startTime}
                      onChange={(e) => setCreateAttractionForm({ ...createAttractionForm, startTime: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Window End Time
                    </label>
                    <input
                      type="datetime-local"
                      value={createAttractionForm.endTime}
                      onChange={(e) => setCreateAttractionForm({ ...createAttractionForm, endTime: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Max Visitor Capacity
                    </label>
                    <input
                      type="number"
                      value={createAttractionForm.maxCapacity}
                      placeholder="e.g. 100"
                      onChange={(e) => setCreateAttractionForm({ ...createAttractionForm, maxCapacity: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Ticket Price (LKR)
                    </label>
                    <input
                      type="number"
                      value={createAttractionForm.priceAmount}
                      placeholder="e.g. 2000"
                      onChange={(e) => setCreateAttractionForm({ ...createAttractionForm, priceAmount: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                    Notes / Attraction Inclusions
                  </label>
                  <input
                    type="text"
                    value={createAttractionForm.notes}
                    placeholder="e.g. Kandy Cultural & Heritage Tour Entrance"
                    onChange={(e) => setCreateAttractionForm({ ...createAttractionForm, notes: e.target.value })}
                    className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-[#C5A880]/20">
                <button
                  onClick={closeCreateAttraction}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAttraction}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#0B131F] bg-gradient-to-r from-[#C5A880] to-[#E6CA65] hover:from-[#E6CA65] hover:to-[#C5A880] shadow-lg shadow-[#C5A880]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Attraction Quota'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Edit Attraction Slot */}
      <AnimatePresence>
        {editingAttraction && (
          <div className="fixed inset-0 bg-[#0B131F]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              variants={scaleInModalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-[#0F1A24] border border-[#C5A880]/30 shadow-2xl rounded-2xl w-full max-w-xl overflow-hidden p-6 text-slate-200 relative"
            >
              <div className="flex items-center justify-between border-b border-[#C5A880]/20 pb-4 mb-6">
                <div className="flex items-center gap-2 text-[#C5A880]">
                  <Edit3 className="w-5 h-5" />
                  <h3 className="font-serif font-bold text-xl text-white">Edit Attraction Entrance Quota</h3>
                </div>
                <button
                  onClick={() => setEditingAttraction(null)}
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Window Start Time
                    </label>
                    <input
                      type="datetime-local"
                      value={editAttractionForm.startTime}
                      onChange={(e) => setEditAttractionForm({ ...editAttractionForm, startTime: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Window End Time
                    </label>
                    <input
                      type="datetime-local"
                      value={editAttractionForm.endTime}
                      onChange={(e) => setEditAttractionForm({ ...editAttractionForm, endTime: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Status
                    </label>
                    <select
                      value={editAttractionForm.status}
                      onChange={(e) => setEditAttractionForm({ ...editAttractionForm, status: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors cursor-pointer"
                    >
                      <option value="AVAILABLE" className="bg-[#0F1A24]">AVAILABLE</option>
                      <option value="RESERVED" className="bg-[#0F1A24]">RESERVED</option>
                      <option value="BOOKED" className="bg-[#0F1A24]">BOOKED</option>
                      <option value="BLOCKED" className="bg-[#0F1A24]">BLOCKED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Max Capacity
                    </label>
                    <input
                      type="number"
                      value={editAttractionForm.maxCapacity}
                      onChange={(e) => setEditAttractionForm({ ...editAttractionForm, maxCapacity: Number(e.target.value) })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Booked Capacity
                    </label>
                    <input
                      type="number"
                      value={editAttractionForm.bookedCapacity}
                      onChange={(e) => setEditAttractionForm({ ...editAttractionForm, bookedCapacity: Number(e.target.value) })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Ticket Price (LKR)
                    </label>
                    <input
                      type="number"
                      value={editAttractionForm.priceAmount}
                      onChange={(e) => setEditAttractionForm({ ...editAttractionForm, priceAmount: Number(e.target.value) })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                    Notes / Attraction Inclusions
                  </label>
                  <input
                    type="text"
                    value={editAttractionForm.notes}
                    onChange={(e) => setEditAttractionForm({ ...editAttractionForm, notes: e.target.value })}
                    className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-[#C5A880]/20">
                <button
                  onClick={() => setEditingAttraction(null)}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAttraction}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-[#0B131F] bg-gradient-to-r from-[#C5A880] to-[#E6CA65] hover:from-[#E6CA65] hover:to-[#C5A880] shadow-lg shadow-[#C5A880]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving Changes...' : 'Save Quota Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Delete Attraction Confirmation */}
      <AnimatePresence>
        {deletingAttraction && (
          <div className="fixed inset-0 bg-[#0B131F]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              variants={scaleInModalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-[#0F1A24] border border-rose-500/30 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden p-6 text-slate-200 relative"
            >
              <div className="flex items-center gap-3 text-rose-400 mb-4">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="font-serif font-bold text-xl text-white">Delete Attraction Quota</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Are you sure you want to delete this attraction entrance quota? Any active bookings associated with this slot will be affected.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeletingAttraction(null)}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAttraction}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
