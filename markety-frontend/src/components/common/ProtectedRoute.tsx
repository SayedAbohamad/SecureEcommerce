import { PropsWithChildren } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingOverlay } from './LoadingOverlay';

interface ProtectedRouteProps {
  roles?: string[];
  redirectTo?: string;
}

export const ProtectedRoute = ({
  roles,
  redirectTo = '/login',
  children,
}: PropsWithChildren<ProtectedRouteProps>) => {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingOverlay />;
  }

  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0 && !roles.some((role) => hasRole(role))) {
    return <Navigate to="/" replace />;
  }

  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
};

