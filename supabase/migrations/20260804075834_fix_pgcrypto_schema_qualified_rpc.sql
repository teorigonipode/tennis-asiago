/*
# Fix pgcrypto function references in SECURITY DEFINER RPCs

## Problem
The functions `create_guest_booking` and `cancel_booking_by_token` call
`gen_random_bytes()` and `digest()` without schema qualification. These are
pgcrypto functions exposed in the `extensions` schema, not `public`. Since both
functions are SECURITY DEFINER with `search_path = 'public'`, the unqualified
calls fail with:
  "function gen_random_bytes(integer) does not exist"

## Fix
1. Ensure pgcrypto extension is enabled.
2. Recreate both functions with schema-qualified calls:
   - `extensions.gen_random_bytes(24)` instead of `gen_random_bytes(24)`
   - `extensions.digest(value, 'sha256')` instead of `digest(value, 'sha256')`
3. Also qualify `encode()` — it's a built-in pg function in `pg_catalog`, which
   is always in search_path, but qualifying makes the intent explicit.

## Functions affected
- `public.create_guest_booking` — uses gen_random_bytes + digest
- `public.cancel_booking_by_token` — uses digest

## Security
No security changes. Functions remain SECURITY DEFINER with search_path = public.
Only the pgcrypto call sites are qualified to the extensions schema.
*/

-- Step 1: Ensure pgcrypto is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Recreate create_guest_booking with qualified pgcrypto references
CREATE OR REPLACE FUNCTION public.create_guest_booking(
  p_court_id uuid,
  p_booking_date date,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text,
  p_price numeric DEFAULT 0
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
BEGIN
  IF p_first_name IS NULL OR trim(p_first_name) = '' THEN
    RAISE EXCEPTION 'Il nome è obbligatorio.';
  END IF;

  IF p_last_name IS NULL OR trim(p_last_name) = '' THEN
    RAISE EXCEPTION 'Il cognome è obbligatorio.';
  END IF;

  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RAISE EXCEPTION 'Il telefono è obbligatorio.';
  END IF;

  SELECT *
  INTO v_settings
  FROM public.booking_settings
  LIMIT 1;

  IF v_settings.guest_email_required
     AND (p_email IS NULL OR trim(p_email) = '') THEN
    RAISE EXCEPTION 'L''email è obbligatoria per prenotare.';
  END IF;

  IF p_booking_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Non è possibile prenotare nel passato.';
  END IF;

  IF p_booking_date >
     CURRENT_DATE + (v_settings.maximum_advance_days || ' days')::interval THEN
    RAISE EXCEPTION 'Data fuori dal range consentito.';
  END IF;

  IF p_booking_date = CURRENT_DATE THEN
    IF extract(epoch from (now()::time - p_start_time)) / 60 >
       v_settings.minimum_advance_minutes * -1 THEN
      RAISE EXCEPTION 'Preavviso insufficiente per questo orario.';
    END IF;
  END IF;

  SELECT c.is_active
  INTO v_court_active
  FROM public.courts AS c
  WHERE c.id = p_court_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campo non trovato.';
  END IF;

  IF NOT v_court_active THEN
    RAISE EXCEPTION 'Questo campo non è attualmente disponibile.';
  END IF;

  v_day_of_week := extract(dow FROM p_booking_date::timestamp);

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
    SELECT 1
    FROM public.court_closures AS cc
    WHERE (cc.court_id = p_court_id OR cc.court_id IS NULL)
      AND tstzrange(cc.start_at, cc.end_at) &&
          tstzrange(
            p_booking_date::timestamptz + p_start_time,
            p_booking_date::timestamptz + p_end_time
          )
  )
  INTO v_closure_exists;

  IF v_closure_exists THEN
    RAISE EXCEPTION 'Il campo è chiuso per manutenzione in questo periodo.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.bookings AS b
    WHERE b.court_id = p_court_id
      AND b.status IN ('pending', 'confirmed')
      AND b.booking_date = p_booking_date
      AND tstzrange(
            b.booking_date::timestamptz + b.start_time,
            b.booking_date::timestamptz + b.end_time
          ) &&
          tstzrange(
            p_booking_date::timestamptz + p_start_time,
            p_booking_date::timestamptz + p_end_time
          )
  )
  INTO v_overlap_exists;

  IF v_overlap_exists THEN
    RAISE EXCEPTION 'Questo orario è appena stato prenotato da un altro utente. Scegli un altro slot.';
  END IF;

  -- Qualified pgcrypto calls: extensions schema
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_token_hash := extensions.digest(v_token, 'sha256');
  v_public_code := generate_public_code();

  INSERT INTO public.bookings AS b (
    court_id,
    booking_date,
    start_time,
    end_time,
    customer_first_name,
    customer_last_name,
    customer_name,
    customer_email,
    customer_phone,
    price,
    status,
    payment_status,
    customer_notes,
    public_code,
    management_token_hash
  )
  VALUES (
    p_court_id,
    p_booking_date,
    p_start_time,
    p_end_time,
    trim(p_first_name),
    trim(p_last_name),
    trim(p_first_name) || ' ' || trim(p_last_name),
    trim(coalesce(p_email, '')),
    trim(p_phone),
    p_price,
    'confirmed',
    'not_required',
    p_notes,
    v_public_code,
    v_token_hash
  )
  RETURNING b.id INTO v_booking_id;

  RETURN QUERY
  SELECT v_booking_id, v_public_code, v_token;
END;
$function$;

-- Step 3: Recreate cancel_booking_by_token with qualified pgcrypto references
CREATE OR REPLACE FUNCTION public.cancel_booking_by_token(
  p_public_code text,
  p_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking record;
  v_token_hash text;
  v_settings record;
  v_start_ts timestamptz;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE public_code = p_public_code
    AND status IN ('pending', 'confirmed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prenotazione non trovata o già annullata.';
  END IF;

  -- Qualified pgcrypto call: extensions schema
  v_token_hash := extensions.digest(p_token, 'sha256');

  IF v_booking.management_token_hash IS NULL
     OR v_booking.management_token_hash != v_token_hash THEN
    RAISE EXCEPTION 'Token non valido.';
  END IF;

  -- Verifica limite cancellazione
  SELECT * INTO v_settings FROM public.booking_settings LIMIT 1;
  v_start_ts := (v_booking.booking_date::timestamptz + v_booking.start_time);

  IF extract(epoch from (v_start_ts - now())) / 3600 < v_settings.cancellation_limit_hours THEN
    RAISE EXCEPTION 'Non è più possibile annullare questa prenotazione (termine superato).';
  END IF;

  UPDATE public.bookings
  SET status = 'cancelled', cancelled_at = now()
  WHERE id = v_booking.id;

  RETURN true;
END;
$function$;

-- Re-grant EXECUTE to anon and authenticated (CREATE OR REPLACE preserves grants,
-- but be explicit to be safe)
GRANT EXECUTE ON FUNCTION public.create_guest_booking(uuid, date, time without time zone, time without time zone, text, text, text, text, text, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_by_token(text, text) TO anon, authenticated;
