import { Badge, EarnedBadge, Mission, MissionSubmission, StudentProfile } from '../types';

// Scalable level progression table
// Level 1: 0 XP, Level 2: 100 XP, Level 3: 250 XP, Level 4: 500 XP, Level 5: 1000 XP...
export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 1800, 3000, 4800, 7200, 10000];

export function getXpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level - 1 < LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[level - 1];
  }
  // Scalable formula beyond predefined table: base + quadratic growth
  return Math.floor(1000 * Math.pow(1.35, level - 5));
}

export function getLevelProgress(xp: number): {
  level: number;
  currentLevelFloorXp: number;
  nextLevelCeilXp: number;
  progressPercent: number;
  xpNeededForNext: number;
} {
  let level = 1;
  while (xp >= getXpRequiredForLevel(level + 1)) {
    level++;
  }

  const floorXp = getXpRequiredForLevel(level);
  const ceilXp = getXpRequiredForLevel(level + 1);
  const span = ceilXp - floorXp;
  const current = xp - floorXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((current / (span || 1)) * 100)));
  const xpNeededForNext = Math.max(0, ceilXp - xp);

  return {
    level,
    currentLevelFloorXp: floorXp,
    nextLevelCeilXp: ceilXp,
    progressPercent,
    xpNeededForNext,
  };
}

export function calculateStudentHealth(
  submissions: MissionSubmission[],
  assignmentsCount: number
): {
  completionRate: number;
  statusHealth: 'optimo' | 'observacion' | 'riesgo';
  colorCode: string;
} {
  if (assignmentsCount === 0) {
    return { completionRate: 100, statusHealth: 'optimo', colorCode: '#10b981' };
  }

  const completed = submissions.filter((s) => s.status === 'cumplida').length;
  const completionRate = Math.round((completed / assignmentsCount) * 100);

  if (completionRate >= 80) {
    return { completionRate, statusHealth: 'optimo', colorCode: '#10b981' }; // 🟢 Verde
  } else if (completionRate >= 50) {
    return { completionRate, statusHealth: 'observacion', colorCode: '#eab308' }; // 🟡 Amarillo
  } else {
    return { completionRate, statusHealth: 'riesgo', colorCode: '#ef4444' }; // 🔴 Rojo
  }
}

export function evaluateBadgesForStudent(
  studentProfile: StudentProfile,
  studentSubmissions: MissionSubmission[],
  missionsMap: Map<string, Mission>,
  allBadges: Badge[],
  currentEarnedBadges: EarnedBadge[]
): Badge[] {
  const earnedBadgeIds = new Set(
    currentEarnedBadges.filter((b) => b.studentId === studentProfile.userId).map((b) => b.badgeId)
  );

  const completedSubmissions = studentSubmissions.filter((s) => s.status === 'cumplida');
  const newlyEarned: Badge[] = [];

  for (const badge of allBadges) {
    if (earnedBadgeIds.has(badge.id)) continue;

    let qualifies = false;

    // Configurable thresholds: mentors can override the default milestone via
    // `conditionThreshold` when creating/editing a badge. Falls back to the
    // historical defaults when no threshold is configured.
    switch (badge.conditionType) {
      case 'first_mission': {
        const threshold = badge.conditionThreshold ?? 1;
        qualifies = completedSubmissions.length >= threshold;
        break;
      }
      case 'streak_7': {
        const threshold = badge.conditionThreshold ?? 7;
        qualifies =
          studentProfile.currentStreak >= threshold || studentProfile.longestStreak >= threshold;
        break;
      }
      case 'missions_10': {
        const threshold = badge.conditionThreshold ?? 10;
        qualifies = completedSubmissions.length >= threshold;
        break;
      }
      case 'hard_challenge': {
        // At least `threshold` missions completed with difficulty "dificil"/"epica" or type "reto/boss"
        const threshold = badge.conditionThreshold ?? 1;
        const hardCompletedCount = completedSubmissions.filter((s) => {
          const mission = missionsMap.get(s.missionId);
          return mission && (mission.difficulty === 'dificil' || mission.difficulty === 'epica' || mission.type === 'reto/boss');
        }).length;
        qualifies = hardCompletedCount >= threshold;
        break;
      }
      case 'skill_level_3': {
        const threshold = badge.conditionThreshold ?? 3;
        qualifies = studentProfile.overallLevel >= threshold;
        break;
      }
      case 'custom':
        // Manual badges are never auto-awarded; mentors assign them explicitly.
        qualifies = false;
        break;
      default:
        break;
    }

    if (qualifies) {
      newlyEarned.push(badge);
    }
  }

  return newlyEarned;
}
