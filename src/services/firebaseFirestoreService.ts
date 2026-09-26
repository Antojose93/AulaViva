import { collection, deleteDoc, deleteField, doc, getDoc, getDocs, onSnapshot, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  INITIAL_BADGES,
  INITIAL_DIAGNOSTIC_QUESTIONS,
  INITIAL_DIAGNOSTIC_RESULTS,
  INITIAL_EARNED_BADGES,
  INITIAL_MENTOR,
  INITIAL_MISSIONS,
  INITIAL_MISSION_ASSIGNMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SKILLS,
  INITIAL_SKILL_LEVELS,
  INITIAL_STUDENT_PROFILES,
  INITIAL_STUDENTS,
  INITIAL_SUBMISSIONS,
  INITIAL_WEEKLY_MESSAGES,
} from '../data/initialData';
import { calculateStudentHealth, evaluateBadgesForStudent, getLevelProgress } from './gamification';
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

type PendingSubmission = MissionSubmission & { mission?: Mission; student?: User };
type Unsubscribe = () => void;

const INITIAL_USERS: User[] = [INITIAL_MENTOR, ...INITIAL_STUDENTS];
const SEEDED_USER_IDS = new Set(INITIAL_USERS.map((user) => user.id));
const DEFAULT_PROFILE_GRADE = 'Grado 11-A';

function nowIso(): string {
  return new Date().toISOString();
}

function todayIsoDate(): string {
  return nowIso().split('T')[0];
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeDoc<T>(snapshot: { id: string; data: () => Record<string, unknown> }): T {
  return { id: snapshot.id, ...snapshot.data() } as T;
}

/**
 * Firestore rejects `undefined` field values on writes. Optional fields (e.g. Mission.unlockCondition,
 * MissionSubmission.reflection, MentorWeeklyMessage.targetStudentId) are frequently omitted by callers,
 * which produces `undefined` in the object literal. Strip those keys before a `setDoc`/`batch.set` on a
 * brand-new document, so the field is simply absent instead of throwing "Unsupported field value: undefined".
 */
function omitUndefined<T extends Record<string, any>>(data: T): Partial<T> {
  const result: Partial<T> = {};
  (Object.keys(data) as (keyof T)[]).forEach((key) => {
    if (data[key] !== undefined) {
      result[key] = data[key];
    }
  });
  return result;
}

/**
 * For merge-based updates (`setDoc(..., { merge: true })` / `updateDoc`), an `undefined` value should mean
 * "clear this field" rather than being silently dropped (which would leave the previous value untouched).
 * Firestore's `deleteField()` sentinel is the correct way to express that intent.
 */
function toMergeUpdate<T extends Record<string, any>>(data: T): Record<string, any> {
  const result: Record<string, any> = {};
  Object.keys(data).forEach((key) => {
    const value = (data as Record<string, unknown>)[key];
    result[key] = value === undefined ? deleteField() : value;
  });
  return result;
}

function getInitialStudentProfile(studentId: string): StudentProfile | undefined {
  return INITIAL_STUDENT_PROFILES.find((profile) => profile.userId === studentId);
}

function createDefaultStudentProfile(studentId: string): StudentProfile {
  return (
    getInitialStudentProfile(studentId) || {
      id: studentId,
      userId: studentId,
      grade: DEFAULT_PROFILE_GRADE,
      overallXp: 0,
      overallLevel: 1,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: todayIsoDate(),
      diagnosticCompleted: false,
      statusHealth: 'observacion',
      mentorNotes: 'Estudiante registrado en Aula Viva.',
    }
  );
}

function getInitialMission(missionId: string): Mission | undefined {
  return INITIAL_MISSIONS.find((mission) => mission.id === missionId);
}

function dedupeUsersByEmail(users: User[]): User[] {
  const selectedByEmail = new Map<string, User>();

  users.forEach((user) => {
    const key = user.email.trim().toLowerCase();
    const existing = selectedByEmail.get(key);

    if (!existing) {
      selectedByEmail.set(key, user);
      return;
    }

    const currentScore = SEEDED_USER_IDS.has(existing.id) ? 0 : 1;
    const nextScore = SEEDED_USER_IDS.has(user.id) ? 0 : 1;
    if (nextScore >= currentScore) {
      selectedByEmail.set(key, user);
    }
  });

  return Array.from(selectedByEmail.values());
}

function computeMentorAlerts(students: User[], profiles: StudentProfile[]): MentorAlert[] {
  const alerts: MentorAlert[] = [];

  students.forEach((student) => {
    const profile = profiles.find((item) => item.userId === student.id);
    if (!profile) {
      return;
    }

    if (!profile.diagnosticCompleted) {
      alerts.push({
        id: `alt_diag_${student.id}`,
        studentId: student.id,
        type: 'diagnostico_pendiente',
        message: `${student.name} no ha realizado el diagnóstico inicial de habilidades.`,
        severity: 'media',
        createdAt: nowIso(),
      });
    }

    if (profile.statusHealth === 'riesgo') {
      alerts.push({
        id: `alt_risk_${student.id}`,
        studentId: student.id,
        type: 'bajo_cumplimiento',
        message: `${student.name} tiene un cumplimiento menor al 50% y racha inactiva.`,
        severity: 'alta',
        createdAt: nowIso(),
      });
    }

    if (profile.currentStreak === 0 && profile.longestStreak >= 3) {
      alerts.push({
        id: `alt_strk_${student.id}`,
        studentId: student.id,
        type: 'racha_perdida',
        message: `${student.name} perdió su racha de ${profile.longestStreak} días. Requiere contacto de apoyo.`,
        severity: 'media',
        createdAt: nowIso(),
      });
    }
  });

  return alerts;
}

function buildPendingSubmissions(
  submissions: MissionSubmission[],
  missions: Mission[],
  users: User[]
): PendingSubmission[] {
  return submissions
    .filter((submission) => submission.status === 'pendiente_aprobacion')
    .map((submission) => ({
      ...submission,
      mission: missions.find((mission) => mission.id === submission.missionId),
      student: users.find((user) => user.id === submission.studentId),
    }));
}

async function fetchProfileList(): Promise<StudentProfile[]> {
  try {
    const snapshot = await getDocs(collection(db, 'studentProfiles'));
    const profiles = snapshot.docs.map((item) => normalizeDoc<StudentProfile>(item));
    return profiles.length > 0 ? profiles : INITIAL_STUDENT_PROFILES;
  } catch (error) {
    console.warn('Profiles fetch fallback:', error);
    return INITIAL_STUDENT_PROFILES;
  }
}

async function fetchUsers(): Promise<User[]> {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    const users = snapshot.docs.map((item) => normalizeDoc<User>(item));
    return users.length > 0 ? dedupeUsersByEmail(users) : dedupeUsersByEmail(INITIAL_USERS);
  } catch (error) {
    console.warn('Users fetch fallback:', error);
    return dedupeUsersByEmail(INITIAL_USERS);
  }
}

