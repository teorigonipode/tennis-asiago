import { Link } from 'react-router-dom';
import {
  CalendarPlus,
  CalendarDays,
  CheckCircle2,
  MapPin,
  TreePine,
  Info,
} from 'lucide-react';
import { useCourts } from '@/hooks/useCourts';
import { CourtCard } from '@/components/courts/CourtCard';
import { FullSpinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { CLUB, IMAGES } from '@/lib/clubConfig';

const STEPS = [
  { icon: CalendarDays, title: 'Scegli il giorno', desc: 'Seleziona la data dal calendario disponibile.' },
  { icon: CalendarPlus, title: 'Scegli campo e orario', desc: 'Visualizza i campi liberi e gli slot orari disponibili.' },
  { icon: CheckCircle2, title: 'Conferma la prenotazione', desc: 'Inserisci i tuoi dati e ricevi la conferma.' },
];

export function HomePage() {
  const { courts, loading, error } = useCourts(true);

  return (
    <>
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0">
          <img src={IMAGES.hero} alt="Campo da tennis ad Asiago" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-forest-950/85 via-forest-900/70 to-forest-800/60" />
        </div>
        <div className="container-page relative py-24 sm:py-32 lg:py-40">
          <div className="max-w-2xl animate-slideUp">
            <span className="badge bg-ball-400/90 text-forest-900 mb-4">
              <TreePine className="h-3.5 w-3.5" /> {CLUB.parkName} · Asiago
            </span>
            <h1 className="font-display text-4xl font-bold text-white text-balance sm:text-5xl lg:text-6xl">
              {CLUB.tagline}
            </h1>
            <p className="mt-5 text-lg text-cream-100/90 max-w-xl">
              Prenota il tuo campo da tennis nel verde del Parco Millepini ad Asiago.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/prenota" className="btn-accent text-base">
                <CalendarPlus className="h-5 w-5" /> Prenota un campo
              </Link>
              <Link to="/campi" className="btn-secondary text-base bg-white/10 text-white border-white/30 hover:bg-white/20">
                Scopri i campi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Campi */}
      <section className="container-page py-16">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl font-bold text-forest-900">I nostri campi</h2>
          <p className="mt-2 text-forest-600">
            {courts.length > 0
              ? `${courts.length} campi scoperti nel verde del parco`
              : 'Campi scoperti nel verde del parco'}
          </p>
        </div>
        {loading ? (
          <FullSpinner />
        ) : error ? (
          <ErrorState message="Impossibile caricare i campi. Riprova più tardi." />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {courts.map((court) => (
              <CourtCard key={court.id} court={court} />
            ))}
          </div>
        )}
      </section>

      {/* Come prenotare */}
      <section className="bg-white py-16">
        <div className="container-page">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold text-forest-900">Come prenotare in 3 passaggi</h2>
            <p className="mt-2 text-forest-600">Semplice, veloce e guidato</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={i} className="card relative p-6 text-center">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-forest-700 px-3 py-1 text-xs font-bold text-white">
                  Passo {i + 1}
                </span>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-50 text-forest-600">
                  <step.icon className="h-7 w-7" />
                </div>
                <h3 className="font-display text-lg font-bold text-forest-900">{step.title}</h3>
                <p className="mt-1.5 text-sm text-forest-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Parco Millepini */}
      <section className="container-page py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 items-center">
          <div>
            <span className="badge bg-forest-100 text-forest-700 mb-4">
              <TreePine className="h-3.5 w-3.5" /> {CLUB.parkName}
            </span>
            <h2 className="font-display text-3xl font-bold text-forest-900">Nel verde del Parco Millepini</h2>
            <p className="mt-4 text-forest-600 leading-relaxed">
              Il Tennis Club Asiago si trova all'interno del Parco Millepini, un'area verde
              che circonda i campi da tennis e offre un ambiente naturale e rigoglioso.
              I campi sono all'aria aperta, per un'esperienza di tennis nel cuore
              dell'Altopiano di Asiago.
            </p>
            <p className="mt-3 text-sm text-wood-500">
              Il periodo di apertura stagionale è da confermare.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl shadow-card">
            <img src={IMAGES.park} alt="Parco Millepini ad Asiago" className="h-full w-full object-cover min-h-[280px]" loading="lazy" />
          </div>
        </div>
      </section>

      {/* Info non confermate */}
      <section className="bg-cream-100 py-8">
        <div className="container-page">
          <div className="flex items-start gap-3 rounded-2xl bg-white/60 p-4 text-sm text-wood-600">
            <Info className="h-5 w-5 shrink-0 text-wood-400" />
            <p>
              Le informazioni su contatti, orari, prezzi e servizi sono provvisorie e saranno
              confermate dal circolo.
            </p>
          </div>
        </div>
      </section>

      {/* Contatti e mappa */}
      <section className="bg-forest-900 py-16 text-white">
        <div className="container-page grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold">Contatti e posizione</h2>
            <p className="mt-3 text-cream-200/80 max-w-lg">
              Il circolo si trova nel Parco Millepini ad Asiago. I contatti e gli orari
              saranno pubblicati appena confermati.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-ball-400" /> {CLUB.contacts.address.value}
              </li>
            </ul>
            <a
              href={CLUB.mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary mt-6 bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              Apri in Google Maps
            </a>
          </div>
          <div className="overflow-hidden rounded-2xl">
            <iframe
              title="Mappa Tennis Asiago"
              src={CLUB.mapEmbedUrl}
              className="h-full min-h-[300px] w-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </>
  );
}
