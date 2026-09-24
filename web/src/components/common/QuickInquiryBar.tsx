import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Calendar as CalendarIcon, Users, Sparkles, ChevronDown, ChevronLeft, ChevronRight, ArrowRight, Check, Plus, Minus, Info
} from 'lucide-react';
import { buttonPressProps } from '../../utils/animations';

interface RegionOption {
  id: string;
  title: string;
  subtitle: string;
}

const REGIONS: RegionOption[] = [
  { id: 'Cultural Heartland', title: 'Cultural Heartland', subtitle: 'Sigiriya Rock, Dambulla Caves & Ancient Kingdoms' },
  { id: 'Highlands of Tea', title: 'Highlands of Tea', subtitle: 'Nuwara Eliya, Ella Misty Trails & Colonial Rail' },
  { id: 'Untamed Deep South', title: 'Untamed Deep South', subtitle: 'Yala Leopard Safaris & Udawalawe Elephants' },
  { id: 'Southern Riviera', title: 'Southern Riviera', subtitle: 'Galle Dutch Fort, Mirissa & Sunlit Coast' },
  { id: 'Island-Wide Grand Circuit', title: 'Island-Wide Grand Circuit', subtitle: 'Complete bespoke Sri Lanka discovery' },
];

interface StyleOption {
  id: string;
  title: string;
  subtitle: string;
}

