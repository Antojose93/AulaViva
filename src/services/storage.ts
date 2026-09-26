import {
  INITIAL_BADGES,
  INITIAL_DIAGNOSTIC_QUESTIONS,
  INITIAL_DIAGNOSTIC_RESULTS,
  INITIAL_EARNED_BADGES,
  INITIAL_MENTOR,
  INITIAL_MISSIONS,
  INITIAL_MISSION_ASSIGNMENTS,
  INITIAL_SKILLS,
  INITIAL_SKILL_LEVELS,
  INITIAL_STUDENTS,
  INITIAL_STUDENT_PROFILES,
  INITIAL_SUBMISSIONS,
  INITIAL_WEEKLY_MESSAGES,
  INITIAL_NOTIFICATIONS,
} from '../data/initialData';
import {
  Badge,
  DiagnosticQuestion,
  DiagnosticResponse,
  DiagnosticResult,
  EarnedBadge,
  MentorAlert,
  MentorWeeklyMessage,
  Mission,
  MissionAssignment,
  MissionSubmission,
  Skill,
  SkillLevel,
  StudentNotification,
  StudentProfile,
  SubmissionStatus,
  User,
} from '../types';
import { evaluateBadgesForStudent, getLevelProgress } from './gamification';

interface StorageSchema {
  users: User[];
  currentUserId: string | null;
  studentProfiles: StudentProfile[];
  skills: Skill[];
  skillLevels: SkillLevel[];
  missions: Mission[];
  missionAssignments: MissionAssignment[];
  missionSubmissions: MissionSubmission[];
  badges: Badge[];
  earnedBadges: EarnedBadge[];
  diagnosticQuestions: DiagnosticQuestion[];
  diagnosticResults: DiagnosticResult[];
  weeklyMessages: MentorWeeklyMessage[];
  notifications: StudentNotification[];
}

const STORAGE_KEY = 'aula_viva_state_v1';

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.error('Error in storage listener', e);
    }
  });
}

export function subscribeToStorage(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function loadState(): StorageSchema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.notifications || !Array.isArray(parsed.notifications)) {
        parsed.notifications = INITIAL_NOTIFICATIONS;
        saveState(parsed);
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse local storage, falling back to initial data', e);
  }

  const defaultState: StorageSchema = {
    users: [INITIAL_MENTOR, ...INITIAL_STUDENTS],
    currentUserId: null, // No active user session by default (requires login)
    studentProfiles: INITIAL_STUDENT_PROFILES,
    skills: INITIAL_SKILLS,
    skillLevels: INITIAL_SKILL_LEVELS,
    missions: INITIAL_MISSIONS,
    missionAssignments: INITIAL_MISSION_ASSIGNMENTS,
    missionSubmissions: INITIAL_SUBMISSIONS,
    badges: INITIAL_BADGES,
    earnedBadges: INITIAL_EARNED_BADGES,
    diagnosticQuestions: INITIAL_DIAGNOSTIC_QUESTIONS,
    diagnosticResults: INITIAL_DIAGNOSTIC_RESULTS,
    weeklyMessages: INITIAL_WEEKLY_MESSAGES,
    notifications: INITIAL_NOTIFICATIONS,
  };

  saveState(defaultState);
  return defaultState;
}

function saveState(state: StorageSchema) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    notifyListeners();
  } catch (e) {
    console.error('Failed to save state to localStorage', e);
  }
}

