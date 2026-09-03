# Tennis Asiago — Prenotazione Campi Online

Web app per la prenotazione online dei campi da tennis del Tennis Club Asiago, situato nel Parco Millepini ad Asiago.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router v6
- Supabase (database + autenticazione admin + edge functions)
- Resend (email transazionali)
- Vercel Analytics
- Lucide React (icone)

## Funzionalità

### Pubbliche (senza account)

- **Home** con hero, campi, Parco Millepini, mappa Google
- **Campi** — campi scoperti (terra rossa e cemento)
- **Prenota** — flusso guidato: data → campo → orario → dati → conferma
- **Gestione prenotazione** — cerca con codice + email, annulla o richiedi modifica
- **Contatti** — posizione, mappa, orari reali dal database, telefono, email
- **Privacy** — informativa provvisoria

### Area amministrativa (`/admin`)

- Dashboard con statistiche prenotazioni
- Elenco prenotazioni con ricerca, filtri, stato email, reinvio
- Vista calendario (giorno/settimana)
- Creazione manuale prenotazioni (telefono)
- Modifica, annullamento soft, eliminazione definitiva
- Gestione campi
- Gestione orari di apertura
- Gestione chiusure/manutenzioni

## Setup

```bash
npm ci
```

### Variabili d'ambiente

Copia `.env.example` in `.env`:

| Variabile | Descrizione |
|---|---|
| `VITE_SUPABASE_URL` | URL del progetto Supabase (senza `/rest/v1`) |
| `VITE_SUPABASE_ANON_KEY` | Chiave pubblica anon (browser-safe) |
| `VITE_PUBLIC_SITE_URL` | URL pubblico del deploy (usato per redirect Auth, canonical, SEO) |

### Secrets Supabase (già configurati, non inserire nel repository)

I seguenti secrets sono configurati nel progetto Supabase e non vanno inseriti nel repository o nel frontend:

- `RESEND_API_KEY`
- `BOOKING_ADMIN_EMAIL`
- `BOOKING_EMAIL_FROM`

## Sviluppo

```bash
npm run dev
```

## Verifiche

```bash
npm run typecheck
npm run lint
npm run build
```

Tutte e tre passano con 0 errori. 2 warning preesistenti:
- `react-refresh/only-export-components` in `useAuth.tsx` (export di hook e componenti nello stesso file)
- `react-hooks/exhaustive-deps` in `AdminCalendar.tsx` (dipendenza `load` omessa intenzionalmente)

## Deploy su Vercel

1. Collega il repository a Vercel
2. Aggiungi le variabili `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PUBLIC_SITE_URL`
3. Deploy automatico

Il file `vercel.json` contiene la rewrite rule SPA per React Router.

## Autenticazione

Il prodotto finale NON ha account cliente. L'unica autenticazione ammessa è quella amministrativa.

### Accesso admin

- L'amministratore digita direttamente `https://tennis-asiago.vercel.app/admin`
- Non autenticato → login admin
- Autenticato admin → dashboard
- Autenticato non-admin → accesso negato
- Logout disponibile solo dentro AdminLayout → redirect alla home

### Tabella `profiles`

La tabella `profiles` contiene esclusivamente profili amministrativi (ruolo `admin`). Non esiste profilo utente generico. La tabella è usata da `useAuth`, `AdminRoute`, `AdminLayout`, `is_admin()` e dalle policy RLS.

## Route

### Pubbliche

- `/` — Home
- `/campi` — Campi
- `/prenota` — Prenota
- `/gestione-prenotazione` — Gestione prenotazione
- `/contatti` — Contatti
- `/privacy` — Privacy
- `*` — Pagina non trovata (404)

### Tecniche (non linkate pubblicamente)

- `/login` — Login admin (noindex)
- `/recupero-password` — Recupero password
- `/aggiorna-password` — Aggiornamento password

### Amministrative

- `/admin` — Dashboard
- `/admin/prenotazioni` — Prenotazioni
- `/admin/calendario` — Calendario
- `/admin/campi` — Campi
- `/admin/impostazioni` — Impostazioni
- `/admin/manutenzione` — Manutenzione

## Navbar pubblica

La navbar pubblica contiene solo:
- Home
- Campi
- Gestisci prenotazione
- Contatti
- Prenota (CTA)

Nessun riferimento a admin, login, autenticazione o logout.

## Database

