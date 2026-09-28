import React from 'react';
import { Bus, Calendar, Clock, Slash, Pencil, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
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
  totalSeats: number;
  bookedSeats: number;
  heldSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  ratePerSeatLkr?: number;
  currency: string;
  rowVersion?: string;
}

export interface TransportInventoryTableProps {
  slots: TransportSlotItem[];
  loading: boolean;
  onStatusToggle: (slot: TransportSlotItem) => void;
  onEdit: (slot: TransportSlotItem) => void;
  onDelete: (slot: TransportSlotItem) => void;
}

export const TransportInventoryTable: React.FC<TransportInventoryTableProps> = ({
  slots,
  loading,
  onStatusToggle,
  onEdit,
  onDelete
}) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-stone-800">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-900/80 text-[#C5A880]/90 text-xs tracking-wider uppercase font-semibold font-mono border-b border-[#C5A880]/20">
            <th className="px-5 py-4">Vehicle & Route</th>
            <th className="px-5 py-4">Type</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4">Seats Available</th>
            <th className="px-5 py-4">Rate / Seat</th>
            <th className="px-5 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-800/80 text-sm">
          {loading ? (
            <tr>
              <td colSpan={6} className="px-5 py-12 text-center text-stone-400">
                <RefreshCw className="w-6 h-6 text-[#C5A880] animate-spin mx-auto mb-2" />
                <span>Loading vehicle capacity slots...</span>
              </td>
            </tr>
          ) : slots.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-12 text-center text-stone-400 font-sans">
                <Bus className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                <p className="text-stone-300 font-medium">No vehicle capacity slots found.</p>
                <p className="text-xs text-stone-500 mt-1">Click "+ Add Vehicle Slot" to publish a schedule.</p>
              </td>
            </tr>
          ) : (
            slots.map((slot) => {
              const isAvailable = slot.status.toUpperCase() === 'AVAILABLE';
              const isBlocked = slot.status.toUpperCase() === 'BLOCKED';
              const isBooked = slot.status.toUpperCase() === 'BOOKED';

              // Vehicle Catalog details or fallback
              const catalog = slot.vehicleCatalog;
              const modelTitle = catalog?.vehicleModel || slot.optionTitle || `${slot.vehicleType} Express Route`;
              const routeDesc = slot.routeDescription || (catalog ? `${catalog.vehicleModel} Route` : `${slot.vehicleType} Express Route`);
              const imgUrl = catalog?.imageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=300&q=80';

              const calculatedAvailable = Math.max(0, slot.totalSeats - (slot.bookedSeats || 0) - (slot.heldSeats || 0));

              return (
                <tr key={slot.id} className="hover:bg-[#C5A880]/5 transition-colors">
                  {/* VEHICLE & ROUTE COLUMN WITH THUMBNAIL */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={imgUrl}
                        alt={modelTitle}
                        className="w-14 h-11 object-cover rounded-lg border border-[#C5A880]/30 shrink-0 shadow-sm"
                      />
                      <div>
                        <div className="font-bold text-slate-100 flex items-center gap-2">
                          <Bus className="w-3.5 h-3.5 text-[#C5A880]" />
                          <span>{modelTitle}</span>
                        </div>
                        <div className="text-xs text-stone-300 font-medium mt-0.5">{routeDesc}</div>
                        <div className="text-xs text-stone-400 flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-stone-500" />
                            {new Date(slot.startTimeUtc).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-stone-500" />
                            {new Date(slot.startTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.endTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
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
                      <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-slate-800 text-slate-300 border border-slate-700 w-fit">
                        BOOKED
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-amber-950/60 text-amber-400 border border-amber-500/30 w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        {slot.status}
                      </span>
                    )}
                  </td>

                  {/* SEATS AVAILABLE WITH SUBTLE CHECKOUT HOLD BADGE */}
                  <td className="px-5 py-4">
                    <div className="font-mono text-stone-200 font-semibold text-sm">
                      {calculatedAvailable} / {slot.totalSeats} seats
                    </div>
                    {slot.heldSeats > 0 && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-medium font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30 w-fit shadow-xs">
                        <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>({slot.heldSeats} in checkout hold)</span>
                      </div>
                    )}
                  </td>

                  {/* RATE / SEAT */}
                  <td className="px-5 py-4 font-bold text-[#C5A880] font-mono text-base">
                    {slot.currency || 'LKR'} {(slot.ratePerSeatLkr || slot.pricePerSeat || 0).toLocaleString()}
                  </td>

                  {/* ACTIONS */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onStatusToggle(slot)}
                        className={`p-2 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                          isAvailable
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                        title={isAvailable ? 'Block Slot' : 'Unblock Slot'}
                      >
                        <Slash className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onEdit(slot)}
                        className="p-2 text-stone-400 hover:text-[#C5A880] hover:bg-[#C5A880]/10 rounded-lg transition-all cursor-pointer"
                        title="Edit Slot"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDelete(slot)}
                        className="p-2 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                        title="Delete Slot"
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
  );
};
