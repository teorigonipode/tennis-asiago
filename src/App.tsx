import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ProtectedRoute, AdminRoute } from '@/components/layout/ProtectedRoute';
import { HomePage } from '@/pages/HomePage';
import { CourtsPage } from '@/pages/CourtsPage';
import { BookingPage } from '@/pages/BookingPage';
import { ContactsPage } from '@/pages/ContactsPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { MyBookingsPage } from '@/pages/MyBookingsPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { RecoverPasswordPage } from '@/pages/auth/RecoverPasswordPage';
import { ProfilePage } from '@/pages/auth/ProfilePage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminBookings } from '@/pages/admin/AdminBookings';
import { AdminCourts } from '@/pages/admin/AdminCourts';
import { AdminSettings } from '@/pages/admin/AdminSettings';
import { AdminCalendar } from '@/pages/admin/AdminCalendar';
import { AdminMaintenance } from '@/pages/admin/AdminMaintenance';

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/campi', element: <CourtsPage /> },
      { path: '/prenota', element: <BookingPage /> },
      { path: '/contatti', element: <ContactsPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/registrati', element: <SignupPage /> },
      { path: '/recupero-password', element: <RecoverPasswordPage /> },
      {
        path: '/le-mie-prenotazioni',
        element: <ProtectedRoute><MyBookingsPage /></ProtectedRoute>,
      },
      {
        path: '/profilo',
        element: <ProtectedRoute><ProfilePage /></ProtectedRoute>,
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
      { path: '*', element: <HomePage /> },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
