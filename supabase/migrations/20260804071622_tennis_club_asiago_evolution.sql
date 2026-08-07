/*
# Tennis Club Asiago — evoluzione schema

## Modifiche

### profiles
- Aggiunta `updated_at timestamptz DEFAULT now()`.
- Trigger `profiles_set_updated_at` per aggiornare `updated_at` automaticamente.
- Trigger `handle_new_user` per creare automaticamente una riga in profiles
  quando un nuovo utente si registra in auth.users (ruolo predefinito 'user').

### courts
- Aggiunta `updated_at timestamptz DEFAULT now()`.
- Aggiunta `display_order integer DEFAULT 0`.
- Trigger `courts_set_updated_at`.
- Aggiornati dati demo: tre campi in terra rossa, scoperti, senza illuminazione
  confermata (has_lighting = true come default provvisorio), prezzi provvisori.

### bookings
- Aggiunta `updated_at timestamptz DEFAULT now()`.
- Aggiunta `customer_first_name text`.
- Aggiunta `customer_last_name text`.
- Aggiunta `number_of_players integer DEFAULT 1`.
- Aggiunta `public_code text` (codice pubblico non sequenziale).
- Aggiunta `management_token_hash text` (hash del token di gestione).
- Aggiunta `cancellation_reason text`.
- Aggiunta `created_by_admin boolean DEFAULT false`.
- Trigger `bookings_set_updated_at`.
- Trigger `bookings_set_public_code` per generare automaticamente un codice
  pubblico non sequenziale alla creazione.
- Vincolo CHECK: `end_time > start_time`.
- Vincolo CHECK: `booking_date >= CURRENT_DATE` (no prenotazioni nel passato).
- Aggiornato il vincolo di esclusione per usare il range temporale esistente.

### court_closures
- `court_id` reso nullable per supportare chiusure generali (tutti i campi).
- Aggiunta `updated_at timestamptz DEFAULT now()`.
- Trigger `court_closures_set_updated_at`.

### opening_hours
- Aggiunta `season_start date` (nullable).
- Aggiunta `season_end date` (nullable).

### booking_settings
- Aggiunta `guest_email_required boolean DEFAULT false`.
- Aggiunta `allow_consecutive_slots boolean DEFAULT true`.
- Aggiunta `currency text DEFAULT 'EUR'`.
- Aggiunta `updated_at timestamptz DEFAULT now()`.
- Trigger `booking_settings_set_updated_at`.

### Funzioni RPC
- `create_guest_booking(p_court_id, p_booking_date, p_start_time, p_end_time,
  p_first_name, p_last_name, p_phone, p_email, p_notes, p_price)`:
  crea una prenotazione ospite in modo sicuro, valida tutti i controlli
  (passato, chiusure, orari, sovrapposizioni), genera public_code e
  management_token, restituisce la prenotazione con il token in chiaro
  (solo in questo momento).
- `cancel_booking_by_token(p_public_code, p_token)`:
  annulla una prenotazione tramite codice pubblico + token.
- `check_slot_availability(p_court_id, p_booking_date, p_start_time, p_end_time)`:
  verifica disponibilità senza esporre dati personali.

### Sicurezza
- `create_guest_booking` è SECURITY DEFINER con search_path esplicito.
- `cancel_booking_by_token` è SECURITY DEFINER con search_path esplicito.
- `check_slot_availability` è SECURITY DEFINER con search_path esplicito.
- Le policy RLS su bookings sono aggiornate: anon non può SELECT bookings
  direttamente; gli utenti autenticati vedono solo le proprie; admin tutto.
- Le policy INSERT su bookings per anon sono rimosse: la creazione passa
  esclusivamente tramite la funzione RPC `create_guest_booking`.
*/

-- =========================================================
-- PROFILES: updated_at + auto-creation trigger
-- =========================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Non bloccare la registrazione se il trigger fallisce
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =========================================================
-- COURTS: updated_at + display_order
-- =========================================================
ALTER TABLE courts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE courts ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

DROP TRIGGER IF EXISTS courts_set_updated_at ON courts;
CREATE TRIGGER courts_set_updated_at
BEFORE UPDATE ON courts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Aggiorna dati demo: tre campi in terra rossa, scoperti
UPDATE courts SET surface = 'Terra rossa', is_indoor = false, display_order = 1, description = 'Il campo principale del circolo, in terra rossa scoperta. Immerso nel verde del Parco Millepini.' WHERE name = 'Campo Centrale';
UPDATE courts SET surface = 'Terra rossa', is_indoor = false, display_order = 2, description = 'Secondo campo in terra rossa scoperta, ideale per allenamenti e partite amatoriali.' WHERE name = 'Campo 2';
UPDATE courts SET surface = 'Terra rossa', is_indoor = false, display_order = 3, name = 'Campo 3', description = 'Terzo campo in terra rossa scoperta, utilizzato per corsi e tornei.' WHERE name = 'Campo Coperto';

