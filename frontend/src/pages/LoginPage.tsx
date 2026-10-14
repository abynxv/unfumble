import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, sendOTP, verifyOTP } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
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
    if (code.length !== 6) {
      setError('Enter the complete 6-digit code.');
      return;
    }
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background font-sans">
      {/* ── Left: Branding ───────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between bg-muted p-10 relative overflow-hidden border-r border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background/5 to-background pointer-events-none"></div>
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tighter">
            <span className="flex items-center justify-center size-8 bg-primary text-primary-foreground rounded-md text-sm">U</span>
            unfumble
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-6">
            Professional headshots, <br />without the studio.
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Upload a clear face photo and get AI-generated, studio-quality portraits in under 60 seconds.
          </p>
          <ul className="space-y-4 text-sm font-medium text-foreground">
            {['Studio-quality output in seconds', '4 professional style options', 'Works with selfies and casual photos', 'Private and secure processing'].map((feat, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-primary">✓</span>
                {feat}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 text-sm text-muted-foreground font-medium">
          &copy; {new Date().getFullYear()} Unfumble
        </div>
      </div>

      {/* ── Right: Form ──────────────────────────────────────── */}
      <div className="flex items-center justify-center p-8 lg:p-12">
        <div className="mx-auto w-full max-w-[400px] flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="lg:hidden flex mb-4">
             <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tighter">
                <span className="flex items-center justify-center size-8 bg-primary text-primary-foreground rounded-md text-sm">U</span>
                unfumble
             </Link>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold tracking-tight">
              {step === 'email' ? 'Welcome back' : 'Check your email'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {step === 'email' ? (
                'Enter your email to sign in or create an account'
              ) : (
                <>We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span></>
              )}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'email' ? (
            <form onSubmit={handleSendOTP} className="flex flex-col gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  disabled={submitting}
                  className="h-11"
                />
              </div>
              <Button type="submit" size="lg" disabled={submitting || !email} className="w-full">
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Continue with Email
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="flex flex-col gap-6">
              <div className="grid gap-4">
                <Label>Verification code</Label>
                <div className="flex justify-between gap-2">
                  {otp.map((digit, i) => (
                    <Input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKey(i, e)}
                      disabled={submitting}
                      autoComplete="one-time-code"
                      className="size-12 text-center text-xl font-semibold sm:size-14"
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button type="submit" size="lg" disabled={submitting || otp.join('').length !== 6} className="w-full">
                  {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Verify Code
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStep('email');
                    setOtp(['', '', '', '', '', '']);
                    setError('');
                  }}
                  disabled={submitting}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="mr-2 size-4" /> Use a different email
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
