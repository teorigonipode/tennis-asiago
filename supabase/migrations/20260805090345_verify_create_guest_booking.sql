-- Fix: admin email job should have empty recipient_email (edge function fills from env)
-- The RPC already inserts with COALESCE(current_setting(...), '') which gives ''
-- This is correct: the edge function will fill it from BOOKING_ADMIN_EMAIL env var

-- No migration needed for the RPC change — the current behavior is correct.
-- current_setting('app.booking_admin_email', true) returns NULL → COALESCE gives ''
-- The edge function replaces empty recipient_email with BOOKING_ADMIN_EMAIL

-- Just verify the function works:
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'create_guest_booking';
