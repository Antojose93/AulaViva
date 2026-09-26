import React, { useEffect, useState } from 'react';
import {
  Award,
  Brain,
  CheckCheck,
  Flame,
  Footprints,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Trophy,
} from 'lucide-react';
import { FirebaseFirestoreService } from '../../services/firebaseFirestoreService';
import { Badge, DiagnosticQuestion, Skill } from '../../types';

interface SkillsAndBadgesModalProps {
  onClose: () => void;
  onRefresh: () => void;
}

type ActiveSubTab = 'skills' | 'badges' | 'diagnostic';

interface SkillFormState {
  name: string;
  description: string;
  color: string;
  iconName: string;
}

interface BadgeFormState {
  name: string;
  description: string;
  icon: string;
  category: Badge['category'];
  conditionType: Badge['conditionType'];
  conditionThreshold: string;
}

interface DiagnosticFormState {
  skillId: string;
  question: string;
  aspect: string;
}

const SKILL_ICON_OPTIONS = ['Sparkles', 'Brain', 'ShieldCheck', 'Target'] as const;
const BADGE_ICON_OPTIONS = [
  'Award',
  'Trophy',
  'Sparkles',
  'ShieldCheck',
  'Target',
  'Footprints',
  'Flame',
  'CheckCheck',
] as const;

const BADGE_CONDITION_LABELS: Record<Badge['conditionType'], string> = {
  first_mission: 'Primera Misión Completada',
  streak_7: 'Racha de 7 días',
  missions_10: '10 Misiones Cumplidas',
  hard_challenge: 'Reto Difícil / Boss Superado',
  skill_level_3: 'Nivel de Habilidad 3',
  custom: 'Personalizado (manual)',
};

const createInitialSkillForm = (): SkillFormState => ({
  name: '',
  description: '',
  color: '#8b5cf6',
  iconName: 'Sparkles',
});

const createInitialBadgeForm = (): BadgeFormState => ({
  name: '',
  description: '',
  icon: 'Award',
  category: 'especial',
  conditionType: 'first_mission',
  conditionThreshold: '',
});

const createInitialDiagnosticForm = (skillId = ''): DiagnosticFormState => ({
  skillId,
  question: '',
  aspect: '',
});

const getSkillIcon = (iconName: string, className = 'w-5 h-5') => {
  switch (iconName) {
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'Target':
      return <Target className={className} />;
    case 'Brain':
      return <Brain className={className} />;
    default:
      return <Sparkles className={className} />;
  }
};