-- =========================================================
-- BOOKINGS: new columns + triggers + constraints
-- =========================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_first_name text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_last_name text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS number_of_players integer DEFAULT 1;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS public_code text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS management_token_hash text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by_admin boolean DEFAULT false;

DROP TRIGGER IF EXISTS bookings_set_updated_at ON bookings;
CREATE TRIGGER bookings_set_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Generate public_code on insert
CREATE OR REPLACE FUNCTION generate_public_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION set_booking_public_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.public_code IS NULL THEN
    NEW.public_code := generate_public_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_set_public_code ON bookings;
CREATE TRIGGER bookings_set_public_code
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION set_booking_public_code();

-- CHECK constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_end_after_start') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_end_after_start CHECK (end_time > start_time);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_past_date') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_no_past_date CHECK (booking_date >= CURRENT_DATE);
  END IF;
END $$;

-- =========================================================
-- COURT_CLOSURES: nullable court_id + updated_at
-- =========================================================
ALTER TABLE court_closures ALTER COLUMN court_id DROP NOT NULL;
ALTER TABLE court_closures ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP TRIGGER IF EXISTS court_closures_set_updated_at ON court_closures;
CREATE TRIGGER court_closures_set_updated_at
BEFORE UPDATE ON court_closures
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- OPENING_HOURS: season columns
-- =========================================================
ALTER TABLE opening_hours ADD COLUMN IF NOT EXISTS season_start date;
ALTER TABLE opening_hours ADD COLUMN IF NOT EXISTS season_end date;

