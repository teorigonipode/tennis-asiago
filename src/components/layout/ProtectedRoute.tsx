import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { FullSpinner } from '@/components/ui/Spinner';
import type { ReactNode } from 'react';

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, authLoading, profileLoading, profileError } = useAuth();
  const location = useLocation();

  if (authLoading || profileLoading) return <FullSpinner />;
  if (!user) { return <Navigate to="/login" state={{ from: location.pathname }} replace />; }

  if (profileError) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="font-display text-xl font-bold text-forest-900">Errore di caricamento</h1>
          <p className="mt-2 text-sm text-forest-600">
            Si è verificato un errore nel caricamento del profilo. Riprova ad accedere.
          </p>
          <a href="/login" className="btn-secondary mt-6">Vai al login admin</a>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="font-display text-xl font-bold text-forest-900">Accesso non autorizzato</h1>
          <p className="mt-2 text-sm text-forest-600">
            Il tuo account non ha i permessi di amministratore.
          </p>
          <a href="/" className="btn-secondary mt-6">Torna alla home</a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
