import { useState, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Camera, CheckCircle2, Cpu, Download, Shield, Sparkles, Upload, Zap } from 'lucide-react';

/* ── Features Section ──────────────────────────────────────────── */
const Features = memo(() => {
  const features = [
    {
      icon: <Sparkles className="size-5" />,
      title: 'AI Generation',
      desc: 'Advanced models that understand facial structure, lighting, and professional composition.',
    },
    {
      icon: <Camera className="size-5" />,
      title: 'Face Clarity',
      desc: 'Intelligent face detection ensures sharp, natural results from any clear photo you upload.',
    },
    {
      icon: <Zap className="size-5" />,
      title: 'Instant Results',
      desc: 'From upload to download in under 60 seconds. No appointments, no waiting rooms.',
    },
    {
      icon: <Shield className="size-5" />,
      title: 'Enterprise Security',
      desc: 'Your photos are processed securely and never shared. Privacy by design, always.',
    },
    {
      icon: <Download className="size-5" />,
      title: 'HD Downloads',
      desc: 'Download production-ready portraits for LinkedIn, resumes, websites, and ID badges.',
    },
    {
      icon: <Cpu className="size-5" />,
      title: 'Style Library',
      desc: 'Corporate, Startup, Developer, Formal — each precisely tuned for its professional context.',
    },
  ];

  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Features</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built for professionals who value their time
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Skip the photographer. Skip the studio. Get the same result in a fraction of the time.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group relative border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <CardHeader>
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-[15px] leading-relaxed">
                  {feature.desc}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
});

