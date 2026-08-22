-- Add 'processing' status to email_log check constraint
-- The claim_email_jobs function needs to atomically set status to 'processing'
-- before sending, to prevent double-sending from concurrent callers.

ALTER TABLE public.email_log
  DROP CONSTRAINT IF EXISTS email_log_status_check;

ALTER TABLE public.email_log
  ADD CONSTRAINT email_log_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'sent'::text, 'failed'::text, 'skipped'::text]));