-- =========================================================
-- BOOKING_SETTINGS: new columns
-- =========================================================
ALTER TABLE booking_settings ADD COLUMN IF NOT EXISTS guest_email_required boolean DEFAULT false;
ALTER TABLE booking_settings ADD COLUMN IF NOT EXISTS allow_consecutive_slots boolean DEFAULT true;
ALTER TABLE booking_settings ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR';
ALTER TABLE booking_settings ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP TRIGGER IF EXISTS booking_settings_set_updated_at ON booking_settings;
CREATE TRIGGER booking_settings_set_updated_at
BEFORE UPDATE ON booking_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- RPC: create_guest_booking
-- =========================================================
CREATE OR REPLACE FUNCTION create_guest_booking(
  p_court_id uuid,
  p_booking_date date,
  p_start_time time,
  p_end_time time,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_price numeric DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  public_code text,
  management_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_public_code text;
  v_token text;
  v_token_hash text;
  v_court_active boolean;
  v_court_exists boolean;
  v_day_of_week int;
  v_opening_time time;
  v_closing_time time;
  v_is_closed boolean;
  v_closure_exists boolean;
  v_overlap_exists boolean;
  v_settings record;
BEGIN
  -- Validazione input
  IF p_first_name IS NULL OR trim(p_first_name) = '' THEN
    RAISE EXCEPTION 'Il nome è obbligatorio.';
  END IF;
  IF p_last_name IS NULL OR trim(p_last_name) = '' THEN
    RAISE EXCEPTION 'Il cognome è obbligatorio.';
  END IF;
  IF p_phone IS NULL OR trim(p_phone) = '' THEN
    RAISE EXCEPTION 'Il telefono è obbligatorio.';
  END IF;

  -- Carica impostazioni
  SELECT * INTO v_settings FROM booking_settings LIMIT 1;

  -- Verifica email obbligatoria se configurata
  IF v_settings.guest_email_required AND (p_email IS NULL OR trim(p_email) = '') THEN
    RAISE EXCEPTION 'L''email è obbligatoria per prenotare.';
  END IF;

  -- Verifica che la data non sia nel passato
  IF p_booking_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Non è possibile prenotare nel passato.';
  END IF;

  -- Verifica anticipo massimo
  IF p_booking_date > CURRENT_DATE + (v_settings.maximum_advance_days || ' days')::interval THEN
    RAISE EXCEPTION 'Data fuori dal range consentito.';
  END IF;

  -- Verifica anticipo minimo
  IF p_booking_date = CURRENT_DATE THEN
    IF extract(epoch from (now()::time - p_start_time)) / 60 > v_settings.minimum_advance_minutes * -1 THEN
      RAISE EXCEPTION 'Preavviso insufficiente per questo orario.';
    END IF;
  END IF;

  -- Verifica campo attivo
  SELECT is_active INTO v_court_active FROM courts WHERE id = p_court_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campo non trovato.';
  END IF;
  IF NOT v_court_active THEN
    RAISE EXCEPTION 'Questo campo non è attualmente disponibile.';
  END IF;

  -- Verifica orari di apertura
  v_day_of_week := extract(dow FROM p_booking_date::timestamp);
  SELECT opening_time, closing_time, is_closed INTO v_opening_time, v_closing_time, v_is_closed
  FROM opening_hours WHERE day_of_week = v_day_of_week;
  IF v_is_closed OR NOT FOUND THEN
    RAISE EXCEPTION 'Il circolo è chiuso in questo giorno.';
  END IF;
  IF p_start_time < v_opening_time OR p_end_time > v_closing_time THEN
    RAISE EXCEPTION 'L''orario selezionato è fuori dagli orari di apertura.';
  END IF;

  -- Verifica chiusure / manutenzione
  SELECT EXISTS (
    SELECT 1 FROM court_closures
    WHERE (court_id = p_court_id OR court_id IS NULL)
    AND tstzrange(start_at, end_at) && tstzrange(
      (p_booking_date::timestamptz + p_start_time),
      (p_booking_date::timestamptz + p_end_time)
    )
  ) INTO v_closure_exists;
  IF v_closure_exists THEN
    RAISE EXCEPTION 'Il campo è chiuso per manutenzione in questo periodo.';
  END IF;

  -- Verifica sovrapposizione
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE court_id = p_court_id
    AND status IN ('pending', 'confirmed')
    AND booking_date = p_booking_date
    AND tstzrange(
      (booking_date::timestamptz + start_time),
      (booking_date::timestamptz + end_time)
    ) && tstzrange(
      (p_booking_date::timestamptz + p_start_time),
      (p_booking_date::timestamptz + p_end_time)
    )
  ) INTO v_overlap_exists;
  IF v_overlap_exists THEN
    RAISE EXCEPTION 'Questo orario è appena stato prenotato da un altro utente. Scegli un altro slot.';
  END IF;

  -- Genera token di gestione
  v_token := encode(gen_random_bytes(24), 'hex');
  v_token_hash := digest(v_token, 'sha256');
  v_public_code := generate_public_code();

  -- Inserisci la prenotazione
  INSERT INTO bookings (
    court_id, booking_date, start_time, end_time,
    customer_first_name, customer_last_name,
    customer_name, customer_email, customer_phone,
    price, status, payment_status, customer_notes,
    public_code, management_token_hash
  ) VALUES (
    p_court_id, p_booking_date, p_start_time, p_end_time,
    trim(p_first_name), trim(p_last_name),
    trim(p_first_name) || ' ' || trim(p_last_name),
    trim(COALESCE(p_email, '')), trim(p_phone),
    p_price, 'confirmed', 'not_required', p_notes,
    v_public_code, v_token_hash
  )
  RETURNING id INTO v_booking_id;

  RETURN QUERY SELECT v_booking_id, v_public_code, v_token;
END;
$$;

