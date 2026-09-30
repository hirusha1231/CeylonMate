import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, Plus, Edit3, Trash2, Eye, EyeOff, Sparkles, MapPin, Clock, DollarSign, Image as ImageIcon,
  CheckCircle2, X, Layers, ArrowRight, RefreshCw, Check
} from 'lucide-react';
import { api, apiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { AgentDeskSubNav } from '../../components/layout/AgentDeskSubNav';
import { buttonPressProps, scaleInModalVariants } from '../../utils/animations';

export interface SignatureJourney {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  heroImageUrl: string;
  galleryImages: string[];
  durationDays: number;
  durationNights: number;
  startingPriceUsd: number;
  startingPriceLkr: number;
  destinationsCovered: string;
  highlights: string[];
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}


export const AgentSignatureJourneysPage: React.FC = () => {
  const { showToast } = useToast();
  const [journeys, setJourneys] = useState<SignatureJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJourney, setEditingJourney] = useState<SignatureJourney | null>(null);


  // Form State
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [destinationsCovered, setDestinationsCovered] = useState('');
  const [startingPriceUsd, setStartingPriceUsd] = useState(0);
  const [startingPriceLkr, setStartingPriceLkr] = useState(0);
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [newGalleryInput, setNewGalleryInput] = useState('');
  const [highlights, setHighlights] = useState<string[]>([]);
  const [newHighlightInput, setNewHighlightInput] = useState('');
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  const fetchJourneys = async () => {
    try {
      setLoading(true);
      const res = await api.get<SignatureJourney[]>('/api/agent/signature-journeys');
      setJourneys(res.data);
    } catch (err: any) {
      showToast('Error Loading Collections', apiError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJourneys();
  }, []);

  const resetForm = () => {
    setEditingJourney(null);
    setTitle('');
    setTagline('');
    setDurationDays(7);
    setDestinationsCovered('');
    setStartingPriceUsd(0);
    setStartingPriceLkr(0);
    setHeroImageUrl('');
    setGalleryImages([]);
    setNewGalleryInput('');
    setHighlights([]);
    setNewHighlightInput('');
    setDescription('');
    setIsPublished(false);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (journey: SignatureJourney) => {
    setEditingJourney(journey);
    setTitle(journey.title || '');
    setTagline(journey.tagline || '');
    setDurationDays(journey.durationDays || 7);
    setDestinationsCovered(journey.destinationsCovered || '');
    setStartingPriceUsd(journey.startingPriceUsd || 0);
    setStartingPriceLkr(journey.startingPriceLkr || 0);
    setHeroImageUrl(journey.heroImageUrl || '');
    setGalleryImages(journey.galleryImages || []);
    setHighlights(journey.highlights || []);
    setDescription(journey.description || '');
    setIsPublished(journey.isPublished);
    setModalOpen(true);
  };


  const handleAddHighlight = () => {
    if (newHighlightInput.trim()) {
      setHighlights([...highlights, newHighlightInput.trim()]);
      setNewHighlightInput('');
    }
  };

  const handleRemoveHighlight = (index: number) => {
    setHighlights(highlights.filter((_, i) => i !== index));
  };

  const handleAddGalleryUrl = () => {
    if (newGalleryInput.trim()) {
      setGalleryImages([...galleryImages, newGalleryInput.trim()]);
      setNewGalleryInput('');
    }
  };

  const handleRemoveGalleryUrl = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Validation Error', 'Collection title is required.', 'error');
      return;
    }
    if (!heroImageUrl.trim()) {
      showToast('Validation Error', 'Primary Hero Image is required.', 'error');
      return;
    }

    const payload = {
      title: title.trim(),
      tagline: tagline.trim(),
      durationDays: Number(durationDays || 1),
      durationNights: Math.max(0, Number(durationDays || 1) - 1),
      destinationsCovered: destinationsCovered.trim(),
      startingPriceUsd: Number(startingPriceUsd),
      startingPriceLkr: Number(startingPriceLkr),
      heroImageUrl: heroImageUrl.trim(),
      galleryImages: galleryImages.filter(url => url.trim().length > 0),
      highlights: highlights.filter(h => h.trim().length > 0),
      description: description.trim(),
      isPublished,
    };

    try {
      setSubmitting(true);
      if (editingJourney) {
        await api.put(`/api/agent/signature-journeys/${editingJourney.id}`, payload);
        showToast('Collection Updated', `Successfully updated '${payload.title}'.`, 'success');
      } else {
        await api.post('/api/agent/signature-journeys', payload);
        showToast('Collection Created', `Successfully created master collection '${payload.title}'.`, 'success');
      }
      setModalOpen(false);
      resetForm();
      fetchJourneys();
    } catch (err: any) {
      showToast('Save Failed', apiError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (journey: SignatureJourney) => {
    try {
      const res = await api.patch(`/api/agent/signature-journeys/${journey.id}/publish`);
      const newStatus = res.data.isPublished;
      setJourneys(journeys.map(j => j.id === journey.id ? { ...j, isPublished: newStatus } : j));
      showToast(
        newStatus ? 'Collection Published' : 'Collection Saved as Draft',
        `'${journey.title}' is now ${newStatus ? 'live on public Signature Journeys page' : 'hidden as a draft'}.`,
        newStatus ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast('Update Failed', apiError(err), 'error');
    }
  };

  const handleDelete = async (journey: SignatureJourney) => {
    if (!window.confirm(`Are you sure you want to delete '${journey.title}'?`)) {
      return;
    }
    try {
      await api.delete(`/api/agent/signature-journeys/${journey.id}`);
      setJourneys(journeys.filter(j => j.id !== journey.id));
      showToast('Collection Deleted', `Removed '${journey.title}' from catalog.`, 'info');
    } catch (err: any) {
      showToast('Delete Failed', apiError(err), 'error');
    }
  };

  return (
    <div className="space-y-8 font-sans text-stone-100">
      {/* SubNav Tabs */}
      <AgentDeskSubNav activeTab="collections" />

      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F1A24] border border-[#C5A880]/30 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-[#C5A880] uppercase tracking-widest">
            <Compass className="w-4 h-4 text-[#D4AF37]" />
            <span>Travel Agent Desk — Product Curation</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif-luxury font-bold text-stone-100">
            Curated Master Collections
          </h1>
          <p className="text-xs text-stone-400 max-w-xl">
            As a Travel Agent, curate, manage, and publish master public Signature Journeys with custom imagery, pricing (USD/LKR), and highlights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchJourneys}
            title="Refresh List"
            className="p-2.5 rounded-xl bg-slate-900 border border-stone-700 hover:border-[#C5A880] text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <motion.button
            {...buttonPressProps}
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] text-xs font-bold uppercase tracking-wider shadow-lg gold-shadow-bloom cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Master Collection</span>
          </motion.button>
        </div>
      </div>

      {/* Journeys Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-96 bg-[#0F1A24]/60 border border-stone-800 rounded-2xl animate-pulse p-4 flex flex-col justify-between">
              <div className="w-full h-48 bg-stone-800/60 rounded-xl" />
              <div className="space-y-2 mt-4">
                <div className="w-3/4 h-5 bg-stone-800/80 rounded" />
                <div className="w-1/2 h-4 bg-stone-800/60 rounded" />
              </div>
              <div className="w-full h-10 bg-stone-800/50 rounded-xl mt-4" />
            </div>
          ))}
        </div>
      ) : journeys.length === 0 ? (
        <div className="text-center py-16 bg-[#0F1A24] border border-stone-800 rounded-2xl p-8 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#C5A880]/10 flex items-center justify-center border border-[#C5A880]/30 text-[#D4AF37]">
            <Compass className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-serif-luxury font-semibold text-stone-200">No Master Collections Yet</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            Click the button above to curate public Signature Journeys for travelers.
          </p>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl bg-[#C5A880] text-[#0B131F] text-xs font-bold uppercase tracking-wider hover:bg-[#b89a70] transition-colors cursor-pointer"
          >
            Create Master Collection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {journeys.map(journey => (
            <motion.div
              key={journey.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative bg-[#0F1A24] border border-stone-800 hover:border-[#C5A880]/50 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between transition-all duration-300"
            >
              {/* Card Banner Image & Badges */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-900">
                {journey.heroImageUrl ? (
                  <img
                    src={journey.heroImageUrl}
                    alt={journey.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900">
                    <Compass className="w-10 h-10 text-stone-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F1A24] via-transparent to-black/40" />

                {/* Status Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md shadow-md ${
                      journey.isPublished
                        ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                        : 'bg-amber-950/80 border border-amber-500/50 text-amber-300'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${journey.isPublished ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    {journey.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>

                {/* Duration Badge */}
                {journey.durationDays > 0 && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-950/80 border border-stone-700 text-stone-200 text-[10px] font-mono flex items-center gap-1 backdrop-blur-md">
                    <Clock className="w-3 h-3 text-[#C5A880]" />
                    <span>{journey.durationDays} Days</span>
                  </div>
                )}


                {/* Title Overlay */}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-lg font-serif-luxury font-bold text-white drop-shadow-md line-clamp-1">
                    {journey.title}
                  </h3>
                  {journey.destinationsCovered && (
                    <div className="flex items-center gap-1 text-[11px] text-stone-300 font-mono mt-0.5">
                      <MapPin className="w-3 h-3 text-[#C5A880] shrink-0" />
                      <span className="truncate">{journey.destinationsCovered}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  {journey.tagline && (
                    <p className="text-xs text-[#C5A880] font-medium line-clamp-2 italic">
                      "{journey.tagline}"
                    </p>
                  )}

                  {journey.description && (
                    <p className="text-xs text-stone-400 line-clamp-3 mt-2 leading-relaxed">
                      {journey.description}
                    </p>
                  )}

                  {/* Highlights Snippet */}
                  {journey.highlights && journey.highlights.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {journey.highlights.slice(0, 2).map((hl, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-900 border border-stone-800 text-[10px] text-stone-300 font-mono truncate max-w-xs">
                          ✦ {hl}
                        </span>
                      ))}
                      {journey.highlights.length > 2 && (
                        <span className="text-[10px] text-stone-500 font-mono self-center">
                          +{journey.highlights.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Pricing Footer */}
                <div className="pt-3 border-t border-stone-800/80 flex items-center justify-end text-xs">
                  {/* Quick Toggle Publish Button */}
                  <button
                    onClick={() => handleTogglePublish(journey)}
                    title={journey.isPublished ? 'Click to unpublish' : 'Click to publish live'}
                    className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      journey.isPublished
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-rose-950/40 hover:border-rose-500/40 hover:text-rose-300'
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-emerald-950/40 hover:border-emerald-500/40 hover:text-emerald-300'
                    }`}
                  >
                    {journey.isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{journey.isPublished ? 'Unpublish' : 'Publish Live'}</span>
                  </button>
                </div>
              </div>

              {/* Card Actions Footer */}
              <div className="px-5 py-3 bg-[#0B131F]/80 border-t border-stone-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => openEditModal(journey)}
                  className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-stone-800 border border-stone-700 hover:border-[#C5A880] text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#C5A880]" />
                  <span>Edit Collection</span>
                </button>

                <button
                  onClick={() => handleDelete(journey)}
                  title="Delete Collection"
                  className="p-2 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-400 hover:bg-rose-900/50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT SIGNATURE JOURNEY MODAL */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              variants={scaleInModalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative w-full max-w-3xl my-8 bg-[#0F1A24] border border-stone-700 rounded-2xl shadow-2xl overflow-hidden text-stone-100 font-sans"
            >
              {/* Modal Header */}
              <div className="relative p-6 pb-4 border-b border-stone-800 bg-gradient-to-r from-[#0B131F] to-[#134E4A]/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C5A880] tracking-widest uppercase font-mono">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{editingJourney ? 'Edit Master Collection' : 'Create Master Collection'}</span>
                  </div>
                  <h2 className="text-xl font-serif-luxury font-bold text-stone-100 mt-1">
                    {editingJourney ? editingJourney.title : 'New Bespoke Signature Journey'}
                  </h2>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* SECTION 1: BASIC INFORMATION */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-stone-800 pb-2 text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-[#D4AF37]" />
                    <span>Section 1: Basic Information</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Collection Title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Cultural Triangle & Highland Mist"
                      className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Tagline / Subheading</label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g. A 7-Day Royal Expedition Across Ancient Capitals & High Tea Estates"
                      className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl px-3.5 py-2 text-xs text-stone-100 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">Duration (Days)</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={durationDays}
                        onChange={(e) => setDurationDays(Number(e.target.value))}
                        placeholder="e.g. 7"
                        className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl px-3.5 py-2 text-xs text-stone-100 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">Destinations Covered</label>
                      <input
                        type="text"
                        value={destinationsCovered}
                        onChange={(e) => setDestinationsCovered(e.target.value)}
                        placeholder="e.g. Sigiriya, Kandy, Nuwara Eliya"
                        className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl px-3.5 py-2 text-xs text-stone-100 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: IMAGERY & MEDIA */}
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                      <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
                      <span>Section 3: Imagery & Media</span>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400">Direct Web Image URLs</span>
                  </div>

                  {/* 1. PRIMARY HERO BANNER PHOTO */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-stone-300">
                      Primary Hero Banner Image <span className="text-rose-400">*</span>
                    </label>

                    {/* Image URL Input */}
                    <input
                      type="text"
                      required
                      value={heroImageUrl}
                      onChange={(e) => setHeroImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl px-3.5 py-2 text-xs text-stone-100 focus:outline-none font-mono"
                    />

                    {/* Instant Hero Image Live Preview */}
                    {heroImageUrl && (
                      <div className="relative h-36 w-full rounded-xl overflow-hidden border border-stone-700 bg-slate-950 shadow-inner">
                        <img
                          src={heroImageUrl}
                          alt="Hero Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as any).style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-black/80 text-[10px] font-mono text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Hero Banner Active
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 2. GALLERY IMAGES ARRAY */}
                  <div className="space-y-3 pt-2 border-t border-stone-800/80">
                    <label className="block text-xs font-semibold text-stone-300">Gallery Images</label>

                    {/* Add Gallery URL Input Row */}
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newGalleryInput}
                        onChange={(e) => setNewGalleryInput(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="flex-1 bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl px-3.5 py-2 text-xs text-stone-100 focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleAddGalleryUrl}
                        className="px-4 py-2 rounded-xl bg-slate-800 border border-stone-700 hover:border-[#C5A880] text-stone-200 text-xs font-semibold cursor-pointer shrink-0"
                      >
                        + Add URL
                      </button>
                    </div>

                    {/* Gallery Thumbnails Grid */}
                    {galleryImages.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                        {galleryImages.map((url, idx) => (
                          <div key={idx} className="relative group h-20 rounded-lg overflow-hidden border border-stone-700 bg-slate-950">
                            <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveGalleryUrl(idx)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-rose-950/80 text-rose-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 4: EXPERIENCE HIGHLIGHTS */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-stone-800 pb-2 text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <span>Section 4: Key Experience Highlights</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newHighlightInput}
                      onChange={(e) => setNewHighlightInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddHighlight(); } }}
                      placeholder="e.g. Private chartered helicopter option to Sigiriya Rock"
                      className="flex-1 bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl px-3.5 py-2 text-xs text-stone-100 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddHighlight}
                      className="px-4 py-2 rounded-xl bg-slate-800 border border-stone-700 hover:border-[#C5A880] text-stone-200 text-xs font-semibold cursor-pointer shrink-0"
                    >
                      + Add Highlight
                    </button>
                  </div>

                  {highlights.length > 0 && (
                    <div className="space-y-1.5">
                      {highlights.map((hl, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900 border border-stone-800 text-xs text-stone-200">
                          <span className="flex items-center gap-2 font-mono text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                            {hl}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveHighlight(idx)}
                            className="text-stone-500 hover:text-rose-400 p-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECTION 5: FULL OVERVIEW / STORY */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-stone-800 pb-2 text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                    <Compass className="w-4 h-4 text-[#D4AF37]" />
                    <span>Section 5: Full Overview Description</span>
                  </div>

                  <div>
                    <textarea
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Write a rich, inviting luxury narrative describing the journey itinerary, private chauffeur experience, accommodations, and unique moments..."
                      className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl p-3.5 text-xs text-stone-100 focus:outline-none leading-relaxed"
                    />
                  </div>

                  {/* Publish Checkbox */}
                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="isPublishedCheck"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-900 border-stone-700 text-[#C5A880] focus:ring-[#C5A880] cursor-pointer"
                    />
                    <label htmlFor="isPublishedCheck" className="text-xs font-semibold text-stone-200 cursor-pointer">
                      Publish immediately to public CeylonMate Signature Journeys catalog
                    </label>
                  </div>
                </div>

                {/* Modal Action Buttons */}
                <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-stone-700 hover:bg-stone-800 text-stone-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <motion.button
                    {...buttonPressProps}
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] text-xs font-bold uppercase tracking-wider shadow-lg cursor-pointer flex items-center gap-2"
                  >
                    {submitting ? (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{editingJourney ? 'Update Collection' : 'Save & Publish Collection'}</span>
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

export default AgentSignatureJourneysPage;
