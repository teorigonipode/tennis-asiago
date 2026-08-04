import { supabase } from '@/lib/supabase';
import type { BookingSettings, OpeningHour, CourtClosure } from '@/types';

export async function fetchSettings(): Promise<BookingSettings | null> {
  const { data, error } = await supabase
    .from('booking_settings')
    .select('*')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as BookingSettings | null;
}

export async function updateSettings(id: string, input: Partial<BookingSettings>): Promise<BookingSettings> {
  const { data, error } = await supabase
    .from('booking_settings')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as BookingSettings;
}

export async function fetchOpeningHours(): Promise<OpeningHour[]> {
  const { data, error } = await supabase
    .from('opening_hours')
    .select('*')
    .order('day_of_week');
  if (error) throw new Error(error.message);
  return (data || []) as OpeningHour[];
}

export async function updateOpeningHour(id: string, input: Partial<OpeningHour>): Promise<OpeningHour> {
  const { data, error } = await supabase
    .from('opening_hours')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as OpeningHour;
}

export async function fetchClosures(): Promise<CourtClosure[]> {
  const { data, error } = await supabase
    .from('court_closures')
    .select('*')
    .order('start_at');
  if (error) throw new Error(error.message);
  return (data || []) as CourtClosure[];
}

export async function createClosure(input: Partial<CourtClosure>): Promise<CourtClosure> {
  const { data, error } = await supabase
    .from('court_closures')
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CourtClosure;
}

export async function deleteClosure(id: string): Promise<void> {
  const { error } = await supabase.from('court_closures').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
