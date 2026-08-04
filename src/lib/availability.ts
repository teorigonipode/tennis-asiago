import type { Booking, BookingSettings, CourtClosure, OpeningHour, TimeSlot } from '@/types';

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

export function getOpeningForDate(date: Date, hours: OpeningHour[]): OpeningHour | null {
  const dow = date.getDay();
  return hours.find((h) => h.day_of_week === dow) ?? null;
}

export function isCourtClosed(
  courtId: string,
  start: Date,
  end: Date,
  closures: CourtClosure[],
): boolean {
  return closures.some((c) => {
    if (c.court_id !== courtId) return false;
    const cs = new Date(c.start_at).getTime();
    const ce = new Date(c.end_at).getTime();
    return start.getTime() < ce && end.getTime() > cs;
  });
}

export function generateSlots(
  date: Date,
  opening: OpeningHour | null,
  settings: BookingSettings | null,
  bookings: Booking[],
  closures: CourtClosure[],
  courtId: string,
): TimeSlot[] {
  if (!opening || opening.is_closed || !settings) return [];
  const openMin = timeToMinutes(opening.opening_time);
  const closeMin = timeToMinutes(opening.closing_time);
  const slotLen = settings.slot_duration_minutes;

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const minAdvanceMs = settings.minimum_advance_minutes * 60 * 1000;

  const slots: TimeSlot[] = [];
  for (let t = openMin; t + slotLen <= closeMin; t += slotLen) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setMinutes(t);

    const end = new Date(start);
    end.setMinutes(t + slotLen);

    const startStr = minutesToTime(t);
    const endStr = minutesToTime(t + slotLen);

    let available = true;
    let reason: string | undefined;

    if (start.getTime() < now.getTime()) {
      available = false;
      reason = 'Passato';
    } else if (start.getTime() - now.getTime() < minAdvanceMs) {
      available = false;
      reason = 'Troppo vicino';
    } else if (isCourtClosed(courtId, start, end, closures)) {
      available = false;
      reason = 'Manutenzione';
    } else {
      const taken = bookings.some(
        (b) =>
          b.court_id === courtId &&
          b.status !== 'cancelled' &&
          b.start_time === startStr &&
          b.end_time === endStr,
      );
      if (taken) {
        available = false;
        reason = 'Occupato';
      }
    }

    slots.push({ start: startStr, end: endStr, available, reason });
  }
  return slots;
}

export function isWithinAdvance(
  date: Date,
  settings: BookingSettings | null,
): { ok: boolean; reason?: string } {
  if (!settings) return { ok: true };
  const now = new Date();
  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + settings.maximum_advance_days);
  maxDate.setHours(23, 59, 59, 999);
  if (date.getTime() > maxDate.getTime()) {
    return { ok: false, reason: `Puoi prenotare al massimo ${settings.maximum_advance_days} giorni in anticipo.` };
  }
  return { ok: true };
}

export function canCancel(
  booking: { booking_date: string; start_time: string },
  settings: BookingSettings | null,
): { ok: boolean; reason?: string } {
  if (!settings) return { ok: true };
  const now = new Date();
  const start = new Date(`${booking.booking_date}T${booking.start_time}`);
  const diffMs = start.getTime() - now.getTime();
  const limitMs = settings.cancellation_limit_hours * 60 * 60 * 1000;
  if (diffMs < limitMs) {
    return {
      ok: false,
      reason: `Non puoi annullare a meno di ${settings.cancellation_limit_hours} ore dall'inizio.`,
    };
  }
  return { ok: true };
}
