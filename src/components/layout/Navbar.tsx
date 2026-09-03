import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, CalendarDays, CalendarPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const PUBLIC_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/campi', label: 'Campi' },
  { to: '/gestione-prenotazione', label: 'Gestisci prenotazione' },
  { to: '/contatti', label: 'Contatti' },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-forest-50 text-forest-700' : 'text-forest-600 hover:bg-cream-100 hover:text-forest-900',
    );

  return (
    <header className="sticky top-0 z-40 border-b border-cream-100 bg-white/90 backdrop-blur-md">
      <nav className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-700 text-white shadow-soft">
            <CalendarDays className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold text-forest-900">Tennis Asiago</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {PUBLIC_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass} end={l.to === '/'}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/prenota" className="btn-primary">
            <CalendarPlus className="h-4 w-4" /> Prenota
          </Link>
        </div>

        <button
          className="rounded-lg p-2 text-forest-700 hover:bg-cream-100 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-cream-100 bg-white md:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {PUBLIC_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={linkClass}
                end={l.to === '/'}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
            <Link to="/prenota" className="btn-primary mt-2 w-full" onClick={() => setOpen(false)}>
              <CalendarPlus className="h-4 w-4" /> Prenota
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
