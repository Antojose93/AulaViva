import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'student' | 'mentor'>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1. If auth state is still resolving, show secure loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center animate-pulse">
            <BookOpen className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
            <Lock className="w-3.5 h-3.5 text-slate-950" />
          </div>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white">Aula Viva</h2>
        <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Verificando sesión segura y permisos de rol...
        </p>
      </div>
    );
  }

  // 2. If not authenticated, redirect to Login immediately
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. If role is not allowed for this route, block and redirect to Unauthorized view
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to="/unauthorized"
        state={{
          requestedPath: location.pathname,
          currentRole: user.role,
        }}
        replace
      />
    );
  }

  // 4. Authorized and authenticated! Render protected views
  return <>{children}</>;
};
