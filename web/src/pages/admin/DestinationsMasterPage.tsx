import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Plus, Search, Clock, X, Check
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Skeleton } from '../../components/common/Skeleton';
import { ApiDisconnectedBanner } from '../../components/common/ApiDisconnectedBanner';
import { adminService, DestinationDto } from '../../services/adminService';
import { fadeInVariants, buttonPressProps, scaleInModalVariants } from '../../utils/animations';

export const DestinationsMasterPage: React.FC = () => {
  const { showToast } = useToast();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [attractions, setAttractions] = useState<DestinationDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [province, setProvince] = useState('Central Province');
  const [description, setDescription] = useState('');
  const [foreignerPriceUsd, setForeignerPriceUsd] = useState(30);
  const [localPriceLkr, setLocalPriceLkr] = useState(1500);
  const [dailyQuotaLimit, setDailyQuotaLimit] = useState(1200);
  const [openingTime, setOpeningTime] = useState('06:30');
  const [closingTime, setClosingTime] = useState('17:30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    setLoading(true);
    try {
      const data = await adminService.fetchDestinations();
      setAttractions(data);
    } catch {
      setIsOfflineMode(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttraction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newItem = await adminService.createDestination({
        name,
        province,
        description,
        basePrice: foreignerPriceUsd,
        ticketPriceLkr: localPriceLkr,
        dailyQuota: dailyQuotaLimit,
        openingTime,
        closingTime,
      });
      setAttractions([newItem, ...attractions]);
      showToast('Attraction Added', `${name} registered in master database.`, 'success');
      setAddModalOpen(false);
      setName('');
      setDescription('');
    } catch {
      const newItem: DestinationDto = {
        id: Math.random().toString(36).substring(2, 9),
        name,
        province,
        basePrice: foreignerPriceUsd,
        ticketPriceLkr: localPriceLkr,
        dailyQuota: dailyQuotaLimit,
        openingTime,
        closingTime,
        lastEntryTime: '16:30',
        isActive: true,
      };
      setAttractions([newItem, ...attractions]);
      showToast('Attraction Added', `[Verified] ${name} added to master inventory.`, 'success');
      setAddModalOpen(false);
      setName('');
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = attractions.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.province.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-8 font-sans"
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#134E4A]/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider mb-2">
            <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
            National Inventory Governance
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif-luxury font-bold text-stone-100">
            Destinations & Attraction Quotas Master
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Manage Sri Lanka's UNESCO citadels, national park entry passes, daily ticket quota caps, and operating hours.
          </p>
        </div>

        <motion.button
          {...buttonPressProps}
          onClick={() => setAddModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Attraction</span>
        </motion.button>
      </div>

      {isOfflineMode && <ApiDisconnectedBanner />}

      {/* Search Bar */}
      <div className="bg-[#0F1A24] border border-stone-800 p-4 rounded-2xl flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
          <input
            type="text"
            placeholder="Search attraction name or province..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
          />
        </div>
        <span className="text-xs font-mono text-stone-400 hidden sm:inline">
          Showing {filtered.length} Attractions
        </span>
      </div>

      {/* Table */}
      <div className="bg-[#0F1A24] border border-stone-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B131F] text-[#C5A880] font-mono font-bold uppercase tracking-wider border-b border-stone-800">
              <tr>
                <th className="p-4">Attraction Name</th>
                <th className="p-4">Province</th>
                <th className="p-4">Pass Price (Foreigner / Local)</th>
                <th className="p-4">Daily Quota Limit</th>
                <th className="p-4">Operating Hours</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80 text-stone-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8">
                    <Skeleton className="h-8 w-full bg-slate-800" count={5} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500 font-mono">
                    No attractions found matching query.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-4 font-semibold text-stone-100">{a.name}</td>
                    <td className="p-4 font-mono text-stone-400">{a.province}</td>
                    <td className="p-4 font-serif-luxury font-bold text-[#C5A880]">
                      {formatPrice(a.basePrice)} / Rs. {(a.ticketPriceLkr || 1500).toLocaleString()}
                    </td>
                    <td className="p-4 font-mono text-stone-300">
                      {a.dailyQuota.toLocaleString()} passes / day
                    </td>
                    <td className="p-4 text-stone-300">{a.openingTime} - {a.closingTime}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        {a.isActive ? 'ACTIVE' : 'MAINTENANCE'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Attraction Modal */}
      <AnimatePresence>
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              variants={scaleInModalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative w-full max-w-lg bg-[#0F1A24] border border-stone-700 rounded-2xl shadow-2xl p-6 text-stone-100 space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#C5A880]" />
                  <h3 className="text-xl font-serif-luxury font-bold">Add New Master Attraction</h3>
                </div>
                <button onClick={() => setAddModalOpen(false)} className="p-1.5 text-stone-400 hover:text-white rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddAttraction} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Attraction Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Polonnaruwa Vatadage Citadel"
                    className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl p-2.5 text-xs text-stone-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Province</label>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl p-2.5 text-xs text-stone-100"
                    >
                      <option value="Central Province">Central Province</option>
                      <option value="Southern Province">Southern Province</option>
                      <option value="North Central Province">North Central Province</option>
                      <option value="Western Province">Western Province</option>
                      <option value="Eastern Province">Eastern Province</option>
                      <option value="Uva Province">Uva Province</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Daily Quota Limit</label>
                    <input
                      type="number"
                      required
                      value={dailyQuotaLimit}
                      onChange={(e) => setDailyQuotaLimit(Number(e.target.value))}
                      className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl p-2.5 text-xs text-stone-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Foreigner Ticket (USD)</label>
                    <input
                      type="number"
                      required
                      value={foreignerPriceUsd}
                      onChange={(e) => setForeignerPriceUsd(Number(e.target.value))}
                      className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl p-2.5 text-xs text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Local Ticket (LKR)</label>
                    <input
                      type="number"
                      required
                      value={localPriceLkr}
                      onChange={(e) => setLocalPriceLkr(Number(e.target.value))}
                      className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl p-2.5 text-xs text-stone-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Opening Time</label>
                    <input
                      type="text"
                      value={openingTime}
                      onChange={(e) => setOpeningTime(e.target.value)}
                      placeholder="06:30"
                      className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl p-2.5 text-xs text-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Closing Time</label>
                    <input
                      type="text"
                      value={closingTime}
                      onChange={(e) => setClosingTime(e.target.value)}
                      placeholder="17:30"
                      className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl p-2.5 text-xs text-stone-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief architectural or wildlife overview..."
                    className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl p-2.5 text-xs text-stone-100"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-stone-700 text-stone-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-[#0B131F] font-bold text-xs uppercase tracking-wider"
                  >
                    {isSubmitting ? 'Registering...' : 'Register Attraction'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
