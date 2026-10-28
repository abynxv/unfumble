import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background font-sans px-6 text-center">
      <div className="flex flex-col items-center gap-6 max-w-md">
        <div className="text-8xl font-extrabold tracking-tighter text-foreground">404</div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Page not found</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button asChild variant="outline" size="lg" className="rounded-full px-6 mt-2">
          <Link to="/">
            <ArrowLeft className="mr-2 size-4" />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  );
}
