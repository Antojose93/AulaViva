import React, { useEffect, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  Calendar,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  FileCheck,
  Flame,
  MessageSquare,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { getLevelProgress } from '../../services/gamification';
import { FirebaseFirestoreService } from '../../services/firebaseFirestoreService';
import {
  Badge,
  EarnedBadge,
  MentorWeeklyMessage,
  Mission,
  MissionAssignment,
  MissionSubmission,
  Skill,
  SkillLevel,
  StudentNotification,
  StudentProfile,
  User,
} from '../../types';
import { BadgesGrid } from './BadgesGrid';
import { DiagnosticModal } from './DiagnosticModal';
import { HistoryTab } from './HistoryTab';
import { MentorMessageModal } from './MentorMessageModal';
import { MissionCard } from './MissionCard';
import { NotificationsCenterModal } from './NotificationsCenterModal';
import { SkillsOverview } from './SkillsOverview';
import { WeeklyXpChart } from './WeeklyXpChart';

interface StudentDashboardProps {
  user: User;
  onRefresh: () => void;
  openNotificationsTrigger?: boolean;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  onRefresh,
}) => {
  const [profile, setProfile] = useState<StudentProfile>({
    id: 'prof_fallback',
    userId: user.id,
    grade: 'Grado 11',
    overallXp: 0,
    overallLevel: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    diagnosticCompleted: false,
    statusHealth: 'observacion',
  });
  const [mentor, setMentor] = useState<User>(user);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillLevels, setSkillLevels] = useState<SkillLevel[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [assignments, setAssignments] = useState<MissionAssignment[]>([]);
  const [submissions, setSubmissions] = useState<MissionSubmission[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [weeklyMessages, setWeeklyMessages] = useState<MentorWeeklyMessage[]>([]);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);

  const [activeTab, setActiveTab] = useState<'missions' | 'skills' | 'badges' | 'history'>('missions');
  const [missionFilter, setMissionFilter] = useState<'todas' | 'diaria' | 'semanal' | 'reto/boss'>('todas');
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [selectedMentorMessage, setSelectedMentorMessage] = useState<MentorWeeklyMessage | null>(null);
  const [highlightedMissionId, setHighlightedMissionId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribers = [
      FirebaseFirestoreService.subscribeToStudentProfile(user.id, (nextProfile) => {
        if (nextProfile) {
          setProfile(nextProfile);
        }
      }),
      FirebaseFirestoreService.subscribeToMentor(setMentor),
      FirebaseFirestoreService.subscribeToSkills(setSkills),
      FirebaseFirestoreService.subscribeToSkillLevels(user.id, setSkillLevels),
      FirebaseFirestoreService.subscribeToMissionsForStudent(user.id, setMissions),
      FirebaseFirestoreService.subscribeToStudentAssignments(user.id, setAssignments),
      FirebaseFirestoreService.subscribeToStudentSubmissions(user.id, setSubmissions),
      FirebaseFirestoreService.subscribeToBadges(setBadges),
      FirebaseFirestoreService.subscribeToEarnedBadges(user.id, setEarnedBadges),
      FirebaseFirestoreService.subscribeToWeeklyMessages(user.id, setWeeklyMessages),
      FirebaseFirestoreService.subscribeToNotifications(user.id, setNotifications),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [user.id]);

  const unreadNotifications = notifications.filter((n) => !n.read);
  const unreadMissionsCount = unreadNotifications.filter(
    (n) => n.type === 'mision_asignada' || n.type === 'mision_aprobada' || n.type === 'mision_rechazada'
  ).length;
  const unreadMessagesCount = unreadNotifications.filter(
    (n) => n.type === 'mensaje_mentor'
  ).length;

  const progress = getLevelProgress(profile.overallXp);
  const latestMessage: MentorWeeklyMessage | undefined = weeklyMessages[0];
  const hasUnreadMentorMessage = unreadNotifications.some((n) => n.type === 'mensaje_mentor');

  const handleSelectMission = (missionId: string) => {
    const targetMission = missions.find((m) => m.id === missionId);
    setActiveTab('missions');
    if (targetMission && missionFilter !== 'todas' && missionFilter !== targetMission.type) {
      setMissionFilter('todas');
    }
    setHighlightedMissionId(missionId);
    setTimeout(() => {
      const el = document.getElementById(`mission-${missionId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const handleOpenMentorMessage = async (messageId?: string) => {
    const msg = messageId
      ? weeklyMessages.find((m) => m.id === messageId) || latestMessage
      : latestMessage;
    if (msg) {
      setSelectedMentorMessage(msg);
      // Mark matching notification as read
      const matchingNotif = notifications.find(
        (n) => n.type === 'mensaje_mentor' && (n.referenceId === msg.id || !n.referenceId)
      );
      if (matchingNotif && !matchingNotif.read) {
        await FirebaseFirestoreService.markNotificationAsRead(matchingNotif.id);
        onRefresh();
      }
    }
  };

  // Map submissions by missionId
  const submissionMap = new Map<string, MissionSubmission>(
    submissions.map((s) => [s.missionId, s])
  );
  const assignmentMap = new Map<string, MissionAssignment>(
    assignments.map((a) => [a.missionId, a])
  );
  const skillsMap = new Map<string, Skill>(skills.map((s) => [s.id, s]));

  const filteredMissions = missions.filter((m) => {
    if (missionFilter === 'todas') return true;
    return m.type === missionFilter;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* 1. Header Profile & Gamification Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Avatar and Info */}
          <div className="flex items-center gap-3.5">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-4 ring-emerald-50 border border-slate-200 shadow-2xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                  {user.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                  {profile.grade}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Nivel {progress.level}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-bold text-slate-600">
                  {profile.overallXp} XP Acumulada
                </span>
              </div>
            </div>
          </div>

          {/* Streak Counter Pill */}
          <div className="flex items-center sm:self-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-4 py-2.5 rounded-2xl shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-amber-950">
                  {profile.currentStreak}
                </span>
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  días
                </span>
              </div>
              <p className="text-[11px] text-amber-700 font-medium">
                Racha de Constancia (Récord: {profile.longestStreak}d)
              </p>
            </div>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-900 font-bold">Nivel {progress.level}</span>
                <span className="text-slate-400">({profile.overallXp} XP)</span>
              </div>
              <div>
                {progress.xpNeededForNext > 0 ? (
                  <span className="text-emerald-700 font-bold">
                    Faltan {progress.xpNeededForNext} XP para Nivel {progress.level + 1}
                  </span>
                ) : (
                  <span className="text-emerald-700 font-bold">¡Nivel Máximo!</span>
                )}
              </div>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Notification Center Launcher */}
          <button
            onClick={() => setShowNotificationsModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold transition-all shrink-0 cursor-pointer border border-slate-200"
            title="Abrir historial de notificaciones"
          >
            <div className="relative">
              <Bell className="w-4 h-4 text-slate-600" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </div>
            <span>
              {unreadNotifications.length > 0
                ? `${unreadNotifications.length} Alerta${unreadNotifications.length > 1 ? 's' : ''}`
                : 'Notificaciones'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Notification Alert Banner (when student has unread alerts) */}
      {unreadNotifications.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 border-2 border-emerald-300/80 rounded-3xl p-4 sm:p-5 shadow-xs relative overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5 relative">
                <Bell className="w-5 h-5 animate-bounce" />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center ring-2 ring-white shadow-xs">
                  {unreadNotifications.length}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Nuevas Alertas de Mentoría y Misiones
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 animate-pulse">
                    {unreadNotifications.length} pendiente{unreadNotifications.length > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {unreadMissionsCount > 0 && (
                    <span className="font-semibold text-emerald-800">
                      🎯 {unreadMissionsCount} nueva(s) misión(es) asignada(s).{' '}
                    </span>
                  )}
                  {unreadMessagesCount > 0 && (
                    <span className="font-semibold text-indigo-800">
                      💬 {unreadMessagesCount} mensaje(s) del Prof. Andrés Valenzuela.{' '}
                    </span>
                  )}
                  Realiza tus acciones diarias para sumar XP y no perder tu racha.
                </p>

                {/* Quick Interactive Notification Chips */}
                <div className="pt-2 flex flex-wrap gap-2">
                  {unreadNotifications.slice(0, 3).map((notif) => (
                    <button
                      key={notif.id}
                      onClick={async () => {
                        await FirebaseFirestoreService.markNotificationAsRead(notif.id);
                        onRefresh();
                        if (
                          (notif.type === 'mision_asignada' ||
                            notif.type === 'mision_aprobada' ||
                            notif.type === 'mision_rechazada') &&
                          notif.referenceId
                        ) {
                          handleSelectMission(notif.referenceId);
                        } else if (notif.type === 'mensaje_mentor') {
                          handleOpenMentorMessage(notif.referenceId);
                        } else {
                          setShowNotificationsModal(true);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-800 text-xs font-bold border border-slate-200/90 shadow-2xs hover:bg-emerald-50 hover:border-emerald-300 transition-all cursor-pointer text-left group"
                    >
                      {notif.type === 'mision_asignada' ? (
                        <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : notif.type === 'mensaje_mentor' ? (
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      )}
                      <span className="truncate max-w-[180px] sm:max-w-[260px]">
                        {notif.title}
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              <button
                onClick={() => setShowNotificationsModal(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span>Ver Notificaciones</span>
              </button>
              <button
                onClick={async () => {
                  await FirebaseFirestoreService.markAllNotificationsAsRead(user.id);
                  onRefresh();
                }}
                className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-white/80 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Descartar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Diagnostic Prompt Banner (if not completed) */}
      {!profile.diagnosticCompleted && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Compass className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Paso 1: Completa tu Diagnóstico Inicial
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                Responde 15 preguntas sencillas para calibrar tus niveles y gana{' '}
                <span className="font-bold text-white underline">+50 XP</span>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDiagnosticModal(true)}
            className="px-5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all shrink-0 cursor-pointer text-center"
          >
            Iniciar Cuestionario
          </button>
        </div>
      )}

      {/* 4. Mentor Weekly Message Banner */}
      {latestMessage && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                  Semana {latestMessage.weekNumber}
                </span>
                {hasUnreadMentorMessage && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                    ¡Nuevo Mensaje!
                  </span>
                )}
                <h4 className="font-bold text-xs sm:text-sm text-slate-100">
                  {latestMessage.title}
                </h4>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                "{latestMessage.message}"
              </p>
              <span className="text-[10px] text-slate-400 font-medium block pt-0.5">
                — {mentor.name} (Mentor)
              </span>
            </div>
          </div>

          <button
            onClick={() => handleOpenMentorMessage(latestMessage.id)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Leer Orientación Completa</span>
          </button>
        </div>
      )}

      {/* 5. Weekly XP Evolution Line Chart (recharts) */}
      <WeeklyXpChart profile={profile} submissions={submissions} />

      {/* 6. Student Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTab('missions')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'missions'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Target className="w-4 h-4 text-emerald-600" />
          <span>Misiones Activas</span>
        </button>

        <button
          onClick={() => setActiveTab('skills')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'skills'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Habilidades</span>
        </button>

        <button
          onClick={() => setActiveTab('badges')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'badges'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Insignias ({earnedBadges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Historial</span>
        </button>
      </div>

      {/* 5. Tab Content Area */}
      {activeTab === 'missions' && (
        <div className="space-y-4">
          {/* Mission Category Filters */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {(
                [
                  { id: 'todas', label: 'Todas' },
                  { id: 'diaria', label: 'Diarias' },
                  { id: 'semanal', label: 'Semanales' },
                  { id: 'reto/boss', label: 'Retos Boss' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setMissionFilter(f.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    missionFilter === f.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-slate-500 font-medium">
              {filteredMissions.length} misiones disponibles
            </span>
          </div>

          {/* Missions List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredMissions.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                skill={skillsMap.get(m.skillId)}
                assignment={assignmentMap.get(m.id)}
                submission={submissionMap.get(m.id)}
                studentProfile={profile}
                onRefresh={onRefresh}
                isHighlighted={m.id === highlightedMissionId}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'skills' && (
        <SkillsOverview skills={skills} skillLevels={skillLevels} />
      )}

      {activeTab === 'badges' && (
        <BadgesGrid allBadges={badges} earnedBadges={earnedBadges} />
      )}

      {activeTab === 'history' && (
        <HistoryTab
          submissions={submissions}
          missions={missions}
          skills={skills}
        />
      )}

      {/* Notifications Center Modal */}
      {showNotificationsModal && (
        <NotificationsCenterModal
          user={user}
          onClose={() => setShowNotificationsModal(false)}
          onSelectMission={handleSelectMission}
          onOpenMentorMessage={handleOpenMentorMessage}
          onRefresh={onRefresh}
        />
      )}

      {/* Mentor Weekly Guidance Modal */}
      {selectedMentorMessage && (
        <MentorMessageModal
          message={selectedMentorMessage}
          mentor={mentor}
          onClose={() => setSelectedMentorMessage(null)}
          onAcknowledge={() => {
            setSelectedMentorMessage(null);
            onRefresh();
          }}
        />
      )}

      {/* Interactive Diagnostic Modal */}
      {showDiagnosticModal && (
        <DiagnosticModal
          studentId={user.id}
          onComplete={() => {
            setShowDiagnosticModal(false);
            onRefresh();
          }}
          onClose={() => setShowDiagnosticModal(false)}
          allowClose={true}
        />
      )}
    </div>
  );
};
