import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCheck,
  Bus,
  Ticket,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Sparkles,
  Users,
  Tag,
  AlertTriangle,
  Slash,
  Calendar,
  Clock,
  Car,
  Bell,
  Lock
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../context/ToastContext';
import { api, apiError } from '../../api/client';
import { fadeInVariants, scaleInModalVariants } from '../../utils/animations';
import { FleetCatalogManagerModal } from '../../components/fleet/FleetCatalogManagerModal';
import { AddVehicleSlotModal } from '../../components/capacity/AddVehicleSlotModal';
import { TransportInventoryTable } from '../../components/capacity/TransportInventoryTable';

// Interfaces
export interface GuideSlot {
  id: string;
  localGuideUserId: string;
  guideName?: string;
  guideEmail?: string;
  licenseNumber?: string;
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
}

export interface GuideOption {
  id: string;
  fullName?: string;
  name?: string;
  email: string;
}

export interface TransportSlot {
  id: string;
  vehicleCatalogId?: string;
  vehicleCatalog?: any;
  transportOptionId?: string;
  optionTitle?: string;
  routeDescription?: string;
  vehicleType: string;
  departureTime?: string;
  arrivalTime?: string;
  startTimeUtc: string;
  endTimeUtc: string;
  status: string;
  maxPassengers: number;
  dailyRate: number;
  currency: string;
  heldUntilUtc?: string | null;
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

// Initial Form States
const initialCreateGuideForm = {
  guideId: '',
  startTime: '',
  endTime: '',
  slotType: 'FULL_DAY',
  priceAmount: '',
  maxCapacity: '',
  notes: ''
};

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

export const CapacityDeskPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Unified Tab Controller State
  const [activeTab, setActiveTab] = useState<'GUIDES' | 'TRANSPORT'>('GUIDES');
  const [transportSubTab, setTransportSubTab] = useState<'VEHICLES' | 'ATTRACTIONS'>('VEHICLES');
  const [isFleetModalOpen, setIsFleetModalOpen] = useState(false);
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [releasingHolds, setReleasingHolds] = useState(false);

  // Vehicle Hold Notifications & Rejection Modal State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [rejectingBookingId, setRejectingBookingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [submittingRejection, setSubmittingRejection] = useState(false);

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Release Expired Checkout Holds
  const handleReleaseExpiredHolds = async () => {
    setReleasingHolds(true);
    try {
      const res = await api.post<{ releasedCount: number; message: string }>('/api/capacity/holds/release-expired');
      showToast(
        'Expired Holds Released',
        res.data?.message || `Expired checkout holds released successfully (${res.data?.releasedCount || 0} released).`,
        'success'
      );
      if (activeTab === 'GUIDES') {
        fetchGuideSlots();
      } else {
        fetchTransportData();
      }
    } catch (err: any) {
      showToast('Release Failed', apiError(err), 'error');
    } finally {
      setReleasingHolds(false);
    }
  };

  // Guide State
  const [guideSlots, setGuideSlots] = useState<GuideSlot[]>([]);
  const [guideOptions, setGuideOptions] = useState<GuideOption[]>([]);
  const [guideFilter, setGuideFilter] = useState<string>('ALL');

  // Transport & Attraction State
  const [transportSlots, setTransportSlots] = useState<TransportSlot[]>([]);
  const [attractionSlots, setAttractionSlots] = useState<AttractionSlot[]>([]);
  const [transportFilter, setTransportFilter] = useState<string>('ALL');

  // Modals: Guide Create/Edit/Delete
  const [isCreatingGuide, setIsCreatingGuide] = useState(false);
  const [createGuideForm, setCreateGuideForm] = useState(initialCreateGuideForm);
  const [editingGuideSlot, setEditingGuideSlot] = useState<GuideSlot | null>(null);
  const [editGuideForm, setEditGuideForm] = useState({
    startTime: '',
    endTime: '',
    slotType: 'FULL_DAY',
    priceAmount: 0,
    maxCapacity: 1,
    status: 'AVAILABLE',
    notes: ''
  });
  const [deletingGuideSlot, setDeletingGuideSlot] = useState<GuideSlot | null>(null);

  // Modals: Transport Create/Edit/Delete
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

  // Modals: Attraction Create/Edit/Delete
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

  const defaultGuid = '00000000-0000-0000-0000-000000000000';
  const defaultOptionId = '00000000-0000-0000-0000-000000000001';