/* ── How It Works Section ──────────────────────────────────────── */
const HowItWorks = memo(() => {
  const steps = [
    {
      icon: <Upload className="size-5" />,
      title: 'Upload your photo',
      desc: 'Take a selfie or use any clear face photo. Natural lighting works best.',
    },
    {
      icon: <Sparkles className="size-5" />,
      title: 'AI processes it',
      desc: 'Our model analyzes your features and generates a studio-quality portrait in ~60 seconds.',
    },
    {
      icon: <Download className="size-5" />,
      title: 'Download & use',
      desc: 'Get your polished headshot ready for LinkedIn, resumes, team pages, and more.',
    },
  ];

  return (
    <section className="relative py-24 sm:py-32 bg-muted/30">
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: 'radial-gradient(circle, hsl(var(--foreground) / 0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative mx-auto max-w-5xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">How it works</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Three steps. Sixty seconds.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="relative flex flex-col items-center text-center gap-4">
              {/* Connector line (between steps on desktop) */}
              {i < steps.length - 1 && (
                <div className="absolute top-6 left-[calc(50%+32px)] hidden h-px w-[calc(100%-64px)] bg-border md:block" />
              )}
              <div className="relative z-10 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-md shadow-primary/20">
                {i + 1}
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {step.icon}
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

/* ── Stats Bar ─────────────────────────────────────────────────── */
const StatsBar = memo(() => {
  const stats = [
    { value: '60s', label: 'Average generation time' },
    { value: '4', label: 'Professional styles' },
    { value: 'HD', label: 'Download quality' },
    { value: '100%', label: 'Private & secure' },
  ];

  return (
    <section className="border-y border-border bg-muted/20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center gap-1">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">{stat.value}</span>
              <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

/* ── Main Landing Page ─────────────────────────────────────────── */
export default function LandingPage() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">

      {/* ── Navbar ──────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex items-center justify-center size-7 bg-primary text-primary-foreground rounded-md text-xs font-bold">U</span>
            <span className="text-lg font-bold tracking-tighter">unfumble</span>
          </Link>
          <nav className="flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              How it works
            </a>
            <Button asChild variant="default" size="sm" className="rounded-full px-5">
              <Link to={user ? "/dashboard" : "/login"}>
                {user ? 'Dashboard' : 'Get started'}
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero Section ───────────────────────────────────────── */}
        <section className="relative isolate pt-28 pb-16 sm:pt-40 sm:pb-24 overflow-hidden">
          {/* Background gradient glow */}
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
            <div
              className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary/30 to-primary/5 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
              style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}
            />
          </div>

          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 -z-10 opacity-[0.25]"
            style={{
              backgroundImage: `linear-gradient(to right, hsl(var(--foreground) / 0.04) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground) / 0.04) 1px, transparent 1px)`,
              backgroundSize: '64px 64px',
              maskImage: 'radial-gradient(ellipse 70% 50% at 50% 40%, black, transparent)',
            }}
          />

          <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
            <div className="mx-auto max-w-3xl">
              {/* Eyebrow badge */}
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-sm">
                <Sparkles className="size-3.5 text-primary" />
                AI-Powered Professional Headshots
              </div>

              <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-7xl leading-[1.05]">
                Your next headshot{' '}
                <br className="hidden sm:block" />
                starts with a{' '}
                <span className="bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
                  selfie
                </span>
                .
              </h1>

              <p className="mt-8 text-lg leading-relaxed text-muted-foreground sm:text-xl max-w-2xl mx-auto">
                Upload any clear face photo. Our AI transforms it into a polished, studio-quality professional portrait — ready in seconds, not days.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" className="rounded-full px-8 h-12 text-base shadow-md shadow-primary/20 group w-full sm:w-auto">
                  <Link to={user ? "/dashboard" : "/login"}>
                    {user ? 'Go to Dashboard' : 'Create your headshot'}
                    <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-8 h-12 text-base bg-background/50 backdrop-blur-sm w-full sm:w-auto">
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>

              {/* Trust signals */}
              <div className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  No credit card
                </span>
                <span className="hidden sm:block h-4 w-px bg-border" />
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  60-second results
                </span>
                <span className="hidden sm:block h-4 w-px bg-border" />
                <span className="hidden sm:flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-primary" />
                  Private & secure
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ────────────────────────────────────────────────── */}
        <StatsBar />

        {/* ── Features ────────────────────────────────────────────── */}
        <Features />

        {/* ── How It Works ────────────────────────────────────────── */}
        <div id="how-it-works">
          <HowItWorks />
        </div>

        {/* ── CTA Section ─────────────────────────────────────────── */}
        <section className="relative py-24 sm:py-32 overflow-hidden">
          {/* Gradient glow behind CTA */}
          <div className="absolute inset-x-0 bottom-0 -z-10 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
            <div
              className="relative left-[calc(50%+11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-primary/20 to-primary/5 opacity-30 sm:left-[calc(50%+15rem)] sm:w-[72.1875rem]"
              style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}
            />
          </div>

          <div className="mx-auto max-w-3xl px-6 lg:px-8 text-center">
            <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-12 sm:p-16 shadow-xl shadow-primary/5">
              <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Get Started</p>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">
                Your professional image{' '}
                <br className="hidden sm:block" />
                deserves an upgrade.
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
                No credit card. No commitment. Just results.
              </p>
              <Button asChild size="lg" className="rounded-full px-10 h-12 text-base shadow-md shadow-primary/20 group">
                <Link to={user ? "/dashboard" : "/login"}>
                  {user ? 'Go to Dashboard' : 'Create your headshot'}
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {/* Brand */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center size-6 bg-primary text-primary-foreground rounded text-xs font-bold">U</span>
                <span className="text-base font-bold tracking-tighter">unfumble</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                AI-powered professional headshots. Upload a selfie, get a studio-quality portrait.
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-col gap-3">
              <span className="text-sm font-semibold text-foreground">Product</span>
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it works</a>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Get started</Link>
            </div>

            {/* Legal */}
            <div className="flex flex-col gap-3">
              <span className="text-sm font-semibold text-foreground">Legal</span>
              <span className="text-sm text-muted-foreground">Privacy Policy</span>
              <span className="text-sm text-muted-foreground">Terms of Service</span>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Unfumble. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Built with FastAPI + React
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