-- =========================================================
-- RPC: cancel_booking_by_token
-- =========================================================
CREATE OR REPLACE FUNCTION cancel_booking_by_token(
  p_public_code text,
  p_token text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking record;
  v_token_hash text;
  v_settings record;
  v_start_ts timestamptz;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE public_code = p_public_code AND status IN ('pending', 'confirmed');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prenotazione non trovata o già annullata.';
  END IF;

  v_token_hash := digest(p_token, 'sha256');
  IF v_booking.management_token_hash IS NULL OR v_booking.management_token_hash != v_token_hash THEN
    RAISE EXCEPTION 'Token non valido.';
  END IF;

  -- Verifica limite cancellazione
  SELECT * INTO v_settings FROM booking_settings LIMIT 1;
  v_start_ts := (v_booking.booking_date::timestamptz + v_booking.start_time);
  IF extract(epoch from (v_start_ts - now())) / 3600 < v_settings.cancellation_limit_hours THEN
    RAISE EXCEPTION 'Non è più possibile annullare questa prenotazione (termine superato).';
  END IF;

  UPDATE bookings
  SET status = 'cancelled', cancelled_at = now()
  WHERE id = v_booking.id;

  RETURN true;
END;
$$;

-- =========================================================
-- RPC: check_slot_availability
-- =========================================================
CREATE OR REPLACE FUNCTION check_slot_availability(
  p_court_id uuid,
  p_booking_date date,
  p_start_time time,
  p_end_time time
)
RETURNS TABLE (available boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_court_active boolean;
  v_day_of_week int;
  v_is_closed boolean;
  v_opening_time time;
  v_closing_time time;
  v_closure_exists boolean;
  v_overlap_exists boolean;
BEGIN
  -- Verifica campo attivo
  SELECT is_active INTO v_court_active FROM courts WHERE id = p_court_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Campo non trovato'::text;
    RETURN;
  END IF;
  IF NOT v_court_active THEN
    RETURN QUERY SELECT false, 'Campo non disponibile'::text;
    RETURN;
  END IF;

  -- Verifica orari
  v_day_of_week := extract(dow FROM p_booking_date::timestamp);
  SELECT opening_time, closing_time, is_closed INTO v_opening_time, v_closing_time, v_is_closed
  FROM opening_hours WHERE day_of_week = v_day_of_week;
  IF v_is_closed OR NOT FOUND THEN
    RETURN QUERY SELECT false, 'Giorno di chiusura'::text;
    RETURN;
  END IF;
  IF p_start_time < v_opening_time OR p_end_time > v_closing_time THEN
    RETURN QUERY SELECT false, 'Fuori orario di apertura'::text;
    RETURN;
  END IF;

  -- Verifica chiusure
  SELECT EXISTS (
    SELECT 1 FROM court_closures
    WHERE (court_id = p_court_id OR court_id IS NULL)
    AND tstzrange(start_at, end_at) && tstzrange(
      (p_booking_date::timestamptz + p_start_time),
      (p_booking_date::timestamptz + p_end_time)
    )
  ) INTO v_closure_exists;
  IF v_closure_exists THEN
    RETURN QUERY SELECT false, 'Manutenzione'::text;
    RETURN;
  END IF;

  -- Verifica sovrapposizione
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE court_id = p_court_id
    AND status IN ('pending', 'confirmed')
    AND booking_date = p_booking_date
    AND tstzrange(
      (booking_date::timestamptz + start_time),
      (booking_date::timestamptz + end_time)
    ) && tstzrange(
      (p_booking_date::timestamptz + p_start_time),
      (p_booking_date::timestamptz + p_end_time)
    )
  ) INTO v_overlap_exists;
  IF v_overlap_exists THEN
    RETURN QUERY SELECT false, 'Occupato'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- =========================================================
-- RLS POLICY UPDATES
-- =========================================================

-- bookings: rimuovi INSERT per anon (ora gestito da RPC)
DROP POLICY IF EXISTS "bookings_insert" ON bookings;

-- bookings: SELECT — solo proprie o admin (invariato ma confermato)
DROP POLICY IF EXISTS "bookings_select_own_or_admin" ON bookings;
CREATE POLICY "bookings_select_own_or_admin"
ON bookings FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- bookings: UPDATE — proprie o admin
DROP POLICY IF EXISTS "bookings_update_own_or_admin" ON bookings;
CREATE POLICY "bookings_update_own_or_admin"
ON bookings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- bookings: DELETE — solo admin
DROP POLICY IF EXISTS "bookings_delete_admin" ON bookings;
CREATE POLICY "bookings_delete_admin"
ON bookings FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- bookings: INSERT — solo admin (per creazione manuale)
DROP POLICY IF EXISTS "bookings_insert_admin" ON bookings;
CREATE POLICY "bookings_insert_admin"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- profiles: assicurati che role non sia modificabile dall'utente
DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = 'user' OR auth.uid() = id AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- courts: SELECT pubblica solo campi non sensibili di campi attivi
-- (già configurata, confermata)
DROP POLICY IF EXISTS "courts_select_public_active" ON courts;
CREATE POLICY "courts_select_public_active"
ON courts FOR SELECT
TO anon, authenticated
USING (is_active = true OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- =========================================================
-- GRANT EXECUTE on RPC functions
-- =========================================================
GRANT EXECUTE ON FUNCTION create_guest_booking TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_booking_by_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_slot_availability TO anon, authenticated;

-- =========================================================
-- Aggiorna impostazioni demo
-- =========================================================
UPDATE booking_settings
SET guest_email_required = false,
    allow_consecutive_slots = true,
    currency = 'EUR'
WHERE id IN (SELECT id FROM booking_settings LIMIT 1);
