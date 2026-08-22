DROP FUNCTION IF EXISTS public.create_guest_booking(
  uuid, date, time without time zone, time without time zone, text, text, text, text, text
);

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

  IF extract(epoch FROM (v_start_ts - v_now_rome)) / 60 < v_settings.minimum_advance_minutes THEN
    RAISE EXCEPTION 'Prenotazione troppo ravvicinata.';
  END IF;

  IF v_settings.maximum_advance_days IS NOT NULL
     AND p_booking_date > (v_now_rome::date + v_settings.maximum_advance_days) THEN
    RAISE EXCEPTION 'Data troppo lontana.';
  END IF;

  IF v_end_ts <= v_start_ts THEN RAISE EXCEPTION 'L''orario di fine deve essere successivo all''inizio.'; END IF;

  SELECT * INTO v_court FROM public.courts c WHERE c.id = p_court_id AND c.is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campo non disponibile.'; END IF;

  v_day_of_week := extract(dow FROM v_start_ts);
  SELECT is_closed INTO v_is_closed FROM public.opening_hours WHERE day_of_week = v_day_of_week;
  IF v_is_closed THEN RAISE EXCEPTION 'Il circolo è chiuso in questo giorno.'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.court_closures
    WHERE court_id = p_court_id
      AND p_booking_date::date BETWEEN (start_at AT TIME ZONE 'Europe/Rome')::date
          AND COALESCE((end_at AT TIME ZONE 'Europe/Rome')::date, (start_at AT TIME ZONE 'Europe/Rome')::date)
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
