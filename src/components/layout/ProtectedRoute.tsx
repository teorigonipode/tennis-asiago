import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullSpinner } from '@/components/ui/Spinner';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
