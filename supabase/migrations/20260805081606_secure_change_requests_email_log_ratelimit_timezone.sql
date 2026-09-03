-- ============================================================
-- Secure change requests, email_log operational, rate limiting, timezone
-- ============================================================

-- 1. Revoke public EXECUTE on old insecure create_change_request
REVOKE EXECUTE ON FUNCTION public.create_change_request(
  uuid, date, time without time zone, uuid, text
) FROM anon, authenticated;

-- 2. Create secure create_change_request_by_code_email
CREATE OR REPLACE FUNCTION public.create_change_request_by_code_email(
  p_public_code text,
  p_email text,
  p_requested_date date DEFAULT NULL,
  p_requested_start_time time without time zone DEFAULT NULL,
  p_requested_court_id uuid DEFAULT NULL,
  p_customer_notes text DEFAULT NULL
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
BEGIN
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
  text, text, date, time without time zone, uuid, text
) TO anon, authenticated;

-- ============================================================
-- 3. Add operational columns to email_log
-- ============================================================
ALTER TABLE public.email_log
  ADD COLUMN IF NOT EXISTS change_request_id uuid REFERENCES public.booking_change_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_email text,
  ADD COLUMN IF NOT EXISTS provider_message_id text;

-- ============================================================
-- 4. Rate limiting table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limit_deny_all" ON public.rate_limit_attempts;
CREATE POLICY "rate_limit_deny_all"
ON public.rate_limit_attempts
FOR ALL
USING (false)
WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier_action_created
ON public.rate_limit_attempts (identifier, action, created_at DESC);

-- ============================================================
-- 5. Rate limit check function (SHA-256 hashed identifier)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_ip_hash text;
BEGIN
  v_ip_hash := extensions.digest(p_identifier, 'sha256');

  SELECT count(*) INTO v_count
  FROM public.rate_limit_attempts
  WHERE identifier = v_ip_hash
    AND action = p_action
    AND created_at > now() - (p_window_minutes || ' minutes')::interval;

  IF v_count >= p_max_attempts THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limit_attempts (identifier, action)
  VALUES (v_ip_hash, p_action);

  RETURN true;
END;
$function$;

-- ============================================================
-- 6. Cleanup old rate limit entries
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.rate_limit_attempts
  WHERE created_at < now() - '24 hours'::interval;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$function$;

