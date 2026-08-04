# Tennis Asiago — Prenotazione Campi Online

Web app moderna e responsive per la prenotazione online dei campi da tennis di Asiago. Costruita con React, Vite, TypeScript, Tailwind CSS, React Router e Supabase.

## Funzionalità

- **Home page** con hero, campi, guida in 3 passaggi, contatti e mappa
- **Prenotazione guidata**: selezione data → campo → orario → dati → conferma
- **Pagina campi** con schede dettagliate (superficie, copertura, illuminazione, prezzo)
- **Le mie prenotazioni**: prenotazioni future e passate, annullamento con conferma
- **Autenticazione**: registrazione, login, logout, recupero password, profilo
- **Prenotazione ospite**: abilitabile/disabilitabile da configurazione
- **Area amministrativa** (`/admin`):
  - Dashboard con statistiche (prenotazioni, incassi, campi)
  - Gestione prenotazioni (filtri, modifica, annullamento, creazione manuale)
  - Calendario giornaliero e settimanale
  - Gestione campi (aggiunta, modifica, disattivazione)
  - Configurazione orari di apertura
  - Configurazione durata slot, prezzi, regole di prenotazione
  - Gestione chiusure per manutenzione
- **Regole di prenotazione** verificate lato database (anti-sovrapposizione)
- **Privacy**: informativa e consenso al trattamento dati

## Tecnologie

- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router v6
- Supabase (database + autenticazione)
- Lucide React (icone)

## Installazione

```bash
npm install
```

## Configurazione

1. Copia `.env.example` in `.env` e inserisci le variabili Supabase:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

2. Lo schema del database viene creato automaticamente tramite Supabase MCP. Le tabelle includono:
   - `profiles` — profili utente
   - `courts` — campi da tennis
   - `bookings` — prenotazioni
   - `court_closures` — chiusure per manutenzione
   - `opening_hours` — orari di apertura
   - `booking_settings` — impostazioni di prenotazione

3. I dati demo (3 campi, orari, impostazioni) sono già inseriti nel database.

## Sviluppo

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Deploy su Vercel

1. Collega il repository a Vercel
2. Aggiungi le variabili d'ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nelle impostazioni del progetto Vercel
3. Deploy automatico

## Abilitare un utente come amministratore

Dopo aver registrato un utente, imposta il ruolo nel database:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'tua-email@example.com';
```

## Struttura del progetto

```
src/
├── components/       Componenti riutilizzabili
│   ├── booking/      SlotGrid, Calendar, BookingSummary, BookingCard
│   ├── courts/        CourtCard, CourtInfo
│   ├── admin/        AdminFilters
│   ├── layout/       Navbar, Footer, ProtectedRoute
│   └── ui/           Spinner, EmptyState, ErrorState, ConfirmDialog, StatusBadge
├── features/         (vuoto — pronto per estensioni future)
├── hooks/            useAuth, useCourts, useSettings
├── layouts/          PublicLayout, AdminLayout
├── lib/              supabase client, utils, availability
├── pages/            Tutte le pagine
│   ├── auth/         Login, Signup, RecoverPassword, Profile
│   └── admin/        Dashboard, Bookings, Courts, Settings, Calendar, Maintenance
├── services/         courts, bookings, settings, profiles
└── types/            Definizioni TypeScript
```

## Estensioni future

- **Notifiche email**: architettura predisposta con template (vedi `src/lib/notifications.ts`)
- **Pagamenti Stripe**: campo `payment_status` già presente nelle prenotazioni
- **Notifiche push**: tramite Supabase Realtime
