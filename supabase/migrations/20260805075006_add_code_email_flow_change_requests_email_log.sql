/*
# Add booking management by code+email, change requests, email log, harden RPCs

## Summary
This migration implements the definitive booking management flow:
- New RPCs for code+email lookup and cancellation (replacing token-based flow)
- New table for booking change requests
- New table for email send log
- Hardened create_guest_booking (removes client-supplied price)
- Deprecates cancel_booking_by_token (revokes public grants)

## New Tables
1. booking_change_requests — customer modification requests linked to a booking
2. email_log — tracks email send status for each booking event

## New RPCs
1. lookup_booking_by_code_email(p_public_code, p_email) — returns minimal DTO
2. cancel_booking_by_code_email(p_public_code, p_email) — soft-cancels booking
3. create_change_request(p_booking_id, p_requested_date, p_requested_start_time, p_requested_court_id, p_customer_notes)

## Modified Functions
1. create_guest_booking — removes p_price parameter, sets price=0 server-side
2. cancel_booking_by_token — grants revoked (deprecated)

## Security
- All new RPCs are SECURITY DEFINER with search_path = public
- lookup returns only essential fields (no internal data)
- cancel validates code+email match and cancellation limit
- change request does not modify the booking
- email_log is admin-only (no anon/authenticated SELECT)
- RLS enabled on all new tables
*/

-- ============================================================
-- 1. booking_change_requests table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.booking_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  requested_date date,
  requested_start_time time without time zone,
  requested_court_id uuid REFERENCES public.courts(id) ON DELETE SET NULL,
  customer_notes text,
  admin_notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.booking_change_requests ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
DROP POLICY IF EXISTS "change_requests_select_admin" ON public.booking_change_requests;
CREATE POLICY "change_requests_select_admin"
ON public.booking_change_requests FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "change_requests_update_admin" ON public.booking_change_requests;
CREATE POLICY "change_requests_update_admin"
ON public.booking_change_requests FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "change_requests_delete_admin" ON public.booking_change_requests;
CREATE POLICY "change_requests_delete_admin"
ON public.booking_change_requests FOR DELETE
TO authenticated
USING (public.is_admin());

-- No direct INSERT from anon/authenticated (RPC handles it via SECURITY DEFINER)

-- ============================================================
-- 2. email_log table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  recipient_type text NOT NULL CHECK (recipient_type IN ('customer', 'admin')),
  template_type text NOT NULL CHECK (template_type IN (
    'booking_confirmation', 'booking_notification',
    'cancellation_confirmation', 'cancellation_notification',
    'change_request_confirmation', 'change_request_notification',
    'change_completed_notification', 'manual_resend'
  )),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  sent_at timestamptz,
  last_error text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
DROP POLICY IF EXISTS "email_log_select_admin" ON public.email_log;
CREATE POLICY "email_log_select_admin"
ON public.email_log FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "email_log_update_admin" ON public.email_log;
CREATE POLICY "email_log_update_admin"
ON public.email_log FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "email_log_insert_admin" ON public.email_log;
CREATE POLICY "email_log_insert_admin"
ON public.email_log FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- ============================================================
-- 3. lookup_booking_by_code_email RPC
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
  v_can_cancel boolean;
