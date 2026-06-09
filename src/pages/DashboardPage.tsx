import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StatsCard } from '../components/StatsCard';
import { Chart } from '../components/Chart';
import { ControllerSvg } from '../components/ControllerSvg';
import { Play, Sparkles, Flame, BarChart2, ShieldAlert } from 'lucide-react';

interface DashboardPageProps {
  setActivePage: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setActivePage }) => {
  const { profile, stats, simulateStreak, achievements } = useApp();
  const [activePart, setActivePart] = useState<'left-stick' | 'right-stick' | 'dpad' | 'buttons' | 'triggers' | null>(null);

  // Filter unlocked achievements for dashboard highlight
  const unlockedCount = achievements.filter(a => a.isUnlocked).length;
  const recentAchievements = achievements
    .filter(a => a.isUnlocked)
    .slice(-2);

  return (
    <div className="space-y-6">
      
      {/* Welcome & Level Banner */}
      <section className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-80 h-full bg-brand-purple/5 blur-[50px] pointer-events-none" />
        
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-cyan uppercase tracking-wider font-display">
            <Sparkles className="h-4 w-4 text-brand-cyan animate-pulse" />
            Operative Active Hub
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white font-display uppercase tracking-tight">
            Welcome Back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">{profile.username}</span>
          </h1>
          <p className="text-xs md:text-sm text-zinc-400">
            System status: <span className="text-brand-green font-semibold uppercase">Calibrated</span>. Level {profile.level} {profile.title}.
          </p>
        </div>

        {/* Level Circle */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="block text-xs font-bold text-zinc-500 uppercase font-display">Current Ranking</span>
            <span className="text-sm font-semibold text-zinc-300 font-display">{profile.title}</span>
          </div>
          <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-brand-purple/30 flex flex-col items-center justify-center shadow-lg shadow-brand-purple/15">
            <span className="text-[10px] text-zinc-500 font-bold uppercase leading-none">Rank</span>
            <span className="text-2xl font-black text-brand-purple font-display">{profile.level}</span>
          </div>
        </div>
      </section>

      {/* Main Grid: Telemetry Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Average Accuracy"
          value={stats.accuracy}
          suffix="%"
          iconName="Target"
          colorClass="cyan"
          description="Friction tracking precision"
        />
        <StatsCard
          title="Reflex Response"
          value={stats.reactionTime}
          suffix="ms"
          iconName="Zap"
          colorClass="purple"
          description="Average popup reaction speed"
        />
        <StatsCard
          title="Consistency Index"
          value={stats.consistency}
          suffix="%"
          iconName="Shield"
          colorClass="magenta"
          description="Stick tilt velocity variance"
        />
        <StatsCard
          title="Drills Logged"
          value={stats.drillsCompleted}
          iconName="Trophy"
          colorClass="green"
          description={`${stats.totalPlaytime} mins active playtime`}
        />
      </section>

      {/* Analytics Chart & Interactive Controller Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SVG Historical Chart (Left/8 Columns) */}
        <section className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-brand-cyan" />
              <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white">
                Mechanics Telemetry Curve
              </h2>
            </div>
            <div className="flex gap-4 text-[10px] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-brand-cyan">
                <span className="h-2 w-2 rounded-full bg-brand-cyan shadow-[0_0_6px_rgba(0,240,255,0.6)]" />
                Accuracy (%)
              </span>
              <span className="flex items-center gap-1.5 text-brand-purple">
                <span className="h-2 w-2 rounded-full bg-brand-purple shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
                Reaction (ms)
              </span>
            </div>
          </div>
          <Chart history={stats.history} className="py-2" />
        </section>

        {/* Interactive Controller Visualizer (Right/5 Columns) */}
        <section className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between space-y-4">
          <div className="border-b border-zinc-900 pb-3">
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white">
              Device Visualizer
            </h2>
            <p className="text-[10px] text-zinc-500">
              Interactive layout matching your active configuration.
            </p>
          </div>

          <div className="flex-1 flex items-center justify-center min-h-[220px]">
            <ControllerSvg type={profile.controllerType} activePart={activePart} className="max-w-[280px]" />
          </div>

          {/* Tester buttons to highlight controller components */}
          <div className="grid grid-cols-5 gap-1 pt-2">
            {(['triggers', 'buttons', 'left-stick', 'right-stick', 'dpad'] as const).map((part) => (
              <button
                key={part}
                onMouseEnter={() => setActivePart(part)}
                onMouseLeave={() => setActivePart(null)}
                className={`py-1.5 text-[9px] font-bold font-display uppercase rounded-lg border border-zinc-800 transition-colors select-none ${
                  activePart === part
                    ? 'border-brand-purple text-brand-purple bg-brand-purple/5'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                {part.replace('-', ' ')}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom widgets: Achievements & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Achievements status */}
        <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 text-left">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white">
              Tactical Achievements
            </h2>
            <span className="text-xs text-zinc-400 font-semibold">{unlockedCount} / {achievements.length} Unlocked</span>
          </div>

          <div className="space-y-2">
            {recentAchievements.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500 bg-zinc-900/10 border border-zinc-900/50 rounded-xl">
                No achievements unlocked yet. Complete drills to unlock badge systems!
              </div>
            ) : (
              recentAchievements.map((ach) => (
                <div key={ach.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/60 bg-zinc-900/20">
                  <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">{ach.title}</h3>
                    <p className="text-[10px] text-zinc-500">{ach.description}</p>
                  </div>
                  <span className="ml-auto text-[9px] font-bold text-yellow-400 uppercase tracking-wider">
                    +{ach.xpReward} XP
                  </span>
                </div>
              ))
            )}
            <button
              onClick={() => setActivePage('achievements')}
              className="w-full py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40 text-xs font-semibold uppercase tracking-wider font-display transition-all duration-200"
            >
              Inspect Medal Cabinet
            </button>
          </div>
        </section>

        {/* Quick Actions (Simulators & streak builders) */}
        <section className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 text-left">
          <div className="border-b border-zinc-900 pb-3">
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white">
              Operations Control
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setActivePage('training')}
              className="flex items-center justify-center gap-2 p-4 rounded-xl border border-brand-purple/20 bg-brand-purple/5 hover:bg-brand-purple/10 text-brand-purple text-xs font-bold font-display uppercase tracking-wider transition-all duration-300"
            >
              <Play className="h-4 w-4 fill-brand-purple" />
              Launch Drills
            </button>

            <button
              onClick={simulateStreak}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 text-zinc-300 text-xs font-bold font-display uppercase tracking-wider transition-all duration-200 ${
                stats.streak >= 3 ? 'opacity-65 cursor-not-allowed' : ''
              }`}
              disabled={stats.streak >= 3}
            >
              <Flame className={`h-4 w-4 ${stats.streak >= 3 ? 'text-zinc-500' : 'text-red-500 animate-pulse'}`} />
              {stats.streak >= 3 ? 'Streak Cap (3 Days)' : 'Simulate 3D Streak'}
            </button>
          </div>

          <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-brand-cyan flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-zinc-500 leading-normal">
              <strong>Interactive Simulation Tip:</strong> Click <span className="text-zinc-300">Simulate 3D Streak</span> to trigger context validations for the streak achievement and XP bonus without waiting 72 hours.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
};
