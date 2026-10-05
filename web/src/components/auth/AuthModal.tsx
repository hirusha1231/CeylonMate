import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X, Lock, Mail, User, Sparkles, ArrowRight, AlertTriangle, Eye, EyeOff, Phone, CheckCircle2, Compass, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { getRoleRedirectPath } from '../../auth/types';
import { useToast } from '../../context/ToastContext';
import { API_BASE_URL, checkServerHealth, apiError } from '../../services/api';
import { buttonPressProps, scaleInModalVariants } from '../../utils/animations';
import { PasswordValidationRules, validatePasswordRules } from './PasswordValidationRules';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: 'signin' | 'register';
  titleHint?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin',
  titleHint,
}) => {
  const { login, register, error: authError, clearError } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);

  // Form Fields
  const [role, setRole] = useState<'TRAVELER' | 'LOCAL_GUIDE'>('TRAVELER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [shakePassword, setShakePassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      clearError();
      setLocalError(null);
      setSuccessMessage(null);
      setMode(initialMode);
      setShakePassword(false);
      probeServer();
    }
  }, [isOpen, initialMode]);

  const probeServer = async () => {
    const isOk = await checkServerHealth();
    setServerOnline(isOk);
  };

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalError('Please enter your email address and password.');
      return;
    }

    if (serverOnline === false) {
      setLocalError('Server Offline');
      return;
    }

    try {
      setLoading(true);
      console.log('[AuthModal] Initiating sign in for:', email);
      const authUser = await login(email, password);
      setLoading(false);

      if (authUser) {
        showToast('Signed In Successfully', `Welcome back to CeylonMate Journeys.`, 'success');
        onSuccess?.();
        onClose();
        const fromPath = (location.state as any)?.from;
        const targetPath = fromPath || getRoleRedirectPath(authUser.role);
        if (fromPath || authUser.role === 'ADMIN' || targetPath !== '/') {
          navigate(targetPath);
        }
      }
    } catch (err: any) {
      setLoading(false);
      console.error('[AuthModal] Login attempt failed:', err);
      let errorMessage = 'An unexpected error occurred.';
      if (err?.response) {
        errorMessage = err.response.data?.detail || err.response.data?.message || err.response.data?.title || `Login failed (${err.response.status}): Invalid credentials.`;
      } else if (err?.request) {
        errorMessage = 'Server Offline';
      } else if (err?.message) {
        errorMessage = apiError(err);
      }
      setLocalError(errorMessage);
      showToast('Authentication Failed', errorMessage, 'error');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);
    clearError();

    if (!fullName.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }

    if (/\d/.test(fullName)) {
      setLocalError('Full Name must contain letters only. Numbers are not allowed.');
      return;
    }

    if (phoneNumber && /[a-zA-Z]/.test(phoneNumber)) {
      setLocalError('Phone Number must contain numbers only. Letters are not allowed.');
      return;
    }

    if (!email.trim()) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    const pwdValidation = validatePasswordRules(password, confirmPassword);
    if (!pwdValidation.isValid) {
      setShakePassword(true);
      setTimeout(() => setShakePassword(false), 600);
      setLocalError(pwdValidation.error || 'Password does not meet common security requirements.');
      return;
    }

    if (serverOnline === false) {
      setLocalError('Server Offline');
      return;
    }

    try {
      setLoading(true);
      console.log('[AuthModal] Submitting registration form:', { email, fullName, role });
      const registered = await register(email, password, fullName, phoneNumber, role);
      setLoading(false);

      if (registered) {
        const isGuide = role === 'LOCAL_GUIDE';
        const msg = isGuide
          ? 'Your Certified Local Guide account has been created! Please sign in with your email and password to access your Guide Portal.'
          : 'Your CeylonMate Traveler account has been created! Please sign in with your password to proceed.';

        showToast(
          'Account Created',
          isGuide
            ? 'Your local guide account has been created. Please sign in.'
            : 'Your traveler account has been created. Please sign in.',
          'success'
        );

        // Move to the sign in page / view with email prefilled
        setMode('signin');
        setSuccessMessage(msg);
        setPassword('');
        setConfirmPassword('');
        setLocalError(null);
      }
    } catch (err: any) {
      setLoading(false);
      let errorMessage = "Server Offline";
      if (err?.response?.status === 409) {
        errorMessage = "This email address is already registered. Please sign in instead.";
      } else if (err?.response?.status === 400) {
        errorMessage = err.response?.data?.message || err.response?.data?.detail || "Invalid registration details. Please check the fields.";
      } else if (err?.response?.status === 500) {
        errorMessage = `Server database error: ${err.response?.data?.message || err.response?.data?.detail || 'Failed to save user'}`;
      } else if (err?.message) {
        errorMessage = apiError(err);
      }

      console.error('[AuthModal] Registration exception caught:', err?.response?.status, errorMessage);
      setLocalError(errorMessage);
      showToast('Registration Failed', errorMessage, 'error');
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
          className="relative w-full max-w-md bg-[#0F1A24] border border-stone-700/80 rounded-2xl shadow-2xl overflow-hidden text-stone-100 font-sans"
        >
          {/* Header Banner */}
          <div className="relative p-6 pb-4 border-b border-stone-800 bg-gradient-to-r from-[#0B131F] to-[#134E4A]/30">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C5A880] tracking-widest uppercase font-mono">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>CeylonMate Privé</span>
              </div>

              {/* Real-Time Server Connectivity Badge */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-stone-700">
                <span className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-ping'}`} />
                <span className={serverOnline ? 'text-emerald-300' : 'text-rose-300'}>
                  {serverOnline === null ? 'Probing API...' : serverOnline ? ' Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            <h3 className="text-2xl font-serif-luxury text-stone-100 font-semibold mt-1">
              {titleHint || (mode === 'register' ? 'Create Your Account' : 'Sign In to Proceed')}
            </h3>
          </div>

          {/* Body Form */}
          <div className="p-6 space-y-4">
            {/* Success Banner */}
            {successMessage && mode === 'signin' && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-start gap-2.5 leading-relaxed font-mono shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 font-sans text-xs">
                  {successMessage}
                </div>
              </motion.div>
            )}

            {/* Error Banner */}
            {(localError || authError || serverOnline === false) && (
              <div className="p-3.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-start gap-2.5 leading-relaxed font-mono">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  {localError || authError || 'Server Offline'}
                </div>
              </div>
            )}

            {mode === 'signin' ? (
              /* VIEW 1: SIGN IN */
              <form onSubmit={handleSignIn} className="space-y-4" noValidate>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="traveler@example.com"
                      className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl pl-9 pr-10 py-2 text-xs text-stone-100 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-[#C5A880] transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <motion.button
                  {...buttonPressProps}
                  type="submit"
                  disabled={loading || serverOnline === false}
                  className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${serverOnline === false
                      ? 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] shadow-lg'
                    }`}
                >
                  {loading ? (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent" />
                  ) : serverOnline === false ? (
                    <span>Backend Offline</span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>

                {/* Footer Switcher */}
                <div className="pt-3 border-t border-stone-800 text-center">
                  <span className="text-xs text-stone-400">Don't have an account? </span>
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setLocalError(null); setSuccessMessage(null); }}
                    className="text-xs font-semibold text-[#C5A880] hover:underline cursor-pointer"
                  >
                    Create a new account
                  </button>
                </div>
              </form>
            ) : (
              /* VIEW 2: REGISTRATION */
              <form onSubmit={handleRegister} className="space-y-3.5" noValidate>
                {/* Role / Account Type Dropdown */}
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">
                    Select Account Type
                  </label>
                  <div className="relative">
                    <Compass className="absolute left-3 top-2.5 w-4 h-4 text-[#C5A880] pointer-events-none" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'TRAVELER' | 'LOCAL_GUIDE')}
                      className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl pl-9 pr-9 py-2 text-xs text-stone-100 focus:outline-none transition-colors appearance-none cursor-pointer font-medium"
                    >
                      <option value="TRAVELER" className="bg-[#0F1A24] text-stone-100">
                        Traveler
                      </option>
                      <option value="LOCAL_GUIDE" className="bg-[#0F1A24] text-[#C5A880] font-semibold">
                        Local Guide
                      </option>
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-stone-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value.replace(/[0-9]/g, ''))}
                      placeholder={role === 'LOCAL_GUIDE' ? 'Kavinda Fernando' : 'Lady Evelyn Sinclair'}
                      className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="evelyn@luxuryjourneys.com"
                      className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <motion.div
                  animate={shakePassword ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-2.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create strong password"
                          className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl pl-9 pr-8 py-2 text-xs text-stone-100 focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2.5 text-stone-400 hover:text-[#C5A880] transition-colors"
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-300 mb-1">Re-enter Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
                          className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl pl-9 pr-8 py-2 text-xs text-stone-100 focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2.5 top-2.5 text-stone-400 hover:text-[#C5A880] transition-colors"
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Animated Password Validation Checklist & Strength Meter */}
                  {(password.length > 0 || confirmPassword.length > 0) && (
                    <PasswordValidationRules password={password} confirmPassword={confirmPassword} />
                  )}
                </motion.div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Phone Number (Optional)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[a-zA-Z]/g, ''))}
                      placeholder="+94 77 123 4567"
                      className="w-full bg-slate-900 border border-stone-700 focus:border-[#C5A880] rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <motion.button
                  {...buttonPressProps}
                  type="submit"
                  disabled={loading || serverOnline === false}
                  className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${serverOnline === false
                      ? 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] shadow-lg cursor-pointer'
                    }`}
                >
                  {loading ? (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent" />
                  ) : serverOnline === false ? (
                    <span>Backend Offline</span>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>

                {/* Footer Switcher */}
                <div className="pt-3 border-t border-stone-800 text-center">
                  <span className="text-xs text-stone-400">Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setLocalError(null); setSuccessMessage(null); }}
                    className="text-xs font-semibold text-[#C5A880] hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
