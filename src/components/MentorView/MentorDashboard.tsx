import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Bell,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Flame,
  MessageSquare,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { calculateStudentHealth } from '../../services/gamification';
import { FirebaseFirestoreService } from '../../services/firebaseFirestoreService';
import {
  MentorAlert,
  Mission,
  MissionAssignment,
  MissionSubmission,
  StudentProfile,
  User,
} from '../../types';
import { ApprovalsQueueModal } from './ApprovalsQueueModal';
import { MissionFormModal } from './MissionFormModal';
import { SkillsAndBadgesModal } from './SkillsAndBadgesModal';
import { StudentDetailModal } from './StudentDetailModal';
import { WeeklyMessageModal } from './WeeklyMessageModal';

interface MentorDashboardProps {
  onRefresh: () => void;
}

export const MentorDashboard: React.FC<MentorDashboardProps> = ({
  onRefresh,
}) => {
  const [students, setStudents] = useState<User[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [submissions, setSubmissions] = useState<MissionSubmission[]>([]);
  const [assignments, setAssignments] = useState<MissionAssignment[]>([]);
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [alerts, setAlerts] = useState<MentorAlert[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<
    (MissionSubmission & { mission?: Mission; student?: User })[]
  >([]);

  const [filterHealth, setFilterHealth] = useState<
    'all' | 'optimo' | 'observacion' | 'riesgo'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  // Modals state
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [missionToEdit, setMissionToEdit] = useState<Mission | null>(null);
  const [showApprovalsModal, setShowApprovalsModal] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showWeeklyMsgModal, setShowWeeklyMsgModal] = useState(false);

  useEffect(() => {
    const unsubscribers = [
      FirebaseFirestoreService.subscribeToStudents(setStudents),
      FirebaseFirestoreService.subscribeToMissions(setMissions),
      FirebaseFirestoreService.subscribeToSubmissions(setSubmissions),
      FirebaseFirestoreService.subscribeToMissionAssignments(setAssignments),
      FirebaseFirestoreService.subscribeToAllStudentProfiles(setProfiles),
      FirebaseFirestoreService.subscribeToMentorAlerts(setAlerts),
      FirebaseFirestoreService.subscribeToPendingSubmissions(setPendingApprovals),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  // Compute stats
  const totalStudents = students.length;
  const completedSubmissions = submissions.filter((s) => s.status === 'cumplida').length;
  const totalExpected = Math.max(assignments.length, 1);
  const groupComplianceRate = Math.round((completedSubmissions / totalExpected) * 100);

  // Group status distribution
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;

  students.forEach((s) => {
    const p = profiles.find((prof) => prof.userId === s.id);
    if (p) {
      if (p.statusHealth === 'optimo') greenCount++;
      else if (p.statusHealth === 'observacion') yellowCount++;
      else if (p.statusHealth === 'riesgo') redCount++;
    }
  });

  const filteredStudents = students.filter((std) => {
    const prof = profiles.find((p) => p.userId === std.id);
    if (!prof) return false;

    if (filterHealth !== 'all' && prof.statusHealth !== filterHealth) {
      return false;
    }

    if (
      searchQuery.trim() &&
      !std.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !std.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  const handleDeleteMission = async (mission: Mission) => {
    if (!window.confirm(`¿Deseas eliminar la misión "${mission.title}" del catálogo activo?`)) {
      return;
    }

    try {
      await FirebaseFirestoreService.deleteMission(mission.id);
      onRefresh();
      alert('Misión eliminada con éxito.');
    } catch (error) {
      console.error(error);
      alert('No fue posible eliminar la misión en Firestore.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Header Banner & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Panel de Control del Mentor
            </h1>
          
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Supervisa el cumplimiento, racha y formación de hábitos en la vida real.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => {
              setMissionToEdit(null);
              setShowMissionModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Misión</span>
          </button>

          <button
            onClick={() => setShowApprovalsModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer relative"
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Evidencias</span>
            {pendingApprovals.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-black animate-pulse">
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowWeeklyMsgModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Mensaje Semanal</span>
          </button>

          <button
            onClick={() => setShowSkillsModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer"
          >
            <Brain className="w-4 h-4 text-indigo-600" />
            <span>Habilidades & Insignias</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Estudiantes Piloto
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 flex items-baseline gap-1.5">
            <span>{totalStudents}</span>
            <span className="text-xs font-semibold text-slate-400">Grado 11</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">100% activos en plataforma</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Cumplimiento Promedio
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1 flex items-baseline gap-1.5">
            <span>{groupComplianceRate}%</span>
            <span className="text-xs font-semibold text-emerald-800">Grupal</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {completedSubmissions} misiones cumplidas
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Misiones Activas
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {missions.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Diarias, Semanales y Retos Boss
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Alertas de Riesgo
          </span>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1 flex items-baseline gap-1.5">
            <span>{alerts.length}</span>
            <span className="text-xs font-semibold text-rose-800">Casos</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Inactividad o racha perdida
          </p>
        </div>
      </div>

      {/* 3. At-Risk Alerts Notification Strip (if any) */}
      {alerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Atención Pedagógica Requerida ({alerts.length} Alertas)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {alerts.map((alt) => (
              <div
                key={alt.id}
                className="p-2.5 bg-white/80 rounded-xl border border-rose-200 text-xs text-rose-900 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{alt.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Student Roster with Semaphore Filter */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Semaphore Filters */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setFilterHealth('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                filterHealth === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({students.length})
            </button>

            <button
              onClick={() => setFilterHealth('optimo')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filterHealth === 'optimo'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span>🟢 Óptimo &gt;80%</span>
              <span className="opacity-80">({greenCount})</span>
            </button>

            <button
              onClick={() => setFilterHealth('observacion')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filterHealth === 'observacion'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <span>🟡 Observación 50-80%</span>
              <span className="opacity-80">({yellowCount})</span>
            </button>

            <button
              onClick={() => setFilterHealth('riesgo')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filterHealth === 'riesgo'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span>🔴 En Riesgo &lt;50%</span>
              <span className="opacity-80">({redCount})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar estudiante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-emerald-500 text-slate-800"
            />
          </div>
        </div>

        {/* Student Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {filteredStudents.map((std) => {
            const prof = profiles.find((p) => p.userId === std.id);
            const stdSubmissions = submissions.filter((s) => s.studentId === std.id);
            const stdAssignments = assignments.filter((a) => a.studentId === std.id);
            const health = calculateStudentHealth(stdSubmissions, stdAssignments.length);

            return (
              <div
                key={std.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top bar with avatar and health indicator */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={std.avatar}
                        alt={std.name}
                        className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-2xs"
                      />
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">
                          {std.name}
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          {prof?.grade}
                        </span>
                      </div>
                    </div>

                    {/* Semaphore Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        prof?.statusHealth === 'optimo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : prof?.statusHealth === 'observacion'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {prof?.statusHealth === 'optimo'
                        ? '🟢 Óptimo'
                        : prof?.statusHealth === 'observacion'
                        ? '🟡 Observación'
                        : '🔴 En Riesgo'}
                    </span>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs mb-3">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        Nivel & XP
                      </span>
                      <div className="font-black text-slate-800">
                        Lvl {prof?.overallLevel}{' '}
                        <span className="text-[10px] font-normal text-slate-500">
                          ({prof?.overallXp} XP)
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        Racha
                      </span>
                      <div className="font-black text-amber-600 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>{prof?.currentStreak}d</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        Cumplimiento
                      </span>
                      <div className="font-black text-slate-800">
                        {health.completionRate}%
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        Diagnóstico
                      </span>
                      <div className="font-bold text-slate-800">
                        {prof?.diagnosticCompleted ? '✅ Listo' : '⏳ Pendiente'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inspect Action */}
                <button
                  onClick={() => setSelectedStudent(std)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Inspeccionar Progreso</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Active Missions Management Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Catálogo de Misiones Activas ({missions.length})
            </h3>
            <p className="text-xs text-slate-500">
              Misiones programadas para la práctica en la vida real
            </p>
          </div>
          <button
            onClick={() => {
              setMissionToEdit(null);
              setShowMissionModal(true);
            }}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Misión</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {missions.map((m) => (
            <div
              key={m.id}
              className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                    {m.type}
                  </span>
                  <span className="font-black text-amber-700">+{m.xp} XP</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm">{m.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                  {m.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-[11px] text-slate-400">
                  {m.assignedStudentIds.length === 0
                    ? 'Asignada a todos'
                    : `Para ${m.assignedStudentIds.length} alumnos`}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setMissionToEdit(m);
                      setShowMissionModal(true);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteMission(m)}
                    className="text-xs font-bold text-rose-700 hover:text-rose-800 cursor-pointer"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onRefresh={onRefresh}
        />
      )}

      {showMissionModal && (
        <MissionFormModal
          missionToEdit={missionToEdit}
          onClose={() => setShowMissionModal(false)}
          onSave={onRefresh}
        />
      )}

      {showApprovalsModal && (
        <ApprovalsQueueModal
          onClose={() => setShowApprovalsModal(false)}
          onRefresh={onRefresh}
        />
      )}

      {showSkillsModal && (
        <SkillsAndBadgesModal
          onClose={() => setShowSkillsModal(false)}
          onRefresh={onRefresh}
        />
      )}

      {showWeeklyMsgModal && (
        <WeeklyMessageModal
          onClose={() => setShowWeeklyMsgModal(false)}
          onSend={onRefresh}
        />
      )}
    </div>
  );
};
