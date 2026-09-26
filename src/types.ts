export type UserRole = 'student' | 'mentor';

export type MissionType = 'diaria' | 'semanal' | 'personalizada' | 'reto/boss';
export type MissionDifficulty = 'facil' | 'media' | 'dificil' | 'epica';
export type SubmissionStatus = 'cumplida' | 'no_cumplida' | 'pendiente_aprobacion' | 'rechazada';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar: string;
  createdAt: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  grade: string; // "Grado 11-A"
  overallXp: number;
  overallLevel: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  diagnosticCompleted: boolean;
  suggestedLevel?: number;
  mentorNotes?: string;
  statusHealth: 'optimo' | 'observacion' | 'riesgo'; // >80% verde, 50-80% amarillo, <50% rojo
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  color: string;
  iconName: string;
  category: 'core' | 'custom';
}

export interface SkillLevel {
  studentId: string;
  skillId: string;
  xp: number;
  level: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  skillId: string;
  xp: number;
  difficulty: MissionDifficulty;
  type: MissionType;
  frequency: 'diaria' | 'semanal' | 'unica';
  startDate: string;
  endDate: string;
  requiresEvidence: boolean;
  unlockCondition?: string;
  assignedStudentIds: string[]; // empty means all students
  createdBy: string;
}

export interface MissionAssignment {
  id: string;
  missionId: string;
  studentId: string;
  status: 'activa' | 'completada' | 'expirada' | 'fallida';
  assignedAt: string;
  completedAt?: string;
}

export interface MissionSubmission {
  id: string;
  missionId: string;
  studentId: string;
  status: SubmissionStatus;
  reflection?: string;
  evidenceUrl?: string;
  evidenceDescription?: string;
  evidenceFileName?: string;
  evidenceContentType?: string;
  evidenceStoragePath?: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  mentorFeedback?: string;
  xpAwarded: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'constancia' | 'habilidad' | 'misiones' | 'especial';
  conditionType: 'first_mission' | 'streak_7' | 'missions_10' | 'hard_challenge' | 'skill_level_3' | 'custom';
  conditionThreshold?: number;
}

export interface EarnedBadge {
  id: string;
  studentId: string;
  badgeId: string;
  earnedAt: string;
  awardedBy?: 'system' | 'mentor';
  awardedByUserId?: string;
  note?: string;
}

export interface DiagnosticQuestion {
  id: string;
  skillId: string;
  question: string;
  aspect: string;
}

export interface DiagnosticResponse {
  questionId: string;
  score: number; // 1 to 5
}

export interface DiagnosticResult {
  id: string;
  studentId: string;
  completedAt: string;
  responses: DiagnosticResponse[];
  skillScores: Record<string, number>; // skillId -> avg score (1-5)
  overallScore: number; // avg score
  suggestedLevel: number;
  mentorAdjustedLevel?: number;
  mentorObservations?: string;
}

export interface MentorWeeklyMessage {
  id: string;
  mentorId: string;
  title: string;
  message: string;
  targetStudentId?: string; // empty means for all
  createdAt: string;
  weekNumber: number;
}

export interface MentorAlert {
  id: string;
  studentId: string;
  type: 'inactividad' | 'racha_perdida' | 'bajo_cumplimiento' | 'diagnostico_pendiente';
  message: string;
  severity: 'alta' | 'media' | 'baja';
  createdAt: string;
}

export type NotificationType =
  | 'mision_asignada'
  | 'mensaje_mentor'
  | 'mision_aprobada'
  | 'mision_rechazada'
  | 'insignia_otorgada';

export interface StudentNotification {
  id: string;
  studentId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string; // missionId or messageId or submissionId
  createdAt: string;
  read: boolean;
}