const STYLES: StyleOption[] = [
  { id: 'Bespoke Heritage & Culture', title: 'Bespoke Heritage & Culture', subtitle: 'UNESCO citadels & private archeological curators' },
  { id: 'Wild Safaris & Conservation', title: 'Wild Safaris & Conservation', subtitle: 'Leopard tracking & ethical wildlife sanctuaries' },
  { id: 'Highland Tea & Scenic Railways', title: 'Highland Tea & Scenic Railways', subtitle: 'Colonial tea bungalows & first-class hill rail' },
  { id: 'Barefoot Luxury Coastal Retreat', title: 'Barefoot Luxury Coastal Retreat', subtitle: 'Private whale expeditions & secluded coral coves' },
  { id: 'Ayurveda, Yoga & Holistic Wellness', title: 'Ayurveda, Yoga & Holistic Wellness', subtitle: 'Holistic Sri Lankan healing & sanctuary retreats' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const QuickInquiryBar: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Active Open Popover State ('region' | 'dates' | 'guests' | 'style' | null)
  const [activePopover, setActivePopover] = useState<'region' | 'dates' | 'guests' | 'style' | null>(null);

  // Field 1: Selected Region
  const [selectedRegion, setSelectedRegion] = useState<RegionOption>(REGIONS[0]);

  // Field 2: Selected Date Range
  const defaultStart = new Date(2026, 10, 12); // Nov 12, 2026
  const defaultEnd = new Date(2026, 10, 19);   // Nov 19, 2026
  const [startDate, setStartDate] = useState<Date | null>(defaultStart);
  const [endDate, setEndDate] = useState<Date | null>(defaultEnd);
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date(2026, 10, 1)); // Nov 2026
  const [selectingState, setSelectingState] = useState<'start' | 'end'>('start');

  // Field 3: Guests Counter
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);

  // Field 4: Travel Style
  const [selectedStyle, setSelectedStyle] = useState<StyleOption>(STYLES[0]);

  // Click Outside Listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format Date Helper
  const formatDateString = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formattedDateRange = () => {
    if (startDate && endDate) {
      const startMonth = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startMonth} — ${endMonth}`;
    }
    if (startDate) return `${formatDateString(startDate)} — Select End`;
    return 'Select Dates';
  };

  // Date Calendar Logic
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

  const handleDateClick = (dayNum: number) => {
    const clicked = new Date(year, month, dayNum);
    if (selectingState === 'start' || (startDate && clicked < startDate)) {
      setStartDate(clicked);
      setEndDate(null);
      setSelectingState('end');
    } else {
      setEndDate(clicked);
      setSelectingState('start');
    }
  };

  const isSelectedDate = (dayNum: number) => {
    const target = new Date(year, month, dayNum).getTime();
    return (startDate && startDate.getTime() === target) || (endDate && endDate.getTime() === target);
  };

  const isInRange = (dayNum: number) => {
    if (!startDate || !endDate) return false;
    const target = new Date(year, month, dayNum).getTime();
    return target > startDate.getTime() && target < endDate.getTime();
  };

  // Date Presets
  const applyPreset = (preset: 'nextMonth' | 'winter' | 'spring') => {
    if (preset === 'nextMonth') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() + 1, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 18);
      setStartDate(start);
      setEndDate(end);
      setCurrentMonthDate(start);
    } else if (preset === 'winter') {
      const start = new Date(2026, 11, 10); // Dec 10, 2026
      const end = new Date(2026, 11, 18);   // Dec 18, 2026
      setStartDate(start);
      setEndDate(end);
      setCurrentMonthDate(start);
    } else if (preset === 'spring') {
      const start = new Date(2027, 2, 15);  // Mar 15, 2027
      const end = new Date(2027, 2, 23);    // Mar 23, 2027
      setStartDate(start);
      setEndDate(end);
      setCurrentMonthDate(start);
    }
  };

  // Submit Handler
  const handleExploreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActivePopover(null);
    const guestsSummary = `${adults} Adults${children > 0 ? `, ${children} Children` : ''}`;
    const params = new URLSearchParams({
      region: selectedRegion.title,
      dates: formattedDateRange(),
      guests: guestsSummary,
      style: selectedStyle.title,
    });
    navigate(`/plan-my-trip?${params.toString()}`);
  };

  return (
    <div ref={containerRef} className="relative z-30 max-w-6xl mx-auto -mt-14 px-4 font-sans">
      <motion.form
        onSubmit={handleExploreSubmit}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.8 }}
        className="bg-[#0B131F]/90 backdrop-blur-2xl border border-[#C5A880]/30 rounded-2xl p-4 md:p-6 shadow-2xl text-stone-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
      >
        {/* FIELD 1: DESTINATION REGION */}
        <div className="relative">
          <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
            Destination Region
          </label>
          <button
            type="button"
            onClick={() => setActivePopover(activePopover === 'region' ? null : 'region')}
            className={`w-full bg-[#0F1A24] border ${
              activePopover === 'region' ? 'border-[#C5A880]' : 'border-stone-700/80'
            } hover:border-[#C5A880]/70 rounded-xl px-3.5 py-3 text-left transition-all flex items-center justify-between group`}
          >
            <span className="text-xs font-semibold text-stone-100 truncate pr-2">
              {selectedRegion.title}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#C5A880] shrink-0 transition-transform ${
              activePopover === 'region' ? 'rotate-180' : ''
            }`} />
          </button>

          {/* Region Popover */}
          <AnimatePresence>
            {activePopover === 'region' && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 bottom-full mb-3 w-80 bg-[#0F1A24]/95 backdrop-blur-2xl border border-[#C5A880]/30 shadow-2xl rounded-2xl p-3 z-50 text-stone-100 space-y-1"
              >
                <div className="text-[10px] font-mono font-bold text-[#C5A880] uppercase tracking-wider px-2 py-1 border-b border-stone-800/80 mb-1">
                  Select Sri Lanka Region
                </div>
                {REGIONS.map((r) => {
                  const isSelected = selectedRegion.id === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setSelectedRegion(r);
                        setActivePopover(null);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between group ${
                        isSelected
                          ? 'bg-[#134E4A]/40 border border-[#C5A880]/50'
                          : 'hover:bg-slate-900 border border-transparent hover:border-stone-700'
                      }`}
                    >
                      <div>
                        <div className={`text-xs font-bold ${isSelected ? 'text-[#C5A880]' : 'text-stone-100 group-hover:text-[#C5A880]'}`}>
                          {r.title}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5 leading-snug">
                          {r.subtitle}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#C5A880] shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FIELD 2: TRAVEL DATES */}
        <div className="relative">
          <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
            Travel Dates
          </label>
          <button
            type="button"
            onClick={() => setActivePopover(activePopover === 'dates' ? null : 'dates')}
            className={`w-full bg-[#0F1A24] border ${
              activePopover === 'dates' ? 'border-[#C5A880]' : 'border-stone-700/80'
            } hover:border-[#C5A880]/70 rounded-xl px-3.5 py-3 text-left transition-all flex items-center justify-between group`}
          >
            <span className="text-xs font-semibold text-stone-100 truncate pr-2">
              {formattedDateRange()}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#C5A880] shrink-0 transition-transform ${
              activePopover === 'dates' ? 'rotate-180' : ''
            }`} />
          </button>

          {/* Interactive Date Range Calendar Popover */}
          <AnimatePresence>
            {activePopover === 'dates' && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 sm:left-auto sm:right-0 lg:left-0 bottom-full mb-3 w-80 sm:w-88 bg-[#0F1A24]/95 backdrop-blur-2xl border border-[#C5A880]/30 shadow-2xl rounded-2xl p-4 z-50 text-stone-100 space-y-4"
              >
                {/* Month Navigation */}
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <button
                    type="button"
                    onClick={() => setCurrentMonthDate(new Date(year, month - 1, 1))}
                    className="p-1 hover:text-[#C5A880] text-stone-400 rounded-lg hover:bg-stone-900"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-serif-luxury font-bold text-[#C5A880] tracking-wide">
                    {MONTH_NAMES[month]} {year}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentMonthDate(new Date(year, month + 1, 1))}
                    className="p-1 hover:text-[#C5A880] text-stone-400 rounded-lg hover:bg-stone-900"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Day Names Header */}
                <div className="grid grid-cols-7 text-center text-[10px] font-mono text-stone-400">
                  <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium">
                  {/* Empty cells before month start */}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-8" />
                  ))}

                  {/* Day Buttons */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const selected = isSelectedDate(dayNum);
                    const range = isInRange(dayNum);

                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => handleDateClick(dayNum)}
                        className={`h-8 rounded-lg flex items-center justify-center transition-all ${
                          selected
                            ? 'bg-gradient-to-r from-[#C5A880] to-[#D4AF37] text-slate-950 font-bold shadow'
                            : range
                            ? 'bg-[#134E4A]/50 text-emerald-200 font-semibold'
                            : 'hover:bg-stone-800 text-stone-200'
                        }`}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>

                {/* Presets Footer */}
                <div className="pt-2 border-t border-stone-800/80 space-y-2">
                  <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                    Quick Season Presets
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyPreset('nextMonth')}
                      className="px-2.5 py-1 rounded-full text-[10px] bg-slate-900 border border-stone-700 hover:border-[#C5A880] text-stone-300 transition-colors"
                    >
                      Next Month
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('winter')}
                      className="px-2.5 py-1 rounded-full text-[10px] bg-slate-900 border border-stone-700 hover:border-[#C5A880] text-[#C5A880] font-semibold transition-colors"
                    >
                      Winter Peak (Dec)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('spring')}
                      className="px-2.5 py-1 rounded-full text-[10px] bg-slate-900 border border-stone-700 hover:border-[#C5A880] text-stone-300 transition-colors"
                    >
                      Spring Escapes
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FIELD 3: GUESTS COUNT */}
        <div className="relative">
          <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
            Guests Count
          </label>
          <button
            type="button"
            onClick={() => setActivePopover(activePopover === 'guests' ? null : 'guests')}
            className={`w-full bg-[#0F1A24] border ${
              activePopover === 'guests' ? 'border-[#C5A880]' : 'border-stone-700/80'
            } hover:border-[#C5A880]/70 rounded-xl px-3.5 py-3 text-left transition-all flex items-center justify-between group`}
          >
            <span className="text-xs font-semibold text-stone-100 truncate pr-2">
              {adults} Adult{adults > 1 ? 's' : ''}{children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ''}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#C5A880] shrink-0 transition-transform ${
              activePopover === 'guests' ? 'rotate-180' : ''
            }`} />
          </button>

          {/* Stepper Popover */}
          <AnimatePresence>
            {activePopover === 'guests' && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 bottom-full mb-3 w-80 bg-[#0F1A24]/95 backdrop-blur-2xl border border-[#C5A880]/30 shadow-2xl rounded-2xl p-4 z-50 text-stone-100 space-y-4"
              >
                <div className="text-[10px] font-mono font-bold text-[#C5A880] uppercase tracking-wider border-b border-stone-800 pb-1">
                  Traveler Party Composition
                </div>

                {/* Adults Stepper */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-stone-100">Adults</div>
                    <div className="text-[10px] text-stone-400">Ages 12+</div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-900 p-1 rounded-xl border border-stone-700">
                    <button
                      type="button"
                      disabled={adults <= 1}
                      onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                      className="p-1 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-30"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{adults}</span>
                    <button
                      type="button"
                      disabled={adults >= 12}
                      onClick={() => setAdults((prev) => Math.min(12, prev + 1))}
                      className="p-1 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Children Stepper */}
                <div className="flex items-center justify-between border-t border-stone-800 pt-3">
                  <div>
                    <div className="text-xs font-bold text-stone-100">Children</div>
                    <div className="text-[10px] text-stone-400">Ages 2-11</div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-900 p-1 rounded-xl border border-stone-700">
                    <button
                      type="button"
                      disabled={children <= 0}
                      onClick={() => setChildren((prev) => Math.max(0, prev - 1))}
                      className="p-1 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-30"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{children}</span>
                    <button
                      type="button"
                      disabled={children >= 6}
                      onClick={() => setChildren((prev) => Math.min(6, prev + 1))}
                      className="p-1 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Chauffeur Vehicle Guide Notice */}
                <div className="p-3 bg-[#134E4A]/30 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-200 leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#C5A880] block">Chauffeur Fleet Recommendation:</span>
                    {adults + children <= 3
                      ? '1-3 Guests: Mercedes-Benz E-Class Prestige Sedan'
                      : '4-6 Guests: Executive Toyota KDH Super GL VIP Van'}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FIELD 4: TRAVEL STYLE */}
        <div className="relative">
          <label className="block text-xs font-semibold text-[#C5A880] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            Travel Style
          </label>
          <button
            type="button"
            onClick={() => setActivePopover(activePopover === 'style' ? null : 'style')}
            className={`w-full bg-[#0F1A24] border ${
              activePopover === 'style' ? 'border-[#C5A880]' : 'border-stone-700/80'
            } hover:border-[#C5A880]/70 rounded-xl px-3.5 py-3 text-left transition-all flex items-center justify-between group`}
          >
            <span className="text-xs font-semibold text-stone-100 truncate pr-2">
              {selectedStyle.title}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#C5A880] shrink-0 transition-transform ${
              activePopover === 'style' ? 'rotate-180' : ''
            }`} />
          </button>

          {/* Travel Style Popover */}
          <AnimatePresence>
            {activePopover === 'style' && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 bottom-full mb-3 w-80 bg-[#0F1A24]/95 backdrop-blur-2xl border border-[#C5A880]/30 shadow-2xl rounded-2xl p-3 z-50 text-stone-100 space-y-1"
              >
                <div className="text-[10px] font-mono font-bold text-[#C5A880] uppercase tracking-wider px-2 py-1 border-b border-stone-800/80 mb-1">
                  Select Travel Philosophy
                </div>
                {STYLES.map((s) => {
                  const isSelected = selectedStyle.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedStyle(s);
                        setActivePopover(null);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between group ${
                        isSelected
                          ? 'bg-[#134E4A]/40 border border-[#C5A880]/50'
                          : 'hover:bg-slate-900 border border-transparent hover:border-stone-700'
                      }`}
                    >
                      <div>
                        <div className={`text-xs font-bold ${isSelected ? 'text-[#C5A880]' : 'text-stone-100 group-hover:text-[#C5A880]'}`}>
                          {s.title}
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5 leading-snug">
                          {s.subtitle}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#C5A880] shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ACTION BUTTON */}
        <div>
          <motion.button
            {...buttonPressProps}
            type="submit"
            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:brightness-110 text-slate-950 font-bold text-xs tracking-wider uppercase px-6 py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
          >
            <span>Explore Journeys</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
};
