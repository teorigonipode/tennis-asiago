-- Fix ambiguous column references in claim_email_jobs
-- The RETURNING * inside a SECURITY DEFINER function with TABLE return type
-- causes column references in WHERE to be ambiguous between table columns
-- and output column names.

CREATE OR REPLACE FUNCTION public.claim_email_jobs(p_booking_id uuid, p_template_types text[])
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
  UPDATE public.email_log e
  SET status = 'processing',
      last_attempt_at = now(),
      updated_at = now()
  WHERE e.booking_id = p_booking_id
    AND e.template_type = ANY(p_template_types)
    AND e.status IN ('pending', 'failed')
  RETURNING
    e.id,
    e.booking_id,
    e.change_request_id,
    e.template_type,
    e.recipient_type,
    e.recipient_email,
    e.status,
    e.retry_count;
END;
$function$;

-- Re-apply correct grants
REVOKE EXECUTE ON FUNCTION public.claim_email_jobs(uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_jobs(uuid, text[]) TO service_role;
