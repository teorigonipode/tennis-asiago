/*
# Harden database function permissions and fix lookup bug

## Changes

### 1. Fix admin booking: grant generate_public_code to authenticated
- generate_public_code() is called by trigger set_booking_public_code() during INSERT on bookings
- Admin operates as role "authenticated", but generate_public_code was only executable by service_role/postgres
- This caused "permission denied for function generate_public_code" when admin creates a booking
- Grant EXECUTE to authenticated so the trigger can call it

### 2. Fix profile role escalation: harden profiles_insert_self
- The policy profiles_insert_self allowed INSERT when auth.uid() = id but did NOT check role = 'user'
- A client could insert a profile with role = 'admin' and escalate privileges
- Now requires auth.uid() = id AND role = 'user'

### 3. Revoke cleanup_rate_limit from anon/authenticated
- cleanup_rate_limit() is an internal maintenance function
- Was executable by anon and authenticated — security hole
- Now only service_role and postgres can execute

### 4. Revoke unnecessary table privileges
- email_log: revoke TRUNCATE, TRIGGER, REFERENCES from anon and authenticated
- rate_limit_attempts: revoke TRUNCATE, TRIGGER, REFERENCES from anon and authenticated
- booking_change_requests: revoke TRUNCATE, TRIGGER, REFERENCES from anon and authenticated
- These privileges are not needed by PostgREST and bypass RLS

### 5. Fix lookup_booking_by_code_email court_name alias
- The RETURN QUERY used c.name but the alias c was not in scope
- Fixed by joining courts in the SELECT and using v_booking.court_name

### 6. Add CHECK constraint on profiles.role
- Ensures role can only be 'user' or 'admin'

### 7. Enable Realtime on bookings
- Required for TV dashboard realtime updates
*/

-- ============================================================
-- 1. Fix generate_public_code permission
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.generate_public_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_public_code() TO authenticated, service_role;

-- ============================================================
-- 2. Fix profile role escalation
-- ============================================================
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id AND role = 'user');

-- Add CHECK constraint on role (check existing values first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

-- ============================================================
-- 3. Revoke cleanup_rate_limit from public roles
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limit() TO service_role;

-- ============================================================
-- 4. Revoke unnecessary table privileges
-- ============================================================
-- email_log: only admin needs CRUD (via RLS), no TRUNCATE/TRIGGER/REFERENCES
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.email_log FROM anon, authenticated;

-- rate_limit_attempts: deny all direct access (RLS already denies via policy)
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.rate_limit_attempts FROM anon, authenticated;

-- booking_change_requests: no TRUNCATE/TRIGGER/REFERENCES needed
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.booking_change_requests FROM anon, authenticated;

-- ============================================================
-- 5. Fix lookup_booking_by_code_email court_name
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
  v_identifier := COALESCE(p_client_ip, p_email);
  IF NOT check_rate_limit(v_identifier, 'lookup_booking', 5, 15) THEN
    RAISE EXCEPTION 'Troppi tentativi. Riprova tra qualche minuto.';
  END IF;

  p_public_code := trim(upper(p_public_code));
  p_email := lower(trim(p_email));

  SELECT b.id, b.public_code, b.booking_date, b.start_time, b.end_time,
         b.status, b.customer_email, c.name AS court_name
  INTO v_booking
  FROM public.bookings b
  JOIN public.courts c ON c.id = b.court_id
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
    v_booking.court_name,
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
-- 6. Enable Realtime on bookings
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
