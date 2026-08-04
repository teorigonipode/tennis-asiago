import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, CalendarPlus, User, LogOut, LayoutDashboard, CalendarDays } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const PUBLIC_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/campi', label: 'Campi' },
  { to: '/prenota', label: 'Prenota' },
  { to: '/contatti', label: 'Contatti' },
];

export function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setOpen(false);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-court-50 text-court-700' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
    );

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur-md">
      <nav className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-court-700 text-white shadow-soft">
            <CalendarDays className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold text-ink-900">Tennis Asiago</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {PUBLIC_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass} end={l.to === '/'}>
              {l.label}
            </NavLink>
          ))}
          {user && (
            <NavLink to="/le-mie-prenotazioni" className={linkClass}>
              Le mie prenotazioni
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              <span className="inline-flex items-center gap-1">
                <LayoutDashboard className="h-4 w-4" /> Admin
              </span>
            </NavLink>
          )}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link to="/profilo" className="btn-ghost">
                <User className="h-4 w-4" />
                {profile?.first_name || 'Profilo'}
              </Link>
              <button onClick={handleSignOut} className="btn-ghost">
                <LogOut className="h-4 w-4" /> Esci
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Accedi</Link>
              <Link to="/registrati" className="btn-primary">
                <CalendarPlus className="h-4 w-4" /> Registrati
              </Link>
            </>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-ink-700 hover:bg-ink-100 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-ink-100 bg-white md:hidden">
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
            {user && (
              <NavLink to="/le-mie-prenotazioni" className={linkClass} onClick={() => setOpen(false)}>
                Le mie prenotazioni
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>
                Area admin
              </NavLink>
            )}
            <div className="mt-2 border-t border-ink-100 pt-3">
              {user ? (
                <>
                  <Link to="/profilo" className="btn-secondary w-full" onClick={() => setOpen(false)}>
                    <User className="h-4 w-4" /> Profilo
                  </Link>
                  <button onClick={handleSignOut} className="btn-ghost mt-2 w-full">
                    <LogOut className="h-4 w-4" /> Esci
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" className="btn-secondary flex-1" onClick={() => setOpen(false)}>
                    Accedi
                  </Link>
                  <Link to="/registrati" className="btn-primary flex-1" onClick={() => setOpen(false)}>
                    Registrati
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
