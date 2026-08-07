import { Clock } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import type { OpeningHour } from '@/types';

const DAY_NAMES: Record<number, string> = {
  0: 'Domenica',
  1: 'Lunedì',
  2: 'Martedì',
  3: 'Mercoledì',
  4: 'Giovedì',
  5: 'Venerdì',
  6: 'Sabato',
};

// Italian week starts Monday (1) → Sunday (0)
const SORT_ORDER = [1, 2, 3, 4, 5, 6, 0];

function formatTime(t: string): string {
  return t.slice(0, 5);
}

interface GroupedHours {
  days: string;
  hours: string;
  isClosed: boolean;
}

function groupHours(hours: OpeningHour[]): GroupedHours[] {
  const sorted = SORT_ORDER
    .map(dow => hours.find(h => h.day_of_week === dow))
    .filter((h): h is OpeningHour => h !== undefined);

  const groups: GroupedHours[] = [];
  let current: GroupedHours | null = null;
  let consecutiveCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const h = sorted[i];
    const dayName = DAY_NAMES[h.day_of_week] ?? `Giorno ${h.day_of_week}`;
    const hoursStr = h.is_closed
      ? 'Chiuso'
      : `${formatTime(h.opening_time)}–${formatTime(h.closing_time)}`;

    if (
      current &&
      current.hours === hoursStr &&
      current.isClosed === h.is_closed &&
      consecutiveCount > 0
    ) {
      current.days = `${current.days.split('–')[0]}–${dayName}`;
      consecutiveCount++;
    } else {
      if (current) groups.push(current);
      current = { days: dayName, hours: hoursStr, isClosed: h.is_closed };
      consecutiveCount = 1;
    }
  }
  if (current) groups.push(current);
  return groups;
}

interface OpeningHoursSummaryProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function OpeningHoursSummary({ variant = 'full', className }: OpeningHoursSummaryProps) {
  const { openingHours, loading, error } = useSettings();

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-wood-500 ${className ?? ''}`}>
        <Clock className="h-4 w-4 animate-pulse" />
        <span>Caricamento orari…</span>
      </div>
    );
  }

  if (error || openingHours.length === 0) {
    return null;
  }

  if (variant === 'compact') {
    const groups = groupHours(openingHours);
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-wood-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-wood-400">Orari</span>
        </div>
        <ul className="space-y-1 text-sm">
          {groups.map((g, i) => (
            <li key={i} className="flex justify-between gap-4">
              <span className="text-cream-300">{g.days}</span>
              <span className={g.isClosed ? 'text-red-400' : 'text-cream-100'}>
                {g.hours}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Full variant: show all 7 days, Monday-first
  const sorted = SORT_ORDER
    .map(dow => openingHours.find(h => h.day_of_week === dow))
    .filter((h): h is OpeningHour => h !== undefined);

  return (
    <div className={className}>
      <ul className="space-y-2 text-sm">
        {sorted.map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-4 border-b border-cream-100 pb-2 last:border-0">
            <span className="font-medium text-forest-800">{DAY_NAMES[h.day_of_week] ?? `Giorno ${h.day_of_week}`}</span>
            <span className={h.is_closed ? 'font-medium text-red-600' : 'text-forest-600'}>
              {h.is_closed
                ? 'Chiuso'
                : `${formatTime(h.opening_time)} – ${formatTime(h.closing_time)}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
