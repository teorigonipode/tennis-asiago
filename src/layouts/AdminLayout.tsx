import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Home, Settings, Wrench } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { cn } from '@/lib/utils';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/prenotazioni', label: 'Prenotazioni', icon: CalendarDays, end: false },
  { to: '/admin/calendario', label: 'Calendario', icon: CalendarDays, end: false },
  { to: '/admin/campi', label: 'Campi', icon: Home, end: false },
  { to: '/admin/impostazioni', label: 'Impostazioni', icon: Settings, end: false },
  { to: '/admin/manutenzione', label: 'Manutenzione', icon: Wrench, end: false },
];

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-ink-50">
      <Navbar />
      <div className="container-page py-6">
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
                        ? 'bg-court-600 text-white shadow-soft'
                        : 'text-ink-600 hover:bg-white hover:text-ink-900',
                    )
                  }
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </aside>
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
