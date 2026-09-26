import React from 'react';
import {
  Award,
  CheckCheck,
  Flame,
  Footprints,
  Lock,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { Badge, EarnedBadge } from '../../types';

interface BadgesGridProps {
  allBadges: Badge[];
  earnedBadges: EarnedBadge[];
}

export const BadgesGrid: React.FC<BadgesGridProps> = ({
  allBadges,
  earnedBadges,
}) => {
  const earnedSet = new Map<string, string>();
  earnedBadges.forEach((eb) => {
    earnedSet.set(eb.badgeId, eb.earnedAt);
  });

  const getBadgeIcon = (iconName: string, isEarned: boolean) => {
    const iconClass = `w-6 h-6 ${isEarned ? 'text-amber-500' : 'text-slate-400'}`;
    switch (iconName) {
      case 'Footprints':
        return <Footprints className={iconClass} />;
      case 'Flame':
        return <Flame className={iconClass} />;
      case 'CheckCheck':
        return <CheckCheck className={iconClass} />;
      case 'Trophy':
        return <Trophy className={iconClass} />;
      case 'Sparkles':
        return <Sparkles className={iconClass} />;
      case 'ShieldCheck':
        return <ShieldCheck className={iconClass} />;
      case 'Target':
        return <Target className={iconClass} />;
      default:
        return <Award className={iconClass} />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>Insignias de Constancia</span>
        </h3>
        <span className="text-xs text-slate-500 font-semibold">
          {earnedBadges.length} de {allBadges.length} Desbloqueadas
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {allBadges.map((badge) => {
          const isEarned = earnedSet.has(badge.id);
          const earnedDate = earnedSet.get(badge.id);

          return (
            <div
              key={badge.id}
              className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between ${
                isEarned
                  ? 'bg-gradient-to-b from-amber-50/60 to-white border-amber-200 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 opacity-60'
              }`}
            >
              {/* Icon Bubble */}
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 shadow-2xs relative ${
                  isEarned ? 'bg-amber-100' : 'bg-slate-200 text-slate-400'
                }`}
              >
                {getBadgeIcon(badge.icon, isEarned)}
                {!isEarned && (
                  <div className="absolute -bottom-1 -right-1 bg-slate-400 text-white rounded-full p-0.5">
                    <Lock className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Title & Desc */}
              <div className="w-full">
                <h4 className="font-bold text-xs text-slate-900 leading-tight truncate">
                  {badge.name}
                </h4>
                <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                  {badge.description}
                </p>
              </div>

              {/* Status footer */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 w-full text-[10px] font-semibold">
                {isEarned ? (
                  <span className="text-amber-700">
                    {earnedDate
                      ? `Obtenida ${new Date(earnedDate).toLocaleDateString()}`
                      : '¡Obtenida!'}
                  </span>
                ) : (
                  <span className="text-slate-400">Bloqueada</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
