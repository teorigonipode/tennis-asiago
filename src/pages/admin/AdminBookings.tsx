import { useEffect, useState, useMemo } from 'react';
import { CalendarDays, Edit, X, Save, Plus } from 'lucide-react';
import { fetchAllBookings, updateBooking, createBooking, cancelBooking } from '@/services/bookings';
import { fetchCourts } from '@/services/courts';
import { AdminFilters, type AdminFilterState } from '@/components/admin/AdminFilters';
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FullSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatPrice, formatDateShort, formatTime, BOOKING_STATUS_LABEL } from '@/lib/utils';
import type { BookingWithCourt, Court, BookingStatus, PaymentStatus } from '@/types';

export function AdminBookings() {
  const [bookings, setBookings] = useState<BookingWithCourt[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdminFilterState>({ search: '', courtId: '', status: '', date: '' });
  const [editTarget, setEditTarget] = useState<BookingWithCourt | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingWithCourt | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, c] = await Promise.all([fetchAllBookings(), fetchCourts(false)]);
      setBookings(b);
      setCourts(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di caricamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!b.customer_name.toLowerCase().includes(q) && !b.customer_email.toLowerCase().includes(q)) return false;
      }
      if (filters.courtId && b.court_id !== filters.courtId) return false;
      if (filters.status && b.status !== filters.status) return false;
      if (filters.date && b.booking_date !== filters.date) return false;
      return true;
    });
  }, [bookings, filters]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelBooking(cancelTarget.id);
      setCancelTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante l\'annullamento.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <FullSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Prenotazioni</h1>
          <p className="text-sm text-ink-500">Gestisci tutte le prenotazioni.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Nuova prenotazione
        </button>
      </div>

      <AdminFilters filters={filters} onChange={setFilters} courts={courts} />

      {filtered.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nessuna prenotazione" description="Nessuna prenotazione corrisponde ai filtri selezionati." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 text-left text-xs text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Ora</th>
                <th className="px-4 py-3 font-semibold">Campo</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Prezzo</th>
                <th className="px-4 py-3 font-semibold">Stato</th>
                <th className="px-4 py-3 font-semibold">Pagamento</th>
                <th className="px-4 py-3 font-semibold">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-ink-50/50">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateShort(b.booking_date)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatTime(b.start_time)}–{formatTime(b.end_time)}</td>
                  <td className="px-4 py-3">{b.court.name}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-800">{b.customer_name}</p>
                    <p className="text-xs text-ink-500">{b.customer_email}</p>
                    {b.customer_phone && <p className="text-xs text-ink-500">{b.customer_phone}</p>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatPrice(b.price)}</td>
                  <td className="px-4 py-3"><BookingStatusBadge status={b.status} /></td>
                  <td className="px-4 py-3"><PaymentStatusBadge status={b.payment_status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setEditTarget(b)} className="rounded-lg p-2 text-ink-600 hover:bg-court-50 hover:text-court-700" aria-label="Modifica">
                        <Edit className="h-4 w-4" />
                      </button>
                      {b.status !== 'cancelled' && (
                        <button onClick={() => setCancelTarget(b)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Annulla">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editTarget && (
        <EditBookingDialog
          booking={editTarget}
          courts={courts}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); load(); }}
        />
      )}

      {showCreate && (
        <CreateBookingDialog
          courts={courts}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load(); }}
        />
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        title="Annulla prenotazione"
        description={`Vuoi annullare la prenotazione di ${cancelTarget?.customer_name}?`}
        confirmLabel="Annulla prenotazione"
        danger
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}

function EditBookingDialog({
  booking, courts, onClose, onSaved,
}: { booking: BookingWithCourt; courts: Court[]; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(booking.payment_status);
  const [adminNotes, setAdminNotes] = useState(booking.admin_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateBooking(booking.id, { status, payment_status: paymentStatus, admin_notes: adminNotes.trim() || null });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg card p-6 animate-scaleIn max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-lg font-bold text-ink-900 mb-4">Modifica prenotazione</h2>
        <div className="space-y-4">
          <div className="rounded-lg bg-ink-50 p-3 text-sm">
            <p className="font-semibold">{booking.court.name}</p>
            <p className="text-ink-600">{formatDateShort(booking.booking_date)} · {formatTime(booking.start_time)}–{formatTime(booking.end_time)}</p>
            <p className="text-ink-600">{booking.customer_name} · {booking.customer_email}</p>
          </div>
          <div>
            <label className="label">Stato</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)} className="input">
              {Object.entries(BOOKING_STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Stato pagamento</label>
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)} className="input">
              <option value="not_required">Non richiesto</option>
              <option value="pending">In attesa</option>
              <option value="paid">Pagato</option>
              <option value="refunded">Rimborsato</option>
              <option value="failed">Fallito</option>
            </select>
          </div>
          <div>
            <label className="label">Note interne</label>
            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="input min-h-[80px]" placeholder="Note visibili solo agli amministratori" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Chiudi</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? 'Salvataggio…' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateBookingDialog({
  courts, onClose, onSaved,
}: { courts: Court[]; onClose: () => void; onSaved: () => void }) {
  const [courtId, setCourtId] = useState(courts[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(60);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const court = courts.find((c) => c.id === courtId);
  const price = court ? Number((court.hourly_price * (duration / 60)).toFixed(2)) : 0;

  const handleSave = async () => {
    setError(null);
    if (!courtId || !date || !name.trim() || !email.trim()) {
      setError('Compila tutti i campi obbligatori.');
      return;
    }
    const [h, m] = startTime.split(':').map(Number);
    const endMin = h * 60 + m + duration;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}:00`;
    setSaving(true);
    try {
      await createBooking({
        court_id: courtId,
        booking_date: date,
        start_time: `${startTime}:00`,
        end_time: endTime,
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim() || undefined,
        price,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nella creazione.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg card p-6 animate-scaleIn max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-lg font-bold text-ink-900 mb-4">Nuova prenotazione</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Campo *</label>
            <select value={courtId} onChange={(e) => setCourtId(e.target.value)} className="input">
              {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Ora inizio *</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Durata (minuti)</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="input">
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
              <option value={120}>120 min</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nome *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Telefono</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
          </div>
          <p className="text-sm text-ink-600">Prezzo: <span className="font-bold">{formatPrice(price)}</span></p>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Chiudi</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? 'Creazione…' : 'Crea prenotazione'}
          </button>
        </div>
      </div>
    </div>
  );
}
