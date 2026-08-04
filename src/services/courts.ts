import { supabase } from '@/lib/supabase';
import type { Court } from '@/types';

export async function fetchCourts(activeOnly = true): Promise<Court[]> {
  let query = supabase.from('courts').select('*').order('name');
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Court[];
}

export async function fetchCourtById(id: string): Promise<Court | null> {
  const { data, error } = await supabase
    .from('courts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Court | null;
}

export async function createCourt(input: Partial<Court>): Promise<Court> {
  const { data, error } = await supabase
    .from('courts')
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Court;
}

export async function updateCourt(id: string, input: Partial<Court>): Promise<Court> {
  const { data, error } = await supabase
    .from('courts')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Court;
}

export async function deleteCourt(id: string): Promise<void> {
  const { error } = await supabase.from('courts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
