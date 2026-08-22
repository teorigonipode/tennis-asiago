import { Loader2 } from 'lucide-react';

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden />;
}

export function FullSpinner({ label = 'Caricamento…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-cream-500" role="status">
      <Spinner className="h-8 w-8 text-forest-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
