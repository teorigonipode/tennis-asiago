import { useEffect, useState, useCallback } from 'react';
import { CalendarX2, CalendarClock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { fetchUserBookings, cancelBooking } from '@/services/bookings';
import { canCancel } from '@/lib/availability';
import { BookingCard } from '@/components/booking/BookingCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FullSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import type { BookingWithCourt } from '@/types';

export function MyBookingsPage() {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [bookings, setBookings] = useState<BookingWithCourt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingWithCourt | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserBookings(user.id);
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di caricamento.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const future = bookings.filter(
    (b) => b.status !== 'cancelled' && b.status !== 'completed' && b.booking_date >= todayStr,
  );
  const past = bookings.filter(
    (b) => b.status === 'cancelled' || b.status === 'completed' || b.status === 'no_show' || b.booking_date < todayStr,
  );

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelBooking(cancelTarget.id);
      setCancelTarget(null);
      await load();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Errore durante l\'annullamento.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <FullSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="container-page py-12">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink-900">Le mie prenotazioni</h1>
        <p className="mt-2 text-ink-600">Gestisci le tue prenotazioni future e consulta lo storico.</p>
      </header>

      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title="Nessuna prenotazione"
          description="Non hai ancora effettuato prenotazioni. Inizia ora scegliendo un campo."
        />
      ) : (
        <>
          <section className="mb-10">
            <h2 className="font-display text-lg font-bold text-ink-900 mb-4 flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-court-600" /> Prossime prenotazioni
              <span className="badge bg-court-100 text-court-800">{future.length}</span>
            </h2>
            {future.length === 0 ? (
              <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-500">Nessuna prenotazione futura.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {future.map((b) => {
                  const cancel = canCancel(b, settings);
                  return (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      onCancel={setCancelTarget}
                      canCancel={cancel.ok}
                      cancelReason={cancel.reason}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold text-ink-900 mb-4">Storico</h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {past.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        title="Annulla prenotazione"
        description="Sei sicuro di voler annullare questa prenotazione? L'operazione non può essere annullata."
        confirmLabel="Sì, annulla"
        danger
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => { setCancelTarget(null); setCancelError(null); }}
      />

      {cancelError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl bg-red-600 px-4 py-3 text-sm text-white shadow-lift" role="alert">
          {cancelError}
        </div>
      )}
    </div>
  );
}
