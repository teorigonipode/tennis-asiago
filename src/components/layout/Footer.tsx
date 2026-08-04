import { Link } from 'react-router-dom';
import { CalendarDays, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-ink-100 bg-ink-900 text-ink-100">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-court-600 text-white">
                <CalendarDays className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-bold text-white">Tennis Asiago</span>
            </div>
            <p className="mt-3 text-sm text-ink-300">
              Prenota il tuo campo da tennis ad Asiago in pochi click. Sport all'aria aperta, tra le montagne dell'Altopiano.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink-400">Navigazione</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/campi" className="hover:text-white transition-colors">Campi</Link></li>
              <li><Link to="/prenota" className="hover:text-white transition-colors">Prenota un campo</Link></li>
              <li><Link to="/contatti" className="hover:text-white transition-colors">Contatti</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink-400">Contatti</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-300">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Via Campo Sportivo 1, Asiago (VI)</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +39 0424 000 000</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> info@tennisasiago.it</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-ink-800 pt-6 text-center text-xs text-ink-400">
          <p>© {new Date().getFullYear()} Tennis Asiago. Tutti i diritti riservati.</p>
        </div>
      </div>
    </footer>
  );
}
