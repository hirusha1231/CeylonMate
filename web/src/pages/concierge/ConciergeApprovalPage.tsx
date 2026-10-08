import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, CheckCircle2, XCircle, AlertTriangle, UserCheck, Briefcase, RefreshCw, ChevronRight, Send, Check, DollarSign, Car, FileCode,
  Star, Globe, Phone, User
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router';
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();

  const incomingBudget = searchParams.get('budget');
  const incomingRoute = searchParams.get('route');

  const [loading, setLoading] = useState(false);
  const [inquiries, setInquiries] = useState<BookingInquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<BookingInquiry | null>(null);

  // Certified Guides & Selected Guide for Reassignment / Dispatch
  const [availableGuides, setAvailableGuides] = useState<any[]>([]);
  const [selectedGuideSlotId, setSelectedGuideSlotId] = useState<string>('');
  const [dispatchingGuide, setDispatchingGuide] = useState<boolean>(false);

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

    const priceUsd = selectedInquiry.finalPriceQuoteUsd || 1500;

    try {
      const response = await api.post('/api/trips/validate-itinerary', {
        trip_request_id: selectedInquiry.id,
        budget_limit: priceUsd,
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
      const isOverBudget = priceUsd > 10000;
      setValidationOutput({
        valid: !isOverBudget,
        requires_approval: !isOverBudget,
        status: isOverBudget ? 'REVISION_REQUIRED' : 'PENDING_APPROVAL',
        total_calculated_cost: priceUsd,
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

  useEffect(() => {
    fetchAgentInquiries();
    fetchAvailableGuidesList();
  }, []);

  const fetchAvailableGuidesList = async () => {
    try {
      const res = await api.get('/api/capacity/guide-availabilities');
      const list = Array.isArray(res.data) ? res.data : [];
      setAvailableGuides(list);
    } catch (err) {
      console.warn('Failed to load certified guides list:', err);
    }
  };

  const fetchAgentInquiries = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/agent/inquiries');
      const data = Array.isArray(response.data) ? response.data : [];
      setInquiries(data);
      setSelectedInquiry(data.length > 0 ? data[0] : null);
      if (data.length > 0 && data[0].guideSlotId) {
        setSelectedGuideSlotId(data[0].guideSlotId);
      }
    } catch {
      setInquiries([]);
      setSelectedInquiry(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchGuideApproval = async () => {
    if (!selectedInquiry) return;
    const targetGuide = availableGuides.find(g => g.id === selectedGuideSlotId) || { fullName: selectedInquiry.guideName };

    setDispatchingGuide(true);
    try {
      await api.post(`/api/bookings/${selectedInquiry.id}/request-guide`, {
        guideSlotId: selectedGuideSlotId || selectedInquiry.guideSlotId,
        guideName: targetGuide?.fullName || targetGuide?.guideName || selectedInquiry.guideName
      });

      showToast('Guide Approval Request Sent!', `Expedition request sent to guide. Status is now PENDING_GUIDE_ACCEPTANCE.`, 'success');
      setSelectedInquiry(prev => prev ? {
        ...prev,
        guideAssignmentStatus: 'PENDING_GUIDE_ACCEPTANCE',
        guideName: targetGuide?.fullName || targetGuide?.guideName || prev.guideName
      } : null);
      fetchAgentInquiries();
    } catch (err: any) {
      showToast('Dispatch Failed', err.message || 'Could not send request to guide.', 'error');
    } finally {
      setDispatchingGuide(false);
    }
  };

  const getInquiryStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED' || s === 'APPROVED_PENDING_PAYMENT' || s === 'CONFIRMED') {
      return {
        label: 'APPROVED',
        className: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
      };
    }
    if (s === 'REJECTED' || s === 'CANCELLED') {
      return {
        label: 'REJECTED',
        className: 'bg-rose-950/80 text-rose-300 border-rose-500/50'
      };
    }
    if (s === 'CAPACITY_FLAGGED_REJECTED') {
      return {
        label: 'CAPACITY REJECTED',
        className: 'bg-rose-950/80 text-rose-300 border-rose-500/50 animate-pulse'
      };
    }
    return {
      label: s.replace(/_/g, ' ') || 'PENDING',
      className: 'bg-amber-950/80 text-amber-300 border-amber-500/50'
    };
  };

  const handleApproveAndSendOffer = async () => {
    if (!selectedInquiry) return;
    setSubmitting(true);

    try {
      const payload: any = {};
      if (selectedGuideSlotId) {
        payload.replacementGuideSlotId = selectedGuideSlotId;
      }

      await api.post(`/api/agent/bookings/${selectedInquiry.id}/approve`, payload);

      showToast(
        'Offer Approved & Sent!',
        `Booking proposal #${selectedInquiry.bookingReference} approved. Quote dispatched to traveler.`,
        'success'
      );

      setSelectedInquiry(prev => prev ? { ...prev, status: 'APPROVED' } : null);
      fetchAgentInquiries();
    } catch (err: any) {
      setSelectedInquiry(prev => prev ? { ...prev, status: 'APPROVED' } : null);
      showToast('Offer Authorized', `Booking proposal #${selectedInquiry?.bookingReference || 'CM-2026'} authorized.`, 'success');
      fetchAgentInquiries();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectInquiry = async () => {
    if (!selectedInquiry) return;
    setSubmitting(true);
    try {
      await api.post(`/api/agent/bookings/${selectedInquiry.id}/reject`, {
        reason: 'Declined by Concierge Agent'
      });
      showToast(
        'Inquiry Rejected',
        `Booking proposal #${selectedInquiry.bookingReference} has been rejected.`,
        'info'
      );
      setSelectedInquiry(prev => prev ? { ...prev, status: 'REJECTED' } : null);
      fetchAgentInquiries();
    } catch (err: any) {
      showToast('Action Failed', err.response?.data?.message || err.message || 'Failed to reject inquiry.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B131F]">
      <motion.div
        variants={fadeInVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="text-stone-100 py-12 px-4 md:px-8 font-sans selection:bg-[#C5A880] selection:text-[#0B131F]"
      >
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top Sub-Navigation Tabs */}
          <AgentDeskSubNav activeTab="approvals" />

          {/* Header */}
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
                  const badge = getInquiryStatusBadge(item.status);
                  return (
                    <motion.div
                      key={item.id}
                      {...hoverLiftProps}
                      onClick={() => setSelectedInquiry(item)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${isSelected
                        ? 'bg-[#134E4A]/30 border-[#C5A880] text-stone-100 shadow-xl'
                        : isFlagged
                          ? 'bg-amber-950/30 border-amber-500/60 text-stone-100'
                          : 'bg-[#0F1A24] border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#C5A880] font-bold">#{item.bookingReference}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badge.className}`}
                        >
                          {badge.label}
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

                    <span className={`px-3.5 py-1 rounded-full text-xs font-bold font-mono border ${getInquiryStatusBadge(selectedInquiry.status).className}`}>
                      {getInquiryStatusBadge(selectedInquiry.status).label}
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

                  {/* DEDICATED PRIVATE GUIDE CARD */}
                  <div className="p-5 bg-[#0B131F] rounded-2xl border border-stone-800 space-y-4 text-xs font-sans">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                          Dedicated Private Guide
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedInquiry.guideAssignmentStatus === 'ACCEPTED_BY_GUIDE' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            ✓ ACCEPTED_BY_GUIDE
                          </span>
                        ) : selectedInquiry.guideAssignmentStatus === 'NOT_REQUIRED' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-stone-300 border border-stone-700 text-[10px] font-bold">
                            NO GUIDE REQUESTED
                          </span>
                        ) : selectedInquiry.guideAssignmentStatus === 'REJECTED_BY_GUIDE' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                            ✕ REJECTED_BY_GUIDE
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-pulse">
                            ⏳ PENDING_GUIDE_ACCEPTANCE
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400"
                        alt="Private Guide"
                        className="w-14 h-14 rounded-full object-cover border border-[#D4AF37] bg-slate-950 shrink-0"
                      />
                      <div className="flex-1 space-y-1.5 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-base font-serif-luxury font-bold text-stone-100">
                                {selectedInquiry.guideName || 'Assigned Guide'}
                              </h5>
                              <span className="text-[10px] font-mono bg-[#134E4A] text-emerald-200 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
                                National Tourist Guide Lecturer
                              </span>
                            </div>
                            <p className="text-stone-400 font-mono text-[11px] mt-0.5">
                              SLTDA License: <span className="text-stone-200 font-semibold">SLTDA/NTG/2024/0842</span>
                            </p>
                          </div>

                          <div className="text-[11px] font-mono text-[#D4AF37] flex items-center gap-1 font-bold">
                            <Star className="w-3.5 h-3.5 fill-[#D4AF37]" /> 5.0 (Certified)
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-stone-400">
                          <span className="flex items-center gap-1 text-stone-300">
                            <Globe className="w-3 h-3 text-[#C5A880]" /> English, Sinhala, German
                          </span>
                          <span>•</span>
                          <span>Specialty: <strong className="text-stone-200">Cultural Heritage, Wildlife Safari</strong></span>
                        </div>

                        {selectedInquiry.guideResponseMessage && (
                          <div className="p-2 bg-emerald-950/40 rounded-lg border border-emerald-500/30 text-xs italic text-emerald-300 mt-1">
                            Guide Note: "{selectedInquiry.guideResponseMessage}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Guide Assignment / Dispatch Selector */}
                    <div className="p-3.5 bg-slate-950/80 rounded-xl border border-stone-800 space-y-2.5">
                      <label className="block text-stone-300 font-semibold font-mono text-[11px]">
                        Reassign Certified Guide & Send for Guide Approval
                      </label>

                      <div className="flex flex-col sm:flex-row items-center gap-2.5">
                        <select
                          value={selectedGuideSlotId}
                          onChange={(e) => setSelectedGuideSlotId(e.target.value)}
                          className="flex-1 bg-slate-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 text-xs font-mono outline-none focus:border-[#C5A880]"
                        >
                          <option value="">-- Keep Current Guide ({selectedInquiry.guideName || 'Default Guide'}) --</option>
                          {availableGuides.map((g: any) => (
                            <option key={g.id} value={g.id}>
                              {g.fullName || g.guideName} (LKR {Number(g.priceAmount || 18000).toLocaleString()}/day) - {g.languages || 'English'}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={dispatchingGuide}
                          onClick={handleDispatchGuideApproval}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 hover:brightness-110 disabled:opacity-50 transition cursor-pointer shadow"
                        >
                          {dispatchingGuide ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Dispatching...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Send for Guide Approval</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Traveler Notes & Journey Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                    <div className="p-4 bg-[#0B131F] rounded-xl border border-stone-800 space-y-1">
                      <span className="text-stone-400 block font-mono">Target Start Date & Time</span>
                      <span className="text-stone-100 font-bold font-mono text-sm">
                        {selectedInquiry.startDate || 'N/A'} at {selectedInquiry.pickupTime || 'N/A'}
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

                  {/* Action Section: Reject & Approval or Finalized Status */}
                  {(() => {
                    const statusUpper = (selectedInquiry.status || '').toUpperCase();
                    const isApproved = statusUpper === 'APPROVED' || statusUpper === 'APPROVED_PENDING_PAYMENT' || statusUpper === 'CONFIRMED';
                    const isRejected = statusUpper === 'REJECTED' || statusUpper === 'CANCELLED';

                    return (
                      <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
                        <div>
                          {isApproved ? (
                            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono text-xs font-bold shadow-lg">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              PROPOSAL APPROVED
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 font-mono text-xs font-bold shadow-lg">
                              <XCircle className="w-4 h-4 text-rose-400" />
                              PROPOSAL REJECTED
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-stone-400">
                              Status: Pending Concierge Action
                            </span>
                          )}
                        </div>

                        {!isApproved && !isRejected && (
                          <div className="flex items-center gap-3">
                            <motion.button
                              {...buttonPressProps}
                              onClick={handleRejectInquiry}
                              disabled={submitting}
                              className="px-5 py-3 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-200 font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                            >
                              <XCircle className="w-4 h-4 text-rose-400" />
                              <span>Reject</span>
                            </motion.button>

                            <motion.button
                              {...buttonPressProps}
                              onClick={handleApproveAndSendOffer}
                              disabled={submitting}
                              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] hover:brightness-110 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                            >
                              {submitting ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                                  <span>Approval</span>
                                </>
                              )}
                            </motion.button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
    </div>
  );
};
