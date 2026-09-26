import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Brain,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { FirebaseFirestoreService } from '../../services/firebaseFirestoreService';
import { DiagnosticQuestion, DiagnosticResponse, Skill } from '../../types';

interface DiagnosticModalProps {
  studentId: string;
  onComplete: () => void;
  onClose?: () => void;
  allowClose?: boolean;
}

export const DiagnosticModal: React.FC<DiagnosticModalProps> = ({
  studentId,
  onComplete,
  onClose,
  allowClose = false,
}) => {
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedResult, setCompletedResult] = useState<{
    overallScore: number;
    suggestedLevel: number;
    skillScores: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    const unsubscribers = [
      FirebaseFirestoreService.subscribeToDiagnosticQuestions(setQuestions),
      FirebaseFirestoreService.subscribeToSkills(setSkills),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const currentQ: DiagnosticQuestion = questions[currentIndex];
  const currentSkill = skills.find((s) => s.id === currentQ?.skillId);

  const handleScoreSelect = (score: number) => {
    setResponses((prev) => ({
      ...prev,
      [currentQ.id]: score,
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate that all questions are answered
    const unanswered = questions.filter((q) => !responses[q.id]);
    if (unanswered.length > 0) {
      alert(`Por favor responde todas las preguntas. Faltan ${unanswered.length}.`);
      return;
    }

    setIsSubmitting(true);
    const formattedResponses: DiagnosticResponse[] = Object.entries(responses).map(
      ([questionId, score]) => ({
        questionId,
        score: Number(score),
      })
    );

    const result = await FirebaseFirestoreService.completeDiagnostic(studentId, formattedResponses);
    setCompletedResult({
      overallScore: result.overallScore,
      suggestedLevel: result.suggestedLevel,
      skillScores: result.skillScores,
    });

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }

    setIsSubmitting(false);
  };

  const answeredCount = Object.keys(responses).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  const getSkillIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5" />;
      case 'Target':
        return <Target className="w-5 h-5" />;
      case 'Brain':
        return <Brain className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  if (!questions.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6 p-8 text-center text-sm text-slate-500">
          Cargando diagnóstico...
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-white/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-emerald-200" />
              </span>
              <div>
                <h3 className="font-bold text-lg leading-tight">
                  Diagnóstico Inicial de Habilidades
                </h3>
                <p className="text-xs text-emerald-100">
                  Calibra tu punto de partida en la vida real
                </p>
              </div>
            </div>
            {allowClose && onClose && (
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white text-sm font-semibold"
              >
                Cerrar
              </button>
            )}
          </div>

          {!completedResult && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span>
                  Pregunta {currentIndex + 1} de {questions.length}
                </span>
                <span>{progressPercent}% completado</span>
              </div>
              <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-300 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {completedResult ? (
            /* Results Screen */
            <div className="space-y-6 text-center py-2">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-9 h-9" />
              </div>

              <div>
                <h4 className="text-xl font-bold text-slate-900">
                  ¡Diagnóstico Completado!
                </h4>
                <p className="text-sm text-slate-500 mt-1">
                  Se ha generado tu perfil base y ganaste{' '}
                  <span className="font-semibold text-emerald-600">+50 XP</span>{' '}
                  de bienvenida.
                </p>
              </div>

              {/* Suggested Level Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-around">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Puntaje Global
                  </span>
                  <div className="text-2xl font-black text-slate-800">
                    {completedResult.overallScore}{' '}
                    <span className="text-sm font-medium text-slate-400">/ 5.0</span>
                  </div>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Nivel Sugerido
                  </span>
                  <div className="text-2xl font-black text-emerald-600">
                    Nivel {completedResult.suggestedLevel}
                  </div>
                </div>
              </div>

              {/* Skills Breakdown */}
              <div className="space-y-3 text-left">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Resultados por Habilidad:
                </h5>
                {skills.map((skill) => {
                  const score = completedResult.skillScores[skill.id] || 0;
                  const pct = Math.round((score / 5) * 100);
                  return (
                    <div
                      key={skill.id}
                      className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <div className="flex items-center gap-2 font-semibold text-slate-800">
                          <span style={{ color: skill.color }}>
                            {getSkillIcon(skill.iconName)}
                          </span>
                          <span>{skill.name}</span>
                        </div>
                        <span className="font-bold text-slate-700">
                          {score.toFixed(1)} / 5.0
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: skill.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={onComplete}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                Comenzar mi Aventura en Aula Viva
              </button>
            </div>
          ) : (
            /* Question Step */
            <div className="space-y-6">
              {/* Skill Tag & Aspect */}
              <div className="flex items-center justify-between">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: `${currentSkill?.color}18`,
                    color: currentSkill?.color,
                  }}
                >
                  {currentSkill && getSkillIcon(currentSkill.iconName)}
                  <span>{currentSkill?.name}</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {currentQ.aspect}
                </span>
              </div>

              {/* Question Text */}
              <div className="min-h-[70px]">
                <h4 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
                  {currentQ.question}
                </h4>
              </div>

              {/* Likert Scale 1-5 */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] text-slate-500 font-medium px-1">
                  <span>1: Casi nunca</span>
                  <span>3: A veces</span>
                  <span>5: Siempre</span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const isSelected = responses[currentQ.id] === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleScoreSelect(val)}
                        className={`h-12 rounded-xl font-bold text-sm sm:text-base border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-102'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  Anterior
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!responses[currentQ.id]}
                    className="px-5 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={answeredCount < questions.length || isSubmitting}
                    className="px-6 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Guardando...' : 'Finalizar y Calibrar'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
