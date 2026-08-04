import { Home, Lightbulb, Sun, Euro, CalendarCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Court } from '@/types';
import { formatPrice } from '@/lib/utils';

interface CourtCardProps {
  court: Court;
  showBookButton?: boolean;
}

export function CourtCard({ court, showBookButton = true }: CourtCardProps) {
  return (
    <article className="card group overflow-hidden flex flex-col transition-all duration-300 hover:shadow-lift">
      <div className="relative h-48 overflow-hidden">
        {court.image_url ? (
          <img
            src={court.image_url}
            alt={`Foto ${court.name}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-court-100 text-court-600">
            <Home className="h-12 w-12" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="badge bg-white/90 text-ink-800 backdrop-blur">
            {court.surface}
          </span>
          {court.is_indoor ? (
            <span className="badge bg-ink-800/90 text-white backdrop-blur">
              <Home className="h-3 w-3" /> Coperto
            </span>
          ) : (
            <span className="badge bg-court-600/90 text-white backdrop-blur">
              <Sun className="h-3 w-3" /> Scoperto
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold text-ink-900">{court.name}</h3>
        <p className="mt-1.5 flex-1 text-sm text-ink-600 line-clamp-3">{court.description}</p>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            {court.has_lighting ? 'Illuminazione serale' : 'Senza illuminazione'}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
          <div>
            <p className="text-xs text-ink-500">Prezzo orario</p>
            <p className="font-display text-xl font-bold text-court-700">
              {formatPrice(court.hourly_price)}
            </p>
          </div>
          {showBookButton && (
            <Link to={`/prenota?court=${court.id}`} className="btn-primary">
              <CalendarCheck className="h-4 w-4" /> Verifica disponibilità
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
