import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Phone, Mail } from 'lucide-react';
import { CLUB } from '@/lib/clubConfig';
import { OpeningHoursSummary } from '@/components/common/OpeningHoursSummary';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-cream-100 bg-forest-900 text-cream-100">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-600 text-white">
                <CalendarDays className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-bold text-white">Tennis Asiago</span>
            </div>
            <p className="mt-3 text-sm text-cream-300">
              Prenota il tuo campo da tennis ad Asiago in pochi click. Sport all'aria aperta, tra le montagne dell'Altopiano.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-wood-400">Navigazione</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/prenota" className="hover:text-white transition-colors">Prenota</Link></li>
              <li><Link to="/gestione-prenotazione" className="hover:text-white transition-colors">Gestisci prenotazione</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-wood-400">Contatti</h3>
            <ul className="mt-3 space-y-2 text-sm text-cream-300">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" /> {CLUB.contacts.address.value}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={`tel:${CLUB.contacts.phone.value.replace(/\s/g, '')}`} className="hover:text-white transition-colors">
                  {CLUB.contacts.phone.value}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${CLUB.contacts.email.value}`} className="hover:text-white transition-colors">
                  {CLUB.contacts.email.value}
                </a>
              </li>
              <li>
                <a
                  href={CLUB.mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link hover:text-white transition-colors"
                >
                  Apri in Google Maps
                </a>
              </li>
            </ul>
            <div className="mt-4">
              <OpeningHoursSummary variant="compact" />
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-forest-800 pt-6 text-center text-xs text-wood-400">
          <p>© {new Date().getFullYear()} Tennis Asiago. Tutti i diritti riservati.</p>
        </div>
      </div>
    </footer>
  );
}
