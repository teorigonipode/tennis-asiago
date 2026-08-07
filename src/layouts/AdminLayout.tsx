import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LayoutDashboard, CalendarDays, Home, Settings, Wrench, LogOut, Tv } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/prenotazioni', label: 'Prenotazioni', icon: CalendarDays, end: false },
  { to: '/admin/calendario', label: 'Calendario', icon: CalendarDays, end: false },
  { to: '/admin/campi', label: 'Campi', icon: Home, end: false },
  { to: '/admin/impostazioni', label: 'Impostazioni', icon: Settings, end: false },
  { to: '/admin/manutenzione', label: 'Manutenzione', icon: Wrench, end: false },
];

const TV_LINK = { to: '/admin/tv', label: 'TV Dashboard', icon: Tv };

export function AdminLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex,nofollow');
    return () => {
      meta?.setAttribute('content', 'index,follow');
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-cream-50">
      <div className="border-b border-cream-100 bg-white/90 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between">
          <NavLink to="/admin" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-700 text-white shadow-soft">
              <LayoutDashboard className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold text-forest-900">Admin · Tennis Asiago</span>
          </NavLink>
          <button onClick={handleSignOut} className="btn-ghost text-sm">
            <LogOut className="h-4 w-4" /> Esci
          </button>
        </div>
      </div>
      <div className="container-page flex-1 py-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-56 lg:shrink-0">
            <nav className="flex gap-1 overflow-x-auto no-scrollbar lg:flex-col">
              {ADMIN_LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-forest-600 text-white shadow-soft'
                        : 'text-forest-600 hover:bg-white hover:text-forest-900',
                    )
                  }
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </NavLink>
              ))}
              <a
                key={TV_LINK.to}
                href={TV_LINK.to}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  'text-forest-600 hover:bg-white hover:text-forest-900',
                )}
              >
                <TV_LINK.icon className="h-4 w-4" />
                {TV_LINK.label}
              </a>
            </nav>
          </aside>
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
