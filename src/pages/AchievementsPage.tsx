import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, Star, Sparkles, Calendar, Target, Zap, Flame, Award, Shield } from 'lucide-react';

export const AchievementsPage: React.FC = () => {
  const { achievements } = useApp();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const getIcon = (iconName: string, isUnlocked: boolean) => {
    const iconClass = `h-6 w-6 ${isUnlocked ? 'text-yellow-400' : 'text-zinc-600'}`;
    switch (iconName) {
      case 'Play': return <Star className={iconClass} />;
      case 'Target': return <Target className={iconClass} />;
      case 'Zap': return <Zap className={iconClass} />;
      case 'Flame': return <Flame className={iconClass} />;
      case 'Trophy': return <Trophy className={iconClass} />;
      case 'Crown': return <Award className={iconClass} />;
      default: return <Shield className={iconClass} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'precision': return 'text-brand-cyan border-brand-cyan/20 bg-brand-cyan/5';
      case 'speed': return 'text-brand-purple border-brand-purple/20 bg-brand-purple/5';
      case 'mastery': return 'text-brand-magenta border-brand-magenta/20 bg-brand-magenta/5';
      default: return 'text-zinc-400 border-zinc-800 bg-zinc-900/30';
    }
  };

  // Filtered achievements
  const filteredAchievements = achievements.filter((ach) => {
    if (filter === 'unlocked') return ach.isUnlocked;
    if (filter === 'locked') return !ach.isUnlocked;
    return true;
  });

  const unlockedCount = achievements.filter(a => a.isUnlocked).length;
  const totalXpRewards = achievements.reduce((acc, a) => acc + (a.isUnlocked ? a.xpReward : 0), 0);
  const completionPercentage = Math.round((unlockedCount / achievements.length) * 100);

  return (
    <div className="space-y-6">
      
      {/* Header title */}
      <section className="text-left space-y-1">
        <h1 className="text-2xl md:text-3xl font-black text-white font-display uppercase tracking-tight">
          Operative Medal Cabinet
        </h1>
        <p className="text-xs md:text-sm text-zinc-400">
          Earn high-tier achievement medals to secure massive XP bonuses and rank up your profile.
        </p>
      </section>

      {/* Progress Dashboard summary */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Completion */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 text-left">
          <div className="p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">Completion Index</span>
            <span className="text-2xl font-black text-white font-display">{completionPercentage}%</span>
            <span className="block text-[10px] text-zinc-400 mt-0.5">{unlockedCount} of {achievements.length} Medals Unlocked</span>
          </div>
        </div>

        {/* Total XP Earned */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 text-left">
          <div className="p-3.5 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-brand-purple">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">Total Medal XP</span>
            <span className="text-2xl font-black text-white font-display">+{totalXpRewards} XP</span>
            <span className="block text-[10px] text-zinc-400 mt-0.5">Applied directly to Operative Rank</span>
          </div>
        </div>

        {/* Next Unlocks target */}
        <div className="glass-panel p-5 rounded-2xl border border-white/5 flex items-center gap-4 text-left">
          <div className="p-3.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan">
            <Star className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">Active Targets</span>
            <span className="text-2xl font-black text-white font-display">{achievements.length - unlockedCount} Medals</span>
            <span className="block text-[10px] text-zinc-400 mt-0.5">Locked in database logs</span>
          </div>
        </div>
      </section>

      {/* Filters & Control bar */}
      <div className="flex justify-between items-center bg-zinc-950 border border-zinc-900 rounded-xl p-2.5">
        <div className="flex gap-1.5 w-full sm:w-auto">
          {(['all', 'unlocked', 'locked'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold font-display uppercase tracking-wider transition-colors ${
                filter === tab
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Achievements Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAchievements.map((ach) => {
          const progressPercent = Math.round((ach.currentProgress / ach.maxProgress) * 100);
          return (
            <div
              key={ach.id}
              className={`glass-panel p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 relative overflow-hidden text-left ${
                ach.isUnlocked
                  ? 'border-yellow-500/30 shadow-lg shadow-yellow-500/2 bg-gradient-to-br from-zinc-900/50 via-zinc-900/10 to-[#1b1a14]'
                  : 'border-white/5 opacity-70'
              }`}
            >
              {/* Corner shine for unlocked */}
              {ach.isUnlocked && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-bl-full blur-xl pointer-events-none" />
              )}

              {/* Icon Container */}
              <div className={`p-3 rounded-2xl border flex-shrink-0 relative ${
                ach.isUnlocked
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.15)]'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-600'
              }`}>
                {getIcon(ach.icon, ach.isUnlocked)}
              </div>

              {/* Details Content */}
              <div className="flex-1 space-y-1.5 w-full">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className={`text-sm font-bold uppercase font-display leading-none ${ach.isUnlocked ? 'text-yellow-400' : 'text-white'}`}>
                    {ach.title}
                  </h3>
                  
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${getCategoryColor(ach.category)}`}>
                    {ach.category}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-normal">
                  {ach.description}
                </p>

                {/* Progress bar (Only show if maxProgress > 1 and not unlocked) */}
                {ach.maxProgress > 1 && !ach.isUnlocked && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-baseline text-[9px] font-bold text-zinc-500 uppercase">
                      <span>Progress</span>
                      <span>{ach.currentProgress} / {ach.maxProgress}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-950 border border-zinc-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-cyan transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Unlocked date or reward tag */}
                <div className="flex items-center justify-between pt-2.5 border-t border-zinc-900/40 mt-1 text-[9px] font-bold uppercase tracking-wider">
                  <span className={`${ach.isUnlocked ? 'text-yellow-500' : 'text-zinc-500'}`}>
                    +{ach.xpReward} XP Reward
                  </span>
                  
                  {ach.isUnlocked ? (
                    <span className="flex items-center gap-1 text-zinc-500 font-sans">
                      <Calendar className="h-3 w-3 text-zinc-500" />
                      Unlocked {ach.unlockedAt}
                    </span>
                  ) : (
                    <span className="text-zinc-600">Locked</span>
                  )}
                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
