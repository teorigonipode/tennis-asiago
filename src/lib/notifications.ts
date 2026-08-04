/**
 * Architettura notifiche — Tennis Asiago
 *
 * Questa modulo definisce i template delle notifiche email.
 * Non dipende da un provider specifico: ogni funzione restituisce
 * il contenuto del messaggio (oggetto + corpo) pronto per essere
 * inviato tramite qualsiasi provider (Supabase Edge Functions,
 * Resend, SendGrid, ecc.).
 *
 * Per attivare l'invio reale, creare una Edge Function che:
 * 1. Riceve i dati della prenotazione
 * 2. Costruisce il template tramite queste funzioni
 * 3. Invia l'email tramite il provider configurato
 */

export interface EmailTemplate {
  subject: string;
  body: string;
}

interface BookingInfo {
  courtName: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  price: number;
}

function formatBookingLine(b: BookingInfo): string {
  return `Campo: ${b.courtName}\nData: ${b.date}\nOrario: ${b.startTime} - ${b.endTime}\nIntestatario: ${b.customerName}\nPrezzo: €${b.price.toFixed(2)}`;
}

export function bookingConfirmationEmail(b: BookingInfo): EmailTemplate {
  return {
    subject: 'Conferma prenotazione — Tennis Asiago',
    body: `Gentile ${b.customerName},

La tua prenotazione è stata confermata. Ecco i dettagli:

${formatBookingLine(b)}

Il pagamento avviene presso la struttura.

Ti aspettiamo sui campi!

Tennis Asiago`,
  };
}

export function bookingCancellationEmail(b: BookingInfo): EmailTemplate {
  return {
    subject: 'Prenotazione annullata — Tennis Asiago',
    body: `Gentile ${b.customerName},

La tua prenotazione è stata annullata. Riepilogo:

${formatBookingLine(b)}

Per prenotare un nuovo campo, visita il nostro sito.

Tennis Asiago`,
  };
}

export function bookingReminderEmail(b: BookingInfo): EmailTemplate {
  return {
    subject: 'Promemoria prenotazione — Tennis Asiago',
    body: `Gentile ${b.customerName},

Ti ricordiamo la tua prenotazione di domani:

${formatBookingLine(b)}

Ti aspettiamo sui campi!

Tennis Asiago`,
  };
}

export function adminNotificationEmail(b: BookingInfo): EmailTemplate {
  return {
    subject: 'Nuova prenotazione — Tennis Asiago',
    body: `È stata effettuata una nuova prenotazione:

${formatBookingLine(b)}

Accedi all'area amministrativa per gestire la prenotazione.`,
  };
}
