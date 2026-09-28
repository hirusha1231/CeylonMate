import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, User, ShieldCheck, Star, Calendar, Clock, MapPin,
  Send, RefreshCw, CheckCircle2, CloudRain, Sun, AlertTriangle,
  Globe, Phone, Mail, Award, Edit3, Sparkles, Check, Users, FileText, Upload, Image as ImageIcon
} from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useCurrency } from '../../context/CurrencyContext';
import { buttonPressProps } from '../../utils/animations';

const WEBSITE_LANGUAGES = ['English', 'German', 'French', 'Japanese', 'Sinhala'];

const WEBSITE_SPECIALTIES = [
  'Cultural Heritage & Ancient Kingdoms',
  'Wildlife Tracking & Big Game Safaris',
  'Highland Tea Heritage & Colonial Trails',
  'Rainforest Eco-Trekking & Bio-Diversity',
  'Marine Expeditions & Whale Watching',
  'Ayurveda, Yoga & Holistic Wellness',
  'Ceylon Culinary Trails & Masterclasses',
  'Gemology & Ceylon Artisan Crafts',
  'Wilderness & Landscape Photography',
  'Surfing, Water Sports & Coastal Riviera'
];

interface GuideProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  photoUrl: string;
  bio: string;
  licenseNumber: string;
  languagesSpoken: string;
  specialties: string;
  rating: number;
  reviewCount: number;
  defaultDailyRateLkr: number;
  currency?: string;
  isActive: boolean;
  completedToursCount: number;
}

interface AssignedTour {
  id: number;
  bookingReference: string;
  guideAssignmentStatus?: string; // "PENDING_GUIDE_ACCEPTANCE", "ACCEPTED_BY_GUIDE", "REJECTED_BY_GUIDE"
  guideResponseMessage?: string;
  guideRespondedAtUtc?: string;
  startDate: string;
  pickupTime: string;
  passengerCount: number;
  status: string;
  travelerName: string;
  travelerEmail: string;
  travelerPhone: string;
  travelerNotes?: string;
  packageTitle: string;
  routeHighlights: string;
  assignedVehicle: string;
}

interface FieldReport {
  id: string;
  location: string;
  weatherStatus: string;
  crowdLevel: string;
  conditionNote: string;
  createdAt: string;
}

