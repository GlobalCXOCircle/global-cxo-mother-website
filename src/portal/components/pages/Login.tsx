import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/portal/components/ui/button';
import { Input } from '@/portal/components/ui/input';
import { Label } from '@/portal/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/portal/hooks/useAuth';
import { verifyCodeApi } from '@/portal/api/auth';

type Screen = 'email' | 'code' | 'application-pending' | 'pre-existing-profile';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [screen, setScreen] = useState<Screen>('email');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [emailError, setEmailError] = useState('');
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

  const resolveDestination = (tier: string): string => {
    if (redirect) return redirect;
    return tier === 'admin' || tier === 'dev' ? '/admin' : '/dashboard';
  };

  // Focus the code field the moment the code screen mounts.
  useEffect(() => {
    if (screen === 'code') {
      codeInputRef.current?.focus();
    }
  }, [screen]);

  // Step 1: Submit email → backend sends 8-digit code
  const handleEmailSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setEmailError('');
    if (!email) {
      setEmailError('Please enter your email address.');
      return;
    }
    setIsLoading(true);
    try {
      const user = await login(email, '');
      if (!user) {
        setEmailError('No account exists with that email.');
        return;
      }
      // Only reached on a real, immediate login (e.g. mock/demo mode).
      navigate(redirect ?? '/dashboard');
    } catch (err) {
      if (err instanceof Error && err.message === '2FA_REQUIRED') {
        setScreen('code');
        setCode('');
        setCodeError('');
        // Focus happens in the effect above, once the code screen mounts.
      } else if (err instanceof Error && err.message === 'APPLICATION_PENDING') {
        setScreen('application-pending');
      } else if (err instanceof Error && err.message === 'PRE_EXISTING_PROFILE') {
        setScreen('pre-existing-profile');
      } else if (err instanceof Error) {
        setEmailError(err.message || 'No account exists with that email.');
      } else {
        setEmailError('Unable to connect to the server. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Single field: strip anything non-digit, cap at 6, auto-submit once full.
  const handleCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setCodeError('');
    if (digits.length === 6) {
      void handleCodeSubmit(digits);
    }
  };

  // Step 2: Submit code → verify → login
  const handleCodeSubmit = async (value?: string): Promise<void> => {
    const digits = value ?? code;
    if (digits.length !== 6) {
      setCodeError('Please enter all 6 digits.');
      return;
    }
    setIsLoading(true);
    setCodeError('');
    try {
      await verifyCodeApi(email, digits);
      // Full page reload so AuthContext bootstraps with the new token.
      // Always land on homepage — the user navigates from there.
      window.location.href = '/';
      return;
    } catch {
      setCodeError('Invalid or expired code. Please try again.');
      setCode('');
      codeInputRef.current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    setIsLoading(true);
    try {
      await login(email, '');
    } catch (err) {
      if (err instanceof Error && err.message === '2FA_REQUIRED') {
        toast.success('New code sent to your email.');
        setCode('');
        setCodeError('');
        codeInputRef.current?.focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-navy-25 to-navy-50">
      {/* Orbital background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-[700px] h-[700px] md:w-[900px] md:h-[900px] opacity-40">
          <div
            className="absolute inset-0 border-2 border-navy-300/30 rounded-full animate-spin"
            style={{ animationDuration: '50s', animationTimingFunction: 'linear' }}
          />
          <div
            className="absolute inset-20 border-2 border-navy-400/40 rounded-full animate-spin"
            style={{ animationDuration: '35s', animationTimingFunction: 'linear', animationDirection: 'reverse' }}
          />
          <div
            className="absolute inset-40 border-2 border-navy-500/50 rounded-full animate-spin"
            style={{ animationDuration: '25s', animationTimingFunction: 'linear' }}
          />
          <div
            className="absolute inset-40 flex items-center justify-center animate-spin"
            style={{ animationDuration: '20s', animationTimingFunction: 'linear' }}
          >
            <div
              className="absolute w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
              style={{ left: '100%', top: '50%', transform: 'translate(-50%, -50%)', boxShadow: '0 0 12px rgba(59,130,246,0.5)' }}
            />
          </div>
          <div
            className="absolute inset-20 flex items-center justify-center animate-spin"
            style={{ animationDuration: '30s', animationTimingFunction: 'linear', animationDirection: 'reverse' }}
          >
            <div
              className="absolute w-4 h-4 bg-gradient-to-r from-navy-400 to-navy-600 rounded-full"
              style={{ left: '0%', top: '50%', transform: 'translate(-50%, -50%)', boxShadow: '0 0 15px rgba(31,47,98,0.4)' }}
            />
          </div>
        </div>
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-6 left-6 z-30 flex items-center gap-1.5 text-sm text-navy-400 hover:text-navy-700 transition-colors"
      >
        <span className="text-lg">&larr;</span> Back
      </button>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 mb-8 sm:mb-10 group">
          <img src="/cxo-circle-logo.png" alt="Global CXO Circle" className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain transition-transform group-hover:scale-105 shrink-0" />
          <span className="text-2xl sm:text-4xl md:text-5xl font-bold text-navy-900 tracking-tight whitespace-nowrap">Global CXO Circle</span>
        </Link>

        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-navy-200/60 bg-white/80 backdrop-blur-xl shadow-xl shadow-navy-200/20 p-8">

            {/* ── Screen: Email Entry ── */}
            {screen === 'email' && (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-navy-900">Welcome back</h1>
                  <p className="text-sm text-navy-500 mt-1">Enter your email to receive a secure login code</p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-navy-700 font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                      className={`h-11 rounded-xl border-navy-200 bg-white text-navy-900 placeholder:text-navy-400 focus-visible:ring-blue-500 focus-visible:border-blue-400 ${emailError ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                      autoComplete="email"
                    />
                    {emailError && (
                      <p className="text-red-600 text-sm font-medium">{emailError}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all"
                    size="lg"
                  >
                    {isLoading ? 'Sending...' : 'Send Login Code'}
                  </Button>
                </form>

                <p className="mt-5 text-center text-sm text-navy-500">
                  Don&apos;t have an account?{' '}
                  <Link to="/membership" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    Sign Up
                  </Link>
                </p>
              </>
            )}

            {/* ── Screen: 6-Digit Code Entry ── */}
            {screen === 'code' && (
              <>
                <div className="text-center mb-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                    <span className="text-2xl">🔐</span>
                  </div>
                  <h1 className="text-2xl font-bold text-navy-900">Enter your code</h1>
                  <p className="text-sm text-navy-500 mt-1">
                    We sent a 6-digit code to <strong className="text-navy-700">{email}</strong>
                  </p>
                </div>

                <div className="mb-4">
                  <Input
                    ref={codeInputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className={`h-12 rounded-xl border-navy-200 bg-white text-center text-lg font-bold tracking-[0.3em] text-navy-900 focus-visible:ring-blue-500 focus-visible:border-blue-400 ${
                      codeError ? 'border-red-400 focus-visible:ring-red-400' : ''
                    }`}
                  />
                </div>

                {codeError && (
                  <p className="text-red-600 text-sm text-center font-medium mb-3">{codeError}</p>
                )}

                <Button
                  onClick={() => handleCodeSubmit()}
                  disabled={isLoading || code.length !== 6}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all"
                  size="lg"
                >
                  {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                </Button>

                <div className="flex items-center justify-between mt-4">
                  <button
                    type="button"
                    onClick={() => { setScreen('email'); setEmailError(''); }}
                    className="text-sm text-navy-500 hover:text-navy-700"
                  >
                    &larr; Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isLoading}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Resend code
                  </button>
                </div>

                <p className="text-xs text-navy-400 text-center mt-4">Code expires in 15 minutes.</p>
              </>
            )}

            {/* ── Screen: Application Pending ── */}
            {screen === 'application-pending' && (
              <>
                <div className="text-center py-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                    <span className="text-3xl">⏳</span>
                  </div>
                  <h2 className="text-lg font-semibold text-navy-900 mb-2">Application Under Review</h2>
                  <p className="text-sm text-navy-500 mb-4">
                    You have already submitted an application to join Global CXO Circle. Our team is currently reviewing it.
                  </p>
                  <p className="text-sm text-navy-500">
                    We will notify you at <strong className="text-navy-700">{email}</strong> once a decision has been made.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setScreen('email'); setEmailError(''); }}
                    className="mt-6 text-sm text-blue-600 hover:text-blue-700 font-medium underline"
                  >
                    Back to login
                  </button>
                </div>
              </>
            )}

            {screen === 'pre-existing-profile' && (
              <>
                <div className="text-center py-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                    <span className="text-3xl">&#128100;</span>
                  </div>
                  <h2 className="text-lg font-semibold text-navy-900 mb-2">We Already Have Your Profile</h2>
                  <p className="text-sm text-navy-500 mb-4">
                    Since you attended one of our past events, we built a profile for you.
                    You&apos;ll need to complete a quick onboarding to confirm your details
                    and activate your account.
                  </p>
                  <Button
                    className="w-full bg-navy-600 hover:bg-navy-700 text-white"
                    disabled={isLoading}
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        const { apiFetch } = await import('@/portal/api/client');
                        await apiFetch('/auth/resend-onboarding', {
                          method: 'POST',
                          body: { email },
                        });
                        toast.success('Onboarding link sent! Check your inbox.');
                      } catch {
                        toast.error('Could not send onboarding link. Please contact support.');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  >
                    {isLoading ? 'Sending...' : 'Resend Onboarding Email'}
                  </Button>
                  <p className="text-xs text-navy-400 mt-3">
                    The link will be sent to <strong className="text-navy-600">{email}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => { setScreen('email'); setEmailError(''); }}
                    className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium underline"
                  >
                    Back to login
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
