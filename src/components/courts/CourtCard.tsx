import { Home, Sun, CalendarCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Court } from '@/types';

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
          <div className="flex h-full w-full items-center justify-center bg-forest-100 text-forest-600">
            <Home className="h-12 w-12" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="badge bg-white/90 text-forest-800 backdrop-blur">
            {court.surface}
          </span>
          {court.is_indoor ? (
            <span className="badge bg-forest-800/90 text-white backdrop-blur">
              <Home className="h-3 w-3" /> Coperto
            </span>
          ) : (
            <span className="badge bg-forest-600/90 text-white backdrop-blur">
              <Sun className="h-3 w-3" /> Scoperto
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold text-forest-900">{court.name}</h3>
        <p className="mt-1.5 flex-1 text-sm text-forest-600 line-clamp-3">{court.description}</p>

        {showBookButton && (
          <div className="mt-4 border-t border-cream-100 pt-4">
            <Link to={`/prenota?court=${court.id}`} className="btn-primary w-full">
              <CalendarCheck className="h-4 w-4" /> Verifica disponibilità
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
