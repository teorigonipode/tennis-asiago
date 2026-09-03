import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AdminRoute } from '@/components/layout/ProtectedRoute';
import { HomePage } from '@/pages/HomePage';
import { CourtsPage } from '@/pages/CourtsPage';
import { BookingPage } from '@/pages/BookingPage';
import { ContactsPage } from '@/pages/ContactsPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { GuestCancelPage } from '@/pages/GuestCancelPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RecoverPasswordPage } from '@/pages/auth/RecoverPasswordPage';
import { UpdatePasswordPage } from '@/pages/auth/UpdatePasswordPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminBookings } from '@/pages/admin/AdminBookings';
import { AdminCourts } from '@/pages/admin/AdminCourts';
import { AdminSettings } from '@/pages/admin/AdminSettings';
import { AdminCalendar } from '@/pages/admin/AdminCalendar';
import { AdminMaintenance } from '@/pages/admin/AdminMaintenance';
import { AdminTvDashboard } from '@/pages/admin/AdminTvDashboard';

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/campi', element: <CourtsPage /> },
      { path: '/prenota', element: <BookingPage /> },
      { path: '/contatti', element: <ContactsPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/gestione-prenotazione', element: <GuestCancelPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/recupero-password', element: <RecoverPasswordPage /> },
      { path: '/aggiorna-password', element: <UpdatePasswordPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminRoute><AdminLayout /></AdminRoute>,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'prenotazioni', element: <AdminBookings /> },
      { path: 'calendario', element: <AdminCalendar /> },
      { path: 'campi', element: <AdminCourts /> },
      { path: 'impostazioni', element: <AdminSettings /> },
      { path: 'manutenzione', element: <AdminMaintenance /> },
    ],
  },
  {
    path: '/admin/tv',
    element: <AdminRoute><AdminTvDashboard /></AdminRoute>,
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