export const StorageService = {
  getState(): StorageSchema {
    return loadState();
  },

  resetDefaults() {
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners();
  },

  getCurrentUser(): User | null {
    const state = loadState();
    if (!state.currentUserId) return null;
    const found = state.users.find((u) => u.id === state.currentUserId);
    return found || null;
  },

  setCurrentUser(userId: string | null) {
    const state = loadState();
    state.currentUserId = userId;
    saveState(state);
  },

  clearCurrentUser() {
    const state = loadState();
    state.currentUserId = null;
    saveState(state);
  },

  getStudents(): User[] {
    const state = loadState();
    return state.users.filter((u) => u.role === 'student');
  },

  getMentor(): User {
    const state = loadState();
    return state.users.find((u) => u.role === 'mentor') || state.users[0];
  },

  getStudentProfile(studentId: string): StudentProfile | undefined {
    const state = loadState();
    return state.studentProfiles.find((p) => p.userId === studentId);
  },

  getSkills(): Skill[] {
    return loadState().skills;
  },

  getSkillLevels(studentId: string): SkillLevel[] {
    const state = loadState();
    return state.skillLevels.filter((sl) => sl.studentId === studentId);
  },

  getMissionsForStudent(studentId: string): Mission[] {
    const state = loadState();
    return state.missions.filter(
      (m) => m.assignedStudentIds.length === 0 || m.assignedStudentIds.includes(studentId)
    );
  },

  getStudentAssignments(studentId: string): MissionAssignment[] {
    const state = loadState();
    return state.missionAssignments.filter((a) => a.studentId === studentId);
  },

  getStudentSubmissions(studentId: string): MissionSubmission[] {
    const state = loadState();
    return state.missionSubmissions.filter((s) => s.studentId === studentId);
  },

  getBadges(): Badge[] {
    return loadState().badges;
  },

  getEarnedBadges(studentId: string): EarnedBadge[] {
    const state = loadState();
    return state.earnedBadges.filter((eb) => eb.studentId === studentId);
  },

  getDiagnosticQuestions(): DiagnosticQuestion[] {
    return loadState().diagnosticQuestions;
  },

  getDiagnosticResult(studentId: string): DiagnosticResult | undefined {
    const state = loadState();
    return state.diagnosticResults.find((dr) => dr.studentId === studentId);
  },

  getWeeklyMessages(studentId?: string): MentorWeeklyMessage[] {
    const state = loadState();
    if (!studentId) return state.weeklyMessages;
    return state.weeklyMessages.filter(
      (m) => !m.targetStudentId || m.targetStudentId === studentId
    );
  },

  getPendingSubmissions(): (MissionSubmission & { mission?: Mission; student?: User })[] {
    const state = loadState();
    const pending = state.missionSubmissions.filter((s) => s.status === 'pendiente_aprobacion');
    return pending.map((sub) => ({
      ...sub,
      mission: state.missions.find((m) => m.id === sub.missionId),
      student: state.users.find((u) => u.id === sub.studentId),
    }));
  },

  getMentorAlerts(): MentorAlert[] {
    const state = loadState();
    const alerts: MentorAlert[] = [];
    const students = state.users.filter((u) => u.role === 'student');

    students.forEach((std) => {
      const profile = state.studentProfiles.find((p) => p.userId === std.id);
      if (!profile) return;

      // Check 1: Diagnostic pending
      if (!profile.diagnosticCompleted) {
        alerts.push({
          id: `alt_diag_${std.id}`,
          studentId: std.id,
          type: 'diagnostico_pendiente',
          message: `${std.name} no ha realizado el diagnóstico inicial de habilidades.`,
          severity: 'media',
          createdAt: new Date().toISOString(),
        });
      }

      // Check 2: At-risk status (compliance < 50%)
      if (profile.statusHealth === 'riesgo') {
        alerts.push({
          id: `alt_risk_${std.id}`,
          studentId: std.id,
          type: 'bajo_cumplimiento',
          message: `${std.name} tiene un cumplimiento menor al 50% y racha inactiva.`,
          severity: 'alta',
          createdAt: new Date().toISOString(),
        });
      }

      // Check 3: Lost streak (was > 3, now 0)
      if (profile.currentStreak === 0 && profile.longestStreak >= 3) {
        alerts.push({
          id: `alt_strk_${std.id}`,
          studentId: std.id,
          type: 'racha_perdida',
          message: `${std.name} perdió su racha de ${profile.longestStreak} días. Requiere contacto de apoyo.`,
          severity: 'media',
          createdAt: new Date().toISOString(),
        });
      }
    });

    return alerts;
  },

  getStudentNotifications(studentId: string): StudentNotification[] {
    const state = loadState();
    return (state.notifications || [])
      .filter((n) => n.studentId === studentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getUnreadNotificationsCount(studentId: string): number {
    const state = loadState();
    return (state.notifications || []).filter((n) => n.studentId === studentId && !n.read).length;
  },

  markNotificationAsRead(notificationId: string) {
    const state = loadState();
    const notif = (state.notifications || []).find((n) => n.id === notificationId);
    if (notif) {
      notif.read = true;
      saveState(state);
    }
  },

  markAllNotificationsAsRead(studentId: string) {
    const state = loadState();
    let changed = false;
    (state.notifications || []).forEach((n) => {
      if (n.studentId === studentId && !n.read) {
        n.read = true;
        changed = true;
      }
    });
    if (changed) {
      saveState(state);
    }
  },

  clearNotification(notificationId: string) {
    const state = loadState();
    state.notifications = (state.notifications || []).filter((n) => n.id !== notificationId);
    saveState(state);
  },

  // Actions
  submitMission(
    studentId: string,
    missionId: string,
    status: 'cumplida' | 'no_cumplida',
    reflection?: string,
    evidenceUrl?: string,
    evidenceDescription?: string,
    evidenceMeta?: { fileName?: string; contentType?: string; storagePath?: string }
  ): { newlyEarnedBadges: Badge[]; xpAdded: number } {
    const state = loadState();
    const mission = state.missions.find((m) => m.id === missionId);
    if (!mission) throw new Error('Misión no encontrada');

    const profileIndex = state.studentProfiles.findIndex((p) => p.userId === studentId);
    if (profileIndex === -1) throw new Error('Perfil no encontrado');

    const profile = { ...state.studentProfiles[profileIndex] };
    const requiresMentorReview = status === 'cumplida' && mission.requiresEvidence;
    const submissionStatus: SubmissionStatus = requiresMentorReview
      ? 'pendiente_aprobacion'
      : status;

    const awardedXp = !requiresMentorReview && status === 'cumplida' ? mission.xp : 0;

    const newSubmission: MissionSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      missionId,
      studentId,
      status: submissionStatus,
      reflection,
      evidenceUrl,
      evidenceDescription,
      evidenceFileName: evidenceMeta?.fileName,
      evidenceContentType: evidenceMeta?.contentType,
      evidenceStoragePath: evidenceMeta?.storagePath,
      submittedAt: new Date().toISOString(),
      xpAwarded: awardedXp,
    };

    state.missionSubmissions = [newSubmission, ...state.missionSubmissions];

    // Update assignment status
    let assignment = state.missionAssignments.find(
      (a) => a.studentId === studentId && a.missionId === missionId
    );
    if (assignment) {
      assignment.status = status === 'cumplida' ? 'completada' : 'fallida';
      assignment.completedAt = new Date().toISOString();
    } else {
      state.missionAssignments.push({
        id: `asg_${Date.now()}`,
        missionId,
        studentId,
        status: status === 'cumplida' ? 'completada' : 'fallida',
        assignedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    }

    let newlyEarnedBadges: Badge[] = [];

    // If marked fulfilled directly (no pending review)
    if (status === 'cumplida' && !requiresMentorReview) {
      profile.overallXp += awardedXp;
      const progress = getLevelProgress(profile.overallXp);
      profile.overallLevel = progress.level;
      profile.currentStreak += 1;
      if (profile.currentStreak > profile.longestStreak) {
        profile.longestStreak = profile.currentStreak;
      }
      profile.lastActiveDate = new Date().toISOString().split('T')[0];

      // Update skill specific XP
      const skillIndex = state.skillLevels.findIndex(
        (sl) => sl.studentId === studentId && sl.skillId === mission.skillId
      );
      if (skillIndex !== -1) {
        const sk = { ...state.skillLevels[skillIndex] };
        sk.xp += awardedXp;
        sk.level = getLevelProgress(sk.xp).level;
        state.skillLevels[skillIndex] = sk;
      } else {
        state.skillLevels.push({
          studentId,
          skillId: mission.skillId,
          xp: awardedXp,
          level: getLevelProgress(awardedXp).level,
        });
      }

      // Check health
      const studentSubmissions = state.missionSubmissions.filter((s) => s.studentId === studentId);
      const studentAssignments = state.missionAssignments.filter((a) => a.studentId === studentId);
      const completedCount = studentSubmissions.filter((s) => s.status === 'cumplida').length;
      const totalCount = Math.max(studentAssignments.length, 1);
      const rate = (completedCount / totalCount) * 100;
      profile.statusHealth = rate >= 80 ? 'optimo' : rate >= 50 ? 'observacion' : 'riesgo';

      state.studentProfiles[profileIndex] = profile;

      // Evaluate badges
      const missionsMap = new Map<string, Mission>(state.missions.map((m) => [m.id, m]));
      newlyEarnedBadges = evaluateBadgesForStudent(
        profile,
        studentSubmissions,
        missionsMap,
        state.badges,
        state.earnedBadges
      );

      newlyEarnedBadges.forEach((b) => {
        state.earnedBadges.push({
          id: `eb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          studentId,
          badgeId: b.id,
          earnedAt: new Date().toISOString(),
        });
      });
    } else if (status === 'no_cumplida') {
      profile.currentStreak = 0;
      profile.statusHealth = 'observacion';
      state.studentProfiles[profileIndex] = profile;
    }

    saveState(state);
    return { newlyEarnedBadges, xpAdded: awardedXp };
  },

  reviewSubmission(
    submissionId: string,
    approved: boolean,
    mentorFeedback?: string
  ): { newlyEarnedBadges: Badge[] } {
    const state = loadState();
    const subIndex = state.missionSubmissions.findIndex((s) => s.id === submissionId);
    if (subIndex === -1) throw new Error('Entrega no encontrada');

    const sub = { ...state.missionSubmissions[subIndex] };
    const mission = state.missions.find((m) => m.id === sub.missionId);
    if (!mission) throw new Error('Misión no encontrada');

    const profileIndex = state.studentProfiles.findIndex((p) => p.userId === sub.studentId);
    if (profileIndex === -1) throw new Error('Perfil no encontrado');
    const profile = { ...state.studentProfiles[profileIndex] };

    sub.reviewedBy = state.currentUserId || 'usr_mentor_1';
    sub.reviewedAt = new Date().toISOString();
    sub.mentorFeedback = mentorFeedback;
    sub.status = approved ? 'cumplida' : 'rechazada';

    let newlyEarnedBadges: Badge[] = [];

    if (approved) {
      sub.xpAwarded = mission.xp;
      profile.overallXp += mission.xp;
      profile.overallLevel = getLevelProgress(profile.overallXp).level;
      profile.currentStreak += 1;
      if (profile.currentStreak > profile.longestStreak) {
        profile.longestStreak = profile.currentStreak;
      }
      profile.lastActiveDate = new Date().toISOString().split('T')[0];

      // Skill XP
      const skIndex = state.skillLevels.findIndex(
        (sl) => sl.studentId === sub.studentId && sl.skillId === mission.skillId
      );
      if (skIndex !== -1) {
        state.skillLevels[skIndex].xp += mission.xp;
        state.skillLevels[skIndex].level = getLevelProgress(state.skillLevels[skIndex].xp).level;
      }

      state.studentProfiles[profileIndex] = profile;

      const missionsMap = new Map<string, Mission>(state.missions.map((m) => [m.id, m]));
      const studentSubs = state.missionSubmissions.filter((s) => s.studentId === sub.studentId);
      newlyEarnedBadges = evaluateBadgesForStudent(
        profile,
        studentSubs,
        missionsMap,
        state.badges,
        state.earnedBadges
      );

      newlyEarnedBadges.forEach((b) => {
        state.earnedBadges.push({
          id: `eb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          studentId: sub.studentId,
          badgeId: b.id,
          earnedAt: new Date().toISOString(),
        });
      });

      // Notification for student: Mission approved
      state.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        studentId: sub.studentId,
        type: 'mision_aprobada',
        title: '¡Misión aprobada por tu mentor!',
        message: `Tu evidencia para "${mission.title}" fue aprobada (+${mission.xp} XP).${mentorFeedback ? ` Retroalimentación: "${mentorFeedback}"` : ''}`,
        referenceId: mission.id,
        createdAt: new Date().toISOString(),
        read: false,
      });
    } else {
      // Notification for student: Mission rejected with feedback
      state.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        studentId: sub.studentId,
        type: 'mision_rechazada',
        title: 'Observación en tu misión',
        message: `El mentor revisó tu entrega de "${mission.title}". ${mentorFeedback ? `Motivo: "${mentorFeedback}"` : 'Revisa los requisitos para volver a intentarla.'}`,
        referenceId: mission.id,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }

    state.missionSubmissions[subIndex] = sub;
    saveState(state);
    return { newlyEarnedBadges };
  },

  completeDiagnostic(
    studentId: string,
    responses: DiagnosticResponse[]
  ): DiagnosticResult {
    const state = loadState();
    const questions = state.diagnosticQuestions;

    // Group scores by skillId
    const scoresBySkill: Record<string, number[]> = {};
    responses.forEach((resp) => {
      const q = questions.find((item) => item.id === resp.questionId);
      if (q) {
        if (!scoresBySkill[q.skillId]) scoresBySkill[q.skillId] = [];
        scoresBySkill[q.skillId].push(resp.score);
      }
    });

    const skillScores: Record<string, number> = {};
    let totalScore = 0;
    let totalCount = 0;

    Object.entries(scoresBySkill).forEach(([skillId, scoreList]) => {
      const avg = scoreList.reduce((a, b) => a + b, 0) / (scoreList.length || 1);
      skillScores[skillId] = Math.round(avg * 10) / 10;
      totalScore += avg;
      totalCount += 1;
    });

    const overallScore = Math.round((totalScore / (totalCount || 1)) * 10) / 10;
    // Suggested Level: 1 to 5 scale -> 1 if < 2.5, 2 if 2.5-3.5, 3 if > 3.5
    let suggestedLevel = 1;
    if (overallScore >= 4.0) suggestedLevel = 3;
    else if (overallScore >= 2.5) suggestedLevel = 2;

    const result: DiagnosticResult = {
      id: `diag_${Date.now()}`,
      studentId,
      completedAt: new Date().toISOString(),
      responses,
      skillScores,
      overallScore,
      suggestedLevel,
    };

    // Update diagnostic results
    const existingIndex = state.diagnosticResults.findIndex((r) => r.studentId === studentId);
    if (existingIndex !== -1) {
      state.diagnosticResults[existingIndex] = result;
    } else {
      state.diagnosticResults.push(result);
    }

    // Update student profile
    const profIndex = state.studentProfiles.findIndex((p) => p.userId === studentId);
    if (profIndex !== -1) {
      const prof = { ...state.studentProfiles[profIndex] };
      prof.diagnosticCompleted = true;
      prof.suggestedLevel = suggestedLevel;
      // Award initial onboarding XP (+50 XP for completing diagnostic!)
      prof.overallXp += 50;
      prof.overallLevel = getLevelProgress(prof.overallXp).level;
      state.studentProfiles[profIndex] = prof;
    }

    // Seed skill levels
    Object.entries(skillScores).forEach(([skillId, score]) => {
      const initialXp = Math.round(score * 20);
      const skIndex = state.skillLevels.findIndex(
        (sl) => sl.studentId === studentId && sl.skillId === skillId
      );
      if (skIndex !== -1) {
        state.skillLevels[skIndex].xp = Math.max(state.skillLevels[skIndex].xp, initialXp);
        state.skillLevels[skIndex].level = getLevelProgress(state.skillLevels[skIndex].xp).level;
      } else {
        state.skillLevels.push({
          studentId,
          skillId,
          xp: initialXp,
          level: getLevelProgress(initialXp).level,
        });
      }
    });

    saveState(state);
    return result;
  },

  adjustStudentProfile(
    studentId: string,
    updates: Partial<StudentProfile>
  ) {
    const state = loadState();
    const idx = state.studentProfiles.findIndex((p) => p.userId === studentId);
    if (idx !== -1) {
      state.studentProfiles[idx] = { ...state.studentProfiles[idx], ...updates };
      saveState(state);
    }
  },

  createMission(mission: Omit<Mission, 'id' | 'createdBy'>): Mission {
    const state = loadState();
    const newMission: Mission = {
      ...mission,
      id: `mis_${Date.now()}`,
      createdBy: state.currentUserId || 'usr_mentor_1',
    };
    state.missions.unshift(newMission);

    // If targeted to specific students or all, create assignments
    const targetStudents =
      mission.assignedStudentIds.length > 0
        ? mission.assignedStudentIds
        : state.users.filter((u) => u.role === 'student').map((u) => u.id);

    targetStudents.forEach((stdId) => {
      state.missionAssignments.push({
        id: `asg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        missionId: newMission.id,
        studentId: stdId,
        status: 'activa',
        assignedAt: new Date().toISOString(),
      });

      // Notification for student: New assigned mission
      state.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        studentId: stdId,
        type: 'mision_asignada',
        title: 'Nueva misión asignada',
        message: `El mentor te ha asignado la misión "${newMission.title}" (+${newMission.xp} XP).`,
        referenceId: newMission.id,
        createdAt: new Date().toISOString(),
        read: false,
      });
    });

    saveState(state);
    return newMission;
  },

  updateMission(missionId: string, updates: Partial<Mission>) {
    const state = loadState();
    const idx = state.missions.findIndex((m) => m.id === missionId);
    if (idx !== -1) {
      state.missions[idx] = { ...state.missions[idx], ...updates };
      saveState(state);
    }
  },

  createSkill(skill: Omit<Skill, 'id'>): Skill {
    const state = loadState();
    const newSkill: Skill = {
      ...skill,
      id: `skill_${Date.now()}`,
    };
    state.skills.push(newSkill);
    saveState(state);
    return newSkill;
  },

  updateSkill(skillId: string, updates: Partial<Skill>) {
    const state = loadState();
    const idx = state.skills.findIndex((s) => s.id === skillId);
    if (idx !== -1) {
      state.skills[idx] = { ...state.skills[idx], ...updates };
      saveState(state);
    }
  },

  createBadge(badge: Omit<Badge, 'id'>): Badge {
    const state = loadState();
    const newBadge: Badge = {
      ...badge,
      id: `bdg_${Date.now()}`,
    };
    state.badges.push(newBadge);
    saveState(state);
    return newBadge;
  },

  /**
   * Mentor-driven manual assignment. Only badges configured with
   * `conditionType: 'custom'` can be granted this way; automatic badges must
   * be earned through `evaluateBadgesForStudent`.
   */
  assignBadgeManually(studentId: string, badgeId: string, note?: string): EarnedBadge {
    const state = loadState();
    const badge = state.badges.find((b) => b.id === badgeId);
    if (!badge) {
      throw new Error('La insignia solicitada no existe.');
    }
    if (badge.conditionType !== 'custom') {
      throw new Error('Solo las insignias de tipo "Personalizado (manual)" pueden asignarse manualmente.');
    }
    if (state.earnedBadges.some((eb) => eb.studentId === studentId && eb.badgeId === badgeId)) {
      throw new Error('El estudiante ya cuenta con esta insignia.');
    }

    const earnedBadge: EarnedBadge = {
      id: `eb_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      studentId,
      badgeId,
      earnedAt: new Date().toISOString(),
      awardedBy: 'mentor',
      awardedByUserId: state.currentUserId || 'usr_mentor_1',
      ...(note ? { note } : {}),
    };
    state.earnedBadges.push(earnedBadge);

    state.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      studentId,
      type: 'insignia_otorgada',
      title: `¡Nueva insignia otorgada: ${badge.name}!`,
      message: badge.description,
      referenceId: badge.id,
      createdAt: new Date().toISOString(),
      read: false,
    });

    saveState(state);
    return earnedBadge;
  },

  revokeEarnedBadge(earnedBadgeId: string) {
    const state = loadState();
    state.earnedBadges = state.earnedBadges.filter((eb) => eb.id !== earnedBadgeId);
    saveState(state);
  },

  sendWeeklyMessage(title: string, message: string, targetStudentId?: string): MentorWeeklyMessage {
    const state = loadState();
    const msg: MentorWeeklyMessage = {
      id: `msg_${Date.now()}`,
      mentorId: state.currentUserId || 'usr_mentor_1',
      title,
      message,
      targetStudentId,
      createdAt: new Date().toISOString(),
      weekNumber: state.weeklyMessages.length + 1,
    };
    state.weeklyMessages.unshift(msg);

    // Notification for students: Mentor message
    const targetStudents = targetStudentId
      ? [targetStudentId]
      : state.users.filter((u) => u.role === 'student').map((u) => u.id);

    targetStudents.forEach((stdId) => {
      state.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        studentId: stdId,
        type: 'mensaje_mentor',
        title: `Nuevo mensaje del mentor: Semana ${msg.weekNumber}`,
        message: `${title}: "${message.substring(0, 95)}${message.length > 95 ? '...' : ''}"`,
        referenceId: msg.id,
        createdAt: new Date().toISOString(),
        read: false,
      });
    });

    saveState(state);
    return msg;
  },
};
