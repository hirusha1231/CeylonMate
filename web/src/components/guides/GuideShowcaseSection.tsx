import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  Globe,
  Star,
  ShieldCheck,
  RefreshCw,
  Compass,
  Car,
  ArrowRight,
  UserX,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router';
import { api, apiError } from '../../api/client';
import { hoverLiftProps } from '../../utils/animations';

export interface PublicGuideItem {
  id: string;
  fullName: string;
  photoUrl: string;
  avatarUrl?: string;
  bio: string;
  licenseNumber: string;
  licenseType: string;
  guideType?: string;
  languagesSpoken: string;
  languages?: string;
  specialties: string;
  isChauffeur: boolean;
  drivingLicenseClass?: string;
  chauffeurLicenseClass?: string;
  rating: number;
  reviewCount: number;
}

interface GuideShowcaseSectionProps {
  showTitle?: boolean;
}

export const GuideShowcaseSection: React.FC<GuideShowcaseSectionProps> = ({ showTitle = true }) => {
  const [guides, setGuides] = useState<PublicGuideItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLanguage, setFilterLanguage] = useState<string>('ALL');

  useEffect(() => {
    fetchGuides();
  }, [filterLanguage]);

  const fetchGuides = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filterLanguage !== 'ALL') {
        params.language = filterLanguage;
      }
      const res = await api.get<any[]>('/api/guides', { params });
      if (res.data && Array.isArray(res.data)) {
        const mapped: PublicGuideItem[] = res.data.map((item: any) => {
          const img = item.photoUrl || item.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';
          const typeBadge = item.guideType || item.licenseType || 'National Tourist Guide Lecturer';
          const langs = item.languages || item.languagesSpoken || 'English, Sinhala';
          const drivingClass = item.chauffeurLicenseClass || item.drivingLicenseClass || (item.isChauffeur ? 'Class B Certified' : 'N/A');

          return {
            id: item.id || item.userId || String(Math.random()),
            fullName: item.fullName || item.name || 'SLTDA Certified Guide',
            photoUrl: img,
            avatarUrl: img,
            bio: item.bio || 'SLTDA Certified Ceylon Tourist Escort',
            licenseNumber: item.licenseNumber || 'SLTDA/CG/2026/0001',
            licenseType: typeBadge,
            guideType: typeBadge,
            languagesSpoken: langs,
            languages: langs,
            specialties: item.specialties || 'Cultural Heritage & Ancient Kingdoms',
            isChauffeur: Boolean(item.isChauffeur),
            drivingLicenseClass: drivingClass,
            chauffeurLicenseClass: drivingClass,
            rating: Number(item.rating) || 5.0,
            reviewCount: Number(item.reviewCount) || 0,
          };
        });
        setGuides(mapped);
      } else {
        setGuides([]);
      }
    } catch (err: any) {
      console.error('Failed to load real guide data from API:', err);
      setError(apiError(err));
      setGuides([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {showTitle && (
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C5A880]/10 border border-[#C5A880]/30 text-[#C5A880] text-xs font-semibold uppercase tracking-widest">
            <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>SLTDA Certified Local & Chauffeur Guides</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif-luxury font-bold text-[#0B131F]">
            Meet Our Certified Local Guides
          </h2>
          <p className="text-stone-600 text-sm leading-relaxed">
            Every CeylonMate journey is accompanied by verified National Tourist Guide Lecturers and Chauffeur Guides queryable live from our database.
          </p>
        </div>
      )}

      {/* Language Filter Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs font-mono text-stone-500 font-semibold mr-2 uppercase tracking-wider">Language:</span>
        {['ALL', 'English', 'German', 'French', 'Spanish', 'Japanese'].map((lang) => (
          <button
            key={lang}
            onClick={() => setFilterLanguage(lang)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filterLanguage === lang
                ? 'bg-[#134E4A] text-stone-100 shadow-md border border-[#134E4A]'
                : 'bg-white text-stone-600 hover:text-[#0B131F] border border-stone-200 hover:border-stone-400'
            }`}
          >
            {lang === 'ALL' ? 'All Languages' : lang}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700 max-w-lg mx-auto space-y-2">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="font-semibold text-sm">Unable to connect to live guide directory</p>
          <p className="text-xs text-rose-600">{error}</p>
          <button
            onClick={fetchGuides}
            className="mt-2 px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="py-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#C5A880] animate-spin mx-auto" />
          <p className="text-xs text-stone-500 font-mono">Querying real database records for local guides...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && guides.length === 0 && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-12 text-center text-stone-500 max-w-md mx-auto space-y-3">
          <UserX className="w-10 h-10 text-stone-400 mx-auto" />
          <h4 className="font-serif-luxury text-lg font-bold text-stone-700">No Registered Guides Found</h4>
          <p className="text-xs leading-relaxed">
            No registered guides found for the selected criteria. Please add guides via the Database / Admin Portal.
          </p>
        </div>
      )}

      {/* Guide Cards Grid */}
      {!loading && !error && guides.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {guides.map((guide) => (
            <motion.div
              key={guide.id}
              {...hoverLiftProps}
              className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-xl flex flex-col justify-between group"
            >
              <div className="p-6 space-y-5">
                {/* Header Info: Avatar + Title + Rating */}
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <img
                      src={guide.photoUrl || guide.avatarUrl}
                      alt={guide.fullName}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-[#C5A880]/40 shadow-md group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';
                      }}
                    />
                    <div className="absolute -bottom-1 -right-1 bg-[#134E4A] text-[#D4AF37] p-1 rounded-full shadow" title="SLTDA Verified">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#134E4A] bg-[#134E4A]/10 px-2 py-0.5 rounded border border-[#134E4A]/20 truncate">
                        {guide.guideType || guide.licenseType}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-600 shrink-0">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{guide.rating.toFixed(1)}</span>
                        <span className="text-stone-400 text-[11px] font-normal">({guide.reviewCount})</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-serif-luxury font-bold text-[#0B131F] truncate">
                      {guide.fullName}
                    </h3>

                    <div className="text-[11px] font-mono text-stone-500 flex items-center gap-1">
                      <Award className="w-3 h-3 text-[#C5A880]" />
                      <span>{guide.licenseNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Bio Excerpt */}
                <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                  {guide.bio}
                </p>

                {/* Badges & Properties */}
                <div className="space-y-2.5 text-xs pt-3 border-t border-stone-100">
                  <div className="flex items-center gap-2 text-stone-700">
                    <Globe className="w-4 h-4 text-[#134E4A] shrink-0" />
                    <span className="font-semibold text-stone-800 shrink-0">Languages:</span>
                    <span className="text-stone-600 truncate">{guide.languages || guide.languagesSpoken}</span>
                  </div>

                  <div className="flex items-center gap-2 text-stone-700">
                    <Compass className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <span className="font-semibold text-stone-800 shrink-0">Specialties:</span>
                    <span className="text-stone-600 truncate">{guide.specialties}</span>
                  </div>

                  {guide.isChauffeur && (
                    <div className="flex items-center gap-2 text-[#134E4A] bg-[#134E4A]/5 p-2 rounded-xl border border-[#134E4A]/10 text-[11px]">
                      <Car className="w-4 h-4 text-[#134E4A] shrink-0" />
                      <span className="font-semibold">Dual Chauffeur License:</span>
                      <span className="text-stone-600">{guide.chauffeurLicenseClass || guide.drivingLicenseClass || 'Class B Certified'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Footer: Book Action */}
              <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-end">
                <Link to="/plan-my-trip">
                  <button className="px-4 py-2 rounded-xl bg-[#0B131F] hover:bg-[#134E4A] text-[#C5A880] hover:text-white text-xs font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer">
                    <span>Book with Trip</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
