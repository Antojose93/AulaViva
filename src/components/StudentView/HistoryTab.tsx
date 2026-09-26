import React from 'react';
import {
  Brain,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import { Mission, MissionSubmission, Skill } from '../../types';

interface HistoryTabProps {
  submissions: MissionSubmission[];
  missions: Mission[];
  skills: Skill[];
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  submissions,
  missions,
  skills,
}) => {
  const missionsMap = new Map<string, Mission>(missions.map((m) => [m.id, m]));
  const skillsMap = new Map<string, Skill>(skills.map((s) => [s.id, s]));

  if (submissions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h4 className="font-bold text-slate-800 text-sm">Sin actividad registrada aún</h4>
        <p className="text-xs text-slate-500 mt-1">
          Tus misiones cumplidas y reflexiones diarias aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Historial de Misiones y Reflexiones
        </h3>
        <span className="text-xs text-slate-500 font-semibold">
          {submissions.length} Registros
        </span>
      </div>

      <div className="space-y-2.5">
        {submissions.map((sub) => {
          const mission = missionsMap.get(sub.missionId);
          const skill = mission ? skillsMap.get(mission.skillId) : undefined;
          const isFulfilled = sub.status === 'cumplida';
          const isPending = sub.status === 'pendiente_aprobacion';

          return (
            <div
              key={sub.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isFulfilled
                        ? 'bg-emerald-100 text-emerald-700'
                        : isPending
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {isFulfilled ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isPending ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {mission?.title || 'Misión'}
                      </h4>
                      {skill && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${skill.color}15`,
                            color: skill.color,
                          }}
                        >
                          {skill.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(sub.submittedAt).toLocaleDateString()} a las{' '}
                        {new Date(sub.submittedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {isFulfilled ? (
                    <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                      +{sub.xpAwarded} XP
                    </span>
                  ) : isPending ? (
                    <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-800 text-xs font-semibold">
                      En revisión
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-semibold">
                      0 XP
                    </span>
                  )}
                </div>
              </div>

              {/* Reflection text */}
              {sub.reflection && (
                <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                  <div className="font-semibold text-slate-500 mb-0.5">
                    Reflexión del estudiante:
                  </div>
                  <p className="italic">"{sub.reflection}"</p>
                </div>
              )}

              {/* Evidence info */}
              {sub.evidenceDescription && (
                <div className="mt-2 text-xs text-indigo-700 font-medium">
                  📎 Evidencia: {sub.evidenceDescription}
                </div>
              )}

              {/* Mentor feedback */}
              {sub.mentorFeedback && (
                <div className="mt-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                  <div className="font-bold flex items-center gap-1 text-emerald-800 mb-0.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Nota del Mentor:</span>
                  </div>
                  <p>{sub.mentorFeedback}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
