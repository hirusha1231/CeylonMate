import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  UserCheck,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  LogOut,
  AlertTriangle,
  X,
  ShieldCheck,
  Sparkles,
  Users,
  Tag,
  Info,
  Lock
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../api/client';
import { fadeInVariants, scaleInModalVariants } from '../utils/animations';

export interface GuideSlot {
  id: string;
  localGuideUserId: string;
  guideProfileId?: string;
  startTimeUtc: string;
  endTimeUtc: string;
  slotType: string;
  status: string;
  maxCapacity: number;
  bookedCapacity: number;
  priceAmount: number;
  currency: string;
  notes?: string;
  rowVersion?: string;
  bookedFrom?: string | null;
  bookedUntil?: string | null;
  bookedDays?: number;
  availableAgain?: string | null;
  isCurrentlyBooked?: boolean;
  guideName?: string | null;
  guideEmail?: string | null;
  licenseNumber?: string | null;
}

export interface GuideOption {
  id: string;
  name: string;
  email: string;
}

interface GuideAvailabilityPageProps {
  activeTab?: 'guides' | 'capacity';
  onTabChange?: (tab: 'guides' | 'capacity') => void;
}

const initialCreateForm = {
  guideId: '',
  startTime: '',
  endTime: '',
  slotType: '',
  priceAmount: '',
  maxCapacity: '',
  notes: ''
};

