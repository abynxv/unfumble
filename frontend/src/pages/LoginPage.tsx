/**
 * Login Page — Split-screen, B&W aesthetic.
 * Left:  Black panel with branding + social proof
 * Right: Clean form
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { user, loading, sendOTP, verifyOTP } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]             = useState<'email' | 'otp'>('email');
  const [email, setEmail]           = useState('');
  const [otp, setOtp]               = useState(['', '', '', '', '', '']);
  const [error, setError]           = useState('');
  const [submitting, setSubmitting] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  const handleSendOTP = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await sendOTP(email);
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter the complete 6-digit code.'); return; }
    setSubmitting(true);
    try {
      await verifyOTP(email, code);
    } catch (err: any) {
      setError(err.message || 'Invalid code. Try again.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <div className="login-split">

      {/* ── Left: Branding ───────────────────────────────────── */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-left-top">
            <Link to="/" className="login-logo-link">
              <span className="login-logo-box">U</span>
              unfumble
            </Link>
          </div>

          <div className="login-left-center">
            <h1 className="login-left-title">
              Professional headshots,<br />
              without the studio.
            </h1>
            <p className="login-left-desc">
              Upload a clear face photo and get AI-generated,
              studio-quality portraits in under 60 seconds.
            </p>

            <div className="login-left-features">
              <div className="login-feat">
                <span className="login-feat-check">✓</span>
                Studio-quality output in seconds
              </div>
              <div className="login-feat">
                <span className="login-feat-check">✓</span>
                4 professional style options
              </div>
              <div className="login-feat">
                <span className="login-feat-check">✓</span>
                Works with selfies and casual photos
              </div>
              <div className="login-feat">
                <span className="login-feat-check">✓</span>
                Private and secure processing
              </div>
            </div>
          </div>

          <div className="login-left-bottom">
            <p className="login-left-copy">© {new Date().getFullYear()} Unfumble</p>
          </div>
        </div>
      </div>

      {/* ── Right: Form ──────────────────────────────────────── */}
      <div className="login-right">
        <div className="login-form-wrap">

          <div className="login-form-head">
            <h2>{step === 'email' ? 'Sign in' : 'Check your email'}</h2>
            <p>
              {step === 'email'
                ? 'Enter your email to receive a one-time code'
                : <>We sent a 6-digit code to <strong>{email}</strong></>
              }
            </p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zm.75-3.75a.75.75 0 00-1.5 0v-3a.75.75 0 001.5 0v3z" />
              </svg>
              {error}
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleSendOTP} className="login-form">
              <div className="form-group">
                <label htmlFor="email-input" className="form-label">Email</label>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="form-input"
                  required
                  autoFocus
                  disabled={submitting}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={submitting || !email}>
                {submitting
                  ? <><div className="spinner spinner-sm spinner-white" />Sending…</>
                  : 'Continue'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="login-form">
              <div className="form-group">
                <label className="form-label">Verification code</label>
                <div className="otp-row">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKey(i, e)}
                      className="otp-digit"
                      disabled={submitting}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={submitting || otp.join('').length !== 6}>
                {submitting
                  ? <><div className="spinner spinner-sm spinner-white" />Verifying…</>
                  : 'Verify'}
              </button>
              <button
                type="button"
                className="btn-link"
                onClick={() => { setStep('email'); setOtp(['','','','','','']); setError(''); }}
                disabled={submitting}
              >
                ← Use a different email
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
