import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Lock, Mail, User, ShieldCheck, Sparkles, ArrowRight, AlertTriangle, CheckCircle2, Server } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../context/ToastContext';
import { API_BASE_URL, checkServerHealth } from '../../services/api';
import { buttonPressProps, scaleInModalVariants } from '../../utils/animations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'signin' | 'register' | 'agent';
  titleHint?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin',
  titleHint,
}) => {
  const { login, error: authError, clearError } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'signin' | 'register' | 'agent'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      clearError();
      setLocalError(null);
      probeServer();
    }
  }, [isOpen]);

  const probeServer = async () => {
    const isOk = await checkServerHealth();
    setServerOnline(isOk);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!serverOnline) {
      setLocalError(`🚨 Backend Server Offline: Unable to connect to CeylonMate API at ${API_BASE_URL}. Please start the ASP.NET Core backend using 'dotnet run'.`);
      return;
    }

    setLoading(true);

    const success = await login(email, password);
    setLoading(false);

    if (success) {
      showToast('Signed In Successfully', 'Welcome back to CeylonMate Journeys.', 'success');
      onSuccess?.();
      onClose();
    } else {
      // STRICT REQUIREMENT: DO NOT LOG IN ON FAILURE!
      showToast('Authentication Failed', 'Unable to sign in with provided credentials.', 'error');
    }
  };

  // 1-Click Demo Buttons: Auto-fill inputs & submit through real API
  const handleQuickDemoFill = async (role: 'TRAVEL_AGENT' | 'CAPACITY_OFFICER' | 'ADMIN') => {
    clearError();
    setLocalError(null);

    const demoEmail =
      role === 'TRAVEL_AGENT'
        ? 'agent@ceylonmate.com'
        : role === 'CAPACITY_OFFICER'
        ? 'capacity@ceylonmate.com'
        : 'admin@ceylonmate.com';

    setEmail(demoEmail);
    setPassword('Password123!');
    setMode('signin');

    if (!serverOnline) {
      setLocalError(`🚨 Backend Server Offline: Unable to connect to API at ${API_BASE_URL}. Please start backend server.`);
      return;
    }

    setLoading(true);
    const ok = await login(demoEmail, 'Password123!');
    setLoading(false);

    if (ok) {
      showToast('Authenticated via Backend API', `Logged in as ${role.replace('_', ' ')}.`, 'success');
      onSuccess?.();
      onClose();
    } else {
      showToast('Authentication Failed', `Real backend API rejected credentials for ${demoEmail}.`, 'error');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          variants={scaleInModalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative w-full max-w-md bg-[#0F1A24] border border-stone-700/60 rounded-2xl shadow-2xl overflow-hidden text-stone-100"
        >
          {/* Header Banner */}
          <div className="relative p-6 pb-4 border-b border-stone-800 bg-gradient-to-r from-[#0B131F] to-[#134E4A]/30">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C5A880] tracking-widest uppercase">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>CeylonMate Privé</span>
              </div>

              {/* Real-Time Server Connectivity Badge */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-stone-700">
                <span className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-ping'}`} />
                <span className={serverOnline ? 'text-emerald-300' : 'text-rose-300'}>
                  {serverOnline === null ? 'Probing API...' : serverOnline ? 'Server 5000 Connected' : 'Server Disconnected'}
                </span>
              </div>
            </div>

            <h3 className="text-2xl font-serif-luxury text-stone-100 font-semibold mt-1">
              {titleHint || (mode === 'register' ? 'Join CeylonMate' : mode === 'agent' ? 'Agent & Staff Portal' : 'Sign In to Proceed')}
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              {mode === 'register'
                ? 'Create a bespoke traveler account to lock capacity and manage proposals.'
                : mode === 'agent'
                ? 'Authorized access for travel agents and inventory operations.'
                : 'Access your saved itineraries, private chauffeur schedules, and live quotes.'}
            </p>

            {/* Tabs */}
            <div className="flex gap-2 mt-4 p-1 bg-slate-900/80 rounded-lg border border-stone-800">
              <button
                type="button"
                onClick={() => { setMode('signin'); setLocalError(null); }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  mode === 'signin'
                    ? 'bg-[#C5A880] text-[#0B131F] font-semibold shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setLocalError(null); }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  mode === 'register'
                    ? 'bg-[#C5A880] text-[#0B131F] font-semibold shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                New Guest
              </button>
              <button
                type="button"
                onClick={() => { setMode('agent'); setLocalError(null); }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  mode === 'agent'
                    ? 'bg-[#134E4A] text-emerald-100 font-semibold shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Agent Portal
              </button>
            </div>
          </div>

          {/* Body Form */}
          <div className="p-6 space-y-4">
            {/* Prominent Red Error Banner if Offline or Auth Error */}
            {(localError || authError || serverOnline === false) && (
              <div className="p-3.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-start gap-2.5 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-mono">
                  {localError || authError || `🚨 Backend Server Offline: Unable to connect to CeylonMate API at ${API_BASE_URL}. Please ensure the ASP.NET Core backend is running with 'dotnet run'.`}
                </div>
              </div>
            )}

            {mode === 'agent' ? (
              <div className="space-y-3">
                <p className="text-xs text-stone-300 leading-relaxed bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 inline mr-1.5" />
                  Select a staff role persona below. Clicking a button auto-fills credentials and executes a real backend API authentication request.
                </p>

                <div className="grid grid-cols-1 gap-2.5 pt-1">
                  <motion.button
                    {...buttonPressProps}
                    type="button"
                    onClick={() => handleQuickDemoFill('TRAVEL_AGENT')}
                    className="flex items-center justify-between p-3 bg-slate-900/90 border border-amber-500/30 hover:border-amber-400 rounded-xl text-left group transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-amber-200">Demo as Travel Agent</div>
                      <div className="text-[11px] text-stone-400">agent@ceylonmate.com</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                  </motion.button>

                  <motion.button
                    {...buttonPressProps}
                    type="button"
                    onClick={() => handleQuickDemoFill('CAPACITY_OFFICER')}
                    className="flex items-center justify-between p-3 bg-slate-900/90 border border-teal-500/30 hover:border-teal-400 rounded-xl text-left group transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-teal-200">Demo as Capacity Officer</div>
                      <div className="text-[11px] text-stone-400">capacity@ceylonmate.com</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-teal-400 group-hover:translate-x-1 transition-transform" />
                  </motion.button>

                  <motion.button
                    {...buttonPressProps}
                    type="button"
                    onClick={() => handleQuickDemoFill('ADMIN')}
                    className="flex items-center justify-between p-3 bg-slate-900/90 border border-rose-500/30 hover:border-rose-400 rounded-xl text-left group transition-all"
                  >
                    <div>
                      <div className="text-xs font-bold text-rose-200">Demo as System Admin</div>
                      <div className="text-[11px] text-stone-400">admin@ceylonmate.com</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-medium text-stone-300 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Lady Evelyn Sinclair"
                        className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={mode === 'register' ? 'evelyn@luxuryjourneys.com' : 'agent@ceylonmate.com'}
                      className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl pl-9 pr-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl pl-9 pr-3 py-2 text-sm text-stone-100 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <motion.button
                  {...buttonPressProps}
                  type="submit"
                  disabled={loading || serverOnline === false}
                  className={`w-full mt-2 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    serverOnline === false
                      ? 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] shadow-lg'
                  }`}
                >
                  {loading ? (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent" />
                  ) : serverOnline === false ? (
                    <span>Backend Offline — Cannot Sign In</span>
                  ) : (
                    <>
                      <span>{mode === 'register' ? 'Create Account & Continue' : 'Sign In via Backend API'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
