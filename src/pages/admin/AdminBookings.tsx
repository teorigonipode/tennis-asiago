import { useEffect, useState, useMemo, Fragment } from 'react';
import { CalendarDays, Edit, X, Save, Plus, Trash2, Mail, ChevronDown, ChevronUp, RotateCw } from 'lucide-react';
import { fetchAllBookings, updateBooking, createAdminBooking, cancelBooking, deleteBooking } from '@/services/bookings';
import { fetchCourts } from '@/services/courts';
import { fetchEmailLogsForBooking, retryEmail, type EmailLogEntry } from '@/services/emailLogs';
import { AdminFilters, type AdminFilterState } from '@/components/admin/AdminFilters';
import { BookingStatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FullSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateShort, formatTime, BOOKING_STATUS_LABEL } from '@/lib/utils';
import type { BookingWithCourt, Court, BookingStatus } from '@/types';

export function AdminBookings() {
  const [bookings, setBookings] = useState<BookingWithCourt[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AdminFilterState>({ search: '', courtId: '', status: '', date: '' });
  const [editTarget, setEditTarget] = useState<BookingWithCourt | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingWithCourt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookingWithCourt | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [emailLogs, setEmailLogs] = useState<Record<string, EmailLogEntry[]>>({});
  const [emailLoading, setEmailLoading] = useState<string | null>(null);
  const [retryLoading, setRetryLoading] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

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
        const name = (b.customer_name || '').toLowerCase();
        const email = (b.customer_email || '').toLowerCase();
        const phone = (b.customer_phone || '').toLowerCase();
        const code = (b.public_code || '').toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !phone.includes(q) && !code.includes(q)) return false;
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

  const toggleEmail = async (bookingId: string) => {
    if (expandedEmail === bookingId) {
      setExpandedEmail(null);
      return;
    }
    setExpandedEmail(bookingId);
    if (!emailLogs[bookingId]) {
      setEmailLoading(bookingId);
      try {
        const logs = await fetchEmailLogsForBooking(bookingId);
        setEmailLogs(prev => ({ ...prev, [bookingId]: logs }));
      } catch {
        setEmailLogs(prev => ({ ...prev, [bookingId]: [] }));
      } finally {
        setEmailLoading(null);
      }
    }
  };

  const handleRetry = async (bookingId: string) => {
    setRetryLoading(bookingId);
    setRetryMessage(null);
    try {
      const result = await retryEmail(bookingId);
      setRetryMessage(result.message);
      const logs = await fetchEmailLogsForBooking(bookingId);
      setEmailLogs(prev => ({ ...prev, [bookingId]: logs }));
    } catch {
      setRetryMessage('Errore durante il reinvio.');
    } finally {
      setRetryLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBooking(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante l\'eliminazione.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <FullSpinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest-900">Prenotazioni</h1>
          <p className="text-sm text-cream-500">Gestisci tutte le prenotazioni.</p>
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
            <thead className="border-b border-cream-100 text-left text-xs text-cream-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Ora</th>
                <th className="px-4 py-3 font-semibold">Campo</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Codice</th>
                <th className="px-4 py-3 font-semibold">Stato</th>
                <th className="px-4 py-3 font-semibold">Azioni</th>
                <th className="px-4 py-3 font-semibold">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-50">
              {filtered.map((b) => (
                <Fragment key={b.id}>
                <tr className="hover:bg-cream-50/50">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateShort(b.booking_date)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatTime(b.start_time)}–{formatTime(b.end_time)}</td>
                  <td className="px-4 py-3">{b.court.name}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-forest-800">{b.customer_name}</p>
                    <p className="text-xs text-cream-500">{b.customer_email}</p>
                    {b.customer_phone && <p className="text-xs text-cream-500">{b.customer_phone}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{b.public_code ?? '—'}</td>
                  <td className="px-4 py-3"><BookingStatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setEditTarget(b)} className="rounded-lg p-2 text-forest-600 hover:bg-forest-50 hover:text-forest-700" aria-label="Modifica">
                        <Edit className="h-4 w-4" />
                      </button>
                      {b.status !== 'cancelled' && (
                        <button onClick={() => setCancelTarget(b)} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50" aria-label="Annulla">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => setDeleteTarget(b)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Elimina definitivamente">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleEmail(b.id)}
                      className="flex items-center gap-1 text-xs text-forest-600 hover:text-forest-800"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {expandedEmail === b.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </td>
                </tr>
                {expandedEmail === b.id && (
                  <tr key={`${b.id}-email`} className="bg-cream-50/30">
                    <td colSpan={8} className="px-4 py-4">
                      {emailLoading === b.id ? (
                        <p className="text-xs text-cream-500">Caricamento stato email…</p>
                      ) : (emailLogs[b.id] ?? []).length === 0 ? (
                        <p className="text-xs text-cream-500">Nessun tentativo email registrato.</p>
                      ) : (
                        <div className="space-y-2">
                          {(emailLogs[b.id] ?? []).map((log) => (
                            <div key={log.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                              <span className="font-medium text-forest-700">{log.template_type}</span>
                              <span className={
                                log.status === 'sent' ? 'text-green-600' :
                                log.status === 'failed' ? 'text-red-600' :
                                log.status === 'skipped' ? 'text-amber-600' :
                                'text-cream-500'
                              }>{log.status}</span>
                              <span className="text-cream-500">→ {log.recipient_email ?? '—'}</span>
                              {log.sent_at && <span className="text-cream-400">inviata {new Date(log.sent_at).toLocaleString('it-IT')}</span>}
                              {log.retry_count > 0 && <span className="text-cream-400">retry: {log.retry_count}</span>}
                              {log.last_error && <span className="text-red-500" title={log.last_error}>errore</span>}
                            </div>
                          ))}
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => handleRetry(b.id)}
                              disabled={retryLoading === b.id}
                              className="btn-secondary text-xs"
                            >
                              <RotateCw className="h-3 w-3" /> {retryLoading === b.id ? 'Reinvio…' : 'Reinvia email cliente'}
                            </button>
                            {retryMessage && expandedEmail === b.id && (
                              <span className="text-xs text-forest-600">{retryMessage}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </Fragment>
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
        description={`Vuoi annullare la prenotazione di ${cancelTarget?.customer_name}? La prenotazione verrà segnata come annullata ma non eliminata.`}
        confirmLabel="Annulla prenotazione"
        danger
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Elimina definitivamente"
        description={`Attenzione: questa operazione eliminerà definitivamente la prenotazione di ${deleteTarget?.customer_name}. L'operazione non è reversibile.`}
        confirmLabel="Elimina definitivamente"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function EditBookingDialog({
  booking, courts, onClose, onSaved,
}: { booking: BookingWithCourt; courts: Court[]; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [courtId, setCourtId] = useState(booking.court_id);
  const [bookingDate, setBookingDate] = useState(booking.booking_date);
  const [startTime, setStartTime] = useState(booking.start_time.slice(0, 5));
  const [endTime, setEndTime] = useState(booking.end_time.slice(0, 5));
  const [adminNotes, setAdminNotes] = useState(booking.admin_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateBooking(booking.id, {
        status,
        court_id: courtId,
        booking_date: bookingDate,
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
        admin_notes: adminNotes.trim() || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nel salvataggio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-forest-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg card p-6 animate-scaleIn max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-lg font-bold text-forest-900 mb-4">Modifica prenotazione</h2>
        <div className="space-y-4">
          <div className="rounded-lg bg-cream-50 p-3 text-sm">
            <p className="font-semibold">{booking.court.name}</p>
            <p className="text-forest-600">{booking.customer_name} · {booking.customer_email}</p>
            {booking.public_code && <p className="text-xs text-cream-500">Codice: {booking.public_code}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Campo</label>
              <select value={courtId} onChange={(e) => setCourtId(e.target.value)} className="input">
                {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Stato</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)} className="input">
                {Object.entries(BOOKING_STATUS_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Data</label>
              <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Inizio</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Fine</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Note interne</label>
            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="input min-h-[80px]" placeholder="Note visibili solo agli amministratori" />
          </div>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    if (!courtId || !date || !firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError('Compila tutti i campi obbligatori.');
      return;
    }
    const [h, m] = startTime.split(':').map(Number);
    const endMin = h * 60 + m + duration;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}:00`;
    setSaving(true);
    try {
      await createAdminBooking({
        court_id: courtId,
        booking_date: date,
        start_time: `${startTime}:00`,
        end_time: endTime,
        customer_first_name: firstName.trim(),
        customer_last_name: lastName.trim(),
        customer_name: `${firstName.trim()} ${lastName.trim()}`,
        customer_email: email.trim() || 'telefono',
        customer_phone: phone.trim(),
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
      <div className="absolute inset-0 bg-forest-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg card p-6 animate-scaleIn max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-lg font-bold text-forest-900 mb-4">Nuova prenotazione (telefono)</h2>
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
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Cognome *</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Telefono *</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Email (facoltativa)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
            </div>
          </div>
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
