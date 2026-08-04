import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Profile | null;
}

export async function upsertProfile(input: Partial<Profile> & { id: string }): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(input, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Profile;
}
