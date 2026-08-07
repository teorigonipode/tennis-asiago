-- ============================================================
-- 1. Re-revoke EXECUTE on old insecure create_change_request
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.create_change_request(
  uuid, date, time without time zone, uuid, text
) FROM anon, authenticated;

-- ============================================================
-- 2. Add operational columns to email_log
-- ============================================================
ALTER TABLE public.email_log
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz;

-- ============================================================
-- 3. Add rate limiting to lookup_booking_by_code_email
-- ============================================================
CREATE OR REPLACE FUNCTION public.lookup_booking_by_code_email(
  p_public_code text,
  p_email text,
  p_client_ip text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  public_code text,
  court_name text,
  booking_date date,
  start_time time without time zone,
  end_time time without time zone,
  status text,
  cancellation_limit_hours integer,
  can_cancel boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking record;
  v_settings record;
  v_start_ts timestamptz;
  v_now_rome timestamptz;
  v_can_cancel boolean;
  v_identifier text;
BEGIN
  -- Rate limit
  v_identifier := COALESCE(p_client_ip, p_email);
  IF NOT check_rate_limit(v_identifier, 'lookup_booking', 5, 15) THEN
    RAISE EXCEPTION 'Troppi tentativi. Riprova tra qualche minuto.';
  END IF;

  p_public_code := trim(upper(p_public_code));
  p_email := lower(trim(p_email));

  SELECT b.id, b.public_code, b.court_id, b.booking_date, b.start_time, b.end_time,
         b.status, b.customer_email
  INTO v_booking
  FROM public.bookings b
  WHERE b.public_code = p_public_code
    AND lower(trim(b.customer_email)) = p_email
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prenotazione non trovata o dati non corretti.';
  END IF;

  SELECT * INTO v_settings FROM public.booking_settings LIMIT 1;

  v_now_rome := now() AT TIME ZONE 'Europe/Rome';
  v_start_ts := (v_booking.booking_date::text || ' ' || v_booking.start_time::text)::timestamp AT TIME ZONE 'Europe/Rome';
  v_can_cancel := (
    v_booking.status IN ('pending', 'confirmed')
    AND extract(epoch FROM (v_start_ts - v_now_rome)) / 3600 >= v_settings.cancellation_limit_hours
  );

  RETURN QUERY
  SELECT
    v_booking.id,
    v_booking.public_code,
    c.name AS court_name,
    v_booking.booking_date,
    v_booking.start_time,
    v_booking.end_time,
    v_booking.status,
    v_settings.cancellation_limit_hours,
    v_can_cancel;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.lookup_booking_by_code_email(text, text, text) TO anon, authenticated;

-- ============================================================
-- 4. Add rate limiting to cancel_booking_by_code_email
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_booking_by_code_email(
  p_public_code text,
  p_email text,
  p_client_ip text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking record;
  v_settings record;
  v_start_ts timestamptz;
  v_now_rome timestamptz;
  v_identifier text;
BEGIN
  v_identifier := COALESCE(p_client_ip, p_email);
  IF NOT check_rate_limit(v_identifier, 'cancel_booking', 5, 15) THEN
    RAISE EXCEPTION 'Troppi tentativi. Riprova tra qualche minuto.';
  END IF;

  p_public_code := trim(upper(p_public_code));
  p_email := lower(trim(p_email));

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE public_code = p_public_code
    AND lower(trim(customer_email)) = p_email
    AND status IN ('pending', 'confirmed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prenotazione non trovata o dati non corretti.';
  END IF;

  SELECT * INTO v_settings FROM public.booking_settings LIMIT 1;

  v_now_rome := now() AT TIME ZONE 'Europe/Rome';
  v_start_ts := (v_booking.booking_date::text || ' ' || v_booking.start_time::text)::timestamp AT TIME ZONE 'Europe/Rome';

  IF extract(epoch FROM (v_start_ts - v_now_rome)) / 3600 < v_settings.cancellation_limit_hours THEN
    RAISE EXCEPTION 'Non è più possibile annullare questa prenotazione (termine superato).';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  WHERE id = v_booking.id;

  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cancel_booking_by_code_email(text, text, text) TO anon, authenticated;

-- ============================================================
-- 5. Add rate limiting to create_change_request_by_code_email
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_change_request_by_code_email(
  p_public_code text,
  p_email text,
  p_requested_date date DEFAULT NULL,
  p_requested_start_time time without time zone DEFAULT NULL,
  p_requested_court_id uuid DEFAULT NULL,
  p_customer_notes text DEFAULT NULL,
  p_client_ip text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking record;
  v_request_id uuid;
  v_court_exists boolean;
  v_identifier text;
BEGIN
  v_identifier := COALESCE(p_client_ip, p_email);
  IF NOT check_rate_limit(v_identifier, 'change_request', 5, 15) THEN
    RAISE EXCEPTION 'Troppi tentativi. Riprova tra qualche minuto.';
  END IF;

  p_public_code := trim(upper(p_public_code));
  p_email := lower(trim(p_email));

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE public_code = p_public_code
    AND lower(trim(customer_email)) = p_email
    AND status IN ('pending', 'confirmed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prenotazione non trovata o dati non corretti.';
  END IF;

  IF p_requested_date IS NULL
     AND p_requested_start_time IS NULL
     AND p_requested_court_id IS NULL
     AND (p_customer_notes IS NULL OR trim(p_customer_notes) = '') THEN
    RAISE EXCEPTION 'Indica almeno una preferenza di modifica.';
  END IF;

  IF p_requested_court_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.courts WHERE id = p_requested_court_id AND is_active = true)
    INTO v_court_exists;
    IF NOT v_court_exists THEN
      RAISE EXCEPTION 'Il campo selezionato non è disponibile.';
    END IF;
  END IF;

  INSERT INTO public.booking_change_requests (
    booking_id, requested_date, requested_start_time, requested_court_id, customer_notes
  )
  VALUES (
    v_booking.id, p_requested_date, p_requested_start_time, p_requested_court_id,
    trim(coalesce(p_customer_notes, ''))
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_change_request_by_code_email(
  text, text, date, time without time zone, uuid, text, text
) TO anon, authenticated;