### Tabelle

| Tabella | Descrizione |
|---|---|
| `profiles` | Profili amministrativi (ruolo admin) |
| `courts` | Campi da tennis |
| `bookings` | Prenotazioni (con public_code, management_token_hash) |
| `court_closures` | Chiusure per manutenzione |
| `opening_hours` | Orari di apertura (unica fonte) |
| `booking_settings` | Impostazioni (durata slot, anticipo, limite cancellazione) |
| `booking_change_requests` | Richieste di modifica cliente |
| `email_log` | Stato invii email |
| `rate_limit_attempts` | Tentativi per rate limiting (identificatore hashato) |

### RPC pubbliche

| Funzione | Scopo |
|---|---|
| `create_guest_booking` | Crea prenotazione ospite + job email pending server-side |
| `lookup_booking_by_code_email` | Verifica prenotazione con codice + email (rate limited) |
| `cancel_booking_by_code_email` | Annulla prenotazione + job email pending (rate limited) |
| `create_change_request_by_code_email` | Invia richiesta modifica + job email pending (rate limited) |
| `check_slot_availability` | Verifica disponibilità slot |

### RPC interne (solo service role)

| Funzione | Scopo |
|---|---|
| `check_rate_limit` | Helper rate limiting (non eseguibile da anon/authenticated) |
| `claim_email_jobs` | Claim atomico job email pending (SECURITY DEFINER) |
| `update_email_job_status` | Aggiorna stato job email (SECURITY DEFINER) |

### Timezone

Tutte le operazioni sensibili al tempo usano `Europe/Rome`:
- `booking_date` e `start_time`/`end_time` sono interpretati come ora italiana
- Anticipo minimo, anticipo massimo, limite cancellazione usano `now() AT TIME ZONE 'Europe/Rome'`
- Le chiusure e le sovrapposizioni usano timestamp in Europe/Rome
- L'ora legale/solare è gestita automaticamente da PostgreSQL

## Architettura email

### Flusso

1. La RPC `create_guest_booking` crea la prenotazione
2. Nella stessa transazione crea 2 job `email_log` pending:
   - conferma cliente
   - notifica admin
3. Il frontend invoca l'edge function `send-booking-email` tramite `supabase.functions.invoke()`
4. L'edge function legge i job pending dal database (tramite RPC `claim_email_jobs`)
5. Per ogni job: recupera destinatario e dati dal database, costruisce template, invia tramite Resend
6. Aggiorna lo stato del job: `sent` / `failed` / `skipped`

### Vantaggi

- I job email sono creati server-side nella stessa transazione della prenotazione
- Anche se il frontend non riesce a chiamare l'edge function, i job rimangono `pending`
- L'edge function non si fida del `booking_id` inviato dal browser: recupera destinatario e dati dal database
- Il frontend non può scegliere destinatario, contenuto o template
- Idempotenza: unique index su `(booking_id, template_type, recipient_type)` per evitare duplicati

### Eventi supportati

| Evento | Destinatari | Autorizzazione |
|---|---|---|
| `booking_created` | cliente + admin | pubblico (post-booking) |
| `booking_cancelled` | cliente + admin | `email_proof` deve matchare |
| `change_requested` | cliente + admin | `email_proof` deve matchare |
| `booking_changed` | cliente | JWT admin (header Authorization) |
| `manual_resend` | cliente | JWT admin (header Authorization) |

### email_log

Ogni tentativo email crea una riga in `email_log` con:
- `status`: `pending` → `processing` → `sent` / `failed` / `skipped`
- `sent_at`: timestamp invio
- `last_attempt_at`: timestamp ultimo tentativo
- `provider_message_id`: ID Resend (se disponibile)
- `retry_count`: incrementato a ogni tentativo fallito
- `last_error`: categoria errore sanitizzata (no secrets, no PII)
- `recipient_email`: determinato server-side (customer → email prenotazione, admin → env var)

Categorie errore: `domain_not_verified`, `validation_error`, `invalid_api_key`, `rate_limit`, `provider_error`, `restricted_recipient`, `network_error`

### Retry admin

L'admin può visualizzare lo stato email di ogni prenotazione e reinviare l'email cliente tramite il pulsante "Reinvia email" nell'elenco prenotazioni. Il destinatario è sempre letto dal database.

### Rate limiting