export const GuidePortalPage: React.FC = () => {
  const { showToast } = useToast();
  const { formatPrice } = useCurrency();

  const [activeTab, setActiveTab] = useState<'schedule' | 'reports'>('schedule');

  const [profile, setProfile] = useState<GuideProfile | null>(null);
  const [tours, setTours] = useState<AssignedTour[]>([]);
  const [reports, setReports] = useState<FieldReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Response Modal State
  const [selectedTourForResponse, setSelectedTourForResponse] = useState<AssignedTour | null>(null);
  const [responseDecision, setResponseDecision] = useState<'ACCEPT' | 'REJECT'>('ACCEPT');
  const [responseMessage, setResponseMessage] = useState<string>('');
  const [sendingResponse, setSendingResponse] = useState<boolean>(false);

  // Field Report Form State
  const [reportLocation, setReportLocation] = useState<string>('Sigiriya Rock Fortress');
  const [reportWeather, setReportWeather] = useState<string>('CLEAR');
  const [reportCrowd, setReportCrowd] = useState<string>('MODERATE');
  const [reportNotes, setReportNotes] = useState<string>('');
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);

  // Profile Edit Modal State
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English', 'German', 'Sinhala']);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([
    'Cultural Heritage & Ancient Ruins',
    'Wildlife Tracking & Yala Safaris'
  ]);
  const [editPhoto, setEditPhoto] = useState<string>('');
  const [editRate, setEditRate] = useState<number>(18000);
  const [editCurrency, setEditCurrency] = useState<string>('LKR');
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  useEffect(() => {
    fetchGuideData();
  }, []);

  const fetchGuideData = async () => {
    setLoading(true);
    try {
      let myTours: AssignedTour[] = [];
      try {
        const reqRes = await api.get('/api/guide/assigned-tours');
        myTours = Array.isArray(reqRes.data) ? reqRes.data : [];
      } catch {
        const toursRes = await api.get('/api/guide/my-requests');
        myTours = Array.isArray(toursRes.data) ? toursRes.data : [];
      }

      const [profRes, reportsRes] = await Promise.all([
        api.get('/api/guide/me/profile'),
        api.get('/api/guide/field-reports')
      ]);

      const profData = profRes.data;
      setProfile(profData);
      setEditName(profData?.fullName || '');
      setEditBio(profData?.bio || '');
      
      const langs = profData?.languagesSpoken
        ? profData.languagesSpoken.split(',').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
        : ['English', 'German', 'Sinhala'];
      setSelectedLanguages(langs);

      const specs = profData?.specialties
        ? profData.specialties.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
        : ['Cultural Heritage & Ancient Ruins', 'Wildlife Tracking & Yala Safaris'];
      setSelectedSpecialties(specs);

      setEditPhoto(profData?.photoUrl || '');
      setEditRate(profData?.defaultDailyRateLkr || 18000);
      setEditCurrency(profData?.currency || 'LKR');

      setTours(myTours);
      setReports(Array.isArray(reportsRes.data) ? reportsRes.data : []);
    } catch (err) {
      console.error('Failed to load guide portal data from EF Core database:', err);
      setTours([]);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenResponseModal = (tour: AssignedTour, decision: 'ACCEPT' | 'REJECT') => {
    setSelectedTourForResponse(tour);
    setResponseDecision(decision);
    setResponseMessage('');
  };

  const handleSendGuideResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTourForResponse) return;

    if (!responseMessage.trim()) {
      showToast('Validation Error', 'Please enter a message note to the traveler & travel agent.', 'error');
      return;
    }

    setSendingResponse(true);
    try {
      let res;
      try {
        res = await api.post(`/api/guide/bookings/${selectedTourForResponse.id}/respond`, {
          decision: responseDecision,
          message: responseMessage.trim()
        });
      } catch (primaryErr: any) {
        if (primaryErr.response?.status === 404) {
          res = await api.post(`/api/bookings/${selectedTourForResponse.id}/respond`, {
            decision: responseDecision,
            message: responseMessage.trim()
          });
        } else {
          throw primaryErr;
        }
      }

      showToast(
        responseDecision === 'ACCEPT' ? 'Expedition Accepted' : 'Expedition Declined',
        responseDecision === 'ACCEPT'
          ? `You accepted booking #${selectedTourForResponse.bookingReference}. Traveler & travel agent notified.`
          : `Booking #${selectedTourForResponse.bookingReference} declined. Travel agent notified to assign replacement.`,
        responseDecision === 'ACCEPT' ? 'success' : 'info'
      );

      setSelectedTourForResponse(null);
      setResponseMessage('');
      await fetchGuideData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Could not send response to request.';
      showToast('Response Error', errorMsg, 'error');
    } finally {
      setSendingResponse(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditName(e.target.value);
  };

  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      if (selectedLanguages.length === 1) {
        showToast('Validation Error', 'Please select at least one language.', 'error');
        return;
      }
      setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const toggleSpecialty = (spec: string) => {
    if (selectedSpecialties.includes(spec)) {
      if (selectedSpecialties.length === 1) {
        showToast('Validation Error', 'Please select at least one specialty focus.', 'error');
        return;
      }
      setSelectedSpecialties(selectedSpecialties.filter(s => s !== spec));
    } else {
      setSelectedSpecialties([...selectedSpecialties, spec]);
    }
  };

  const handleLocalPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('File Too Large', 'Please select an image smaller than 5MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setEditPhoto(reader.result);
          showToast('Photo Loaded', 'Local image loaded successfully. Preview updated.', 'info');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedLanguages.length === 0) {
      showToast('Validation Error', 'Please select at least one language.', 'error');
      return;
    }

    if (selectedSpecialties.length === 0) {
      showToast('Validation Error', 'Please select at least one specialty.', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const payload = {
        fullName: editName.trim(),
        bio: editBio.trim(),
        languagesSpoken: selectedLanguages.join(', '),
        specialties: selectedSpecialties.join(', '),
        photoUrl: editPhoto.trim(),
        defaultDailyRateLkr: editRate,
        currency: editCurrency
      };

      const res = await api.put('/api/guide/me/profile', payload);
      if (res.data) {
        setProfile(res.data);
      }
      setIsEditingProfile(false);
      showToast('Profile Updated', 'Your certified guide profile has been saved successfully.', 'success');
      fetchGuideData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Could not update profile details.';
      showToast('Update Failed', errorMsg, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmitFieldReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportLocation.trim()) {
      showToast('Validation Error', 'Please enter a location for the report.', 'error');
      return;
    }

    setSubmittingReport(true);
    try {
      const payload = {
        location: reportLocation.trim(),
        weatherStatus: reportWeather,
        crowdLevel: reportCrowd,
        conditionNote: reportNotes.trim()
      };

      await api.post('/api/guide/field-reports', payload);
      showToast('Report Dispatched', 'Field condition report broadcasted to Travel Agent Intelligence Desk.', 'success');
      setReportNotes('');
      fetchGuideData();
    } catch {
      showToast('Report Failed', 'Failed to dispatch field report.', 'error');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleDeleteFieldReport = async (reportId: string) => {
    try {
      await api.delete(`/api/guide/field-reports/${reportId}`);
      showToast('Report Deleted', 'Field condition report removed successfully.', 'info');
      fetchGuideData();
    } catch {
      showToast('Delete Failed', 'Could not delete field condition report.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B131F] text-stone-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-3 font-mono">
          <RefreshCw className="w-8 h-8 text-[#C5A880] animate-spin mx-auto" />
          <p className="text-sm text-stone-400">Loading Local Guide Portal Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B131F] text-stone-100 font-sans pb-24">
      {/* Top Header Section */}
      <section className="bg-gradient-to-b from-[#0F1A24] to-[#0B131F] border-b border-stone-800 py-10 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border-2 border-[#C5A880] overflow-hidden shrink-0 shadow-2xl">
                <img
                  src={profile?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'}
                  alt={profile?.fullName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 right-0 p-1 bg-emerald-500 rounded-tl-lg text-slate-950" title="Active Certified Chauffeur">
                  <Check className="w-3 h-3 font-bold" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-mono bg-[#134E4A] text-emerald-200 border border-emerald-500/30 font-bold uppercase tracking-wider">
                    SLTDA Certified Local Guide
                  </span>
                  <span className="text-xs font-mono text-[#D4AF37] flex items-center gap-1 font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{profile?.rating} Rating ({profile?.reviewCount} Reviews)</span>
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-serif-luxury font-bold text-stone-100">
                  {profile?.fullName || 'Certified Local Guide'}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-stone-400">
                  <span>License: <strong className="text-stone-200">{profile?.licenseNumber}</strong></span>
                  <span>•</span>
                  <span>Languages: <strong className="text-stone-200">{profile?.languagesSpoken}</strong></span>
                  <span>•</span>
                  <span>Specialties: <strong className="text-stone-200">{profile?.specialties || 'Cultural Heritage & Ancient Kingdoms'}</strong></span>
                  <span>•</span>
                  <span>Daily Rate: <strong className="text-[#C5A880]">{formatPrice(profile?.defaultDailyRateLkr || 18000, (profile?.currency as any) || 'LKR')}/day</strong></span>
                </div>

                {profile?.specialties && (
                  <div className="flex flex-wrap items-center gap-2 pt-1.5">
                    <span className="text-[11px] font-mono text-stone-400 font-semibold">Guiding Focus:</span>
                    {profile.specialties.split(',').map((spec, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-900/90 text-[#C5A880] border border-[#C5A880]/30 font-semibold flex items-center gap-1 shadow-sm"
                      >
                        <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                        <span>{spec.trim()}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <motion.button
              {...buttonPressProps}
              onClick={() => setIsEditingProfile(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0 transition"
            >
              <Edit3 className="w-4 h-4 text-[#C5A880]" />
              <span>Edit Guide Profile & Settings</span>
            </motion.button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-3 pt-4 border-t border-stone-800/80">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-[#C5A880] text-slate-950 shadow-lg'
                  : 'bg-slate-900/80 text-stone-400 hover:text-stone-200 border border-stone-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Assigned Tours & Schedule ({tours.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-[#C5A880] text-slate-950 shadow-lg'
                  : 'bg-slate-900/80 text-stone-400 hover:text-stone-200 border border-stone-800'
              }`}
            >
              <CloudRain className="w-4 h-4" />
              <span>Live Field Reporting</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* TAB 1: ASSIGNED TOURS & SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="space-y-8">
            {/* PENDING REQUESTS SECTION */}
            {tours.some(t => t.guideAssignmentStatus === 'PENDING_GUIDE_ACCEPTANCE') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold font-mono">
                      ⏳
                    </div>
                    <div>
                      <h3 className="text-base font-serif-luxury font-bold text-amber-200">
                        Pending Expedition Requests ({tours.filter(t => t.guideAssignmentStatus === 'PENDING_GUIDE_ACCEPTANCE').length})
                      </h3>
                      <p className="text-xs text-stone-300">
                        Travelers requested your escort. Please accept or decline with a personal note.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {tours
                    .filter(t => t.guideAssignmentStatus === 'PENDING_GUIDE_ACCEPTANCE')
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-6 bg-[#0F1A24] border-2 border-amber-500/50 hover:border-amber-400 rounded-2xl shadow-2xl space-y-6 transition-all"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 font-bold uppercase border border-amber-500/40 animate-pulse">
                                Pending Guide Acceptance
                              </span>
                              <span className="text-xs font-mono text-stone-400">
                                Booking #{t.bookingReference}
                              </span>
                            </div>

                            <h4 className="text-2xl font-serif-luxury font-bold text-stone-100">
                              {t.packageTitle}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-mono bg-slate-900 p-3 rounded-xl border border-stone-800 shrink-0">
                            <div>
                              <span className="text-stone-400 block text-[10px] uppercase">Expedition Date</span>
                              <span className="text-stone-100 font-bold">{t.startDate}</span>
                            </div>
                            <div className="w-px h-8 bg-stone-800" />
                            <div>
                              <span className="text-stone-400 block text-[10px] uppercase">Pickup Time</span>
                              <span className="text-[#C5A880] font-bold">{t.pickupTime}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-sans">
                          {/* Traveler Name & Pax count */}
                          <div className="p-4 bg-slate-900/80 rounded-xl border border-stone-800 space-y-2">
                            <span className="text-stone-400 font-mono text-[10px] uppercase block font-semibold text-[#C5A880]">
                              Traveler & Guest Details
                            </span>
                            <p className="font-bold text-stone-100 text-sm">{t.travelerName}</p>
                            <div className="space-y-1 text-stone-300 font-mono text-[11px]">
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                                <span>{t.passengerCount} Guest(s) / Passengers</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span>{t.travelerEmail}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span>{t.travelerPhone}</span>
                              </div>
                            </div>
                          </div>

                          {/* Package Name & Route summary */}
                          <div className="p-4 bg-slate-900/80 rounded-xl border border-stone-800 space-y-2">
                            <span className="text-stone-400 font-mono text-[10px] uppercase block font-semibold text-[#C5A880]">
                              Route Summary & Vehicle
                            </span>
                            <p className="font-bold text-stone-100 text-xs font-mono">{t.routeHighlights}</p>
                            <p className="text-stone-400 text-[11px] pt-1 border-t border-stone-800">
                              Escort Vehicle: <strong className="text-stone-200">{t.assignedVehicle}</strong>
                            </p>
                          </div>

                          {/* Traveler instructions / luggage notes */}
                          <div className="p-4 bg-slate-900/80 rounded-xl border border-stone-800 space-y-2">
                            <span className="text-stone-400 font-mono text-[10px] uppercase block font-semibold text-[#C5A880]">
                              Special Instructions & Notes
                            </span>
                            <p className="text-stone-300 italic text-xs leading-relaxed">
                              "{t.travelerNotes || 'No special requirements specified by traveler.'}"
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons: [✓ Accept Expedition] & [✕ Decline Request] */}
                        <div className="flex items-center justify-end gap-4 pt-4 border-t border-stone-800">
                          <button
                            type="button"
                            onClick={() => handleOpenResponseModal(t, 'REJECT')}
                            className="px-5 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-bold font-mono transition flex items-center gap-2 cursor-pointer shadow-md"
                          >
                            <span>✕ Decline Request</span>
                          </button>

                          <motion.button
                            {...buttonPressProps}
                            type="button"
                            onClick={() => handleOpenResponseModal(t, 'ACCEPT')}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white text-xs font-bold font-mono transition flex items-center gap-2 cursor-pointer shadow-lg"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>✓ Accept Expedition</span>
                          </motion.button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* CONFIRMED EXPEDITIONS SECTION */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-serif-luxury font-bold text-stone-100">
                    Confirmed Tour Expeditions & Travelers
                  </h3>
                  <p className="text-xs text-stone-400">
                    Your active chauffeured tour assignments with complete itinerary & passenger contacts.
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-mono bg-slate-900 border border-stone-800 text-[#C5A880]">
                  Total Completed Tours: <strong>{profile?.completedToursCount || 142}</strong>
                </span>
              </div>

              {tours.filter(t => t.guideAssignmentStatus !== 'PENDING_GUIDE_ACCEPTANCE').length === 0 ? (
                <div className="p-12 text-center bg-[#0F1A24] border border-stone-800 rounded-2xl space-y-3">
                  <Compass className="w-12 h-12 text-[#C5A880] mx-auto opacity-70" />
                  <h4 className="text-lg font-serif-luxury text-stone-200">No Confirmed Expeditions Yet</h4>
                  <p className="text-xs text-stone-400">Accepted tour bookings will appear in your active dispatch schedule here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {tours
                    .filter(t => t.guideAssignmentStatus !== 'PENDING_GUIDE_ACCEPTANCE')
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-6 bg-[#0F1A24] border border-stone-800 hover:border-[#C5A880]/50 rounded-2xl shadow-xl space-y-6 transition-all"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-[#134E4A] text-emerald-200 font-bold uppercase">
                                Booking #{t.bookingReference}
                              </span>
                              <span className="text-xs font-mono text-[#D4AF37] font-semibold">
                                Status: {t.status}
                              </span>
                              {t.guideAssignmentStatus === 'ACCEPTED_BY_GUIDE' && (
                                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/30">
                                  ✓ Accepted by You
                                </span>
                              )}
                            </div>

                            <h4 className="text-2xl font-serif-luxury font-bold text-stone-100">
                              {t.packageTitle}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-mono bg-slate-900 p-3 rounded-xl border border-stone-800 shrink-0">
                            <div>
                              <span className="text-stone-400 block text-[10px] uppercase">Start Date</span>
                              <span className="text-stone-100 font-bold">{t.startDate}</span>
                            </div>
                            <div className="w-px h-8 bg-stone-800" />
                            <div>
                              <span className="text-stone-400 block text-[10px] uppercase">Pickup Time</span>
                              <span className="text-[#C5A880] font-bold">{t.pickupTime}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-sans">
                          {/* Traveler Contact */}
                          <div className="p-4 bg-slate-900/80 rounded-xl border border-stone-800 space-y-2">
                            <span className="text-stone-400 font-mono text-[10px] uppercase block font-semibold text-[#C5A880]">
                              Traveler Contact Info
                            </span>
                            <p className="font-bold text-stone-100 text-sm">{t.travelerName}</p>
                            <div className="space-y-1 text-stone-300 font-mono text-[11px]">
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span>{t.travelerEmail}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                                <span>{t.travelerPhone}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                                <span>{t.passengerCount} Guest(s) / Passengers</span>
                              </div>
                            </div>
                          </div>

                          {/* Fleet Escort */}
                          <div className="p-4 bg-slate-900/80 rounded-xl border border-stone-800 space-y-2">
                            <span className="text-stone-400 font-mono text-[10px] uppercase block font-semibold text-[#C5A880]">
                              Assigned Fleet Vehicle
                            </span>
                            <p className="font-bold text-stone-100 text-sm">{t.assignedVehicle}</p>
                            <p className="text-stone-400 text-[11px] leading-relaxed">
                              Equipped with dual AC, reclining captain seats, and emergency medical kit.
                            </p>
                          </div>

                          {/* Route Highlights & Response Message */}
                          <div className="p-4 bg-slate-900/80 rounded-xl border border-stone-800 space-y-2">
                            <span className="text-stone-400 font-mono text-[10px] uppercase block font-semibold text-[#C5A880]">
                              Route & Your Note
                            </span>
                            <p className="text-stone-200 text-xs font-mono">{t.routeHighlights}</p>
                            {t.guideResponseMessage && (
                              <p className="text-[11px] text-emerald-300 italic pt-1 border-t border-stone-800">
                                Your Note: "{t.guideResponseMessage}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[11px] text-stone-400 font-mono flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>SLTDA Certified Chauffeur Escort Active</span>
                          </span>

                          <button
                            onClick={() => {
                              setReportLocation(t.routeHighlights.split('->')[1]?.trim() || 'Sigiriya Fortress');
                              setActiveTab('reports');
                            }}
                            className="px-4 py-2 rounded-xl bg-[#134E4A] hover:bg-[#0B131F] text-emerald-200 hover:text-stone-100 text-xs font-semibold font-mono border border-emerald-500/30 transition flex items-center gap-2 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 text-[#C5A880]" />
                            <span>Post Live Field Update for this Tour</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LIVE FIELD REPORTING */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Report Form */}
            <div className="lg:col-span-1 bg-[#0F1A24] border border-stone-800 p-6 rounded-2xl space-y-5 h-fit shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <h3 className="text-lg font-serif-luxury font-bold text-stone-100">
                    Submit Field Report
                  </h3>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Broadcast live ground conditions, weather advisories, or crowd statuses directly to the Concierge Intelligence Desk.
                </p>
              </div>

              <form onSubmit={handleSubmitFieldReport} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Current Location / Site</label>
                  <input
                    type="text"
                    value={reportLocation}
                    onChange={(e) => setReportLocation(e.target.value)}
                    placeholder="e.g. Sigiriya Rock Base, Yala Block 1 Gate"
                    className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 focus:border-[#C5A880] outline-none text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Weather Status</label>
                  <select
                    value={reportWeather}
                    onChange={(e) => setReportWeather(e.target.value)}
                    className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 focus:border-[#C5A880] outline-none text-xs"
                  >
                    <option value="CLEAR">☀️ CLEAR - Sunny / Optimal</option>
                    <option value="MILD_RAIN">🌧️ MILD_RAIN - Light Showers</option>
                    <option value="HEAVY_RAIN">⛈️ HEAVY_RAIN - Monsoon / Caution</option>
                    <option value="MIST">🌫️ MIST - Heavy Highlands Mist</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Crowd Level</label>
                  <select
                    value={reportCrowd}
                    onChange={(e) => setReportCrowd(e.target.value)}
                    className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 focus:border-[#C5A880] outline-none text-xs"
                  >
                    <option value="LOW">🟢 LOW - Uncrowded / Fast Queue</option>
                    <option value="MODERATE">🟡 MODERATE - Normal Visitors</option>
                    <option value="VERY_HIGH">🔴 VERY_HIGH - Heavy Queues</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Condition Notes & Trail Advisories</label>
                  <textarea
                    rows={4}
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    placeholder="Notes on road closures, wildlife sightings, or monument ticket status..."
                    className="w-full bg-slate-900 border border-stone-700 rounded-xl p-3 text-stone-100 focus:border-[#C5A880] outline-none text-xs"
                  />
                </div>

                <motion.button
                  {...buttonPressProps}
                  type="submit"
                  disabled={submittingReport}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer font-mono"
                >
                  {submittingReport ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Dispatch Field Condition Report</span>
                    </>
                  )}
                </motion.button>
              </form>
            </div>

            {/* Reports Stream */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-serif-luxury font-bold text-stone-100">
                Recent Field Condition Broadcasts
              </h3>

              {reports.length === 0 ? (
                <div className="p-8 text-center bg-[#0F1A24] border border-stone-800 rounded-2xl text-stone-400 text-xs">
                  No live field reports submitted yet. Use the form on the left to dispatch updates.
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((r) => (
                    <div
                      key={r.id}
                      className="p-5 bg-[#0F1A24] border border-stone-800 rounded-2xl space-y-3 text-xs font-sans shadow-md"
                    >
                      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#C5A880]" />
                          <span className="font-bold text-stone-100 text-sm font-serif-luxury">{r.location}</span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className={`px-2.5 py-0.5 rounded font-bold border ${
                            r.weatherStatus === 'CLEAR' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                          }`}>
                            {r.weatherStatus}
                          </span>
                          <span className="px-2.5 py-0.5 rounded font-bold bg-slate-900 text-stone-300 border border-stone-700">
                            Crowd: {r.crowdLevel}
                          </span>
                        </div>
                      </div>

                      <p className="text-stone-300 leading-relaxed font-sans">
                        {r.conditionNote || 'Regular status report. Route and ticket access operating as scheduled.'}
                      </p>

                      <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 pt-1 border-t border-stone-800/60">
                        <span>Reported by Certified Escort • {new Date(r.createdAt).toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteFieldReport(r.id)}
                          className="text-rose-400 hover:text-rose-300 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          Delete Report
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* EDIT PROFILE MODAL */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-[#0F1A24] border border-[#C5A880]/30 rounded-2xl shadow-2xl overflow-hidden text-stone-100 font-sans p-6 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <h3 className="text-xl font-serif-luxury font-bold text-stone-100">
                  Edit Certified Guide Profile
                </h3>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="text-stone-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-sans">
                {/* Bio */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">Professional Bio & Experience</label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full bg-slate-900 border border-stone-700 rounded-xl p-3 text-stone-100 focus:border-[#C5A880] outline-none text-xs"
                  />
                </div>

                {/* 2. Languages Selection Dropdown / Selector (Top 5 Website Languages) */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Languages Spoken <span className="text-stone-400 text-[10px] font-mono">(Select from 5 website languages)</span>
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {WEBSITE_LANGUAGES.map((lang) => {
                      const isSelected = selectedLanguages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => toggleLanguage(lang)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#134E4A] text-emerald-200 border-emerald-500/50 shadow-md'
                              : 'bg-slate-900 text-stone-400 border-stone-800 hover:border-stone-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          <span>{lang}</span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono block pt-1.5">
                    Selected Languages: <strong className="text-[#C5A880]">{selectedLanguages.join(', ')}</strong>
                  </span>
                </div>

                {/* 3. Specialties Selection Dropdown / Selector (Top 5 Curated Specialties) */}
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Specialties & Guiding Focus <span className="text-stone-400 text-[10px] font-mono">(Select from 5 expedition specialties)</span>
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {WEBSITE_SPECIALTIES.map((spec) => {
                      const isSelected = selectedSpecialties.includes(spec);
                      return (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => toggleSpecialty(spec)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#134E4A] text-emerald-200 border-emerald-500/50 shadow-md'
                              : 'bg-slate-900 text-stone-400 border-stone-800 hover:border-stone-700'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          <span>{spec}</span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono block pt-1.5">
                    Selected Specialties: <strong className="text-[#C5A880]">{selectedSpecialties.join(', ')}</strong>
                  </span>
                </div>

                {/* 4. Photo (Local File Upload & Web URL) */}
                <div className="space-y-2 pt-2 border-t border-stone-800">
                  <label className="block text-stone-300 font-semibold">Guide Photo (Local Upload or URL)</label>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-stone-700 overflow-hidden shrink-0 flex items-center justify-center text-[#C5A880]">
                      {editPhoto ? (
                        <img src={editPhoto} alt="Guide Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLocalPhotoUpload}
                          className="hidden"
                          id="guide-local-photo-input"
                        />
                        <label
                          htmlFor="guide-local-photo-input"
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-stone-700 text-stone-200 rounded-xl text-xs font-mono cursor-pointer flex items-center gap-1.5 transition"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#C5A880]" />
                          <span>Choose Local Image File</span>
                        </label>
                      </div>

                      <input
                        type="text"
                        value={editPhoto}
                        onChange={(e) => setEditPhoto(e.target.value)}
                        placeholder="Or paste web image URL..."
                        className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-1.5 text-stone-100 focus:border-[#C5A880] outline-none text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Daily Rate with Currency Dropdown */}
                <div className="pt-2 border-t border-stone-800">
                  <label className="block text-stone-300 font-semibold mb-1">Default Daily Rate & Currency</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value)}
                      className="bg-slate-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 focus:border-[#C5A880] outline-none text-xs font-mono font-bold shrink-0 cursor-pointer"
                    >
                      <option value="LKR">LKR (₨)</option>
                      <option value="USD">USD ($)</option>
                    </select>

                    <input
                      type="number"
                      min={0}
                      value={editRate}
                      onChange={(e) => setEditRate(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-stone-700 rounded-xl px-3 py-2 text-stone-100 focus:border-[#C5A880] outline-none text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 rounded-xl bg-slate-900 border border-stone-700 text-stone-300 text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <motion.button
                    {...buttonPressProps}
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold text-xs shadow-lg hover:brightness-110 disabled:opacity-50 transition cursor-pointer font-mono"
                  >
                    {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* 2. RESPONSE MODAL (Accept or Decline) */}
        {selectedTourForResponse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0F1A24] border border-[#C5A880]/30 rounded-2xl shadow-2xl overflow-hidden text-stone-100 font-sans p-6 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div>
                  <h3 className="text-xl font-serif-luxury font-bold text-stone-100">
                    Respond to Expedition Request
                  </h3>
                  <p className="text-xs text-stone-400 font-mono">
                    Booking #{selectedTourForResponse.bookingReference} • {selectedTourForResponse.travelerName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTourForResponse(null)}
                  className="text-stone-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Decision Badge */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border bg-slate-900 font-mono text-xs">
                <span className="text-stone-400 font-semibold">Your Selected Decision:</span>
                {responseDecision === 'ACCEPT' ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Accepting Expedition</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Declining Request</span>
                  </span>
                )}
              </div>

              <form onSubmit={handleSendGuideResponse} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    Message to Traveler & Travel Agent <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder={
                      responseDecision === 'ACCEPT'
                        ? 'Welcome your guest, share tips (e.g. clothing, footwear, morning pickup tip)...'
                        : 'State why you cannot take this date (e.g. booked elsewhere, vehicle repair, personal leave)...'
                    }
                    className="w-full bg-slate-900 border border-stone-700 rounded-xl p-3.5 text-stone-100 focus:border-[#C5A880] outline-none text-xs leading-relaxed"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    {responseDecision === 'ACCEPT'
                      ? 'This note will be shown on the traveler dashboard and dispatched to the travel agent.'
                      : 'This reason will be sent urgently to the travel agent so they can assign an alternative guide.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3 font-mono">
                  <button
                    type="button"
                    onClick={() => setSelectedTourForResponse(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 border border-stone-700 text-stone-300 text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <motion.button
                    {...buttonPressProps}
                    type="submit"
                    disabled={sendingResponse}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg hover:brightness-110 disabled:opacity-50 transition cursor-pointer flex items-center gap-2 ${
                      responseDecision === 'ACCEPT'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white'
                        : 'bg-gradient-to-r from-rose-700 to-rose-600 text-white'
                    }`}
                  >
                    {sendingResponse ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending Response...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Confirm & Send Response</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GuidePortalPage;
