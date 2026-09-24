import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { API_BASE_URL, checkServerHealth } from '../services/api';
import { Logo } from '../components/common/Logo';
import { AlertTriangle, ShieldCheck, ArrowRight, Lock, Mail } from 'lucide-react';

export function LoginPage() {
  const { user, status, error, login, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    clearError();
    probeServer();
  }, []);

  const probeServer = async () => {
    const isOk = await checkServerHealth();
    setServerOnline(isOk);
  };

  if (user && status === 'signedIn') {
    return <Navigate to="/staff" replace />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidation(null);
    clearError();

    if (!email.trim() || !password) {
      setValidation('Please enter your email and password.');
      return;
    }

    if (serverOnline === false) {
      setValidation(`🚨 Backend Server Offline: Unable to connect to CeylonMate API at ${API_BASE_URL}. Please start the ASP.NET Core backend.`);
      return;
    }

    const ok = await login(email, password);
    if (ok) {
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from?.startsWith('/') ? from : '/staff', { replace: true });
    }
  }

  const fillQuickDemo = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Password123!');
  };

  return (
    <main className="min-h-screen bg-[#0B131F] text-stone-100 flex items-center justify-center p-4 font-sans">
      <section className="w-full max-w-md bg-[#0F1A24] border border-stone-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4">
          <Logo />
          {/* Server Connectivity Status Indicator */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-900 border border-stone-700">
            <span className={`w-2 h-2 rounded-full ${serverOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-ping'}`} />
            <span className={serverOnline ? 'text-emerald-300' : 'text-rose-300'}>
              {serverOnline === null ? 'Probing API...' : serverOnline ? 'API Connected (5000)' : 'API Offline'}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-serif-luxury font-bold text-stone-100">Staff & Operations Portal</h1>
          <p className="text-xs text-stone-400">
            Sign in using your authorized CeylonMate staff credentials to access capacity desks and approval queues.
          </p>
        </div>

        {/* Server Disconnected or Auth Error Alert */}
        {(validation || error || serverOnline === false) && (
          <div className="p-3.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs flex items-start gap-2.5 leading-relaxed font-mono">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              {validation || error || `🚨 Backend Server Offline: Unable to connect to CeylonMate API at ${API_BASE_URL}. Please ensure the ASP.NET Core backend is running with 'dotnet run'.`}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@ceylonmate.com"
                className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0B131F] border border-stone-700 focus:border-[#C5A880] rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={status === 'checking' || serverOnline === false}
            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              serverOnline === false
                ? 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#C5A880] to-[#D4AF37] hover:from-[#b89a70] hover:to-[#c4a027] text-[#0B131F] shadow-lg'
            }`}
          >
            {status === 'checking' ? (
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent" />
            ) : serverOnline === false ? (
              <span>Backend Offline — Login Blocked</span>
            ) : (
              <>
                <span>Sign In via Backend API</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Persona Pre-fill Section */}
        <div className="pt-4 border-t border-stone-800/80 space-y-2">
          <span className="text-[10px] font-mono text-[#C5A880] uppercase tracking-wider block">
            Pre-fill Persona Credentials:
          </span>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => fillQuickDemo('agent@ceylonmate.com')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-500/30 text-amber-200 hover:bg-amber-950 text-[11px]"
            >
              Travel Agent
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('capacity@ceylonmate.com')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-teal-500/30 text-teal-200 hover:bg-teal-950 text-[11px]"
            >
              Capacity Officer
            </button>
            <button
              type="button"
              onClick={() => fillQuickDemo('admin@ceylonmate.com')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-rose-500/30 text-rose-200 hover:bg-rose-950 text-[11px]"
            >
              System Admin
            </button>
          </div>
        </div>

        <div className="pt-2 text-center">
          <Link to="/" className="text-xs text-stone-400 hover:text-[#C5A880] transition-colors">
            ← Return to Public CeylonMate Site
          </Link>
        </div>
      </section>
    </main>
  );
}
