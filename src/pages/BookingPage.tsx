import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Home,
  Lock,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useCourts } from '@/hooks/useCourts';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import { fetchBookingsByCourtAndDate, createBooking, countActiveBookings } from '@/services/bookings';
import { fetchClosures } from '@/services/settings';
import { generateSlots, getOpeningForDate, isWithinAdvance } from '@/lib/availability';
import { toISODate, addDays, formatPrice, formatDate, formatTime, isValidEmail, isValidPhone, cn } from '@/lib/utils';
import { Calendar } from '@/components/booking/Calendar';
import { SlotGrid } from '@/components/booking/SlotGrid';
import { BookingSummary } from '@/components/booking/BookingSummary';
import { CourtInfo } from '@/components/courts/CourtInfo';
import { FullSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import type { Court, TimeSlot, Booking, CourtClosure } from '@/types';

type Step = 'date' | 'court' | 'slot' | 'details' | 'confirm' | 'done';

export function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { courts, loading: courtsLoading, error: courtsError } = useCourts(true);
  const { settings, openingHours, loading: settingsLoading } = useSettings();

  const [step, setStep] = useState<Step>('date');
  const [monthDate, setMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCourtId, setSelectedCourtId] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [closures, setClosures] = useState<CourtClosure[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const preselectCourt = searchParams.get('court');

  useEffect(() => {
    if (preselectCourt && courts.length > 0 && courts.some((c) => c.id === preselectCourt)) {
      setSelectedCourtId(preselectCourt);
    }
  }, [preselectCourt, courts]);

  useEffect(() => {
    if (user && profile) {
      const full = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
      if (full) setName(full);
      if (profile.email) setEmail(profile.email);
      if (profile.phone) setPhone(profile.phone);
    }
  }, [user, profile]);

  const selectedCourt = useMemo(
    () => courts.find((c) => c.id === selectedCourtId) ?? null,
    [courts, selectedCourtId],
  );

  const slots = useMemo(() => {
    if (!selectedDate || !selectedCourt || !settings) return [];
    const date = new Date(selectedDate + 'T00:00:00');
    const opening = getOpeningForDate(date, openingHours);
    return generateSlots(date, opening, settings, bookings, closures, selectedCourt.id);
  }, [selectedDate, selectedCourt, settings, openingHours, bookings, closures]);

  const minDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const maxDate = useMemo(() => {
    if (!settings) return addDays(new Date(), 30);
    return addDays(new Date(), settings.maximum_advance_days);
  }, [settings]);

  // Load bookings + closures when date or court changes
  useEffect(() => {
    if (!selectedDate || !selectedCourtId) return;
    setSlotsLoading(true);
    Promise.all([
      fetchBookingsByCourtAndDate(selectedCourtId, selectedDate),
      fetchClosures(),
    ])
      .then(([b, c]) => {
        setBookings(b);
        setClosures(c);
      })
      .catch(() => {})
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, selectedCourtId]);

  const handleDateSelect = (iso: string) => {
    setSelectedDate(iso);
    setSelectedSlot(null);
    if (selectedCourtId) setStep('slot');
    else setStep('court');
  };

  const handleCourtSelect = (court: Court) => {
    setSelectedCourtId(court.id);
    if (selectedDate) setStep('slot');
    else setStep('date');
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.available) return;
    setSelectedSlot(slot);
    setStep('details');
  };

  const price = useMemo(() => {
    if (!selectedCourt || !selectedSlot) return 0;
    const [sh, sm] = selectedSlot.start.split(':').map(Number);
    const [eh, em] = selectedSlot.end.split(':').map(Number);
    const hours = (eh * 60 + em - sh * 60 - sm) / 60;
    return Number((selectedCourt.hourly_price * hours).toFixed(2));
  }, [selectedCourt, selectedSlot]);

  const handleConfirm = async () => {
    setSubmitError(null);
    if (!selectedCourt || !selectedSlot || !selectedDate) return;
    if (!name.trim() || !isValidEmail(email)) {
      setSubmitError("Inserisci nome e un'email valida.");
      return;
    }
    if (!privacyConsent) {
      setSubmitError("Devi accettare l'informativa privacy per proseguire.");
      return;
    }

    const advanceCheck = isWithinAdvance(new Date(selectedDate + 'T00:00:00'), settings);
    if (!advanceCheck.ok) {
      setSubmitError(advanceCheck.reason ?? 'Data non disponibile.');
      return;
    }

    // Check active bookings limit for logged-in users
    if (user) {
      try {
        const activeCount = await countActiveBookings(user.id);
        if (settings && activeCount >= settings.maximum_active_bookings) {
          setSubmitError(`Hai raggiunto il limite di ${settings.maximum_active_bookings} prenotazioni attive.`);
          return;
        }
      } catch {
        // ignore — proceed
      }
    }

    setSubmitting(true);
    try {
      const booking = await createBooking({
        court_id: selectedCourt.id,
        booking_date: selectedDate,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        customer_name: name.trim(),
        customer_email: email.trim(),
        customer_phone: phone.trim() || undefined,
        price,
        customer_notes: notes.trim() || undefined,
        user_id: user?.id ?? null,
      });
      setConfirmedId(booking.id);
      setStep('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore durante la prenotazione.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetFlow = () => {
    setSelectedDate('');
    setSelectedCourtId('');
    setSelectedSlot(null);
    setStep('date');
    setConfirmedId(null);
    setSubmitError(null);
    navigate('/prenota');
  };

  if (courtsLoading || settingsLoading) return <FullSpinner />;
  if (courtsError) return <ErrorState message="Impossibile caricare i campi. Riprova più tardi." />;

  // Done step
  if (step === 'done' && selectedCourt && selectedSlot) {
    return (
      <div className="container-page py-12">
        <div className="mx-auto max-w-2xl">
          <div className="card p-8 text-center animate-scaleIn">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-court-100 text-court-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink-900">Prenotazione confermata!</h1>
            <p className="mt-2 text-ink-600">
              La tua prenotazione è stata registrata con successo. Riceverai una conferma via email.
            </p>
            <div className="mt-6 rounded-xl bg-ink-50 p-4 text-left text-sm">
              <p><span className="text-ink-500">Campo:</span> <span className="font-semibold">{selectedCourt.name}</span></p>
              <p><span className="text-ink-500">Data:</span> <span className="font-semibold capitalize">{formatDate(selectedDate)}</span></p>
              <p><span className="text-ink-500">Orario:</span> <span className="font-semibold">{formatTime(selectedSlot.start)} – {formatTime(selectedSlot.end)}</span></p>
              <p><span className="text-ink-500">Prezzo:</span> <span className="font-semibold">{formatPrice(price)}</span></p>
              <p className="mt-2 text-xs text-ink-500">Pagamento presso la struttura.</p>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button onClick={resetFlow} className="btn-primary">Nuova prenotazione</button>
              {user && (
                <button onClick={() => navigate('/le-mie-prenotazioni')} className="btn-secondary">
                  Le mie prenotazioni
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stepOrder: Step[] = ['date', 'court', 'slot', 'details', 'confirm'];
  const currentStepIndex = stepOrder.indexOf(step);

  return (
    <div className="container-page py-8">
      <h1 className="font-display text-3xl font-bold text-ink-900 mb-2">Prenota un campo</h1>
      <p className="text-ink-600 mb-6">Segui i passaggi per completare la prenotazione.</p>

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {['Data', 'Campo', 'Orario', 'Dati', 'Conferma'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
              i <= currentStepIndex ? 'bg-court-600 text-white' : 'bg-ink-100 text-ink-400',
            )}>
              {i + 1}
            </div>
            <span className={cn('text-sm whitespace-nowrap', i <= currentStepIndex ? 'text-ink-800 font-medium' : 'text-ink-400')}>
              {label}
            </span>
            {i < 4 && <div className="hidden sm:block w-6 h-px bg-ink-200" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Step: Date */}
          {step === 'date' && (
            <div className="animate-fadeIn">
              <h2 className="font-display text-lg font-bold text-ink-900 mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-court-600" /> Scegli la data
              </h2>
              <Calendar
                monthDate={monthDate}
                selected={selectedDate}
                minDate={minDate}
                maxDate={maxDate}
                onSelect={handleDateSelect}
                onPrevMonth={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
                onNextMonth={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
              />
              {selectedDate && (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-court-50 p-4">
                  <p className="text-sm text-court-800">
                    <span className="font-semibold capitalize">{formatDate(selectedDate)}</span> selezionata
                  </p>
                  <button onClick={() => setStep('court')} className="btn-primary">
                    Avanti <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step: Court */}
          {step === 'court' && (
            <div className="animate-fadeIn">
              <h2 className="font-display text-lg font-bold text-ink-900 mb-4 flex items-center gap-2">
                <Home className="h-5 w-5 text-court-600" /> Scegli il campo
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {courts.map((court) => (
                  <button
                    key={court.id}
                    onClick={() => handleCourtSelect(court)}
                    className={cn(
                      'card p-5 text-left transition-all hover:shadow-lift',
                      selectedCourtId === court.id && 'ring-2 ring-court-600',
                    )}
                  >
                    <h3 className="font-display text-base font-bold text-ink-900">{court.name}</h3>
                    <p className="mt-1 text-sm text-ink-600 line-clamp-2">{court.description}</p>
                    <div className="mt-3">
                      <CourtInfo court={court} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-court-700">{formatPrice(court.hourly_price)}/ora</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('date')} className="btn-ghost mt-4">
                <ArrowLeft className="h-4 w-4" /> Indietro
              </button>
            </div>
          )}

          {/* Step: Slot */}
          {step === 'slot' && selectedCourt && (
            <div className="animate-fadeIn">
              <h2 className="font-display text-lg font-bold text-ink-900 mb-1 flex items-center gap-2">
                <Clock className="h-5 w-5 text-court-600" /> Scegli l'orario
              </h2>
              <p className="text-sm text-ink-500 mb-4">
                {selectedCourt.name} · <span className="capitalize">{formatDate(selectedDate)}</span>
              </p>
              {slotsLoading ? (
                <FullSpinner label="Caricamento slot…" />
              ) : (
                <SlotGrid slots={slots} selected={selectedSlot?.start} onSelect={handleSlotSelect} />
              )}
              <div className="mt-4 flex items-center justify-between">
                <button onClick={() => setStep('court')} className="btn-ghost">
                  <ArrowLeft className="h-4 w-4" /> Indietro
                </button>
              </div>
            </div>
          )}

          {/* Step: Details */}
          {step === 'details' && selectedCourt && selectedSlot && (
            <div className="animate-fadeIn">
              <h2 className="font-display text-lg font-bold text-ink-900 mb-4">I tuoi dati</h2>
              {!user && settings?.guest_booking_enabled && (
                <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>Stai prenotando come ospite. <button onClick={() => navigate('/login', { state: { from: '/prenota' } })} className="link">Accedi</button> per gestire le tue prenotazioni.</p>
                </div>
              )}
              {!user && !settings?.guest_booking_enabled && (
                <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                  La prenotazione come ospite non è attiva. <button onClick={() => navigate('/registrati')} className="link">Registrati</button> per prenotare.
                </div>
              )}
              <div className="card p-5 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="bk-name" className="label">Nome e cognome *</label>
                    <input id="bk-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Mario Rossi" required />
                  </div>
                  <div>
                    <label htmlFor="bk-phone" className="label">Telefono</label>
                    <input id="bk-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+39 333 1234567" />
                  </div>
                </div>
                <div>
                  <label htmlFor="bk-email" className="label">Email *</label>
                  <input id="bk-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="mario.rossi@email.it" required />
                </div>
                <div>
                  <label htmlFor="bk-notes" className="label">Note (opzionale)</label>
                  <textarea id="bk-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-[80px] resize-y" placeholder="Eventuali richieste" />
                </div>
                <label className="flex items-start gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-ink-300 text-court-600 focus:ring-court-500"
                  />
                  <span>
                    Ho letto e accetto l'<a href="/privacy" className="link" target="_blank" rel="noopener">informativa privacy</a> e acconsento al trattamento dei miei dati. *
                  </span>
                </label>
              </div>
              {submitError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {submitError}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between">
                <button onClick={() => setStep('slot')} className="btn-ghost">
                  <ArrowLeft className="h-4 w-4" /> Indietro
                </button>
                <button
                  onClick={() => {
                    setSubmitError(null);
                    if (!name.trim() || !isValidEmail(email)) { setSubmitError("Inserisci nome e un'email valida."); return; }
                    if (!privacyConsent) { setSubmitError("Devi accettare l'informativa privacy."); return; }
                    setStep('confirm');
                  }}
                  className="btn-primary"
                >
                  Avanti <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && selectedCourt && selectedSlot && (
            <div className="animate-fadeIn">
              <h2 className="font-display text-lg font-bold text-ink-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-court-600" /> Conferma la prenotazione
              </h2>
              <BookingSummary
                court={selectedCourt}
                date={selectedDate}
                startTime={selectedSlot.start}
                endTime={selectedSlot.end}
                price={price}
                customerName={name}
                customerEmail={email}
                customerPhone={phone}
              />
              {submitError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {submitError}
                </div>
              )}
              <div className="mt-6 flex items-center justify-between">
                <button onClick={() => setStep('details')} className="btn-ghost" disabled={submitting}>
                  <ArrowLeft className="h-4 w-4" /> Indietro
                </button>
                <button onClick={handleConfirm} className="btn-primary" disabled={submitting}>
                  {submitting ? 'Conferma in corso…' : <>Conferma prenotazione <CheckCircle2 className="h-4 w-4" /></>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-20">
            {selectedCourt && selectedSlot && selectedDate ? (
              <BookingSummary
                court={selectedCourt}
                date={selectedDate}
                startTime={selectedSlot.start}
                endTime={selectedSlot.end}
                price={price}
                customerName={name || undefined}
                customerEmail={email || undefined}
                customerPhone={phone || undefined}
              />
            ) : (
              <div className="card p-6 text-center text-sm text-ink-500">
                <Lock className="mx-auto mb-2 h-6 w-6 text-ink-300" />
                Seleziona data, campo e orario per vedere il riepilogo.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