-- ============================================================
-- 7. Fix timezone in create_guest_booking (Europe/Rome)
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_guest_booking(
  p_court_id uuid,
  p_booking_date date,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(id uuid, public_code text, management_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking_id uuid;
  v_public_code text;
  v_token text;
  v_token_hash text;
  v_court_active boolean;
  v_day_of_week int;
  v_opening_time time;
  v_closing_time time;
  v_is_closed boolean;
  v_closure_exists boolean;
  v_overlap_exists boolean;
  v_settings record;
  v_now_rome timestamptz;
  v_today_rome date;
  v_start_ts timestamptz;
  v_end_ts timestamptz;
BEGIN
  v_now_rome := now() AT TIME ZONE 'Europe/Rome';
  v_today_rome := (v_now_rome)::date;

  IF p_first_name IS NULL OR trim(p_first_name) = '' THEN
    RAISE EXCEPTION 'Il nome è obbligatorio.';
  END IF;

  IF p_last_name IS NULL OR trim(p_last_name) = '' THEN
    RAISE EXCEPTION 'Il cognome è obbligatorio.';
  END IF;

  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RAISE EXCEPTION 'Il telefono è obbligatorio.';
  END IF;

  SELECT * INTO v_settings FROM public.booking_settings LIMIT 1;

  IF v_settings.guest_email_required
     AND (p_email IS NULL OR trim(p_email) = '') THEN
    RAISE EXCEPTION 'L''email è obbligatoria per prenotare.';
  END IF;

  IF p_booking_date < v_today_rome THEN
    RAISE EXCEPTION 'Non è possibile prenotare nel passato.';
  END IF;

  IF p_booking_date > v_today_rome + v_settings.maximum_advance_days THEN
    RAISE EXCEPTION 'Data fuori dal range consentito.';
  END IF;

  v_start_ts := (p_booking_date::text || ' ' || p_start_time::text)::timestamp AT TIME ZONE 'Europe/Rome';
  v_end_ts := (p_booking_date::text || ' ' || p_end_time::text)::timestamp AT TIME ZONE 'Europe/Rome';

  IF p_booking_date = v_today_rome THEN
    IF extract(epoch FROM (v_start_ts - v_now_rome)) / 60 < v_settings.minimum_advance_minutes THEN
      RAISE EXCEPTION 'Preavviso insufficiente per questo orario.';
    END IF;
  END IF;

  SELECT c.is_active INTO v_court_active
  FROM public.courts AS c WHERE c.id = p_court_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campo non trovato.';
  END IF;

  IF NOT v_court_active THEN
    RAISE EXCEPTION 'Questo campo non è attualmente disponibile.';
  END IF;

  v_day_of_week := extract(dow FROM p_booking_date);

  SELECT oh.opening_time, oh.closing_time, oh.is_closed
  INTO v_opening_time, v_closing_time, v_is_closed
  FROM public.opening_hours AS oh
  WHERE oh.day_of_week = v_day_of_week;

  IF NOT FOUND OR v_is_closed THEN
    RAISE EXCEPTION 'Il circolo è chiuso in questo giorno.';
  END IF;

  IF p_start_time < v_opening_time OR p_end_time > v_closing_time THEN
    RAISE EXCEPTION 'L''orario selezionato è fuori dagli orari di apertura.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.court_closures AS cc
    WHERE (cc.court_id = p_court_id OR cc.court_id IS NULL)
      AND tstzrange(cc.start_at, cc.end_at) && tstzrange(v_start_ts, v_end_ts)
  ) INTO v_closure_exists;

  IF v_closure_exists THEN
    RAISE EXCEPTION 'Il campo è chiuso per manutenzione in questo periodo.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.bookings AS b
    WHERE b.court_id = p_court_id
      AND b.status IN ('pending', 'confirmed')
      AND b.booking_date = p_booking_date
      AND tstzrange(
        (b.booking_date::text || ' ' || b.start_time::text)::timestamp AT TIME ZONE 'Europe/Rome',
        (b.booking_date::text || ' ' || b.end_time::text)::timestamp AT TIME ZONE 'Europe/Rome'
      ) && tstzrange(v_start_ts, v_end_ts)
  ) INTO v_overlap_exists;

  IF v_overlap_exists THEN
    RAISE EXCEPTION 'Questo orario è appena stato prenotato da un altro utente. Scegli un altro slot.';
  END IF;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_token_hash := extensions.digest(v_token, 'sha256');
  v_public_code := generate_public_code();

  INSERT INTO public.bookings AS b (
    court_id, booking_date, start_time, end_time,
    customer_first_name, customer_last_name, customer_name,
    customer_email, customer_phone,
    price, status, payment_status,
    customer_notes, public_code, management_token_hash
  )
  VALUES (
    p_court_id, p_booking_date, p_start_time, p_end_time,
    trim(p_first_name), trim(p_last_name),
    trim(p_first_name) || ' ' || trim(p_last_name),
    trim(coalesce(p_email, '')), trim(p_phone),
    0, 'confirmed', 'not_required',
    p_notes, v_public_code, v_token_hash
  )
  RETURNING b.id INTO v_booking_id;

  RETURN QUERY SELECT v_booking_id, v_public_code, v_token;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_guest_booking(
  uuid, date, time without time zone, time without time zone,
  text, text, text, text, text
) TO anon, authenticated;

-- ============================================================
-- 8. Fix timezone in cancel_booking_by_code_email (Europe/Rome)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_booking_by_code_email(
  p_public_code text,
  p_email text
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
BEGIN
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

GRANT EXECUTE ON FUNCTION public.cancel_booking_by_code_email(text, text) TO anon, authenticated;

-- ============================================================
-- 9. Fix timezone in lookup_booking_by_code_email (Europe/Rome)
-- ============================================================
CREATE OR REPLACE FUNCTION public.lookup_booking_by_code_email(
  p_public_code text,
  p_email text
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
BEGIN
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

GRANT EXECUTE ON FUNCTION public.lookup_booking_by_code_email(text, text) TO anon, authenticated;
