export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  created_at: string;
  updated_at: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
}

export interface Court {
  id: string;
  created_at: string;
  updated_at: string | null;
  name: string;
  description: string | null;
  surface: string;
  is_indoor: boolean;
  has_lighting: boolean;
  image_url: string | null;
  hourly_price: number;
  is_active: boolean;
  display_order: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type PaymentStatus = 'not_required' | 'pending' | 'paid' | 'refunded' | 'failed';

export interface Booking {
  id: string;
  created_at: string;
  updated_at: string | null;
  user_id: string | null;
  court_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string;
  customer_phone: string | null;
  number_of_players: number;
  price: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  customer_notes: string | null;
  admin_notes: string | null;
  public_code: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_by_admin: boolean;
}

export interface BookingWithCourt extends Booking {
  court: Court;
}

export interface GuestBookingResult {
  id: string;
  public_code: string;
  management_token: string;
}

export interface CourtClosure {
  id: string;
  created_at: string;
  updated_at: string | null;
  court_id: string | null;
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
  season_start: string | null;
  season_end: string | null;
}

export interface BookingSettings {
  id: string;
  slot_duration_minutes: number;
  maximum_advance_days: number;
  minimum_advance_minutes: number;
  cancellation_limit_hours: number;
  allow_consecutive_slots: boolean;
  guest_email_required: boolean;
  currency: string;
  updated_at: string | null;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  reason?: string;
}

export interface GuestBookingInput {
  court_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface BookingLookupResult {
  id: string;
  public_code: string;
  court_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  cancellation_limit_hours: number;
  can_cancel: boolean;
}
