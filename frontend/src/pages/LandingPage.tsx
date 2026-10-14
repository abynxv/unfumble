import { useState, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Camera, Cpu, Download, Shield, Sparkles, Zap } from 'lucide-react';

const Features = memo(() => {
  const features = [
    {
      icon: <Sparkles className="size-6 text-primary" />,
      title: 'AI Generation',
      desc: 'Advanced models that understand facial structure, lighting, and professional composition.',
    },
    {
      icon: <Camera className="size-6 text-primary" />,
      title: 'Face Clarity',
      desc: 'Intelligent face detection ensures sharp, natural results from any clear photo you upload.',
    },
    {
      icon: <Zap className="size-6 text-primary" />,
      title: 'Instant Results',
      desc: 'From upload to download in under 60 seconds. No appointments, no waiting.',
    },
    {
      icon: <Shield className="size-6 text-primary" />,
      title: 'Enterprise Security',
      desc: 'Your photos are processed securely and never shared. Privacy by design.',
    },
    {
      icon: <Download className="size-6 text-primary" />,
      title: 'HD Downloads',
      desc: 'Download production-ready portraits for LinkedIn, resumes, websites, and ID badges.',
    },
    {
      icon: <Cpu className="size-6 text-primary" />,
      title: 'Style Library',
      desc: 'Corporate, Startup, Developer, Formal — each precisely tuned for its professional context.',
    },
  ];

  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h2 className="text-base font-semibold leading-7 text-primary">Features</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built for professionals who value their time
          </p>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            Skip the photographer. Skip the studio. Get the same result in a fraction of the time.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={feature.title} className="border-border/50 bg-background/50 backdrop-blur-sm transition-all hover:shadow-md hover:border-primary/50 animate-in fade-in slide-in-from-bottom-8" style={{ animationDelay: `${index * 100}ms` }}>
                <CardHeader>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-7">
                    {feature.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
});

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Navbar */}
      <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'bg-background/80 backdrop-blur-md border-b border-border shadow-sm' : 'bg-transparent'}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tighter">unfumble</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">Features</a>
            <Button asChild variant="default" size="sm" className="rounded-full">
              <Link to="/login">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative isolate pt-32 pb-20 sm:pt-40 sm:pb-24 lg:pb-32 overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
            <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-accent opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
          </div>
          
          <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
            <div className="mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-700">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-6">AI-Powered Professional Headshots</p>
              <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-7xl mb-8">
                Your next headshot <br className="hidden sm:block"/>starts with a selfie.
              </h1>
              <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl max-w-2xl mx-auto mb-10">
                Upload any clear face photo. Our AI transforms it into a polished, studio-quality professional portrait — ready in seconds, not days.
              </p>
              <div className="flex items-center justify-center gap-x-6">
                <Button asChild size="lg" className="rounded-full px-8 h-12 text-base group">
                  <Link to="/login">
                    Create your headshot
                    <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full px-8 h-12 text-base bg-background/50 backdrop-blur-sm">
                  <a href="#features">How it works</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <Features />

        {/* CTA Section */}
        <section className="relative isolate py-24 sm:py-32 overflow-hidden bg-muted/30">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-4">Get Started</p>
            <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-6">
              Your professional image <br className="hidden sm:block"/>deserves an upgrade.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground mb-10">
              No credit card. No commitment. Just results.
            </p>
            <Button asChild size="lg" className="rounded-full px-10 h-14 text-lg group">
              <Link to="/login">
                Create your headshot
                <ArrowRight className="ml-2 size-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-xl font-bold tracking-tighter">unfumble</span>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Unfumble. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
