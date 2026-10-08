import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Users, Luggage, Wifi, ShieldCheck, Car, Sparkles, RefreshCw, Gauge } from 'lucide-react';
import { api } from '../../api/client';
import { hoverLiftProps } from '../../utils/animations';
import { VehicleFleetItem } from './FleetCatalogManagerModal';
import { FLEET_IMAGES } from '../../utils/mediaData';

interface FleetShowcaseSectionProps {
  layout?: 'grid' | 'horizontal-cards';
  showTitle?: boolean;
}

import { useCurrency } from '../../context/CurrencyContext';

export const FleetShowcaseSection: React.FC<FleetShowcaseSectionProps> = ({
  layout = 'grid',
  showTitle = true,
}) => {
  const { formatPrice } = useCurrency();
  const [fleetItems, setFleetItems] = useState<VehicleFleetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFleetCatalog();
  }, []);

  const fetchFleetCatalog = async () => {
    setLoading(true);
    try {
      const res = await api.get<VehicleFleetItem[]>('/api/fleet/catalog');
      setFleetItems(res.data || []);
    } catch {
      setFleetItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#C5A880] animate-spin mx-auto" />
        <p className="text-xs text-stone-500">Synchronizing private fleet catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {showTitle && (
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-mono tracking-widest text-[#134E4A] uppercase font-semibold">
            Unrivaled Comfort & Safety
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif-luxury font-bold text-[#0B131F]">
            Our Private Fleet & Certified Guides
          </h2>
          <p className="text-stone-600 text-sm leading-relaxed">
            All vehicles are company-owned, climate-controlled, equipped with Wi-Fi, and piloted by English/German/French fluent SLTDA-licensed guides.
          </p>
        </div>
      )}

      {layout === 'horizontal-cards' ? (
        /* Horizontal Split Cards Layout (Used in HomePage) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {fleetItems.map((item) => (
            <motion.div
              key={item.id}
              {...hoverLiftProps}
              className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xl flex flex-col sm:flex-row group"
            >
              <div className="sm:w-1/2 relative h-56 sm:h-auto overflow-hidden bg-stone-100">
                <img
                  src={item.imageUrl}
                  alt={item.vehicleModel}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FLEET_IMAGES.kdhVan;
                  }}
                />
              </div>
              <div className="sm:w-1/2 p-6 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[11px] font-semibold text-[#134E4A] uppercase tracking-wider block mb-1">
                    {item.categoryBadge}
                  </span>
                  <h3 className="text-xl font-serif-luxury font-bold text-[#0B131F]">
                    {item.vehicleModel}
                  </h3>
                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 pt-3 border-t border-stone-100">
                  <span className="flex items-center gap-1 font-semibold text-[#0B131F]">
                    <Users className="w-3.5 h-3.5 text-[#134E4A]" /> Up to {item.maxPassengers} Passengers
                  </span>
                  {item.featureHighlight && (
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> {item.featureHighlight}
                    </span>
                  )}
                  {item.luggageCapacity && (
                    <span className="flex items-center gap-1">
                      <Luggage className="w-3.5 h-3.5 text-[#134E4A]" /> {item.luggageCapacity}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Vertical Cards Grid Layout (Used in FleetPage) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {fleetItems.map((item) => (
            <motion.div
              key={item.id}
              {...hoverLiftProps}
              className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="relative h-64 overflow-hidden bg-stone-100">
                  <img
                    src={item.imageUrl}
                    alt={item.vehicleModel}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FLEET_IMAGES.kdhVan;
                    }}
                  />
                  <div className="absolute top-3 left-3 bg-[#0B131F]/80 text-[#C5A880] text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                    {item.categoryBadge}
                  </div>
                  {item.dailyRateUsd ? (
                    <div className="absolute bottom-3 right-3 bg-[#134E4A]/90 text-stone-100 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      From {formatPrice(item.dailyRateUsd)}/day
                    </div>
                  ) : null}
                </div>
                <div className="p-6 space-y-4">
                  <h3 className="text-2xl font-serif-luxury font-bold text-[#0B131F]">
                    {item.vehicleModel}
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-stone-100">
                    <span className="flex items-center gap-1.5 font-medium text-stone-700">
                      <Users className="w-4 h-4 text-[#134E4A]" /> Up to {item.maxPassengers} Passengers
                    </span>
                    {item.luggageCapacity && (
                      <span className="flex items-center gap-1.5 font-medium text-stone-700">
                        <Luggage className="w-4 h-4 text-[#134E4A]" /> {item.luggageCapacity}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 font-medium text-stone-700">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" /> {item.featureHighlight || 'VIP Comfort'}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-stone-700">
                      <ShieldCheck className="w-4 h-4 text-[#134E4A]" /> SLTDA Certified Chauffeur
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Capacity & Fleet Dispatch AI Agent Launcher Bar */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between p-5 bg-[#0F1A24] border border-stone-800 rounded-2xl gap-4 shadow-xl">
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#D4AF37] shrink-0">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif-luxury font-bold text-stone-100 text-sm">
              Live Capacity & Fleet Dispatch Agent (Agent 3)
            </h4>
            <p className="text-xs text-stone-400">
              Calculate instant route logistics, elevation physics, and available fleet allocations in real time.
            </p>
          </div>
        </div>

        <Link to="/operations/capacity-dispatch" className="shrink-0">
          <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B89628] hover:from-[#E5C158] hover:to-[#D4AF37] text-slate-950 text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20 transition-all cursor-pointer">
            <Gauge className="w-4 h-4" />
            <span>Launch Fleet Dispatch ➔</span>
          </button>
        </Link>
      </div>
    </div>
  );
};
