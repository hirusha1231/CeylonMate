import React from 'react';
import { Link } from 'react-router';
import { Leaf, PhoneCall, MapPin, Mail, Award, ArrowRight, ShieldCheck } from 'lucide-react';
import { Logo } from '../common/Logo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0B131F] text-stone-300 border-t border-stone-800 font-sans pt-16 pb-12 relative overflow-hidden">
      {/* Background Subtle Accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#134E4A]/10 rounded-full filter blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-12 relative z-10">
        {/* Top Badges Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12 border-b border-stone-800">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#0F1A24]/70 border border-stone-800">
            <div className="w-12 h-12 rounded-xl bg-[#134E4A]/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif-luxury text-stone-100 text-lg font-semibold">SLTDA Certified</h4>
              <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                Licensed Tour Operator #SLTDA/SQA/TA/01492 under Ministry of Tourism Sri Lanka.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#0F1A24]/70 border border-stone-800">
            <div className="w-12 h-12 rounded-xl bg-[#134E4A]/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Leaf className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif-luxury text-stone-100 text-lg font-semibold">100% Carbon Neutral</h4>
              <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                Every vehicle kilometer offset through Sinharaja Rainforest reforestation programs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#0F1A24]/70 border border-stone-800">
            <div className="w-12 h-12 rounded-xl bg-[#134E4A]/30 border border-amber-500/30 flex items-center justify-center text-[#C5A880] shrink-0">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif-luxury text-stone-100 text-lg font-semibold">24/7 Island Desk</h4>
              <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                Dedicated ground operations response hotline: +94 11 7311 611 (Colombo HQ).
              </p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Col 1: Brand Info with Logo */}
          <div className="lg:col-span-2 space-y-4">
            <Logo />
            <p className="text-sm text-stone-400 max-w-sm leading-relaxed pt-1">
              Curators of Bespoke Sri Lanka Journeys. Uniting world-class private luxury hospitality with terrain-aware logistics intelligence and 100% guaranteed capacity.
            </p>
            <div className="pt-2 text-xs text-stone-400 space-y-1.5">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C5A880]" />
                <span>CeylonMate HQ, Level 14, World Trade Centre, Colombo 02, Sri Lanka</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#C5A880]" />
                <span>concierge@ceylonmate.lk</span>
              </div>
            </div>
          </div>

          {/* Col 2: Signature Journeys */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#C5A880] tracking-widest uppercase font-mono">
              Signature Journeys
            </h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>
                <Link to="/#heartland" className="hover:text-stone-100 transition-colors">
                  Cultural Heartland (6D/5N)
                </Link>
              </li>
              <li>
                <Link to="/#highlands" className="hover:text-stone-100 transition-colors">
                  Highlands & Tea Rails (4D/3N)
                </Link>
              </li>
              <li>
                <Link to="/#deep-south" className="hover:text-stone-100 transition-colors">
                  Deep South Safaris (5D/4N)
                </Link>
              </li>
              <li>
                <Link to="/#riviera" className="hover:text-stone-100 transition-colors">
                  Southern Riviera (5D/4N)
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Company & Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#C5A880] tracking-widest uppercase font-mono">
              The Experience
            </h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>
                <Link to="/plan-my-trip" className="hover:text-stone-100 transition-colors flex items-center gap-1">
                  <span>Tailor-Made Planner</span>
                  <ArrowRight className="w-3 h-3 text-[#C5A880]" />
                </Link>
              </li>
              <li>
                <Link to="/destinations" className="hover:text-stone-100 transition-colors">
                  Destination Guides
                </Link>
              </li>
              <li>
                <Link to="/fleet-and-guides" className="hover:text-stone-100 transition-colors">
                  VIP Chauffeur Fleet
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-stone-100 transition-colors">
                  About CeylonMate
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Portals & Governance */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#C5A880] tracking-widest uppercase font-mono">
              Portals & Governance
            </h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>
                <Link to="/my-bookings" className="hover:text-stone-100 transition-colors">
                  Traveler Portal
                </Link>
              </li>
              <li>
                <Link
                  to="/agent-portal"
                  className="text-stone-400 hover:text-emerald-400 transition-colors text-xs flex items-center gap-1 pt-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Agent & Staff Operations</span>
                </Link>
              </li>
              <li>
                <span className="text-stone-500 text-xs block pt-2">
                  ISO 27001 Certified Security
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 border-t border-stone-800/80 flex flex-col md:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© {new Date().getFullYear()} CeylonMate Private Limited. All rights reserved.</p>
          <div className="flex items-center gap-6 text-stone-400">
            <span className="hover:text-stone-200 cursor-pointer">Privacy Charter</span>
            <span className="hover:text-stone-200 cursor-pointer">Terms of Bespoke Travel</span>
            <span className="hover:text-stone-200 cursor-pointer">SLTDA License #01492</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