BEGIN
  -- Normalize inputs
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
    -- Generic error: do not reveal which field is wrong
    RAISE EXCEPTION 'Prenotazione non trovata o dati non corretti.';
  END IF;

  -- Get settings for cancellation limit
  SELECT * INTO v_settings FROM public.booking_settings LIMIT 1;

  -- Check if cancellation is still possible
  v_start_ts := (v_booking.booking_date::timestamptz + v_booking.start_time);
  v_can_cancel := (
    v_booking.status IN ('pending', 'confirmed')
    AND extract(epoch FROM (v_start_ts - now())) / 3600 >= v_settings.cancellation_limit_hours
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

-- ============================================================
-- 4. cancel_booking_by_code_email RPC
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
BEGIN
  -- Normalize inputs
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

  -- Check cancellation limit
  SELECT * INTO v_settings FROM public.booking_settings LIMIT 1;
  v_start_ts := (v_booking.booking_date::timestamptz + v_booking.start_time);

  IF extract(epoch FROM (v_start_ts - now())) / 3600 < v_settings.cancellation_limit_hours THEN
    RAISE EXCEPTION 'Non è più possibile annullare questa prenotazione (termine superato).';
  END IF;

  -- Soft cancel: update status, cancelled_at, updated_at
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
-- 5. create_change_request RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_change_request(
  p_booking_id uuid,
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
  v_request_id uuid;
  v_booking record;
BEGIN
  -- Verify booking exists and is active
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
    AND status IN ('pending', 'confirmed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prenotazione non trovata o non più modificabile.';
  END IF;

  -- Validate at least one field is provided
  IF p_requested_date IS NULL AND p_requested_start_time IS NULL AND p_requested_court_id IS NULL AND (p_customer_notes IS NULL OR trim(p_customer_notes) = '') THEN
    RAISE EXCEPTION 'Indica almeno una preferenza di modifica.';
  END IF;

  -- Insert the change request (does NOT modify the booking)
  INSERT INTO public.booking_change_requests (
    booking_id,
    requested_date,
    requested_start_time,
    requested_court_id,
    customer_notes
  )
  VALUES (
    p_booking_id,
    p_requested_date,
    p_requested_start_time,
    p_requested_court_id,
    trim(coalesce(p_customer_notes, ''))
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_change_request(uuid, date, time without time zone, uuid, text) TO anon, authenticated;

-- ============================================================
-- 6. Harden create_guest_booking: remove p_price parameter
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_guest_booking(
  p_court_id uuid,
  p_booking_date date,
  p_start_time time without time zone,
  p_end_time time without time zone,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text DEFAULT NULL::text,
  p_notes text DEFAULT NULL::text
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

  SELECT * INTO v_settings FROM public.booking_settings LIMIT 1;

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

  SELECT c.is_active INTO v_court_active
  FROM public.courts AS c WHERE c.id = p_court_id;

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
    SELECT 1 FROM public.court_closures AS cc
    WHERE (cc.court_id = p_court_id OR cc.court_id IS NULL)
      AND tstzrange(cc.start_at, cc.end_at) &&
          tstzrange(p_booking_date::timestamptz + p_start_time,
                    p_booking_date::timestamptz + p_end_time)
  ) INTO v_closure_exists;

  IF v_closure_exists THEN
    RAISE EXCEPTION 'Il campo è chiuso per manutenzione in questo periodo.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.bookings AS b
    WHERE b.court_id = p_court_id
      AND b.status IN ('pending', 'confirmed')
      AND b.booking_date = p_booking_date
      AND tstzrange(b.booking_date::timestamptz + b.start_time,
                    b.booking_date::timestamptz + b.end_time) &&
          tstzrange(p_booking_date::timestamptz + p_start_time,
                    p_booking_date::timestamptz + p_end_time)
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

-- Re-grant with new signature (no p_price)
GRANT EXECUTE ON FUNCTION public.create_guest_booking(
  uuid, date, time without time zone, time without time zone,
  text, text, text, text, text
) TO anon, authenticated;

-- ============================================================
-- 7. Deprecate cancel_booking_by_token: revoke public grants
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.cancel_booking_by_token(text, text) FROM anon, authenticated;

-- ============================================================
-- 8. Grants for new tables
-- ============================================================
GRANT SELECT ON public.booking_change_requests TO authenticated;
GRANT SELECT, UPDATE, INSERT, DELETE ON public.booking_change_requests TO authenticated;
GRANT SELECT ON public.email_log TO authenticated;
GRANT SELECT, UPDATE, INSERT ON public.email_log TO authenticated;

-- ============================================================
-- 9. Add updated_at trigger for email_log
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS email_log_set_updated_at ON public.email_log;
CREATE TRIGGER email_log_set_updated_at
BEFORE UPDATE ON public.email_log
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
