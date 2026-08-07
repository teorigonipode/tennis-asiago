import { useState } from 'react';
import { Search, AlertCircle, CheckCircle2, XCircle, CalendarPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { triggerBookingEmail } from '@/services/email';
import type { BookingLookupResult } from '@/types';

export function GuestCancelPage() {
  const [publicCode, setPublicCode] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingLookupResult | null>(null);
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [changeMode, setChangeMode] = useState(false);
  const [changeDate, setChangeDate] = useState('');
  const [changeTime, setChangeTime] = useState('');
  const [changeCourtId, setChangeCourtId] = useState('');
  const [changeNotes, setChangeNotes] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [courts, setCourts] = useState<{ id: string; name: string }[]>([]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!publicCode.trim() || !email.trim()) {
      setError('Inserisci il codice prenotazione e l\'email.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('lookup_booking_by_code_email', {
        p_public_code: publicCode.trim().toUpperCase(),
        p_email: email.trim().toLowerCase(),
      });
      if (rpcError || !data || (Array.isArray(data) && data.length === 0)) {
        setError('Prenotazione non trovata o dati non corretti.');
        setBooking(null);
      } else {
        const result = Array.isArray(data) ? data[0] : data;
        setBooking(result as BookingLookupResult);
        const { data: courtsData } = await supabase
          .from('courts')
          .select('id, name')
          .eq('is_active', true)
          .order('display_order');
        if (courtsData) setCourts(courtsData);
      }
    } catch {
      setError('Prenotazione non trovata o dati non corretti.');
      setBooking(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('cancel_booking_by_code_email', {
        p_public_code: booking.public_code,
        p_email: email.trim().toLowerCase(),
      });
      if (rpcError) {
        setError(rpcError.message.includes('non trovata') ? 'Prenotazione non trovata o dati non corretti.' : rpcError.message);
      } else {
        setCancelSuccess(true);
        setCancelMode(false);
        triggerBookingEmail({
          booking_id: booking.id,
          event_type: 'booking_cancelled',
          email_proof: email.trim().toLowerCase(),
        });
      }
    } catch {
      setError('Errore durante l\'annullamento. Riprova.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRequest = async () => {
    if (!booking) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('create_change_request_by_code_email', {
        p_public_code: booking.public_code,
        p_email: email.trim().toLowerCase(),
        p_requested_date: changeDate || null,
        p_requested_start_time: changeTime ? `${changeTime}:00` : null,
        p_requested_court_id: changeCourtId || null,
        p_customer_notes: changeNotes.trim() || null,
      });
      if (rpcError) {
        setError('Errore nell\'invio della richiesta. Riprova.');
      } else {
        setChangeSuccess(true);
        setChangeMode(false);
        const requestId = (data as unknown as string) || undefined;
        triggerBookingEmail({
          booking_id: booking.id,
          event_type: 'change_requested',
          email_proof: email.trim().toLowerCase(),
          change_request_id: requestId,
        });
      }
    } catch {
      setError('Errore nell\'invio della richiesta. Riprova.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setPublicCode('');
    setEmail('');
    setBooking(null);
    setError(null);
    setCancelSuccess(false);
    setChangeSuccess(false);
    setCancelMode(false);
    setChangeMode(false);
    setChangeDate('');
    setChangeTime('');
    setChangeNotes('');
  };

  if (cancelSuccess) {
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-md">
          <div className="card p-8 text-center animate-scaleIn">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-forest-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="font-display text-xl font-bold text-forest-900">Prenotazione annullata</h1>
            <p className="mt-2 text-sm text-forest-600">La tua prenotazione è stata annullata con successo.</p>
            <button onClick={reset} className="btn-secondary mt-6">Nuova ricerca</button>
          </div>
        </div>
      </div>
    );
  }

  if (changeSuccess) {
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-md">
          <div className="card p-8 text-center animate-scaleIn">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-forest-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="font-display text-xl font-bold text-forest-900">Richiesta inviata</h1>
            <p className="mt-2 text-sm text-forest-600">
              La tua richiesta di modifica è stata inviata. Il circolo ti contatterà per confermare.
            </p>
            <button onClick={reset} className="btn-secondary mt-6">Nuova ricerca</button>
          </div>
        </div>
      </div>
    );
  }

  if (booking && !cancelMode && !changeMode) {
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-md">
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-forest-900 mb-4">La tua prenotazione</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-wood-500">Codice</dt>
                <dd className="font-mono font-semibold">{booking.public_code}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-wood-500">Campo</dt>
                <dd className="font-semibold">{booking.court_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-wood-500">Data</dt>
                <dd className="font-semibold capitalize">{booking.booking_date}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-wood-500">Orario</dt>
                <dd className="font-semibold">{booking.start_time.slice(0, 5)} – {booking.end_time.slice(0, 5)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-wood-500">Stato</dt>
                <dd className="font-semibold">{booking.status === 'confirmed' ? 'Confermata' : booking.status === 'cancelled' ? 'Annullata' : booking.status}</dd>
              </div>
            </dl>

            {booking.status === 'cancelled' ? (
              <div className="mt-6 rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
                <XCircle className="mx-auto mb-2 h-6 w-6" />
                Questa prenotazione è già stata annullata.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {booking.can_cancel ? (
                  <button onClick={() => setCancelMode(true)} className="btn-danger w-full">
                    Annulla prenotazione
                  </button>
                ) : (
                  <p className="rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-700">
                    Non è più possibile annullare questa prenotazione (termine superato).
                  </p>
                )}
                <button onClick={() => setChangeMode(true)} className="btn-secondary w-full">
                  <CalendarPlus className="h-4 w-4" /> Richiedi modifica
                </button>
                <button onClick={reset} className="btn-ghost w-full">Nuova ricerca</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (booking && cancelMode) {
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-md">
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-forest-900 mb-2">Annulla prenotazione</h2>
            <p className="text-sm text-forest-600 mb-4">
              Sei sicuro di voler annullare la prenotazione <span className="font-mono">{booking.public_code}</span>?
              L'operazione non è reversibile.
            </p>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setCancelMode(false)} className="btn-secondary flex-1" disabled={submitting}>Indietro</button>
              <button onClick={handleCancel} className="btn-danger flex-1" disabled={submitting}>
                {submitting ? 'Annullamento…' : 'Conferma annullamento'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (booking && changeMode) {
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-md">
          <div className="card p-6">
            <h2 className="font-display text-lg font-bold text-forest-900 mb-2">Richiedi modifica</h2>
            <p className="text-sm text-forest-600 mb-4">
              Indica le tue preferenze. Il circolo valuterà la richiesta e ti contatterà per confermare.
              La prenotazione attuale non viene modificata automaticamente.
            </p>
            <div className="space-y-4">
              <div>
                <label className="label">Nuova data desiderata</label>
                <input type="date" value={changeDate} onChange={(e) => setChangeDate(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Nuovo orario desiderato</label>
                <input type="time" value={changeTime} onChange={(e) => setChangeTime(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Campo preferito (opzionale)</label>
                <select value={changeCourtId} onChange={(e) => setChangeCourtId(e.target.value)} className="input">
                  <option value="">Nessuna preferenza</option>
                  {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Note</label>
                <textarea value={changeNotes} onChange={(e) => setChangeNotes(e.target.value)} className="input min-h-[80px]" placeholder="Eventuali dettagli sulla richiesta" />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setChangeMode(false)} className="btn-secondary flex-1" disabled={submitting}>Indietro</button>
              <button onClick={handleChangeRequest} className="btn-primary flex-1" disabled={submitting}>
                {submitting ? 'Invio…' : 'Invia richiesta'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-md">
        <div className="card p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-700 text-white">
              <Search className="h-6 w-6" />
            </div>
            <h1 className="font-display text-2xl font-bold text-forest-900">Gestisci prenotazione</h1>
            <p className="mt-1 text-sm text-wood-500">
              Inserisci il codice prenotazione e l'email usata per prenotare.
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label htmlFor="gc-code" className="label">Codice prenotazione</label>
              <input
                id="gc-code"
                type="text"
                value={publicCode}
                onChange={(e) => setPublicCode(e.target.value)}
                className="input uppercase"
                placeholder="es. AB3X9K2M"
                maxLength={8}
                required
              />
            </div>
            <div>
              <label htmlFor="gc-email" className="label">Email</label>
              <input
                id="gc-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="mario.rossi@email.it"
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Ricerca…' : 'Cerca prenotazione'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
