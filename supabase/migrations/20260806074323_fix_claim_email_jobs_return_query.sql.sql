-- Fix claim_email_jobs: UPDATE...RETURNING inside plpgsql needs proper handling
-- The previous version used RETURNING in UPDATE which doesn't work as function return
-- without RETURN QUERY. Using a CTE approach instead.

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
  RETURN QUERY
  WITH claimed AS (
    UPDATE public.email_log AS e
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
      e.retry_count
  )
  SELECT * FROM claimed;
END;
$function$;

-- Re-apply correct grants
REVOKE EXECUTE ON FUNCTION public.claim_email_jobs(uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_jobs(uuid, text[]) TO service_role;
