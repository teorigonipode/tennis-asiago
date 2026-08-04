import type { BookingStatus, PaymentStatus } from '@/types';

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value) || 0);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const WEEKDAYS = [
  'Domenica',
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
];

export const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'In attesa',
  confirmed: 'Confermata',
  cancelled: 'Annullata',
  completed: 'Completata',
  no_show: 'Non presentato',
};

export const BOOKING_STATUS_COLOR: Record<BookingStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-court-100 text-court-800',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-ink-100 text-ink-700',
  no_show: 'bg-clay-100 text-clay-700',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  not_required: 'Non richiesto',
  pending: 'In attesa',
  paid: 'Pagato',
  refunded: 'Rimborsato',
  failed: 'Fallito',
};

export const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  not_required: 'bg-ink-100 text-ink-600',
  pending: 'bg-amber-100 text-amber-800',
  paid: 'bg-court-100 text-court-800',
  refunded: 'bg-sky-100 text-sky-700',
  failed: 'bg-red-100 text-red-700',
};

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^[+]?[\d\s()-]{6,20}$/.test(phone);
}
