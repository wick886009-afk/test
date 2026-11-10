'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User
} from 'lucide-react';

const GlassSculptureCanvas = dynamic(
  () => import('@/components/three/GlassSculptureCanvas'),
  { ssr: false }
);

export default function LoginPage() {
  const [step, setStep] = useState<'login' | 'change-password'>('login');
  const [username, setUsername] = useState('anassaifee');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // First-login password rotation fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Check if already logged in with temporary password requiring rotation
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setCsrfToken(data.csrfToken || '');
            if (data.user.mustChangePassword) {
              setStep('change-password');
            } else {
              window.location.href = '/';
            }
          }
        }
      } catch {}
    };
    checkSession();
  }, []);

  // Countdown timer for rate-limit lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0 || isLoading) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          rememberMe
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && data.retryAfterSeconds) {
          setLockoutSeconds(Number(data.retryAfterSeconds));
        }
        setErrorMsg(data.error || 'Authentication failed. Please verify your credentials.');
        setIsLoading(false);
        return;
      }

      setCsrfToken(data.csrfToken || '');
      if (data.user?.mustChangePassword) {
        setCurrentPassword(password);
        setPassword('');
        setSuccessMsg(
          'Temporary password verified. Security policy requires setting a new personal password on first sign-in.'
        );
        setStep('change-password');
        setIsLoading(false);
        return;
      }

      setSuccessMsg('Authenticated as Super Administrator. Launching Gleva Refund Desk V3…');
      setTimeout(() => {
        window.location.href = '/';
      }, 450);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error while connecting to authentication server.');
      setIsLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not update password.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg('Password updated and encrypted session activated! Redirecting to dashboard…');
      setTimeout(() => {
        window.location.href = '/';
      }, 600);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error while updating password.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#171717] via-[#261019] to-[#4A0D21] text-[#FFF8F0] flex flex-col justify-between p-4 sm:p-8 select-none">
      {/* Decorative 3D Glass Sculpture & Particle Background */}
      <GlassSculptureCanvas />

      {/* Top Brand Header */}
      <header className="relative z-10 flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#881337] to-[#EF4444] flex items-center justify-center font-bold text-lg text-white shadow-burgundy-glow border border-[#FFE4E6]/20">
            G
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-[#FFF8F0] flex items-center gap-2">
              <span>Gleva Cosmetics</span>
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#881337]/80 border border-[#D4A373]/40 text-[#FFE4E6] font-semibold">
                Desk V3
              </span>
            </div>
            <p className="text-xs text-[#FFE4E6]/70">
              Financial Operations & Live Refund Intelligence
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs text-[#FFE4E6]/80">
          <ShieldCheck className="w-4 h-4 text-[#D4A373]" />
          <span>Argon2id/Scrypt + HttpOnly Session Guard</span>
        </div>
      </header>

      {/* Main Content Split: Editorial Left + Glassmorphic Login Card Right */}
      <main className="relative z-10 max-w-6xl w-full mx-auto my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-5 text-center lg:text-left pointer-events-none">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#881337]/50 border border-[#D4A373]/30 text-xs font-medium text-[#FFE4E6]">
            <Sparkles className="w-3.5 h-3.5 text-[#D4A373]" />
            <span>Enterprise Refund & Proof Vault • 2026–2027</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-[#FFF8F0]">
            Precision Refund Operations in{' '}
            <span className="bg-gradient-to-r from-[#FFE4E6] via-[#D4A373] to-[#EF4444] bg-clip-text text-transparent">
              Real-Time 3D.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[#FFF8F0]/75 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Protected two-way Google Sheets synchronization, automated SLA priority tracking,
            and private Google Drive payment proof verification for Gleva Cosmetics.
          </p>

          <div className="hidden sm:grid grid-cols-3 gap-3 pt-2 max-w-lg mx-auto lg:mx-0">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-xs text-[#D4A373] font-semibold">Zero Bundle Leaks</div>
              <div className="text-sm font-bold text-white mt-0.5">100% Server-Gated</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-xs text-[#FFE4E6] font-semibold">Session Security</div>
              <div className="text-sm font-bold text-white mt-0.5">Signed HttpOnly</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-xs text-emerald-300 font-semibold">Sheet & Drive Sync</div>
              <div className="text-sm font-bold text-white mt-0.5">Live Two-Way API</div>
            </div>
          </div>
        </div>

        {/* Glassmorphic Login / Password Rotation Card */}
        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-3xl bg-[#171717]/80 backdrop-blur-2xl border border-[#FFE4E6]/15 shadow-glass-dark p-6 sm:p-8 space-y-6 select-text">
            {step === 'login' ? (
              <>
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4A373]">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Super Administrator Portal</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#FFF8F0]">
                    Sign in to Gleva Desk
                  </h2>
                  <p className="text-xs text-[#FFF8F0]/65">
                    Enter your administrator credentials to unlock refund records and analytics.
                  </p>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-xs text-[#FFE4E6] flex items-start gap-2.5 animate-pulse"
                  >
                    <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-semibold text-white">{errorMsg}</div>
                      {lockoutSeconds > 0 && (
                        <div className="text-[11px] text-[#FFE4E6]/80">
                          Retry available in {Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="font-medium">{successMsg}</div>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="login-username"
                      className="block text-xs font-semibold text-[#FFE4E6]/90 mb-1.5"
                    >
                      Administrator Username
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#D4A373] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="login-username"
                        type="text"
                        required
                        autoComplete="username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="anassaifee"
                        className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-white/5 border border-white/15 text-[#FFF8F0] placeholder-white/30 focus:outline-none focus:border-[#D4A373] focus:ring-2 focus:ring-[#881337]/60 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-[#FFE4E6]/90 mb-1.5"
                    >
                      Administrator Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#D4A373] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter administrator password"
                        className="w-full pl-10 pr-11 py-3 rounded-xl text-sm bg-white/5 border border-white/15 text-[#FFF8F0] placeholder-white/30 focus:outline-none focus:border-[#D4A373] focus:ring-2 focus:ring-[#881337]/60 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-white/60 hover:text-white transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-[#FFF8F0]/80 hover:text-white">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="rounded border-white/20 bg-white/10 text-[#881337] focus:ring-[#881337]"
                      />
                      <span>Remember me for 14 days</span>
                    </label>
                    <span className="text-[11px] text-[#D4A373]">
                      Role: Super Admin
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || lockoutSeconds > 0}
                    className="w-full py-3.5 px-5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#881337] via-[#9F1239] to-[#EF4444] hover:brightness-110 active:scale-[0.99] disabled:opacity-50 shadow-burgundy-glow flex items-center justify-center gap-2 transition-all"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Credentials…</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Refund Desk</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4A373]">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Mandatory First-Login Security Policy</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#FFF8F0]">
                    Update Temporary Password
                  </h2>
                  <p className="text-xs text-[#FFF8F0]/70">
                    For your protection, please replace the initial temporary password with a strong personal password before accessing customer refund records.
                  </p>
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/40 text-xs text-[#FFE4E6] flex items-start gap-2.5"
                  >
                    <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                    <div className="font-semibold text-white">{errorMsg}</div>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="font-medium">{successMsg}</div>
                  </div>
                )}

                <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#FFE4E6]/90 mb-1.5">
                      Current Temporary Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Enter current temporary password"
                      className="w-full px-4 py-3 rounded-xl text-sm bg-white/5 border border-white/15 text-[#FFF8F0] placeholder-white/30 focus:outline-none focus:border-[#D4A373]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#FFE4E6]/90 mb-1.5">
                      New Strong Password (8+ chars, upper, lower, number, symbol)
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Create strong new password"
                        className="w-full pl-4 pr-11 py-3 rounded-xl text-sm bg-white/5 border border-white/15 text-[#FFF8F0] placeholder-white/30 focus:outline-none focus:border-[#D4A373]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/60 hover:text-white"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#FFE4E6]/90 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-4 py-3 rounded-xl text-sm bg-white/5 border border-white/15 text-[#FFF8F0] placeholder-white/30 focus:outline-none focus:border-[#D4A373]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#881337] to-[#EF4444] hover:brightness-110 disabled:opacity-50 shadow-burgundy-glow flex items-center justify-center gap-2 transition"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Encrypting & Saving Password…</span>
                      </>
                    ) : (
                      <>
                        <span>Save New Password & Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#FFF8F0]/55">
              <span>Protected by CSRF & Rate Limiting</span>
              <span>Gleva Cosmetics © 2026</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 max-w-6xl w-full mx-auto text-center sm:text-left text-[11px] text-[#FFF8F0]/45 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Authorized Personnel Only • All login attempts are logged in IST</span>
        <span>Vercel Hobby Compatible • Zero Client-Bundled Secrets</span>
      </footer>
    </div>
  );
}
