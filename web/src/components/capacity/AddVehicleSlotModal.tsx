import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bus, Users, Calendar, Clock, DollarSign, Lock, AlertTriangle, Sparkles } from 'lucide-react';
import { api, apiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { scaleInModalVariants } from '../../utils/animations';

export interface VehicleFleetCatalogItem {
  id: string;
  categoryBadge: string;
  vehicleModel: string;
  description?: string;
  imageUrl: string;
  maxPassengers: number;
  featureHighlight?: string;
  luggageCapacity?: string;
  dailyRateUsd?: number;
  currency?: string;
  isActive: boolean;
}

export interface AddVehicleSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddVehicleSlotModal: React.FC<AddVehicleSlotModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { showToast } = useToast();
  const [catalogs, setCatalogs] = useState<VehicleFleetCatalogItem[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleFleetCatalogItem | null>(null);
  const [routeDescription, setRouteDescription] = useState<string>('');
  const [departureTime, setDepartureTime] = useState<string>('');
  const [arrivalTime, setArrivalTime] = useState<string>('');
  const [ratePerSeatLkr, setRatePerSeatLkr] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchCatalogVehicles();
    }
  }, [isOpen]);

  const fetchCatalogVehicles = async () => {
    setLoadingCatalogs(true);
    try {
      const res = await api.get<VehicleFleetCatalogItem[]>('/api/fleet/catalog');
      const activeVehicles = (res.data || []).filter((v) => v.isActive);
      setCatalogs(activeVehicles);
      if (activeVehicles.length > 0 && !selectedCatalogId) {
        handleCatalogSelect(activeVehicles[0].id, activeVehicles);
      }
    } catch (e: any) {
      console.warn('Failed to load fleet catalog vehicles:', e);
      showToast('Catalog Load Warning', 'Failed to fetch vehicle models from fleet catalog.', 'error');
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const handleCatalogSelect = (catalogId: string, availableCatalogs = catalogs) => {
    setSelectedCatalogId(catalogId);
    const vehicle = availableCatalogs.find((v) => v.id === catalogId) || null;
    setSelectedVehicle(vehicle);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCatalogId || !selectedVehicle) {
      showToast('Validation Error', 'Please select a vehicle model from the fleet catalog.', 'error');
      return;
    }
    if (!routeDescription.trim()) {
      showToast('Validation Error', 'Please enter a route description (e.g. Colombo to Sigiriya Express).', 'error');
      return;
    }
    if (!departureTime || !arrivalTime) {
      showToast('Validation Error', 'Please choose valid departure and arrival times.', 'error');
      return;
    }
    if (new Date(arrivalTime) <= new Date(departureTime)) {
      showToast('Validation Error', 'Arrival time must be after departure time.', 'error');
      return;
    }
    const rateNum = Number(ratePerSeatLkr);
    if (isNaN(rateNum) || rateNum < 0) {
      showToast('Validation Error', 'Rate per seat cannot be negative or invalid.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const depIso = new Date(departureTime).toISOString();
      const arrIso = new Date(arrivalTime).toISOString();

      const payload = {
        vehicleCatalogId: selectedCatalogId,
        routeDescription: routeDescription.trim(),
        departureTime: depIso,
        arrivalTime: arrIso,
        ratePerSeatLkr: rateNum,
        // Fallback fields for capacity/transport/slots endpoint
        startTimeUtc: depIso,
        endTimeUtc: arrIso,
        pricePerSeat: rateNum,
        currency: 'LKR',
        totalSeats: selectedVehicle.maxPassengers
      };

      try {
        await api.post('/api/capacity/vehicles', payload);
      } catch {
        await api.post('/api/capacity/transport/slots', payload);
      }

      showToast('Vehicle Slot Published', `Added ${selectedVehicle.vehicleModel} slot (${selectedVehicle.maxPassengers} Pax Capacity).`, 'success');
      onSuccess();
      onClose();
      // Reset form
      setRouteDescription('');
      setDepartureTime('');
      setArrivalTime('');
      setRatePerSeatLkr('');
    } catch (err: any) {
      showToast('Failed to Create Slot', apiError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-[#0B131F]/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <motion.div
          variants={scaleInModalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="bg-[#0F1A24] border border-[#C5A880]/30 shadow-2xl rounded-2xl w-full max-w-xl overflow-hidden p-6 text-slate-200 relative"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-[#C5A880]/20 pb-4 mb-6">
            <div className="flex items-center gap-2.5 text-[#C5A880]">
              <Bus className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="font-serif font-bold text-xl text-white">Add Vehicle Capacity Slot</h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Fleet Model Select */}
            <div>
              <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                Select Fleet Vehicle Model
              </label>

              {loadingCatalogs ? (
                <div className="p-3 bg-[#0B131F] border border-[#C5A880]/20 rounded-xl text-xs text-stone-400 animate-pulse">
                  Loading available fleet models...
                </div>
              ) : catalogs.length === 0 ? (
                <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>No active models found in Fleet Catalog. Please publish models in Fleet Showcase first.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedCatalogId}
                    onChange={(e) => handleCatalogSelect(e.target.value)}
                    className="w-full bg-[#0B131F] border border-[#C5A880]/30 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors cursor-pointer font-medium"
                  >
                    {catalogs.map((v) => (
                      <option key={v.id} value={v.id} className="bg-[#0F1A24] text-slate-100 py-2">
                        {v.vehicleModel} — ({v.categoryBadge}) — Max {v.maxPassengers} Pax
                      </option>
                    ))}
                  </select>

                  {/* Selected Vehicle Preview Banner */}
                  {selectedVehicle && (
                    <div className="p-3 bg-[#0B131F]/90 border border-[#C5A880]/20 rounded-xl flex items-center gap-3 mt-2 shadow-inner">
                      <img
                        src={selectedVehicle.imageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=300&q=80'}
                        alt={selectedVehicle.vehicleModel}
                        className="w-16 h-12 object-cover rounded-lg border border-[#C5A880]/30 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-100 truncate">{selectedVehicle.vehicleModel}</div>
                        <div className="text-xs text-stone-400 truncate">{selectedVehicle.categoryBadge}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#C5A880]/20 text-[#C5A880] border border-[#C5A880]/40 shrink-0 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Up to {selectedVehicle.maxPassengers} Pax
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Route Description */}
            <div>
              <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5">
                Route Description
              </label>
              <input
                type="text"
                value={routeDescription}
                placeholder="e.g. Colombo to Sigiriya Express"
                onChange={(e) => setRouteDescription(e.target.value)}
                className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors placeholder:text-slate-500"
              />
            </div>

            {/* Departure & Arrival Times */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  Departure Time (UTC)
                </label>
                <input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  Arrival Time (UTC)
                </label>
                <input
                  type="datetime-local"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors"
                />
              </div>
            </div>

            {/* Locked Capacity & Rate per Seat */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-stone-400" />
                  Total Seats (Auto-Inherited)
                </label>
                <input
                  type="number"
                  value={selectedVehicle ? selectedVehicle.maxPassengers : ''}
                  disabled
                  readOnly
                  className="w-full bg-slate-900/90 border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-400 font-mono font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Rate Per Seat (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={ratePerSeatLkr}
                  placeholder="e.g. 4500"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || Number(val) >= 0) {
                      setRatePerSeatLkr(val);
                    }
                  }}
                  className="w-full bg-[#0B131F] border border-[#C5A880]/20 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-[#C5A880] transition-colors font-mono placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-[#C5A880]/20">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedCatalogId}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:brightness-110 shadow-lg shadow-[#C5A880]/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? 'Publishing Slot...' : 'Publish Vehicle Slot'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
