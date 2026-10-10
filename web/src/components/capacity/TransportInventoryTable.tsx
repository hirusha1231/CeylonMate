import React from 'react';
import { Bus, Calendar, Clock, Slash, RefreshCw } from 'lucide-react';
import { VehicleFleetCatalogItem } from './AddVehicleSlotModal';

export interface TransportSlotItem {
  id: string;
  vehicleCatalogId?: string;
  vehicleCatalog?: VehicleFleetCatalogItem;
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

  // Whole-day date range charter fields
  charterStartDate?: string | null;
  charterEndDate?: string | null;
  tripDurationDays?: number | null;
  bookingReference?: string | null;
  travelerName?: string | null;
  passengerCount?: number | null;
}

export interface TransportInventoryTableProps {
  slots: TransportSlotItem[];
  loading: boolean;
  onStatusToggle: (slot: TransportSlotItem) => void;
  onHold: (slot: TransportSlotItem) => void;
}

export const TransportInventoryTable: React.FC<TransportInventoryTableProps> = ({
  slots,
  loading,
  onStatusToggle,
  onHold
}) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-800">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-900/80 text-[#C5A880]/90 text-xs tracking-wider uppercase font-semibold font-mono border-b border-[#C5A880]/20">
            <th className="px-5 py-4">Vehicle & Charter Schedule</th>
            <th className="px-5 py-4">Vehicle Category</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-800/80 text-sm">
          {loading ? (
            <tr>
              <td colSpan={4} className="px-5 py-12 text-center text-stone-400">
                <RefreshCw className="w-6 h-6 text-[#C5A880] animate-spin mx-auto mb-2" />
                <span>Loading vehicle capacity & charter schedules...</span>
              </td>
            </tr>
          ) : slots.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-5 py-12 text-center text-stone-400 font-sans">
                <Bus className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                <p className="text-stone-300 font-medium">No vehicle capacity inventory found.</p>
              </td>
            </tr>
          ) : (
            slots.map((slot) => {
              const isAvailable = slot.status.toUpperCase() === 'AVAILABLE';
              const isBlocked = slot.status.toUpperCase() === 'BLOCKED';
              const isBooked = slot.status.toUpperCase() === 'BOOKED';
              const isReserved = slot.status.toUpperCase() === 'RESERVED' || slot.status.toUpperCase() === 'HELD';

              // Vehicle Catalog details or fallback
              const catalog = slot.vehicleCatalog;
              const modelTitle = catalog?.vehicleModel || slot.optionTitle || `${slot.vehicleType} VIP Fleet`;
              const routeDesc = slot.routeDescription || (catalog ? `${catalog.vehicleModel} Route` : `${slot.vehicleType} Express Route`);
              const imgUrl = catalog?.imageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=300&q=80';

              const isHeld = Boolean(slot.heldUntilUtc && new Date(slot.heldUntilUtc).getTime() > Date.now());

              return (
                <tr key={slot.id} className="hover:bg-[#C5A880]/5 transition-colors">
                  {/* VEHICLE & CHARTER SCHEDULE COLUMN */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={imgUrl}
                        alt={modelTitle}
                        className="w-14 h-11 object-cover rounded-lg border border-[#C5A880]/30 shrink-0 shadow-sm"
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-slate-100 flex items-center gap-2">
                          <Bus className="w-3.5 h-3.5 text-[#C5A880]" />
                          <span>{modelTitle}</span>
                        </div>
                        <div className="text-xs text-stone-400 font-medium">{routeDesc}</div>

                        {/* Whole-Day Charter Schedule */}
                        <div className="text-xs font-mono pt-0.5">
                          {slot.charterStartDate && slot.charterEndDate ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
                                <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                                Charter: {slot.charterStartDate} to {slot.charterEndDate} ({slot.tripDurationDays || 1} Days)
                              </span>
                              {slot.bookingReference && (
                                <div className="text-[11px] text-stone-300 font-sans pl-1">
                                  Ref: <strong className="text-[#C5A880]">{slot.bookingReference}</strong> • {slot.travelerName || 'Traveler'} ({slot.maxPassengers} Max Pax)
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20">
                              <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
                              Unchartered (Available) • Max {slot.maxPassengers} Pax
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* TYPE BADGE */}
                  <td className="px-5 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#C5A880]/10 border border-[#C5A880]/30 text-[#C5A880] font-mono">
                      {slot.vehicleType}
                    </span>
                  </td>

                  {/* STATUS */}
                  <td className="px-5 py-4">
                    {isAvailable ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 w-fit font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        AVAILABLE
                      </span>
                    ) : isReserved ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-amber-950/60 text-amber-400 border border-amber-500/30 w-fit font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        RESERVED
                      </span>
                    ) : isBooked ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 w-fit font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        BOOKED
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-rose-950/60 text-rose-400 border border-rose-500/30 w-fit font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        {slot.status}
                      </span>
                    )}
                  </td>

                  {/* ACTIONS */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {!isReserved && !isBooked && (
                        <button
                          onClick={() => onStatusToggle(slot)}
                          className={`p-2 rounded-lg text-xs font-medium transition-all cursor-pointer border ${isAvailable
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}
                          title={isAvailable ? 'Block Vehicle Charter' : 'Unblock Vehicle Charter'}
                        >
                          <Slash className="w-4 h-4" />
                        </button>
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
  );
};
