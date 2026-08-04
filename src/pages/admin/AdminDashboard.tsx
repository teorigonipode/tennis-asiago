import { useEffect, useState } from 'react';
import { CalendarCheck, CalendarClock, XCircle, Euro, TrendingUp, Home, Users } from 'lucide-react';
import { fetchAllBookings } from '@/services/bookings';
import { fetchCourts } from '@/services/courts';
import { formatPrice, formatDateShort, BOOKING_STATUS_LABEL } from '@/lib/utils';
import { BookingStatusBadge } from '@/components/ui/StatusBadge';
import { FullSpinner } from '@/components/ui/Spinner';
import type { BookingWithCourt, Court } from '@/types';

export function AdminDashboard() {
  const [bookings, setBookings] = useState<BookingWithCourt[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAllBookings(), fetchCourts(false)])
      .then(([b, c]) => { setBookings(b); setCourts(c); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <FullSpinner />;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayBookings = bookings.filter((b) => b.booking_date === todayStr);
  const upcomingBookings = bookings.filter(
    (b) => b.booking_date > todayStr && b.status !== 'cancelled',
  );
  const cancelled = bookings.filter((b) => b.status === 'cancelled');
  const activeCourts = courts.filter((c) => c.is_active);
  const inactiveCourts = courts.filter((c) => !c.is_active);

  const totalRevenue = bookings
    .filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .reduce((sum, b) => sum + Number(b.price), 0);

  const stats = [
    { label: 'Prenotazioni oggi', value: todayBookings.length, icon: CalendarCheck, color: 'text-court-600 bg-court-50' },
    { label: 'Prossime', value: upcomingBookings.length, icon: CalendarClock, color: 'text-sky-600 bg-sky-50' },
    { label: 'Annullate', value: cancelled.length, icon: XCircle, color: 'text-red-600 bg-red-50' },
    { label: 'Incassi totali', value: formatPrice(totalRevenue), icon: Euro, color: 'text-amber-600 bg-amber-50' },
  ];

  const courtStats = [
    { label: 'Campi attivi', value: activeCourts.length, icon: Home, color: 'text-court-600 bg-court-50' },
    { label: 'Campi disattivati', value: inactiveCourts.length, icon: Home, color: 'text-ink-500 bg-ink-100' },
    { label: 'Totale prenotazioni', value: bookings.length, icon: Users, color: 'text-sky-600 bg-sky-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Dashboard</h1>
        <p className="text-sm text-ink-500">Panoramica delle prenotazioni e della struttura.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="card p-5">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-ink-900">{s.value}</p>
            <p className="text-xs text-ink-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {courtStats.map((s, i) => (
          <div key={i} className="card p-5 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-ink-900">{s.value}</p>
              <p className="text-xs text-ink-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="font-display text-lg font-bold text-ink-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-court-600" /> Prenotazioni di oggi
        </h2>
        {todayBookings.length === 0 ? (
          <p className="text-sm text-ink-500">Nessuna prenotazione per oggi.</p>
        ) : (
          <div className="space-y-2">
            {todayBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg bg-ink-50 p-3 text-sm">
                <div>
                  <p className="font-semibold text-ink-800">{b.court.name} · {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}</p>
                  <p className="text-ink-500">{b.customer_name} · {b.customer_email}</p>
                </div>
                <BookingStatusBadge status={b.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-display text-lg font-bold text-ink-900 mb-4">Prossime prenotazioni</h2>
        {upcomingBookings.length === 0 ? (
          <p className="text-sm text-ink-500">Nessuna prenotazione futura.</p>
        ) : (
          <div className="space-y-2">
            {upcomingBookings.slice(0, 10).map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg bg-ink-50 p-3 text-sm">
                <div>
                  <p className="font-semibold text-ink-800">
                    {formatDateShort(b.booking_date)} · {b.court.name} · {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)}
                  </p>
                  <p className="text-ink-500">{b.customer_name} · {formatPrice(b.price)}</p>
                </div>
                <BookingStatusBadge status={b.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
