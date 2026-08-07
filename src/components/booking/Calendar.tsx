import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isSameDay, toISODate, WEEKDAYS_SHORT, cn } from '@/lib/utils';

interface CalendarProps {
  monthDate: Date;
  selected?: string;
  minDate?: Date;
  maxDate?: Date;
  onSelect: (iso: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function Calendar({
  monthDate,
  selected,
  minDate,
  maxDate,
  onSelect,
  onPrevMonth,
  onNextMonth,
}: CalendarProps) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const min = minDate ?? new Date(0);
  const max = maxDate ?? new Date(8640000000000000);
  const selectedDate = selected ? new Date(selected) : null;

  return (
    <div className="card p-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          className="rounded-lg p-2 text-forest-600 hover:bg-cream-100"
          aria-label="Mese precedente"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="font-display text-base font-bold text-forest-900">
          {monthDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
        </h3>
        <button
          type="button"
          onClick={onNextMonth}
          className="rounded-lg p-2 text-forest-600 hover:bg-cream-100"
          aria-label="Mese successivo"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-wood-400">
        {WEEKDAYS_SHORT.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const iso = toISODate(date);
          const disabled = date < min || date > max;
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(iso)}
              className={cn(
                'relative aspect-square rounded-lg text-sm transition-all',
                isSelected && 'bg-forest-600 text-white font-bold shadow-soft',
                !isSelected && !disabled && 'text-forest-700 hover:bg-forest-50 hover:text-forest-700',
                disabled && 'text-cream-300 cursor-not-allowed',
                isToday && !isSelected && 'ring-1 ring-forest-400',
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
