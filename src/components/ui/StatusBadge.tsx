import { cn } from '@/lib/utils';
import {
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_COLOR,
} from '@/lib/utils';
import type { BookingStatus, PaymentStatus } from '@/types';

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={cn('badge', BOOKING_STATUS_COLOR[status])}>
      {BOOKING_STATUS_LABEL[status]}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={cn('badge', PAYMENT_STATUS_COLOR[status])}>
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}
