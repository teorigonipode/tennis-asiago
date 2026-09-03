import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchBookingsRange } from '@/services/bookings';
import { toISODate, addDays, isSameDay, formatTime, WEEKDAYS_SHORT, cn } from '@/lib/utils';
import { FullSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import type { BookingWithCourt } from '@/types';

type ViewMode = 'day' | 'week';

export function AdminCalendar() {
  const [view, setView] = useState<ViewMode>('week');
  const [refDate, setRefDate] = useState(new Date());
  const [bookings, setBookings] = useState<BookingWithCourt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const start = toISODate(view === 'week' ? getWeekStart(refDate) : refDate);
      const end = toISODate(view === 'week' ? addDays(getWeekStart(refDate), 6) : refDate);
      const [b] = await Promise.all([fetchBookingsRange(start, end)]);
      setBookings(b);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di caricamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [refDate, view]);

  const days = useMemo(() => {
    if (view === 'day') return [refDate];
    const start = getWeekStart(refDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [refDate, view]);

  if (loading) return <FullSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest-900">Calendario</h1>
          <p className="text-sm text-cream-500">Visualizza le prenotazioni per giorno o settimana.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-cream-200 p-1">
            <button onClick={() => setView('day')} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', view === 'day' ? 'bg-forest-600 text-white' : 'text-forest-600')}>Giorno</button>
            <button onClick={() => setView('week')} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', view === 'week' ? 'bg-forest-600 text-white' : 'text-forest-600')}>Settimana</button>
          </div>
          <button onClick={() => setRefDate(addDays(refDate, view === 'week' ? -7 : -1))} className="btn-secondary" aria-label="Precedente">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setRefDate(new Date())} className="btn-secondary">Oggi</button>
          <button onClick={() => setRefDate(addDays(refDate, view === 'week' ? 7 : 1))} className="btn-secondary" aria-label="Successivo">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        {days.map((day) => {
          const dayBookings = bookings.filter((b) => b.booking_date === toISODate(day));
          return (
            <div key={toISODate(day)} className={cn('card p-4 min-h-[200px]', isSameDay(day, new Date()) && 'ring-2 ring-forest-500')}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-cream-500">{WEEKDAYS_SHORT[day.getDay()]}</p>
                  <p className="font-display text-lg font-bold text-forest-900">{day.getDate()}</p>
                </div>
                <span className="badge bg-cream-100 text-forest-600">{dayBookings.length}</span>
              </div>
              <div className="space-y-1.5">
                {dayBookings.length === 0 ? (
                  <p className="text-xs text-wood-400">Nessuna prenotazione</p>
                ) : (
                  dayBookings.map((b) => (
                    <div key={b.id} className="rounded-lg bg-forest-50 p-2 text-xs">
                      <p className="font-semibold text-forest-800">{formatTime(b.start_time)} {b.court.name}</p>
                      <p className="text-cream-500 truncate">{b.customer_name}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = d.getDay();
  d.setDate(d.getDate() - diff);
  return d;
}
