import { supabase } from '@/lib/supabase';
import type { Booking, BookingWithCourt, NewBookingInput } from '@/types';

function mapBooking(b: any): BookingWithCourt {
  return { ...b, court: b.courts } as BookingWithCourt;
}

export async function fetchUserBookings(userId: string): Promise<BookingWithCourt[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, courts(*)')
    .eq('user_id', userId)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapBooking);
}

export async function fetchBookingsByDate(date: string): Promise<BookingWithCourt[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, courts(*)')
    .eq('booking_date', date)
    .order('start_time');
  if (error) throw new Error(error.message);
  return (data || []).map(mapBooking);
}

export async function fetchBookingsByCourtAndDate(
  courtId: string,
  date: string,
): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
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

export async function createBooking(input: NewBookingInput): Promise<Booking> {
  const payload: Record<string, unknown> = { ...input };
  if (input.user_id === undefined) delete payload.user_id;
  const { data, error } = await supabase
    .from('bookings')
    .insert(payload)
    .select()
    .single();
  if (error) {
    if (error.code === '23P01') {
      throw new Error('Lo slot selezionato è già stato prenotato. Scegli un altro orario.');
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

export async function countActiveBookings(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['pending', 'confirmed'])
    .gte('booking_date', new Date().toISOString().slice(0, 10));
  if (error) throw new Error(error.message);
  return count || 0;
}
