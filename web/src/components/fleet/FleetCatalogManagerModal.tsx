import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Car,
  Users,
  Luggage,
  Sparkles,
  Pencil,
  Trash2,
  CheckCircle,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Globe,
  RefreshCw,
  Check
} from 'lucide-react';
import { api, apiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { scaleInModalVariants } from '../../utils/animations';
import { FLEET_IMAGES } from '../../utils/mediaData';



export interface VehicleFleetItem {
  id: string;
  categoryBadge: string;
  vehicleModel: string;
  description: string;
  imageUrl: string;
  maxPassengers: number;
  featureHighlight: string;
  luggageCapacity: string;
  dailyRateUsd?: number;
  currency?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

interface FleetCatalogManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCatalogUpdated?: () => void;
}

const getCurrencySymbol = (curr?: string) => {
  if (curr === 'LKR') return 'Rs ';
  if (curr === 'EUR') return '€';
  if (curr === 'GBP') return '£';
  return '$';
};

export const FleetCatalogManagerModal: React.FC<FleetCatalogManagerModalProps> = ({
  isOpen,
  onClose,
  onCatalogUpdated
}) => {
  const { showToast } = useToast();
  const [vehicles, setVehicles] = useState<VehicleFleetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
  const [categoryBadge, setCategoryBadge] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [maxPassengers, setMaxPassengers] = useState<number>(4);
  const [featureHighlight, setFeatureHighlight] = useState('');
  const [luggageCapacity, setLuggageCapacity] = useState<string>('6');
  const [dailyRateUsd, setDailyRateUsd] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);

  const blockNonNumericKeys = (e: React.KeyboardEvent<HTMLInputElement>, allowDecimal = false) => {
    if (
      e.key === 'e' ||
      e.key === 'E' ||
      e.key === '+' ||
      e.key === '-' ||
      (!allowDecimal && e.key === '.')
    ) {
      e.preventDefault();
    }
  };

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await api.get<VehicleFleetItem[]>('/api/fleet/catalog/admin-all');
      setVehicles(res.data || []);
    } catch (e: any) {
      try {
        const publicRes = await api.get<VehicleFleetItem[]>('/api/fleet/catalog');
        setVehicles(publicRes.data || []);
      } catch (err: any) {
        showToast('Error Loading Catalog', apiError(err), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCatalog();
    }
  }, [isOpen]);

  const resetForm = () => {
    setEditingId(null);
    setCategoryBadge('');
    setVehicleModel('');
    setDescription('');
    setImageUrl('');
    setMaxPassengers(4);
    setFeatureHighlight('');
    setLuggageCapacity('6');
    setDailyRateUsd('');
    setCurrency('USD');
    setDisplayOrder(vehicles.length);
    setIsActive(true);
    setIsFormOpen(false);
  };

  const handleOpenAddForm = () => {
    resetForm();
    setDisplayOrder(vehicles.length);
    setIsFormOpen(true);
  };

  const handleEdit = (item: VehicleFleetItem) => {
    setEditingId(item.id);
    setCategoryBadge(item.categoryBadge || '');
    setVehicleModel(item.vehicleModel || '');
    setDescription(item.description || '');
    setImageUrl(item.imageUrl || '');
    setMaxPassengers(item.maxPassengers && item.maxPassengers > 0 ? item.maxPassengers : 1);
    setFeatureHighlight(item.featureHighlight || '');
    // Extract numbers from luggage capacity if formatted as string
    const numericLuggage = item.luggageCapacity ? item.luggageCapacity.replace(/\D/g, '') : '6';
    setLuggageCapacity(numericLuggage || '0');
    setDailyRateUsd(item.dailyRateUsd !== undefined && item.dailyRateUsd !== null ? String(item.dailyRateUsd) : '');
    setCurrency(item.currency || 'USD');
    setDisplayOrder(item.displayOrder || 0);
    setIsActive(item.isActive);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleModel.trim()) {
      showToast('Validation Error', 'Vehicle Model Name is required.', 'error');
      return;
    }
    if (!categoryBadge.trim()) {
      showToast('Validation Error', 'Category Badge is required.', 'error');
      return;
    }
    if (!imageUrl.trim()) {
      showToast('Validation Error', 'Vehicle Photo URL is required.', 'error');
      return;
    }
    if (!imageUrl.trim().startsWith('http://') && !imageUrl.trim().startsWith('https://')) {
      showToast('Invalid Image URL', 'Please provide a valid web image URL starting with http:// or https://, or select one of the curated presets.', 'error');
      return;
    }

    // Strict Numeric Validations
    if (isNaN(Number(maxPassengers)) || Number(maxPassengers) < 1) {
      showToast('Validation Error', 'Max Passengers must be a valid positive number (minimum 1).', 'error');
      return;
    }
    if (luggageCapacity !== '' && (isNaN(Number(luggageCapacity)) || Number(luggageCapacity) < 0)) {
      showToast('Validation Error', 'Luggage Capacity must be a valid non-negative number of bags.', 'error');
      return;
    }
    if (dailyRateUsd !== '' && (isNaN(Number(dailyRateUsd)) || Number(dailyRateUsd) < 0)) {
      showToast('Validation Error', 'Daily Rate must be a valid non-negative number.', 'error');
      return;
    }

    setSubmitting(true);
    const parsedRate = dailyRateUsd !== '' ? Math.max(0, Number(dailyRateUsd)) : undefined;
    const cleanLuggage = luggageCapacity !== '' ? String(Math.max(0, parseInt(luggageCapacity) || 0)) : '0';

    const payload = {
      categoryBadge: categoryBadge.trim(),
      vehicleModel: vehicleModel.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      maxPassengers: Math.max(1, Number(maxPassengers) || 1),
      featureHighlight: featureHighlight.trim(),
      luggageCapacity: cleanLuggage,
      dailyRateUsd: parsedRate,
      currency: currency || 'USD',
      isActive,
      displayOrder: Number(displayOrder) || 0,
    };

    try {
      if (editingId) {
        await api.put(`/api/fleet/catalog/${editingId}`, payload);
        showToast('Fleet Item Updated', `${vehicleModel} has been updated.`, 'success');
      } else {
        await api.post('/api/fleet/catalog', payload);
        showToast('Fleet Model Published', `${vehicleModel} added to fleet showcase.`, 'success');
      }
      resetForm();
      fetchCatalog();
      if (onCatalogUpdated) onCatalogUpdated();
    } catch (err: any) {
      showToast('Save Failed', apiError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: VehicleFleetItem) => {
    try {
      await api.patch(`/api/fleet/catalog/${item.id}/toggle-status`);
      showToast('Status Updated', `${item.vehicleModel} is now ${!item.isActive ? 'Active' : 'Inactive'}.`, 'info');
      fetchCatalog();
      if (onCatalogUpdated) onCatalogUpdated();
    } catch (err: any) {
      showToast('Toggle Failed', apiError(err), 'error');
    }
  };

  const handleDelete = async (item: VehicleFleetItem) => {
    if (!window.confirm(`Are you sure you want to delete ${item.vehicleModel} from the fleet catalog?`)) {
      return;
    }

    try {
      await api.delete(`/api/fleet/catalog/${item.id}`);
      showToast('Fleet Item Deleted', `${item.vehicleModel} removed from showcase.`, 'success');
      fetchCatalog();
      if (onCatalogUpdated) onCatalogUpdated();
    } catch (err: any) {
      showToast('Delete Failed', apiError(err), 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          variants={scaleInModalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="bg-[#0F1A24] border border-[#C5A880]/30 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
        >
          {/* Modal Header */}
          <div className="p-6 bg-[#0B131F] border-b border-[#C5A880]/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#134E4A]/40 border border-[#C5A880]/30 flex items-center justify-center text-[#D4AF37]">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-serif-luxury font-bold text-white flex items-center gap-2">
                  Fleet & Vehicle Catalog Showcase Manager
                </h2>
                <p className="text-xs text-stone-400">
                  Manage public VIP fleet showcase models, passenger capacities, photos & feature highlights.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchCatalog}
                disabled={loading}
                className="p-2 rounded-xl bg-slate-900 text-[#C5A880] border border-[#C5A880]/30 hover:bg-slate-800 transition-colors"
                title="Refresh Catalog"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-stone-400 hover:text-white bg-slate-900 border border-stone-800 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {!isFormOpen ? (
              /* View List & Action Bar */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-stone-800">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider">
                      Active Vehicle Catalog ({vehicles.length} Models)
                    </h3>
                    <p className="text-xs text-stone-400">
                      Items marked active are immediately rendered in the public Fleet Showcase section.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenAddForm}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#C5A880]/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer w-fit"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Add New Fleet Model</span>
                  </button>
                </div>

                {loading ? (
                  <div className="py-12 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-[#C5A880] animate-spin mx-auto" />
                    <p className="text-xs text-stone-400">Loading catalog models from PostgreSQL...</p>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="py-12 text-center space-y-3 bg-slate-900/30 rounded-2xl border border-dashed border-stone-800">
                    <Car className="w-12 h-12 text-stone-600 mx-auto" />
                    <p className="text-sm text-stone-300 font-semibold">No Vehicle Fleet Models Found</p>
                    <p className="text-xs text-stone-500">Click "Add New Fleet Model" above to create your first showcase vehicle.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicles.map((item) => (
                      <div
                        key={item.id}
                        className={`bg-[#0B131F] border rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
                          item.isActive ? 'border-[#C5A880]/30 shadow-lg' : 'border-stone-800 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="relative h-44 overflow-hidden bg-slate-900">
                            <img
                              src={item.imageUrl}
                              alt={item.vehicleModel}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 bg-[#0B131F]/90 border border-[#C5A880]/40 text-[#C5A880] text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {item.categoryBadge}
                            </div>
                            <div className="absolute top-2 right-2">
                              <button
                                onClick={() => handleToggleStatus(item)}
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-md cursor-pointer ${
                                  item.isActive
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                }`}
                              >
                                {item.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                <span>{item.isActive ? 'Active' : 'Inactive'}</span>
                              </button>
                            </div>
                          </div>

                          <div className="p-4 space-y-2">
                            <h4 className="text-base font-serif-luxury font-bold text-stone-100">
                              {item.vehicleModel}
                            </h4>
                            <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-800 text-[11px] text-stone-300">
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-[#134E4A]" /> Max {item.maxPassengers} Pax
                              </span>
                              <span className="flex items-center gap-1 truncate" title={item.featureHighlight}>
                                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> {item.featureHighlight || 'VIP Interior'}
                              </span>
                              <span className="flex items-center gap-1" title={item.luggageCapacity}>
                                <Luggage className="w-3.5 h-3.5 text-[#134E4A]" /> {item.luggageCapacity || 'Luggage Space'}
                              </span>
                              {item.dailyRateUsd ? (
                                <span className="flex items-center gap-1 text-[#C5A880] font-semibold">
                                  {getCurrencySymbol(item.currency)}{item.dailyRateUsd}/day
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-900/60 border-t border-stone-800 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-stone-500 font-mono">
                            Order: #{item.displayOrder}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-[#C5A880] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Add / Edit Form */
              <form onSubmit={handleSave} className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                  <h3 className="text-lg font-serif-luxury font-bold text-[#C5A880]">
                    {editingId ? 'Edit Fleet Showcase Model' : 'Create New Fleet Model'}
                  </h3>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-stone-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900 border border-stone-800 cursor-pointer"
                  >
                    Back to Catalog List
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Model Specs */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                        Category Badge <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={categoryBadge}
                        onChange={(e) => setCategoryBadge(e.target.value)}
                        placeholder="e.g. EXECUTIVE VIP GROUP TRANSPORT"
                        required
                        className="w-full px-4 py-2.5 bg-slate-900 border border-stone-700 rounded-xl text-stone-100 text-xs focus:outline-none focus:border-[#C5A880]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                        Vehicle Model Name <span className="text-amber-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        placeholder="Enter vehicle model name"
                        required
                        className="w-full px-4 py-2.5 bg-slate-900 border border-stone-700 rounded-xl text-stone-100 text-xs focus:outline-none focus:border-[#C5A880]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          Max Passengers <span className="text-amber-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={maxPassengers}
                          onKeyDown={(e) => blockNonNumericKeys(e, false)}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val < 1) {
                              setMaxPassengers(1);
                            } else {
                              setMaxPassengers(isNaN(val) ? 1 : Math.max(1, val));
                            }
                          }}
                          className="w-full px-4 py-2.5 bg-slate-900 border border-stone-700 rounded-xl text-stone-100 text-xs focus:outline-none focus:border-[#C5A880]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          Luggage Capacity (Max Bags)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={luggageCapacity}
                          onKeyDown={(e) => blockNonNumericKeys(e, false)}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val < 0) {
                              setLuggageCapacity('0');
                            } else {
                              setLuggageCapacity(isNaN(val) ? '' : String(Math.max(0, val)));
                            }
                          }}
                          placeholder="e.g. 6"
                          className="w-full px-4 py-2.5 bg-slate-900 border border-stone-700 rounded-xl text-stone-100 text-xs focus:outline-none focus:border-[#C5A880]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          Feature Highlight
                        </label>
                        <input
                          type="text"
                          value={featureHighlight}
                          onChange={(e) => setFeatureHighlight(e.target.value)}
                          placeholder="e.g. VIP Leather Interior"
                          className="w-full px-4 py-2.5 bg-slate-900 border border-stone-700 rounded-xl text-stone-100 text-xs focus:outline-none focus:border-[#C5A880]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                          Daily Rate & Currency
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="px-3 py-2.5 bg-slate-900 border border-stone-700 rounded-xl text-stone-100 text-xs focus:outline-none focus:border-[#C5A880] cursor-pointer"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="LKR">LKR (Rs)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={dailyRateUsd}
                            onKeyDown={(e) => blockNonNumericKeys(e, true)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val < 0) {
                                setDailyRateUsd('0');
                              } else {
                                setDailyRateUsd(e.target.value);
                              }
                            }}
                            placeholder="e.g. 150"
                            className="w-full px-4 py-2.5 bg-slate-900 border border-stone-700 rounded-xl text-stone-100 text-xs focus:outline-none focus:border-[#C5A880]"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                        Description & Cabin Features
                      </label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Dual air-conditioned luxury seating with reclining leather armchairs, onboard 5G Wi-Fi..."
                        className="w-full px-4 py-2.5 bg-slate-900 border border-stone-700 rounded-xl text-stone-100 text-xs focus:outline-none focus:border-[#C5A880]"
                      />
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isActiveCheck"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="w-4 h-4 rounded text-[#C5A880] focus:ring-[#C5A880]"
                        />
                        <label htmlFor="isActiveCheck" className="text-xs font-semibold text-stone-300 cursor-pointer">
                          Publish / Active Immediately
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-stone-400">Display Order:</label>
                        <input
                          type="number"
                          value={displayOrder}
                          onChange={(e) => setDisplayOrder(Number(e.target.value))}
                          className="w-20 px-3 py-1 bg-slate-900 border border-stone-700 rounded-lg text-stone-100 text-xs text-center"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Photo URL & Real-time Preview */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>High-Res Web Photo URL</span>
                          <span className="text-amber-500">*</span>
                        </label>
                        {imageUrl && (
                          <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            className="text-[11px] text-stone-400 hover:text-amber-400 font-mono transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                          <LinkIcon className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="url"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-..."
                          required
                          className="w-full pl-9 pr-24 py-2.5 bg-slate-900 border border-stone-700 rounded-xl text-stone-100 text-xs focus:outline-none focus:border-[#C5A880]"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                                setImageUrl(text);
                                showToast('URL Pasted', 'Image URL pasted from clipboard.', 'info');
                              } else {
                                showToast('Invalid Clipboard', 'Clipboard does not contain a valid web URL.', 'error');
                              }
                            } catch {
                              showToast('Permission Needed', 'Please manually paste the URL into the field.', 'error');
                            }
                          }}
                          className="absolute right-1.5 top-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[#C5A880] text-[11px] font-semibold border border-stone-700 transition-colors cursor-pointer"
                        >
                          Paste URL
                        </button>
                      </div>

                    </div>

                    {/* Real-Time Preview Card */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider font-semibold">
                        Real-Time Public Card Preview:
                      </span>
                      <div className="bg-[#0B131F] border border-[#C5A880]/40 rounded-2xl overflow-hidden shadow-xl">
                        <div className="relative h-44 bg-slate-900">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = FLEET_IMAGES.kdhVan;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-600 text-xs">
                              No Image URL Provided
                            </div>
                          )}
                          <div className="absolute top-3 left-3 bg-[#0B131F]/90 border border-[#C5A880]/40 text-[#C5A880] text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            {categoryBadge || 'CATEGORY BADGE'}
                          </div>
                        </div>

                        <div className="p-4 space-y-2">
                          <h4 className="text-base font-serif-luxury font-bold text-stone-100">
                            {vehicleModel || 'Vehicle Model Title'}
                          </h4>
                          <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                            {description || 'Vehicle description details and cabin luxury highlights will be displayed here.'}
                          </p>
                          <div className="flex items-center gap-4 text-[11px] text-stone-300 pt-2 border-t border-stone-800">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-[#134E4A]" /> Up to {maxPassengers} Pax
                            </span>
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> {featureHighlight || 'Feature Highlight'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-stone-300 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#C5A880]/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    <span>Publish to Fleet Showcase</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
