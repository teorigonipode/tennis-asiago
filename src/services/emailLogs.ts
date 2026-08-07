import { supabase } from '@/lib/supabase';

export interface EmailLogEntry {
  id: string;
  booking_id: string | null;
  change_request_id: string | null;
  template_type: string;
  recipient_type: string;
  recipient_email: string | null;
  status: string;
  sent_at: string | null;
  last_attempt_at: string | null;
  retry_count: number;
  last_error: string | null;
  provider_message_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchEmailLogsForBooking(bookingId: string): Promise<EmailLogEntry[]> {
  const { data, error } = await supabase
    .from('email_log')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as EmailLogEntry[];
}

export async function retryEmail(bookingId: string): Promise<{ ok: boolean; message: string }> {
  const { error } = await supabase.functions.invoke('send-booking-email', {
    method: 'POST',
    body: {
      booking_id: bookingId,
      event_type: 'manual_resend',
    },
  });
  if (error) {
    return { ok: false, message: 'Errore durante il reinvio. Riprova.' };
  }
  return { ok: true, message: 'Email reinviata con successo.' };
}
