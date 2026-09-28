import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Compass, ShieldAlert, Bus, Award, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';

interface PipelineStepperHeaderProps {
  currentStep: 1 | 2 | 3 | 4;
}

export const PipelineStepperHeader: React.FC<PipelineStepperHeaderProps> = ({ currentStep }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const steps = [
    {
      number: 1,
      id: '01',
      title: '01. Traveler Vision',
      subtitle: 'Bespoke AI Expedition Planner',
      path: '/plan-my-trip',
      icon: Compass,
    },
    {
      number: 2,
      id: '02',
      title: '02. Destination & Field Safety',
      subtitle: 'Agent 02 Safety & Hazard Desk',
      path: '/operations/destinations-safety',
      icon: ShieldAlert,
    },
    {
      number: 3,
      id: '03',
      title: '03. Fleet & Route Dispatch',
      subtitle: 'Agent 03 Logistics & Telemetry',
      path: '/operations/capacity-dispatch',
      icon: Bus,
    },
    {
      number: 4,
      id: '04',
      title: '04. Governance & Approval',
      subtitle: 'Concierge Authorization Desk',
      path: '/operations/concierge-approval',
      icon: Award,
    },
  ];

  const handleNavigate = (path: string) => {
    // Preserve active query parameters across transitions
    const searchParams = location.search || '';
    navigate(`${path}${searchParams}`);
  };

  return (
    <div className="w-full bg-[#070D1E]/95 border-b border-emerald-900/50 backdrop-blur-md sticky top-0 z-40 py-3.5 px-4 md:px-8 shadow-2xl font-mono">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Badge Header */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 shadow-lg font-bold">
            <Sparkles className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">CEYLONMATE AGENTIC PIPELINE</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                LIVE STAGE {currentStep} / 4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">Multi-Agent Expedition & Fleet Dispatch Matrix</p>
          </div>
        </div>

        {/* Stepper Pipeline Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto w-full md:w-auto py-1 scrollbar-none">
          {steps.map((step, idx) => {
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            const Icon = step.icon;

            return (
              <React.Fragment key={step.number}>
                <button
                  onClick={() => handleNavigate(step.path)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border-emerald-500/80 text-emerald-200 font-bold shadow-lg shadow-emerald-950/50 scale-[1.02]'
                      : isCompleted
                      ? 'bg-slate-900/90 border-emerald-700/40 text-emerald-400 hover:border-emerald-500/60 hover:text-emerald-300'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-center shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                    )}
                  </div>

                  <div className="text-left">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span>{step.title}</span>
                    </div>
                  </div>
                </button>

                {idx < steps.length - 1 && (
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 hidden lg:block ${currentStep > step.number ? 'text-emerald-500/60' : 'text-slate-700'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

      </div>
    </div>
  );
};
