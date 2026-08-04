import { useCourts } from '@/hooks/useCourts';
import { CourtCard } from '@/components/courts/CourtCard';
import { FullSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { Home } from 'lucide-react';

export function CourtsPage() {
  const { courts, loading, error } = useCourts(true);

  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink-900">I nostri campi</h1>
        <p className="mt-2 text-ink-600">
          Scegli il campo più adatto a te e verifica la disponibilità in tempo reale.
        </p>
      </header>

      {loading ? (
        <FullSpinner />
      ) : error ? (
        <ErrorState message="Impossibile caricare i campi. Riprova più tardi." />
      ) : courts.length === 0 ? (
        <p className="rounded-xl bg-ink-50 p-6 text-center text-ink-500">
          Nessun campo disponibile al momento.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courts.map((court) => (
            <CourtCard key={court.id} court={court} />
          ))}
        </div>
      )}

      <div className="mt-12 flex items-start gap-3 rounded-2xl bg-court-50 p-5 text-sm text-court-800">
        <Home className="h-5 w-5 shrink-0" />
        <p>Tutti i campi sono dotati di illuminazione serale. Il campo coperto è utilizzabile in ogni condizione meteo.</p>
      </div>
    </div>
  );
}
