import React from 'react';
import { Link } from 'react-router';

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <Link to="/" className={`flex items-center gap-3 group ${className}`}>
      {/* Luxury Golden Compass & Tea Leaf Emblem */}
      <div className="relative w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-950 to-slate-900 border border-[#C5A880]/40 shadow-lg group-hover:border-[#C5A880] transition-all duration-300 shrink-0">
        <svg
          viewBox="0 0 100 100"
          className="w-6 h-6 fill-none stroke-[#C5A880] stroke-[2.5]"
        >
          {/* Outer Compass Ring */}
          <circle cx="50" cy="50" r="42" strokeDasharray="4 3" opacity="0.6" />

          {/* Elegant Ceylon Leaf & North Star */}
          <path
            d="M50 15 C68 35, 75 60, 50 85 C25 60, 32 35, 50 15 Z"
            fill="url(#goldGradient)"
            stroke="#C5A880"
            strokeWidth="1.5"
            opacity="0.9"
          />
          <path d="M50 15 L50 85" stroke="#0B131F" strokeWidth="1.2" opacity="0.7" />

          {/* Compass Star Points */}
          <polygon points="50,22 53,32 63,35 53,38 50,48 47,38 37,35 47,32" fill="#C5A880" />

          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="50%" stopColor="#C5A880" />
              <stop offset="100%" stopColor="#996515" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col">
        <span className="font-serif-luxury text-xl tracking-[0.2em] font-semibold text-white group-hover:text-[#C5A880] transition-colors uppercase">
          Ceylon<span className="text-[#C5A880]">Mate</span>
        </span>
        <span className="text-[9px] tracking-[0.25em] text-[#C5A880]/80 uppercase font-sans -mt-1">
          Bespoke Journeys
        </span>
      </div>
    </Link>
  );
};
