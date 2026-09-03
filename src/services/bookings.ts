import { supabase } from '@/lib/supabase';
import type { Booking, BookingWithCourt, GuestBookingInput, GuestBookingResult, Court } from '@/types';

function mapBooking(b: Record<string, unknown>): BookingWithCourt {
  return { ...(b as unknown as Booking), court: b.courts as Court } as BookingWithCourt;
}

export async function fetchBookingsByCourtAndDate(
  courtId: string,
  date: string,
): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, court_id, booking_date, start_time, end_time, status')
    .eq('court_id', courtId)
    .eq('booking_date', date)
    .in('status', ['pending', 'confirmed'])
    .order('start_time');
  if (error) throw new Error(error.message);
  return (data || []) as Booking[];
}

export async function fetchAllBookings(): Promise<BookingWithCourt[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, courts(*)')
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapBooking);
}

export async function fetchBookingsRange(startDate: string, endDate: string): Promise<BookingWithCourt[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, courts(*)')
    .gte('booking_date', startDate)
    .lte('booking_date', endDate)
    .order('booking_date')
    .order('start_time');
  if (error) throw new Error(error.message);
  return (data || []).map(mapBooking);
}

export async function createGuestBooking(
  input: GuestBookingInput,
): Promise<GuestBookingResult> {
  const { data, error } = await supabase.rpc('create_guest_booking', {
    p_court_id: input.court_id,
    p_booking_date: input.booking_date,
    p_start_time: input.start_time,
    p_end_time: input.end_time,
    p_first_name: input.first_name,
    p_last_name: input.last_name,
    p_phone: input.phone,
    p_email: input.email ?? null,
    p_notes: input.notes ?? null,
  });

  if (error) throw new Error(error.message);

  const result = Array.isArray(data) ? data[0] : data;

  if (!result) {
    throw new Error(
      'La prenotazione è stata creata, ma la risposta del server è vuota.',
    );
  }

  return result as GuestBookingResult;
}

export async function createAdminBooking(input: {
  court_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_notes?: string;
  admin_notes?: string;
}): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      ...input,
      status: 'confirmed',
      payment_status: 'not_required',
      created_by_admin: true,
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23P01') {
      throw new Error('Sovrapposizione con un\'altra prenotazione su questo campo.');
    }
    throw new Error(error.message);
  }
  return data as Booking;
}

export async function cancelBooking(id: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteBooking(id: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateBooking(id: string, input: Partial<Booking>): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (error.code === '23P01') {
      throw new Error('Sovrapposizione con un\'altra prenotazione su questo campo.');
    }
    throw new Error(error.message);
  }
  return data as Booking;
}
