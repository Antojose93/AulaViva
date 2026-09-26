import React from 'react';
import {
  Calendar,
  CheckCircle,
  MessageSquare,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { MentorWeeklyMessage, User } from '../../types';

interface MentorMessageModalProps {
  message: MentorWeeklyMessage;
  mentor: User;
  onClose: () => void;
  onAcknowledge?: () => void;
}

export const MentorMessageModal: React.FC<MentorMessageModalProps> = ({
  message,
  mentor,
  onClose,
  onAcknowledge,
}) => {
  const formattedDate = new Date(message.createdAt).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-0.5 rounded-full">
                  Semana {message.weekNumber}
                </span>
                <span className="text-xs text-slate-400 capitalize">
                  {formattedDate}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                Orientación del Mentor
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mentor Info */}
        <div className="mt-4 flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
          <img
            src={mentor.avatar}
            alt={mentor.name}
            className="w-11 h-11 rounded-xl object-cover ring-2 ring-emerald-500/20"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-900">
                {mentor.name}
              </span>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Mentor Administrador
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Acompañamiento pedagógico & habilidades de vida
            </p>
          </div>
        </div>

        {/* Message Title & Content */}
        <div className="mt-4 space-y-3">
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <h4 className="text-sm sm:text-base font-black text-emerald-950 mb-2">
              "{message.title}"
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line italic">
              "{message.message}"
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Aplica este principio en tus misiones diarias para mantener tu racha.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => {
              if (onAcknowledge) onAcknowledge();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Entendido, marcar como leído</span>
          </button>
        </div>
      </div>
    </div>
  );
};
