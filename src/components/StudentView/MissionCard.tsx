import React, { useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  Brain,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Flame,
  HelpCircle,
  Link2,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { FirebaseFirestoreService } from '../../services/firebaseFirestoreService';
import { uploadMissionEvidence, validateEvidenceFile } from '../../services/evidenceStorage';
import {
  Mission,
  MissionAssignment,
  MissionSubmission,
  Skill,
  StudentProfile,
} from '../../types';

interface MissionCardProps {
  mission: Mission;
  skill?: Skill;
  assignment?: MissionAssignment;
  submission?: MissionSubmission;
  studentProfile: StudentProfile;
  onRefresh: () => void;
  isHighlighted?: boolean;
}

export const MissionCard: React.FC<MissionCardProps> = ({
  mission,
  skill,
  assignment,
  submission,
  studentProfile,
  onRefresh,
  isHighlighted,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<'cumplida' | 'no_cumplida'>('cumplida');
  const [reflection, setReflection] = useState('');
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [evidenceMode, setEvidenceMode] = useState<'file' | 'link'>('file');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceFilePreview, setEvidenceFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check unlock condition (e.g. if mission requires diagnostic or streak)
  let isLocked = false;
  let lockReason = '';
  if (mission.unlockCondition) {
    if (
      mission.unlockCondition.toLowerCase().includes('diagnóstico') &&
      !studentProfile.diagnosticCompleted
    ) {
      isLocked = true;
      lockReason = 'Requiere completar el diagnóstico inicial';
    } else if (
      mission.unlockCondition.toLowerCase().includes('racha') &&
      studentProfile.currentStreak < 3
    ) {
      isLocked = true;
      lockReason = 'Requiere una racha mínima de 3 días';
    }
  }

  const isCompleted = submission?.status === 'cumplida';
  const isPendingReview = submission?.status === 'pendiente_aprobacion';
  const isFailed = submission?.status === 'no_cumplida';

  const handleOpenAction = (type: 'cumplida' | 'no_cumplida') => {
    setActionType(type);
    setShowModal(true);
  };

  const resetEvidenceState = () => {
    setEvidenceDescription('');
    setEvidenceUrl('');
    setEvidenceFile(null);
    setEvidenceFilePreview(null);
    setFileError(null);
    setUploadProgress(null);
    setEvidenceMode('file');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelected = (file: File | null) => {
    setFileError(null);
    if (!file) {
      setEvidenceFile(null);
      setEvidenceFilePreview(null);
      return;
    }
    const validationError = validateEvidenceFile(file);
    if (validationError) {
      setFileError(validationError);
      setEvidenceFile(null);
      setEvidenceFilePreview(null);
      return;
    }
    setEvidenceFile(file);
    setEvidenceFilePreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  const handleConfirmSubmission = async () => {
    const hasEvidence =
      evidenceDescription.trim() || evidenceUrl.trim() || evidenceFile;

    if (actionType === 'cumplida' && mission.requiresEvidence && !hasEvidence) {
      alert('Esta misión requiere adjuntar evidencia (sube una foto/PDF, describe lo que hiciste o agrega un enlace).');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalEvidenceUrl = evidenceUrl.trim() || undefined;
      let evidenceMeta: { fileName?: string; contentType?: string; storagePath?: string } | undefined;

      if (evidenceFile) {
        setUploadProgress(0);
        const { result } = uploadMissionEvidence(
          studentProfile.userId,
          mission.id,
          evidenceFile,
          setUploadProgress
        );
        const uploaded = await result;
        finalEvidenceUrl = uploaded.downloadUrl;
        evidenceMeta = {
          fileName: uploaded.fileName,
          contentType: uploaded.contentType,
          storagePath: uploaded.storagePath,
        };
      }

      await FirebaseFirestoreService.submitMission(
        studentProfile.userId,
        mission.id,
        actionType,
        reflection.trim() || undefined,
        finalEvidenceUrl,
        evidenceDescription.trim() || undefined,
        evidenceMeta
      );

      if (actionType === 'cumplida') {
        try {
          confetti({
            particleCount: 60,
            spread: 60,
            origin: { y: 0.7 },
          });
        } catch (e) {
          // ignore
        }
      }

      setShowModal(false);
      setReflection('');
      resetEvidenceState();
      onRefresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Ocurrió un error al registrar la misión');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'facil':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
            Fácil
          </span>
        );
      case 'media':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
            Media
          </span>
        );
      case 'dificil':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800">
            Difícil
          </span>
        );
      case 'epica':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800">
            Épica
          </span>
        );
      default:
        return null;
    }
  };

  const getSkillIcon = (iconName?: string) => {
    switch (iconName) {
      case 'ShieldCheck':
        return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'Target':
        return <Target className="w-3.5 h-3.5" />;
      case 'Brain':
        return <Brain className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      id={`mission-${mission.id}`}
      className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
        isHighlighted
          ? 'ring-4 ring-emerald-400 border-emerald-500 shadow-md scale-[1.01]'
          : ''
      } ${
        isLocked
          ? 'opacity-70 bg-slate-50 border-slate-200'
          : isCompleted
          ? 'border-emerald-200 bg-emerald-50/20'
          : isPendingReview
          ? 'border-amber-200 bg-amber-50/20'
          : isFailed
          ? 'border-rose-200 bg-rose-50/20'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top badges bar */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {skill && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: `${skill.color}15`,
                color: skill.color,
              }}
            >
              {getSkillIcon(skill.iconName)}
              <span>{skill.name}</span>
            </span>
          )}

          {getDifficultyBadge(mission.difficulty)}

          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 capitalize">
            {mission.type === 'reto/boss' ? '🔥 Reto Boss' : mission.type}
          </span>
        </div>

        {/* XP Value */}
        <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-black text-xs sm:text-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>+{mission.xp} XP</span>
        </div>
      </div>

      {/* Title & Description */}
      <div className="mb-3">
        <h4 className="font-bold text-slate-900 text-base leading-snug flex items-center gap-1.5">
          {isLocked && <Lock className="w-4 h-4 text-slate-400 shrink-0" />}
          <span>{mission.title}</span>
        </h4>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
          {mission.description}
        </p>
      </div>

      {/* Metadata Indicators: Evidence required & unlock condition */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-4 pt-1">
        {mission.requiresEvidence && (
          <span className="flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-medium">
            <Camera className="w-3.5 h-3.5" />
            Requiere evidencia
          </span>
        )}

        {isLocked && (
          <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            {lockReason}
          </span>
        )}
      </div>

      {/* Submission Status or Action Buttons */}
      {isCompleted ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Misión Cumplida (+{submission?.xpAwarded || mission.xp} XP)
            </span>
            <span className="text-emerald-700 font-medium">
              {submission?.submittedAt
                ? new Date(submission.submittedAt).toLocaleDateString()
                : 'Registrado'}
            </span>
          </div>
          {submission?.reflection && (
            <p className="text-xs text-slate-600 italic mt-2 bg-white/70 p-2 rounded-lg border border-emerald-100">
              "{submission.reflection}"
            </p>
          )}
          {submission?.mentorFeedback && (
            <div className="mt-2 text-xs text-indigo-900 bg-indigo-50/80 p-2 rounded-lg border border-indigo-200">
              <span className="font-bold">💬 Feedback del Mentor: </span>
              {submission.mentorFeedback}
            </div>
          )}
        </div>
      ) : isPendingReview ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-800">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
            Evidencia enviada • En revisión por el Mentor
          </div>
          <p className="text-slate-600 mt-1">
            Los +{mission.xp} XP se acreditarán tan pronto tu mentor revise la evidencia.
          </p>
        </div>
      ) : isFailed ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-bold text-rose-800">
            <XCircle className="w-4 h-4 text-rose-600" />
            No cumplida esta vez
          </span>
          <button
            onClick={() => handleOpenAction('cumplida')}
            className="text-xs text-emerald-700 font-bold underline hover:text-emerald-800 cursor-pointer"
          >
            Reintentar hoy
          </button>
        </div>
      ) : (
        /* Action Buttons: Cumplí / No cumplí */
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            disabled={isLocked}
            onClick={() => handleOpenAction('cumplida')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Cumplí</span>
          </button>

          <button
            type="button"
            disabled={isLocked}
            onClick={() => handleOpenAction('no_cumplida')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-slate-400" />
            <span>No cumplí</span>
          </button>
        </div>
      )}

      {/* Reflection & Evidence Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {actionType === 'cumplida' ? (
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-900 text-base">
                    {actionType === 'cumplida'
                      ? '¡Excelente trabajo!'
                      : 'Un día a la vez'}
                  </h4>
                  <p className="text-xs text-slate-500">{mission.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              {actionType === 'cumplida' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Reflexión personal (Opcional):
                    </label>
                    <textarea
                      rows={3}
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      placeholder="¿Qué sentiste al practicarlo en la vida real? ¿Qué te ayudó a no postergar?"
                      className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-emerald-500 resize-none text-slate-800"
                    />
                  </div>

                  {mission.requiresEvidence && (
                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                        <Camera className="w-4 h-4 text-indigo-600" />
                        <span>Evidencia Requerida para Validación</span>
                      </div>
                      <p className="text-[11px] text-indigo-800">
                        Esta misión requiere que adjuntes evidencia para que tu mentor la apruebe (+{mission.xp} XP).
                      </p>
                      <div>
                        <input
                          type="text"
                          value={evidenceDescription}
                          onChange={(e) => setEvidenceDescription(e.target.value)}
                          placeholder="Describe brevemente tu evidencia (ej: 'Foto del mapa mental en cuaderno')"
                          className="w-full p-2.5 text-xs bg-white border border-indigo-200 rounded-lg text-slate-800 focus:outline-indigo-500"
                        />
                      </div>
                      <div>
                        <input
                          type="url"
                          value={evidenceUrl}
                          onChange={(e) => setEvidenceUrl(e.target.value)}
                          placeholder="Enlace o imagen (opcional si ya describiste)"
                          className="w-full p-2.5 text-xs bg-white border border-indigo-200 rounded-lg text-slate-800 focus:outline-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600">
                    En Aula Viva la honestidad es la clave de la maestría. Si hoy no pudiste, reconocerlo es el primer paso.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      ¿Qué obstáculo se presentó hoy?
                    </label>
                    <textarea
                      rows={3}
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      placeholder="Ej: Mucha carga académica, falta de energía, olvido..."
                      className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-slate-500 resize-none text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Confirmation CTA */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmission}
                  disabled={isSubmitting}
                  className={`flex-1 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer ${
                    actionType === 'cumplida'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {isSubmitting
                    ? 'Guardando...'
                    : actionType === 'cumplida'
                    ? 'Confirmar y Ganar XP'
                    : 'Registrar Aprendizaje'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
