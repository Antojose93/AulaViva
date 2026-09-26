import React from 'react';
import { Brain, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { getLevelProgress } from '../../services/gamification';
import { Skill, SkillLevel } from '../../types';

interface SkillsOverviewProps {
  skills: Skill[];
  skillLevels: SkillLevel[];
}

export const SkillsOverview: React.FC<SkillsOverviewProps> = ({
  skills,
  skillLevels,
}) => {
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Tus Habilidades para la Vida
        </h3>
        <span className="text-xs text-slate-500 font-medium">3 Activas</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {skills.map((skill) => {
          const userSkill = skillLevels.find((sl) => sl.skillId === skill.id) || {
            xp: 0,
            level: 1,
          };
          const progress = getLevelProgress(userSkill.xp);

          return (
            <div
              key={skill.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs relative overflow-hidden transition-all hover:border-slate-300"
            >
              {/* Colored top accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: skill.color }}
              />

              <div className="flex items-center justify-between mb-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-2xs"
                  style={{ backgroundColor: skill.color }}
                >
                  {getSkillIcon(skill.iconName)}
                </div>

                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded-md text-xs font-black bg-slate-100 text-slate-800">
                    Nivel {userSkill.level}
                  </span>
                </div>
              </div>

              <h4 className="font-bold text-slate-900 text-sm leading-tight">
                {skill.name}
              </h4>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1 min-h-[32px] leading-relaxed">
                {skill.description}
              </p>

              {/* Progress bar inside skill */}
              <div className="mt-3 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                  <span>{userSkill.xp} XP</span>
                  <span className="text-slate-400">
                    {progress.xpNeededForNext > 0
                      ? `Faltan ${progress.xpNeededForNext} XP`
                      : 'Nivel Máximo'}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress.progressPercent}%`,
                      backgroundColor: skill.color,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