async function fetchStudents(): Promise<User[]> {
  const users = await fetchUsers();
  return users.filter((user) => user.role === 'student');
}

async function fetchMissions(): Promise<Mission[]> {
  try {
    const snapshot = await getDocs(collection(db, 'missions'));
    return snapshot.docs.map((item) => normalizeDoc<Mission>(item));
  } catch (error) {
    console.warn('Missions fetch fallback:', error);
    return INITIAL_MISSIONS;
  }
}

async function fetchMissionAssignments(studentId?: string): Promise<MissionAssignment[]> {
  try {
    const baseCollection = collection(db, 'missionAssignments');
    const snapshot = studentId
      ? await getDocs(query(baseCollection, where('studentId', '==', studentId)))
      : await getDocs(baseCollection);
    const assignments = snapshot.docs.map((item) => normalizeDoc<MissionAssignment>(item));
    if (assignments.length > 0) {
      return assignments;
    }
  } catch (error) {
    console.warn('Assignments fetch fallback:', error);
  }

  return studentId
    ? INITIAL_MISSION_ASSIGNMENTS.filter((assignment) => assignment.studentId === studentId)
    : INITIAL_MISSION_ASSIGNMENTS;
}

async function fetchSubmissions(studentId?: string): Promise<MissionSubmission[]> {
  try {
    const baseCollection = collection(db, 'missionSubmissions');
    const snapshot = studentId
      ? await getDocs(query(baseCollection, where('studentId', '==', studentId)))
      : await getDocs(baseCollection);
    const submissions = snapshot.docs.map((item) => normalizeDoc<MissionSubmission>(item));
    if (submissions.length > 0) {
      return submissions;
    }
  } catch (error) {
    console.warn('Submissions fetch fallback:', error);
  }

  return studentId
    ? INITIAL_SUBMISSIONS.filter((submission) => submission.studentId === studentId)
    : INITIAL_SUBMISSIONS;
}

async function fetchBadges(): Promise<Badge[]> {
  try {
    const snapshot = await getDocs(collection(db, 'badges'));
    return snapshot.docs.map((item) => normalizeDoc<Badge>(item));
  } catch (error) {
    console.warn('Badges fetch fallback:', error);
    return INITIAL_BADGES;
  }
}

async function fetchSkillLevels(studentId?: string): Promise<SkillLevel[]> {
  try {
    const baseCollection = collection(db, 'skillLevels');
    const snapshot = studentId
      ? await getDocs(query(baseCollection, where('studentId', '==', studentId)))
      : await getDocs(baseCollection);
    const skillLevels = snapshot.docs.map((item) => item.data() as SkillLevel);
    if (skillLevels.length > 0) {
      return skillLevels;
    }
  } catch (error) {
    console.warn('Skill levels fetch fallback:', error);
  }

  return studentId
    ? INITIAL_SKILL_LEVELS.filter((item) => item.studentId === studentId)
    : INITIAL_SKILL_LEVELS;
}

async function fetchEarnedBadges(studentId?: string): Promise<EarnedBadge[]> {
  try {
    const baseCollection = collection(db, 'earnedBadges');
    const snapshot = studentId
      ? await getDocs(query(baseCollection, where('studentId', '==', studentId)))
      : await getDocs(baseCollection);
    const earnedBadges = snapshot.docs.map((item) => normalizeDoc<EarnedBadge>(item));
    if (earnedBadges.length > 0) {
      return earnedBadges;
    }
  } catch (error) {
    console.warn('Earned badges fetch fallback:', error);
  }

  return studentId
    ? INITIAL_EARNED_BADGES.filter((item) => item.studentId === studentId)
    : INITIAL_EARNED_BADGES;
}

async function fetchDiagnosticQuestions(): Promise<DiagnosticQuestion[]> {
  try {
    const snapshot = await getDocs(collection(db, 'diagnosticQuestions'));
    return snapshot.docs.map((item) => normalizeDoc<DiagnosticQuestion>(item));
  } catch (error) {
    console.warn('Diagnostic questions fetch fallback:', error);
    return INITIAL_DIAGNOSTIC_QUESTIONS;
  }
}

async function fetchDiagnosticResult(studentId: string): Promise<DiagnosticResult | null> {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'diagnosticResults'), where('studentId', '==', studentId))
    );
    if (!snapshot.empty) {
      return normalizeDoc<DiagnosticResult>(snapshot.docs[0]);
    }
  } catch (error) {
    console.warn('Diagnostic result fetch fallback:', error);
  }

  return INITIAL_DIAGNOSTIC_RESULTS.find((item) => item.studentId === studentId) || null;
}

