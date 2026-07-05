import React from 'react';
import {
  Eye,
  EyeOff,
  LogIn,
  Mail,
  Lock,
  Stethoscope,
} from 'lucide-react';

export type DemoRoleKey = 'clinic_owner' | 'associate_dentist' | 'staff_member';

type AuthAccessPortalProps = {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  error: string;
  infoMessage?: string;
  isSigningIn: boolean;
  isSupabaseConfigured: boolean;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  selectedRole?: DemoRoleKey; // kept for TS signature compatibility
  onSelectRole?: (role: DemoRoleKey) => void; // kept for TS signature compatibility
};

export function AuthAccessPortal({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  error,
  infoMessage,
  isSigningIn,
  isSupabaseConfigured,
  showPassword,
  onToggleShowPassword,
}: AuthAccessPortalProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 font-sans sm:px-6 lg:px-8">
      <div className="w-full max-w-[460px] space-y-8">
        
        {/* Header/Branding Area */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 shadow-sm border border-cyan-100 mb-3">
            <Stethoscope size={24} />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">P&J Tanarte Dental Clinic</h2>
          <p className="text-[10px] font-medium tracking-[0.1em] text-slate-400 uppercase mt-0.5">Clinical Digital Ledger</p>
        </div>

        {/* Clean, Premium White Login Card */}
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] sm:p-10">
          
          <div className="mb-8">
            <h1 className="text-xl font-bold text-slate-900">P&J Tanarte System</h1>
            <p className="mt-1.5 text-xs font-medium text-slate-500">Sign in to access your clinic workspace.</p>
          </div>

          {/* Clean alerts */}
          {error ? (
            <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3 text-xs font-semibold text-rose-600">
              {error}
            </div>
          ) : null}

          {infoMessage ? (
            <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-xs font-semibold text-emerald-600">
              {infoMessage}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-6">
            
            {/* Email Field */}
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Email Address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="name@clinic.com"
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400/80 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Password</label>
                <a href="#forgot" onClick={(e) => { e.preventDefault(); alert("Please contact the administrator to reset your password."); }} className="text-[10px] font-bold text-slate-400 hover:text-cyan-600 transition-colors">Forgot Password?</a>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder="Enter your secure password"
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-12 py-3.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400/80 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                />
                <button
                  type="button"
                  onClick={onToggleShowPassword}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isSupabaseConfigured || isSigningIn}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-slate-800 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={16} />
              <span>{isSigningIn ? 'Signing In...' : 'Sign In'}</span>
            </button>

            {!isSupabaseConfigured ? (
              <p className="text-center text-xs text-rose-500 font-semibold">Supabase auth is not configured, so sign-in is currently unavailable.</p>
            ) : null}
          </form>

          {/* Footer help links */}
          <div className="mt-8 flex justify-center border-t border-slate-100 pt-6">
            <span className="text-[11px] font-bold text-slate-400 hover:text-cyan-600 transition-colors cursor-pointer" onClick={() => alert("For clinic support, email support@pj-dental.com or contact administration.")}>
              Need help?
            </span>
          </div>

        </div>

      </div>
    </div>
  );
}

export default AuthAccessPortal;