const getBadgeIcon = (iconName: string, className = 'w-5 h-5') => {
  switch (iconName) {
    case 'Trophy':
      return <Trophy className={className} />;
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

export const SkillsAndBadgesModal: React.FC<SkillsAndBadgesModalProps> = ({
  onClose,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('skills');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<DiagnosticQuestion[]>([]);

  const [showSkillForm, setShowSkillForm] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillForm, setSkillForm] = useState<SkillFormState>(createInitialSkillForm());

  const [showBadgeForm, setShowBadgeForm] = useState(false);
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const [badgeForm, setBadgeForm] = useState<BadgeFormState>(createInitialBadgeForm());

  const [showDiagnosticForm, setShowDiagnosticForm] = useState(false);
  const [editingDiagnosticId, setEditingDiagnosticId] = useState<string | null>(null);
  const [diagnosticForm, setDiagnosticForm] = useState<DiagnosticFormState>(
    createInitialDiagnosticForm()
  );

  useEffect(() => {
    const unsubscribers = [
      FirebaseFirestoreService.subscribeToSkills(setSkills),
      FirebaseFirestoreService.subscribeToBadges(setBadges),
      FirebaseFirestoreService.subscribeToDiagnosticQuestions(setDiagnosticQuestions),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  useEffect(() => {
    if (!diagnosticForm.skillId && skills[0]?.id) {
      setDiagnosticForm((prev) => ({ ...prev, skillId: skills[0].id }));
    }
  }, [diagnosticForm.skillId, skills]);

  const resetSkillForm = () => {
    setShowSkillForm(false);
    setEditingSkillId(null);
    setSkillForm(createInitialSkillForm());
  };

  const resetBadgeForm = () => {
    setShowBadgeForm(false);
    setEditingBadgeId(null);
    setBadgeForm(createInitialBadgeForm());
  };

  const resetDiagnosticForm = () => {
    setShowDiagnosticForm(false);
    setEditingDiagnosticId(null);
    setDiagnosticForm(createInitialDiagnosticForm(skills[0]?.id || ''));
  };

  const handleCreateOrUpdateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillForm.name.trim() || !skillForm.description.trim()) return;

    try {
      const payload = {
        name: skillForm.name.trim(),
        description: skillForm.description.trim(),
        color: skillForm.color,
        iconName: skillForm.iconName,
      };

      if (editingSkillId) {
        await FirebaseFirestoreService.updateSkill(editingSkillId, payload);
        alert('¡Habilidad actualizada con éxito!');
      } else {
        await FirebaseFirestoreService.createSkill({
          ...payload,
          category: 'custom',
        });
        alert('¡Nueva habilidad para la vida agregada con éxito!');
      }

      resetSkillForm();
      onRefresh();
    } catch (error) {
      console.error(error);
      alert('No fue posible guardar la habilidad en Firestore.');
    }
  };

  const handleCreateOrUpdateBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeForm.name.trim() || !badgeForm.description.trim()) return;

    try {
      const shouldStoreThreshold =
        (badgeForm.conditionType === 'streak_7' ||
          badgeForm.conditionType === 'missions_10' ||
          badgeForm.conditionType === 'first_mission' ||
          badgeForm.conditionType === 'hard_challenge' ||
          badgeForm.conditionType === 'skill_level_3') &&
        badgeForm.conditionThreshold.trim() !== '';
      const parsedThreshold = shouldStoreThreshold
        ? Number(badgeForm.conditionThreshold)
        : undefined;

      if (shouldStoreThreshold && Number.isNaN(parsedThreshold)) {
        alert('La condición umbral debe ser un número válido.');
        return;
      }

      const payload = {
        name: badgeForm.name.trim(),
        description: badgeForm.description.trim(),
        icon: badgeForm.icon,
        category: badgeForm.category,
        conditionType: badgeForm.conditionType,
        conditionThreshold: parsedThreshold,
      };

      if (editingBadgeId) {
        await FirebaseFirestoreService.updateBadge(editingBadgeId, payload);
        alert('¡Insignia actualizada con éxito!');
      } else {
        await FirebaseFirestoreService.createBadge({
          name: payload.name,
          description: payload.description,
          icon: payload.icon,
          category: payload.category,
          conditionType: payload.conditionType,
          ...(parsedThreshold !== undefined
            ? { conditionThreshold: parsedThreshold }
            : {}),
        });
        alert('¡Nueva insignia configurable creada!');
      }

      resetBadgeForm();
      onRefresh();
    } catch (error) {
      console.error(error);
      alert('No fue posible guardar la insignia en Firestore.');
    }
  };

  const handleCreateOrUpdateDiagnosticQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosticForm.skillId || !diagnosticForm.question.trim() || !diagnosticForm.aspect.trim()) {
      return;
    }

    try {
      const payload = {
        skillId: diagnosticForm.skillId,
        question: diagnosticForm.question.trim(),
        aspect: diagnosticForm.aspect.trim(),
      };

      if (editingDiagnosticId) {
        await FirebaseFirestoreService.updateDiagnosticQuestion(editingDiagnosticId, payload);
        alert('¡Pregunta diagnóstica actualizada con éxito!');
      } else {
        await FirebaseFirestoreService.createDiagnosticQuestion(payload);
        alert('¡Nueva pregunta diagnóstica creada!');
      }

      resetDiagnosticForm();
      onRefresh();
    } catch (error) {
      console.error(error);
      alert('No fue posible guardar la pregunta diagnóstica en Firestore.');
    }
  };

  const handleEditSkill = (skill: Skill) => {
    setActiveSubTab('skills');
    setShowSkillForm(true);
    setEditingSkillId(skill.id);
    setSkillForm({
      name: skill.name,
      description: skill.description,
      color: skill.color,
      iconName: skill.iconName,
    });
  };

  const handleDeleteSkill = async (skill: Skill) => {
    if (!window.confirm(`¿Deseas eliminar la habilidad "${skill.name}" del catálogo?`)) {
      return;
    }

    try {
      await FirebaseFirestoreService.deleteSkill(skill.id);
      if (editingSkillId === skill.id) {
        resetSkillForm();
      }
      onRefresh();
      alert('Habilidad eliminada con éxito.');
    } catch (error) {
      console.error(error);
      alert('No fue posible eliminar la habilidad en Firestore.');
    }
  };

  const handleEditBadge = (badge: Badge) => {
    setActiveSubTab('badges');
    setShowBadgeForm(true);
    setEditingBadgeId(badge.id);
    setBadgeForm({
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      category: badge.category,
      conditionType: badge.conditionType,
      conditionThreshold: badge.conditionThreshold?.toString() || '',
    });
  };

  const handleDeleteBadge = async (badge: Badge) => {
    if (!window.confirm(`¿Deseas eliminar la insignia "${badge.name}" del catálogo?`)) {
      return;
    }

    try {
      await FirebaseFirestoreService.deleteBadge(badge.id);
      if (editingBadgeId === badge.id) {
        resetBadgeForm();
      }
      onRefresh();
      alert('Insignia eliminada con éxito.');
    } catch (error) {
      console.error(error);
      alert('No fue posible eliminar la insignia en Firestore.');
    }
  };

  const handleEditDiagnosticQuestion = (question: DiagnosticQuestion) => {
    setActiveSubTab('diagnostic');
    setShowDiagnosticForm(true);
    setEditingDiagnosticId(question.id);
    setDiagnosticForm({
      skillId: question.skillId,
      question: question.question,
      aspect: question.aspect,
    });
  };

  const handleDeleteDiagnosticQuestion = async (question: DiagnosticQuestion) => {
    if (
      !window.confirm(
        '¿Deseas eliminar esta pregunta diagnóstica del catálogo de evaluación?'
      )
    ) {
      return;
    }

    try {
      await FirebaseFirestoreService.deleteDiagnosticQuestion(question.id);
      if (editingDiagnosticId === question.id) {
        resetDiagnosticForm();
      }
      onRefresh();
      alert('Pregunta diagnóstica eliminada con éxito.');
    } catch (error) {
      console.error(error);
      alert('No fue posible eliminar la pregunta diagnóstica en Firestore.');
    }
  };

  const toggleSkillForm = () => {
    if (showSkillForm && !editingSkillId) {
      resetSkillForm();
      return;
    }

    setEditingSkillId(null);
    setShowSkillForm(true);
    setSkillForm(createInitialSkillForm());
  };

  const toggleBadgeForm = () => {
    if (showBadgeForm && !editingBadgeId) {
      resetBadgeForm();
      return;
    }

    setEditingBadgeId(null);
    setShowBadgeForm(true);
    setBadgeForm(createInitialBadgeForm());
  };

  const toggleDiagnosticForm = () => {
    if (showDiagnosticForm && !editingDiagnosticId) {
      resetDiagnosticForm();
      return;
    }

    setEditingDiagnosticId(null);
    setShowDiagnosticForm(true);
    setDiagnosticForm(createInitialDiagnosticForm(skills[0]?.id || ''));
  };

  const getSkillName = (skillId: string) =>
    skills.find((skill) => skill.id === skillId)?.name || 'Habilidad no disponible';

  const getSkillColor = (skillId: string) =>
    skills.find((skill) => skill.id === skillId)?.color || '#94a3b8';

  const getSkillIconName = (skillId: string) =>
    skills.find((skill) => skill.id === skillId)?.iconName || 'Sparkles';

  const showBadgeThresholdField =
    badgeForm.conditionType === 'streak_7' ||
    badgeForm.conditionType === 'missions_10' ||
    badgeForm.conditionType === 'first_mission' ||
    badgeForm.conditionType === 'hard_challenge' ||
    badgeForm.conditionType === 'skill_level_3';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">
              Catálogo de Habilidades, Insignias y Diagnóstico
            </h3>
            <p className="text-xs text-slate-500">
              Configura el contenido sintético del piloto sin modificar código
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-100/60 p-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveSubTab('skills')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'skills'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Brain className="w-4 h-4 text-emerald-600" />
            <span>Habilidades ({skills.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('badges')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'badges'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Insignias ({badges.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('diagnostic')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSubTab === 'diagnostic'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Diagnóstico ({diagnosticQuestions.length})</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {activeSubTab === 'skills' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Habilidades en el Piloto
                </span>
                <button
                  onClick={toggleSkillForm}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showSkillForm && !editingSkillId ? 'Ocultar Formulario' : 'Nueva Habilidad'}</span>
                </button>
              </div>

              {showSkillForm && (
                <form
                  onSubmit={handleCreateOrUpdateSkill}
                  className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3 animate-in fade-in duration-150"
                >
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    {editingSkillId ? 'Editar Habilidad' : 'Registrar Nueva Habilidad'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Nombre (ej: Gestión Emocional)"
                      value={skillForm.name}
                      onChange={(e) =>
                        setSkillForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                    />
                    <select
                      value={skillForm.iconName}
                      onChange={(e) =>
                        setSkillForm((prev) => ({ ...prev, iconName: e.target.value }))
                      }
                      className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                    >
                      {SKILL_ICON_OPTIONS.map((iconName) => (
                        <option key={iconName} value={iconName}>
                          {iconName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Color:</span>
                    <input
                      type="color"
                      value={skillForm.color}
                      onChange={(e) =>
                        setSkillForm((prev) => ({ ...prev, color: e.target.value }))
                      }
                      className="w-10 h-8 rounded-lg cursor-pointer border border-slate-200"
                    />
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: skillForm.color }}
                    >
                      {getSkillIcon(skillForm.iconName)}
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    required
                    placeholder="Descripción y propósito formativo..."
                    value={skillForm.description}
                    onChange={(e) =>
                      setSkillForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetSkillForm}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      {editingSkillId ? 'Guardar Cambios' : 'Guardar Habilidad'}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2.5">
                {skills.length === 0 && (
                  <div className="p-4 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    No hay habilidades configuradas en Firestore.
                  </div>
                )}

                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: skill.color }}
                      >
                        {getSkillIcon(skill.iconName)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{skill.name}</h4>
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 uppercase">
                            {skill.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {skill.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleEditSkill(skill)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSkill(skill)}
                        className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'badges' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Insignias Configurables
                </span>
                <button
                  onClick={toggleBadgeForm}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showBadgeForm && !editingBadgeId ? 'Ocultar Formulario' : 'Nueva Insignia'}</span>
                </button>
              </div>

              {showBadgeForm && (
                <form
                  onSubmit={handleCreateOrUpdateBadge}
                  className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3 animate-in fade-in duration-150"
                >
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    {editingBadgeId ? 'Editar Insignia' : 'Configurar Nueva Insignia'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Nombre (ej: Guerrero del Foco)"
                      value={badgeForm.name}
                      onChange={(e) =>
                        setBadgeForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                    />
                    <select
                      value={badgeForm.category}
                      onChange={(e) =>
                        setBadgeForm((prev) => ({
                          ...prev,
                          category: e.target.value as Badge['category'],
                        }))
                      }
                      className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                    >
                      <option value="constancia">Constancia</option>
                      <option value="habilidad">Habilidad</option>
                      <option value="misiones">Misiones</option>
                      <option value="especial">Especial / Boss</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={badgeForm.icon}
                      onChange={(e) =>
                        setBadgeForm((prev) => ({ ...prev, icon: e.target.value }))
                      }
                      className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                    >
                      {BADGE_ICON_OPTIONS.map((iconName) => (
                        <option key={iconName} value={iconName}>
                          {iconName}
                        </option>
                      ))}
                    </select>
                    <select
                      value={badgeForm.conditionType}
                      onChange={(e) =>
                        setBadgeForm((prev) => ({
                          ...prev,
                          conditionType: e.target.value as Badge['conditionType'],
                          conditionThreshold:
                            e.target.value === 'streak_7' ||
                            e.target.value === 'missions_10' ||
                            e.target.value === 'first_mission' ||
                            e.target.value === 'hard_challenge' ||
                            e.target.value === 'skill_level_3'
                              ? prev.conditionThreshold
                              : '',
                        }))
                      }
                      className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                    >
                      {Object.entries(BADGE_CONDITION_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showBadgeThresholdField && (
                    <div className="space-y-1">
                      <input
                        type="number"
                        min={1}
                        placeholder="Umbral (ej: 7, 10, 3...)"
                        value={badgeForm.conditionThreshold}
                        onChange={(e) =>
                          setBadgeForm((prev) => ({
                            ...prev,
                            conditionThreshold: e.target.value,
                          }))
                        }
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                      />
                      <p className="text-[11px] text-slate-500">
                        Define el hito exacto para otorgar esta insignia automáticamente. Si se
                        deja vacío, se usa el valor por defecto (7 días de racha, 10 misiones,
                        nivel 3, etc.).
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-amber-800 bg-amber-100/70 border border-amber-200 rounded-xl px-3 py-2">
                    <div className="w-8 h-8 rounded-xl bg-white text-amber-700 flex items-center justify-center shrink-0">
                      {getBadgeIcon(badgeForm.icon)}
                    </div>
                    <span>
                      Usa una condición distinta de “Personalizado (manual)” si quieres que la
                      insignia pueda otorgarse automáticamente con la lógica actual.
                    </span>
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Descripción del logro requerido..."
                    value={badgeForm.description}
                    onChange={(e) =>
                      setBadgeForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetBadgeForm}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      {editingBadgeId ? 'Guardar Cambios' : 'Crear Insignia'}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2.5">
                {badges.length === 0 && (
                  <div className="p-4 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    No hay insignias configuradas en Firestore.
                  </div>
                )}

                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                        {getBadgeIcon(badge.icon)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm">{badge.name}</h4>
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 capitalize">
                            {badge.category}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-amber-50 text-amber-700">
                            {BADGE_CONDITION_LABELS[badge.conditionType]}
                          </span>
                          {badge.conditionThreshold !== undefined && (
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600">
                              Umbral: {badge.conditionThreshold}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {badge.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleEditBadge(badge)}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteBadge(badge)}
                        className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'diagnostic' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Banco de Diagnóstico Inicial
                </span>
                <button
                  onClick={toggleDiagnosticForm}
                  disabled={skills.length === 0}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {showDiagnosticForm && !editingDiagnosticId
                      ? 'Ocultar Formulario'
                      : 'Nueva Pregunta'}
                  </span>
                </button>
              </div>

              {skills.length === 0 && (
                <div className="p-4 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 text-xs text-indigo-800">
                  Primero crea o conserva al menos una habilidad para poder asociar preguntas
                  diagnósticas.
                </div>
              )}

              {showDiagnosticForm && skills.length > 0 && (
                <form
                  onSubmit={handleCreateOrUpdateDiagnosticQuestion}
                  className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200 space-y-3 animate-in fade-in duration-150"
                >
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    {editingDiagnosticId
                      ? 'Editar Pregunta Diagnóstica'
                      : 'Registrar Nueva Pregunta Diagnóstica'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={diagnosticForm.skillId}
                      onChange={(e) =>
                        setDiagnosticForm((prev) => ({ ...prev, skillId: e.target.value }))
                      }
                      className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                    >
                      {skills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      required
                      placeholder="Aspecto (ej: Autoconocimiento)"
                      value={diagnosticForm.aspect}
                      onChange={(e) =>
                        setDiagnosticForm((prev) => ({ ...prev, aspect: e.target.value }))
                      }
                      className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
                    />
                  </div>
                  <textarea
                    rows={3}
                    required
                    placeholder="Escribe la pregunta diagnóstica..."
                    value={diagnosticForm.question}
                    onChange={(e) =>
                      setDiagnosticForm((prev) => ({ ...prev, question: e.target.value }))
                    }
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetDiagnosticForm}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      {editingDiagnosticId ? 'Guardar Cambios' : 'Guardar Pregunta'}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2.5">
                {diagnosticQuestions.length === 0 && (
                  <div className="p-4 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    No hay preguntas diagnósticas configuradas en Firestore.
                  </div>
                )}

                {diagnosticQuestions.map((question) => (
                  <div
                    key={question.id}
                    className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: getSkillColor(question.skillId) }}
                      >
                        {getSkillIcon(getSkillIconName(question.skillId))}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm">
                            {getSkillName(question.skillId)}
                          </h4>
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700">
                            {question.aspect}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{question.question}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleEditDiagnosticQuestion(question)}
                        className="text-xs font-bold text-indigo-700 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDiagnosticQuestion(question)}
                        className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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
