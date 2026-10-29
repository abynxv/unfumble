import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Sparkles } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-background font-sans p-6 relative overflow-hidden selection:bg-primary/20">
      {/* Background ambient gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Navbar */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between py-2">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tighter">
          <span className="flex items-center justify-center size-8 bg-primary text-primary-foreground rounded-md text-sm font-bold">U</span>
          unfumble
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link to="/login">Sign in</Link>
        </Button>
      </header>

      {/* Main 404 Content */}
      <main className="flex flex-col items-center justify-center text-center max-w-lg my-auto py-12 animate-in fade-in zoom-in-95 duration-500">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 text-xs font-semibold text-muted-foreground mb-6">
          <Sparkles className="size-3.5 text-primary" />
          <span>Error 404</span>
        </div>

        <h1 className="text-8xl sm:text-9xl font-black tracking-tighter text-foreground mb-4 select-none">
          4<span className="text-primary">0</span>4
        </h1>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
          Page not found
        </h2>

        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-8 max-w-md">
          The page you are looking for doesn't exist, may have been removed, or is temporarily unavailable.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="rounded-full px-6 font-semibold shadow-sm">
            <Link to="/">
              <Home className="mr-2 size-4" />
              Return Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full px-6 font-semibold">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 size-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-xs text-muted-foreground py-4">
        &copy; {new Date().getFullYear()} Unfumble &middot; AI Studio Portraits
      </footer>
    </div>
  );
}
