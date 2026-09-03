/*
# Asiago Tennis Booking — schema iniziale

1. Tabelle nuove
- `profiles`: profili utente (nome, cognome, email, telefono, ruolo).
- `courts`: campi da tennis (nome, descrizione, superficie, coperto, illuminazione, immagine, prezzo orario, attivo).
- `bookings`: prenotazioni (utente, campo, data, ora inizio/fine, dati cliente, prezzo, stato, note cliente/admin, annullata il, stato pagamento, range temporale calcolato via trigger).
- `court_closures`: chiusure campo per manutenzione o eventi.
- `opening_hours`: orari di apertura settimanali.
- `booking_settings`: impostazioni di prenotazione.
2. Estensioni
- `btree_gist`, `pgcrypto`.
3. Sicurezza
- RLS abilitata su tutte le tabelle.
- Funzione `is_admin()` per verificare il ruolo amministratore.
- Prenotazioni: utenti vedono/gestiscono solo le proprie; admin gestiscono tutte; inserimento consentito a autenticati e (se guest abilitato) anon.
- Campi attivi, orari, chiusure e impostazioni leggibili pubblicamente.
4. Vincoli
- Trigger popola `booking_range`; vincolo di esclusione su `bookings` impedisce sovrapposizioni stesso campo/orario (solo prenotazioni non annullate).
5. Dati demo
- 3 campi (Campo Centrale, Campo 2, Campo Coperto), orari, impostazioni.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  first_name text,
  last_name text,
  email text,
  phone text,
  role text NOT NULL DEFAULT 'user'
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- =========================================================
-- COURTS
-- =========================================================
CREATE TABLE IF NOT EXISTS courts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  description text,
  surface text NOT NULL DEFAULT 'Cemento',
  is_indoor boolean NOT NULL DEFAULT false,
  has_lighting boolean NOT NULL DEFAULT true,
  image_url text,
  hourly_price numeric(10,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courts_select_public_active" ON courts;
CREATE POLICY "courts_select_public_active"
ON courts FOR SELECT
TO anon, authenticated
USING (is_active = true OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "courts_admin_insert" ON courts;
CREATE POLICY "courts_admin_insert"
ON courts FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "courts_admin_update" ON courts;
CREATE POLICY "courts_admin_update"
ON courts FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "courts_admin_delete" ON courts;
CREATE POLICY "courts_admin_delete"
ON courts FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- =========================================================
-- BOOKINGS
-- =========================================================
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  court_id uuid NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  customer_notes text,
  admin_notes text,
  cancelled_at timestamptz,
  payment_status text NOT NULL DEFAULT 'not_required' CHECK (payment_status IN ('not_required','pending','paid','refunded','failed')),
  booking_range tstzrange
);

CREATE INDEX IF NOT EXISTS bookings_court_date_idx ON bookings (court_id, booking_date);
CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings (user_id);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);

CREATE OR REPLACE FUNCTION set_booking_range()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.booking_range := tstzrange(
    (NEW.booking_date::timestamptz + NEW.start_time),
    (NEW.booking_date::timestamptz + NEW.end_time)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_set_range ON bookings;
CREATE TRIGGER bookings_set_range
BEFORE INSERT OR UPDATE OF booking_date, start_time, end_time ON bookings
FOR EACH ROW EXECUTE FUNCTION set_booking_range();

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_no_overlap
      EXCLUDE USING gist (court_id WITH =, booking_range WITH &&)
      WHERE (status IN ('pending','confirmed'));
  END IF;
END $$;

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_own_or_admin" ON bookings;
CREATE POLICY "bookings_select_own_or_admin"
ON bookings FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "bookings_insert" ON bookings;
CREATE POLICY "bookings_insert"
ON bookings FOR INSERT
TO anon, authenticated
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "bookings_update_own_or_admin" ON bookings;
CREATE POLICY "bookings_update_own_or_admin"
ON bookings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "bookings_delete_admin" ON bookings;
CREATE POLICY "bookings_delete_admin"
ON bookings FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- =========================================================
-- COURT CLOSURES
-- =========================================================
CREATE TABLE IF NOT EXISTS court_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  court_id uuid NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE court_closures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "closures_select_public" ON court_closures;
CREATE POLICY "closures_select_public"
ON court_closures FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "closures_admin_insert" ON court_closures;
CREATE POLICY "closures_admin_insert"
ON court_closures FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "closures_admin_update" ON court_closures;
CREATE POLICY "closures_admin_update"
ON court_closures FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "closures_admin_delete" ON court_closures;
CREATE POLICY "closures_admin_delete"
ON court_closures FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- =========================================================
-- OPENING HOURS
-- =========================================================
CREATE TABLE IF NOT EXISTS opening_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opening_time time NOT NULL DEFAULT '08:00',
  closing_time time NOT NULL DEFAULT '20:00',
  is_closed boolean NOT NULL DEFAULT false,
  UNIQUE (day_of_week)
);

ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opening_select_public" ON opening_hours;
CREATE POLICY "opening_select_public"
ON opening_hours FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "opening_admin_insert" ON opening_hours;
CREATE POLICY "opening_admin_insert"
ON opening_hours FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "opening_admin_update" ON opening_hours;
CREATE POLICY "opening_admin_update"
ON opening_hours FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "opening_admin_delete" ON opening_hours;
CREATE POLICY "opening_admin_delete"
ON opening_hours FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- =========================================================
-- BOOKING SETTINGS
-- =========================================================
CREATE TABLE IF NOT EXISTS booking_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_duration_minutes integer NOT NULL DEFAULT 60,
  maximum_advance_days integer NOT NULL DEFAULT 30,
  minimum_advance_minutes integer NOT NULL DEFAULT 60,
  cancellation_limit_hours integer NOT NULL DEFAULT 24,
  maximum_active_bookings integer NOT NULL DEFAULT 5,
  guest_booking_enabled boolean NOT NULL DEFAULT true
);

ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_public" ON booking_settings;
CREATE POLICY "settings_select_public"
ON booking_settings FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "settings_admin_insert" ON booking_settings;
CREATE POLICY "settings_admin_insert"
ON booking_settings FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "settings_admin_update" ON booking_settings;
CREATE POLICY "settings_admin_update"
ON booking_settings FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "settings_admin_delete" ON booking_settings;
CREATE POLICY "settings_admin_delete"
ON booking_settings FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- =========================================================
-- FUNZIONE is_admin
-- =========================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- =========================================================
-- DATI DEMO
-- =========================================================
INSERT INTO courts (name, description, surface, is_indoor, has_lighting, image_url, hourly_price, is_active)
VALUES
  ('Campo Centrale', 'Il campo principale della struttura, scoperto, con terra rossa e vista sulle montagne di Asiago. Ideale per match competitivi.', 'Terra rossa', false, true, 'https://images.pexels.com/photos/2596535/pexels-photo-2596535.jpeg?auto=compress&cs=tinysrgb&w=1200', 30.00, true),
  ('Campo 2', 'Campo scoperto in cemento, ottimo per allenamenti e partite amatoriali. Esposto al sole nella stagione estiva.', 'Cemento', false, true, 'https://images.pexels.com/photos/1432039/pexels-photo-1432039.jpeg?auto=compress&cs=tinysrgb&w=1200', 25.00, true),
  ('Campo Coperto', 'Campo coperto con pavimentazione sintetica, utilizzabile in ogni condizione meteo. Illuminazione a LED per le ore serali.', 'Sintetico', true, true, 'https://images.pexels.com/photos/209977/pexels-photo-209977.jpeg?auto=compress&cs=tinysrgb&w=1200', 35.00, true)
ON CONFLICT DO NOTHING;

INSERT INTO opening_hours (day_of_week, opening_time, closing_time, is_closed) VALUES
  (0, '08:00', '21:00', false),
  (1, '08:00', '21:00', false),
  (2, '08:00', '21:00', false),
  (3, '08:00', '21:00', false),
  (4, '08:00', '21:00', false),
  (5, '08:00', '20:00', false),
  (6, '09:00', '18:00', false)
ON CONFLICT (day_of_week) DO NOTHING;

INSERT INTO booking_settings (slot_duration_minutes, maximum_advance_days, minimum_advance_minutes, cancellation_limit_hours, maximum_active_bookings, guest_booking_enabled)
VALUES (60, 30, 60, 24, 5, true)
ON CONFLICT DO NOTHING;
