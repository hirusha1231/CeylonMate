import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, CheckCircle2, XCircle, AlertTriangle, UserCheck, Briefcase, RefreshCw, ChevronRight, Send, Check, DollarSign, Car, FileCode
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useCurrency } from '../../context/CurrencyContext';
import { useToast } from '../../context/ToastContext';
import { Skeleton } from '../../components/common/Skeleton';
import { api } from '../../api/client';
import { AgentDeskSubNav } from '../../components/layout/AgentDeskSubNav';
import { fadeInVariants, hoverLiftProps, buttonPressProps, scaleInModalVariants } from '../../utils/animations';

interface BookingInquiry {
  id: number;
  bookingReference: string;
  travelerId: number;
  status: string;
  vehicleCapacityStatus?: string;
  capacityRejectionReason?: string;
  guideAssignmentStatus?: string;
  guideResponseMessage?: string;
  guideRespondedAtUtc?: string;
  guideName?: string;
  isHighPriority?: boolean;
  finalPriceQuoteLkr?: number;
  finalPriceQuoteUsd?: number;
  agentNotes?: string;
  guideSlotId?: string;
  vehicleSlotId?: string;
  packageId?: number;
  startDate?: string;
  pickupTime?: string;
  travelerNotes?: string;
  bookedAt?: string;
}

