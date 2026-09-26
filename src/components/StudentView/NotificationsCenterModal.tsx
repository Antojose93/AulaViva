import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Inbox,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { FirebaseFirestoreService } from '../../services/firebaseFirestoreService';
import { StudentNotification, User } from '../../types';

interface NotificationsCenterModalProps {
  user: User;
  onClose: () => void;
  onSelectMission: (missionId: string) => void;
  onOpenMentorMessage: (messageId?: string) => void;
  onRefresh: () => void;
}

export const NotificationsCenterModal: React.FC<NotificationsCenterModalProps> = ({
  user,
  onClose,
  onSelectMission,
  onOpenMentorMessage,
  onRefresh,
}) => {
  const [activeFilter, setActiveFilter] = useState<'todas' | 'no_leidas' | 'misiones' | 'mensajes'>('todas');
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribers = [
      FirebaseFirestoreService.subscribeToNotifications(user.id, setNotifications),
      FirebaseFirestoreService.subscribeToUnreadNotificationsCount(user.id, setUnreadCount),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [user.id]);

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'no_leidas') return !n.read;
    if (activeFilter === 'misiones')
      return (
        n.type === 'mision_asignada' ||
        n.type === 'mision_aprobada' ||
        n.type === 'mision_rechazada'
      );
    if (activeFilter === 'mensajes') return n.type === 'mensaje_mentor';
    return true;
  });

  const handleMarkAllAsRead = async () => {
    await FirebaseFirestoreService.markAllNotificationsAsRead(user.id);
    onRefresh();
  };

  const handleMarkOneAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await FirebaseFirestoreService.markNotificationAsRead(id);
    onRefresh();
  };

  const handleClearNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await FirebaseFirestoreService.clearNotification(id);
    onRefresh();
  };

  const handleItemClick = async (n: StudentNotification) => {
    if (!n.read) {
      await FirebaseFirestoreService.markNotificationAsRead(n.id);
      onRefresh();
    }

    if (
      n.type === 'mision_asignada' ||
      n.type === 'mision_aprobada' ||
      n.type === 'mision_rechazada'
    ) {
      if (n.referenceId) {
        onSelectMission(n.referenceId);
        onClose();
      }
    } else if (n.type === 'mensaje_mentor') {
      onOpenMentorMessage(n.referenceId);
    }
  };

  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

      if (diffMinutes < 1) return 'Hace un momento';
      if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `Hace ${diffHours} h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;

      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const renderIcon = (type: StudentNotification['type']) => {
    switch (type) {
      case 'mision_asignada':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
        );
      case 'mensaje_mentor':
        return (
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        );
      case 'mision_aprobada':
        return (
          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        );
      case 'mision_rechazada':
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        );
      case 'insignia_otorgada':
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
        );
    }
  };

  const renderBadge = (type: StudentNotification['type']) => {
    switch (type) {
      case 'mision_asignada':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-md">
            Misión Asignada
          </span>
        );
      case 'mensaje_mentor':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-2 py-0.5 rounded-md">
            Mensaje Mentor
          </span>
        );
      case 'mision_aprobada':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/60 px-2 py-0.5 rounded-md">
            Evidencia Aprobada
          </span>
        );
      case 'mision_rechazada':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-md">
            Revisión Pendiente
          </span>
        );
      case 'insignia_otorgada':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-md">
            Insignia Otorgada
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0 relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Centro de Notificaciones
                </h3>
                {unreadCount > 0 && (
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                    {unreadCount} sin leer
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Misiones asignadas, mensajes del mentor y retroalimentación pedagógica
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Cerrar notificaciones"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Actions Bar */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              onClick={() => setActiveFilter('todas')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'todas'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('no_leidas')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'no_leidas'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              No leídas ({unreadCount})
            </button>
            <button
              onClick={() => setActiveFilter('misiones')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'misiones'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Misiones
            </button>
            <button
              onClick={() => setActiveFilter('mensajes')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === 'mensajes'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              Mensajes
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Marcar todo como leído</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 divide-y divide-slate-100">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Inbox className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-700">
                  No hay notificaciones aquí
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  {activeFilter === 'no_leidas'
                    ? '¡Estás al día! No tienes misiones ni mensajes pendientes de leer.'
                    : 'Las alertas sobre misiones de vida y orientaciones semanales aparecerán aquí.'}
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`pt-3 first:pt-0 group relative p-3.5 rounded-2xl transition-all cursor-pointer border ${
                  !notif.read
                    ? 'bg-emerald-50/40 hover:bg-emerald-50/80 border-emerald-200/70 shadow-2xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200/60'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  {renderIcon(notif.type)}

                  {/* Body */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {renderBadge(notif.type)}
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formatTimestamp(notif.createdAt)}
                        </span>
                      </div>

                      {/* Unread indicator */}
                      <div className="flex items-center gap-1.5">
                        {!notif.read && (
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200"
                            title="Sin leer"
                          />
                        )}
                        <button
                          onClick={(e) => handleClearNotification(notif.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 p-1 transition-opacity cursor-pointer"
                          title="Eliminar notificación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4
                      className={`text-sm font-bold leading-tight ${
                        !notif.read ? 'text-slate-900 font-black' : 'text-slate-800'
                      }`}
                    >
                      {notif.title}
                    </h4>

                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>

                    {/* Quick Action Button */}
                    <div className="pt-1.5 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 hover:text-emerald-800 group-hover:underline">
                        <span>
                          {notif.type === 'mensaje_mentor'
                            ? 'Leer mensaje completo'
                            : 'Ver detalles de misión'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>

                      {!notif.read && (
                        <button
                          onClick={(e) => handleMarkOneAsRead(notif.id, e)}
                          className="text-[11px] font-medium text-slate-400 hover:text-slate-700 flex items-center gap-1 hover:underline cursor-pointer"
                          title="Marcar como leída"
                        >
                          <Check className="w-3 h-3" />
                          <span>Leída</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Notificaciones en tiempo real para 8 estudiantes</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-slate-700 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
