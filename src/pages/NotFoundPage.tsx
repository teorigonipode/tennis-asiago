import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-50 text-forest-600">
          <CalendarDays className="h-8 w-8" />
        </div>
        <h1 className="font-display text-3xl font-bold text-forest-900">Pagina non trovata</h1>
        <p className="mt-3 text-forest-600">
          La pagina che cerchi non esiste o è stata spostata.
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          Torna alla home
        </Link>
      </div>
    </div>
  );
}
