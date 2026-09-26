import React from 'react';
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Cloud,
  FileText,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User;
  onUserChange?: (user: User) => void;
  onOpenDocs: () => void;
  onOpenAuth?: () => void;
  onLogout: () => void;
  isFirebaseConnected?: boolean;
  pendingApprovalsCount: number;
  studentUnreadCount?: number;
  onOpenNotifications?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onUserChange,
  onOpenDocs,
  onOpenAuth,
  onLogout,
  isFirebaseConnected = true,
  pendingApprovalsCount,
  studentUnreadCount = 0,
  onOpenNotifications,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Slogan */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 tracking-tight text-lg">
                Aula Viva
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                MVP Grado 11
              </span>
              {/* Firebase Live Cloud indicator */}
              <span
                className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                title="Conectado a Google Cloud Firestore con autenticación y reglas de autorización RBAC"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Cloud className="w-3 h-3" />
                <span>Firebase Real-time</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              "La vida real es el juego. La app hace visible el progreso."
            </p>
          </div>
        </div>

        {/* Active User Profile & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Authenticated User Info */}
          <div className="flex items-center gap-2.5 bg-slate-50 py-1 px-2.5 rounded-2xl border border-slate-200">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-300 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="hidden sm:block text-left max-w-[140px] md:max-w-[180px] truncate">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-slate-500 truncate leading-tight">
                {currentUser.role === 'mentor' ? 'Prof. Mentor' : 'Estudiante Grado 11'}
              </p>
            </div>

            {/* Role Pill */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold">
              {currentUser.role === 'mentor' ? (
                <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>Mentor</span>
                  {pendingApprovalsCount > 0 && (
                    <span className="ml-0.5 px-1 bg-amber-500 text-white rounded-full text-[9px] font-bold">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Estudiante</span>
                </span>
              )}
            </div>
          </div>

          {/* Student Notification Bell */}
          {currentUser.role === 'student' && onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer border border-slate-200/80"
              title="Abrir centro de notificaciones"
              aria-label="Notificaciones"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {studentUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-rose-500 text-white font-black text-[9px] sm:text-[10px] flex items-center justify-center ring-2 ring-white">
                  {studentUnreadCount}
                </span>
              )}
            </button>
          )}

          {/* 20 Deliverables Blueprint Button */}
          <button
            onClick={onOpenDocs}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all shadow-2xs cursor-pointer"
            title="Ver los 20 Entregables de Arquitectura, SQL, RLS y Sprint Plan"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">Docs & Blueprint</span>
            <span className="md:hidden">Docs</span>
          </button>

          {/* Explicit Logout Button */}
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 rounded-xl transition-all shadow-2xs cursor-pointer"
            title="Cerrar sesión actual y salir al Login"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
            <span className="sm:hidden">Salir</span>
          </button>

        </div>
      </div>
    </header>
  );
};