async function fetchWeeklyMessages(studentId?: string): Promise<MentorWeeklyMessage[]> {
  try {
    const snapshot = await getDocs(collection(db, 'weeklyMessages'));
    const messages = snapshot.docs.map((item) => normalizeDoc<MentorWeeklyMessage>(item));
    const filtered = studentId
      ? messages.filter(
          (message) => !message.targetStudentId || message.targetStudentId === studentId
        )
      : messages;
    if (filtered.length > 0) {
      return filtered.sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    }
  } catch (error) {
    console.warn('Weekly messages fetch fallback:', error);
  }

  const fallback = studentId
    ? INITIAL_WEEKLY_MESSAGES.filter(
        (message) => !message.targetStudentId || message.targetStudentId === studentId
      )
    : INITIAL_WEEKLY_MESSAGES;
  return [...fallback].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

async function fetchNotifications(studentId?: string): Promise<StudentNotification[]> {
  try {
    const baseCollection = collection(db, 'studentNotifications');
    const snapshot = studentId
      ? await getDocs(query(baseCollection, where('studentId', '==', studentId)))
      : await getDocs(baseCollection);
    const notifications = snapshot.docs.map((item) => normalizeDoc<StudentNotification>(item));
    if (notifications.length > 0) {
      return notifications.sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    }
  } catch (error) {
    console.warn('Notifications fetch fallback:', error);
  }

  const fallback = studentId
    ? INITIAL_NOTIFICATIONS.filter((notification) => notification.studentId === studentId)
    : INITIAL_NOTIFICATIONS;
  return [...fallback].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

async function seedInitialData(): Promise<void> {
  const metaRef = doc(db, 'systemMeta', 'initial_seed');
  const metaSnap = await getDoc(metaRef);

  if (metaSnap.exists() && metaSnap.data()?.seeded) {
    return;
  }

  const batch = writeBatch(db);

  INITIAL_SKILLS.forEach((skill) => {
    batch.set(doc(db, 'skills', skill.id), skill, { merge: true });
  });

  INITIAL_BADGES.forEach((badge) => {
    batch.set(doc(db, 'badges', badge.id), badge, { merge: true });
  });

  INITIAL_MISSIONS.forEach((mission) => {
    batch.set(doc(db, 'missions', mission.id), mission, { merge: true });
  });

  INITIAL_MISSION_ASSIGNMENTS.forEach((assignment) => {
    batch.set(doc(db, 'missionAssignments', assignment.id), assignment, { merge: true });
  });

  INITIAL_SUBMISSIONS.forEach((submission) => {
    batch.set(doc(db, 'missionSubmissions', submission.id), submission, { merge: true });
  });

  INITIAL_WEEKLY_MESSAGES.forEach((message) => {
    batch.set(doc(db, 'weeklyMessages', message.id), message, { merge: true });
  });

  INITIAL_NOTIFICATIONS.forEach((notification) => {
    batch.set(doc(db, 'studentNotifications', notification.id), notification, { merge: true });
  });

  INITIAL_USERS.forEach((user) => {
    batch.set(doc(db, 'users', user.id), user, { merge: true });
  });

  INITIAL_STUDENT_PROFILES.forEach((profile) => {
    batch.set(doc(db, 'studentProfiles', profile.userId), profile, { merge: true });
  });

  INITIAL_SKILL_LEVELS.forEach((skillLevel) => {
    batch.set(
      doc(db, 'skillLevels', `${skillLevel.studentId}_${skillLevel.skillId}`),
      skillLevel,
      { merge: true }
    );
  });

  INITIAL_EARNED_BADGES.forEach((earnedBadge) => {
    batch.set(doc(db, 'earnedBadges', earnedBadge.id), earnedBadge, { merge: true });
  });

  INITIAL_DIAGNOSTIC_QUESTIONS.forEach((question) => {
    batch.set(doc(db, 'diagnosticQuestions', question.id), question, { merge: true });
  });

  INITIAL_DIAGNOSTIC_RESULTS.forEach((result) => {
    batch.set(doc(db, 'diagnosticResults', result.id), result, { merge: true });
  });

  batch.set(
    metaRef,
    {
      seeded: true,
      seededAt: nowIso(),
      version: '1.1.0',
    },
    { merge: true }
  );

  await batch.commit();
}

export const FirebaseFirestoreService = {
  async seedInitialDataIfNeeded(authenticatedUser?: User | null): Promise<void> {
    if (!authenticatedUser) {
      return;
    }

    try {
      await seedInitialData();
    } catch (error) {
      console.warn('Notice: Firestore seeding check completed or skipped due to rules:', error);
    }
  },

  subscribeToUsers(callback: (users: User[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const users = snapshot.docs.map((item) => normalizeDoc<User>(item));
        callback(users.length > 0 ? dedupeUsersByEmail(users) : dedupeUsersByEmail(INITIAL_USERS));
      },
      (error) => {
        console.warn('Users listener fallback:', error);
        callback(dedupeUsersByEmail(INITIAL_USERS));
      }
    );
  },

  subscribeToStudents(callback: (students: User[]) => void): Unsubscribe {
    return this.subscribeToUsers((users) => {
      callback(users.filter((user) => user.role === 'student'));
    });
  },

  subscribeToMentor(callback: (mentor: User) => void): Unsubscribe {
    return this.subscribeToUsers((users) => {
      callback(users.find((user) => user.role === 'mentor') || INITIAL_MENTOR);
    });
  },

  subscribeToMissions(callback: (missions: Mission[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, 'missions'),
      (snapshot) => {
        callback(snapshot.docs.map((item) => normalizeDoc<Mission>(item)));
      },
      (error) => {
        console.warn('Missions listener fallback:', error);
        callback(INITIAL_MISSIONS);
      }
    );
  },

  subscribeToMissionsForStudent(
    studentId: string,
    callback: (missions: Mission[]) => void
  ): Unsubscribe {
    return this.subscribeToMissions((missions) => {
      callback(
        missions.filter(
          (mission) =>
            !mission.assignedStudentIds?.length || mission.assignedStudentIds.includes(studentId)
        )
      );
    });
  },

  subscribeToMissionAssignments(callback: (assignments: MissionAssignment[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, 'missionAssignments'),
      (snapshot) => {
        const assignments = snapshot.docs.map((item) => normalizeDoc<MissionAssignment>(item));
        callback(assignments.length > 0 ? assignments : INITIAL_MISSION_ASSIGNMENTS);
      },
      (error) => {
        console.warn('Assignments listener fallback:', error);
        callback(INITIAL_MISSION_ASSIGNMENTS);
      }
    );
  },

  subscribeToStudentAssignments(
    studentId: string,
    callback: (assignments: MissionAssignment[]) => void
  ): Unsubscribe {
    return onSnapshot(
      query(collection(db, 'missionAssignments'), where('studentId', '==', studentId)),
      (snapshot) => {
        const assignments = snapshot.docs.map((item) => normalizeDoc<MissionAssignment>(item));
        callback(
          assignments.length > 0
            ? assignments
            : INITIAL_MISSION_ASSIGNMENTS.filter((assignment) => assignment.studentId === studentId)
        );
      },
      (error) => {
        console.warn('Student assignments listener fallback:', error);
        callback(
          INITIAL_MISSION_ASSIGNMENTS.filter((assignment) => assignment.studentId === studentId)
        );
      }
    );
  },

  subscribeToSkills(callback: (skills: Skill[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, 'skills'),
      (snapshot) => {
        callback(snapshot.docs.map((item) => normalizeDoc<Skill>(item)));
      },
      (error) => {
        console.warn('Skills listener fallback:', error);
        callback(INITIAL_SKILLS);
      }
    );
  },

  subscribeToSkillLevels(
    studentId: string,
    callback: (skillLevels: SkillLevel[]) => void
  ): Unsubscribe {
    return onSnapshot(
      query(collection(db, 'skillLevels'), where('studentId', '==', studentId)),
      (snapshot) => {
        const skillLevels = snapshot.docs.map((item) => item.data() as SkillLevel);
        callback(
          skillLevels.length > 0
            ? skillLevels
            : INITIAL_SKILL_LEVELS.filter((item) => item.studentId === studentId)
        );
      },
      (error) => {
        console.warn('Skill levels listener fallback:', error);
        callback(INITIAL_SKILL_LEVELS.filter((item) => item.studentId === studentId));
      }
    );
  },

  subscribeToBadges(callback: (badges: Badge[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, 'badges'),
      (snapshot) => {
        callback(snapshot.docs.map((item) => normalizeDoc<Badge>(item)));
      },
      (error) => {
        console.warn('Badges listener fallback:', error);
        callback(INITIAL_BADGES);
      }
    );
  },

  subscribeToEarnedBadges(
    studentId: string,
    callback: (earnedBadges: EarnedBadge[]) => void
  ): Unsubscribe {
    return onSnapshot(
      query(collection(db, 'earnedBadges'), where('studentId', '==', studentId)),
      (snapshot) => {
        const earnedBadges = snapshot.docs.map((item) => normalizeDoc<EarnedBadge>(item));
        callback(
          earnedBadges.length > 0
            ? earnedBadges
            : INITIAL_EARNED_BADGES.filter((item) => item.studentId === studentId)
        );
      },
      (error) => {
        console.warn('Earned badges listener fallback:', error);
        callback(INITIAL_EARNED_BADGES.filter((item) => item.studentId === studentId));
      }
    );
  },

  subscribeToAllStudentProfiles(callback: (profiles: StudentProfile[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, 'studentProfiles'),
      (snapshot) => {
        const profiles = snapshot.docs.map((item) => normalizeDoc<StudentProfile>(item));
        callback(profiles.length > 0 ? profiles : INITIAL_STUDENT_PROFILES);
      },
      (error) => {
        console.warn('Profiles listener fallback:', error);
        callback(INITIAL_STUDENT_PROFILES);
      }
    );
  },

  subscribeToStudentProfile(
    studentId: string,
    callback: (profile: StudentProfile | null) => void
  ): Unsubscribe {
    const profileRef = doc(db, 'studentProfiles', studentId);
    return onSnapshot(
      profileRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(normalizeDoc<StudentProfile>(snapshot));
          return;
        }

        callback(getInitialStudentProfile(studentId) || null);
      },
      (error) => {
        console.warn('Profile listener fallback:', error);
        callback(getInitialStudentProfile(studentId) || null);
      }
    );
  },

  subscribeToSubmissions(callback: (submissions: MissionSubmission[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, 'missionSubmissions'),
      (snapshot) => {
        const submissions = snapshot.docs.map((item) => normalizeDoc<MissionSubmission>(item));
        callback(submissions.length > 0 ? submissions : INITIAL_SUBMISSIONS);
      },
      (error) => {
        console.warn('Submissions listener fallback:', error);
        callback(INITIAL_SUBMISSIONS);
      }
    );
  },

  subscribeToStudentSubmissions(
    studentId: string,
    callback: (submissions: MissionSubmission[]) => void
  ): Unsubscribe {
    return onSnapshot(
      query(collection(db, 'missionSubmissions'), where('studentId', '==', studentId)),
      (snapshot) => {
        const submissions = snapshot.docs.map((item) => normalizeDoc<MissionSubmission>(item));
        callback(
          submissions.length > 0
            ? submissions
            : INITIAL_SUBMISSIONS.filter((submission) => submission.studentId === studentId)
        );
      },
      (error) => {
        console.warn('Student submissions listener fallback:', error);
        callback(INITIAL_SUBMISSIONS.filter((submission) => submission.studentId === studentId));
      }
    );
  },

  subscribeToDiagnosticQuestions(
    callback: (questions: DiagnosticQuestion[]) => void
  ): Unsubscribe {
    return onSnapshot(
      collection(db, 'diagnosticQuestions'),
      (snapshot) => {
        callback(snapshot.docs.map((item) => normalizeDoc<DiagnosticQuestion>(item)));
      },
      (error) => {
        console.warn('Diagnostic questions listener fallback:', error);
        callback(INITIAL_DIAGNOSTIC_QUESTIONS);
      }
    );
  },

  subscribeToDiagnosticResult(
    studentId: string,
    callback: (result: DiagnosticResult | null) => void
  ): Unsubscribe {
    return onSnapshot(
      query(collection(db, 'diagnosticResults'), where('studentId', '==', studentId)),
      (snapshot) => {
        if (!snapshot.empty) {
          callback(normalizeDoc<DiagnosticResult>(snapshot.docs[0]));
          return;
        }

        callback(INITIAL_DIAGNOSTIC_RESULTS.find((item) => item.studentId === studentId) || null);
      },
      (error) => {
        console.warn('Diagnostic result listener fallback:', error);
        callback(INITIAL_DIAGNOSTIC_RESULTS.find((item) => item.studentId === studentId) || null);
      }
    );
  },

  subscribeToNotifications(
    studentId: string,
    callback: (notifications: StudentNotification[]) => void
  ): Unsubscribe {
    return onSnapshot(
      query(collection(db, 'studentNotifications'), where('studentId', '==', studentId)),
      (snapshot) => {
        const notifications = snapshot.docs
          .map((item) => normalizeDoc<StudentNotification>(item))
          .sort(
            (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
          );
        callback(
          notifications.length > 0
            ? notifications
            : INITIAL_NOTIFICATIONS.filter((notification) => notification.studentId === studentId).sort(
                (left, right) =>
                  new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
              )
        );
      },
      (error) => {
        console.warn('Notifications listener fallback:', error);
        callback(
          INITIAL_NOTIFICATIONS.filter((notification) => notification.studentId === studentId).sort(
            (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
          )
        );
      }
    );
  },

  subscribeToUnreadNotificationsCount(
    studentId: string,
    callback: (count: number) => void
  ): Unsubscribe {
    return this.subscribeToNotifications(studentId, (notifications) => {
      callback(notifications.filter((notification) => !notification.read).length);
    });
  },

  subscribeToWeeklyMessages(
    studentId: string,
    callback: (messages: MentorWeeklyMessage[]) => void
  ): Unsubscribe {
    return onSnapshot(
      collection(db, 'weeklyMessages'),
      (snapshot) => {
        const messages = snapshot.docs
          .map((item) => normalizeDoc<MentorWeeklyMessage>(item))
          .filter((message) => !message.targetStudentId || message.targetStudentId === studentId)
          .sort(
            (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
          );
        callback(
          messages.length > 0
            ? messages
            : INITIAL_WEEKLY_MESSAGES.filter(
                (message) => !message.targetStudentId || message.targetStudentId === studentId
              ).sort(
                (left, right) =>
                  new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
              )
        );
      },
      (error) => {
        console.warn('Weekly messages listener fallback:', error);
        callback(
          INITIAL_WEEKLY_MESSAGES.filter(
            (message) => !message.targetStudentId || message.targetStudentId === studentId
          ).sort(
            (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
          )
        );
      }
    );
  },

  subscribeToPendingSubmissions(callback: (pendingSubmissions: PendingSubmission[]) => void): Unsubscribe {
    let submissions: MissionSubmission[] = INITIAL_SUBMISSIONS;
    let missions: Mission[] = INITIAL_MISSIONS;
    let users: User[] = dedupeUsersByEmail(INITIAL_USERS);

    const emit = () => callback(buildPendingSubmissions(submissions, missions, users));

    const unsubscribeSubmissions = this.subscribeToSubmissions((items) => {
      submissions = items;
      emit();
    });
    const unsubscribeMissions = this.subscribeToMissions((items) => {
      missions = items;
      emit();
    });
    const unsubscribeUsers = this.subscribeToUsers((items) => {
      users = items;
      emit();
    });

    emit();

    return () => {
      unsubscribeSubmissions();
      unsubscribeMissions();
      unsubscribeUsers();
    };
  },

  subscribeToMentorAlerts(callback: (alerts: MentorAlert[]) => void): Unsubscribe {
    let students: User[] = INITIAL_STUDENTS;
    let profiles: StudentProfile[] = INITIAL_STUDENT_PROFILES;

    const emit = () => callback(computeMentorAlerts(students, profiles));

    const unsubscribeStudents = this.subscribeToStudents((items) => {
      students = items;
      emit();
    });
    const unsubscribeProfiles = this.subscribeToAllStudentProfiles((items) => {
      profiles = items;
      emit();
    });

    emit();

    return () => {
      unsubscribeStudents();
      unsubscribeProfiles();
    };
  },

  async getPendingSubmissions(): Promise<PendingSubmission[]> {
    const [submissions, missions, users] = await Promise.all([
      fetchSubmissions(),
      fetchMissions(),
      fetchUsers(),
    ]);
    return buildPendingSubmissions(submissions, missions, users);
  },

  async getMentorAlerts(): Promise<MentorAlert[]> {
    const [students, profiles] = await Promise.all([fetchStudents(), fetchProfileList()]);
    return computeMentorAlerts(students, profiles);
  },

  async getUnreadNotificationsCount(studentId: string): Promise<number> {
    const notifications = await fetchNotifications(studentId);
    return notifications.filter((notification) => !notification.read).length;
  },

  async createMission(
    missionData: Omit<Mission, 'id' | 'createdBy'>,
    createdBy: string
  ): Promise<Mission> {
    const missionId = `mis_${Date.now()}`;
    const newMission: Mission = {
      ...missionData,
      id: missionId,
      createdBy,
    };

    const students =
      missionData.assignedStudentIds.length > 0
        ? missionData.assignedStudentIds
        : (await fetchStudents()).map((student) => student.id);
    const batch = writeBatch(db);

    batch.set(doc(db, 'missions', missionId), omitUndefined(newMission));

    students.forEach((studentId) => {
      const assignment: MissionAssignment = {
        id: createId('asg'),
        missionId,
        studentId,
        status: 'activa',
        assignedAt: nowIso(),
      };
      batch.set(doc(db, 'missionAssignments', assignment.id), assignment);

      const notification: StudentNotification = {
        id: createId('notif'),
        studentId,
        type: 'mision_asignada',
        title: 'Nueva misión asignada',
        message: `El mentor te ha asignado la misión "${newMission.title}" (+${newMission.xp} XP).`,
        referenceId: newMission.id,
        createdAt: nowIso(),
        read: false,
      };
      batch.set(doc(db, 'studentNotifications', notification.id), notification);
    });

    await batch.commit();
    return newMission;
  },

  async updateMission(missionId: string, updates: Partial<Mission>): Promise<void> {
    await setDoc(doc(db, 'missions', missionId), toMergeUpdate(updates), { merge: true });
  },

  async deleteMission(missionId: string): Promise<void> {
    await deleteDoc(doc(db, 'missions', missionId));

    try {
      const assignmentsSnapshot = await getDocs(
        query(collection(db, 'missionAssignments'), where('missionId', '==', missionId))
      );

      if (!assignmentsSnapshot.empty) {
        const batch = writeBatch(db);
        assignmentsSnapshot.docs.forEach((assignmentDoc) => {
          batch.delete(assignmentDoc.ref);
        });
        await batch.commit();
      }
    } catch (error) {
      console.warn('Mission assignment cleanup skipped:', error);
    }
  },

  async submitMission(
    studentId: string,
    missionId: string,
    status: 'cumplida' | 'no_cumplida',
    reflection?: string,
    evidenceUrl?: string,
    evidenceDescription?: string,
    evidenceMeta?: { fileName?: string; contentType?: string; storagePath?: string }
  ): Promise<{ newlyEarnedBadges: Badge[]; xpAdded: number }> {
    const missionSnap = await getDoc(doc(db, 'missions', missionId));
    const mission = missionSnap.exists()
      ? normalizeDoc<Mission>(missionSnap)
      : getInitialMission(missionId);

    if (!mission) {
      throw new Error('Misión no encontrada');
    }

    const profileRef = doc(db, 'studentProfiles', studentId);
    const profileSnap = await getDoc(profileRef);
    const profile = profileSnap.exists()
      ? normalizeDoc<StudentProfile>(profileSnap)
      : { ...createDefaultStudentProfile(studentId), id: studentId, userId: studentId };

    const [studentSubmissions, studentAssignments, earnedBadges, badges, missions] = await Promise.all(
      [
        fetchSubmissions(studentId),
        fetchMissionAssignments(studentId),
        fetchEarnedBadges(studentId),
        fetchBadges(),
        fetchMissions(),
      ]
    );

    const requiresMentorReview = status === 'cumplida' && mission.requiresEvidence;
    const submissionStatus: SubmissionStatus = requiresMentorReview ? 'pendiente_aprobacion' : status;
    const awardedXp = !requiresMentorReview && status === 'cumplida' ? mission.xp : 0;
    const timestamp = nowIso();
    const submission: MissionSubmission = {
      id: createId('sub'),
      missionId,
      studentId,
      status: submissionStatus,
      reflection,
      evidenceUrl,
      evidenceDescription,
      evidenceFileName: evidenceMeta?.fileName,
      evidenceContentType: evidenceMeta?.contentType,
      evidenceStoragePath: evidenceMeta?.storagePath,
      submittedAt: timestamp,
      xpAwarded: awardedXp,
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'missionSubmissions', submission.id), omitUndefined(submission));

    const existingAssignment = studentAssignments.find(
      (assignment) => assignment.studentId === studentId && assignment.missionId === missionId
    );
    const updatedAssignment: MissionAssignment = existingAssignment
      ? {
          ...existingAssignment,
          status: status === 'cumplida' ? 'completada' : 'fallida',
          completedAt: timestamp,
        }
      : {
          id: createId('asg'),
          missionId,
          studentId,
          status: status === 'cumplida' ? 'completada' : 'fallida',
          assignedAt: timestamp,
          completedAt: timestamp,
        };
    batch.set(doc(db, 'missionAssignments', updatedAssignment.id), updatedAssignment, { merge: true });

    let nextProfile: StudentProfile = { ...profile };
    let newlyEarnedBadges: Badge[] = [];

    if (status === 'cumplida' && !requiresMentorReview) {
      const nextOverallXp = nextProfile.overallXp + awardedXp;
      const nextCurrentStreak = nextProfile.currentStreak + 1;
      nextProfile = {
        ...nextProfile,
        overallXp: nextOverallXp,
        overallLevel: getLevelProgress(nextOverallXp).level,
        currentStreak: nextCurrentStreak,
        longestStreak: Math.max(nextProfile.longestStreak, nextCurrentStreak),
        lastActiveDate: todayIsoDate(),
      };

      const skillLevelRef = doc(db, 'skillLevels', `${studentId}_${mission.skillId}`);
      const skillLevelSnap = await getDoc(skillLevelRef);
      const currentSkillLevel = skillLevelSnap.exists() ? (skillLevelSnap.data() as SkillLevel) : null;
      if (currentSkillLevel) {
        const updatedSkillLevel: SkillLevel = {
          ...currentSkillLevel,
          xp: currentSkillLevel.xp + awardedXp,
          level: getLevelProgress(currentSkillLevel.xp + awardedXp).level,
        };
        batch.set(skillLevelRef, updatedSkillLevel, { merge: true });
      } else {
        const newSkillLevel: SkillLevel = {
          studentId,
          skillId: mission.skillId,
          xp: awardedXp,
          level: getLevelProgress(awardedXp).level,
        };
        batch.set(skillLevelRef, newSkillLevel, { merge: true });
      }

      const updatedSubmissions = [submission, ...studentSubmissions];
      const updatedAssignments = [
        updatedAssignment,
        ...studentAssignments.filter((assignment) => assignment.id !== updatedAssignment.id),
      ];
      nextProfile.statusHealth = calculateStudentHealth(
        updatedSubmissions,
        updatedAssignments.length
      ).statusHealth;

      const missionsMap = new Map<string, Mission>(missions.map((item) => [item.id, item]));
      newlyEarnedBadges = evaluateBadgesForStudent(
        nextProfile,
        updatedSubmissions,
        missionsMap,
        badges,
        earnedBadges
      );

      newlyEarnedBadges.forEach((badge) => {
        const earnedBadge: EarnedBadge = {
          id: createId('eb'),
          studentId,
          badgeId: badge.id,
          earnedAt: timestamp,
        };
        batch.set(doc(db, 'earnedBadges', earnedBadge.id), earnedBadge);
      });
    } else if (status === 'no_cumplida') {
      nextProfile = {
        ...nextProfile,
        currentStreak: 0,
        statusHealth: 'observacion',
      };
    }

    batch.set(profileRef, nextProfile, { merge: true });
    await batch.commit();

    return { newlyEarnedBadges, xpAdded: awardedXp };
  },

  async reviewSubmission(
    submissionId: string,
    approved: boolean,
    mentorFeedback?: string,
    mentorId: string = INITIAL_MENTOR.id
  ): Promise<{ newlyEarnedBadges: Badge[] }> {
    const submissionRef = doc(db, 'missionSubmissions', submissionId);
    const submissionSnap = await getDoc(submissionRef);
    const submission = submissionSnap.exists()
      ? normalizeDoc<MissionSubmission>(submissionSnap)
      : INITIAL_SUBMISSIONS.find((item) => item.id === submissionId);

    if (!submission) {
      throw new Error('Entrega no encontrada');
    }

    const missionSnap = await getDoc(doc(db, 'missions', submission.missionId));
    const mission = missionSnap.exists()
      ? normalizeDoc<Mission>(missionSnap)
      : getInitialMission(submission.missionId);

    if (!mission) {
      throw new Error('Misión no encontrada');
    }

    const profileRef = doc(db, 'studentProfiles', submission.studentId);
    const profileSnap = await getDoc(profileRef);
    const profile = profileSnap.exists()
      ? normalizeDoc<StudentProfile>(profileSnap)
      : {
          ...createDefaultStudentProfile(submission.studentId),
          id: submission.studentId,
          userId: submission.studentId,
        };

    const [studentSubmissions, earnedBadges, badges, missions] = await Promise.all([
      fetchSubmissions(submission.studentId),
      fetchEarnedBadges(submission.studentId),
      fetchBadges(),
      fetchMissions(),
    ]);

    const timestamp = nowIso();
    const updatedSubmission: MissionSubmission = {
      ...submission,
      reviewedBy: mentorId,
      reviewedAt: timestamp,
      mentorFeedback,
      status: approved ? 'cumplida' : 'rechazada',
      xpAwarded: approved ? mission.xp : 0,
    };

    const batch = writeBatch(db);
    batch.set(submissionRef, toMergeUpdate(updatedSubmission), { merge: true });

    let nextProfile: StudentProfile = { ...profile };
    let newlyEarnedBadges: Badge[] = [];

    if (approved) {
      const nextOverallXp = nextProfile.overallXp + mission.xp;
      const nextCurrentStreak = nextProfile.currentStreak + 1;
      nextProfile = {
        ...nextProfile,
        overallXp: nextOverallXp,
        overallLevel: getLevelProgress(nextOverallXp).level,
        currentStreak: nextCurrentStreak,
        longestStreak: Math.max(nextProfile.longestStreak, nextCurrentStreak),
        lastActiveDate: todayIsoDate(),
      };

      const skillLevelRef = doc(db, 'skillLevels', `${submission.studentId}_${mission.skillId}`);
      const skillLevelSnap = await getDoc(skillLevelRef);
      if (skillLevelSnap.exists()) {
        const skillLevel = skillLevelSnap.data() as SkillLevel;
        batch.set(
          skillLevelRef,
          {
            ...skillLevel,
            xp: skillLevel.xp + mission.xp,
            level: getLevelProgress(skillLevel.xp + mission.xp).level,
          },
          { merge: true }
        );
      }

      const missionsMap = new Map<string, Mission>(missions.map((item) => [item.id, item]));
      const submissionsForBadges = [
        updatedSubmission,
        ...studentSubmissions.filter((item) => item.id !== updatedSubmission.id),
      ];
      newlyEarnedBadges = evaluateBadgesForStudent(
        nextProfile,
        submissionsForBadges,
        missionsMap,
        badges,
        earnedBadges
      );

      newlyEarnedBadges.forEach((badge) => {
        const earnedBadge: EarnedBadge = {
          id: createId('eb'),
          studentId: submission.studentId,
          badgeId: badge.id,
          earnedAt: timestamp,
        };
        batch.set(doc(db, 'earnedBadges', earnedBadge.id), earnedBadge);
      });

      const approvalNotification: StudentNotification = {
        id: createId('notif'),
        studentId: submission.studentId,
        type: 'mision_aprobada',
        title: '¡Misión aprobada por tu mentor!',
        message: `Tu evidencia para "${mission.title}" fue aprobada (+${mission.xp} XP).${mentorFeedback ? ` Retroalimentación: "${mentorFeedback}"` : ''}`,
        referenceId: mission.id,
        createdAt: timestamp,
        read: false,
      };
      batch.set(doc(db, 'studentNotifications', approvalNotification.id), approvalNotification);
    } else {
      const rejectionNotification: StudentNotification = {
        id: createId('notif'),
        studentId: submission.studentId,
        type: 'mision_rechazada',
        title: 'Observación en tu misión',
        message: `El mentor revisó tu entrega de "${mission.title}". ${mentorFeedback ? `Motivo: "${mentorFeedback}"` : 'Revisa los requisitos para volver a intentarla.'}`,
        referenceId: mission.id,
        createdAt: timestamp,
        read: false,
      };
      batch.set(doc(db, 'studentNotifications', rejectionNotification.id), rejectionNotification);
    }

    batch.set(profileRef, nextProfile, { merge: true });
    await batch.commit();

    return { newlyEarnedBadges };
  },

  async completeDiagnostic(studentId: string, responses: DiagnosticResponse[]): Promise<DiagnosticResult> {
    const [questions, profileSnap, existingResult, existingSkillLevels] = await Promise.all([
      fetchDiagnosticQuestions(),
      getDoc(doc(db, 'studentProfiles', studentId)),
      fetchDiagnosticResult(studentId),
      fetchSkillLevels(studentId),
    ]);

    const scoresBySkill: Record<string, number[]> = {};
    responses.forEach((response) => {
      const question = questions.find((item) => item.id === response.questionId);
      if (!question) {
        return;
      }
      if (!scoresBySkill[question.skillId]) {
        scoresBySkill[question.skillId] = [];
      }
      scoresBySkill[question.skillId].push(response.score);
    });

    const skillScores: Record<string, number> = {};
    let totalScore = 0;
    let totalCount = 0;

    Object.entries(scoresBySkill).forEach(([skillId, scoreList]) => {
      const average = scoreList.reduce((sum, score) => sum + score, 0) / (scoreList.length || 1);
      skillScores[skillId] = Math.round(average * 10) / 10;
      totalScore += average;
      totalCount += 1;
    });

    const overallScore = Math.round((totalScore / (totalCount || 1)) * 10) / 10;
    let suggestedLevel = 1;
    if (overallScore >= 4.0) {
      suggestedLevel = 3;
    } else if (overallScore >= 2.5) {
      suggestedLevel = 2;
    }

    const result: DiagnosticResult = {
      id: existingResult?.id || studentId,
      studentId,
      completedAt: nowIso(),
      responses,
      skillScores,
      overallScore,
      suggestedLevel,
    };

    const profile = profileSnap.exists()
      ? normalizeDoc<StudentProfile>(profileSnap)
      : { ...createDefaultStudentProfile(studentId), id: studentId, userId: studentId };

    const updatedProfile: StudentProfile = {
      ...profile,
      diagnosticCompleted: true,
      suggestedLevel,
      overallXp: profile.overallXp + 50,
      overallLevel: getLevelProgress(profile.overallXp + 50).level,
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'diagnosticResults', result.id), result, { merge: true });
    batch.set(doc(db, 'studentProfiles', studentId), updatedProfile, { merge: true });

    Object.entries(skillScores).forEach(([skillId, score]) => {
      const initialXp = Math.round(score * 20);
      const existing = existingSkillLevels.find((item) => item.skillId === skillId);
      const xp = Math.max(existing?.xp || 0, initialXp);
      const skillLevel: SkillLevel = {
        studentId,
        skillId,
        xp,
        level: getLevelProgress(xp).level,
      };
      batch.set(doc(db, 'skillLevels', `${studentId}_${skillId}`), skillLevel, { merge: true });
    });

    await batch.commit();
    return result;
  },

  async adjustStudentProfile(studentId: string, updates: Partial<StudentProfile>): Promise<void> {
    await setDoc(doc(db, 'studentProfiles', studentId), toMergeUpdate(updates), { merge: true });
  },

  async createSkill(skill: Omit<Skill, 'id'>): Promise<Skill> {
    const newSkill: Skill = {
      ...skill,
      id: `skill_${Date.now()}`,
    };
    await setDoc(doc(db, 'skills', newSkill.id), newSkill);
    return newSkill;
  },

  async updateSkill(skillId: string, updates: Partial<Omit<Skill, 'id'>>): Promise<void> {
    await updateDoc(doc(db, 'skills', skillId), updates);
  },

  async deleteSkill(skillId: string): Promise<void> {
    await deleteDoc(doc(db, 'skills', skillId));
  },

  async createBadge(badge: Omit<Badge, 'id'>): Promise<Badge> {
    const newBadge: Badge = {
      ...badge,
      id: `bdg_${Date.now()}`,
    };
    await setDoc(doc(db, 'badges', newBadge.id), omitUndefined(newBadge));
    return newBadge;
  },

  async updateBadge(badgeId: string, updates: Partial<Omit<Badge, 'id'>>): Promise<void> {
    await updateDoc(doc(db, 'badges', badgeId), toMergeUpdate(updates));
  },

  async deleteBadge(badgeId: string): Promise<void> {
    await deleteDoc(doc(db, 'badges', badgeId));
  },

  /**
   * Mentor-driven manual assignment. Only badges configured with
   * `conditionType: 'custom'` can be granted this way; automatic badges must
   * be earned through `evaluateBadgesForStudent`.
   */
  async assignBadgeManually(
    studentId: string,
    badgeId: string,
    mentorId: string = INITIAL_MENTOR.id,
    note?: string
  ): Promise<EarnedBadge> {
    const badgeSnap = await getDoc(doc(db, 'badges', badgeId));
    if (!badgeSnap.exists()) {
      throw new Error('La insignia solicitada no existe.');
    }
    const badge = normalizeDoc<Badge>(badgeSnap);
    if (badge.conditionType !== 'custom') {
      throw new Error('Solo las insignias de tipo "Personalizado (manual)" pueden asignarse manualmente.');
    }

    const alreadyEarned = await fetchEarnedBadges(studentId);
    if (alreadyEarned.some((eb) => eb.badgeId === badgeId)) {
      throw new Error('El estudiante ya cuenta con esta insignia.');
    }

    const earnedBadge: EarnedBadge = {
      id: createId('eb'),
      studentId,
      badgeId,
      earnedAt: nowIso(),
      awardedBy: 'mentor',
      awardedByUserId: mentorId,
      ...(note ? { note } : {}),
    };

    const notification: StudentNotification = {
      id: createId('notif'),
      studentId,
      type: 'insignia_otorgada',
      title: `¡Nueva insignia otorgada: ${badge.name}!`,
      message: badge.description,
      referenceId: badge.id,
      createdAt: nowIso(),
      read: false,
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'earnedBadges', earnedBadge.id), omitUndefined(earnedBadge));
    batch.set(doc(db, 'studentNotifications', notification.id), notification);
    await batch.commit();

    return earnedBadge;
  },

  async revokeEarnedBadge(earnedBadgeId: string): Promise<void> {
    await deleteDoc(doc(db, 'earnedBadges', earnedBadgeId));
  },

  async createDiagnosticQuestion(
    question: Omit<DiagnosticQuestion, 'id'>
  ): Promise<DiagnosticQuestion> {
    const newQuestion: DiagnosticQuestion = {
      ...question,
      id: `diag_${Date.now()}`,
    };
    await setDoc(doc(db, 'diagnosticQuestions', newQuestion.id), newQuestion);
    return newQuestion;
  },

  async updateDiagnosticQuestion(
    questionId: string,
    updates: Partial<Omit<DiagnosticQuestion, 'id'>>
  ): Promise<void> {
    await updateDoc(doc(db, 'diagnosticQuestions', questionId), updates);
  },

  async deleteDiagnosticQuestion(questionId: string): Promise<void> {
    await deleteDoc(doc(db, 'diagnosticQuestions', questionId));
  },

  async sendWeeklyMessage(
    title: string,
    message: string,
    targetStudentId?: string,
    mentorId: string = INITIAL_MENTOR.id
  ): Promise<MentorWeeklyMessage> {
    const currentMessages = await fetchWeeklyMessages();
    const msg: MentorWeeklyMessage = {
      id: `msg_${Date.now()}`,
      mentorId,
      title,
      message,
      targetStudentId,
      createdAt: nowIso(),
      weekNumber: currentMessages.length + 1,
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'weeklyMessages', msg.id), omitUndefined(msg));

    const targetStudents = targetStudentId
      ? [targetStudentId]
      : (await fetchStudents()).map((student) => student.id);
    targetStudents.forEach((studentId) => {
      const notification: StudentNotification = {
        id: createId('notif'),
        studentId,
        type: 'mensaje_mentor',
        title: `Nuevo mensaje del mentor: Semana ${msg.weekNumber}`,
        message: `${title}: "${message.substring(0, 95)}${message.length > 95 ? '...' : ''}"`,
        referenceId: msg.id,
        createdAt: nowIso(),
        read: false,
      };
      batch.set(doc(db, 'studentNotifications', notification.id), notification);
    });

    await batch.commit();
    return msg;
  },

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(db, 'studentNotifications', notificationId), { read: true });
  },

  async markAllNotificationsAsRead(studentId: string): Promise<void> {
    const snapshot = await getDocs(
      query(
        collection(db, 'studentNotifications'),
        where('studentId', '==', studentId),
        where('read', '==', false)
      )
    );
    const batch = writeBatch(db);
    snapshot.forEach((item) => {
      batch.update(item.ref, { read: true });
    });
    await batch.commit();
  },

  async clearNotification(notificationId: string): Promise<void> {
    await deleteDoc(doc(db, 'studentNotifications', notificationId));
  },
};
