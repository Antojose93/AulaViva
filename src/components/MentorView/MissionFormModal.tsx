import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Plus,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { FirebaseFirestoreService } from '../../services/firebaseFirestoreService';
import {
  Mission,
  MissionDifficulty,
  MissionType,
  Skill,
  User,
} from '../../types';

interface MissionFormModalProps {
  missionToEdit?: Mission | null;
  onClose: () => void;
  onSave: () => void;
}

export const MissionFormModal: React.FC<MissionFormModalProps> = ({
  missionToEdit,
  onClose,
  onSave,
}) => {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [students, setStudents] = useState<User[]>([]);

  const [title, setTitle] = useState(missionToEdit?.title || '');
  const [description, setDescription] = useState(
    missionToEdit?.description || ''
  );
  const [skillId, setSkillId] = useState(
    missionToEdit?.skillId || skills[0]?.id || 'skill_disciplina'
  );
  const [xp, setXp] = useState(missionToEdit?.xp || 40);
  const [difficulty, setDifficulty] = useState<MissionDifficulty>(
    missionToEdit?.difficulty || 'facil'
  );
  const [type, setType] = useState<MissionType>(
    missionToEdit?.type || 'diaria'
  );
  const [frequency, setFrequency] = useState<'diaria' | 'semanal' | 'unica'>(
    missionToEdit?.frequency || 'diaria'
  );
  const [startDate, setStartDate] = useState(
    missionToEdit?.startDate || new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    missionToEdit?.endDate ||
      new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [requiresEvidence, setRequiresEvidence] = useState(
    missionToEdit?.requiresEvidence || false
  );
  const [unlockCondition, setUnlockCondition] = useState(
    missionToEdit?.unlockCondition || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  // Student assignment: empty array means assigned to all students
  const [assignToAll, setAssignToAll] = useState(
    !missionToEdit || missionToEdit.assignedStudentIds.length === 0
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    missionToEdit?.assignedStudentIds || []
  );

  useEffect(() => {
    const unsubscribers = [
      FirebaseFirestoreService.subscribeToSkills(setSkills),
      FirebaseFirestoreService.subscribeToStudents(setStudents),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  useEffect(() => {
    if (!missionToEdit && !skillId && skills[0]?.id) {
      setSkillId(skills[0].id);
    }
  }, [missionToEdit, skillId, skills]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Por favor introduce un título para la misión.');
      return;
    }

    const assignedIds = assignToAll ? [] : selectedStudentIds;

    setIsSaving(true);
    try {
      if (missionToEdit) {
        await FirebaseFirestoreService.updateMission(missionToEdit.id, {
          title: title.trim(),
          description: description.trim(),
          skillId,
          xp: Number(xp),
          difficulty,
          type,
          frequency,
          startDate,
          endDate,
          requiresEvidence,
          unlockCondition: unlockCondition.trim() || undefined,
          assignedStudentIds: assignedIds,
        });
      } else {
        await FirebaseFirestoreService.createMission(
          {
            title: title.trim(),
            description: description.trim(),
            skillId,
            xp: Number(xp),
            difficulty,
            type,
            frequency,
            startDate,
            endDate,
            requiresEvidence,
            unlockCondition: unlockCondition.trim() || undefined,
            assignedStudentIds: assignedIds,
          },
          user?.id || 'usr_mentor_1'
        );
      }

      onSave();
      onClose();
    } catch (error) {
      console.error(error);
      alert('No fue posible guardar la misión en Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                {missionToEdit ? 'Editar Misión' : 'Crear Nueva Misión'}
              </h3>
              <p className="text-xs text-slate-500">
                Diseña un hábito accionable para la vida real
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Título de la Misión *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Bloque Pomodoro 40 min sin distracciones"
              className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-emerald-500 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Descripción & Pautas de Ejecución *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explica con claridad el paso a paso en el mundo real..."
              className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-emerald-500 text-slate-800 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Habilidad Asociada
              </label>
              <select
                value={skillId}
                onChange={(e) => setSkillId(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
              >
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Recompensa XP
              </label>
              <input
                type="number"
                min={5}
                max={500}
                value={xp}
                onChange={(e) => setXp(Number(e.target.value))}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Dificultad
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as MissionDifficulty)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
              >
                <option value="facil">Fácil</option>
                <option value="media">Media</option>
                <option value="dificil">Difícil</option>
                <option value="epica">Épica</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tipo de Misión
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MissionType)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
              >
                <option value="diaria">Diaria</option>
                <option value="semanal">Semanal</option>
                <option value="personalizada">Personalizada</option>
                <option value="reto/boss">Reto Boss</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fecha Límite
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>
          </div>

          {/* Evidence and Unlock Condition */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  ¿Requiere Evidencia para Aprobar?
                </span>
                <span className="text-[11px] text-slate-500">
                  El alumno deberá adjuntar foto/enlace antes de que el mentor acredite la XP.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresEvidence}
                  onChange={(e) => setRequiresEvidence(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Condición de Desbloqueo (Opcional):
              </label>
              <input
                type="text"
                value={unlockCondition}
                onChange={(e) => setUnlockCondition(e.target.value)}
                placeholder="Ej: Racha de 3 días, o Nivel 2 requerido"
                className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800"
              />
            </div>
          </div>

          {/* Student Assignment */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Asignación de Estudiantes</span>
              </span>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignToAll}
                  onChange={(e) => setAssignToAll(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold">Asignar a todos los estudiantes</span>
              </label>
            </div>

            {!assignToAll && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {students.map((std) => {
                  const isSelected = selectedStudentIds.includes(std.id);
                  return (
                    <button
                      key={std.id}
                      type="button"
                      onClick={() => toggleStudent(std.id)}
                      className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="truncate">{std.name}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {isSaving
                ? 'Guardando...'
                : missionToEdit
                ? 'Guardar Cambios'
                : 'Publicar Misión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
