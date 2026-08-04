export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
}

export interface Court {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  surface: string;
  is_indoor: boolean;
  has_lighting: boolean;
  image_url: string | null;
  hourly_price: number;
  is_active: boolean;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type PaymentStatus = 'not_required' | 'pending' | 'paid' | 'refunded' | 'failed';

export interface Booking {
  id: string;
  created_at: string;
  user_id: string | null;
  court_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  price: number;
  status: BookingStatus;
  customer_notes: string | null;
  admin_notes: string | null;
  cancelled_at: string | null;
  payment_status: PaymentStatus;
}

export interface BookingWithCourt extends Booking {
  court: Court;
}

export interface CourtClosure {
  id: string;
  created_at: string;
  court_id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
  created_by: string | null;
}

export interface OpeningHour {
  id: string;
  day_of_week: number;
  opening_time: string;
  closing_time: string;
  is_closed: boolean;
}

export interface BookingSettings {
  id: string;
  slot_duration_minutes: number;
  maximum_advance_days: number;
  minimum_advance_minutes: number;
  cancellation_limit_hours: number;
  maximum_active_bookings: number;
  guest_booking_enabled: boolean;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  reason?: string;
}

export interface NewBookingInput {
  court_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  price: number;
  customer_notes?: string;
  user_id?: string | null;
}
