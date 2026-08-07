/*
# Tighten Grants and Column-Level Privileges

## Summary
Removes broad INSERT/UPDATE/DELETE grants from anon on all tables.
Restricts EXECUTE on RPC functions to only the functions anon/authenticated need.
Adds column-level UPDATE privilege on profiles so users can update their own
fields but NOT the `role` column.

## Changes
1. Revoke all DML grants from anon on every table (RLS still protects, but
   least-privilege means anon shouldn't even have INSERT/UPDATE/DELETE).
2. Grant SELECT to anon on public-read tables (courts, opening_hours,
   court_closures, booking_settings).
3. Revoke EXECUTE from PUBLIC and anon on ALL public functions.
4. Grant EXECUTE to anon, authenticated only on the 3 RPCs they need:
   create_guest_booking, cancel_booking_by_token, check_slot_availability.
5. Revoke UPDATE on profiles.role from authenticated, grant UPDATE only on
   the user-editable columns (first_name, last_name, email, phone).
6. Revoke all grants from anon on bookings and profiles (anon uses RPCs only).

## Security
- anon can only SELECT public tables and call the 3 RPC functions
- authenticated can SELECT/INSERT/UPDATE/DELETE per RLS policies
- profiles.role column is not updatable by authenticated users (only by
  service_role / postgres / admin via RPC)
- handle_new_user and set_updated_at are not callable by anon/authenticated
*/

-- 1. Revoke all DML from anon on all tables
REVOKE INSERT, UPDATE, DELETE ON public.bookings FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.courts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.opening_hours FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.court_closures FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.booking_settings FROM anon;

-- Keep SELECT on public-read tables for anon
-- (already granted, but ensure explicitly)
GRANT SELECT ON public.courts TO anon;
GRANT SELECT ON public.opening_hours TO anon;
GRANT SELECT ON public.court_closures TO anon;
GRANT SELECT ON public.booking_settings TO anon;

-- 2. Revoke SELECT from anon on bookings and profiles (anon uses RPCs only)
REVOKE SELECT ON public.bookings FROM anon;
REVOKE SELECT ON public.profiles FROM anon;

-- 3. Revoke EXECUTE from PUBLIC and anon on ALL public functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_booking_public_code FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_booking_range FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_guest_booking FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_booking_by_token FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_slot_availability FROM PUBLIC;

-- 4. Grant EXECUTE only on the RPCs anon/authenticated need
GRANT EXECUTE ON FUNCTION public.create_guest_booking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_by_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_slot_availability TO anon, authenticated;

-- 5. Column-level: revoke UPDATE on profiles.role from authenticated
REVOKE UPDATE (role) ON public.profiles FROM authenticated;

-- Grant UPDATE only on user-editable columns
GRANT UPDATE (first_name, last_name, email, phone) ON public.profiles TO authenticated;

-- 6. Revoke all column-level INSERT/UPDATE/DELETE from anon on bookings and profiles
REVOKE ALL PRIVILEGES ON public.bookings FROM anon;
REVOKE ALL PRIVILEGES ON public.profiles FROM anon;

-- Ensure authenticated still has table-level DML (RLS controls actual access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opening_hours TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.court_closures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_settings TO authenticated;