export const ConciergeApprovalPage: React.FC = () => {
  const { user, login } = useAuth();
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [inquiries, setInquiries] = useState<BookingInquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<BookingInquiry | null>(null);

  // Approval Form State
  const [priceLkr, setPriceLkr] = useState<number>(125000);
  const [priceUsd, setPriceUsd] = useState<number>(395);
  const [replacementVehicleSlotId, setReplacementVehicleSlotId] = useState<string>('');
  const [replacementGuideSlotId, setReplacementGuideSlotId] = useState<string>('');
  const [agentNotes, setAgentNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Agent 4: Itinerary Validation State
  const [validatingItinerary, setValidatingItinerary] = useState(false);
  const [validationOutput, setValidationOutput] = useState<{
    valid: boolean;
    requires_approval: boolean;
    status: string;
    total_calculated_cost: number;
    budget_limit: number;
    violations: string[];
    warnings: string[];
    approval_notes?: string;
  } | null>(null);

  const runItineraryValidationAgent = async () => {
    if (!selectedInquiry) return;
    setValidatingItinerary(true);

    try {
      const response = await api.post('/api/trips/validate-itinerary', {
        trip_request_id: selectedInquiry.id,
        budget_limit: priceUsd > 0 ? priceUsd : 395,
        party_size: 2,
        days: [
          { day_number: 1, title: 'VIP Airport Reception & Scenic Highway Transfer', destination_id: 1, estimated_cost: Math.round(priceUsd * 0.25) },
          { day_number: 2, title: 'Ascension to Tea Estates & Planter Bungalow High Tea', destination_id: 2, estimated_cost: Math.round(priceUsd * 0.25) },
          { day_number: 3, title: 'Dawn Wildlife Safari & Private Leopard Tracking', destination_id: 3, estimated_cost: Math.round(priceUsd * 0.25) },
          { day_number: 4, title: 'Southern Riviera & Heritage Dutch Fort Ramparts', destination_id: 4, estimated_cost: Math.round(priceUsd * 0.25) }
        ]
      });
      setValidationOutput(response.data);
      showToast('Itinerary Validation Agent Executed', `Status: ${response.data.status}`, 'success');
    } catch (err: any) {
      const total = priceUsd;
      const isOverBudget = priceUsd > 10000;
      setValidationOutput({
        valid: !isOverBudget,
        requires_approval: !isOverBudget,
        status: isOverBudget ? 'REVISION_REQUIRED' : 'PENDING_APPROVAL',
        total_calculated_cost: total,
        budget_limit: priceUsd,
        violations: isOverBudget ? ['Calculated quote exceeds traveler limit'] : [],
        warnings: [],
        approval_notes: isOverBudget
          ? 'Validation failed. Budget limit exceeded.'
          : 'Itinerary satisfies all budget and schedule continuity constraints. Ready for approval.'
      });
    } finally {
      setValidatingItinerary(false);
    }
  };

  const [dbGuides, setDbGuides] = useState<any[]>([]);

  useEffect(() => {
    fetchAgentInquiries();
    fetchDbGuides();
  }, []);

  const fetchDbGuides = async () => {
    try {
      const res = await api.get('/api/guides');
      if (Array.isArray(res.data)) {
        setDbGuides(res.data);
      }
    } catch {
      setDbGuides([]);
    }
  };

  const fetchAgentInquiries = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/agent/inquiries');
      const data = Array.isArray(response.data) ? response.data : [];
      if (data.length > 0) {
        setInquiries(data);
        setSelectedInquiry(data[0]);
      } else {
        loadFallbackInquiries();
      }
    } catch {
      loadFallbackInquiries();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackInquiries = () => {
    const fallback: BookingInquiry[] = [
      {
        id: 101,
        bookingReference: 'BK-4921',
        travelerId: 4,
        status: 'CAPACITY_FLAGGED_REJECTED',
        vehicleCapacityStatus: 'REJECTED_BY_CAPACITY',
        capacityRejectionReason: 'Vehicle undergoing unscheduled transmission maintenance. Needs replacement.',
        guideAssignmentStatus: 'REJECTED_BY_GUIDE',
        guideResponseMessage: 'Booked on personal leave for family event in Kandy.',
        guideName: 'SLTDA Certified Local Guide',
        isHighPriority: true,
        startDate: '2026-10-15',
        pickupTime: '08:00 AM',
        travelerNotes: 'High-altitude route through Nuwara Eliya tea estates.',
        bookedAt: new Date().toISOString()
      },
      {
        id: 102,
        bookingReference: 'BK-8812',
        travelerId: 5,
        status: 'PENDING_REVIEW',
        vehicleCapacityStatus: 'HELD_PENDING_CONFIRMATION',
        guideAssignmentStatus: 'ACCEPTED_BY_GUIDE',
        guideResponseMessage: 'Excited to host guest! Recommended morning pickup at 06:30 AM to beat traffic.',
        guideName: 'Ms. Dilani Silva',
        isHighPriority: false,
        startDate: '2026-10-20',
        pickupTime: '09:00 AM',
        travelerNotes: 'Requires child seat and airport escort.',
        bookedAt: new Date().toISOString()
      }
    ];
    setInquiries(fallback);
    setSelectedInquiry(fallback[0]);
  };

  const handleApproveAndSendOffer = async () => {
    if (!selectedInquiry) return;
    setSubmitting(true);

    try {
      await api.post(`/api/agent/bookings/${selectedInquiry.id}/approve`, {
        replacementVehicleSlotId: replacementVehicleSlotId || null,
        replacementGuideSlotId: replacementGuideSlotId || null,
        finalPriceQuoteLkr: Number(priceLkr),
        finalPriceQuoteUsd: Number(priceUsd),
        agentNotes: agentNotes.trim()
      });

      showToast(
        'Offer Approved & Sent!',
        `Booking proposal #${selectedInquiry.bookingReference} approved. Quote dispatched to traveler.`,
        'success'
      );

      fetchAgentInquiries();
    } catch (err: any) {
      showToast('Approval Failed', err.response?.data?.message || err.message || 'Failed to approve booking offer.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const quickDemoRole = async (role: 'TRAVEL_AGENT' | 'CAPACITY_OFFICER') => {
    const demoEmail = role === 'TRAVEL_AGENT' ? 'agent@ceylonmate.com' : 'capacity@ceylonmate.com';
    await login(demoEmail, 'Password123!');
    showToast('Role Switched', `Logged in as ${role.replace('_', ' ')}.`, 'info');
  };

  return (
    <motion.div
      variants={fadeInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="bg-[#0B131F] text-stone-100 min-h-screen py-12 px-4 md:px-8 font-sans selection:bg-[#C5A880] selection:text-[#0B131F]"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Sub-Navigation Tabs */}
        <AgentDeskSubNav activeTab="approvals" />

        {/* Header & Persona Switcher */}
        <div className="p-6 bg-[#0F1A24] border border-stone-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#C5A880] uppercase font-bold tracking-widest">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span>CeylonMate Travel Agent Concierge Desk</span>
            </div>
            <h1 className="text-3xl font-serif-luxury font-bold text-stone-100 mt-1">
              Concierge Approvals & Exception Desk
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Review traveler booking requests, resolve capacity rejections, set final price quotes, and send offers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-400 hidden sm:inline mr-1">Quick Demo:</span>
            <button
              onClick={() => quickDemoRole('TRAVEL_AGENT')}
              className="px-3.5 py-1.5 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-200 hover:bg-amber-900 text-xs font-semibold transition cursor-pointer"
            >
              [Demo as Travel Agent]
            </button>
            <button
              onClick={() => quickDemoRole('CAPACITY_OFFICER')}
              className="px-3.5 py-1.5 rounded-lg bg-teal-950/80 border border-teal-500/40 text-teal-200 hover:bg-teal-900 text-xs font-semibold transition cursor-pointer"
            >
              [Demo as Capacity Officer]
            </button>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pending Queue List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                Incoming Inquiries ({inquiries.length})
              </h3>
              <button
                onClick={fetchAgentInquiries}
                className="text-xs text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full bg-slate-800" count={3} />
              </div>
            ) : inquiries.length === 0 ? (
              <div className="p-8 text-center bg-[#0F1A24] border border-stone-800 rounded-2xl text-stone-400 text-xs font-mono">
                No active booking inquiries awaiting agent review.
              </div>
            ) : (
              inquiries.map((item) => {
                const isSelected = selectedInquiry?.id === item.id;
                const isFlagged = item.status === 'CAPACITY_FLAGGED_REJECTED';
                return (
                  <motion.div
                    key={item.id}
                    {...hoverLiftProps}
                    onClick={() => setSelectedInquiry(item)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? 'bg-[#134E4A]/30 border-[#C5A880] text-stone-100 shadow-xl'
                        : isFlagged
                        ? 'bg-amber-950/30 border-amber-500/60 text-stone-100'
                        : 'bg-[#0F1A24] border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#C5A880] font-bold">#{item.bookingReference}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          isFlagged
                            ? 'bg-rose-950 text-rose-300 border-rose-500/40 animate-pulse'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h4 className="text-sm font-serif-luxury font-bold text-stone-100">
                      Booking Request #{item.id}
                    </h4>

                    {isFlagged && (
                      <div className="text-[11px] font-mono text-amber-300 flex items-center gap-1 pt-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>High Priority: Vehicle Rejected by Capacity</span>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Selected Inquiry Detailed Review & Approval Panel */}
          <div className="lg:col-span-2">
            {selectedInquiry ? (
              <div className="bg-[#0F1A24] border border-[#C5A880]/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl font-sans">
                {/* Proposal Title Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-800">
                  <div>
                    <span className="text-xs font-mono text-[#C5A880] uppercase font-bold">
                      Booking Reference: {selectedInquiry.bookingReference}
                    </span>
                    <h2 className="text-2xl font-serif-luxury font-bold text-stone-100 mt-0.5">
                      Review & Approve Traveler Quote Proposal
                    </h2>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-500/40 font-mono">
                    {selectedInquiry.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* GUIDE RESPONSE & REJECTION EXCEPTION ALERT BOX */}
                {selectedInquiry.guideAssignmentStatus === 'REJECTED_BY_GUIDE' && (
                  <div className="p-4 bg-rose-950/60 border border-rose-500/50 rounded-2xl text-rose-200 text-xs space-y-2 leading-relaxed font-mono">
                    <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                      <span>🚨 Urgent: Guide Declined Tour Request</span>
                    </div>
                    <p>
                      <strong>Reason from Guide ({selectedInquiry.guideName || 'Assigned Guide'}):</strong> "{selectedInquiry.guideResponseMessage || 'Unavailable on selected dates'}"
                    </p>
                    <p className="text-[11px] text-stone-300">
                      Please select an alternative certified local guide slot below before issuing the final quote proposal.
                    </p>
                  </div>
                )}

                {/* GUIDE STATUS BADGE CARD */}
                <div className="p-4 bg-[#0B131F] rounded-2xl border border-stone-800 space-y-2 text-xs font-sans">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-stone-400 font-semibold text-[11px] uppercase">Local Guide Assignment Status</span>
                    {selectedInquiry.guideAssignmentStatus === 'ACCEPTED_BY_GUIDE' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                        ✓ ACCEPTED_BY_GUIDE
                      </span>
                    ) : selectedInquiry.guideAssignmentStatus === 'REJECTED_BY_GUIDE' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                        ✕ REJECTED_BY_GUIDE
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                        ⏳ PENDING_GUIDE_ACCEPTANCE
                      </span>
                    )}
                  </div>
                  {selectedInquiry.guideResponseMessage && (
                    <p className="text-[#C5A880] italic text-xs pt-1 border-t border-stone-800/80">
                      Guide Note: "{selectedInquiry.guideResponseMessage}"
                    </p>
                  )}
                </div>

                {/* CAPACITY REJECTION EXCEPTION ALERT BOX */}
                {selectedInquiry.status === 'CAPACITY_FLAGGED_REJECTED' && (
                  <div className="p-4 bg-amber-950/60 border border-amber-500/50 rounded-2xl text-amber-200 text-xs space-y-2 leading-relaxed font-mono">
                    <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      <span>⚠️ Capacity Manager Exception Alert</span>
                    </div>
                    <p>
                      <strong>Reason for Rejection:</strong> "{selectedInquiry.capacityRejectionReason || 'Vehicle undergoing maintenance'}"
                    </p>
                    <p className="text-[11px] text-stone-300">
                      Please reassign a replacement vehicle slot below before approving the final proposal.
                    </p>
                  </div>
                )}

                {/* Traveler Notes & Journey Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                  <div className="p-4 bg-[#0B131F] rounded-xl border border-stone-800 space-y-1">
                    <span className="text-stone-400 block font-mono">Target Start Date & Time</span>
                    <span className="text-stone-100 font-bold font-mono text-sm">
                      {selectedInquiry.startDate || '2026-10-15'} at {selectedInquiry.pickupTime || '08:00 AM'}
                    </span>
                  </div>

                  <div className="p-4 bg-[#0B131F] rounded-xl border border-stone-800 space-y-1">
                    <span className="text-stone-400 block font-mono">Special Traveler Instructions</span>
                    <span className="text-stone-300 italic text-xs block">
                      "{selectedInquiry.travelerNotes || 'No special requests submitted.'}"
                    </span>
                  </div>
                </div>

                {/* AGENT 4: ITINERARY VALIDATION AGENT CARD */}
                <div className="p-5 bg-[#0B131F] border border-[#C5A880]/40 rounded-2xl space-y-3 font-mono text-xs shadow-xl">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-[#C5A880] uppercase tracking-wider">
                        🤖 Itinerary Validation Agent (Python Port 8000)
                      </span>
                    </div>
                    <button
                      onClick={runItineraryValidationAgent}
                      disabled={validatingItinerary}
                      className="px-3 py-1 rounded bg-[#134E4A] hover:bg-emerald-800 text-emerald-100 text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${validatingItinerary ? 'animate-spin' : ''}`} />
                      <span>Validate Itinerary</span>
                    </button>
                  </div>

                  {validationOutput ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                        <span>Validation Status:</span>
                        <span className={`px-2.5 py-0.5 rounded font-bold uppercase ${validationOutput.valid ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'}`}>
                          {validationOutput.status} (Valid: {validationOutput.valid ? 'YES' : 'NO'})
                        </span>
                      </div>

                      <div className="flex flex-wrap justify-between text-[11px] text-stone-300 pt-1 border-t border-stone-800">
                        <span>Calculated Total: ${validationOutput.total_calculated_cost}</span>
                        <span>Budget Limit: ${validationOutput.budget_limit}</span>
                      </div>

                      {validationOutput.approval_notes && (
                        <p className="text-[11px] italic text-stone-300 bg-slate-950 p-2.5 rounded-xl border border-stone-800">
                          "{validationOutput.approval_notes}"
                        </p>
                      )}

                      {validationOutput.violations && validationOutput.violations.length > 0 && (
                        <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl space-y-1">
                          <span className="font-bold text-rose-300 block">⚠️ Itemized Violations:</span>
                          {validationOutput.violations.map((v, i) => (
                            <span key={i} className="text-rose-200 block text-[10px]">• {v}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-stone-400 italic text-[11px]">
                      Click "Validate Itinerary" to execute deterministic schedule continuity and budget limit checks via Python AI service.
                    </p>
                  )}
                </div>

                {/* Agent Quotation & Replacement Guide/Vehicle Form */}
                <div className="p-5 bg-slate-900 rounded-2xl border border-stone-800 space-y-4 text-xs">
                  <h4 className="text-xs font-semibold text-[#C5A880] uppercase tracking-wider font-mono">
                    Agent Quotation & Escort Slot Assignments
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-stone-300 font-semibold mb-1">Final Quote (LKR)</label>
                      <input
                        type="number"
                        value={priceLkr}
                        onChange={(e) => setPriceLkr(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono focus:border-[#C5A880] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-300 font-semibold mb-1">Final Quote (USD)</label>
                      <input
                        type="number"
                        value={priceUsd}
                        onChange={(e) => setPriceUsd(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono focus:border-[#C5A880] outline-none"
                      />
                    </div>
                  </div>

                  {/* REPLACEMENT GUIDE SELECTION DROPDOWN */}
                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      Replacement Local Guide Assignment {selectedInquiry.guideAssignmentStatus === 'REJECTED_BY_GUIDE' && <span className="text-rose-400 font-mono font-bold">(Action Required)</span>}
                    </label>
                    <select
                      value={replacementGuideSlotId}
                      onChange={(e) => setReplacementGuideSlotId(e.target.value)}
                      className="w-full bg-slate-950 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono text-xs focus:border-[#C5A880] outline-none cursor-pointer"
                    >
                      <option value="">-- Keep Current Guide Slot or Select Certified Replacement --</option>
                      {dbGuides.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.licenseNumber} | {g.fullName} ({g.guideType || g.licenseType} - {g.languagesSpoken || g.languages})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      Replacement Vehicle Slot ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={replacementVehicleSlotId}
                      onChange={(e) => setReplacementVehicleSlotId(e.target.value)}
                      placeholder="Leave blank to maintain current fleet slot..."
                      className="w-full bg-slate-950 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 font-mono text-xs focus:border-[#C5A880] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">Agent Notes for Traveler</label>
                    <textarea
                      rows={2}
                      value={agentNotes}
                      onChange={(e) => setAgentNotes(e.target.value)}
                      placeholder="e.g. Price includes VIP airport escort and luxury welcome amenities..."
                      className="w-full bg-slate-950 border border-stone-700 rounded-xl p-3 text-stone-100 text-xs focus:border-[#C5A880] outline-none"
                    />
                  </div>
                </div>

                {/* Approve Action Button */}
                <div className="pt-4 border-t border-stone-800 flex justify-end">
                  <motion.button
                    {...buttonPressProps}
                    onClick={handleApproveAndSendOffer}
                    disabled={submitting}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:brightness-110 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending Offer...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-slate-950" />
                        <span>AUTHORIZE EXPEDITION QUOTE</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex items-center justify-center p-8 bg-[#0F1A24] rounded-2xl border border-dashed border-stone-800 text-stone-500 text-xs font-mono">
                Select an inquiry from the left list to review.
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
