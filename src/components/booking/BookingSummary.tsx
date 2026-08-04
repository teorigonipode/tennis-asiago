import { CalendarDays, Clock, MapPin, Euro } from 'lucide-react';
import type { Court } from '@/types';
import { formatDate, formatTime, formatPrice } from '@/lib/utils';

interface BookingSummaryProps {
  court: Court;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export function BookingSummary({
  court,
  date,
  startTime,
  endTime,
  price,
  customerName,
  customerEmail,
  customerPhone,
}: BookingSummaryProps) {
  return (
    <div className="card divide-y divide-ink-100">
      <div className="p-5">
        <h3 className="font-display text-base font-bold text-ink-900">Riepilogo prenotazione</h3>
      </div>
      <dl className="divide-y divide-ink-50">
        <div className="flex items-center gap-3 p-4">
          <CalendarDays className="h-5 w-5 text-court-600" />
          <div>
            <dt className="text-xs text-ink-500">Data</dt>
            <dd className="text-sm font-semibold capitalize text-ink-800">{formatDate(date)}</dd>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <Clock className="h-5 w-5 text-court-600" />
          <div>
            <dt className="text-xs text-ink-500">Orario</dt>
            <dd className="text-sm font-semibold text-ink-800">
              {formatTime(startTime)} – {formatTime(endTime)}
            </dd>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <MapPin className="h-5 w-5 text-court-600" />
          <div>
            <dt className="text-xs text-ink-500">Campo</dt>
            <dd className="text-sm font-semibold text-ink-800">{court.name}</dd>
            <dd className="text-xs text-ink-500">{court.surface} · {court.is_indoor ? 'Coperto' : 'Scoperto'}</dd>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4">
          <Euro className="h-5 w-5 text-court-600" />
          <div>
            <dt className="text-xs text-ink-500">Prezzo</dt>
            <dd className="text-sm font-semibold text-ink-800">{formatPrice(price)}</dd>
            <dd className="text-xs text-ink-500">Pagamento presso la struttura</dd>
          </div>
        </div>
        {customerName && (
          <div className="p-4">
            <dt className="text-xs text-ink-500 mb-1">Intestatario</dt>
            <dd className="text-sm text-ink-800">
              <p className="font-semibold">{customerName}</p>
              <p className="text-ink-600">{customerEmail}</p>
              {customerPhone && <p className="text-ink-600">{customerPhone}</p>}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
