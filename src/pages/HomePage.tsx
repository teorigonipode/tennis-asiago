import { Link } from 'react-router-dom';
import { CalendarPlus, CalendarDays, CheckCircle2, MapPin, Clock, Phone, Mountain, Car, Sun } from 'lucide-react';
import { useCourts } from '@/hooks/useCourts';
import { CourtCard } from '@/components/courts/CourtCard';
import { FullSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';

const HERO_IMG = 'https://images.pexels.com/photos/30894524/pexels-photo-30894524.jpeg?auto=compress&cs=tinysrgb&w=1600';

const STEPS = [
  { icon: CalendarDays, title: 'Scegli il giorno', desc: 'Seleziona la data dal calendario disponibile.' },
  { icon: CalendarPlus, title: 'Scegli campo e orario', desc: 'Visualizza i campi liberi e gli slot orari disponibili.' },
  { icon: CheckCircle2, title: 'Conferma la prenotazione', desc: 'Inserisci i tuoi dati e ricevi la conferma.' },
];

const FEATURES = [
  { icon: Mountain, title: 'Ambiente montano', desc: 'Campi immersi nella natura dell\'Altopiano di Asiago.' },
  { icon: Sun, title: 'All\'aperto e al coperto', desc: 'Campi scoperti e coperti per ogni condizione meteo.' },
  { icon: Clock, title: 'Illuminazione serale', desc: 'Gioca anche nelle ore serali con illuminazione a LED.' },
  { icon: Car, title: 'Parcheggio gratuito', desc: 'Ampio parcheggio disponibile a pochi passi dai campi.' },
];

export function HomePage() {
  const { courts, loading, error } = useCourts(true);

  return (
    <>
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Campo da tennis ad Asiago" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-ink-900/80 via-ink-900/60 to-court-900/70" />
        </div>
        <div className="container-page relative py-24 sm:py-32 lg:py-40">
          <div className="max-w-2xl animate-slideUp">
            <span className="badge bg-limeball-400/90 text-ink-900 mb-4">
              <Mountain className="h-3.5 w-3.5" /> Asiago · Altopiano
            </span>
            <h1 className="font-display text-4xl font-bold text-white text-balance sm:text-5xl lg:text-6xl">
              Prenota il tuo campo ad Asiago
            </h1>
            <p className="mt-5 text-lg text-ink-100/90 max-w-xl">
              Prenota online i campi da tennis della nostra struttura. Scegli giorno, campo e orario in pochi click e ricevi subito la conferma.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/prenota" className="btn-primary text-base">
                <CalendarPlus className="h-5 w-5" /> Prenota un campo
              </Link>
              <Link to="/campi" className="btn-secondary text-base bg-white/10 text-white border-white/30 hover:bg-white/20">
                Vedi i campi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Campi disponibili */}
      <section className="container-page py-16">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-bold text-ink-900">I nostri campi</h2>
          <p className="mt-2 text-ink-600">Tre campi con caratteristiche diverse per ogni esigenza</p>
        </div>
        {loading ? (
          <FullSpinner />
        ) : error ? (
          <ErrorState message="Impossibile caricare i campi. Riprova più tardi." />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courts.map((court) => (
              <CourtCard key={court.id} court={court} />
            ))}
          </div>
        )}
      </section>

      {/* Come funziona */}
      <section className="bg-white py-16">
        <div className="container-page">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold text-ink-900">Come prenotare in 3 passaggi</h2>
            <p className="mt-2 text-ink-600">Semplice, veloce e guidato</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={i} className="card relative p-6 text-center">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-court-600 px-3 py-1 text-xs font-bold text-white">
                  Passo {i + 1}
                </span>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-court-50 text-court-600">
                  <step.icon className="h-7 w-7" />
                </div>
                <h3 className="font-display text-lg font-bold text-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-sm text-ink-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container-page py-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-court-100 text-court-700">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-ink-900">{f.title}</h3>
                <p className="text-sm text-ink-600">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contatti */}
      <section className="bg-ink-900 py-16 text-white">
        <div className="container-page grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold">La struttura</h2>
            <p className="mt-3 text-ink-300 max-w-lg">
              I campi da tennis di Asiago si trovano all'interno del complesso sportivo, circondati dalle montagne dell'Altopiano. Accessibile in auto con ampio parcheggio gratuito.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-limeball-400" /> Via Campo Sportivo 1, Asiago (VI)
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-limeball-400" /> +39 0424 000 000
              </li>
              <li className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-limeball-400" /> Tutti i giorni 8:00 – 21:00
              </li>
            </ul>
            <Link to="/contatti" className="btn-secondary mt-6 bg-white/10 border-white/30 text-white hover:bg-white/20">
              Maggiori informazioni
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl">
            <iframe
              title="Mappa Asiago"
              src="https://www.openstreetmap.org/export/embed.html?bbox=11.5%2C45.88%2C11.58%2C45.92&layer=mapnik&marker=45.9%2C11.5167"
              className="h-full min-h-[300px] w-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </>
  );
}
