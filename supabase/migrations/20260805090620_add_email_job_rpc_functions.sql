-- Create a SECURITY DEFINER function to claim and process email jobs
-- This bypasses RLS since the edge function's service role may not work as expected

CREATE OR REPLACE FUNCTION public.claim_email_jobs(
  p_booking_id uuid,
  p_template_types text[]
)
RETURNS TABLE(
  id uuid,
  booking_id uuid,
  change_request_id uuid,
  template_type text,
  recipient_type text,
  recipient_email text,
  status text,
  retry_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Atomically claim pending/failed jobs by setting status to 'processing'
  UPDATE public.email_log
  SET status = 'processing',
      last_attempt_at = now(),
      updated_at = now()
  WHERE booking_id = p_booking_id
    AND template_type = ANY(p_template_types)
    AND status IN ('pending', 'failed')
  RETURNING *;
END;
$function$;

-- Don't grant to anon/authenticated — only service role can call this
REVOKE EXECUTE ON FUNCTION public.claim_email_jobs(uuid, text[]) FROM anon, authenticated, PUBLIC;

-- Create function to update job status (also SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.update_email_job_status(
  p_job_id uuid,
  p_status text,
  p_provider_message_id text DEFAULT NULL,
  p_last_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.email_log
  SET status = p_status,
      updated_at = now(),
      last_attempt_at = now(),
      sent_at = CASE WHEN p_status = 'sent' THEN now() ELSE sent_at END,
      provider_message_id = COALESCE(p_provider_message_id, provider_message_id),
      last_error = COALESCE(p_last_error, last_error),
      retry_count = CASE WHEN p_status = 'sent' THEN retry_count ELSE retry_count + 1 END
  WHERE id = p_job_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.update_email_job_status(uuid, text, text, text) FROM anon, authenticated, PUBLIC;
