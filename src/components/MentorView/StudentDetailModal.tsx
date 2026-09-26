import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Brain,
  Calendar,
  CheckCheck,
  CheckCircle2,
  Clock,
  Edit3,
  Flame,
  Footprints,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { calculateStudentHealth, getLevelProgress } from '../../services/gamification';
import { FirebaseFirestoreService } from '../../services/firebaseFirestoreService';
import {
  Badge,
  DiagnosticResult,
  EarnedBadge,
  Mission,
  MissionAssignment,
  MissionSubmission,
  Skill,
  SkillLevel,
  StudentProfile,
  User,
} from '../../types';

interface StudentDetailModalProps {
  student: User;
  onClose: () => void;
  onRefresh: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  onClose,
  onRefresh,
}) => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillLevels, setSkillLevels] = useState<SkillLevel[]>([]);
  const [assignments, setAssignments] = useState<MissionAssignment[]>([]);
  const [submissions, setSubmissions] = useState<MissionSubmission[]>([]);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const missionsMap = new Map<string, Mission>(missions.map((m) => [m.id, m]));

  const [mentorNotes, setMentorNotes] = useState('');
  const [adjustedLevel, setAdjustedLevel] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [assigningBadgeId, setAssigningBadgeId] = useState<string | null>(null);
  const [revokingBadgeId, setRevokingBadgeId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribers = [
      FirebaseFirestoreService.subscribeToStudentProfile(student.id, setProfile),
      FirebaseFirestoreService.subscribeToSkills(setSkills),
      FirebaseFirestoreService.subscribeToSkillLevels(student.id, setSkillLevels),
      FirebaseFirestoreService.subscribeToStudentAssignments(student.id, setAssignments),
      FirebaseFirestoreService.subscribeToStudentSubmissions(student.id, setSubmissions),
      FirebaseFirestoreService.subscribeToDiagnosticResult(student.id, setDiagnostic),
      FirebaseFirestoreService.subscribeToEarnedBadges(student.id, setEarnedBadges),
      FirebaseFirestoreService.subscribeToBadges(setAllBadges),
      FirebaseFirestoreService.subscribeToMissionsForStudent(student.id, setMissions),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [student.id]);

  useEffect(() => {
    if (profile) {
      setMentorNotes(profile.mentorNotes || '');
      setAdjustedLevel(profile.suggestedLevel || 1);
    }
  }, [profile]);

  if (!profile) return null;

  const health = calculateStudentHealth(submissions, assignments.length);
  const levelProgress = getLevelProgress(profile.overallXp);

  const handleSaveMentorEvaluation = async () => {
    setIsSaving(true);
    try {
      await FirebaseFirestoreService.adjustStudentProfile(student.id, {
        mentorNotes: mentorNotes.trim(),
        suggestedLevel: adjustedLevel,
      });
      onRefresh();
      alert('Evaluación y notas del mentor actualizadas con éxito.');
    } catch (error) {
      console.error(error);
      alert('No fue posible actualizar la evaluación del mentor.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignBadge = async (badge: Badge) => {
    if (!window.confirm(`¿Otorgar la insignia "${badge.name}" a ${student.name}?`)) return;
    setAssigningBadgeId(badge.id);
    try {
      await FirebaseFirestoreService.assignBadgeManually(student.id, badge.id);
      onRefresh();
      alert('¡Insignia asignada con éxito!');
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'No fue posible asignar la insignia.');
    } finally {
      setAssigningBadgeId(null);
    }
  };

  const handleRevokeBadge = async (earnedBadge: EarnedBadge, badge?: Badge) => {
    if (
      !window.confirm(
        `¿Revocar la insignia "${badge?.name || 'seleccionada'}" a ${student.name}?`
      )
    )
      return;
    setRevokingBadgeId(earnedBadge.id);
    try {
      await FirebaseFirestoreService.revokeEarnedBadge(earnedBadge.id);
      onRefresh();
    } catch (error) {
      console.error(error);
      alert('No fue posible revocar la insignia.');
    } finally {
      setRevokingBadgeId(null);
    }
  };

  const getBadgeIcon = (iconName: string, className = 'w-5 h-5') => {
    switch (iconName) {
      case 'Trophy':
        return <Award className={className} />;
      case 'Sparkles':
        return <Sparkles className={className} />;
      case 'ShieldCheck':
        return <ShieldCheck className={className} />;
      case 'Target':
        return <Target className={className} />;
      case 'Footprints':
        return <Footprints className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'CheckCheck':
        return <CheckCheck className={className} />;
      default:
        return <Award className={className} />;
    }
  };

  const getHealthPill = (status: string) => {
    switch (status) {
      case 'optimo':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            🟢 Óptimo (&gt;80%)
          </span>
        );
      case 'observacion':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            🟡 En Observación (50-80%)
          </span>
        );
      case 'riesgo':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-bounce" />
            🔴 En Riesgo (&lt;50%)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <img
              src={student.avatar}
              alt={student.name}
              className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900 leading-tight">
                  {student.name}
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                  {profile.grade}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{student.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {getHealthPill(profile.statusHealth)}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Cumplimiento
              </span>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {health.completionRate}%
              </div>
              <span className="text-[11px] text-slate-500">
                {submissions.filter((s) => s.status === 'cumplida').length} de{' '}
                {assignments.length} misiones
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Racha Actual
              </span>
              <div className="text-xl font-black text-amber-600 flex items-center gap-1 mt-0.5">
                <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
                <span>{profile.currentStreak} días</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Récord: {profile.longestStreak} días
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Nivel & XP
              </span>
              <div className="text-xl font-black text-emerald-600 mt-0.5">
                Nivel {levelProgress.level}
              </div>
              <span className="text-[11px] text-slate-500">
                {profile.overallXp} XP acumulada
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Insignias
              </span>
              <div className="text-xl font-black text-indigo-600 mt-0.5">
                {earnedBadges.length} / {allBadges.length}
              </div>
              <span className="text-[11px] text-slate-500">Desbloqueadas</span>
            </div>
          </div>

          {/* Diagnostic & Skills Progression */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Diagnóstico Inicial & Calibración</span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {profile.diagnosticCompleted ? 'Completado' : 'Pendiente'}
              </span>
            </div>

            {diagnostic ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-slate-600">
                    Puntaje Global Cuestionario:
                  </span>
                  <span className="font-black text-slate-800 text-sm">
                    {diagnostic.overallScore} / 5.0
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {skills.map((skill) => {
                    const score = diagnostic.skillScores[skill.id] || 0;
                    return (
                      <div
                        key={skill.id}
                        className="bg-white p-3 rounded-xl border border-slate-200 text-center"
                      >
                        <span className="text-xs font-bold text-slate-700 block truncate">
                          {skill.name}
                        </span>
                        <span
                          className="text-lg font-black block mt-0.5"
                          style={{ color: skill.color }}
                        >
                          {score.toFixed(1)} / 5
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                ⚠️ El estudiante aún no ha respondido el cuestionario diagnóstico inicial.
              </div>
            )}

            {/* Mentor Adjustment Controls */}
            <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nivel Sugerido por el Mentor:
                </label>
                <select
                  value={adjustedLevel}
                  onChange={(e) => setAdjustedLevel(Number(e.target.value))}
                  className="w-full p-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 font-medium"
                >
                  <option value={1}>Nivel 1 (Fundamentos / Refuerzo)</option>
                  <option value={2}>Nivel 2 (Intermedio / Hábito Activo)</option>
                  <option value={3}>Nivel 3 (Avanzado / Retos Autónomos)</option>
                  <option value={4}>Nivel 4 (Líder / Maestría)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notas de Acompañamiento:
                </label>
                <input
                  type="text"
                  value={mentorNotes}
                  onChange={(e) => setMentorNotes(e.target.value)}
                  placeholder="Observaciones pedagógicas del estudiante..."
                  className="w-full p-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800"
                />
              </div>
            </div>

            <div className="text-right">
              <button
                type="button"
                onClick={handleSaveMentorEvaluation}
                disabled={isSaving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {isSaving ? 'Guardando...' : 'Guardar Evaluación'}
              </button>
            </div>
          </div>

          {/* Badges: earned overview + manual assignment */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Insignias ({earnedBadges.length} / {allBadges.length})</span>
            </div>

            {earnedBadges.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                El estudiante aún no ha desbloqueado ninguna insignia.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {earnedBadges.map((eb) => {
                  const badge = allBadges.find((b) => b.id === eb.badgeId);
                  if (!badge) return null;
                  const isManual = eb.awardedBy === 'mentor';
                  return (
                    <div
                      key={eb.id}
                      className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          {getBadgeIcon(badge.icon, 'w-4 h-4')}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{badge.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(eb.earnedAt).toLocaleDateString()}
                            {isManual ? ' · asignada por mentor' : ''}
                          </p>
                        </div>
                      </div>
                      {isManual && (
                        <button
                          type="button"
                          onClick={() => handleRevokeBadge(eb, badge)}
                          disabled={revokingBadgeId === eb.id}
                          title="Revocar insignia"
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {(() => {
              const earnedBadgeIds = new Set(earnedBadges.map((eb) => eb.badgeId));
              const assignableBadges = allBadges.filter(
                (b) => b.conditionType === 'custom' && !earnedBadgeIds.has(b.id)
              );
              if (assignableBadges.length === 0) return null;
              return (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Asignar Insignia Manual
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {assignableBadges.map((badge) => (
                      <div
                        key={badge.id}
                        className="p-2.5 bg-white rounded-xl border border-dashed border-slate-300 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                            {getBadgeIcon(badge.icon, 'w-4 h-4')}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{badge.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {badge.description}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAssignBadge(badge)}
                          disabled={assigningBadgeId === badge.id}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shrink-0 cursor-pointer disabled:opacity-60"
                        >
                          Asignar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Submissions & Reflections History */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Historial Reciente de Misiones ({submissions.length})
            </h4>

            {submissions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                El estudiante aún no tiene registros de misiones.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {submissions.map((sub) => {
                  const m = missionsMap.get(sub.missionId);
                  return (
                    <div
                      key={sub.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {sub.status === 'cumplida' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : sub.status === 'pendiente_aprobacion' ? (
                            <Clock className="w-4 h-4 text-amber-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-500" />
                          )}
                          <span className="font-bold text-slate-800">
                            {m?.title || 'Misión'}
                          </span>
                        </div>
                        <span className="font-semibold text-slate-500">
                          {new Date(sub.submittedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {sub.reflection && (
                        <p className="text-slate-600 italic bg-slate-50 p-2 rounded-lg">
                          "{sub.reflection}"
                        </p>
                      )}

                      {sub.evidenceDescription && (
                        <span className="text-indigo-700 font-medium">
                          📎 Evidencia: {sub.evidenceDescription}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