| Azione | Limite | Finestra |
|---|---|---|
| Creazione prenotazione | 5 tentativi | 15 minuti |
| Lookup codice + email | 5 tentativi | 15 minuti |
| Annullamento | 5 tentativi | 15 minuti |
| Richiesta modifica | 5 tentativi | 15 minuti |

`check_rate_limit` non è eseguibile da anon/authenticated. L'identificatore è hashato (SHA-256).

### CORS

L'edge function accetta solo `POST` e `OPTIONS`.
`Access-Control-Allow-Origin` è limitato a:
- `https://tennis-asiago.vercel.app`
- `http://localhost:5173`
- Preview Vercel del progetto (`tennis-asiago-<hash>-<user>-projects.vercel.app`)

Header CORS: `authorization`, `apikey`, `content-type`, `x-client-info`, `x-supabase-api-version`
`Vary: Origin` sempre presente. Origin non ammesso: 403.

### Configurazione

```toml
# supabase/config.toml
[functions.send-booking-email]
verify_jwt = false
```

Le operazioni admin verificano il JWT internamente. Le operazioni pubbliche verificano `email_proof` contro il database.

## Stato email production

### Pipeline

- Pipeline email verificata: la RPC crea job pending, l'edge function li processa, email_log viene popolato.
- Test eseguito: `create_guest_booking` → 2 job pending creati → POST edge function → `{"status":"processed"}`.
- I job vengono processati tramite RPC `claim_email_jobs` (SECURITY DEFINER) che bypassa RLS.

### Dominio mittente

`BOOKING_EMAIL_FROM` usa il dominio `resend.dev` (dominio di test Resend).
- L'invio è limitato all'email proprietaria dell'account Resend
- L'invio a clienti esterni richiede la verifica di un dominio personalizzato in Resend
- Quando il dominio sarà verificato, basterà aggiornare `BOOKING_EMAIL_FROM` — nessuna modifica al frontend

### Limitazioni residue

- **Email cliente esterna**: bloccata dal dominio di test `resend.dev`. Richiede dominio verificato.
- **Notifica admin**: se `BOOKING_ADMIN_EMAIL` coincide con l'email proprietaria dell'account Resend, l'invio dovrebbe funzionare anche con `resend.dev`. Da verificare con test reale.
- **Test ricezione reale**: non eseguibile da questo ambiente. Richiede test manuale sul sito production.

## Sicurezza

- RLS attiva su tutte le tabelle
- anon: SELECT solo su courts (attivi), opening_hours, court_closures, booking_settings
- anon: nessun SELECT diretto su bookings, profiles, email_log, booking_change_requests, rate_limit_attempts
- anon: EXECUTE solo sulle 5 RPC pubbliche necessarie
- `check_rate_limit`: non eseguibile da anon/authenticated
- `claim_email_jobs`, `update_email_job_status`: non eseguibili da anon/authenticated
- authenticated non-admin: bloccato dalle policy admin
- admin: accesso completo via `is_admin()` SECURITY DEFINER
- Vecchia `create_change_request`: eliminata
- Vecchia `create_guest_booking` con `p_price`: eliminata
- Prezzo non manipolabile dal client
- Codice prenotazione non sequenziale
- Email normalizzate server-side (trim + lowercase)
- Risposte generiche per dati errati (no enumerazione)
- Edge function: destinatario sempre letto dal database
- Edge function: HTML escaping su tutti i dati utente
- Edge function: JWT admin verificato per operazioni admin
- Edge function: CORS limitato a origin noti

## Limitazioni note

- I prezzi non sono tracciati nell'MVP (price=0)
- Le richieste di modifica non spostano automaticamente la prenotazione
- L'admin deve gestire le richieste manualmente
- I test email reali richiedono verifica manuale della ricezione in produzione
- Il dominio mittente Resend deve essere verificato per l'invio a clienti
- Vercel Analytics usa cookie tecnici, non cookie di profilazione

## Dati da confermare col gestore

- Indirizzo preciso e civico
- Numero di telefono ed email ufficiali (attualmente provvisori ma visibili)
- Orari di apertura definitivi
- Periodo di apertura stagionale
- Prezzi dei campi
- Illuminazione serale
- Nome ufficiale dei campi
- Servizi disponibili (bar, docce, spogliatoi, scuola tennis)
- Politica di conservazione dei dati
- Fotografie ufficiali dei campi
- Dominio email mittente da verificare con Resend
