import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowRight, LogOut, BookOpen, User } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as { requestedPath?: string; currentRole?: string } | undefined;
  const requestedPath = state?.requestedPath || 'restringida';
  const roleName = user?.role === 'mentor' ? 'Mentor' : 'Estudiante';
  const destinationPath = user?.role === 'mentor' ? '/mentor' : '/student';

  const handleReturnToDashboard = () => {
    navigate(destinationPath, { replace: true });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-rose-500 selection:text-white">
      {/* Background radial gradient */}
      <div className="w-full max-w-lg bg-slate-800/90 border border-slate-700 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center">
          {/* Brand header */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">Aula Viva</span>
          </div>

          {/* Alert Icon */}
          <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 mb-2">
            Restricción por Rol (RBAC)
          </span>

          <h1 className="text-2xl font-black text-white tracking-tight">Acceso No Autorizado</h1>

          <p className="text-sm text-slate-300 mt-3 leading-relaxed">
            Has intentado acceder a la ruta <code className="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-rose-300 text-xs">{requestedPath}</code>.
            Tu cuenta activa tiene el rol de <strong className="text-white font-bold">{roleName}</strong> y no posee autorización para consultar esta vista.
          </p>

          {/* User profile card */}
          {user && (
            <div className="mt-5 w-full bg-slate-900/80 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-600"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{user.name}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                user.role === 'mentor'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {roleName}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 w-full flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleReturnToDashboard}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg hover:shadow-emerald-600/25 cursor-pointer"
            >
              <span>Ir a mi Panel de {roleName}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all cursor-pointer border border-slate-600"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
