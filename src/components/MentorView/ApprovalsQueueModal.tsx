import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FirebaseFirestoreService } from '../../services/firebaseFirestoreService';
import { Mission, MissionSubmission, User } from '../../types';

interface ApprovalsQueueModalProps {
  onClose: () => void;
  onRefresh: () => void;
}

export const ApprovalsQueueModal: React.FC<ApprovalsQueueModalProps> = ({
  onClose,
  onRefresh,
}) => {
  const { user } = useAuth();
  const [pendingSubmissions, setPendingSubmissions] = useState<
    (MissionSubmission & { mission?: Mission; student?: User })[]
  >([]);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    return FirebaseFirestoreService.subscribeToPendingSubmissions(setPendingSubmissions);
  }, []);

  useEffect(() => {
    if (!pendingSubmissions.length) {
      setSelectedSubId(null);
      return;
    }

    if (!selectedSubId || !pendingSubmissions.some((item) => item.id === selectedSubId)) {
      setSelectedSubId(pendingSubmissions[0].id);
    }
  }, [pendingSubmissions, selectedSubId]);

  const selectedItem = useMemo(
    () => pendingSubmissions.find((s) => s.id === selectedSubId),
    [pendingSubmissions, selectedSubId]
  );

  const handleReview = async (approved: boolean) => {
    if (!selectedSubId) return;

    setIsProcessing(true);
    try {
      await FirebaseFirestoreService.reviewSubmission(
        selectedSubId,
        approved,
        feedback.trim() || undefined,
        user?.id
      );

      if (approved) {
        try {
          confetti({
            particleCount: 50,
            spread: 50,
            origin: { y: 0.6 },
          });
        } catch (e) {
          // ignore
        }
      }

      setFeedback('');
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('Error al procesar la entrega.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                Cola de Validación de Evidencias
              </h3>
              <p className="text-xs text-slate-500">
                {pendingSubmissions.length} entregas pendientes de aprobación
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
        {pendingSubmissions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">
              ¡Al día! No hay evidencias pendientes
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Todas las misiones que requerían validación han sido revisadas y
              acreditadas a los estudiantes.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left list */}
            <div className="w-full md:w-72 border-r border-slate-200 p-3 overflow-y-auto space-y-2 bg-slate-50/50">
              {pendingSubmissions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedSubId(item.id);
                    setFeedback('');
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedSubId === item.id
                      ? 'bg-white border-emerald-500 shadow-sm ring-2 ring-emerald-100'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <img
                      src={item.student?.avatar}
                      alt={item.student?.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {item.student?.name}
                    </span>
                  </div>
                  <h5 className="font-semibold text-xs text-slate-700 line-clamp-1">
                    {item.mission?.title}
                  </h5>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>+{item.mission?.xp} XP</span>
                    <span>
                      {new Date(item.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Right details */}
            {selectedItem && (
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={selectedItem.student?.avatar}
                      alt={selectedItem.student?.name}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {selectedItem.student?.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Entregado:{' '}
                        {new Date(selectedItem.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    +{selectedItem.mission?.xp} XP en juego
                  </span>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Misión a Validar:
                  </h5>
                  <p className="font-bold text-sm text-slate-900">
                    {selectedItem.mission?.title}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selectedItem.mission?.description}
                  </p>
                </div>

                {/* Reflection */}
                {selectedItem.reflection && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-600 block mb-0.5">
                      Reflexión del Estudiante:
                    </span>
                    <p className="text-xs text-slate-800 italic">
                      "{selectedItem.reflection}"
                    </p>
                  </div>
                )}

                {/* Evidence Attached */}
                <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-100 space-y-2">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <span>Evidencia Adjunta:</span>
                  </span>

                  {selectedItem.evidenceDescription && (
                    <p className="text-xs text-indigo-950 font-medium">
                      {selectedItem.evidenceDescription}
                    </p>
                  )}

                  {selectedItem.evidenceUrl && (
                    <div className="pt-1">
                      <a
                        href={selectedItem.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold underline"
                      >
                        <span>Ver evidencia fotográfica / enlace</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Mentor Feedback Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Feedback Cualitativo del Mentor:
                  </label>
                  <textarea
                    rows={2}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Escribe un mensaje de refuerzo positivo o recomendación para el estudiante..."
                    className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-emerald-500 text-slate-800 resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleReview(false)}
                    className="flex-1 py-2.5 text-xs sm:text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Pedir Corrección / Rechazar</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleReview(true)}
                    className="flex-1 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aprobar y Acreditar XP</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
