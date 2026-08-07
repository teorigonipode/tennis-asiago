-- Remove legacy create_guest_booking overload that accepted p_price.
-- The 9-arg version (without p_price) is the only one that should exist.
-- PostgREST could not disambiguate when the frontend omitted p_price because
-- both overloads matched (p_price had DEFAULT 0).

-- 1. Drop the 10-arg overload (with numeric p_price)
DROP FUNCTION IF EXISTS public.create_guest_booking(
  uuid,
  date,
  time without time zone,
  time without time zone,
  text,
  text,
  text,
  text,
  text,
  numeric
);

-- 2. Re-grant EXECUTE on the surviving 9-arg function (already exists, just ensure)
GRANT EXECUTE ON FUNCTION public.create_guest_booking(
  uuid,
  date,
  time without time zone,
  time without time zone,
  text,
  text,
  text,
  text,
  text
) TO anon, authenticated;
