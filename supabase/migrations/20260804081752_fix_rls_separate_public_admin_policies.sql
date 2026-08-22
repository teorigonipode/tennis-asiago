/*
# Fix RLS policies: separate public from admin, use is_admin() SECURITY DEFINER

## Problem
Admin policies use inline `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')`.
These subqueries run with the *caller's* privileges. Since anon has no SELECT
on `profiles`, any policy evaluation that touches profiles fails with:
  "permission denied for table profiles"

This affects anon SELECT on courts (and potentially other tables) because
PostgreSQL may evaluate policy expressions during planning even if the TO
clause excludes the role.

## Fix
1. Recreate `is_admin()` as SECURITY DEFINER, STABLE, search_path = public.
   Grant EXECUTE only to authenticated (not anon). The function runs as its
   owner (postgres), bypassing the caller's lack of SELECT on profiles.
2. Replace ALL inline `EXISTS (SELECT 1 FROM profiles ...)` in admin policies
   with `public.is_admin()`.
3. Ensure public SELECT policies never reference profiles or is_admin().
4. Audit every table:
   - courts: public SELECT (is_active), admin SELECT (is_admin)
   - opening_hours: public SELECT (true), admin write (is_admin)
   - booking_settings: public SELECT (true), admin write (is_admin)
   - court_closures: public SELECT (true), admin write (is_admin)
   - bookings: authenticated SELECT (own OR is_admin), admin write (is_admin)
   - profiles: authenticated SELECT (own OR is_admin), self INSERT, self UPDATE (no role change)
5. Do NOT grant SELECT on profiles to anon.

## Tables affected
- courts, opening_hours, booking_settings, court_closures, bookings, profiles

## Security
- anon can only SELECT public tables (courts active, opening_hours, court_closures, booking_settings)
- anon cannot SELECT bookings or profiles
- authenticated can SELECT/INSERT/UPDATE/DELETE per ownership or admin check
- profiles.role is not updatable by non-admin users (WITH CHECK enforces role = 'user')
- is_admin() is not callable by anon (no EXECUTE grant)
*/

-- ============================================================
-- Step 1: Recreate is_admin() as SECURITY DEFINER, STABLE
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$function$;

-- Revoke from everyone, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- Step 2: courts — separate public and admin SELECT policies
-- ============================================================
DROP POLICY IF EXISTS "courts_select_public_active" ON public.courts;
DROP POLICY IF EXISTS "courts_select_admin" ON public.courts;
DROP POLICY IF EXISTS "courts_admin_insert" ON public.courts;
DROP POLICY IF EXISTS "courts_admin_update" ON public.courts;
DROP POLICY IF EXISTS "courts_admin_delete" ON public.courts;

-- Public: anyone can see active courts
CREATE POLICY "courts_select_public_active"
ON public.courts FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Admin: can see all courts (including inactive)
CREATE POLICY "courts_select_admin"
ON public.courts FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admin write
CREATE POLICY "courts_admin_insert"
ON public.courts FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "courts_admin_update"
ON public.courts FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "courts_admin_delete"
ON public.courts FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- Step 3: opening_hours — public SELECT, admin write
-- ============================================================
DROP POLICY IF EXISTS "opening_select_public" ON public.opening_hours;
DROP POLICY IF EXISTS "opening_admin_insert" ON public.opening_hours;
DROP POLICY IF EXISTS "opening_admin_update" ON public.opening_hours;
DROP POLICY IF EXISTS "opening_admin_delete" ON public.opening_hours;

CREATE POLICY "opening_select_public"
ON public.opening_hours FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "opening_admin_insert"
ON public.opening_hours FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "opening_admin_update"
ON public.opening_hours FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "opening_admin_delete"
ON public.opening_hours FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- Step 4: booking_settings — public SELECT, admin write
-- ============================================================
DROP POLICY IF EXISTS "settings_select_public" ON public.booking_settings;
DROP POLICY IF EXISTS "settings_admin_insert" ON public.booking_settings;
DROP POLICY IF EXISTS "settings_admin_update" ON public.booking_settings;
DROP POLICY IF EXISTS "settings_admin_delete" ON public.booking_settings;

CREATE POLICY "settings_select_public"
ON public.booking_settings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "settings_admin_insert"
ON public.booking_settings FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "settings_admin_update"
ON public.booking_settings FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "settings_admin_delete"
ON public.booking_settings FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- Step 5: court_closures — public SELECT, admin write
-- ============================================================
DROP POLICY IF EXISTS "closures_select_public" ON public.court_closures;
DROP POLICY IF EXISTS "closures_admin_insert" ON public.court_closures;
DROP POLICY IF EXISTS "closures_admin_update" ON public.court_closures;
DROP POLICY IF EXISTS "closures_admin_delete" ON public.court_closures;

CREATE POLICY "closures_select_public"
ON public.court_closures FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "closures_admin_insert"
ON public.court_closures FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "closures_admin_update"
ON public.court_closures FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "closures_admin_delete"
ON public.court_closures FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- Step 6: bookings — authenticated only, own OR admin
-- ============================================================
DROP POLICY IF EXISTS "bookings_select_own_or_admin" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_admin" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_own_or_admin" ON public.bookings;
DROP POLICY IF EXISTS "bookings_delete_admin" ON public.bookings;

-- Authenticated users see their own bookings; admins see all
CREATE POLICY "bookings_select_own_or_admin"
ON public.bookings FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

-- Only admins can insert directly (guest bookings go via RPC)
CREATE POLICY "bookings_insert_admin"
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Owner or admin can update
CREATE POLICY "bookings_update_own_or_admin"
ON public.bookings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Only admin can delete
CREATE POLICY "bookings_delete_admin"
ON public.bookings FOR DELETE
TO authenticated
USING (public.is_admin());

-- ============================================================
-- Step 7: profiles — authenticated only, own OR admin
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

-- Users see their own profile; admins see all
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

-- Self-insert (also done by trigger, but policy allows direct insert)
CREATE POLICY "profiles_insert_self"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Self-update: can only change own profile, and cannot escalate role
-- Admin can update (but role change still blocked by column privilege)
CREATE POLICY "profiles_update_self"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = 'user');

-- Separate admin update policy: admin can update any profile
CREATE POLICY "profiles_update_admin"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================
-- Step 8: Ensure grants are correct
-- ============================================================
-- anon: SELECT only on public tables, no bookings/profiles
GRANT SELECT ON public.courts TO anon;
GRANT SELECT ON public.opening_hours TO anon;
GRANT SELECT ON public.court_closures TO anon;
GRANT SELECT ON public.booking_settings TO anon;
REVOKE ALL PRIVILEGES ON public.bookings FROM anon;
REVOKE ALL PRIVILEGES ON public.profiles FROM anon;

-- authenticated: full DML on all tables (RLS controls actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opening_hours TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.court_closures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Column-level: profiles.role not updatable by authenticated
REVOKE UPDATE (role) ON public.profiles FROM authenticated;
GRANT UPDATE (first_name, last_name, email, phone) ON public.profiles TO authenticated;

-- RPC grants
GRANT EXECUTE ON FUNCTION public.create_guest_booking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_by_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_slot_availability TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