  // 1. Fetch Guide Slots & Guide Users
  const fetchGuideSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try /api/capacity/guides/slots endpoint first
      const res = await api.get<GuideSlot[]>('/api/capacity/guides/slots');
      setGuideSlots(res.data || []);
    } catch {
      try {
        // Fallback to /api/guides endpoint
        const fallbackRes = await api.get<GuideSlot[]>(`/api/guides/${defaultGuid}/availability`);
        setGuideSlots(fallbackRes.data || []);
      } catch (err: any) {
        setError(apiError(err));
        showToast('Guide Data Error', apiError(err), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchGuideOptions = async () => {
    try {
      const res = await api.get<GuideOption[]>('/api/admin/users?role=LOCAL_GUIDE');
      setGuideOptions(res.data || []);
    } catch {
      try {
        const fallbackRes = await api.get<GuideOption[]>('/api/guides/options');
        setGuideOptions(fallbackRes.data || []);
      } catch (err: any) {
        console.warn('Failed to load guide users:', err);
      }
    }
  };

  // 2. Fetch Transport/Attraction Data
  const fetchTransportData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (transportSubTab === 'VEHICLES') {
        try {
          const res = await api.get<TransportSlot[]>('/api/capacity/transport/slots');
          setTransportSlots(res.data || []);
        } catch {
          const fallbackRes = await api.get<TransportSlot[]>(`/api/transport/${defaultOptionId}/availability`);
          setTransportSlots(fallbackRes.data || []);
        }
      } else {
        const res = await api.get<AttractionSlot[]>(`/api/attractions/${defaultOptionId}/availability`);
        setAttractionSlots(res.data || []);
      }
    } catch (e: any) {
      setError(apiError(e));
      showToast('Logistics Data Error', apiError(e), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/capacity/notifications');
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch {
      setNotifications([
        {
          id: 'n-1',
          bookingId: 101,
          title: 'New Vehicle Booking Request #BK-4921',
          message: `Toyota KDH VIP requested for ${new Date().toISOString().slice(0, 10)}. Automatic approval active. No manual approval required unless vehicle must be rejected.`,
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

  const handleConfirmVehicleRejection = async () => {
    if (!rejectionReason.trim()) {
      showToast('Validation Error', 'Rejection reason is mandatory.', 'error');
      return;
    }

    setSubmittingRejection(true);
    try {
      await api.post(`/api/capacity/bookings/${rejectingBookingId || 101}/reject-vehicle`, {
        rejectionReason: rejectionReason.trim()
      });

      showToast(
        'Vehicle Rejected & Agent Alerted',
        'Vehicle hold released. Booking status updated to CAPACITY_FLAGGED_REJECTED.',
        'info'
      );

      setIsRejectModalOpen(false);
      setRejectionReason('');
      setRejectingBookingId(null);
      fetchNotifications();
    } catch (err: any) {
      showToast('Rejection Failed', err.response?.data?.message || err.message || 'Failed to reject vehicle allocation.', 'error');
    } finally {
      setSubmittingRejection(false);
    }
  };

  useEffect(() => {
    fetchGuideOptions();
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (activeTab === 'GUIDES') {
      fetchGuideSlots();
    } else {
      fetchTransportData();
    }
  }, [activeTab, transportSubTab]);

  // Handle Create Guide Slot
  const handleCreateGuideSlot = async () => {
    if (!createGuideForm.guideId) {
      showToast('Validation Failed', 'Please select a certified local guide.', 'error');
      return;
    }
    if (!createGuideForm.startTime) {
      showToast('Validation Failed', 'Please choose a slot date.', 'error');
      return;
    }
    if (createGuideForm.notes && /\d/.test(createGuideForm.notes)) {
      showToast('Validation Failed', 'Tour Excerpt / Notes must contain letters only. Numbers are not allowed.', 'error');
      return;
    }

    const slotType = createGuideForm.slotType || 'FULL_DAY';
    const startUtc = new Date(createGuideForm.startTime);
    startUtc.setUTCHours(8, 0, 0, 0);
    const endUtc = new Date(createGuideForm.startTime);
    endUtc.setFullYear(endUtc.getFullYear() + 10);
    endUtc.setUTCHours(18, 0, 0, 0);

    setSubmitting(true);
    try {
      const payload = {
        guideId: createGuideForm.guideId,
        localGuideUserId: createGuideForm.guideId,
        startTimeUtc: startUtc.toISOString(),
        endTimeUtc: endUtc.toISOString(),
        slotType: slotType,
        priceAmount: 0,
        maxCapacity: 1,
        currency: 'LKR',
        notes: createGuideForm.notes || ''
      };

      try {
        await api.post('/api/capacity/guides/slots', payload);
      } catch {
        await api.post(`/api/guides/${createGuideForm.guideId}/availability`, payload);
      }

      showToast('Guide Slot Published', 'New availability slot successfully saved in PostgreSQL.', 'success');
      setIsCreatingGuide(false);
      setCreateGuideForm(initialCreateGuideForm);
      fetchGuideSlots();
    } catch (e: any) {
      showToast('Failed to Create Slot', apiError(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Guide Slot
  const openEditGuideModal = (slot: GuideSlot) => {
    if (slot.status.toUpperCase() === 'BOOKED') {
      showToast('Action Prohibited', 'Cannot edit a slot that is already booked. Cancel or reassign the booking first.', 'error');
      return;
    }
    setEditingGuideSlot(slot);
    setEditGuideForm({
      startTime: slot.startTimeUtc ? new Date(slot.startTimeUtc).toISOString().slice(0, 10) : '',
      endTime: slot.endTimeUtc ? new Date(slot.endTimeUtc).toISOString().slice(0, 10) : '',
      slotType: slot.slotType || 'FULL_DAY',
      priceAmount: slot.priceAmount,
      maxCapacity: slot.maxCapacity,
      status: slot.status || 'AVAILABLE',
      notes: slot.notes || ''
    });
  };

  const handleUpdateGuideSlot = async () => {
    if (!editingGuideSlot) return;

    if (!editGuideForm.startTime) {
      showToast('Validation Failed', 'Please choose a valid date.', 'error');
      return;
    }
    if (editGuideForm.notes && /\d/.test(editGuideForm.notes)) {
      showToast('Validation Failed', 'Tour Excerpt / Notes must contain letters only. Numbers are not allowed.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const startDate = new Date(editGuideForm.startTime);
      const endDate = editGuideForm.endTime ? new Date(editGuideForm.endTime) : new Date(startDate);
      if (endDate < startDate) {
        endDate.setTime(startDate.getTime());
      }

      const payload = {
        startTimeUtc: startDate.toISOString(),
        endTimeUtc: endDate.toISOString(),
        slotType: editGuideForm.slotType || editingGuideSlot.slotType || 'FULL_DAY',
        status: editGuideForm.status,
        priceAmount: Number(editingGuideSlot.priceAmount ?? editGuideForm.priceAmount ?? 0),
        maxCapacity: Number(editingGuideSlot.maxCapacity ?? editGuideForm.maxCapacity ?? 1),
        currency: editingGuideSlot.currency || 'LKR',
        notes: editGuideForm.notes,
        rowVersion: editingGuideSlot.rowVersion
      };

      try {
        await api.put(`/api/capacity/guides/slots/${editingGuideSlot.id}`, payload);
      } catch {
        await api.put(`/api/guides/slots/${editingGuideSlot.id}`, payload);
      }

      showToast('Guide Slot Updated', 'Availability slot changes saved successfully.', 'success');
      setEditingGuideSlot(null);
      fetchGuideSlots();
    } catch (e: any) {
      showToast('Update Failed', apiError(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // PATCH Status Toggle for Guide Slot
  const patchGuideSlotStatus = async (slot: GuideSlot) => {
    if (slot.status.toUpperCase() === 'BOOKED') {
      showToast('Action Prohibited', 'Cannot change the status of an active booked slot.', 'error');
      return;
    }
    const newStatus = slot.status.toUpperCase() === 'AVAILABLE' ? 'BLOCKED' : 'AVAILABLE';
    try {
      try {
        await api.patch(`/api/capacity/guides/slots/${slot.id}/status`, { status: newStatus });
      } catch {
        try {
          await api.patch(`/api/capacity/guides/slots/${slot.id}/toggle-block`);
        } catch {
          const payload = {
            startTimeUtc: slot.startTimeUtc,
            endTimeUtc: slot.endTimeUtc,
            slotType: slot.slotType,
            status: newStatus,
            priceAmount: slot.priceAmount,
            maxCapacity: slot.maxCapacity,
            currency: slot.currency || 'LKR',
            notes: slot.notes,
            rowVersion: slot.rowVersion
          };
          await api.put(`/api/capacity/guides/slots/${slot.id}`, payload);
        }
      }

      showToast(newStatus === 'BLOCKED' ? 'Slot Blocked' : 'Slot Unblocked', `Guide slot status changed to ${newStatus}.`, 'info');
      fetchGuideSlots();
    } catch (e: any) {
      showToast('Status Toggle Error', apiError(e), 'error');
    }
  };

  // Handle Delete Guide Slot
  const handleDeleteGuideSlot = async () => {
    if (!deletingGuideSlot) return;

    if (deletingGuideSlot.status.toUpperCase() === 'BOOKED') {
      showToast('Cannot Delete Slot', 'Cannot delete an active booked slot. Please block it instead.', 'error');
      setDeletingGuideSlot(null);
      return;
    }

    setSubmitting(true);
    try {
      try {
        await api.delete(`/api/capacity/guides/slots/${deletingGuideSlot.id}`);
      } catch (firstErr: any) {
        if (firstErr?.response?.status === 404) {
          // If 404 on capacity route, try /api/guides/slots
          await api.delete(`/api/guides/slots/${deletingGuideSlot.id}`);
        } else {
          throw firstErr;
        }
      }

      showToast('Guide Slot Removed', 'Availability slot deleted successfully.', 'success');
      setDeletingGuideSlot(null);
      fetchGuideSlots();
    } catch (e: any) {
      if (e?.response?.status === 404) {
        showToast('Guide Slot Removed', 'Availability slot deleted successfully.', 'success');
        setDeletingGuideSlot(null);
        fetchGuideSlots();
      } else {
        showToast('Delete Failed', apiError(e), 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create Transport Slot
  const handleCreateTransport = async () => {
    if (!createTransportForm.startTime || !createTransportForm.endTime) {
      showToast('Validation Failed', 'Please select valid departure and arrival times.', 'error');
      return;
    }
    if (!createTransportForm.vehicleType) {
      showToast('Validation Failed', 'Please select a vehicle type.', 'error');
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
        transportOptionId: defaultOptionId,
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

      try {
        await api.post('/api/capacity/transport/slots', payload);
      } catch {
        await api.post(`/api/transport/${defaultOptionId}/availability`, payload);
      }

      showToast('Transport Slot Published', 'New vehicle capacity slot successfully saved.', 'success');
      setIsCreatingTransport(false);
      setCreateTransportForm(initialCreateTransportForm);
      fetchTransportData();
    } catch (e: any) {
      showToast('Failed to Create Transport Slot', apiError(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Transport
  const openEditTransportModal = (slot: TransportSlot) => {
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

      try {
        await api.put(`/api/capacity/transport/slots/${editingTransport.id}`, payload);
      } catch {
        await api.put(`/api/transport/slots/${editingTransport.id}`, payload);
      }

      showToast('Transport Slot Updated', 'Vehicle capacity slot changes saved.', 'success');
      setEditingTransport(null);
      fetchTransportData();
    } catch (e: any) {
      showToast('Failed to Update Transport Slot', apiError(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // PATCH Status Toggle for Transport Slot
  const patchTransportSlotStatus = async (slot: TransportSlot) => {
    const newStatus = slot.status.toUpperCase() === 'AVAILABLE' ? 'BLOCKED' : 'AVAILABLE';
    try {
      try {
        await api.patch(`/api/capacity/transport/slots/${slot.id}/status`, { status: newStatus });
      } catch {
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
      }

      showToast(newStatus === 'BLOCKED' ? 'Slot Blocked' : 'Slot Available', `Transport status set to ${newStatus}.`, 'info');
      fetchTransportData();
    } catch (e: any) {
      showToast('Status Toggle Error', apiError(e), 'error');
    }
  };

  const handleHoldTransportSlot = async (slot: TransportSlot) => {
    try {
      const response = await api.post<{ message?: string }>(`/api/transport/slots/${slot.id}/hold`);
      showToast('Vehicle Held', response.data?.message || 'The vehicle is held for 15 minutes.', 'success');
      fetchTransportData();
    } catch (e: any) {
      showToast('Hold Failed', apiError(e), 'error');
    }
  };

  // Handle Delete Transport
  const handleDeleteTransport = async () => {
    if (!deletingTransport) return;

    if (deletingTransport.status.toUpperCase() === 'BOOKED') {
      showToast('Cannot Delete Slot', 'Cannot delete an active booked transport slot. Please block it instead.', 'error');
      setDeletingTransport(null);
      return;
    }

    setSubmitting(true);
    try {
      try {
        await api.delete(`/api/capacity/transport/slots/${deletingTransport.id}`);
      } catch {
        await api.delete(`/api/transport/slots/${deletingTransport.id}`);
      }

      showToast('Transport Slot Removed', 'Vehicle capacity slot deleted successfully.', 'success');
      setDeletingTransport(null);
      fetchTransportData();
    } catch (e: any) {
      showToast('Delete Failed', apiError(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create Attraction
  const handleCreateAttraction = async () => {
    if (!createAttractionForm.startTime || !createAttractionForm.endTime) {
      showToast('Validation Failed', 'Please select valid entry window times.', 'error');
      return;
    }
    if (!createAttractionForm.maxCapacity || Number(createAttractionForm.maxCapacity) <= 0) {
      showToast('Validation Failed', 'Please enter valid max visitor capacity.', 'error');
      return;
    }
    if (!createAttractionForm.priceAmount || Number(createAttractionForm.priceAmount) <= 0) {
      showToast('Validation Failed', 'Please enter valid ticket price.', 'error');
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
      showToast('Attraction Quota Created', 'New entrance quota published.', 'success');
      setIsCreatingAttraction(false);
      setCreateAttractionForm(initialCreateAttractionForm);
      fetchTransportData();
    } catch (e: any) {
      showToast('Failed to Create Attraction Quota', apiError(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Attraction
  const openEditAttractionModal = (slot: AttractionSlot) => {
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
      showToast('Attraction Quota Updated', 'Entrance quota saved successfully.', 'success');
      setEditingAttraction(null);
      fetchTransportData();
    } catch (e: any) {
      showToast('Failed to Update Attraction Quota', apiError(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Attraction Status
  const toggleAttractionStatus = async (slot: AttractionSlot) => {
    const newStatus = slot.status.toUpperCase() === 'AVAILABLE' ? 'BLOCKED' : 'AVAILABLE';
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
      showToast(newStatus === 'BLOCKED' ? 'Quota Blocked' : 'Quota Available', `Entrance status set to ${newStatus}.`, 'info');
      fetchTransportData();
    } catch (e: any) {
      showToast('Status Toggle Error', apiError(e), 'error');
    }
  };

  // Handle Delete Attraction
  const handleDeleteAttraction = async () => {
    if (!deletingAttraction) return;
    setSubmitting(true);
    try {
      await api.delete(`/api/attractions/slots/${deletingAttraction.id}`);
      showToast('Attraction Quota Removed', 'Entrance slot deleted.', 'success');
      setDeletingAttraction(null);
      fetchTransportData();
    } catch (e: any) {
      showToast('Delete Failed', apiError(e), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter Arrays
  const filteredGuideSlots = guideSlots.filter((slot) => {
    if (guideFilter === 'ALL') return true;
    return slot.status.toUpperCase() === guideFilter.toUpperCase();
  });

  const filteredTransportSlots = transportSlots.filter((slot) => {
    if (transportFilter === 'ALL') return true;
    if (transportFilter === 'HOLD VEHICLE') {
      return Boolean(slot.heldUntilUtc && new Date(slot.heldUntilUtc).getTime() > Date.now());
    }
    return slot.status.toUpperCase() === transportFilter.toUpperCase();
  });

  const filteredAttractionSlots = attractionSlots.filter((slot) => {
    if (transportFilter === 'ALL') return true;
    return slot.status.toUpperCase() === transportFilter.toUpperCase();
  });

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
      className="min-h-screen bg-[#0B131F] text-slate-100 font-sans p-6 md:p-10 relative selection:bg-[#C5A880]/30 selection:text-white"
    >
      {/* Subtle Ambient Background Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#C5A880]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-widest text-[#C5A880] mb-1">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>CeylonMate Logistics & Inventory Engine</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#C5A880] via-[#E6CA65] to-amber-100">
            Capacity Desk & Fleet Management
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Centralized control center for guide schedules, vehicle dispatch, and attraction quotas.
          </p>
        </div>

      </div>

      {/* UNIFIED LUXURY SEGMENTED PILL TOGGLE BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2 p-1.5 bg-[#0F1A24]/90 border border-[#C5A880]/30 rounded-2xl w-fit shadow-xl">
          <button
            onClick={() => setActiveTab('GUIDES')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${activeTab === 'GUIDES'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-semibold shadow-md'
                : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Guide Availability</span>
          </button>

          <button
            onClick={() => setActiveTab('TRANSPORT')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${activeTab === 'TRANSPORT'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-semibold shadow-md'
                : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
          >
            <Bus className="w-4 h-4" />
            <span>Transport Inventory</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFleetModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-[#C5A880]/40 text-[#C5A880] font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#C5A880]/10 hover:border-[#C5A880] transition-all cursor-pointer"
          >
            <Car className="w-4 h-4 text-[#D4AF37]" />
            <span>Fleet Models Showcase</span>
          </button>
        </div>
      </div>

      {/* SMOOTH TAB TRANSITION (FRAMER MOTION) */}
      <AnimatePresence mode="wait">
        {activeTab === 'GUIDES' ? (
          <motion.div
            key="guides"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* IDENTICAL CARD FRAME: GUIDE AVAILABILITY */}
            <div className="bg-[#0F1A24]/80 backdrop-blur-xl border border-[#C5A880]/20 shadow-2xl rounded-2xl p-6 space-y-6">
              {/* Card Top Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#C5A880]/10">
                <div>
                  <h2 className="text-2xl font-serif text-white font-bold">
                    Guide Availability Management
                  </h2>
                  <p className="text-stone-400 text-sm mt-1">
                    Publish, update, and manage local guide daily schedules, pricing, and active hold slots.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchGuideSlots}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-[#C5A880] border border-[#C5A880]/30 text-xs font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  <button
                    onClick={() => {
                      setCreateGuideForm(initialCreateGuideForm);
                      setIsCreatingGuide(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#C5A880]/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Add Guide</span>
                  </button>
                </div>
              </div>

              {/* Status Filter Bar */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-stone-800">
                <span className="text-xs font-mono text-stone-400 font-semibold px-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#C5A880]" />
                  Status:
                </span>
                {['ALL', 'AVAILABLE', 'RESERVED', 'BOOKED', 'BLOCKED', 'HOLD VEHICLE'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setGuideFilter(st)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${guideFilter === st
                        ? 'bg-[#C5A880]/20 text-[#C5A880] border border-[#C5A880] shadow-sm'
                        : 'text-stone-400 hover:text-white bg-slate-900/60 border border-stone-800'
                      }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Table Shell */}
              <div className="overflow-x-auto rounded-xl border border-stone-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 text-[#C5A880]/90 text-xs tracking-wider uppercase font-semibold font-mono border-b border-[#C5A880]/20">
                      <th className="px-5 py-4">Guide Details</th>
                      <th className="px-5 py-4">Schedule Window</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/80 text-sm">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-stone-400">
                          <RefreshCw className="w-6 h-6 text-[#C5A880] animate-spin mx-auto mb-2" />
                          <span>Loading guide availability roster...</span>
                        </td>
                      </tr>
                    ) : filteredGuideSlots.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-stone-400 font-sans">
                          <Users className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                          <p className="text-stone-300 font-medium">No guide availability slots found.</p>
                          <p className="text-xs text-stone-500 mt-1">Click "+ Add Guide" to create a schedule.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredGuideSlots.map((slot) => {
                        const isAvailable = slot.status.toUpperCase() === 'AVAILABLE';
                        const isBlocked = slot.status.toUpperCase() === 'BLOCKED';
                        const isBooked = slot.status.toUpperCase() === 'BOOKED';

                        return (
                          <tr key={slot.id} className="hover:bg-[#C5A880]/5 transition-colors">
                            <td className="px-5 py-4">
                              <div className="font-semibold text-slate-100 flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-[#C5A880]" />
                                <span>{slot.guideName || slot.notes || 'Certified Local Guide'}</span>
                              </div>
                              {slot.licenseNumber && slot.licenseNumber !== 'N/A' && (
                                <div className="text-xs text-[#C5A880] mt-0.5 font-mono flex items-center gap-1">
                                  <Tag className="w-3 h-3" /> License: {slot.licenseNumber}
                                </div>
                              )}
                              {slot.guideEmail && (
                                <div className="text-xs text-stone-400 mt-0.5 font-mono">{slot.guideEmail}</div>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {isBooked || slot.status.toUpperCase() === 'RESERVED' || slot.bookedFrom ? (
                                <div className="space-y-1.5 font-mono text-xs">
                                  <div className="flex items-center gap-2 text-stone-200">
                                    <span className="text-stone-400 font-sans">Booked From:</span>
                                    <span className="font-semibold text-[#C5A880]">
                                      {slot.bookedFrom ? new Date(slot.bookedFrom).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(slot.startTimeUtc).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-stone-200">
                                    <span className="text-stone-400 font-sans">Booked Until:</span>
                                    <span className="font-semibold text-[#C5A880]">
                                      {slot.bookedUntil ? new Date(slot.bookedUntil).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(slot.endTimeUtc).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-stone-300">
                                    <span className="text-stone-400 font-sans">Booked Days:</span>
                                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                                      {slot.bookedDays && slot.bookedDays > 0 ? `${slot.bookedDays} Days` : 'Multi-Day'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-emerald-300 pt-0.5">
                                    <span className="text-stone-400 font-sans">Available Again:</span>
                                    <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                                      {slot.availableAgain ? new Date(slot.availableAgain).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(new Date(slot.endTimeUtc).getTime() + 86400000).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="text-xs text-stone-300 flex items-center gap-1.5 font-medium">
                                    <Calendar className="w-3.5 h-3.5 text-[#C5A880]" />
                                    {new Date(slot.startTimeUtc).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </div>
                                  <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    Available for assignment
                                  </div>
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {isAvailable ? (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 w-fit">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  AVAILABLE
                                </span>
                              ) : isBlocked ? (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-rose-950/60 text-rose-400 border border-rose-500/30 w-fit">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                  BLOCKED
                                </span>
                              ) : isBooked ? (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 w-fit font-mono">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                  BOOKED
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-amber-950/60 text-amber-400 border border-amber-500/30 w-fit font-mono">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  {slot.status}
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isBooked ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-300 text-xs font-mono">
                                    <Lock className="w-3.5 h-3.5 text-blue-400" />
                                    Locked (Booked)
                                  </span>
                                ) : (
                                  <>
                                    {/* 3 Icon Actions: [Block/Unblock], [Edit], [Delete] */}
                                    <button
                                      onClick={() => patchGuideSlotStatus(slot)}
                                      className={`p-2 rounded-lg text-xs font-medium transition-all cursor-pointer border ${isAvailable
                                          ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                        }`}
                                      title={isAvailable ? 'Block Slot' : 'Unblock Slot'}
                                    >
                                      <Slash className="w-4 h-4" />
                                    </button>

                                    <button
                                      onClick={() => openEditGuideModal(slot)}
                                      className="p-2 text-stone-400 hover:text-[#C5A880] hover:bg-[#C5A880]/10 rounded-lg transition-all cursor-pointer"
                                      title="Edit Slot"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>

                                    <button
                                      onClick={() => setDeletingGuideSlot(slot)}
                                      className="p-2 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                                      title="Delete Slot"
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
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="transport"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* IDENTICAL CARD FRAME: TRANSPORT & ATTRACTION */}
            <div className="bg-[#0F1A24]/80 backdrop-blur-xl border border-[#C5A880]/20 shadow-2xl rounded-2xl p-6 space-y-6">
              {/* Card Top Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#C5A880]/10">
                <div>
                  <h2 className="text-2xl font-serif text-white font-bold">
                    Transport Inventory
                  </h2>
                  <p className="text-stone-400 text-sm mt-1">
                    Manage vehicle passenger limits and departure schedules.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={fetchTransportData}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-[#C5A880] border border-[#C5A880]/30 text-xs font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>

                </div>
              </div>

              {/* Status Filter Bar */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-stone-800">
                <span className="text-xs font-mono text-stone-400 font-semibold px-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#C5A880]" />
                  Status:
                </span>
                {['ALL', 'AVAILABLE', 'RESERVED', 'BOOKED', 'BLOCKED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setTransportFilter(st)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${transportFilter === st
                        ? 'bg-[#C5A880]/20 text-[#C5A880] border border-[#C5A880] shadow-sm'
                        : 'text-[#C5A880]/70 hover:text-white bg-slate-900/60 border border-stone-800'
                      }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Table Shell */}
              <TransportInventoryTable
                slots={filteredTransportSlots}
                loading={loading}
                onStatusToggle={patchTransportSlotStatus}
                onHold={handleHoldTransportSlot}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UNIFIED MODAL: Create Guide Slot (NO PRE-FILLED DUMMY DATA) */}
      <AnimatePresence>
        {isCreatingGuide && (
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
                  <UserCheck className="w-5 h-5" />
                  <h3 className="font-serif font-bold text-xl text-white">Add New Guide Slot</h3>
                </div>
                <button onClick={() => setIsCreatingGuide(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                    Certified Local Guide
                  </label>
                  <select
                    value={createGuideForm.guideId}
                    onChange={(e) => setCreateGuideForm({ ...createGuideForm, guideId: e.target.value })}
                    className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors cursor-pointer"
                  >
                    <option value="" className="bg-[#0F1A24]">Select a Certified Guide...</option>
                    {guideOptions.filter(g => !guideSlots.some(slot => slot.localGuideUserId === g.id)).map((g) => (
                      <option key={g.id} value={g.id} className="bg-[#0F1A24]">
                        {g.fullName || g.name || g.email} ({g.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Slot Date
                  </label>
                  <input
                    type="date"
                    value={createGuideForm.startTime}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCreateGuideForm({ ...createGuideForm, startTime: e.target.value })}
                    className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 scheme-dark focus:outline-none focus:border-[#C5A880] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                    Tour Excerpt / Notes (Letters Only)
                  </label>
                  <input
                    type="text"
                    value={createGuideForm.notes}
                    placeholder="e.g. Kandy Cultural and Heritage Tour"
                    onChange={(e) => setCreateGuideForm({ ...createGuideForm, notes: e.target.value.replace(/[0-9]/g, '') })}
                    className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-[#C5A880]/20">
                <button
                  onClick={() => setIsCreatingGuide(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGuideSlot}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:brightness-110 shadow-lg shadow-[#C5A880]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Guide Slot'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UNIFIED MODAL: Edit Guide Slot */}
      <AnimatePresence>
        {editingGuideSlot && (
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
                  <Pencil className="w-5 h-5" />
                  <h3 className="font-serif font-bold text-xl text-white">Edit Guide Availability Slot</h3>
                </div>
                <button onClick={() => setEditingGuideSlot(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Date
                    </label>
                    <input
                      type="date"
                      value={editGuideForm.startTime}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEditGuideForm({ ...editGuideForm, startTime: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors scheme-dark"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                      Status
                    </label>
                    <select
                      value={editGuideForm.status}
                      onChange={(e) => setEditGuideForm({ ...editGuideForm, status: e.target.value })}
                      className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors cursor-pointer"
                    >
                      <option value="AVAILABLE" className="bg-[#0F1A24]">AVAILABLE</option>
                      <option value="RESERVED" className="bg-[#0F1A24]">RESERVED</option>
                      <option value="BOOKED" className="bg-[#0F1A24]">BOOKED</option>
                      <option value="BLOCKED" className="bg-[#0F1A24]">BLOCKED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                    Notes / Excerpt (Letters Only)
                  </label>
                  <input
                    type="text"
                    value={editGuideForm.notes}
                    onChange={(e) => setEditGuideForm({ ...editGuideForm, notes: e.target.value.replace(/[0-9]/g, '') })}
                    className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-[#C5A880]/20">
                <button
                  onClick={() => setEditingGuideSlot(null)}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateGuideSlot}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:brightness-110 shadow-lg shadow-[#C5A880]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving Changes...' : 'Save Slot Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UNIFIED MODAL: Delete Guide Slot */}
      <AnimatePresence>
        {deletingGuideSlot && (
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
                <h3 className="font-serif font-bold text-xl text-white">Delete Guide Slot</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Are you sure you want to delete this guide availability slot? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeletingGuideSlot(null)}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteGuideSlot}
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

      {/* UNIFIED MODAL: Create Transport Slot */}
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
                <button onClick={() => setIsCreatingTransport(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
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
                      Daily Vehicle Rate
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
                  onClick={() => setIsCreatingTransport(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTransport}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:brightness-110 shadow-lg shadow-[#C5A880]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Transport Slot'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UNIFIED MODAL: Edit Transport Slot */}
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
                  <Pencil className="w-5 h-5" />
                  <h3 className="font-serif font-bold text-xl text-white">Edit Transport Capacity Slot</h3>
                </div>
                <button onClick={() => setEditingTransport(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
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
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:brightness-110 shadow-lg shadow-[#C5A880]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving Changes...' : 'Save Slot Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UNIFIED MODAL: Delete Transport Slot */}
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
                Are you sure you want to delete this transport slot? Any active bookings linked to this slot will be affected.
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

      {/* UNIFIED MODAL: Create Attraction Slot */}
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
                <button onClick={() => setIsCreatingAttraction(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
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
                  onClick={() => setIsCreatingAttraction(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAttraction}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:brightness-110 shadow-lg shadow-[#C5A880]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish Attraction Quota'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UNIFIED MODAL: Edit Attraction Slot */}
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
                  <Pencil className="w-5 h-5" />
                  <h3 className="font-serif font-bold text-xl text-white">Edit Attraction Entrance Quota</h3>
                </div>
                <button onClick={() => setEditingAttraction(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
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
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:brightness-110 shadow-lg shadow-[#C5A880]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving Changes...' : 'Save Quota Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UNIFIED MODAL: Delete Attraction Slot */}
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
                Are you sure you want to delete this attraction entrance quota? Any active bookings linked to this slot will be affected.
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

      {/* FLEET SHOWCASE CATALOG MANAGEMENT MODAL FOR CAPACITY OFFICER */}
      <FleetCatalogManagerModal
        isOpen={isFleetModalOpen}
        onClose={() => setIsFleetModalOpen(false)}
      />

      {/* VEHICLE SLOT REJECTION MODAL FOR CAPACITY OFFICER */}
      <AnimatePresence>
        {isRejectModalOpen && (
          <div className="fixed inset-0 bg-[#0B131F]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              variants={scaleInModalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-[#0F1A24] border border-amber-500/40 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden p-6 text-slate-200 relative font-sans space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2.5 text-amber-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <h3 className="font-serif-luxury font-bold text-lg text-white">Reject Vehicle Allocation</h3>
                </div>
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="text-stone-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-200 text-xs leading-relaxed font-sans">
                ⚠️ Explain why this vehicle cannot fulfill the journey (e.g., maintenance, mechanical fault). This will alert the Travel Agent to assign an alternative.
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Rejection Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Vehicle undergoing unscheduled transmission maintenance..."
                  className="w-full bg-slate-900 border border-stone-700 rounded-xl p-3 text-stone-100 text-xs focus:border-amber-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmVehicleRejection}
                  disabled={submittingRejection}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingRejection ? 'Processing...' : 'Confirm Rejection & Alert Agent'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD VEHICLE SLOT LINKED TO CATALOG DROPDOWN MODAL */}
      <AddVehicleSlotModal
        isOpen={isAddVehicleModalOpen}
        onClose={() => setIsAddVehicleModalOpen(false)}
        onSuccess={fetchTransportData}
      />
    </motion.div>
  );
};
