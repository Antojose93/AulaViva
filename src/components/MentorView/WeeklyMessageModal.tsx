import React, { useEffect, useState } from 'react';
import { MessageSquare, Send, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FirebaseFirestoreService } from '../../services/firebaseFirestoreService';
import { User } from '../../types';

interface WeeklyMessageModalProps {
  onClose: () => void;
  onSend: () => void;
}

export const WeeklyMessageModal: React.FC<WeeklyMessageModalProps> = ({
  onClose,
  onSend,
}) => {
  const { user } = useAuth();
  const [students, setStudents] = useState<User[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetStudentId, setTargetStudentId] = useState<string>(''); // empty means all

  useEffect(() => {
    return FirebaseFirestoreService.subscribeToStudents(setStudents);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Por favor ingresa un título y el mensaje.');
      return;
    }

    try {
      await FirebaseFirestoreService.sendWeeklyMessage(
        title.trim(),
        message.trim(),
        targetStudentId || undefined,
        user?.id
      );

      onSend();
      onClose();
      alert('Mensaje semanal enviado con éxito a los estudiantes.');
    } catch (error) {
      console.error(error);
      alert('No fue posible enviar el mensaje semanal.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                Mensaje Semanal del Mentor
              </h3>
              <p className="text-xs text-slate-500">
                Aparece visible en la parte superior del panel del estudiante
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Destinatario:
            </label>
            <select
              value={targetStudentId}
              onChange={(e) => setTargetStudentId(e.target.value)}
              className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
            >
              <option value="">📢 Todos los 8 estudiantes del grupo</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  👤 Solo para {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Título del Mensaje:
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Semana 2: Cómo dominar la resistencia a empezar"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Contenido Motivacional / Instrucción:
            </label>
            <textarea
              rows={4}
              required
              placeholder="Escribe el mensaje inspirador para la semana de práctica en la vida real..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-emerald-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publicar Mensaje</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
