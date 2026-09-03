-- Drop existing create_guest_booking so we can replace it
DROP FUNCTION IF EXISTS public.create_guest_booking(
  uuid, date, time without time zone, time without time zone, text, text, text, text, text
);

-- Revoke check_rate_limit from public roles
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer) FROM anon, authenticated, PUBLIC;

-- Idempotency unique constraint for email_log
CREATE UNIQUE INDEX IF NOT EXISTS email_log_booking_template_unique
  ON public.email_log (booking_id, template_type, recipient_type)
  WHERE status IN ('pending', 'processing');

-- Index for pending job lookup
CREATE INDEX IF NOT EXISTS email_log_pending_idx
  ON public.email_log (status, created_at)
  WHERE status = 'pending';

-- ============================================================
-- create_guest_booking with server-side email job creation
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_guest_booking(
  p_court_id uuid,
  p_booking_date date,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text,
  p_notes text
)
RETURNS TABLE(
  id uuid,
  public_code text,
  management_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking record;
  v_settings record;
  v_now_rome timestamptz;
  v_start_ts timestamptz;
  v_end_ts timestamptz;
  v_public_code text;
  v_management_token text;
  v_management_token_hash text;
  v_court record;
  v_day_of_week integer;
  v_is_closed boolean;
  v_overlap_count integer;
  v_identifier text;
  v_admin_email text;
BEGIN
  v_identifier := COALESCE(p_email, 'guest_booking');
  IF NOT check_rate_limit(v_identifier, 'guest_booking', 5, 15) THEN
    RAISE EXCEPTION 'Troppi tentativi di prenotazione. Riprova tra qualche minuto.';
  END IF;

  IF p_court_id IS NULL THEN RAISE EXCEPTION 'Seleziona un campo.'; END IF;
  IF p_booking_date IS NULL THEN RAISE EXCEPTION 'Seleziona una data.'; END IF;
  IF p_start_time IS NULL OR p_end_time IS NULL THEN RAISE EXCEPTION 'Seleziona un orario.'; END IF;

  p_first_name := trim(coalesce(p_first_name, ''));
  p_last_name := trim(coalesce(p_last_name, ''));
  p_email := lower(trim(coalesce(p_email, '')));
  p_phone := trim(coalesce(p_phone, ''));
  p_notes := trim(coalesce(p_notes, ''));

  IF p_first_name = '' OR p_last_name = '' THEN RAISE EXCEPTION 'Inserisci nome e cognome.'; END IF;
  IF p_email = '' OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RAISE EXCEPTION 'Inserisci un''email valida.'; END IF;
  IF p_phone = '' THEN RAISE EXCEPTION 'Inserisci un numero di telefono.'; END IF;

  SELECT * INTO v_settings FROM public.booking_settings LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Configurazione non disponibile.'; END IF;

  v_now_rome := now() AT TIME ZONE 'Europe/Rome';
  v_start_ts := (p_booking_date::text || ' ' || p_start_time::text)::timestamp AT TIME ZONE 'Europe/Rome';
  v_end_ts := (p_booking_date::text || ' ' || p_end_time::text)::timestamp AT TIME ZONE 'Europe/Rome';

  IF v_start_ts <= v_now_rome THEN
    RAISE EXCEPTION 'Non puoi prenotare un orario già passato.';
  END IF;

  IF extract(epoch FROM (v_start_ts - v_now_rome)) / 3600 < v_settings.min_advance_hours THEN
    RAISE EXCEPTION 'Prenotazione troppo ravvicinata. Anticipo minimo: % ore.', v_settings.min_advance_hours;
  END IF;

  IF v_settings.max_advance_days IS NOT NULL
     AND p_booking_date > (v_now_rome::date + v_settings.max_advance_days) THEN
    RAISE EXCEPTION 'Data troppo lontana. Massimo % giorni di anticipo.', v_settings.max_advance_days;
  END IF;

  IF v_end_ts <= v_start_ts THEN RAISE EXCEPTION 'L''orario di fine deve essere successivo all''inizio.'; END IF;

  SELECT * INTO v_court FROM public.courts WHERE id = p_court_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campo non disponibile.'; END IF;

  v_day_of_week := extract(dow FROM v_start_ts);
  SELECT is_closed INTO v_is_closed FROM public.opening_hours WHERE day_of_week = v_day_of_week;
  IF v_is_closed THEN RAISE EXCEPTION 'Il circolo è chiuso in questo giorno.'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.court_closures
    WHERE court_id = p_court_id
      AND p_booking_date BETWEEN start_date AND COALESCE(end_date, start_date)
  ) THEN
    RAISE EXCEPTION 'Il campo è chiuso per manutenzione in questa data.';
  END IF;

  SELECT count(*) INTO v_overlap_count
  FROM public.bookings
  WHERE court_id = p_court_id
    AND booking_date = p_booking_date
    AND status IN ('pending', 'confirmed')
    AND start_time < p_end_time
    AND end_time > p_start_time;
  IF v_overlap_count > 0 THEN RAISE EXCEPTION 'Slot già occupato.'; END IF;

  v_public_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  v_management_token := encode(gen_random_bytes(24), 'hex');
  v_management_token_hash := encode(digest(v_management_token, 'sha256'), 'hex');

  INSERT INTO public.bookings (
    court_id, booking_date, start_time, end_time,
    customer_name, customer_email, customer_phone, customer_notes,
    public_code, management_token_hash, status, price
  )
  VALUES (
    p_court_id, p_booking_date, p_start_time, p_end_time,
    p_first_name || ' ' || p_last_name, p_email, p_phone, p_notes,
    v_public_code, v_management_token_hash, 'confirmed', 0
  )
  RETURNING * INTO v_booking;

  -- Create email jobs server-side (same transaction)
  v_admin_email := COALESCE(current_setting('app.booking_admin_email', true), '');
  INSERT INTO public.email_log (booking_id, template_type, recipient_type, recipient_email, status)
  VALUES
    (v_booking.id, 'booking_confirmation', 'customer', p_email, 'pending'),
    (v_booking.id, 'booking_notification', 'admin', v_admin_email, 'pending')
  ON CONFLICT DO NOTHING;

  RETURN QUERY
  SELECT v_booking.id, v_booking.public_code, v_management_token;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_guest_booking(
  uuid, date, time without time zone, time without time zone, text, text, text, text, text
) TO anon, authenticated;

