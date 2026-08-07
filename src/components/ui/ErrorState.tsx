import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center" role="alert">
      <div className="rounded-full bg-red-100 p-4 text-red-600">
        <AlertTriangle className="h-8 w-8" aria-hidden />
      </div>
      <p className="max-w-md text-sm text-forest-600">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-2">
          <RefreshCw className="h-4 w-4" /> Riprova
        </button>
      )}
    </div>
  );
}
