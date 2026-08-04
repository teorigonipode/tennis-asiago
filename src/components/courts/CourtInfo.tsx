import { Home, Lightbulb, Sun, Layers } from 'lucide-react';
import type { Court } from '@/types';

export function CourtInfo({ court }: { court: Court }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="badge bg-ink-100 text-ink-700">
        <Layers className="h-3 w-3" /> {court.surface}
      </span>
      <span className="badge bg-ink-100 text-ink-700">
        {court.is_indoor ? <Home className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
        {court.is_indoor ? ' Coperto' : ' Scoperto'}
      </span>
      {court.has_lighting && (
        <span className="badge bg-amber-100 text-amber-800">
          <Lightbulb className="h-3 w-3" /> Illuminazione
        </span>
      )}
    </div>
  );
}
