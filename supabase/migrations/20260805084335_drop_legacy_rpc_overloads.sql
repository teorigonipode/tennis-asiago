-- Drop old insecure create_change_request (no longer used by frontend)
DROP FUNCTION IF EXISTS public.create_change_request(
  uuid, date, time without time zone, uuid, text
);

-- Drop old 6-param overload of create_change_request_by_code_email (without p_client_ip)
DROP FUNCTION IF EXISTS public.create_change_request_by_code_email(
  text, text, date, time without time zone, uuid, text
);

-- Drop old 2-param overload of lookup_booking_by_code_email (without p_client_ip)
DROP FUNCTION IF EXISTS public.lookup_booking_by_code_email(
  text, text
);

-- Drop old 2-param overload of cancel_booking_by_code_email (without p_client_ip)
DROP FUNCTION IF EXISTS public.cancel_booking_by_code_email(
  text, text
);
