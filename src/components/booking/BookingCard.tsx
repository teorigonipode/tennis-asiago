import { CalendarDays, Clock, MapPin, Euro, X } from 'lucide-react';
import type { BookingWithCourt } from '@/types';
import { formatDate, formatTime, formatPrice } from '@/lib/utils';
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/ui/StatusBadge';

interface BookingCardProps {
  booking: BookingWithCourt;
  onCancel?: (booking: BookingWithCourt) => void;
  canCancel?: boolean;
  cancelReason?: string;
}

export function BookingCard({ booking, onCancel, canCancel, cancelReason }: BookingCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-bold text-ink-900">{booking.court.name}</h3>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="mt-1 text-xs text-ink-500">
            Prenotazione del {new Date(booking.created_at).toLocaleDateString('it-IT')}
          </p>
        </div>
        <PaymentStatusBadge status={booking.payment_status} />
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-sm text-ink-700">
          <CalendarDays className="h-4 w-4 text-court-600" />
          <span className="capitalize">{formatDate(booking.booking_date)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-ink-700">
          <Clock className="h-4 w-4 text-court-600" />
          {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
        </div>
        <div className="flex items-center gap-2 text-sm text-ink-700">
          <MapPin className="h-4 w-4 text-court-600" />
          {booking.court.surface} · {booking.court.is_indoor ? 'Coperto' : 'Scoperto'}
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-800">
          <Euro className="h-4 w-4 text-court-600" />
          {formatPrice(booking.price)}
        </div>
      </dl>

      {booking.customer_notes && (
        <p className="mt-3 rounded-lg bg-ink-50 p-3 text-sm text-ink-600">
          Note: {booking.customer_notes}
        </p>
      )}

      {onCancel && booking.status !== 'cancelled' && (
        <div className="mt-4 border-t border-ink-100 pt-4">
          {canCancel ? (
            <button onClick={() => onCancel(booking)} className="btn-danger w-full sm:w-auto">
              <X className="h-4 w-4" /> Annulla prenotazione
            </button>
          ) : (
            <p className="text-xs text-ink-400">{cancelReason ?? 'Annullamento non più disponibile.'}</p>
          )}
        </div>
      )}
    </div>
  );
}