-- ============================================================
-- cancel_booking_by_code_email with server-side email job creation
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
  v_admin_email text;
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
  SET status = 'cancelled', cancelled_at = now(), updated_at = now()
  WHERE id = v_booking.id;

  v_admin_email := COALESCE(current_setting('app.booking_admin_email', true), '');
  INSERT INTO public.email_log (booking_id, template_type, recipient_type, recipient_email, status)
  VALUES
    (v_booking.id, 'cancellation_confirmation', 'customer', v_booking.customer_email, 'pending'),
    (v_booking.id, 'cancellation_notification', 'admin', v_admin_email, 'pending')
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cancel_booking_by_code_email(text, text, text) TO anon, authenticated;

-- ============================================================
-- create_change_request_by_code_email with server-side email job creation
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
  v_admin_email text;
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

  v_admin_email := COALESCE(current_setting('app.booking_admin_email', true), '');
  INSERT INTO public.email_log (booking_id, change_request_id, template_type, recipient_type, recipient_email, status)
  VALUES
    (v_booking.id, v_request_id, 'change_request_confirmation', 'customer', v_booking.customer_email, 'pending'),
    (v_booking.id, v_request_id, 'change_request_notification', 'admin', v_admin_email, 'pending')
  ON CONFLICT DO NOTHING;

  RETURN v_request_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_change_request_by_code_email(
  text, text, date, time without time zone, uuid, text, text
) TO anon, authenticated;
