import React from 'react';
import { Link } from 'react-router';
import { ShieldCheck, FileText, Compass, MapPin } from 'lucide-react';

interface AgentDeskSubNavProps {
  activeTab: 'approvals' | 'trips' | 'collections' | 'destinations';
}

export const AgentDeskSubNav: React.FC<AgentDeskSubNavProps> = ({ activeTab }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-[#0F1A24]/90 p-2.5 rounded-2xl border border-[#C5A880]/20 backdrop-blur-xl shadow-xl w-fit">
      <Link
        to="/agent-portal"
        className={`px-5 py-2.5 rounded-xl font-medium text-xs md:text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
          activeTab === 'approvals'
            ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold shadow-lg shadow-[#C5A880]/20'
            : 'text-slate-300 hover:text-white hover:bg-[#C5A880]/10'
        }`}
      >
        <ShieldCheck className="w-4 h-4" />
        <span>Concierge Approvals</span>
      </Link>

      <Link
        to="/staff/trips"
        className={`px-5 py-2.5 rounded-xl font-medium text-xs md:text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
          activeTab === 'trips'
            ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold shadow-lg shadow-[#C5A880]/20'
            : 'text-slate-300 hover:text-white hover:bg-[#C5A880]/10'
        }`}
      >
        <FileText className="w-4 h-4" />
        <span>Bespoke Proposals</span>
      </Link>

      <Link
        to="/staff/signature-journeys"
        className={`px-5 py-2.5 rounded-xl font-medium text-xs md:text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
          activeTab === 'collections'
            ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold shadow-lg shadow-[#C5A880]/20'
            : 'text-slate-300 hover:text-white hover:bg-[#C5A880]/10'
        }`}
      >
        <Compass className="w-4 h-4" />
        <span>Curated Master Collections</span>
      </Link>

      <Link
        to="/staff/destinations"
        className={`px-5 py-2.5 rounded-xl font-medium text-xs md:text-sm transition-all duration-300 flex items-center gap-2 cursor-pointer ${
          activeTab === 'destinations'
            ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-bold shadow-lg shadow-[#C5A880]/20'
            : 'text-slate-300 hover:text-white hover:bg-[#C5A880]/10'
        }`}
      >
        <MapPin className="w-4 h-4" />
        <span>Destinations & Advisories</span>
      </Link>
    </div>
  );
};