export const GuideAvailabilityPage: React.FC<GuideAvailabilityPageProps> = ({
  activeTab = 'guides',
  onTabChange
}) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [slots, setSlots] = useState<GuideSlot[]>([]);
  const [guideOptions, setGuideOptions] = useState<GuideOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Edit Modal State
  const [editingSlot, setEditingSlot] = useState<GuideSlot | null>(null);
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEndTime, setEditEndTime] = useState<string>('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editCapacity, setEditCapacity] = useState<number>(1);
  const [editSlotType, setEditSlotType] = useState<string>('FULL_DAY');
  const [editStatus, setEditStatus] = useState<string>('AVAILABLE');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Delete Modal State
  const [deletingSlot, setDeletingSlot] = useState<GuideSlot | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Create Modal State
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const queryGuideId = '00000000-0000-0000-0000-000000000000';

  const fetchGuideOptions = async () => {
    try {
      const res = await api.get<GuideOption[]>('/api/guides/options');
      setGuideOptions(res.data || []);
    } catch (err) {
      console.error('Error fetching guide options:', err);
    }
  };

  const fetchSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<GuideSlot[]>(`/api/guides/${queryGuideId}/availability`);
      setSlots(res.data || []);
    } catch (e: any) {
      console.error('Error fetching guide availability:', e);
      const errMsg = apiError(e);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    fetchGuideOptions();
  }, []);

  const openCreateModal = () => {
    setCreateForm(initialCreateForm);
    setIsCreating(true);
    fetchGuideOptions();
  };

  const closeCreateModal = () => {
    setCreateForm(initialCreateForm);
    setIsCreating(false);
  };

  const handleCreate = async () => {
    if (!createForm.guideId) {
      showToast('Validation Error', 'Please select a guide.', 'error');
      return;
    }
    if (!createForm.startTime) {
      showToast('Validation Error', 'Please select a slot date.', 'error');
      return;
    }
    if (!createForm.slotType) {
      showToast('Validation Error', 'Please select a slot type.', 'error');
      return;
    }
    if (createForm.notes && /\d/.test(createForm.notes)) {
      showToast('Validation Error', 'Notes / Tour Excerpt must contain letters only. Numbers are not allowed.', 'error');
      return;
    }

    const startUtc = new Date(createForm.startTime);
    const endUtc = new Date(createForm.startTime);

    if (createForm.slotType === 'HALF_DAY_MORNING') {
      startUtc.setUTCHours(8, 0, 0, 0);
      endUtc.setUTCHours(13, 0, 0, 0);
    } else if (createForm.slotType === 'HALF_DAY_AFTERNOON') {
      startUtc.setUTCHours(13, 0, 0, 0);
      endUtc.setUTCHours(18, 0, 0, 0);
    } else {
      startUtc.setUTCHours(8, 0, 0, 0);
      endUtc.setUTCHours(18, 0, 0, 0);
    }

    setIsSubmitting(true);
    try {
      const payload = {
        startTimeUtc: startUtc.toISOString(),
        endTimeUtc: endUtc.toISOString(),
        slotType: createForm.slotType,
        maxCapacity: Number(createForm.maxCapacity) || 1,
        priceAmount: Number(createForm.priceAmount) || 15000,
        currency: 'LKR',
        notes: createForm.notes?.trim() || '',
      };

      await api.post(`/api/guides/${createForm.guideId}/availability`, payload);
      showToast('Slot Created Successfully', 'New guide availability slot published to database.', 'success');
      closeCreateModal();
      fetchSlots();
    } catch (e: any) {
      console.error('Error creating slot:', e.response?.data || e);
      const serverError =
        e.response?.data?.message ||
        e.response?.data?.title ||
        (e.response?.data?.errors ? JSON.stringify(e.response.data.errors) : null) ||
        e.message ||
        'Failed to create guide slot';
      showToast(`Creation Error (${e.response?.status || 'Network'})`, serverError, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (slot: GuideSlot) => {
    if (slot.status.toUpperCase() === 'BOOKED') {
      showToast('Action Prohibited', 'Cannot edit a slot that is already booked. Cancel or reassign the booking first.', 'error');
      return;
    }
    setEditingSlot(slot);
    setEditPrice(slot.priceAmount);
    setEditCapacity(slot.maxCapacity);
    setEditSlotType(slot.slotType);
    setEditStatus(slot.status);
    setEditNotes(slot.notes || '');
    setEditStartTime(new Date(slot.startTimeUtc).toISOString().slice(0, 10));
    setEditEndTime(new Date(slot.endTimeUtc).toISOString().slice(0, 10));
  };

  const handleUpdate = async () => {
    if (!editingSlot) return;

    if (editingSlot.status.toUpperCase() === 'BOOKED') {
      showToast('Action Prohibited', 'Cannot update an active booked slot.', 'error');
      return;
    }

    if (!editStartTime || !editEndTime) {
      showToast('Validation Error', 'Please select both Start Date and End Date.', 'error');
      return;
    }
    if (new Date(editEndTime) < new Date(editStartTime)) {
      showToast('Validation Error', 'End Date must be at or after Start Date.', 'error');
      return;
    }
    if (editNotes && /\d/.test(editNotes)) {
      showToast('Validation Error', 'Notes / Tour Excerpt must contain letters only. Numbers are not allowed.', 'error');
      return;
    }

    setIsUpdating(true);
    try {
      const updatePayload = {
        startTimeUtc: new Date(editStartTime).toISOString(),
        endTimeUtc: new Date(editEndTime).toISOString(),
        slotType: editSlotType,
        status: editStatus,
        maxCapacity: Number(editCapacity),
        priceAmount: Number(editPrice),
        currency: editingSlot.currency || 'LKR',
        notes: editNotes?.trim() || '',
        rowVersion: editingSlot.rowVersion || null,
      };

      const res = await api.put(`/api/guides/availability/${editingSlot.id}`, updatePayload);

      if (res.status === 200 || res.status === 204) {
        showToast('Slot Updated Successfully', 'Guide availability slot has been updated.', 'success');
        setEditingSlot(null);
        fetchSlots();
      }
    } catch (error: any) {
      console.error('Detailed Slot Update Error:', error.response?.data || error);
      const serverError =
        error.response?.data?.message ||
        error.response?.data?.title ||
        (error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : null) ||
        error.message ||
        'Failed to update slot';
      showToast(`Update Error (${error.response?.status || 'Network'})`, serverError, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSlot) return;

    if (deletingSlot.status.toUpperCase() === 'BOOKED') {
      showToast('Action Prohibited', 'Cannot delete an active booked slot. Cancel the confirmed booking first.', 'error');
      setDeletingSlot(null);
      return;
    }

    setIsDeleting(true);
    try {
      try {
        await api.delete(`/api/guides/availability/${deletingSlot.id}`);
      } catch {
        try {
          await api.delete(`/api/capacity/guides/slots/${deletingSlot.id}`);
        } catch {
          await api.delete(`/api/guides/slots/${deletingSlot.id}`);
        }
      }
      showToast('Slot Deleted', 'Guide availability slot has been removed from database.', 'info');
      setDeletingSlot(null);
      fetchSlots();
    } catch (e: any) {
      console.error('Error deleting slot:', e.response?.data || e);
      const serverError =
        e.response?.data?.message ||
        e.response?.data?.title ||
        e.message ||
        'Cannot delete slot with active reservations or holds.';
      showToast(`Delete Error (${e.response?.status || 'Network'})`, serverError, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSlots = slots.filter((s) => {
    if (statusFilter === 'ALL') return true;
    return s.status.toUpperCase() === statusFilter.toUpperCase();
  });

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'AVAILABLE':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40';
      case 'RESERVED':
        return 'bg-amber-950/60 text-amber-300 border-amber-500/40';
      case 'BOOKED':
        return 'bg-blue-950/60 text-blue-300 border-blue-500/40';
      case 'BLOCKED':
        return 'bg-rose-950/60 text-rose-400 border-rose-500/40';
      default:
        return 'bg-slate-900 text-stone-300 border-stone-700';
    }
  };

  const formatSlotType = (type: string) => {
    switch (type) {
      case 'FULL_DAY': return 'Full Day';
      case 'HALF_DAY_MORNING': return 'Half Day (Morning)';
      case 'HALF_DAY_AFTERNOON': return 'Half Day (Afternoon)';
      case 'HOURLY': return 'Hourly';
      default: return type.replace(/_/g, ' ');
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
      {/* MAIN CONTENT WRAPPER */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 space-y-6">
        {/* SUB NAVIGATION PILL TOGGLE GROUP */}
        <div className="flex flex-wrap items-center gap-2 bg-[#0F1A24]/90 p-2.5 rounded-2xl border border-[#C5A880]/20 backdrop-blur-xl shadow-xl w-fit">
          <button
            onClick={() => onTabChange?.('guides')}
            className={`px-5 py-2.5 rounded-xl font-medium text-xs md:text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${activeTab === 'guides'
              ? 'bg-gradient-to-r from-[#C5A880] to-[#E6CA65] text-[#0B131F] font-bold shadow-lg shadow-[#C5A880]/20'
              : 'text-slate-300 hover:text-white hover:bg-[#C5A880]/10'
              }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Guide Availability</span>
          </button>
          <button
            onClick={() => onTabChange?.('capacity')}
            className={`px-5 py-2.5 rounded-xl font-medium text-xs md:text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${activeTab === 'capacity'
              ? 'bg-gradient-to-r from-[#C5A880] to-[#E6CA65] text-[#0B131F] font-bold shadow-lg shadow-[#C5A880]/20'
              : 'text-slate-300 hover:text-white hover:bg-[#C5A880]/10'
              }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Transport Inventory</span>
          </button>
        </div>
        {/* ACTION BAR HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F1A24]/60 backdrop-blur-xl p-6 rounded-2xl border border-[#C5A880]/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#C5A880] font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              Local Guide Roster
            </div>
            <h2 className="text-2xl font-serif-luxury font-bold text-stone-100">
              Guide Availability Management
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Publish, update, and manage local guide daily schedules and active availability slots.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSlots}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-stone-300 border border-stone-700/60 text-xs font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-[#C5A880] ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#C5A880]/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Guide Slot</span>
            </button>
          </div>
        </div>

        {/* STATUS FILTER BAR */}
        <div className="flex flex-wrap items-center gap-2 bg-[#0F1A24]/40 p-3 rounded-2xl border border-stone-800/80">
          <span className="text-xs font-mono text-stone-400 font-semibold px-2 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#C5A880]" />
            Status:
          </span>
          {['ALL', 'AVAILABLE', 'RESERVED', 'BOOKED', 'BLOCKED'].map((st) => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${isActive
                  ? 'bg-[#C5A880]/20 text-[#C5A880] border border-[#C5A880] shadow-sm'
                  : 'text-stone-400 hover:text-white bg-slate-900/50 border border-stone-800 hover:border-stone-700'
                  }`}
              >
                {st}
              </button>
            );
          })}
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 text-rose-200 text-xs flex items-center gap-3 shadow-lg">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* LUXURY DATA TABLE */}
        <div className="bg-[#0F1A24]/80 backdrop-blur-xl border border-[#C5A880]/20 rounded-2xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="p-12 text-center text-stone-400 text-xs space-y-3">
              <RefreshCw className="w-8 h-8 text-[#C5A880] animate-spin mx-auto" />
              <p className="font-mono">Loading luxury guide availability slots...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-stone-800 text-[11px] font-mono uppercase tracking-wider text-[#C5A880]">
                    <th className="px-5 py-4 font-semibold">Guide & Slot Date</th>
                    <th className="px-5 py-4 font-semibold">Booking Period & Schedule</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Notes / Excerpt</th>
                    <th className="px-5 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 text-xs font-sans">
                  {filteredSlots.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-stone-400 space-y-2">
                        <Info className="w-8 h-8 text-stone-600 mx-auto" />
                        <p className="font-medium text-stone-300">No guide availability slots found matching your filter.</p>
                        <p className="text-[11px] text-stone-500">Try changing the status filter or add a new guide slot.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSlots.map((slot) => {
                      const isBooked = slot.status.toUpperCase() === 'BOOKED' || slot.isCurrentlyBooked;
                      return (
                        <tr
                          key={slot.id}
                          className="hover:bg-white/[0.03] transition-colors group"
                        >
                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 font-medium text-stone-100">
                                <Calendar className="w-4 h-4 text-[#C5A880] shrink-0" />
                                <span>{formatDate(slot.startTimeUtc)}</span>
                              </div>
                              {slot.guideName && (
                                <div className="text-[11px] text-[#C5A880] font-mono flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-[#C5A880]" />
                                  <span>{slot.guideName}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {isBooked ? (
                              <div className="bg-slate-900/90 border border-blue-500/30 rounded-xl p-2.5 space-y-1.5 min-w-[260px] shadow-inner">
                                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                                  <div>
                                    <span className="text-stone-400 text-[10px] uppercase block">Booked From</span>
                                    <span className="text-white font-semibold">{formatDate(slot.bookedFrom || slot.startTimeUtc)}</span>
                                  </div>
                                  <div>
                                    <span className="text-stone-400 text-[10px] uppercase block">Booked Until</span>
                                    <span className="text-white font-semibold">{formatDate(slot.bookedUntil || slot.endTimeUtc)}</span>
                                  </div>
                                </div>
                                <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono">
                                  <span className="text-blue-300 font-medium">
                                    Booked Days: {slot.bookedDays && slot.bookedDays > 0 ? `${slot.bookedDays} Days` : '1 Day'}
                                  </span>
                                  <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 text-[10px]">
                                    Available Again: {formatDate(slot.availableAgain || slot.endTimeUtc)}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-stone-400 flex items-center gap-2 text-[11px] font-mono">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-emerald-300/90 font-medium">Available for booking</span>
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border shadow-sm ${getStatusBadgeClass(slot.status)}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                              {slot.status}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-stone-300 max-w-xs truncate">
                            {slot.notes ? (
                              <span title={slot.notes}>{slot.notes}</span>
                            ) : (
                              <span className="text-stone-600 italic">No notes provided</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isBooked ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-300 text-[11px] font-mono">
                                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                                  Locked (Booked)
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => openEditModal(slot)}
                                    title="Edit Slot"
                                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-[#C5A880]/20 text-stone-300 hover:text-[#D4AF37] border border-stone-700/60 hover:border-[#C5A880]/60 transition-all shadow-sm cursor-pointer"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => setDeletingSlot(slot)}
                                    title="Delete Slot"
                                    className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/60 text-stone-300 hover:text-rose-400 border border-stone-700/60 hover:border-rose-500/50 transition-all shadow-sm cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
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
      </div>

      {/* CREATE SLOT MODAL */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              variants={scaleInModalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-[#0F1A24] border border-[#C5A880]/30 rounded-2xl shadow-2xl p-6 max-w-lg w-full space-y-6 text-stone-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#C5A880]/10 border border-[#C5A880]/30 text-[#D4AF37]">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif-luxury font-bold text-stone-100">
                      Add New Guide Slot
                    </h3>
                    <p className="text-xs text-stone-400">Publish availability to the platform</p>
                  </div>
                </div>
                <button
                  onClick={closeCreateModal}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Guide Selection</label>
                  <select
                    value={createForm.guideId}
                    onChange={(e) => setCreateForm({ ...createForm, guideId: e.target.value })}
                    className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none"
                  >
                    <option value="">Select a Certified Guide...</option>
                    {guideOptions.length > 0 ? (
                      guideOptions.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.email})
                        </option>
                      ))
                    ) : (
                      <option value="00000000-0000-0000-0000-000000000001">
                        Default System Guide (00000000-0000-0000-0000-000000000001)
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Slot Date</label>
                  <input
                    type="date"
                    value={createForm.startTime}
                    onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                    className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none font-mono scheme-dark"
                  />
                </div>



                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Notes / Tour Excerpt (Letters Only)</label>
                  <input
                    type="text"
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value.replace(/[0-9]/g, '') })}
                    placeholder="e.g. Kandy Cultural and Heritage Tour"
                    className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  onClick={closeCreateModal}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-stone-300 border border-stone-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-black text-xs font-bold shadow-lg hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Slot</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT SLOT MODAL */}
      <AnimatePresence>
        {editingSlot && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              variants={scaleInModalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-[#0F1A24] border border-[#C5A880]/30 rounded-2xl shadow-2xl p-6 max-w-lg w-full space-y-6 text-stone-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#C5A880]/10 border border-[#C5A880]/30 text-[#D4AF37]">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif-luxury font-bold text-stone-100">
                      Edit Guide Availability Slot
                    </h3>
                    <p className="text-xs text-stone-400">Update schedule, capacity, status, or pricing</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingSlot(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">Start Date</label>
                    <input
                      type="date"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none font-mono scheme-dark"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">End Date</label>
                    <input
                      type="date"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none font-mono scheme-dark"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">Slot Duration</label>
                    <select
                      value={editSlotType}
                      onChange={(e) => setEditSlotType(e.target.value)}
                      className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none"
                    >
                      <option value="FULL_DAY">Full Day</option>
                      <option value="HALF_DAY_MORNING">Morning (Half Day)</option>
                      <option value="HALF_DAY_AFTERNOON">Afternoon (Half Day)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none"
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="RESERVED">RESERVED</option>
                      <option value="BOOKED">BOOKED</option>
                      <option value="BLOCKED">BLOCKED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Notes / Tour Excerpt (Letters Only)</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value.replace(/[0-9]/g, ''))}
                    placeholder="e.g. Kandy Cultural and Heritage Tour"
                    className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3.5 py-2.5 text-stone-100 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  onClick={() => setEditingSlot(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-stone-300 border border-stone-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-black text-xs font-bold shadow-lg hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingSlot && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              variants={scaleInModalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-[#0F1A24] border border-rose-500/30 rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-6 text-stone-100"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-stone-800">
                <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-serif-luxury font-bold text-rose-300">
                    Confirm Delete Slot
                  </h3>
                  <p className="text-xs text-stone-400">This action cannot be undone</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-stone-300">
                  Are you sure you want to delete this guide slot for{' '}
                  <strong className="text-stone-100 font-semibold">
                    {new Date(deletingSlot.startTimeUtc).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </strong>?
                </p>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-stone-800 space-y-1 font-mono text-[11px] text-stone-400">
                  <div className="flex justify-between">
                    <span>Slot Type:</span>
                    <span className="text-stone-200 font-semibold">{formatSlotType(deletingSlot.slotType)}</span>
                  </div>
                </div>

                {deletingSlot.bookedCapacity > 0 && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>
                      ⚠️ Warning: This slot has active reservations ({deletingSlot.bookedCapacity} booked). Deletion will be rejected by server.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  onClick={() => setDeletingSlot(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-stone-300 border border-stone-700 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 text-white text-xs font-bold shadow-lg hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Slot</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
};
